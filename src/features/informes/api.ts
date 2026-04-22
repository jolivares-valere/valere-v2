import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'

const RESOURCE = 'informes'

export interface ComercialMensualFila {
  comercial_id: string | null
  comercial_nombre: string
  llamadas: number
  emails: number
  reuniones: number
  visitas: number
  tareas: number
  oportunidades_creadas: number
  oportunidades_ganadas: number
  oportunidades_perdidas: number
  contratos_firmados: number
  tasa_conversion_pct: number
}

export interface InformeComercialParams {
  desde: string
  hasta: string
  comercialId?: string | null
}

function monthBounds(yyyyMm: string): { desde: string; hasta: string } {
  const [y, m] = yyyyMm.split('-').map((n) => Number(n))
  const desde = new Date(Date.UTC(y, m - 1, 1))
  const hasta = new Date(Date.UTC(y, m, 0))
  const toISO = (d: Date) => d.toISOString().slice(0, 10)
  return { desde: toISO(desde), hasta: toISO(hasta) }
}

export function useInformeComercialMensual(mes: string, comercialId?: string | null) {
  return useQuery({
    queryKey: [RESOURCE, 'comercial-mensual', mes, comercialId ?? null],
    queryFn: async (): Promise<ComercialMensualFila[]> => {
      const { desde, hasta } = monthBounds(mes)
      const desdeISO = `${desde}T00:00:00.000Z`
      const hastaISO = `${hasta}T23:59:59.999Z`

      const [usersRes, actRes, opsRes, contRes] = await Promise.all([
        supabase.from('user_profiles').select('id, full_name'),
        supabase
          .from('actividades')
          .select('tipo, asignado_a, usuario_id')
          .is('deleted_at', null)
          .gte('fecha_actividad', desdeISO)
          .lte('fecha_actividad', hastaISO),
        supabase
          .from('oportunidades')
          .select('id, comercial_id, etapa, created_at, updated_at')
          .is('deleted_at', null)
          .or(`and(created_at.gte.${desdeISO},created_at.lte.${hastaISO}),and(updated_at.gte.${desdeISO},updated_at.lte.${hastaISO},etapa.in.(ganada,perdida))`),
        supabase
          .from('contratos')
          .select('id, comercial_id, fecha_firma')
          .is('deleted_at', null)
          .gte('fecha_firma', desde)
          .lte('fecha_firma', hasta),
      ])

      if (usersRes.error) { logError(usersRes.error, 'informe-comercial.users'); throw usersRes.error }
      if (actRes.error) { logError(actRes.error, 'informe-comercial.actividades'); throw actRes.error }
      if (opsRes.error) { logError(opsRes.error, 'informe-comercial.oportunidades'); throw opsRes.error }
      if (contRes.error) { logError(contRes.error, 'informe-comercial.contratos'); throw contRes.error }

      type U = { id: string; full_name: string | null }
      const users = (usersRes.data ?? []) as unknown as U[]
      const map = new Map<string, ComercialMensualFila>()
      const ensure = (id: string | null, nombre: string): ComercialMensualFila => {
        const key = id ?? '__sin_asignar__'
        let row = map.get(key)
        if (!row) {
          row = {
            comercial_id: id,
            comercial_nombre: nombre,
            llamadas: 0, emails: 0, reuniones: 0, visitas: 0, tareas: 0,
            oportunidades_creadas: 0, oportunidades_ganadas: 0, oportunidades_perdidas: 0,
            contratos_firmados: 0, tasa_conversion_pct: 0,
          }
          map.set(key, row)
        }
        return row
      }

      for (const u of users) ensure(u.id, u.full_name ?? '—')

      for (const a of actRes.data ?? []) {
        const uid = ((a as { asignado_a: string | null }).asignado_a ?? (a as { usuario_id: string | null }).usuario_id) as string | null
        if (!uid) continue
        const u = users.find((x) => x.id === uid)
        if (comercialId && uid !== comercialId) continue
        const row = ensure(uid, u?.full_name ?? '—')
        const tipo = (a as { tipo: string }).tipo
        if (tipo === 'llamada') row.llamadas++
        else if (tipo === 'email') row.emails++
        else if (tipo === 'reunion') row.reuniones++
        else if (tipo === 'visita') row.visitas++
        else if (tipo === 'tarea') row.tareas++
      }

      for (const o of opsRes.data ?? []) {
        const uid = (o as { comercial_id: string | null }).comercial_id
        if (!uid) continue
        if (comercialId && uid !== comercialId) continue
        const u = users.find((x) => x.id === uid)
        const row = ensure(uid, u?.full_name ?? '—')
        const createdAt = (o as { created_at: string }).created_at
        const updatedAt = (o as { updated_at: string }).updated_at
        const etapa = (o as { etapa: string }).etapa
        if (createdAt >= desdeISO && createdAt <= hastaISO) row.oportunidades_creadas++
        if ((etapa === 'ganada' || etapa === 'perdida') && updatedAt >= desdeISO && updatedAt <= hastaISO) {
          if (etapa === 'ganada') row.oportunidades_ganadas++
          else row.oportunidades_perdidas++
        }
      }

      for (const c of contRes.data ?? []) {
        const uid = (c as { comercial_id: string | null }).comercial_id
        if (!uid) continue
        if (comercialId && uid !== comercialId) continue
        const u = users.find((x) => x.id === uid)
        ensure(uid, u?.full_name ?? '—').contratos_firmados++
      }

      const out: ComercialMensualFila[] = []
      for (const row of map.values()) {
        if (comercialId && row.comercial_id !== comercialId) continue
        const cerradas = row.oportunidades_ganadas + row.oportunidades_perdidas
        row.tasa_conversion_pct = cerradas > 0 ? Math.round((row.oportunidades_ganadas / cerradas) * 100) : 0
        const activo =
          row.llamadas + row.emails + row.reuniones + row.visitas + row.tareas +
          row.oportunidades_creadas + row.oportunidades_ganadas + row.oportunidades_perdidas +
          row.contratos_firmados
        if (activo > 0 || comercialId) out.push(row)
      }

      out.sort((a, b) =>
        (b.contratos_firmados - a.contratos_firmados) ||
        (b.oportunidades_ganadas - a.oportunidades_ganadas) ||
        a.comercial_nombre.localeCompare(b.comercial_nombre, 'es'),
      )
      return out
    },
  })
}

