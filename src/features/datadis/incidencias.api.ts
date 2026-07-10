// ═══════════════════════════════════════════════════════════════════
// incidencias.api.ts — incidencias de datos Datadis (worker datadis-sync)
//
// Lee la tabla `datadis_incidencias` (poblada por el worker en cada sync) y
// la agrupa por empresa para pintar la alarma del Dashboard. Cada incidencia
// enlaza a la ficha de la empresa (pestaña Suministros) para corregirla.
// ═══════════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../core/supabase/client'

export type TipoIncidencia = 'cups_falta_en_crm' | 'cups_no_coincide'

export interface IncidenciaDatadis {
  id: string
  empresa_id: string
  empresa_nombre: string
  nif: string | null
  tipo: TipoIncidencia
  cups_codigo: string | null
  distribuidora: string | null
  municipio: string | null
  detalle: string | null
}

export interface IncidenciasPorEmpresa {
  empresa_id: string
  empresa_nombre: string
  nif: string | null
  faltan: number
  no_coincide: number
  items: IncidenciaDatadis[]
}

export interface ResumenIncidencias {
  total: number
  empresas: number
  faltan: number
  no_coincide: number
  grupos: IncidenciasPorEmpresa[]
}

export function useDatadisIncidencias() {
  return useQuery({
    queryKey: ['datadis_incidencias'],
    refetchInterval: 60_000,
    queryFn: async (): Promise<ResumenIncidencias> => {
      const { data, error } = await supabase
        .from('datadis_incidencias' as never)
        .select('id, empresa_id, nif, tipo, cups_codigo, distribuidora, municipio, detalle, empresas(nombre)' as never)
        .order('tipo' as never, { ascending: true } as never)
      if (error) throw error

      const rows = (data ?? []) as unknown as Array<{
        id: string; empresa_id: string; nif: string | null; tipo: TipoIncidencia
        cups_codigo: string | null; distribuidora: string | null; municipio: string | null
        detalle: string | null; empresas?: { nombre?: string } | null
      }>

      const mapa = new Map<string, IncidenciasPorEmpresa>()
      for (const r of rows) {
        const nombre = r.empresas?.nombre ?? '—'
        let g = mapa.get(r.empresa_id)
        if (!g) {
          g = { empresa_id: r.empresa_id, empresa_nombre: nombre, nif: r.nif, faltan: 0, no_coincide: 0, items: [] }
          mapa.set(r.empresa_id, g)
        }
        if (r.tipo === 'cups_falta_en_crm') g.faltan++
        else if (r.tipo === 'cups_no_coincide') g.no_coincide++
        g.items.push({
          id: r.id, empresa_id: r.empresa_id, empresa_nombre: nombre, nif: r.nif,
          tipo: r.tipo, cups_codigo: r.cups_codigo, distribuidora: r.distribuidora,
          municipio: r.municipio, detalle: r.detalle,
        })
      }

      const grupos = [...mapa.values()].sort(
        (a, b) => (b.no_coincide - a.no_coincide) || (b.faltan - a.faltan) || a.empresa_nombre.localeCompare(b.empresa_nombre),
      )
      return {
        total: rows.length,
        empresas: grupos.length,
        faltan: rows.filter((r) => r.tipo === 'cups_falta_en_crm').length,
        no_coincide: rows.filter((r) => r.tipo === 'cups_no_coincide').length,
        grupos,
      }
    },
  })
}
