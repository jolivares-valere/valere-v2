import React, { useState } from 'react'
import { Edit2, Save, X } from 'lucide-react'
import { useCustomFieldsSchema, useCustomFieldValues, useUpsertCustomFieldValue } from '../hooks/useCustomFields'
import type { EntidadTipo, CustomFieldSchema, CustomFieldValue } from '../types/entities'
import { toast } from 'sonner'

interface Props {
  entidad_tipo: EntidadTipo
  entidad_id: string
}

function valueFor(values: CustomFieldValue[], schemaId: string): CustomFieldValue | undefined {
  return values.find(v => v.schema_id === schemaId)
}

function displayValue(s: CustomFieldSchema, v: CustomFieldValue | undefined): string {
  if (!v) return '—'
  switch (s.tipo_dato) {
    case 'texto':
    case 'lista': return v.valor_texto ?? '—'
    case 'numero': return v.valor_numero != null ? String(v.valor_numero) : '—'
    case 'fecha': return v.valor_fecha ?? '—'
    case 'booleano': return v.valor_json === true ? 'Sí' : v.valor_json === false ? 'No' : '—'
    case 'multiselect': return Array.isArray(v.valor_json) ? (v.valor_json as string[]).join(', ') || '—' : '—'
    default: return '—'
  }
}

function draftFromValue(s: CustomFieldSchema, v: CustomFieldValue | undefined): string {
  if (!v) return ''
  switch (s.tipo_dato) {
    case 'texto':
    case 'lista': return v.valor_texto ?? ''
    case 'numero': return v.valor_numero != null ? String(v.valor_numero) : ''
    case 'fecha': return v.valor_fecha ?? ''
    case 'booleano': return v.valor_json === true ? 'true' : v.valor_json === false ? 'false' : ''
    case 'multiselect': return Array.isArray(v.valor_json) ? (v.valor_json as string[]).join(',') : ''
    default: return ''
  }
}

function buildPayload(
  s: CustomFieldSchema,
  raw: string,
  entidad_id: string,
  existing: CustomFieldValue | undefined,
): Record<string, unknown> {
  const base: Record<string, unknown> = { schema_id: s.id, entidad_id }
  if (existing?.id) base.id = existing.id
  switch (s.tipo_dato) {
    case 'texto':
    case 'lista': return { ...base, valor_texto: raw || null }
    case 'numero': return { ...base, valor_numero: raw ? parseFloat(raw) : null }
    case 'fecha': return { ...base, valor_fecha: raw || null }
    case 'booleano': return { ...base, valor_json: raw === 'true' ? true : raw === 'false' ? false : null }
    case 'multiselect': return { ...base, valor_json: raw ? raw.split(',').map(x => x.trim()).filter(Boolean) : null }
    default: return { ...base, valor_texto: raw || null }
  }
}

export default function CustomFieldsPanel({ entidad_tipo, entidad_id }: Props) {
  const { data: schema = [] } = useCustomFieldsSchema(entidad_tipo)
  const { data: values = [], refetch } = useCustomFieldValues(entidad_id)
  const upsert = useUpsertCustomFieldValue()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})

  if (schema.length === 0) return null

  const startEdit = () => {
    const d: Record<string, string> = {}
    for (const s of schema) d[s.id] = draftFromValue(s, valueFor(values, s.id))
    setDraft(d)
    setEditing(true)
  }

  const cancel = () => setEditing(false)

  const save = async () => {
    try {
      for (const s of schema) {
        await upsert.mutateAsync(buildPayload(s, draft[s.id] ?? '', entidad_id, valueFor(values, s.id)) as never)
      }
      await refetch()
      setEditing(false)
      toast.success('Campos actualizados')
    } catch {
      toast.error('Error guardando campos')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Campos personalizados</h3>
        {!editing ? (
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" /> Editar
          </button>
        ) : (
          <div className="flex gap-3">
            <button onClick={cancel} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" /> Cancelar
            </button>
            <button
              onClick={save}
              disabled={upsert.isPending}
              className="flex items-center gap-1 text-xs font-semibold text-valere-blue-dark hover:text-valere-blue-medium disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> Guardar
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {schema.map(s => (
          <div key={s.id} className="rounded-xl bg-slate-50 p-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-valere-ink/40">
              {s.etiqueta}{s.obligatorio && <span className="ml-0.5 text-red-400">*</span>}
            </p>
            {editing ? (
              <FieldInput
                schema={s}
                value={draft[s.id] ?? ''}
                onChange={v => setDraft(d => ({ ...d, [s.id]: v }))}
              />
            ) : (
              <p className="text-sm font-medium text-valere-blue-dark">
                {displayValue(s, valueFor(values, s.id))}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function FieldInput({
  schema,
  value,
  onChange,
}: {
  schema: CustomFieldSchema
  value: string
  onChange: (v: string) => void
}) {
  const cls =
    'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-valere-blue-medium/30'
  const opciones = Array.isArray(schema.opciones_lista) ? (schema.opciones_lista as string[]) : []

  switch (schema.tipo_dato) {
    case 'texto':
      return <input type="text" className={cls} value={value} onChange={e => onChange(e.target.value)} />

    case 'numero':
      return <input type="number" step="any" className={cls} value={value} onChange={e => onChange(e.target.value)} />

    case 'fecha':
      return <input type="date" className={cls} value={value} onChange={e => onChange(e.target.value)} />

    case 'booleano':
      return (
        <select className={cls} value={value} onChange={e => onChange(e.target.value)}>
          <option value="">— Sin definir</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </select>
      )

    case 'lista':
      return (
        <select className={cls} value={value} onChange={e => onChange(e.target.value)}>
          <option value="">— Seleccionar</option>
          {opciones.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )

    case 'multiselect': {
      const selected = value ? value.split(',').map(x => x.trim()).filter(Boolean) : []
      const toggle = (o: string) => {
        const next = selected.includes(o) ? selected.filter(x => x !== o) : [...selected, o]
        onChange(next.join(','))
      }
      return (
        <div className="space-y-1">
          {opciones.map(o => (
            <label key={o} className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} className="rounded" />
              <span className="text-xs text-slate-700">{o}</span>
            </label>
          ))}
        </div>
      )
    }

    default:
      return <input type="text" className={cls} value={value} onChange={e => onChange(e.target.value)} />
  }
}
