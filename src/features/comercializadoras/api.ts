import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../core/supabase/client'
import type { Comercializadora, ComercializadoraCondicion } from '../../core/types/entities'

export type ComercializadoraCanal = Pick<
  Comercializadora,
  'id' | 'nombre_canonico' | 'via' | 'grupo' | 'segmento'
>

/** Canales de venta activos para el selector de contratos (catalogo PR-3.1, texto libre FUERA). */
export function useComercializadorasCanal() {
  return useQuery({
    queryKey: ['comercializadoras', 'canal'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comercializadoras')
        .select('id, nombre_canonico, via, grupo, segmento')
        .eq('es_canal_venta', true)
        .eq('activa', true)
        .order('nombre_canonico')
      if (error) throw error
      return (data ?? []) as ComercializadoraCanal[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

export type ComercializadoraConCondiciones = Comercializadora & {
  comercializadora_condiciones: ComercializadoraCondicion[]
}

/** Catalogo completo con condiciones embebidas (pagina /comercializadoras). */
export function useCatalogoConCondiciones() {
  return useQuery({
    queryKey: ['comercializadoras', 'catalogo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comercializadoras')
        .select('id, nombre_canonico, via, grupo, segmento, activa, notes, comercializadora_condiciones(*)')
        .eq('es_canal_venta', true)
        .order('nombre_canonico')
      if (error) throw error
      return (data ?? []) as ComercializadoraConCondiciones[]
    },
  })
}

/** Edita valor/vigencia de una condicion (RLS: solo admin/master escriben). */
export function useUpdateCondicion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; valor: number | null; vigencia_hasta: string | null }) => {
      const { error } = await supabase
        .from('comercializadora_condiciones')
        .update({ valor: input.valor, vigencia_hasta: input.vigencia_hasta })
        .eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comercializadoras'] }),
  })
}
