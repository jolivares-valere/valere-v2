import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Loader2 } from 'lucide-react'

/**
 * Sprint 2026-05-19: celda editable inline para vista tabla.
 *
 * Comportamiento:
 *   - Doble click → entra en modo edición.
 *   - Enter → guarda.
 *   - Esc → cancela.
 *   - Blur con cambio → guarda.
 *   - Spinner mientras guarda. Toast verde/rojo al terminar.
 */

type CampoTipo = 'text' | 'number' | 'date' | 'datetime' | 'select'

interface Props {
  value: string | number | null
  /** Función que recibe el valor nuevo como string y devuelve promesa. */
  onSave: (newValue: string) => Promise<unknown>
  tipo?: CampoTipo
  /** Opciones para tipo='select' */
  options?: Array<{ value: string; label: string }>
  /** Label visible para vacío */
  emptyLabel?: string
  /** Prefijo display (ej. "€") */
  prefix?: string
  /** Sufijo display (ej. "kWh") */
  suffix?: string
  /** Si true, no muestra el lápiz ni edita */
  readonly?: boolean
}

function formatDisplay(v: Props['value'], tipo: CampoTipo, options?: Props['options']): string {
  if (v === null || v === undefined || v === '') return ''
  const s = String(v)
  if (tipo === 'select' && options) {
    const opt = options.find(o => o.value === s)
    return opt?.label ?? s
  }
  if (tipo === 'date') {
    try {
      const d = new Date(s)
      if (!isNaN(d.getTime())) return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch { /* fall through */ }
  }
  if (tipo === 'datetime') {
    try {
      const d = new Date(s)
      if (!isNaN(d.getTime())) return d.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    } catch { /* fall through */ }
  }
  return s
}

export default function CeldaEditable({
  value, onSave, tipo = 'text', options, emptyLabel = '—', prefix, suffix, readonly,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value == null ? '' : String(value))
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null)

  useEffect(() => {
    if (!editing) setDraft(value == null ? '' : String(value))
  }, [value, editing])

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  const startEdit = () => {
    if (readonly || saving) return
    setEditing(true)
  }

  const commit = async () => {
    if (!editing) return
    const original = value == null ? '' : String(value)
    if (draft === original) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(draft)
      toast.success('Guardado')
      setEditing(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message
        : (typeof e === 'object' && e !== null && 'message' in e && typeof (e as { message: unknown }).message === 'string')
          ? (e as { message: string }).message
          : 'Error desconocido'
      toast.error('No se pudo guardar', { description: msg })
      setDraft(original)
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    setDraft(value == null ? '' : String(value))
    setEditing(false)
  }

  if (editing) {
    if (tipo === 'select' && options) {
      return (
        <div className="flex items-center gap-1">
          <select
            ref={el => { inputRef.current = el }}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => void commit()}
            onKeyDown={e => {
              if (e.key === 'Escape') cancel()
              if (e.key === 'Enter') void commit()
            }}
            className="w-full rounded border border-valere-blue-dark bg-white px-2 py-1 text-xs focus:outline-none"
          >
            <option value="">—</option>
            {options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {saving && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
        </div>
      )
    }
    const inputType = tipo === 'number' ? 'number'
      : tipo === 'date' ? 'date'
      : tipo === 'datetime' ? 'datetime-local'
      : 'text'
    return (
      <div className="flex items-center gap-1">
        <input
          ref={el => { inputRef.current = el }}
          type={inputType}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={e => {
            if (e.key === 'Escape') cancel()
            if (e.key === 'Enter') void commit()
          }}
          className="w-full rounded border border-valere-blue-dark bg-white px-2 py-1 text-xs focus:outline-none"
        />
        {saving && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
      </div>
    )
  }

  const display = formatDisplay(value, tipo, options)
  return (
    <button
      type="button"
      onDoubleClick={startEdit}
      onClick={e => { e.detail === 2 && startEdit() }}
      title={readonly ? undefined : 'Doble click para editar'}
      className={`group inline-flex w-full items-center justify-between gap-1 rounded px-1 text-left text-xs ${readonly ? '' : 'hover:bg-amber-50'}`}
    >
      <span className={display ? 'text-slate-900' : 'text-slate-400'}>
        {display ? `${prefix ?? ''}${display}${suffix ?? ''}` : emptyLabel}
      </span>
      {!readonly && (
        <Pencil className="h-3 w-3 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  )
}
