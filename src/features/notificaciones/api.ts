import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'
import type { Notificacion } from '../../core/types/entities'

const RESOURCE = 'notificaciones'

export function useNotificacionesNoLeidas(userId: string | undefined) {
  return useQuery({
    queryKey: [RESOURCE, 'no-leidas', userId],
    enabled: Boolean(userId),
    refetchInterval: 30_000,
    queryFn: async (): Promise<Notificacion[]> => {
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('usuario_id', userId!)
        .eq('leida', false)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) { logError(error, 'useNotificacionesNoLeidas'); throw error }
      return (data ?? []) as unknown as Notificacion[]
    },
  })
}

export function useNotificacionesRecientes(userId: string | undefined) {
  return useQuery({
    queryKey: [RESOURCE, 'recientes', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Notificacion[]> => {
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('usuario_id', userId!)
        .order('created_at', { ascending: false })
        .limit(30)
      if (error) { logError(error, 'useNotificacionesRecientes'); throw error }
      return (data ?? []) as unknown as Notificacion[]
    },
  })
}

export function useMarcarLeida() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notificaciones')
        .update({ leida: true, leida_at: new Date().toISOString() } as never)
        .eq('id', id)
      if (error) { logError(error, 'useMarcarLeida'); throw error }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
    },
  })
}

export function useMarcarTodasLeidas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('notificaciones')
        .update({ leida: true, leida_at: new Date().toISOString() } as never)
        .eq('usuario_id', userId)
        .eq('leida', false)
      if (error) { logError(error, 'useMarcarTodasLeidas'); throw error }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      toast.success('Todas las notificaciones marcadas como leídas')
    },
    onError: (e) => toast.error('No se pudo marcar todas como leídas', { description: (e as Error).message }),
  })
}

export function useGenerarNotificaciones(userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!userId) return
      const hoy = new Date()
      const hoyISO = hoy.toISOString().slice(0, 10)
      const en30 = new Date(hoy.getTime() + 30 * 86_400_000).toISOString().slice(0, 10)
      const hace15d = new Date(hoy.getTime() - 15 * 86_400_000).toISOString()

      const [tareasRes, contratosRes, opsRes, existingRes] = await Promise.all([
        supabase
          .from('actividades')
          .select('id, titulo, fecha_vencimiento')
          .eq('tipo', 'tarea')
          .eq('estado_tarea', 'pendiente')
          .eq('asignado_a', userId)
          .is('deleted_at', null)
          .lt('fecha_vencimiento', hoyISO),
        supabase
          .from('contratos')
          .select('id, numero_contrato, fecha_fin, empresa:empresas!contratos_empresa_id_fkey(nombre)')
          .eq('estado', 'activo')
          .eq('comercial_id', userId)
          .is('deleted_at', null)
          .gte('fecha_fin', hoyISO)
          .lte('fecha_fin', en30),
        supabase
          .from('oportunidades')
          .select('id, nombre')
          .eq('comercial_id', userId)
          .is('deleted_at', null)
          .not('etapa', 'in', '(ganada,perdida,cancelada)')
          .lt('updated_at', hace15d),
        supabase
          .from('notificaciones')
          .select('entidad_tipo, entidad_id')
          .eq('usuario_id', userId)
          .eq('leida', false),
      ])

      const existing = new Set(
        ((existingRes.data ?? []) as unknown as Array<{ entidad_tipo: string | null; entidad_id: string | null }>).map(
          (n) => `${n.entidad_tipo}:${n.entidad_id}`,
        ),
      )

      const nuevas: Array<{
        usuario_id: string
        tipo: string
        titulo: string
        cuerpo: string | null
        entidad_tipo: string
        entidad_id: string
        leida: boolean
      }> = []

      for (const t of (tareasRes.data ?? []) as unknown as Array<{ id: string; titulo: string; fecha_vencimiento: string }>) {
        if (existing.has(`actividad:${t.id}`)) continue
        nuevas.push({
          usuario_id: userId,
          tipo: 'tarea_vencida',
          titulo: `Tarea vencida: ${t.titulo}`,
          cuerpo: `Venció el ${t.fecha_vencimiento}`,
          entidad_tipo: 'actividad',
          entidad_id: t.id,
          leida: false,
        })
      }

      for (const c of (contratosRes.data ?? []) as unknown as Array<{
        id: string; numero_contrato: string | null; fecha_fin: string; empresa: { nombre: string } | null
      }>) {
        if (existing.has(`contrato:${c.id}`)) continue
        const nombre = c.empresa?.nombre ?? 'Empresa'
        nuevas.push({
          usuario_id: userId,
          tipo: 'contrato_por_vencer',
          titulo: `Contrato por vencer: ${nombre}`,
          cuerpo: `${c.numero_contrato ?? 'Sin número'} vence el ${c.fecha_fin}`,
          entidad_tipo: 'contrato',
          entidad_id: c.id,
          leida: false,
        })
      }

      for (const o of (opsRes.data ?? []) as unknown as Array<{ id: string; nombre: string }>) {
        if (existing.has(`oportunidad:${o.id}`)) continue
        nuevas.push({
          usuario_id: userId,
          tipo: 'oportunidad_estancada',
          titulo: `Oportunidad sin actividad: ${o.nombre}`,
          cuerpo: 'Más de 15 días sin actualizar',
          entidad_tipo: 'oportunidad',
          entidad_id: o.id,
          leida: false,
        })
      }

      if (nuevas.length > 0) {
        const { error } = await supabase
          .from('notificaciones')
          .insert(nuevas as never)
        if (error) { logError(error, 'useGenerarNotificaciones'); throw error }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
    },
  })
}
