import { useState } from 'react'
import {
  CheckCircle2, AlertTriangle, KeyRound, Clock, RefreshCw,
  ChevronDown, ChevronRight, Sun, Building2, WifiOff, Plus,
  Pencil, Loader2, FlaskConical,
} from 'lucide-react'
import { useCredencialesFV } from '../api'
import type { FVCredencial } from '../api'
import CredencialFormModal from './CredencialFormModal'

// ─── También soportamos fixtures en modo demo ─────────────
import type { FxCredencial } from '../fixtures'

function diasHasta(s: string | null): { texto: string; urgente: boolean } | null {
  if (!s) return null
  const diff = Math.floor((new Date(s).getTime() - Date.now()) / 86400000)
  if (diff < 0)  return { texto: 'Cookies expiradas', urgente: true }
  if (diff === 0) return { texto: 'Cookies expiran hoy', urgente: true }
  if (diff === 1) return { texto: 'Cookies expiran mañana', urgente: true }
  if (diff <= 3)  return { texto: `Cookies expiran en ${diff} días`, urgente: true }
  return { texto: `Cookies OK (${diff} días)`, urgente: false }
}

function tiempoDesde(s: string | null | undefined): string {
  if (!s) return 'nunca'
  const diff = Math.floor((Date.now() - new Date(s).getTime()) / 60000)
  if (diff < 1)   return 'ahora mismo'
  if (diff < 60)  return `hace ${diff}m`
  const h = Math.floor(diff / 60)
  if (h < 24)    return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

// Adaptar FxCredencial (fixture) a FVCredencial (real)
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
    cookies_expires_at: fx.cookies_expires_at,
    ultimo_error:      fx.ultimo_error,
  }
}

interface Props {
  // fixtures pasadas desde el padre (solo si no hay datos reales)
  fixtureCredenciales?: FxCredencial[]
  fixturesPlantas?: { id: string; credencial_id: string; empresa?: { nombre: string } | null; nombre: string; station_code: string; estado: string; capacidad_kwp: number | null }[]
}

