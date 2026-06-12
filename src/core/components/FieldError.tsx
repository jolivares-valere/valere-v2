import { cn } from '@/core/utils/cn'

interface Props {
  message?: string | null
  className?: string
  id?: string
}

/**
 * FieldError consistente — para usar bajo cualquier <input>/<select>/<textarea> de form.
 * Conectar `id` con el atributo `aria-describedby` del input para a11y.
 */
export default function FieldError({ message, className, id }: Props) {
  if (!message) return null
  return (
    <p id={id} role="alert" className={cn('mt-1 text-xs text-red-600 leading-tight', className)}>
      {message}
    </p>
  )
}
