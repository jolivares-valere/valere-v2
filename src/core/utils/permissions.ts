import type { RolUsuario } from '../types/entities'

export type Action = 'create' | 'read' | 'update' | 'delete' | 'import' | 'export'

export type Resource =
  | 'empresa' | 'contacto' | 'contrato' | 'oportunidad'
  | 'actividad' | 'propuesta' | 'admin'

const ALL: Action[] = ['create', 'read', 'update', 'delete', 'import', 'export']
const RW: Action[] = ['create', 'read', 'update', 'import', 'export']
const OWN: Action[] = ['create', 'read', 'update']
const RO: Action[] = ['read']
const RO_EXPORT: Action[] = ['read', 'export']

const matrix: Record<RolUsuario, Partial<Record<Resource, Action[]>>> = {
  admin: {
    empresa: ALL, contacto: ALL, contrato: ALL, oportunidad: ALL,
    actividad: ALL, propuesta: ALL, admin: ALL,
  },
  jefe_equipo: {
    empresa: RW, contacto: RW, contrato: RW, oportunidad: RW,
    actividad: RW, propuesta: RW,
  },
  comercial: {
    empresa: [...OWN, 'export'],
    contacto: OWN,
    contrato: [...OWN, 'export'],
    oportunidad: OWN,
    actividad: OWN,
    propuesta: OWN,
  },
  visor: {
    empresa: RO_EXPORT, contacto: RO, contrato: RO_EXPORT,
    oportunidad: RO, actividad: RO, propuesta: RO,
  },
}

export function canDo(rol: RolUsuario, action: Action, resource: Resource): boolean {
  return matrix[rol]?.[resource]?.includes(action) ?? false
}
