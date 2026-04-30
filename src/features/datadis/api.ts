import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface DatadisSupply {
  cups: string
  distributor: string            // cod_disitribuidora (typo oficial Datadis)
  address?: string
  postalCode?: string
  province?: string
  municipality?: string
  pointType?: number             // tipoPuntoMedida 1..5
  tariff?: string                // tarifaCode ej: '3.0TD', '6.1TD'
  validDateFrom?: string
  validDateTo?: string
  tension?: string
  cod_provincia?: string
  cod_municipio?: string
  [key: string]: unknown         // campos adicionales que devuelva el portal
}

export interface DatadisErrorSupply {
  cups?: string
  distributor?: string
  error?: string
  [key: string]: unknown
}

export interface DatadisSuppliesResponse {
  response?: DatadisSupply[]
  CodError?: string              // "902" = respuesta parcial (algunas distribuidoras no respondieron)
  errorSupplies?: DatadisErrorSupply[]
}

// ─── Proxy call helper ───────────────────────────────────────────────────────

async function callProxy<T>(action: string, params?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('datadis-proxy', {
    body: { action, params },
  })

  if (error) {
    logError(error, `datadis/${action}`)
    throw error
  }

  // La Edge Function siempre devuelve HTTP 200; el error real va en .ok / .error
  if (!data?.ok) {
    const msg = data?.error ?? `Error en datadis/${action}`
    logError(new Error(msg), `datadis/${action}`)
    throw new Error(msg)
  }

  return data.data as T
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Lista todos los suministros del NIF autorizado en Datadis.
 * CodError "902" es un warning (respuesta parcial), no un error fatal.
 */
export function useDatadisSupplies() {
  return useQuery({
    queryKey: ['datadis', 'supplies'],
    queryFn: () => callProxy<DatadisSuppliesResponse>('get_supplies'),
    staleTime: 10 * 60 * 1000,   // 10 min — Datadis tiene latencia D-1/D-2
    retry: 1,
  })
}
