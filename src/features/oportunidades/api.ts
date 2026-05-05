import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'
import { buildQueryKey } from '../../core/hooks/useQueryBase'
import type { QueryOptions } from '../../core/types/api'
import type {
  Oportunidad,
  OportunidadInsert,
  OportunidadUpdate,
  EtapaOportunidad,
} from '../../core/types/entities'

const RESOURCE = 'oportunidades'

export interface OportunidadConEmpresa extends Oportunidad {
  empresa?: { id: string; nombre: string } | null
  contrato_origen?: { id: string; fecha_fin: string | null; numero_contrato: string | null } | null
  contacto?: { id: string; nombre: string; apellidos: string | null; cargo: string | null } | null
}

export function useOportunidades(options?: QueryOptions) {
  return useQuery({
    queryKey: buildQueryKey(RESOURCE, options),
    queryFn: async (): Promise<OportunidadConEmpresa[]> => {
      // Cast: contexto es columna nueva (FASE 1 separación CRM/Captación,
      // 2026-05-05). Aún no está en los tipos generados de Supabase.
      // Quitar este cast cuando se regeneren los tipos.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from('oportunidades')
        // Separación CRM/Captación: kanban legacy /oportunidades muestra solo
        // contexto='crm'. Las de captación viven en /captacion (bandejas).
        .select('*, empresa:empresas(id, nombre), contrato_origen:contratos!oportunidades_contrato_origen_id_fkey(id, fecha_fin, numero_contrato), contacto:contactos(id, nombre, apellidos, cargo)')
        .is('deleted_at', null)
        .eq('contexto', 'crm')
        .order('created_at', { ascending: false })

      const f = options?.filter ?? {}
      if (f.comercial_id) q = q.eq('comercial_id', f.comercial_id as string)
      if (f.tipo) q = q.eq('tipo', f.tipo as never)

      const { data, error } = await q
      if (error) { logError(error, 'useOportunidades'); throw error }
      return (data ?? []) as unknown as OportunidadConEmpresa[]
    },
  })
}

export async function fetchOportunidadesForExport(filter?: {
  comercial_id?: string
  tipo?: string
  etapa?: string
}): Promise<OportunidadConEmpresa[]> {
  let q = supabase
    .from('oportunidades')
    .select('*, empresa:empresas(id, nombre), contrato_origen:contratos!oportunidades_contrato_origen_id_fkey(id, fecha_fin, numero_contrato), contacto:contactos(id, nombre, apellidos, cargo)')
    .is('deleted_at', null)

  if (filter?.comercial_id) q = q.eq('comercial_id', filter.comercial_id)
  if (filter?.tipo) q = q.eq('tipo', filter.tipo as never)
  if (filter?.etapa) q = q.eq('etapa', filter.etapa as never)

  const { data, error } = await q.order('created_at', { ascending: false }).limit(10000)
  if (error) { logError(error, 'fetchOportunidadesForExport'); throw error }
  return (data ?? []) as unknown as OportunidadConEmpresa[]
}

export function useOportunidadById(id: string | undefined) {
  return useQuery({
    queryKey: [RESOURCE, 'byId', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('oportunidades')
        .select('*, empresa:empresas(id, nombre, nif), contacto:contactos(id, nombre, apellidos, cargo)')
        .eq('id', id!)
        .is('deleted_at', null)
        .maybeSingle()
      if (error) { logError(error, 'useOportunidadById'); throw error }
      return (data as OportunidadConEmpresa | null) ?? null
    },
  })
}

export function useCreateOportunidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: OportunidadInsert) => {
      const { data, error } = await supabase.from('oportunidades').insert(input as never).select('*').single()
      if (error) { logError(error, 'useCreateOportunidad'); throw error }
      return data as unknown as Oportunidad
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      toast.success('Oportunidad creada')
    },
    onError: (e) => toast.error('No se pudo crear la oportunidad', { description: (e as Error).message }),
  })
}

export function useUpdateOportunidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: OportunidadUpdate }) => {
      const { data, error } = await supabase.from('oportunidades').update(patch as never).eq('id', id).select('*').single()
      if (error) { logError(error, 'useUpdateOportunidad'); throw error }
      return data as unknown as Oportunidad
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      qc.invalidateQueries({ queryKey: [RESOURCE, 'byId', vars.id] })
      toast.success('Oportunidad actualizada')
    },
    onError: (e) => toast.error('No se pudo actualizar la oportunidad', { description: (e as Error).message }),
  })
}

export function useUpdateEtapa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      etapa,
      probabilidad,
    }: {
      id: string
      etapa: EtapaOportunidad
      probabilidad?: number
    }) => {
      const patch: Record<string, unknown> = { etapa }
      if (probabilidad !== undefined) patch.probabilidad_pct = probabilidad
      const { error } = await supabase.from('oportunidades').update(patch as never).eq('id', id)
      if (error) { logError(error, 'useUpdateEtapa'); throw error }
    },
    onMutate: async ({ id, etapa, probabilidad }) => {
      await qc.cancelQueries({ queryKey: [RESOURCE] })
      const prev = qc.getQueryData<OportunidadConEmpresa[]>([RESOURCE])
      if (prev) {
        qc.setQueryData<OportunidadConEmpresa[]>([RESOURCE], (old) =>
          (old ?? []).map((o) =>
            o.id === id
              ? { ...o, etapa, probabilidad_pct: probabilidad ?? o.probabilidad_pct }
              : o,
          ),
        )
      }
      return { prev }
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData([RESOURCE], ctx.prev)
      toast.error('No se pudo mover la oportunidad', { description: (err as Error).message })
    },
    onSuccess: (_data, vars) => {
      toast.success(`Oportunidad movida a ${ETAPA_LABEL[vars.etapa] ?? vars.etapa}`)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [RESOURCE] }),
  })
}

const ETAPA_LABEL: Record<string, string> = {
  prospecto: 'Prospecto',
  auditoria_consumo: 'Auditoría consumo',
  oferta_presentada: 'Oferta presentada',
  negociacion: 'Negociación',
  contrato_firmado: 'Contrato firmado',
  activo: 'Activo',
  cerrada_ganada: 'Ganada',
  cerrada_perdida: 'Perdida',
}
