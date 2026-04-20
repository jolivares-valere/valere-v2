import { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'

type Variant = 'danger' | 'warning' | 'info'

interface Props {
  isOpen: boolean
  title: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: Variant
  submitting?: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

const variantBtn: Record<Variant, string> = {
  danger: 'bg-red-600 hover:bg-red-700 disabled:bg-red-400',
  warning: 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400',
  info: 'bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400',
}

const variantIcon: Record<Variant, string> = {
  danger: 'text-red-600 bg-red-50',
  warning: 'text-amber-600 bg-amber-50',
  info: 'text-slate-700 bg-slate-100',
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  submitting = false,
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const confirmRef = useRef<HTMLButtonElement | null>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    confirmRef.current?.focus()

    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) { onCancel(); return }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusables = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previouslyFocused.current?.focus?.()
    }
  }, [isOpen, submitting, onCancel])

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40"
        onClick={() => { if (!submitting) onCancel() }}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start gap-3">
          <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${variantIcon[variant]}`}>
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h2 id="confirm-dialog-title" className="text-base font-semibold text-slate-900">{title}</h2>
            <div className="mt-1 text-sm text-slate-600">{message}</div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            aria-label="Cerrar"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => void onConfirm()}
            disabled={submitting}
            className={`rounded-md px-4 py-2 text-sm text-white disabled:cursor-not-allowed ${variantBtn[variant]}`}
          >
            {submitting ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </>
  )
}
