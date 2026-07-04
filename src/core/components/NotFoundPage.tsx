import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { trackCustom } from '../utils/telemetry'

/**
 * Página 404 propia (H5 — auditoría de enlaces FASE 2).
 * Sustituye al catch-all silencioso: informa al usuario y deja huella en
 * telemetría (evento custom { tipo: 'ruta_no_encontrada', path }) para que
 * cada clic a un enlace muerto quede fichado.
 */
export default function NotFoundPage() {
  const { pathname } = useLocation()

  useEffect(() => {
    trackCustom('ruta_no_encontrada', { path: pathname })
  }, [pathname])

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <Compass className="h-7 w-7 text-slate-400" />
        </div>
        <h1 className="text-lg font-display font-bold text-valere-blue-dark">Página no encontrada</h1>
        <p className="text-sm text-slate-500">
          La dirección <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{pathname}</code> no
          existe en el CRM. Si has llegado aquí desde un enlace de la aplicación, el aviso ya ha quedado
          registrado para que lo arreglemos.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-valere-blue-dark px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-valere-blue-medium"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  )
}
