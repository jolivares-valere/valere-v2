import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Mock toast antes del import del hook
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// Mock supabase.from(...).insert(...).select(...).single()
// Usamos vi.hoisted para que los mocks estén disponibles cuando vi.mock
// ejecuta su factory (que se hoistea al top del módulo).
const { fromMock, insertSingleMock, insertOnlyMock } = vi.hoisted(() => {
  const insertSingleMock = vi.fn()
  const insertOnlyMock = vi.fn()
  const fromMock = vi.fn(() => ({
    insert: (payload: unknown) => {
      const chain = {
        select: () => ({ single: () => insertSingleMock(payload) }),
        then: (resolve: (v: { error: null }) => void) => {
          insertOnlyMock(payload)
          resolve({ error: null })
        },
      }
      return chain
    },
  }))
  return { fromMock, insertSingleMock, insertOnlyMock }
})

vi.mock('../supabase/client', () => ({
  // Boundary con tipo SupabaseClient<Database>: el mock no replica el shape completo.
  supabase: { from: fromMock as unknown as typeof fromMock },
}))

import {
  useCrearContratoDesdeOportunidad,
  useCrearTareaDesdeContrato,
} from './useAutomatizaciones'
import { toast } from 'sonner'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return React.createElement(QueryClientProvider, { client: qc }, children)
}

describe('useCrearContratoDesdeOportunidad', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    insertSingleMock.mockResolvedValue({ data: { id: 'new-contract-id' }, error: null })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('inserta en tabla "contratos" con estado borrador y compania Pendiente', async () => {
    const { result } = renderHook(() => useCrearContratoDesdeOportunidad(), { wrapper })

    result.current.mutate({
      id: 'op-1',
      nombre: 'Nueva oportunidad',
      empresa_id: 'emp-1',
      comercial_id: 'user-1',
      empresa: { nombre: 'Empresa Test' },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fromMock).toHaveBeenCalledWith('contratos')
    const payload = insertSingleMock.mock.calls[0][0]
    expect(payload.empresa_id).toBe('emp-1')
    expect(payload.comercial_id).toBe('user-1')
    expect(payload.compania).toBe('Pendiente')
    expect(payload.estado).toBe('borrador')
    expect(payload.observaciones).toContain('Nueva oportunidad')
  })

  it('muestra toast de éxito con el nombre de la empresa', async () => {
    const { result } = renderHook(() => useCrearContratoDesdeOportunidad(), { wrapper })
    result.current.mutate({
      id: 'op-2', nombre: 'X', empresa_id: 'e', comercial_id: null,
      empresa: { nombre: 'PAZ Y BIEN' },
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('PAZ Y BIEN'),
      expect.any(Object),
    )
  })

  it('muestra toast de error si supabase falla', async () => {
    insertSingleMock.mockResolvedValueOnce({ data: null, error: { message: 'RLS denied' } })
    const { result } = renderHook(() => useCrearContratoDesdeOportunidad(), { wrapper })
    result.current.mutate({
      id: 'op-3', nombre: 'X', empresa_id: 'e', comercial_id: null, empresa: null,
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalled()
  })
})

describe('useCrearTareaDesdeContrato', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserta en "actividades" con tipo=tarea, estado=pendiente, fecha_actividad=hoy y fecha_vencimiento a 30 días', async () => {
    const { result } = renderHook(() => useCrearTareaDesdeContrato(), { wrapper })
    const hoy = new Date()
    const esperadoHoy = hoy.toISOString().slice(0, 10)
    const esperado30d = new Date(hoy.getTime() + 30 * 86_400_000).toISOString().slice(0, 10)

    result.current.mutate({
      id: 'c-1',
      compania: 'Endesa',
      empresa_id: 'emp-1',
      comercial_id: 'user-1',
      empresa: { nombre: 'Empresa Test' },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fromMock).toHaveBeenCalledWith('actividades')
    const payload = insertOnlyMock.mock.calls[0][0]
    expect(payload.tipo).toBe('tarea')
    expect(payload.estado_tarea).toBe('pendiente')
    expect(payload.entidad_tipo).toBe('contrato')
    expect(payload.entidad_id).toBe('c-1')
    expect(payload.asignado_a).toBe('user-1')
    // BUG 6 — evitar regresión: fecha_actividad es HOY, fecha_vencimiento es HOY+30d
    expect(payload.fecha_actividad).toBe(esperadoHoy)
    expect(payload.fecha_vencimiento).toBe(esperado30d)
    expect(payload.fecha_vencimiento).not.toBe(payload.fecha_actividad)
    expect(payload.titulo).toContain('Endesa')
    expect(payload.titulo).toContain('Empresa Test')
  })
})