export default function CredencialesTab({ fixtureCredenciales, fixturesPlantas }: Props) {
  const [expandidas, setExpandidas]     = useState<Set<string>>(new Set())
  const [modalAbierto, setModalAbierto] = useState(false)
  const [credEditar, setCredEditar]     = useState<FVCredencial | null>(null)

  const { data: credReales, isLoading } = useCredencialesFV()

  // Modo fixture: cuando no hay datos reales y se pasan fixtures
  const usarFixtures = !isLoading && (!credReales || credReales.length === 0) && !!fixtureCredenciales?.length
  const credenciales: FVCredencial[] = usarFixtures
    ? (fixtureCredenciales ?? []).map(adaptarFixture)
    : (credReales ?? [])

  const toggle = (id: string) =>
    setExpandidas(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const abrirNueva = () => { setCredEditar(null); setModalAbierto(true) }
  const abrirEditar = (c: FVCredencial) => { setCredEditar(c); setModalAbierto(true) }

  const nCredError      = credenciales.filter(c => !!c.ultimo_error).length
  const nCookiesUrgente = credenciales.filter(c => diasHasta(c.cookies_expires_at)?.urgente).length

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

      {/* Modal */}
      <CredencialFormModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        credencial={credEditar}
      />

      {/* Cabecera con botón nueva */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Credenciales de acceso FV
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {credenciales.length === 0
              ? 'Ninguna credencial registrada — añade la primera para empezar'
              : `${credenciales.length} credencial${credenciales.length !== 1 ? 'es' : ''} configurada${credenciales.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={abrirNueva}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva credencial
        </button>
      </div>

      {/* Aviso modo demo */}
      {usarFixtures && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <FlaskConical className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            <strong>Datos de demostración.</strong> Añade tu primera credencial real con el botón de arriba.
            Los datos de demostración desaparecen en cuanto guardas una credencial real.
          </span>
        </div>
      )}

      {/* Banners de alerta */}
      {(nCredError > 0 || nCookiesUrgente > 0) && (
        <div className="flex flex-wrap gap-3">
          {nCredError > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 font-medium">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              {nCredError} credencial{nCredError > 1 ? 'es' : ''} con error — sync detenido para esas plantas
            </div>
          )}
          {nCookiesUrgente > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800 font-medium">
              <Clock className="w-4 h-4 text-orange-500 shrink-0" />
              {nCookiesUrgente} credencial{nCookiesUrgente > 1 ? 'es' : ''} con cookies a punto de expirar
            </div>
          )}
        </div>
      )}

      {/* Estado vacío — sin credenciales */}
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
          const hayError  = !!cred.ultimo_error
          const abierta   = expandidas.has(cred.id)
          const cookies   = diasHasta(cred.cookies_expires_at)
          const syncLabel = tiempoDesde(cred.ultima_sync)

          // Plantas de esta credencial (solo en modo fixture)
          const plantasFixture = usarFixtures
            ? (fixturesPlantas ?? []).filter(p => p.credencial_id === cred.id)
            : []

          // Clientes únicos en modo fixture
          const clientesFixture = (() => {
            const mapa = new Map<string, { nombre: string; plantas: typeof plantasFixture }>()
            for (const p of plantasFixture) {
              const eid = p.empresa?.nombre ?? '__sin__'
              if (!mapa.has(eid)) mapa.set(eid, { nombre: p.empresa?.nombre ?? '(sin cliente)', plantas: [] })
              mapa.get(eid)!.plantas.push(p)
            }
            return [...mapa.values()]
          })()

          const ESTADO_COLOR: Record<string, string> = {
            normal:       'bg-green-100 text-green-800',
            defectuoso:   'bg-red-100 text-red-800',
            desconectado: 'bg-slate-100 text-slate-600',
            desconocido:  'bg-slate-100 text-slate-500',
          }
          const ESTADO_LABEL: Record<string, string> = {
            normal: 'Operativa', defectuoso: 'Con alarma', desconectado: 'Sin datos', desconocido: 'Desconocido',
          }

          return (
            <div
              key={cred.id}
              className={`bg-white border rounded-xl overflow-hidden transition-shadow hover:shadow-sm ${
                hayError ? 'border-red-200' : 'border-slate-200'
              }`}
            >
              {/* Card principal */}
              <div className="px-5 py-4">
                {/* Fila 1: plataforma + nombre + acciones */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full font-medium capitalize">
                      {cred.plataforma}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">
                        {cred.nombre || cred.username}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{cred.username}</p>
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

                {/* Fila 2: estado login */}
                <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg ${
                  hayError ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'
                }`}>
                  {hayError
                    ? <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    : <CheckCircle2  className="w-4 h-4 text-green-500 shrink-0" />
                  }
                  <span className={`text-sm font-semibold ${hayError ? 'text-red-700' : 'text-green-700'}`}>
                    {hayError ? 'Error de sesión' : cred.ultima_sync ? 'Login OK' : 'Sin sincronizar aún'}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    {syncLabel}
                  </span>
                </div>

                {/* Fila 3: alertas inline */}
                <div className="flex flex-wrap gap-2">
                  {hayError && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-mono">
                      {cred.ultimo_error}
                    </span>
                  )}
                  {!cred.ultima_sync && !hayError && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                      Credencial guardada — pendiente de primer sync
                    </span>
                  )}
                  {cookies && (
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs border ${
                      cookies.urgente
                        ? 'bg-orange-50 border-orange-200 text-orange-700 font-semibold'
                        : 'bg-green-50 border-green-100 text-green-700'
                    }`}>
                      <Clock className="w-3 h-3" />
                      {cookies.texto}
                    </span>
                  )}
                  {cred.tipo && (
                    <span className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 capitalize">
                      {cred.tipo.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Detalle expandible: solo en modo fixture */}
              {abierta && usarFixtures && (
                <div className="border-t border-slate-100 bg-slate-50/60 divide-y divide-slate-100">
                  {clientesFixture.length === 0 ? (
                    <p className="px-6 py-4 text-sm text-slate-400 italic">
                      No hay plantas vinculadas a esta credencial.
                    </p>
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
                              {ESTADO_LABEL[p.estado] ?? 'Desconocido'}
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

      {/* Instrucciones renovar cookies */}
      {credenciales.some(c => c.ultima_sync) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1.5 flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            Renovar cookies de sesión
          </p>
          <p className="text-xs mb-2 text-amber-700">
            Ejecutar localmente (con el browser visible para resolver CAPTCHAs si los hay):
          </p>
          <pre className="bg-amber-100 rounded-lg px-4 py-2.5 font-mono text-xs text-amber-900 overflow-x-auto whitespace-pre">
{`cd valere-v2/scripts/fv-sync
python extract_cookies.py          # Todas las credenciales activas
python extract_cookies.py --cred <uuid>  # Solo una credencial`}
          </pre>
        </div>
      )}
    </div>
  )
}
