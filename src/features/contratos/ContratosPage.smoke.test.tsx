import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'

vi.mock('./api', () => ({
  useContratos: () => ({ data: { data: [], count: 0 }, isLoading: false, error: null, refetch: vi.fn(), isFetching: false }),
  useCreateContrato: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateContrato: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteContrato: () => ({ mutateAsync: vi.fn(), isPending: false }),
  fetchContratosForExport: vi.fn(),
  useContratosPorVencer: () => ({ isLoading: false, data: [] }),
  useResumenVencimientos: () => ({ data: null }),
  useComercializadorasDeContratos: () => ({ data: [] }),
}))
vi.mock('../../core/hooks/useAutomatizaciones', () => ({
  useCrearTareaDesdeContrato: () => ({ mutate: vi.fn(), isPending: false }),
}))

import ContratosPage from './ContratosPage'

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ContratosPage smoke', () => {
  it('renderiza sin crash con lista vacía', () => {
    const { getByText } = render(wrap(<ContratosPage />))
    expect(getByText('Contratos')).toBeInTheDocument()
    expect(getByText('Sin contratos registrados')).toBeInTheDocument()
  })
})
