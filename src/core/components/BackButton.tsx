import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  /** Ruta destino, ej: '/oportunidades' */
  to: string
  /** Texto del botón, ej: 'Volver a Oportunidades' */
  label: string
  className?: string
}

/**
 * Botón de navegación "Atrás" prominente con color de marca.
 * Usar en pantallas de 2º nivel (detalle, edición) en la cabecera,
 * antes del título h1.
 */
export default function BackButton({ to, label, className = '' }: BackButtonProps) {
  return (
    <Link
      to={to}
      className={`mb-6 inline-flex items-center gap-2 rounded-xl bg-valere-blue-dark/10 px-4 py-2 text-sm font-medium text-valere-blue-dark transition-colors hover:bg-valere-blue-dark hover:text-white ${className}`}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  )
}
