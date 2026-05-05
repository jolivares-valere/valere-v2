import { Plus, Trash2, Star } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { CARGOS_SUGERIDOS, type ContactoInput } from '../api'

interface Props {
  contactos: ContactoInput[]
  onChange: (contactos: ContactoInput[]) => void
  /** prefijo para los htmlFor (evita colisión cuando hay 2 modales en el árbol) */
  idPrefix?: string
}

/**
 * Bloque reutilizable para gestionar lista de contactos en NuevoLeadModal y
 * EditarLeadModal. Permite añadir, editar, marcar uno como principal y
 * eliminar (soft).
 *
 * Origen: feedback Carolina A 2026-05-04 — B2B necesita varios contactos
 * con cargo (Compras / Mantenimiento / Energía / Gerencia).
 */
export default function ContactosForm({ contactos, onChange, idPrefix = 'c' }: Props) {
  const visibles = contactos.filter(c => !c._eliminar)

  const update = (index: number, patch: Partial<ContactoInput>) => {
    const next = [...contactos]
    // Mapear index visible al index real (saltando eliminados)
    let visIdx = -1
    for (let i = 0; i < next.length; i++) {
      if (!next[i]?._eliminar) {
        visIdx++
        if (visIdx === index) {
          next[i] = { ...next[i]!, ...patch }
          // Si marcamos uno como principal, desmarcar los demás
          if (patch.es_principal === true) {
            for (let j = 0; j < next.length; j++) {
              if (j !== i && !next[j]?._eliminar) {
                next[j] = { ...next[j]!, es_principal: false }
              }
            }
          }
          break
        }
      }
    }
    onChange(next)
  }

  const addContacto = () => {
    // Si es el primero visible, marcarlo como principal por defecto
    const tieneAlguno = visibles.some(c => c.es_principal)
    onChange([
      ...contactos,
      { nombre: '', cargo: '', telefono: '', email: '', es_principal: !tieneAlguno },
    ])
  }

  const removeContacto = (index: number) => {
    const next = [...contactos]
    let visIdx = -1
    for (let i = 0; i < next.length; i++) {
      if (!next[i]?._eliminar) {
        visIdx++
        if (visIdx === index) {
          if (next[i]?.id) {
            // Existente: soft-delete via _eliminar
            next[i] = { ...next[i]!, _eliminar: true }
          } else {
            // Nuevo no guardado: quitar del array
            next.splice(i, 1)
          }
          break
        }
      }
    }
    // Si quitamos el principal, marcar el siguiente disponible
    const aunVivos = next.filter(c => !c._eliminar)
    if (!aunVivos.some(c => c.es_principal) && aunVivos.length > 0) {
      let firstVisible = -1
      for (let i = 0; i < next.length; i++) {
        if (!next[i]?._eliminar) {
          firstVisible = i
          break
        }
      }
      if (firstVisible >= 0) {
        next[firstVisible] = { ...next[firstVisible]!, es_principal: true }
      }
    }
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {visibles.length === 0 && (
        <p className="text-sm text-slate-500 italic">
          No hay contactos. Pulsa "+ Añadir contacto" para empezar.
        </p>
      )}

      {visibles.map((c, idx) => (
        <div
          key={c.id ?? `nuevo-${idx}`}
          className={`rounded-lg border px-3 py-3 ${c.es_principal ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-white'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => update(idx, { es_principal: !c.es_principal })}
              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors ${
                c.es_principal
                  ? 'text-amber-700 bg-amber-100'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
              title={c.es_principal ? 'Contacto principal' : 'Marcar como principal'}
            >
              <Star className={`h-3.5 w-3.5 ${c.es_principal ? 'fill-amber-500 text-amber-600' : ''}`} />
              {c.es_principal ? 'Principal' : 'Marcar principal'}
            </button>
            <button
              type="button"
              onClick={() => removeContacto(idx)}
              className="text-xs text-red-600 hover:bg-red-50 rounded px-2 py-1 flex items-center gap-1"
              title="Eliminar contacto"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor={`${idPrefix}_${idx}_nombre`}>Nombre</Label>
              <Input
                id={`${idPrefix}_${idx}_nombre`}
                value={c.nombre ?? ''}
                onChange={e => update(idx, { nombre: e.target.value })}
                placeholder="Persona de contacto"
              />
            </div>
            <div>
              <Label htmlFor={`${idPrefix}_${idx}_cargo`}>Cargo / Departamento</Label>
              <Input
                id={`${idPrefix}_${idx}_cargo`}
                list={`${idPrefix}_${idx}_cargo_list`}
                value={c.cargo ?? ''}
                onChange={e => update(idx, { cargo: e.target.value })}
                placeholder="Ej: Compras, Mantenimiento"
              />
              <datalist id={`${idPrefix}_${idx}_cargo_list`}>
                {CARGOS_SUGERIDOS.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <Label htmlFor={`${idPrefix}_${idx}_telefono`}>Teléfono</Label>
              <Input
                id={`${idPrefix}_${idx}_telefono`}
                value={c.telefono ?? ''}
                onChange={e => update(idx, { telefono: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor={`${idPrefix}_${idx}_email`}>Email</Label>
              <Input
                id={`${idPrefix}_${idx}_email`}
                type="email"
                value={c.email ?? ''}
                onChange={e => update(idx, { email: e.target.value })}
              />
            </div>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addContacto} className="w-full">
        <Plus className="h-4 w-4 mr-1.5" />
        Añadir contacto
      </Button>
    </div>
  )
}
