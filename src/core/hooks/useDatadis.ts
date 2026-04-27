/**
 * useDatadis.ts — Hooks React Query para la integración con Datadis
 *
 * Hooks exportados:
 *   useDatadisToken(empresaId)     → credenciales almacenadas en DB para una empresa
 *   useGuardarToken(empresaId)     → mutación para guardar/actualizar credenciales
 *   useEliminarToken(empresaId)    → mutación para borrar la integración
 *   useDatadisSync(cupsId, ...)    → mutación principal: autentica + descarga datos
 *   useDatadisConsumptions(cupsId) → consumos horarios ya descargados en DB
 *
 * Nota sobre tipos: las tablas datadis_tokens y datadis_consumptions ya están
 * incluidas en el tipo Database regenerado (post-Unificación Fase 1+3, sprint 7-8).
 * Las llamadas a .from() están totalmente tipadas. Si en el futuro algún campo
 * deja de cuadrar tras una migración, regenerar tipos con
 *   supabase gen types typescript --project-id gtphkowfcuiqbvfkwjxb
 * antes de añadir cualquier `as any`.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '../supabase/client'
import { logError } from '../utils/logger'
import {
  authenticate,
  getSupplies,
  getConsumptionData,
  supplyRawToCupsFields,
  consumptionRawToInsert,
  aggregateConsumptionByPeriod,
  clearToken,
} from '../services/datadis'
import type { Database } from '../types/database'
import type {
  DatadisToken,
  DatadisConsumption,
} from '../types/entities'

// ─── Tipos derivados del schema generado ───────────────────────────────────

type DatadisTokenDbInsert = Database['public']['Tables']['datadis_tokens']['Insert']
type DatadisConsumptionDbInsert = Database['public']['Tables']['datadis_consumptions']['Insert']
type CupsUpdate = Database['public']['Tables']['cups']['Update']
type FacturaInsert = Database['public']['Tables']['facturas']['Insert']

// ─── Query keys ────────────────────────────────────────────────────────────

const QK = {
  token: (empresaId: string) => ['datadis-token', empresaId] as const,
  consumptions: (cupsId: string) => ['datadis-consumptions', cupsId] as const,
}

// ─── Hook: credenciales almacenadas ────────────────────────────────────────

/**
 * Obtiene el token/credenciales de Datadis guardadas para una empresa.
 */
export function useDatadisToken(empresaId: string | null | undefined) {
  return useQuery({
    queryKey: QK.token(empresaId ?? ''),
    enabled: !!empresaId,
    queryFn: async (): Promise<Omit<DatadisToken, 'password_enc' | 'token_cache'> | null> => {
      const { data, error } = await supabase
        .from('datadis_tokens')
        .select('id, empresa_id, username, autorizado, ultimo_error, token_expira, created_at, updated_at')
        .eq('empresa_id', empresaId!)
        .maybeSingle()

      if (error) { logError(error, 'useDatadisToken'); throw error }
      return data ?? null
    },
  })
}

// ─── Hook: guardar credenciales ────────────────────────────────────────────

/**
 * Guarda o actualiza las credenciales de Datadis para una empresa.
 * Hace upsert por empresa_id (unique constraint).
 */
export function useGuardarToken(empresaId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { username: string; password: string }) => {
      const insert: DatadisTokenDbInsert = {
        empresa_id: empresaId,
        username: payload.username.trim().toUpperCase(),
        // En producción: Edge Function cifra la contraseña.
        // El prefijo "plain:" indica que debe cifrarse en el próximo sync.
        password_enc: `plain:${payload.password}`,
        autorizado: false,
        token_cache: null,
        token_expira: null,
        ultimo_error: null,
      }

      const { error } = await supabase
        .from('datadis_tokens')
        .upsert(insert, { onConflict: 'empresa_id' })

      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Credenciales Datadis guardadas')
      void qc.invalidateQueries({ queryKey: QK.token(empresaId) })
    },
    onError: (err: Error) => {
      logError(err, 'useGuardarToken')
      toast.error(`Error al guardar credenciales: ${err.message}`)
    },
  })
}

// ─── Hook: eliminar integración ────────────────────────────────────────────

export function useEliminarToken(empresaId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('datadis_tokens')
        .delete()
        .eq('empresa_id', empresaId)

      if (error) throw error
      clearToken()
    },
    onSuccess: () => {
      toast.success('Integración con Datadis desconectada')
      void qc.invalidateQueries({ queryKey: QK.token(empresaId) })
    },
    onError: (err: Error) => {
      logError(err, 'useEliminarToken')
      toast.error(`Error al desconectar: ${err.message}`)
    },
  })
}

// ─── Hook: consumos ya descargados en DB ────────────────────────────────────

