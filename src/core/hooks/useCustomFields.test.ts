import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Mock chainable supabase query builder. Cada método devuelve el mismo objeto
// excepto los terminales (el que resuelve con { data, error }).
const { fromMock, currentChain, makeChain } = vi.hoisted(() => {
  function makeChain(result: { data: unknown; error: unknown }) {
    const chain: Record<string, unknown> = {}
    const resolver = () => Promise.resolve(result)
    chain.select = vi.fn(() => chain)
    chain.eq = vi.fn(() => chain)
    chain.order = vi.fn(() => chain)
    chain.insert = vi.fn(() => chain)
    chain.update = vi.fn(() => chain)
    chain.delete = vi.fn(() => chain)
    chain.upsert = vi.fn(() => chain)
    chain.single = vi.fn(resolver)
    ;(chain as { then: (cb: (v: unknown) => void) => void }).then = (cb) => cb(result)
    return chain
  }
  const currentChain = { value: makeChain({ data: [], error: null }) }
  const fromMock = vi.fn(() => currentChain.value)
  return { fromMock, currentChain, makeChain }
})

vi.mock('../supabase/client', () => ({
  // Boundary con tipo SupabaseClient<Database>: el mock no replica el shape completo.
  // `unknown` es estructuralmente equivalente sin perder soundness en producción.
  supabase: { from: fromMock as unknown as typeof fromMock },
}))

import {
  useCustomFieldsSchema,
  useCustomFieldsSchemaAdmin,
  useCustomFieldValues,
  useCreateCustomFieldSchema,
  useDeleteCustomFieldSchema,
} from './useCustomFields'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return React.createElement(QueryClientProvider, { client: qc }, children)
}

describe('useCustomFieldsSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentChain.value = makeChain({
      data: [{ id: 's1', entidad_tipo: 'empresa', etiqueta: 'Sector', activo: true, orden: 1 }],
      error: null,
    })
  })

  it('filtra por activo=true y ordena por orden asc', async () => {
    const { result } = renderHook(() => useCustomFieldsSchema('empresa'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fromMock).toHaveBeenCalledWith('custom_fields_schema')
    expect(currentChain.value.eq).toHaveBeenCalledWith('activo', true)
    expect(currentChain.value.eq).toHaveBeenCalledWith('entidad_tipo', 'empresa')
    expect(currentChain.value.order).toHaveBeenCalledWith('orden', { ascending: true })
    expect(result.current.data).toHaveLength(1)
  })

  it('sin entidad_tipo no filtra por entidad', async () => {
    const { result } = renderHook(() => useCustomFieldsSchema(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // eq se llama solo una vez (para activo=true), NO para entidad_tipo
    expect(currentChain.value.eq).toHaveBeenCalledTimes(1)
  })
})

describe('useCustomFieldsSchemaAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentChain.value = makeChain({ data: [], error: null })
  })

  it('no filtra por activo (admin ve todos)', async () => {
    const { result } = renderHook(() => useCustomFieldsSchemaAdmin(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(currentChain.value.eq).not.toHaveBeenCalled()
  })
})

describe('useCustomFieldValues', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentChain.value = makeChain({ data: [], error: null })
  })

  it('no lanza la query si entidad_id es undefined', () => {
    const { result } = renderHook(() => useCustomFieldValues(undefined), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('filtra por entidad_id cuando está definido', async () => {
    const { result } = renderHook(() => useCustomFieldValues('empresa-42'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fromMock).toHaveBeenCalledWith('custom_fields_values')
    expect(currentChain.value.eq).toHaveBeenCalledWith('entidad_id', 'empresa-42')
  })
})

describe('useCreateCustomFieldSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentChain.value = makeChain({ data: null, error: null })
  })

  it('inserta el payload en custom_fields_schema', async () => {
    const { result } = renderHook(() => useCreateCustomFieldSchema(), { wrapper })

    result.current.mutate({
      entidad_tipo: 'empresa',
      nombre_campo: 'sector',
      etiqueta: 'Sector',
      tipo_dato: 'lista',
      opciones_lista: ['A', 'B'],
      obligatorio: false,
      orden: 10,
      activo: true,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fromMock).toHaveBeenCalledWith('custom_fields_schema')
    expect(currentChain.value.insert).toHaveBeenCalled()
  })
})

describe('useDeleteCustomFieldSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentChain.value = makeChain({ data: null, error: null })
  })

  it('llama delete + eq(id)', async () => {
    const { result } = renderHook(() => useDeleteCustomFieldSchema(), { wrapper })
    result.current.mutate('schema-id-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fromMock).toHaveBeenCalledWith('custom_fields_schema')
    expect(currentChain.value.delete).toHaveBeenCalled()
    expect(currentChain.value.eq).toHaveBeenCalledWith('id', 'schema-id-1')
  })
})
