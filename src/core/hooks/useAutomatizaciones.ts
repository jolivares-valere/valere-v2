import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase/client'
import { logError } from '../utils/logger'
import { toast } from 'sonner'

interface OportunidadMinima {
  id: string
  nombre: string
  empresa_id: string
  comercial_id: string | null
  empresa?: { nombre: string } | null
}

interface ContratoMinimo {
  id: string
  compania: string
  empresa_id: string
  comercial_id: string | null
  empresa?: { nombre: string } | null
}

export function useCrearContratoDesdeOportunidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (op: OportunidadMinima) => {
      const { data, error } = await supabase
        .from('contratos')
        .insert({
          empresa_id: op.empresa_id,
          comercial_id: op.comercial_id,
          compania: 'Pendiente',
          estado: 'borrador',
          observaciones: `Auto-creado desde oportunidad "${op.nombre}"`,
        } as never)
        .select('id')
        .single()
      if (error) { logError(error, 'autoContrato'); throw error }
      return data as { id: string }
    },
    onSuccess: (_data, op) => {
      qc.invalidateQueries({ queryKey: ['contratos'] })
      toast.success(`Borrador de contrato creado para ${op.empresa?.nombre ?? 'la empresa'}`, {
        description: 'Completa los datos en la sección Contratos.',
      })
    },
    onError: (e) =>
      toast.error('No se pudo crear el borrador de contrato', { description: (e as Error).message }),
  })
}

export function useCrearTareaDesdeContrato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (contrato: ContratoMinimo) => {
      const hoy = new Date()
      const en30 = new Date(hoy.getTime() + 30 * 86_400_000)
      const { error } = await supabase
        .from('actividades')
        .insert({
          tipo: 'tarea',
          titulo: `Seguimiento contrato ${contrato.compania}${contrato.empresa?.nombre ? ` – ${contrato.empresa.nombre}` : ''}`,
          descripcion: 'Tarea automática: verificar renovación y situación del contrato activado.',
          fecha_actividad: hoy.toISOString().slice(0, 10),
          fecha_vencimiento: en30.toISOString().slice(0, 10),
          entidad_tipo: 'contrato',
          entidad_id: contrato.id,
          asignado_a: contrato.comercial_id,
          estado_tarea: 'pendiente',
          privada: false,
        } as never)
      if (error) { logError(error, 'autoTarea'); throw error }
    },
    onSuccess: (_data, contrato) => {
      qc.invalidateQueries({ queryKey: ['actividades'] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'mis-tareas'] })
      toast.success('Tarea de seguimiento creada (vence en 30 días)', {
        description: `Contrato de ${contrato.empresa?.nombre ?? contrato.compania}.`,
      })
    },
    onError: (e) =>
      toast.error('No se pudo crear la tarea de seguimiento', { description: (e as Error).message }),
  })
}