export function useDatadisConsumptions(
  cupsId: string | null | undefined,
  fechaDesde?: string,
  fechaHasta?: string,
) {
  return useQuery({
    queryKey: [...QK.consumptions(cupsId ?? ''), fechaDesde, fechaHasta],
    enabled: !!cupsId,
    queryFn: async (): Promise<DatadisConsumption[]> => {
      let q = supabase
        .from('datadis_consumptions')
        .select('*')
        .eq('cups_id', cupsId!)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: true })

      if (fechaDesde) q = q.gte('fecha', fechaDesde)
      if (fechaHasta) q = q.lte('fecha', fechaHasta)

      const { data, error } = await q
      if (error) { logError(error, 'useDatadisConsumptions'); throw error }
      // El campo `metodo_obtencion` está tipado como string en el schema generado,
      // pero en runtime es siempre 'real' | 'estimada' (constraint a nivel de servicio).
      return (data ?? []) as DatadisConsumption[]
    },
  })
}

// ─── Hook: sincronización principal ────────────────────────────────────────

interface SyncOptions {
  cupsId: string
  codigoCups: string
  empresaId: string
  /** Fecha inicio descarga consumos (ISO). Por defecto: hace 12 meses */
  fechaDesde?: string
  /** Fecha fin descarga consumos (ISO). Por defecto: hoy */
  fechaHasta?: string
  /** Si true, también genera facturas mensuales en tabla facturas */
  generarFacturas?: boolean
}

interface SyncResult {
  datosActualizados: boolean
  consumosDescargados: number
  facturasGeneradas: number
}

/**
 * Mutación principal de sincronización con Datadis.
 *
 * Pasos internos:
 *   1. Lee credenciales de DB
 *   2. Autentica en la API de Datadis
 *   3. Busca el CUPS en la lista de suministros del usuario
 *   4. Descarga el detalle técnico → actualiza tabla cups
 *   5. Descarga consumos horarios → inserta en datadis_consumptions (upsert)
 *   6. (Opcional) Agrega consumos por mes → upsert en facturas
 *   7. Actualiza energías anuales por período en cups
 */
