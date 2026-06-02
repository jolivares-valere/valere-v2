import { useState, useEffect } from 'react'
import { supabase } from '@/core/supabase/client'

/** Indicador ESIOS 600 — precio spot OMIE en EUR/MWh */
const INDICADOR_PRECIO_SPOT = 600

interface UsePoolPrecioMedioResult {
  precioMedioEurKwh: number | null
  loading: boolean
  error: string | null
}

/**
 * Devuelve el precio pool OMIE promedio para un rango de fechas.
 *
 * Lee de la tabla precios_pool_horarios (ya cacheada por el cron nocturno).
 * El indicador 600 almacena valores en EUR/MWh — se convierte a EUR/kWh (/1000).
 *
 * @param fechaInicio ISO date string 'YYYY-MM-DD'
 * @param fechaFin    ISO date string 'YYYY-MM-DD'
 * @param enabled     Si false, no lanza la query (para renders condicionales)
 */
export function usePoolPrecioMedio(
  fechaInicio: string | null,
  fechaFin: string | null,
  enabled = true
): UsePoolPrecioMedioResult {
  const [precioMedioEurKwh, setPrecioMedioEurKwh] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !fechaInicio || !fechaFin) {
      setPrecioMedioEurKwh(null)
      return
    }

    let cancelled = false

    const fetch = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data, error: dbError } = await (supabase as any)
          .from('precios_pool_horarios')
          .select('precio_eur_mwh')
          .eq('indicador_id', INDICADOR_PRECIO_SPOT)
          .gte('hora_utc', fechaInicio)
          .lte('hora_utc', fechaFin + 'T23:59:59Z')

        if (dbError) throw new Error(dbError.message)

        if (!data || data.length === 0) {
          if (!cancelled) {
            setPrecioMedioEurKwh(null)
            setError('Sin datos de precio pool para el periodo seleccionado')
          }
          return
        }

        const sum = (data as Array<{ precio_eur_mwh: number }>)
          .reduce((acc, row) => acc + (row.precio_eur_mwh ?? 0), 0)
        const media = sum / data.length
        // Convertir EUR/MWh -> EUR/kWh
        const mediaEurKwh = media / 1000

        if (!cancelled) {
          setPrecioMedioEurKwh(mediaEurKwh)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error desconocido')
          setPrecioMedioEurKwh(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [fechaInicio, fechaFin, enabled])

  return { precioMedioEurKwh, loading, error }
}
