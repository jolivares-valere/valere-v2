// ─────────────────────────────────────────────────────────────────────────────
// Feature SIPS — resolución de datos de un CUPS vía Datadis (capa F1)
//
// Reutiliza la Edge Function `resolver-sips-cups`, que orquesta `datadis-proxy`.
// Da al comercial, con solo el CUPS: titular (CIF/NIF), tarifa, potencias
// contratadas, maxímetros, consumo por periodo, consumo total y curva mensual.
// Equivalente a lo que Zocoenergía hace con getAPIConsumption/getCIFByCUPS.
// ─────────────────────────────────────────────────────────────────────────────

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'

// ─── Tipos canónicos (espejo de la respuesta de la EF) ───────────────────────

export interface SipsPorPeriodo {
  p1: number | null; p2: number | null; p3: number | null
  p4: number | null; p5: number | null; p6: number | null
}

export interface SipsPuntoMensual {
  mes: string // 'YYYY/MM'
  consumo_kwh: number
}

export interface SipsResolveResult {
  cups: string
  encontrado: boolean
  titular_nif: string | null
  distribuidor: string | null
  distribuidor_codigo: string | null
  direccion: string | null
  codigo_postal: string | null
  provincia: string | null
  provincia_codigo: string | null
  municipio_codigo: string | null
  tarifa_acceso: string | null
  tipo_punto_medida: number | null
  comercializadora_actual: string | null
  fecha_ultimo_cambio_comerc: string | null
  potencias_contratadas: SipsPorPeriodo
  maximetros: SipsPorPeriodo
  consumo_por_periodo_kwh: SipsPorPeriodo
  consumo_total_kwh: number | null
  consumo_mensual: SipsPuntoMensual[]
  fuente: 'datadis'
  parcial: boolean
  avisos: string[]
}

export interface ResolverSipsParams {
  cups: string
  authorizedNif?: string
  months?: number
  /** Solo si se usa una cuenta Datadis específica del cliente en vez de la maestra. */
  datadisUsername?: string
  datadisPassword?: string
}

// ─── Validación de CUPS (cliente) ────────────────────────────────────────────

const CUPS_RE = /^ES[0-9A-Z]{18,20}$/

export function isValidCups(cups: string): boolean {
  return CUPS_RE.test(cups.trim().toUpperCase())
}

// ─── Llamada a la EF ─────────────────────────────────────────────────────────

export async function resolverSipsCups(params: ResolverSipsParams): Promise<SipsResolveResult> {
  const cups = params.cups.trim().toUpperCase()
  if (!isValidCups(cups)) {
    throw new Error('CUPS no válido (formato: ES + 18-20 caracteres)')
  }

  const body: Record<string, unknown> = { cups }
  if (params.authorizedNif) body.authorizedNif = params.authorizedNif
  if (params.months) body.months = params.months
  if (params.datadisUsername) {
    body.datadis_username = params.datadisUsername
    body.datadis_password = params.datadisPassword
  }

  const { data, error } = await supabase.functions.invoke('resolver-sips-cups', { body })
  if (error) {
    logError(error, 'sips/resolver')
    throw error
  }
  if (!data?.ok) {
    const msg = data?.error ?? 'Error resolviendo el CUPS en Datadis'
    logError(new Error(msg), 'sips/resolver')
    throw new Error(msg)
  }
  return data.data as SipsResolveResult
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useResolverSips() {
  return useMutation({
    mutationFn: resolverSipsCups,
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Error al consultar el CUPS'
      toast.error(msg)
    },
    onSuccess: (data) => {
      if (!data.encontrado) {
        toast.warning('CUPS no encontrado en los suministros autorizados de Datadis')
      } else if (data.parcial) {
        toast.warning('Datos parciales: algunos apartados no se pudieron leer (ver avisos)')
      } else {
        toast.success('Datos del CUPS cargados desde Datadis')
      }
    },
  })
}

// ─── Mapeo a campos del CRM (para autorrelleno de contrato/cups) ─────────────

export interface CupsAutofill {
  codigo_cups: string
  tarifa_acceso: string | null
  comercializadora_actual: string | null
  direccion_suministro: string | null
  distribuidor: string | null
  p1_kw: number | null; p2_kw: number | null; p3_kw: number | null
  p4_kw: number | null; p5_kw: number | null; p6_kw: number | null
  energia_p1_kwh: number | null; energia_p2_kwh: number | null; energia_p3_kwh: number | null
  energia_p4_kwh: number | null; energia_p5_kwh: number | null; energia_p6_kwh: number | null
  consumo_sips_kwh: number | null
}

/** Convierte el resultado SIPS en los campos que rellena el alta de contrato/CUPS. */
export function sipsToAutofill(r: SipsResolveResult): CupsAutofill {
  const pc = r.potencias_contratadas
  const cp = r.consumo_por_periodo_kwh
  return {
    codigo_cups: r.cups,
    tarifa_acceso: r.tarifa_acceso,
    comercializadora_actual: r.comercializadora_actual,
    direccion_suministro: r.direccion,
    distribuidor: r.distribuidor,
    p1_kw: pc.p1, p2_kw: pc.p2, p3_kw: pc.p3, p4_kw: pc.p4, p5_kw: pc.p5, p6_kw: pc.p6,
    energia_p1_kwh: cp.p1, energia_p2_kwh: cp.p2, energia_p3_kwh: cp.p3,
    energia_p4_kwh: cp.p4, energia_p5_kwh: cp.p5, energia_p6_kwh: cp.p6,
    consumo_sips_kwh: r.consumo_total_kwh,
  }
}
