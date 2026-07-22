import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'
import type { Contrato, ContratoInsert, Cups, Empresa, Renovacion } from '../../core/types/entities'

/** Busqueda ligera de empresas por nombre o NIF para el paso 1 del asistente. */
export function useBuscarEmpresas(q: string) {
  const term = q.trim()
  return useQuery({
    queryKey: ['alta-venta', 'buscar-empresas', term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nombre, nif, ciudad')
        .is('deleted_at', null)
        .or(`nombre.ilike.%${term}%,nif.ilike.%${term}%`)
        .order('nombre')
        .limit(8)
      if (error) { logError(error, 'useBuscarEmpresas'); throw error }
      return (data ?? []) as Pick<Empresa, 'id' | 'nombre' | 'nif' | 'ciudad'>[]
    },
  })
}

/** CUPS vivos de la empresa elegida (paso 2). */
export function useCupsDeEmpresa(empresaId: string | null) {
  return useQuery({
    queryKey: ['alta-venta', 'cups', empresaId],
    enabled: Boolean(empresaId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cups')
        .select('id, codigo_cups, direccion_suministro, tarifa_acceso')
        .eq('empresa_id', empresaId!)
        .is('deleted_at', null)
        .order('codigo_cups')
      if (error) { logError(error, 'useCupsDeEmpresa'); throw error }
      return (data ?? []) as Pick<Cups, 'id' | 'codigo_cups' | 'direccion_suministro' | 'tarifa_acceso'>[]
    },
  })
}

/**
 * true si la comercializadora tiene alguna condicion que comisiona renovacion.
 * NATURGY / ENDESA / PLENITUDE -> false (renovar es defensa de cartera, doc REGLAS v2).
 */
export function useComisionaRenovacion(comercializadoraId: string | null) {
  return useQuery({
    queryKey: ['alta-venta', 'comisiona-renovacion', comercializadoraId],
    enabled: Boolean(comercializadoraId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comercializadora_condiciones')
        .select('comisiona_renovacion')
        .eq('comercializadora_id', comercializadoraId!)
        .eq('activa', true)
      if (error) { logError(error, 'useComisionaRenovacion'); throw error }
      const conds = data ?? []
      if (conds.length === 0) return null // sin condiciones dictadas: no afirmamos nada
      return conds.some((c) => c.comisiona_renovacion)
    },
  })
}

export interface EmpresaMinInput {
  nombre: string
  nif: string | null
  ciudad: string | null
  created_by: string | null
}

/** F4 (gate V3): nº de contratos VIVOS con ese numero_contrato (aviso de duplicado). */
export async function checkNumeroContratoDuplicado(numero: string): Promise<number> {
  const { count, error } = await supabase
    .from('contratos')
    .select('id', { count: 'exact', head: true })
    .eq('numero_contrato', numero.trim())
    .is('deleted_at', null)
  if (error) { logError(error, 'checkNumeroContratoDuplicado'); return 0 }
  return count ?? 0
}

/** Alta minima de empresa (el resto de la ficha se completa despues). */
export function useCreateEmpresaMin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: EmpresaMinInput) => {
      const { data, error } = await supabase
        .from('empresas')
        .insert(input as never)
        .select('id, nombre')
        .single()
      if (error) { logError(error, 'useCreateEmpresaMin'); throw error }
      return data as unknown as Pick<Empresa, 'id' | 'nombre'>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['empresas'] }),
  })
}

export interface CupsMinInput {
  empresa_id: string
  codigo_cups: string
  direccion_suministro: string | null
  tarifa_acceso: string
  estado: 'activo'
  [key: string]: unknown // p1_kw..p6_kw / energia_p1_kwh.. segun tarifa (null si no aplica)
}

export function useCreateCups() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CupsMinInput) => {
      const { data, error } = await supabase
        .from('cups')
        .insert(input as never)
        .select('id, codigo_cups')
        .single()
      if (error) { logError(error, 'useCreateCups'); throw error }
      return data as unknown as Pick<Cups, 'id' | 'codigo_cups'>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cups'] }),
  })
}

/** Vincula el CUPS al contrato recien creado y actualiza su comercializadora actual. */
export async function vincularCupsAContrato(cupsId: string, contratoId: string, compania: string) {
  const { error } = await supabase
    .from('cups')
    .update({ contrato_id: contratoId, comercializadora_actual: compania } as never)
    .eq('id', cupsId)
  if (error) { logError(error, 'vincularCupsAContrato'); throw error }
}

export function useCreateContratoAsistente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ContratoInsert) => {
      const { data, error } = await supabase
        .from('contratos')
        .insert(input as never)
        .select('*')
        .single()
      if (error) { logError(error, 'useCreateContratoAsistente'); throw error }
      return data as unknown as Contrato
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contratos'] }),
  })
}

export interface RenovacionAsistenteInput {
  contrato_id: string
  empresa_id: string
  estado: 'detectada'
  prioridad: string
  fecha_deteccion: string
  fecha_vencimiento_contrato: string | null
  notas: string | null
}

export function useCreateRenovacionAsistente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: RenovacionAsistenteInput) => {
      const { data, error } = await supabase
        .from('renovaciones')
        .insert(input as never)
        .select('id')
        .single()
      if (error) { logError(error, 'useCreateRenovacionAsistente'); throw error }
      return data as unknown as Pick<Renovacion, 'id'>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['renovaciones'] }),
  })
}
