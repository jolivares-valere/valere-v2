import React from 'react'

export type StatusVariant =
  | 'success'    // verde — estado positivo (activo, completada, renovado)
  | 'warning'    // amarillo/ámbar — en proceso, pendiente
  | 'danger'     // rojo — crítico, perdido, error
  | 'info'       // azul — en gestión, en análisis
  | 'neutral'    // gris — baja, cerrada, inactiva
  | 'accent'     // indigo — énfasis secundario
  | 'alert'      // naranja — alta prioridad, próximo

type Size = 'sm' | 'md'

interface Props {
  variant?: StatusVariant
  size?: Size
  children: React.ReactNode
  className?: string
}

const STYLES: Record<StatusVariant, string> = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  neutral: 'bg-slate-100 text-slate-600',
  accent: 'bg-indigo-100 text-indigo-800',
  alert: 'bg-orange-100 text-orange-800',
}

const SIZES: Record<Size, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
}

/**
 * Badge semántico unificado para estados de entidades (contratos,
 * incidencias, renovaciones, actividades, etc.).
 *
 * Elige la `variant` según el significado del estado, no el valor concreto:
 *   - `success` para estados positivos finales (activo, renovado, completada)
 *   - `warning` para estados intermedios no resueltos
 *   - `danger` para estados críticos o de error
 *   - `info` para estados en curso activos
 *   - `neutral` para estados inactivos o cerrados
 *   - `accent` para variantes secundarias
 *   - `alert` para estados de alta urgencia no resueltos
 */
export default function StatusBadge({
  variant = 'neutral',
  size = 'md',
  children,
  className = '',
}: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${SIZES[size]} ${STYLES[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
