// ═══════════════════════════════════════════════════════════════════
// Tab "Holded" del AdminPage — Fase 1 (mínima)
// ═══════════════════════════════════════════════════════════════════
//
// Visión general de la integración Holded:
//  - Estado: enabled / mode (dry_run | live) / productos_sync_mode.
//  - Contadores cola: pending / processing / error / dead_letter / done 7d.
//  - Último error si lo hay.
//  - Acciones manuales: Pull catálogos (deshabilitado en Fase 1),
//    Notificar errores ahora (invoca notify-integration-error),
//    Toggle enabled (sólo master).
//
// SEGURIDAD
//  - Sólo master puede modificar holded_config (RLS lo enforce; UI también).
//  - Se muestra el digest del HOLDED_API_KEY enmascarado, NUNCA el valor.
//  - Confirmaciones destructivas con ConfirmDialog.
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import {
  Plug, Power, RefreshCw, AlertTriangle, CheckCircle2,
  Clock, Activity, MailWarning, Database,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { supabase } from '@/core/supabase/client'
import { useAuth } from '@/core/hooks/useAuth'

interface HoldedConfig {
  id: string
  enabled: boolean
  mode: 'dry_run' | 'live'
  productos_sync_mode: 'read' | 'bidirectional'
  excluded_nifs: string[]
  last_full_sync_at: string | null
  last_error: string | null
  last_error_at: string | null
  notes: string | null
  updated_at: string
}

interface QueueCounts {
  pending: number
  processing: number
  error: number
  dead_letter: number
  done_7d: number
  skipped_7d: number
}

interface AuditResumen {
  total_empresas: number
  con_nif: number
  nif_checksum_validos: number
  nif_checksum_invalidos: number
  direccion_lista_para_holded: number
  tipo_null: number
}

const initialCounts: QueueCounts = {
  pending: 0, processing: 0, error: 0, dead_letter: 0, done_7d: 0, skipped_7d: 0,
}

export default function HoldedTab() {
  const { user } = useAuth()
  const isMaster = user?.role === 'master' && user?.approved === true

  const [config, setConfig] = useState<HoldedConfig | null>(null)
  const [counts, setCounts] = useState<QueueCounts>(initialCounts)
  const [audit, setAudit] = useState<AuditResumen | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmToggle, setConfirmToggle] = useState(false)

  // ──────────────── Carga inicial ────────────────
  const loadAll = async () => {
    setLoading(true)
    try {
      const [{ data: cfg }, { data: queueRows }, { data: auditRow }] = await Promise.all([
        supabase.from('holded_config').select('*').eq('id', 'singleton').maybeSingle(),
        supabase.from('holded_sync_queue').select('status, processed_at'),
        supabase.from('holded_audit_resumen').select('*').maybeSingle(),
      ])

      setConfig(cfg as HoldedConfig | null)

      const newCounts = { ...initialCounts }
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      for (const row of (queueRows ?? []) as { status: string; processed_at: string | null }[]) {
        if (row.status === 'pending') newCounts.pending += 1
        else if (row.status === 'processing') newCounts.processing += 1
        else if (row.status === 'error') newCounts.error += 1
        else if (row.status === 'dead_letter') newCounts.dead_letter += 1
        else if (row.status === 'done' && row.processed_at && new Date(row.processed_at).getTime() >= sevenDaysAgo) {
          newCounts.done_7d += 1
        } else if (row.status === 'skipped' && row.processed_at && new Date(row.processed_at).getTime() >= sevenDaysAgo) {
          newCounts.skipped_7d += 1
        }
      }
      setCounts(newCounts)
      setAudit(auditRow as AuditResumen | null)
    } catch (err) {
      console.error('[HoldedTab] load error', err)
      toast.error('No se pudo cargar el estado de Holded')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  // ──────────────── Acciones ────────────────
  const handleToggleEnabled = async () => {
    if (!config) return
    setBusy('toggle')
    try {
      const { error } = await supabase
        .from('holded_config')
        .update({ enabled: !config.enabled, updated_by: user?.id ?? null })
        .eq('id', 'singleton')
      if (error) throw error
      toast.success(`Integración ${!config.enabled ? 'activada' : 'desactivada'}`)
      await loadAll()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      toast.error(`No se pudo cambiar el estado: ${msg}`)
    } finally {
      setBusy(null)
      setConfirmToggle(false)
    }
  }

  const handleNotifyErrors = async () => {
    setBusy('notify')
    try {
      const { data, error } = await supabase.functions.invoke('notify-integration-error', {
        body: {},
      })
      if (error) throw error
      const result = data as { sent?: boolean; note?: string; error?: string }
      if (result?.error) throw new Error(result.error)
      if (result?.sent) toast.success('Email enviado al admin')
      else toast.info('Sin errores en últimas 24h — no se envía email')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      toast.error(`No se pudo enviar la notificación: ${msg}`)
    } finally {
      setBusy(null)
    }
  }

  // ──────────────── Render ────────────────
  if (loading) {
    return (
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    )
  }

  if (!config) {
    return (
      <Card className="mt-4 border-amber-200 bg-amber-50">
        <CardContent className="p-6 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
          <div>
            <p className="font-medium text-amber-900">Configuración Holded no inicializada</p>
            <p className="text-sm text-amber-800 mt-1">
              Ejecuta la migration <code>20260427_holded_infrastructure.sql</code> para crear la fila singleton.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const modeLabel = config.mode === 'live' ? 'Live' : 'Dry-run'
  const modeColor = config.mode === 'live' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'
  const enabledColor = config.enabled ? 'bg-green-500' : 'bg-slate-400'

  return (
    <div className="mt-4 space-y-4">
      {/* Banner estado general */}
      <Card className="border-none shadow-md bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${enabledColor}`} />
            <CardTitle className="text-lg flex items-center gap-2">
              <Plug className="w-5 h-5" /> Integración Holded
            </CardTitle>
          </div>
          <Badge className={modeColor}>{modeLabel}</Badge>
        </CardHeader>
        <CardContent className="text-sm text-valere-ink/70 space-y-2">
          <p>
            Estado: <span className="font-semibold">{config.enabled ? 'Activa' : 'Desactivada'}</span>
            {' · '}
            Catálogo productos: <span className="font-mono">{config.productos_sync_mode}</span>
            {' · '}
            Excluidos: <span className="font-mono">{config.excluded_nifs.length}</span>
          </p>
          {config.last_full_sync_at && (
            <p className="text-xs text-valere-ink/50">
              Último sync completo: {new Date(config.last_full_sync_at).toLocaleString('es-ES')}
            </p>
          )}
          {config.notes && (
            <p className="text-xs text-valere-ink/50 italic">{config.notes}</p>
          )}
        </CardContent>
      </Card>

      {/* Métricas cola */}
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <MetricCard icon={<Clock className="w-4 h-4" />} label="Pending" value={counts.pending} tone="slate" />
        <MetricCard icon={<Activity className="w-4 h-4" />} label="Processing" value={counts.processing} tone="blue" />
        <MetricCard icon={<AlertTriangle className="w-4 h-4" />} label="Error" value={counts.error} tone="amber" />
        <MetricCard icon={<AlertTriangle className="w-4 h-4" />} label="Dead-letter" value={counts.dead_letter} tone="red" />
        <MetricCard icon={<CheckCircle2 className="w-4 h-4" />} label="Done 7d" value={counts.done_7d} tone="green" />
        <MetricCard icon={<RefreshCw className="w-4 h-4" />} label="Skipped 7d" value={counts.skipped_7d} tone="slate" />
      </div>

      {/* Último error */}
      {config.last_error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm">
            <p className="font-semibold text-red-900 mb-1">Último error registrado</p>
            <p className="font-mono text-xs text-red-800 break-all">{config.last_error}</p>
            {config.last_error_at && (
              <p className="text-xs text-red-700/70 mt-1">
                {new Date(config.last_error_at).toLocaleString('es-ES')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Salud datos pre-sync (Fase 0) */}
      {audit && (
        <Card className="border-none shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-4 h-4" /> Salud de datos pre-Holded
            </CardTitle>
            <CardDescription>
              Calculado en vivo desde <code>holded_audit_resumen</code>. Reporte completo en{' '}
              <code>docs/AUDIT_DATOS_VALERE_PRE_HOLDED_2026-04-27.md</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-3 lg:grid-cols-6 text-sm">
            <Stat label="Empresas" value={audit.total_empresas} />
            <Stat label="Con NIF" value={`${audit.con_nif}/${audit.total_empresas}`} />
            <Stat label="Checksum válido" value={audit.nif_checksum_validos} tone="green" />
            <Stat label="Checksum mal" value={audit.nif_checksum_invalidos} tone={audit.nif_checksum_invalidos > 0 ? 'amber' : 'green'} />
            <Stat label="Dirección OK" value={audit.direccion_lista_para_holded} />
            <Stat label="Sin `tipo`" value={audit.tipo_null} tone={audit.tipo_null > 0 ? 'amber' : 'green'} />
          </CardContent>
        </Card>
      )}

      {/* Acciones */}
      <Card className="border-none shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-base">Acciones</CardTitle>
          <CardDescription>
            En Fase 1 sólo está activo el toggle y la notificación de errores. Pull manual de catálogos llega en Fase 2.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant={config.enabled ? 'outline' : 'default'}
            disabled={!isMaster || busy !== null}
            onClick={() => setConfirmToggle(true)}
            className="gap-2"
          >
            <Power className="w-4 h-4" />
            {config.enabled ? 'Desactivar integración' : 'Activar integración'}
          </Button>

          <Button
            variant="outline"
            disabled={busy !== null}
            onClick={handleNotifyErrors}
            className="gap-2"
          >
            {busy === 'notify' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MailWarning className="w-4 h-4" />}
            Notificar errores ahora
          </Button>

          <Button variant="outline" disabled className="gap-2 opacity-60" title="Disponible en Fase 2">
            <RefreshCw className="w-4 h-4" />
            Pull manual catálogos (Fase 2)
          </Button>

          {!isMaster && (
            <p className="text-xs text-valere-ink/60 self-center">
              Algunas acciones requieren rol <code>master</code>.
            </p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={confirmToggle}
        title={config.enabled ? 'Desactivar integración Holded' : 'Activar integración Holded'}
        message={
          config.enabled
            ? 'El worker dejará de procesar la cola. Los items quedarán en pending hasta reactivar.'
            : 'El worker empezará a procesar items pendientes en máximo 5 minutos. Verifica antes que HOLDED_API_KEY y HOLDED_CRON_SECRET estén configurados.'
        }
        confirmLabel={config.enabled ? 'Desactivar' : 'Activar'}
        cancelLabel="Cancelar"
        variant={config.enabled ? 'warning' : 'info'}
        submitting={busy === 'toggle'}
        onConfirm={handleToggleEnabled}
        onCancel={() => setConfirmToggle(false)}
      />
    </div>
  )
}

// ──────────────── Subcomponentes ────────────────
function MetricCard({
  icon, label, value, tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone: 'slate' | 'blue' | 'amber' | 'red' | 'green'
}) {
  const tones: Record<typeof tone, string> = {
    slate: 'border-slate-200 text-slate-700',
    blue:  'border-blue-200 text-blue-700',
    amber: 'border-amber-200 text-amber-700',
    red:   'border-red-200 text-red-700',
    green: 'border-green-200 text-green-700',
  }
  return (
    <Card className={`border bg-white ${tones[tone]}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide opacity-70">
          <span>{label}</span>
          {icon}
        </div>
        <div className="mt-2 text-2xl font-display font-semibold">{value}</div>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: 'green' | 'amber' }) {
  const color =
    tone === 'green' ? 'text-green-700'
      : tone === 'amber' ? 'text-amber-700'
      : 'text-valere-ink'
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-valere-ink/60">{label}</div>
      <div className={`text-sm font-semibold ${color}`}>{value}</div>
    </div>
  )
}
