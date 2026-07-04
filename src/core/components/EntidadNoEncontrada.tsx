import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { trackCustom } from '../utils/telemetry'

interface Props {
  /** Nombre legible de la entidad: 'empresa', 'contrato', 'expediente'… */
  entidad: string
  /** Ruta del listado al que volver. */
  backTo: string
  /** Etiqueta del enlace de vuelta. */
  backLabel: string
}

/**
 * Pantalla de "entidad no encontrada" (H6 — auditoría de enlaces FASE 2).
 * El 200-vacío de maybeSingle() es invisible para el wrapper de red, así que
 * la huella la deja la UI: evento custom { tipo: 'entidad_no_encontrada' }.
 */
export default function EntidadNoEncontrada({ entidad, backTo, backLabel }: Props) {
  const { pathname } = useLocation()

  useEffect(() => {
    trackCustom('entidad_no_encontrada', { entidad, path: pathname })
  }, [entidad, pathname])

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <SearchX className="h-8 w-8 text-slate-300" aria-hidden />
      <p className="text-slate-500">
        No se ha encontrado {entidad === 'empresa' ? 'la' : 'el'} {entidad}. Puede que se haya
        eliminado o que el enlace sea antiguo.
      </p>
      <Link to={backTo} className="text-sm text-blue-600 hover:underline">
        ← {backLabel}
      </Link>
    </div>
  )
}
