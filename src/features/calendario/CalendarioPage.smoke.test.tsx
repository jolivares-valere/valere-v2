import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'

vi.mock('./api', () => ({
  useEventosEnRango: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn(), isFetching: false }),
}))

import CalendarioPage from './CalendarioPage'

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('CalendarioPage smoke', () => {
  it('renderiza sin crash sin eventos', () => {
    const { getByText } = render(wrap(<CalendarioPage />))
    expect(getByText('Calendario')).toBeInTheDocument()
  })
})
