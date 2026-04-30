import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'

// ─── Tipos base ───────────────────────────────────────────────────────────────

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

// ─── Tipos detalle ────────────────────────────────────────────────────────────

export interface DatadisContractualData {
  cups?: string
  distributor?: string
  marketer?: string
  tension?: string
  accessFare?: string
  contractedPowerkWP1?: number
  contractedPowerkWP2?: number
  contractedPowerkWP3?: number
  contractedPowerkWP4?: number
  contractedPowerkWP5?: number
  contractedPowerkWP6?: number
  startDate?: string
  endDate?: string
  [key: string]: unknown
}

export interface DatadisConsumptionPoint {
  cups?: string
  date?: string
  time?: string
  consumptionKWh?: number
  obtainMethod?: string
  surplusEnergyKWh?: number
  [key: string]: unknown
}

export interface DatadisMaxPowerPoint {
  cups?: string
  date?: string
  time?: string
  maxPower?: number
  period?: string
  [key: string]: unknown
}

export interface DatadisReactivePoint {
  cups?: string
  date?: string
  energyP1?: number
  energyP2?: number
  energyP3?: number
  energyP4?: number
  energyP5?: number
  energyP6?: number
  factorEnergyP1?: number
  factorEnergyP2?: number
  factorEnergyP3?: number
  [key: string]: unknown
}

export interface ConsumptionParams {
  cups: string
  distributor: string
  fechaInicial: string
  fechaFinal: string
  provinceCode: string
  municipioCode: string
  tarifaCode: string
  tipoPuntoMedida: number
}

export interface MaxPowerParams {
  cups: string
  distributor: string
  fechaInicial: string
  fechaFinal: string
  provinceCode: string
  tarifaCode: string
}

export interface ReactiveParams {
  cups: string
  distributor: string
  fechaInicial: string
  fechaFinal: string
  provinceCode: string
  tarifaCode: string
}

// ─── Proxy call helper ────────────────────────────────────────────────────────

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

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useDatadisSupplies(creds?: DatadisCreds) {
  return useQuery({
    queryKey: ['datadis', 'supplies', creds?.username ?? '__master__'],
    queryFn:  () => callProxy<DatadisSuppliesResponse>('get_supplies', undefined, creds),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
}

export function useDatadisContractual(
  params: { cups: string; distributor: string } | null,
  creds?: DatadisCreds,
) {
  return useQuery({
    queryKey: ['datadis', 'contractual', params?.cups, creds?.username ?? '__master__'],
    queryFn:  () =>
      callProxy<DatadisContractualData[]>('get_contractual', params as Record<string, unknown>, creds),
    enabled: !!params?.cups && !!params?.distributor,
    staleTime: 60 * 60 * 1000, // 1h — datos contractuales cambian poco
    retry: 1,
  })
}

export function useDatadisConsumption(
  params: ConsumptionParams | null,
  creds?: DatadisCreds,
) {
  return useQuery({
    queryKey: [
      'datadis', 'consumption',
      params?.cups, params?.fechaInicial, params?.fechaFinal,
      creds?.username ?? '__master__',
    ],
    queryFn:  () =>
      callProxy<DatadisConsumptionPoint[]>('get_consumption', params as unknown as Record<string, unknown>, creds),
    enabled: !!params?.cups,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
}

export function useDatadisMaxPower(
  params: MaxPowerParams | null,
  creds?: DatadisCreds,
) {
  return useQuery({
    queryKey: [
      'datadis', 'max_power',
      params?.cups, params?.fechaInicial, params?.fechaFinal,
      creds?.username ?? '__master__',
    ],
    queryFn:  () =>
      callProxy<DatadisMaxPowerPoint[]>('get_max_power', params as unknown as Record<string, unknown>, creds),
    enabled: !!params?.cups,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
}

export function useDatadisReactive(
  params: ReactiveParams | null,
  creds?: DatadisCreds,
) {
  return useQuery({
    queryKey: [
      'datadis', 'reactive',
      params?.cups, params?.fechaInicial, params?.fechaFinal,
      creds?.username ?? '__master__',
    ],
    queryFn:  () =>
      callProxy<DatadisReactivePoint[]>('get_reactive', params as unknown as Record<string, unknown>, creds),
    enabled: !!params?.cups,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
}
