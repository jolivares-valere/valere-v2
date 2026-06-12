import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'

vi.mock('./api', () => ({
  useRenovaciones: () => ({ data: { data: [], count: 0 }, isLoading: false, error: null, refetch: vi.fn(), isFetching: false }),
  useRenovacionesKPI: () => ({ data: null }),
  useCreateRenovacion: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRenovacion: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteRenovacion: () => ({ mutateAsync: vi.fn(), isPending: false }),
  fetchRenovacionesForExport: vi.fn(),
}))

import RenovacionesPage from './RenovacionesPage'

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('RenovacionesPage smoke', () => {
  it('renderiza sin crash con lista vacía', () => {
    const { getByText } = render(wrap(<RenovacionesPage />))
    expect(getByText('Renovaciones')).toBeInTheDocument()
    expect(getByText('Sin renovaciones registradas')).toBeInTheDocument()
  })
})
