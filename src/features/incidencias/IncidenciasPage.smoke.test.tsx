import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'

vi.mock('./api', () => ({
  useIncidencias: () => ({ data: { data: [], count: 0 }, isLoading: false, error: null, refetch: vi.fn(), isFetching: false }),
  useIncidenciasKPI: () => ({ data: null }),
  useCreateIncidencia: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateIncidencia: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteIncidencia: () => ({ mutateAsync: vi.fn(), isPending: false }),
  fetchIncidenciasForExport: vi.fn(),
}))

import IncidenciasPage from './IncidenciasPage'

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('IncidenciasPage smoke', () => {
  it('renderiza sin crash con lista vacía', () => {
    const { getByText } = render(wrap(<IncidenciasPage />))
    expect(getByText('Incidencias')).toBeInTheDocument()
    expect(getByText('Sin incidencias registradas')).toBeInTheDocument()
  })
})
