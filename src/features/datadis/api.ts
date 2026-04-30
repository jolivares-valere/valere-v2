import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface DatadisSupply {
  cups: string
  distributor: string
  address?: string
  postalCode?: string
  province?: string
  municipality?: string
  pointType?: number
  tariff?: string
  validDateFrom?: string
  validDateTo?: string
  tension?: string
  cod_provincia?: string
  cod_municipio?: string
  [key: string]: unknown
}

export interface DatadisErrorSupply {
  cups?: string
  distributor?: string
  error?: string
  [key: string]: unknown
}

export interface DatadisSuppliesResponse {
  response?: DatadisSupply[]
  CodError?: string
  errorSupplies?: DatadisErrorSupply[]
}

export interface DatadisCreds {
  username: string
  password: string
}

// ─── Proxy call helper ───────────────────────────────────────────────────────

async function callProxy<T>(
  action: string,
  params?: Record<string, unknown>,
  creds?: DatadisCreds,
): Promise<T> {
  const body: Record<string, unknown> = { action }
  if (params) body.params = params
  if (creds) {
    body.datadis_username = creds.username
    body.datadis_password = creds.password
  }

  const { data, error } = await supabase.functions.invoke('datadis-proxy', { body })

  if (error) {
    logError(error, `datadis/${action}`)
    throw error
  }

  if (!data?.ok) {
    const msg = data?.error ?? `Error en datadis/${action}`
    logError(new Error(msg), `datadis/${action}`)
    throw new Error(msg)
  }

  return data.data as T
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useDatadisSupplies(creds?: DatadisCreds) {
  return useQuery({
    queryKey: ['datadis', 'supplies', creds?.username ?? '__master__'],
    queryFn:  () => callProxy<DatadisSuppliesResponse>('get_supplies', undefined, creds),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
}
