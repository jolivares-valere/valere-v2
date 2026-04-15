// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  })

  const result = {
    ejecutado_en: new Date().toISOString(),
    procesados: 0,
    vencidos: 0,
    oportunidades_creadas: 0,
    tareas_creadas: 0,
    notificaciones_creadas: 0,
    errores: [] as string[],
  }

  const today = new Date().toISOString().slice(0, 10)
  const in60 = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10)

  try {
    const { data: vencidos, error: e1 } = await supabase
      .from('contratos')
      .update({ estado: 'vencido' })
      .eq('estado', 'activo')
      .is('deleted_at', null)
      .lt('fecha_fin', today)
      .select('id, empresa_id, comercial_id, numero_contrato')
    if (e1) throw e1
    result.vencidos = vencidos?.length ?? 0

    for (const c of vencidos ?? []) {
      const { error } = await supabase.from('actividades').insert({
        tipo: 'cambio_estado',
        titulo: 'Contrato marcado como vencido',
        descripcion: 'Rollover diario: estado activo -> vencido',
        entidad_tipo: 'contrato',
        entidad_id: c.id,
      })
      if (error) result.errores.push(`act ${c.id}: ${error.message}`)
    }

    const { data: porVencer, error: e2 } = await supabase
      .from('contratos')
      .select('id, empresa_id, comercial_id, numero_contrato, fecha_fin')
      .eq('estado', 'activo')
      .is('deleted_at', null)
      .gte('fecha_fin', today)
      .lte('fecha_fin', in60)
    if (e2) throw e2

    for (const c of porVencer ?? []) {
      const { data: existente } = await supabase
        .from('oportunidades')
        .select('id')
        .eq('contrato_origen_id', c.id)
        .eq('tipo', 'renovacion')
        .not('etapa', 'in', '(ganada,perdida,cancelada)')
        .is('deleted_at', null)
        .maybeSingle()
      if (existente) continue

      const { data: nuevaOp, error: eOp } = await supabase
        .from('oportunidades')
        .insert({
          empresa_id: c.empresa_id,
          contrato_origen_id: c.id,
          comercial_id: c.comercial_id,
          tipo: 'renovacion',
          nombre: `Renovacion ${c.numero_contrato ?? c.id}`,
          etapa: 'prospecto',
          probabilidad_pct: 30,
        })
        .select('id')
        .single()
      if (eOp) { result.errores.push(`oport ${c.id}: ${eOp.message}`); continue }
      result.oportunidades_creadas++

      if (c.comercial_id && c.fecha_fin) {
        const fv = new Date(c.fecha_fin + 'T00:00:00')
        fv.setDate(fv.getDate() - 30)
        const { error: eT } = await supabase.from('actividades').insert({
          tipo: 'tarea',
          titulo: `Contactar para renovacion de contrato ${c.numero_contrato ?? ''}`.trim(),
          entidad_tipo: 'oportunidad',
          entidad_id: nuevaOp.id,
          asignado_a: c.comercial_id,
          estado_tarea: 'pendiente',
          fecha_vencimiento: fv.toISOString(),
        })
        if (eT) result.errores.push(`tarea ${c.id}: ${eT.message}`)
        else result.tareas_creadas++

        const { error: eN } = await supabase.from('notificaciones').insert({
          usuario_id: c.comercial_id,
          tipo: 'renovacion_creada',
          titulo: 'Nueva oportunidad de renovacion',
          cuerpo: `Contrato ${c.numero_contrato ?? c.id} vence el ${c.fecha_fin}.`,
          entidad_tipo: 'oportunidad',
          entidad_id: nuevaOp.id,
        })
        if (eN) result.errores.push(`notif ${c.id}: ${eN.message}`)
        else result.notificaciones_creadas++
      }
    }

    result.procesados = result.vencidos + (porVencer?.length ?? 0)
    return new Response(JSON.stringify(result, null, 2), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message, ...result }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
