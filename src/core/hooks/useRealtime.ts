import { useEffect } from 'react'
import { supabase } from '../supabase/client'
import { logError } from '../utils/logger'

export interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, unknown>
  old: Record<string, unknown>
}

export function useRealtime(
  table: string,
  filter?: string,
  onData?: (payload: RealtimePayload) => void,
): void {
  useEffect(() => {
    if (!onData) return
    try {
      const channel = supabase
        .channel(`rt-${table}-${filter ?? 'all'}`)
        .on(
          // @ts-expect-error supabase-js omite el literal en el tipo publico
          'postgres_changes',
          { event: '*', schema: 'public', table, filter },
          (payload: unknown) => onData(payload as RealtimePayload),
        )
        .subscribe()
      return () => {
        supabase.removeChannel(channel)
      }
    } catch (err) {
      logError(err, `useRealtime(${table})`)
    }
  }, [table, filter, onData])
}
