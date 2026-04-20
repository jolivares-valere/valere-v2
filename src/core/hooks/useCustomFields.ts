import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase/client'
import { logError } from '../utils/logger'
import type {
  CustomFieldSchema, CustomFieldValue,
  CustomFieldSchemaInsert, CustomFieldSchemaUpdate,
  CustomFieldValueInsert,
  EntidadTipo,
} from '../types/entities'

export function useCustomFieldsSchema(entidad_tipo?: EntidadTipo) {
  return useQuery({
    queryKey: ['custom-fields-schema', entidad_tipo ?? 'active-all'],
    queryFn: async (): Promise<CustomFieldSchema[]> => {
      let q = supabase
        .from('custom_fields_schema')
        .select('*')
        .eq('activo', true)
        .order('orden', { ascending: true })
      if (entidad_tipo) q = q.eq('entidad_tipo', entidad_tipo)
      const { data, error } = await q
      if (error) { logError(error, 'useCustomFieldsSchema'); throw error }
      return (data ?? []) as unknown as CustomFieldSchema[]
    },
  })
}

export function useCustomFieldsSchemaAdmin() {
  return useQuery({
    queryKey: ['custom-fields-schema', 'admin-all'],
    queryFn: async (): Promise<CustomFieldSchema[]> => {
      const { data, error } = await supabase
        .from('custom_fields_schema')
        .select('*')
        .order('entidad_tipo')
        .order('orden', { ascending: true })
      if (error) { logError(error, 'useCustomFieldsSchemaAdmin'); throw error }
      return (data ?? []) as unknown as CustomFieldSchema[]
    },
  })
}

export function useCustomFieldValues(entidad_id: string | undefined) {
  return useQuery({
    queryKey: ['custom-fields-values', entidad_id],
    enabled: Boolean(entidad_id),
    queryFn: async (): Promise<CustomFieldValue[]> => {
      const { data, error } = await supabase
        .from('custom_fields_values')
        .select('*')
        .eq('entidad_id', entidad_id!)
      if (error) { logError(error, 'useCustomFieldValues'); throw error }
      return (data ?? []) as unknown as CustomFieldValue[]
    },
  })
}

export function useUpsertCustomFieldValue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CustomFieldValueInsert & { id?: string }) => {
      const { id, ...rest } = payload
      if (id) {
        const { error } = await supabase.from('custom_fields_values').update(rest as never).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('custom_fields_values')
          .upsert(rest as never, { onConflict: 'schema_id,entidad_id' })
        if (error) throw error
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['custom-fields-values', variables.entidad_id] })
    },
  })
}

export function useCreateCustomFieldSchema() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CustomFieldSchemaInsert) => {
      const { error } = await supabase.from('custom_fields_schema').insert(payload as never)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-fields-schema'] }),
  })
}

export function useUpdateCustomFieldSchema() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: CustomFieldSchemaUpdate & { id: string }) => {
      const { error } = await supabase.from('custom_fields_schema').update(updates as never).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-fields-schema'] }),
  })
}

export function useDeleteCustomFieldSchema() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('custom_fields_schema').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-fields-schema'] }),
  })
}
