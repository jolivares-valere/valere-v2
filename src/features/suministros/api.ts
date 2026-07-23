import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/core/supabase/client'

/**
 * Feature "Suministros" (CUPS) para el CRM comercial.
 *
 * No crea datos nuevos: lee de la tabla `cups` (compartida con Potencias, FV y
 * Datadis) y la expone en el CRM comercial (pestaña en la ficha de empresa +
 * página global).
 */
export interface SuministroRow {
  id: string
  codigo_cups: string
  tarifa_acceso: string | null
  estado: string
  distribuidor: string | null
  comercializadora_actual: string | null
  direccion_suministro: string | null
  ciudad_suministro: string | null
  denominacion: string | null
  p1_kw: number | null
  p6_kw: number | null
  potencia_fv_kwp: number | null
  modelo_autoconsumo: string | null
  datadis_sincronizado: boolean | null
  empresa_id: string
  empresa_nombre: string
}

const SELECT = `
  id, codigo_cups, tarifa_acceso, estado, distribuidor, comercializadora_actual,
  direccion_suministro, ciudad_suministro, denominacion,
  p1_kw, p6_kw, potencia_fv_kwp, modelo_autoconsumo, datadis_sincronizado,
  empresa_id, empresas ( nombre )
`

function mapRow(r: Record<string, unknown>): SuministroRow {
  const empresas = r.empresas as { nombre?: string } | null
  return {
    id: r.id as string,
    codigo_cups: r.codigo_cups as string,
    tarifa_acceso: (r.tarifa_acceso as string | null) ?? null,
    estado: r.estado as string,
    distribuidor: (r.distribuidor as string | null) ?? null,
    comercializadora_actual: (r.comercializadora_actual as string | null) ?? null,
    direccion_suministro: (r.direccion_suministro as string | null) ?? null,
    ciudad_suministro: (r.ciudad_suministro as string | null) ?? null,
    denominacion: (r.denominacion as string | null) ?? null,
    p1_kw: (r.p1_kw as number | null) ?? null,
    p6_kw: (r.p6_kw as number | null) ?? null,
    potencia_fv_kwp: (r.potencia_fv_kwp as number | null) ?? null,
    modelo_autoconsumo: (r.modelo_autoconsumo as string | null) ?? null,
    datadis_sincronizado: (r.datadis_sincronizado as boolean | null) ?? null,
    empresa_id: r.empresa_id as string,
    empresa_nombre: empresas?.nombre ?? '—',
  }
}

/**
 * Última fecha con curva de consumo por CUPS (PR-1.5, "curva disponible sí/no"
 * honesto). Lee `datadis_consumptions` (RLS: authenticated select). Una query
 * ligera por CUPS (limit 1, solo fecha); pensado para la pestaña de una
 * empresa (pocos CUPS), NO para la página global.
 */
export async function fetchCurvaUltimaFecha(cupsIds: string[]): Promise<Record<string, string | null>> {
  const entries = await Promise.all(
    cupsIds.map(async (id) => {
      const { data, error } = await supabase
        .from('datadis_consumptions' as never)
        .select('fecha' as never)
        .eq('cups_id' as never, id as never)
        .order('fecha' as never, { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return [id, (data as { fecha?: string } | null)?.fecha ?? null] as const
    }),
  )
  return Object.fromEntries(entries)
}

/** CUPS de una empresa concreta (para la pestaña en la ficha). */
export async function fetchSuministrosByEmpresa(empresaId: string): Promise<SuministroRow[]> {
  const { data, error } = await supabase
    .from('cups')
    .select(SELECT)
    .eq('empresa_id', empresaId)
    .is('deleted_at', null)
    .order('codigo_cups', { ascending: true })

  if (error) throw error
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>))
}

/** Todos los CUPS (para la página global del menú comercial). */
export async function fetchAllSuministros(): Promise<SuministroRow[]> {
  const { data, error } = await supabase
    .from('cups')
    .select(SELECT)
    .is('deleted_at', null)
    .order('empresa_id', { ascending: true })
    .order('codigo_cups', { ascending: true })

  if (error) throw error
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>))
}

/**
 * F2 (semana 4) — edición de suministros tras crear.
 *
 * Origen: hallazgo real de Julia en el ensayo del gate V3 — el CUPS y demás
 * datos del suministro no se podían corregir tras darlo de alta. Edita solo
 * los campos "comerciales" del suministro (CUPS, tarifa, dirección/ciudad,
 * comercializadora, estado). NO toca potencias contratadas (p1_kw..p6_kw),
 * campos FV ni campos Datadis — esos pertenecen a sus propios módulos
 * (Potencias, seguimiento FV, sincronización Datadis) y tocarlos aquí
 * arriesga efectos secundarios no deseados entre módulos.
 */
export interface ActualizarCupsInput {
  cupsId: string
  empresaId: string
  codigo_cups: string
  tarifa_acceso: string | null
  direccion_suministro: string | null
  ciudad_suministro: string | null
  comercializadora_actual: string | null
  estado: string
}

export function useActualizarCups() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ActualizarCupsInput) => {
      const { error } = await supabase
        .from('cups')
        .update({
          codigo_cups: input.codigo_cups,
          tarifa_acceso: input.tarifa_acceso,
          direccion_suministro: input.direccion_suministro,
          ciudad_suministro: input.ciudad_suministro,
          comercializadora_actual: input.comercializadora_actual,
          estado: input.estado,
        })
        .eq('id', input.cupsId)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suministros-empresa', variables.empresaId] })
      queryClient.invalidateQueries({ queryKey: ['suministros-todos'] })
    },
  })
}

/** PR-4.1: filas diarias de la vista v_consumos_diarios (≤ ~700 por CUPS a 23m).
 *  RLS heredada de datadis_consumptions (security_invoker). */
export async function fetchConsumosDiarios(cupsId: string): Promise<import('./curva').ConsumoDiario[]> {
  const { data, error } = await supabase
    .from('v_consumos_diarios' as never)
    .select('fecha, consumo_kwh, excedente_kwh, horas, horas_estimadas' as never)
    .eq('cups_id' as never, cupsId as never)
    .order('fecha' as never, { ascending: true })
    .limit(800)
  if (error) throw error
  return (data ?? []).map((r) => {
    const x = r as Record<string, unknown>
    return {
      fecha: x.fecha as string,
      consumo_kwh: Number(x.consumo_kwh) || 0,
      excedente_kwh: Number(x.excedente_kwh) || 0,
      horas: Number(x.horas) || 0,
      horas_estimadas: Number(x.horas_estimadas) || 0,
    }
  })
}