export function useDatadisSync() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (opts: SyncOptions): Promise<SyncResult> => {
      const {
        cupsId,
        codigoCups,
        empresaId,
        generarFacturas = true,
      } = opts

      const hoy = new Date()
      const fechaHasta = opts.fechaHasta ?? hoy.toISOString().slice(0, 10)
      const hace12Meses = new Date(hoy)
      hace12Meses.setFullYear(hace12Meses.getFullYear() - 1)
      const fechaDesde = opts.fechaDesde ?? hace12Meses.toISOString().slice(0, 10)

      // ── Paso 1: leer credenciales de DB ──────────────────────────────────
      const { data: tokenRow, error: tokenErr } = await supabase
        .from('datadis_tokens')
        .select('username, password_enc')
        .eq('empresa_id', empresaId)
        .single()

      if (tokenErr || !tokenRow) {
        throw new Error('No hay credenciales Datadis configuradas para esta empresa.')
      }

      const password = tokenRow.password_enc.startsWith('plain:')
        ? tokenRow.password_enc.slice(6)
        : tokenRow.password_enc

      // ── Paso 2: autenticar ────────────────────────────────────────────────
      const authResult = await authenticate(tokenRow.username, password)
      if (!authResult.ok) {
        await supabase
          .from('datadis_tokens')
          .update({ autorizado: false, ultimo_error: authResult.error ?? 'Error de autenticación' })
          .eq('empresa_id', empresaId)

        throw new Error(`Autenticación en Datadis fallida: ${authResult.error}`)
      }

      // Marcar como autorizado
      await supabase
        .from('datadis_tokens')
        .update({ autorizado: true, ultimo_error: null })
        .eq('empresa_id', empresaId)

      // ── Paso 3: buscar el CUPS en los suministros del usuario ─────────────
      const supplies = await getSupplies()
      const supply = supplies.find(
        s => s.cups.toUpperCase() === codigoCups.toUpperCase(),
      )

      if (!supply) {
        throw new Error(
          `El CUPS ${codigoCups} no aparece en la cuenta Datadis de ${tokenRow.username}. ` +
          `Asegúrate de que el titular ha autorizado el acceso a este suministro.`,
        )
      }

      // ── Paso 4: actualizar datos técnicos del CUPS ────────────────────────
      const cupsUpdate: CupsUpdate = supplyRawToCupsFields(supply)
      const { error: cupsErr } = await supabase
        .from('cups')
        .update(cupsUpdate)
        .eq('id', cupsId)

      if (cupsErr) throw new Error(`Error actualizando CUPS: ${cupsErr.message}`)

      // ── Paso 5: descargar consumos horarios ───────────────────────────────
      const pointType = (supply.pointType === 1 ? 1 : 2) as 1 | 2
      const rawConsumptions = await getConsumptionData(
        codigoCups,
        supply.distributorCode,
        fechaDesde,
        fechaHasta,
        pointType,
      )

      let consumosDescargados = 0

      if (rawConsumptions.length > 0) {
        const inserts: DatadisConsumptionDbInsert[] = rawConsumptions.map(
          r => consumptionRawToInsert(r, cupsId),
        )

        const { error: consErr } = await supabase
          .from('datadis_consumptions')
          .upsert(inserts, { onConflict: 'cups_id,fecha,hora' })

        if (consErr) throw new Error(`Error guardando consumos: ${consErr.message}`)
        consumosDescargados = inserts.length
      }

      // ── Paso 6 (opcional): generar/actualizar facturas mensuales ──────────
      let facturasGeneradas = 0

      if (generarFacturas && rawConsumptions.length > 0) {
        const byMonth: Record<string, typeof rawConsumptions> = {}
        for (const c of rawConsumptions) {
          const [year, month] = datadisDateToMonthKey(c.date)
          const key = `${year}-${month}`
          if (!byMonth[key]) byMonth[key] = []
          byMonth[key].push(c)
        }

        for (const [key, monthConsumptions] of Object.entries(byMonth)) {
          const [yearStr, monthStr] = key.split('-')
          const year = parseInt(yearStr, 10)
          const month = parseInt(monthStr, 10)

          const totalKwh = monthConsumptions.reduce((s, c) => s + (c.consumptionKWh ?? 0), 0)
          const totalExc = monthConsumptions.reduce((s, c) => s + (c.surplusEnergyKWh ?? 0), 0)

          const facturaUpsert: FacturaInsert = {
            cups_id: cupsId,
            month,
            year,
            consumption_kwh: Math.round(totalKwh * 100) / 100,
            surplus_kwh: Math.round(totalExc * 100) / 100,
            total_amount_eur: 0,
            surplus_compensation_eur: 0,
            retailer: supply.marketer ?? '',
            billed_days: daysInMonth(year, month),
          }

          const { error: facErr } = await supabase
            .from('facturas')
            .upsert(facturaUpsert, { onConflict: 'cups_id,month,year' })

          if (!facErr) facturasGeneradas++
        }

        // ── Paso 7: actualizar energías anuales en cups ───────────────────
        const tarifa = supply.accessTariff ?? '2.0TD'
        const byPeriod = aggregateConsumptionByPeriod(rawConsumptions, tarifa)
        const energiasUpdate: CupsUpdate = {
          energia_p1_kwh: Math.round((byPeriod.p1 ?? 0) * 100) / 100,
          energia_p2_kwh: Math.round((byPeriod.p2 ?? 0) * 100) / 100,
          energia_p3_kwh: Math.round((byPeriod.p3 ?? 0) * 100) / 100,
          energia_p4_kwh: Math.round((byPeriod.p4 ?? 0) * 100) / 100,
          energia_p5_kwh: Math.round((byPeriod.p5 ?? 0) * 100) / 100,
          energia_p6_kwh: Math.round((byPeriod.p6 ?? 0) * 100) / 100,
        }
        await supabase
          .from('cups')
          .update(energiasUpdate)
          .eq('id', cupsId)
      }

      return { datosActualizados: true, consumosDescargados, facturasGeneradas }
    },

    onSuccess: (result, opts) => {
      const { consumosDescargados, facturasGeneradas } = result
      toast.success(
        `Sincronización completada: ${consumosDescargados} lecturas descargadas` +
        (facturasGeneradas > 0 ? `, ${facturasGeneradas} facturas generadas` : ''),
      )
      void qc.invalidateQueries({ queryKey: ['cups'] })
      void qc.invalidateQueries({ queryKey: ['facturas'] })
      void qc.invalidateQueries({ queryKey: QK.consumptions(opts.cupsId) })
      void qc.invalidateQueries({ queryKey: QK.token(opts.empresaId) })
    },

    onError: (err: Error, opts) => {
      logError(err, 'useDatadisSync')
      toast.error(`Error sincronizando con Datadis: ${err.message}`)
      void supabase
        .from('datadis_tokens')
        .update({ ultimo_error: err.message })
        .eq('empresa_id', opts.empresaId)
    },
  })
}

// ─── Helpers internos ───────────────────────────────────────────────────────

function datadisDateToMonthKey(dateStr: string): [number, number] {
  const parts = dateStr.replace(/-/g, '/').split('/')
  return [parseInt(parts[0], 10), parseInt(parts[1], 10)]
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}
