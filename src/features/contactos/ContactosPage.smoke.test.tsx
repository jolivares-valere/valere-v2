import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'

vi.mock('./api', () => ({
  useContactos: () => ({ data: { data: [], count: 0 }, isLoading: false, error: null, refetch: vi.fn(), isFetching: false }),
  useCreateContacto: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateContacto: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteContacto: () => ({ mutateAsync: vi.fn(), isPending: false }),
  fetchContactosForExport: vi.fn(),
}))

import ContactosPage from './ContactosPage'

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ContactosPage smoke', () => {
  it('renderiza sin crash con lista vacía', () => {
    const { getByText } = render(wrap(<ContactosPage />))
    expect(getByText('Contactos')).toBeInTheDocument()
    expect(getByText('Sin contactos registrados')).toBeInTheDocument()
  })
})
