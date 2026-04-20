import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock supabase client before importing anything that uses it.
vi.mock('../../core/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ data: [], error: null }) }) }) },
}))

vi.mock('../../core/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

import { useDashboardScope } from './api'
import { useAuth } from '../../core/hooks/useAuth'

type AuthReturn = {
  user: { id: string; role: string | null } | null
  loading: boolean
}

function mockAuth(auth: AuthReturn) {
  ;(useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue(auth)
}

describe('useDashboardScope', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns pending=true while auth is loading', () => {
    mockAuth({ user: null, loading: true })
    const { result } = renderHook(() => useDashboardScope())
    expect(result.current.pending).toBe(true)
    expect(result.current.viewAll).toBe(false)
    expect(result.current.comercialId).toBeUndefined()
  })

  it('returns viewAll=true for master role', () => {
    mockAuth({ user: { id: 'u-master', role: 'master' }, loading: false })
    const { result } = renderHook(() => useDashboardScope())
    expect(result.current.pending).toBe(false)
    expect(result.current.viewAll).toBe(true)
    expect(result.current.comercialId).toBeUndefined()
  })

  it('returns viewAll=true for manager role', () => {
    mockAuth({ user: { id: 'u-mgr', role: 'manager' }, loading: false })
    const { result } = renderHook(() => useDashboardScope())
    expect(result.current.viewAll).toBe(true)
    expect(result.current.comercialId).toBeUndefined()
  })

  it('returns viewAll=false with comercialId for non-admin roles', () => {
    mockAuth({ user: { id: 'u-client', role: 'client' }, loading: false })
    const { result } = renderHook(() => useDashboardScope())
    expect(result.current.viewAll).toBe(false)
    expect(result.current.comercialId).toBe('u-client')
  })

  it('returns viewAll=false with comercialId for consultant role', () => {
    mockAuth({ user: { id: 'u-cons', role: 'consultant' }, loading: false })
    const { result } = renderHook(() => useDashboardScope())
    expect(result.current.viewAll).toBe(false)
    expect(result.current.comercialId).toBe('u-cons')
  })

  it('returns viewAll=false with no comercialId if user is null but not loading', () => {
    mockAuth({ user: null, loading: false })
    const { result } = renderHook(() => useDashboardScope())
    expect(result.current.pending).toBe(false)
    expect(result.current.viewAll).toBe(false)
    expect(result.current.comercialId).toBeUndefined()
  })
})
