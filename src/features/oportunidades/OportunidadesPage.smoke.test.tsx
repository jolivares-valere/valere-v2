import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'

vi.mock('./api', () => ({
  useOportunidades: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn(), isFetching: false }),
  useUpdateEtapa: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateOportunidad: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateOportunidad: () => ({ mutateAsync: vi.fn(), isPending: false }),
  fetchOportunidadesForExport: vi.fn(),
}))
vi.mock('../actividades/api', () => ({
  useTareasPendientesPorOportunidad: () => ({ data: {} }),
}))
vi.mock('../../core/hooks/useAutomatizaciones', () => ({
  useCrearContratoDesdeOportunidad: () => ({ mutate: vi.fn(), isPending: false }),
}))

import OportunidadesPage from './OportunidadesPage'

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('OportunidadesPage smoke', () => {
  it('renderiza sin crash con pipeline vacío', () => {
    const { getByText } = render(wrap(<OportunidadesPage />))
    expect(getByText('Pipeline')).toBeInTheDocument()
    // El kanban vacío muestra "0 oportunidades en el pipeline" en el subtítulo
    expect(getByText(/oportunidades en el pipeline/)).toBeInTheDocument()
  })
})
