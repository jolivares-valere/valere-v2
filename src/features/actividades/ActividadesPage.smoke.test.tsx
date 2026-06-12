import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'

vi.mock('./api', () => ({
  useActividadesTodas: () => ({ data: { data: [], count: 0 }, isLoading: false, error: null, refetch: vi.fn(), isFetching: false }),
  useCreateActividad: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateActividad: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteActividad: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useToggleTareaCompletada: () => ({ mutate: vi.fn(), isPending: false }),
  fetchActividadesForExport: vi.fn(),
}))

import ActividadesPage from './ActividadesPage'

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ActividadesPage smoke', () => {
  it('renderiza sin crash con lista vacía', () => {
    const { getByText } = render(wrap(<ActividadesPage />))
    expect(getByText('Actividades')).toBeInTheDocument()
  })
})
