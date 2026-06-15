import { useState } from 'react'
import {
  CheckCircle2, AlertTriangle, KeyRound, Clock, RefreshCw,
  ChevronDown, ChevronRight, Sun, Building2, WifiOff, Plus,
  Pencil, Loader2, FlaskConical, Play, ExternalLink, XCircle,
} from 'lucide-react'
import { useCredencialesFV, useTriggerFVSync } from '../api'
import type { FVCredencial, FVEstadoSesion } from '../api'
import CredencialFormModal from './CredencialFormModal'

import type { FxCredencial } from '../fixtures'

// ─── Helpers de tiempo ───────────────────────────────────────────────

function diasHasta(s: string | null): { texto: string; urgente: boolean } | null {
  if (!s) return null
  const diff = Math.floor((new Date(s).getTime() - Date.now()) / 86400000)
  if (diff < 0)   return { texto: 'Cookies expiradas',          urgente: true }
  if (diff === 0) return { texto: 'Cookies expiran hoy',         urgente: true }
  if (diff === 1) return { texto: 'Cookies expiran mañana',      urgente: true }
  if (diff <= 3)  return { texto: `Cookies expiran en ${diff}d`, urgente: true }
  return { texto: `Cookies OK (${diff} días)`, urgente: false }
}

function tiempoDesde(s: string | null | undefined): string {
  if (!s) return 'nunca'
  const diff = Math.floor((Date.now() - new Date(s).getTime()) / 60000)
  if (diff < 1)  return 'ahora mismo'
  if (diff < 60) return `hace ${diff}m`
  const h = Math.floor(diff / 60)
  if (h < 24)   return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

// ─── Badge de estado de sesión ───────────────────────────────────────

const ESTADO_CFG: Record<FVEstadoSesion, { label: string; dot: string; badge: string; Icon: React.ElementType }> = {
  activa:       { label: 'Sesión activa',       dot: 'bg-green-400',  badge: 'bg-green-50 text-green-700 border-green-200',   Icon: CheckCircle2  },
  por_caducar:  { label: 'Caduca pronto',        dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700 border-orange-200', Icon: Clock         },
  caducada:     { label: 'Sesión caducada',      dot: 'bg-red-400',    badge: 'bg-red-50 text-red-700 border-red-200',          Icon: XCircle       },
  error:        { label: 'Error de sesión',      dot: 'bg-red-400',    badge: 'bg-red-50 text-red-700 border-red-200',          Icon: AlertTriangle },
  desconocida:  { label: 'Sin sincronizar aún',  dot: 'bg-slate-300',  badge: 'bg-slate-50 text-slate-600 border-slate-200',   Icon: WifiOff       },
}

function SesionBadge({ estado }: { estado: FVEstadoSesion }) {
  const cfg = ESTADO_CFG[estado] ?? ESTADO_CFG.desconocida
  const { Icon } = cfg
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

// ─── Adaptar fixtures a FVCredencial ─────────────────────────────────

function adaptarFixture(fx: FxCredencial): FVCredencial {
  return {
    id:                fx.id,
    plataforma:        fx.plataforma,
    nombre:            fx.username,
    username:          fx.username,
    region_url:        fx.region_url,
    activo:            fx.activo,
    tipo:              null,
    descripcion:       null,
    ultima_sync:       fx.ultima_sync,
    ultimo_ok_at:      fx.ultima_sync,
    cookies_expires_at: fx.cookies_expires_at,
    ultimo_error:      fx.ultimo_error,
    estado_sesion:     fx.ultimo_error ? 'error' : fx.ultima_sync ? 'activa' : 'desconocida',
  }
}

// ─── Props ────────────────────────────────────────────────────────────

interface Props {
  fixtureCredenciales?: FxCredencial[]
  fixturesPlantas?: {
    id: string; credencial_id: string
    empresa?: { nombre: string } | null
    nombre: string; station_code: string; estado: string; capacidad_kwp: number | null
  }[]
}

// ─── Componente ───────────────────────────────────────────────────────

export default function CredencialesTab({ fixtureCredenciales, fixturesPlantas }: Props) {
  const [expandidas, setExpandidas]     = useState<Set<string>>(new Set())
  const [modalAbierto, setModalAbierto] = useState(false)
  const [credEditar, setCredEditar]     = useState<FVCredencial | null>(null)

  const { data: credReales, isLoading } = useCredencialesFV()
  const triggerSync = useTriggerFVSync()

  const usarFixtures = !isLoading && (!credReales || credReales.length === 0) && !!fixtureCredenciales?.length
  const credenciales: FVCredencial[] = usarFixtures
    ? (fixtureCredenciales ?? []).map(adaptarFixture)
    : (credReales ?? [])

  const toggle    = (id: string) => setExpandidas(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const abrirNueva  = () => { setCredEditar(null);  setModalAbierto(true) }
  const abrirEditar = (c: FVCredencial) => { setCredEditar(c); setModalAbierto(true) }

  const nError       = credenciales.filter(c => ['error','caducada'].includes(c.estado_sesion)).length
  const nPorCaducar  = credenciales.filter(c => c.estado_sesion === 'por_caducar').length

  const ESTADO_COLOR: Record<string, string> = {
    normal: 'bg-green-100 text-green-800', defectuoso: 'bg-red-100 text-red-800',
    desconectado: 'bg-slate-100 text-slate-600', desconocido: 'bg-slate-100 text-slate-500',
  }
  const ESTADO_LABEL: Record<string, string> = {
    normal: 'Operativa', defectuoso: 'Con alarma', desconectado: 'Sin datos', desconocido: '?',
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Cargando credenciales...</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      <CredencialFormModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        credencial={credEditar}
      />

      {/* Cabecera */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Credenciales de acceso FV</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {credenciales.length === 0
              ? 'Ninguna credencial registrada — añade la primera para empezar'
              : `${credenciales.length} credencial${credenciales.length !== 1 ? 'es' : ''} configurada${credenciales.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Sincronizar todas */}
          {credenciales.length > 0 && !usarFixtures && (
            <button
              onClick={() => triggerSync.mutate({})}
              disabled={triggerSync.isPending}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 rounded-xl text-sm font-medium text-white transition-colors"
            >
              {triggerSync.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <RefreshCw className="w-4 h-4" />}
              Sincronizar todo
            </button>
          )}
          <button
            onClick={abrirNueva}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva credencial
          </button>
        </div>
      </div>

      {/* Demo banner */}
      {usarFixtures && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <FlaskConical className="w-4 h-4 text-amber-500 shrink-0" />
          <span><strong>Datos de demostración.</strong> Añade tu primera credencial real con el botón de arriba.</span>
        </div>
      )}

      {/* Banners de alerta global */}
      {(nError > 0 || nPorCaducar > 0) && (
        <div className="flex flex-wrap gap-3">
          {nError > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 font-medium">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              {nError} credencial{nError > 1 ? 'es' : ''} con sesión caducada o error — renueva la sesión
            </div>
          )}
          {nPorCaducar > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800 font-medium">
              <Clock className="w-4 h-4 text-orange-500 shrink-0" />
              {nPorCaducar} credencial{nPorCaducar > 1 ? 'es' : ''} con sesión a punto de caducar
            </div>
          )}
        </div>
      )}

      {/* Estado vacío */}
      {credenciales.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl py-16 text-center">
          <KeyRound className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="font-medium text-slate-600">Sin credenciales configuradas</p>
          <p className="text-sm text-slate-400 mt-1 mb-5">
            Introduce las credenciales del portal FV (FusionSolar, SolarEdge, etc.)<br />
            para que el sync pueda detectar las plantas automáticamente.
          </p>
          <button
            onClick={abrirNueva}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 rounded-xl text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Añadir primera credencial
          </button>
        </div>
      )}

      {/* Tarjetas de credencial */}
      <div className="space-y-4">
        {credenciales.map(cred => {
          const estado      = cred.estado_sesion ?? 'desconocida'
          const abierta     = expandidas.has(cred.id)
          const cookies     = diasHasta(cred.cookies_expires_at)
          const syncLabel   = tiempoDesde(cred.ultimo_ok_at ?? cred.ultima_sync)
          const necesitaRenovar = ['caducada', 'error'].includes(estado)

          const plantasFixture = usarFixtures
            ? (fixturesPlantas ?? []).filter(p => p.credencial_id === cred.id)
            : []
          const clientesFixture = (() => {
            const mapa = new Map<string, { nombre: string; plantas: typeof plantasFixture }>()
            for (const p of plantasFixture) {
              const k = p.empresa?.nombre ?? '__sin__'
              if (!mapa.has(k)) mapa.set(k, { nombre: p.empresa?.nombre ?? '(sin cliente)', plantas: [] })
              mapa.get(k)!.plantas.push(p)
            }
            return [...mapa.values()]
          })()

          return (
            <div
              key={cred.id}
              className={`bg-white border rounded-xl overflow-hidden transition-shadow hover:shadow-sm ${
                necesitaRenovar ? 'border-red-200' : 'border-slate-200'
              }`}
            >
              <div className="px-5 py-4 space-y-3">

                {/* Fila 1: plataforma + nombre + acciones */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full font-medium capitalize">
                      {cred.plataforma}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{cred.nombre || cred.username}</p>
                      <p className="text-xs text-slate-400 font-mono truncate">{cred.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => abrirEditar(cred)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      <Pencil className="w-3 h-3" />
                      Editar
                    </button>
                    {plantasFixture.length > 0 && (
                      <button
                        onClick={() => toggle(cred.id)}
                        className="flex items-center gap-1 text-slate-400 hover:text-slate-600 px-1"
                      >
                        {abierta
                          ? <><ChevronDown className="w-4 h-4" /><span className="text-xs">ocultar</span></>
                          : <><ChevronRight className="w-4 h-4" /><span className="text-xs">ver plantas</span></>
                        }
                      </button>
                    )}
                  </div>
                </div>

                {/* Fila 2: badge estado + última sync */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SesionBadge estado={estado} />
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      última sync: {syncLabel}
                    </span>
                    {cookies && (
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
                        cookies.urgente
                          ? 'bg-orange-50 border-orange-200 text-orange-700 font-semibold'
                          : 'bg-green-50 border-green-100 text-green-600'
                      }`}>
                        <Clock className="w-3 h-3" />
                        {cookies.texto}
                      </span>
                    )}
                  </div>

                  {/* Botón sincronizar esta credencial */}
                  {!usarFixtures && (
                    <button
                      onClick={() => triggerSync.mutate({ credencialId: cred.id })}
                      disabled={triggerSync.isPending}
                      title="Lanzar sync ahora para esta credencial"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                      {triggerSync.isPending
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Play className="w-3.5 h-3.5 text-amber-500" />}
                      Sincronizar
                    </button>
                  )}
                </div>

                {/* Fila 3: error */}
                {cred.ultimo_error && (
                  <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 font-mono leading-relaxed break-all">
                      {cred.ultimo_error}
                    </p>
                  </div>
                )}

                {/* Aviso renovar sesión — flujo guiado con el Renovador local */}
                {necesitaRenovar && (
                  <div className="px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                    <div className="flex items-start gap-2">
                      <KeyRound className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-800">
                        <p className="font-semibold mb-1">Sesión caducada — hay que renovar las cookies</p>
                        <p className="mb-1.5">
                          FusionSolar caduca la sesión periódicamente y exige iniciar sesión a mano.
                          Abre el <strong>Renovador Valere FV</strong> en tu PC, inicia sesión en el portal
                          y vuelve aquí a <strong>Sincronizar</strong>.
                        </p>
                        <p className="text-amber-700">
                          Pasos: 1) doble clic en <span className="font-mono">RENOVAR_SESION_FV.bat</span> ·
                          2) elige esta credencial (<span className="font-mono">{cred.nombre || cred.username}</span>) ·
                          3) inicia sesión en FusionSolar · 4) pulsa «Sincronizar» abajo.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Detalle expandible: plantas (modo fixture) */}
              {abierta && usarFixtures && (
                <div className="border-t border-slate-100 bg-slate-50/60 divide-y divide-slate-100">
                  {clientesFixture.length === 0 ? (
                    <p className="px-6 py-4 text-sm text-slate-400 italic">No hay plantas vinculadas.</p>
                  ) : clientesFixture.map(({ nombre, plantas: cps }) => (
                    <div key={nombre} className="px-6 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{nombre}</span>
                        <span className="text-xs text-slate-400">({cps.length} planta{cps.length !== 1 ? 's' : ''})</span>
                      </div>
                      <div className="space-y-1.5 pl-5">
                        {cps.map(p => (
                          <div key={p.id} className="flex items-center gap-3 min-w-0">
                            <Sun className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                            <span className="text-sm text-slate-700 font-medium flex-1 truncate">{p.nombre}</span>
                            <span className="font-mono text-xs text-slate-400 shrink-0">{p.station_code}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${ESTADO_COLOR[p.estado] ?? 'bg-slate-100 text-slate-500'}`}>
                              {ESTADO_LABEL[p.estado] ?? '?'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Info cron */}
      {credenciales.length > 0 && !usarFixtures && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500 flex items-start gap-3">
          <RefreshCw className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-slate-600 mb-0.5">Sincronización automática</p>
            <p>
              El sync automático está desactivado hasta que la sesión FV sea estable.
              Usa el botón <strong>Sincronizar</strong> para lanzar manualmente cuando
              las cookies estén renovadas. El proceso tarda ~1-2 min en completarse.
            </p>
            <a
              href="https://github.com/jolivares-valere/valere-v2/actions/workflows/fv-sync.yml"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1.5 text-blue-600 hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Ver historial de syncs en GitHub Actions
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