export interface CarteraActivaFila {
  empresa_id: string
  empresa_nombre: string
  empresa_nif: string | null
  comercial_id: string | null
  comercial_nombre: string
  contratos_activos: number
  cups_activos: number
  consumo_total_kwh: number
  comision_total_eur: number
  proximo_vencimiento: string | null
}

export function useInformeCarteraActiva(comercialId?: string | null) {
  return useQuery({
    queryKey: [RESOURCE, 'cartera-activa', comercialId ?? null],
    queryFn: async (): Promise<CarteraActivaFila[]> => {
      let q = supabase
        .from('contratos')
        .select(
          'id, empresa_id, comercial_id, fecha_fin, consumo_sips_kwh, consumo_po_kwh, comision_integra, empresa:empresas!contratos_empresa_id_fkey(id, nombre, nif, comercial_id), comercial:user_profiles!contratos_comercial_id_fkey(id, full_name)',
        )
        .eq('estado', 'activo')
        .is('deleted_at', null)
      if (comercialId) q = q.eq('comercial_id', comercialId)

      const { data: contratos, error: e1 } = await q
      if (e1) { logError(e1, 'cartera-activa.contratos'); throw e1 }

      const rows = (contratos ?? []) as unknown as Array<{
        id: string
        empresa_id: string
        comercial_id: string | null
        fecha_fin: string | null
        consumo_sips_kwh: number | null
        consumo_po_kwh: number | null
        comision_integra: number | null
        empresa: { id: string; nombre: string; nif: string | null; comercial_id: string | null } | null
        comercial: { id: string; full_name: string | null } | null
      }>

      const empresaIds = Array.from(new Set(rows.map((r) => r.empresa_id)))
      let cupsMap = new Map<string, number>()
      if (empresaIds.length > 0) {
        const { data: cupsRows, error: e2 } = await supabase
          .from('cups')
          .select('empresa_id')
          .eq('estado', 'activo')
          .is('deleted_at', null)
          .in('empresa_id', empresaIds)
        if (e2) { logError(e2, 'cartera-activa.cups'); throw e2 }
        cupsMap = new Map()
        for (const c of (cupsRows ?? []) as unknown as Array<{ empresa_id: string }>) {
          cupsMap.set(c.empresa_id, (cupsMap.get(c.empresa_id) ?? 0) + 1)
        }
      }

      const map = new Map<string, CarteraActivaFila>()
      for (const r of rows) {
        const eid = r.empresa_id
        let fila = map.get(eid)
        if (!fila) {
          fila = {
            empresa_id: eid,
            empresa_nombre: r.empresa?.nombre ?? '—',
            empresa_nif: r.empresa?.nif ?? null,
            comercial_id: r.comercial_id ?? r.empresa?.comercial_id ?? null,
            comercial_nombre: r.comercial?.full_name ?? '—',
            contratos_activos: 0,
            cups_activos: cupsMap.get(eid) ?? 0,
            consumo_total_kwh: 0,
            comision_total_eur: 0,
            proximo_vencimiento: null,
          }
          map.set(eid, fila)
        }
        fila.contratos_activos++
        fila.consumo_total_kwh += (r.consumo_sips_kwh ?? r.consumo_po_kwh ?? 0)
        fila.comision_total_eur += (r.comision_integra ?? 0)
        if (r.fecha_fin) {
          if (!fila.proximo_vencimiento || r.fecha_fin < fila.proximo_vencimiento) {
            fila.proximo_vencimiento = r.fecha_fin
          }
        }
      }

      return Array.from(map.values()).sort((a, b) =>
        b.consumo_total_kwh - a.consumo_total_kwh || a.empresa_nombre.localeCompare(b.empresa_nombre, 'es'),
      )
    },
  })
}

export function useComercialesList() {
  return useQuery({
    queryKey: [RESOURCE, 'comerciales'],
    queryFn: async (): Promise<Array<{ id: string; full_name: string }>> => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .order('full_name', { ascending: true })
      if (error) { logError(error, 'useComercialesList'); throw error }
      return ((data ?? []) as unknown as Array<{ id: string; full_name: string | null }>).map((u) => ({
        id: u.id,
        full_name: u.full_name ?? '—',
      }))
    },
  })
}
