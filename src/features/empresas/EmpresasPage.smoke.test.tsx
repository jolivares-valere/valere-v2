import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'

vi.mock('./api', () => ({
  useEmpresas: () => ({ data: { data: [], count: 0 }, isLoading: false, error: null, refetch: vi.fn(), isFetching: false }),
  useCreateEmpresa: () => ({ mutateAsync: vi.fn(), isPending: false }),
  fetchEmpresasForExport: vi.fn(),
}))
vi.mock('../contactos/api', () => ({
  useCreateContacto: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

import EmpresasPage from './EmpresasPage'

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('EmpresasPage smoke', () => {
  it('renderiza sin crash con lista vacía', () => {
    const { getByText } = render(wrap(<EmpresasPage />))
    expect(getByText('Empresas')).toBeInTheDocument()
    expect(getByText('Sin resultados')).toBeInTheDocument()
  })
})
