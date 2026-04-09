import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface QueryOptions<T> {
  table: string;
  select?: string;
  order?: { column: string; ascending?: boolean };
  filters?: Array<{ column: string; op: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'ilike'; value: unknown }>;
  enabled?: boolean;
  errorMessage?: string;
  onSuccess?: (data: T[]) => void;
}

/**
 * Generic Supabase query hook — eliminates copy-paste fetch logic.
 * Every module was doing the same try/catch/loading/error pattern.
 */
export function useSupabaseQuery<T>({
  table,
  select = '*',
  order,
  filters = [],
  enabled = true,
  errorMessage = 'Error al cargar datos',
  onSuccess,
}: QueryOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stabilize filters so they don't cause infinite re-renders
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  // Keep onSuccess in a ref to avoid triggering refetches when callback identity changes
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const fetch = useCallback(async () => {
    if (!enabled) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from(table).select(select);

      const parsedFilters = JSON.parse(filtersKey) as typeof filters;
      for (const f of parsedFilters) {
        query = query.filter(f.column, f.op, f.value);
      }

      if (order) {
        query = query.order(order.column, { ascending: order.ascending ?? false });
      }

      const { data: result, error: err } = await query;
      if (err) throw err;

      const rows = (result as T[]) || [];
      setData(rows);
      onSuccessRef.current?.(rows);
    } catch (err) {
      console.error(`Error in useSupabaseQuery(${table}):`, err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [table, select, order?.column, order?.ascending, enabled, errorMessage, filtersKey]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch, setData };
}

/**
 * Mutation helper — insert/update/delete with toast feedback.
 */
export function useSupabaseMutation(table: string) {
  const [loading, setLoading] = useState(false);

  const insert = async <T extends Record<string, unknown>>(row: T, successMsg?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from(table).insert(row).select().single();
      if (error) throw error;
      if (successMsg) toast.success(successMsg);
      return { data, error: null };
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const update = async <T extends Record<string, unknown>>(id: string, row: T, successMsg?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from(table).update(row).eq('id', id).select().single();
      if (error) throw error;
      if (successMsg) toast.success(successMsg);
      return { data, error: null };
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar');
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string, successMsg?: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      if (successMsg) toast.success(successMsg);
      return { error: null };
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  return { insert, update, remove, loading };
}
