import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Button } from '../../components/ui/button'
import {
  useMisOportunidades,
  useTodosMisCasosCaptacion,
  useCaptacionEnviados,
  useCaptacionHistorico,
  type VMisOportunidadesRow,
  type VEnviadosRow,
} from './api'
import BandejaCard from './components/BandejaCard'
import OportunidadDrawer from './components/OportunidadDrawer'
import NuevoLeadModal from './components/NuevoLeadModal'
import BandejaEnviadosCard from './components/BandejaEnviadosCard'
import BuscadorCaptacion from './components/BuscadorCaptacion'
import SelectorVista, { loadViewMode, saveViewMode, type ViewMode } from './components/SelectorVista'
import TablaCaptacion from './components/TablaCaptacion'
import MisLlamadasView from './components/MisLlamadasView'
import RecordatorioModal from './components/RecordatorioModal'
import CalendarioCaptacion from './components/CalendarioCaptacion'
import { useAuth } from '../../core/hooks/useAuth'

/**
 * Sprint 2026-05-19 — Carolina Aroca (hallazgos #2 + #3).
 *
 * Cambios vs versión anterior:
 *   - Toggle Vista (Fichas / Tabla tipo Excel) en header con persistencia.
 *   - Buscador inline arriba (filtra el tab activo).
 *   - Tab "Seguimientos" eliminado: propuesta_enviada/seguimiento vuelven a
 *     "Por llamar" con texto siguiente acción "Llamar para seguimiento".
 *   - Tab "Enviados" nuevo: casos en manos de Carolina M / asesor senior
 *     con SLA visible y botón "Recordar a responsable".
 *   - Tab "Histórico" (renombre de "Todos mis casos") con vista Tabla full.
 *   - Tab "Mis llamadas" nuevo: log cronológico actividades tipo llamada.
 */

export default function CaptacionPage() {
  const { user } = useAuth()

  // Estado visual
  const [vista, setVista] = useState<ViewMode>(() => loadViewMode())
  const [busqueda, setBusqueda] = useState('')
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [nuevoLeadOpen, setNuevoLeadOpen] = useState(false)

  // Estado modal recordatorio
  const [recordarOpen, setRecordarOpen] = useState(false)
  const [recordarTarget, setRecordarTarget] = useState<{ id: string; empresa: string; responsable: string | null } | null>(null)

  // Datos
  const { data: oportunidades = [], isLoading } = useMisOportunidades()
  const { data: todosMisCasos = [] } = useTodosMisCasosCaptacion()
  const { data: enviados = [] } = useCaptacionEnviados()
  // Histórico solo se carga si la vista Tabla está activa (más datos)
  const { data: historico = [] } = useCaptacionHistorico(vista === 'tabla' ? { texto: busqueda } : undefined)

  const handleSetVista = (v: ViewMode) => {
    setVista(v)
    saveViewMode(v)
  }

  // Filtro por búsqueda (texto libre) sobre el tab activo
  const filtrarBusqueda = (rows: VMisOportunidadesRow[]) => {
    const t = busqueda.trim().toLowerCase()
    if (!t) return rows
    return rows.filter(op => {
      const nombre = (op.empresa_nombre ?? '').toLowerCase()
      const nif = (op.empresa_nif ?? '').toLowerCase()
      return nombre.includes(t) || nif.includes(t)
    })
  }

  const filtrarEnviados = (rows: VEnviadosRow[]) => {
    const t = busqueda.trim().toLowerCase()
    if (!t) return rows
    return rows.filter(op => {
      const nombre = (op.empresa_nombre ?? '').toLowerCase()
      const nif = (op.empresa_nif ?? '').toLowerCase()
      return nombre.includes(t) || nif.includes(t)
    })
  }

  const filterByEtapas = (etapas: string[]): VMisOportunidadesRow[] => {
    const rows = oportunidades.filter(op => etapas.includes(op.etapa_operativa ?? ''))
    return filtrarBusqueda(rows)
  }

  // Bandejas operativas (sin pestaña "Seguimientos" — propuesta_enviada vuelve a "Por llamar")
  const porLlamar = useMemo(() => filterByEtapas(['nuevo', 'contactado', 'propuesta_enviada', 'seguimiento']), [oportunidades, busqueda])
  const esperandoFactura = useMemo(() => filterByEtapas(['esperando_factura']), [oportunidades, busqueda])
  const propuestasEnviar = useMemo(() => filterByEtapas(['propuesta_lista']), [oportunidades, busqueda])
  const enviadosFiltrados = useMemo(() => filtrarEnviados(enviados), [enviados, busqueda])
  const historicoFiltrado = useMemo(() => filtrarBusqueda(todosMisCasos), [todosMisCasos, busqueda])

  // Tab por defecto: primero con datos
  const defaultTab =
    porLlamar.length > 0 ? 'por-llamar'
    : esperandoFactura.length > 0 ? 'esperando-factura'
    : propuestasEnviar.length > 0 ? 'propuestas-enviar'
    : enviadosFiltrados.length > 0 ? 'enviados'
    : 'historico'

  const handleAbrirRecordatorio = (op: VEnviadosRow) => {
    setRecordarTarget({
      id: op.id,
      empresa: op.empresa_nombre ?? 'el caso',
      responsable: op.responsable_actual_nombre,
    })
    setRecordarOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Cargando bandeja...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-valere-blue-dark font-display">
            Captación
          </h1>
          <p className="text-slate-600 mt-1">
            Bandeja de telemarketing — leads, propuestas y seguimientos.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SelectorVista value={vista} onChange={handleSetVista} />
          <Button onClick={() => setNuevoLeadOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nuevo lead
          </Button>
        </div>
      </div>

      {/* Buscador inline */}
      <div className="max-w-xl">
        <BuscadorCaptacion value={busqueda} onChange={setBusqueda} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          <TabsTrigger value="por-llamar">
            Por llamar ({porLlamar.length})
          </TabsTrigger>
          <TabsTrigger value="esperando-factura">
            Esperando factura ({esperandoFactura.length})
          </TabsTrigger>
          <TabsTrigger value="propuestas-enviar">
            Propuestas para enviar ({propuestasEnviar.length})
          </TabsTrigger>
          <TabsTrigger value="enviados">
            Enviados ({enviadosFiltrados.length})
          </TabsTrigger>
          <TabsTrigger value="historico">
            Histórico ({historicoFiltrado.length})
          </TabsTrigger>
          <TabsTrigger value="calendario">
            Calendario
          </TabsTrigger>
          <TabsTrigger value="llamadas">
            Mis llamadas
          </TabsTrigger>
        </TabsList>

        {/* Tab: Por llamar */}
        <TabsContent value="por-llamar" className="mt-6">
          <BandejaContent rows={porLlamar} vista={vista} historicoData={historicoFiltrado} onClick={setDrawerId} />
        </TabsContent>

        {/* Tab: Esperando factura */}
        <TabsContent value="esperando-factura" className="mt-6">
          <BandejaContent rows={esperandoFactura} vista={vista} historicoData={historicoFiltrado} onClick={setDrawerId} />
        </TabsContent>

        {/* Tab: Propuestas para enviar */}
        <TabsContent value="propuestas-enviar" className="mt-6">
          <BandejaContent rows={propuestasEnviar} vista={vista} historicoData={historicoFiltrado} onClick={setDrawerId} />
        </TabsContent>

        {/* Tab: Enviados (NUEVO sprint 2026-05-19) */}
        <TabsContent value="enviados" className="mt-6">
          {enviadosFiltrados.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-8 text-center">
              <p className="text-slate-500">No tienes casos enviados pendientes de respuesta.</p>
            </div>
          ) : vista === 'tabla' ? (
            <>
              <p className="text-xs text-slate-500 mb-3">
                Vista tabla: casos enviados a Carolina M / asesor senior con SLA y dias sin movimiento.
              </p>
              <TablaCaptacion
                data={historico.filter((r: any) => enviadosFiltrados.some(e => e.id === r.id))}
                onRowClick={setDrawerId}
              />
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500 mb-3">
                Casos que iniciaste y ahora estan en manos de Carolina M o asesor senior. Si llevan mucho parados puedes recordar al responsable.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {enviadosFiltrados.map(op => (
                  <BandejaEnviadosCard
                    key={op.id}
                    op={op}
                    onClick={setDrawerId}
                    onRecordar={() => handleAbrirRecordatorio(op)}
                  />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Tab: Historico (renombre de "Todos mis casos") */}
        <TabsContent value="historico" className="mt-6">
          {vista === 'tabla' ? (
            <TablaCaptacion data={historico} onRowClick={setDrawerId} />
          ) : historicoFiltrado.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-8 text-center">
              <p className="text-slate-500">No hay registros en tu historico.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500 mb-3">
                Incluye casos donde fuiste creadora o responsable alguna vez. Activa "Vista: Tabla" para filtros tipo Excel.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {historicoFiltrado.map(op => (
                  <BandejaCard
                    key={op.id}
                    op={op}
                    onClick={setDrawerId}
                    currentUserId={user?.id ?? null}
                  />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Tab: Calendario (NUEVO sprint 2026-05-19 tarde, Hallazgo #1 Capa A) */}
        <TabsContent value="calendario" className="mt-6">
          <CalendarioCaptacion onAbrirCliente={setDrawerId} />
        </TabsContent>

        {/* Tab: Mis llamadas (NUEVO sprint 2026-05-19) */}
        <TabsContent value="llamadas" className="mt-6">
          <MisLlamadasView onRowClick={setDrawerId} />
        </TabsContent>
      </Tabs>

      <OportunidadDrawer oportunidadId={drawerId} onClose={() => setDrawerId(null)} />

      <NuevoLeadModal open={nuevoLeadOpen} onOpenChange={setNuevoLeadOpen} onCreated={(id) => setDrawerId(id)} />

      <RecordatorioModal
        open={recordarOpen}
        onOpenChange={setRecordarOpen}
        oportunidadId={recordarTarget?.id ?? null}
        empresaNombre={recordarTarget?.empresa}
        responsableNombre={recordarTarget?.responsable ?? null}
      />
    </div>
  )
}

function BandejaContent({
  rows, vista, historicoData, onClick,
}: {
  rows: VMisOportunidadesRow[]
  vista: ViewMode
  historicoData: any[]
  onClick: (id: string) => void
}) {
  if (vista === 'tabla') {
    const ids = new Set(rows.map(r => r.id))
    const subset = historicoData.filter((r: any) => ids.has(r.id))
    return <TablaCaptacion data={subset} onRowClick={onClick} />
  if (rows.length === 0) {
    return (
      <div className="rounded-lg bg-slate-50 p-8 text-center">
              <p className="text-slate-500">No tienes nada en esta bandeja</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {rows.map(op => (
        <BandejaCard key={op.id} op={op} onClick={onClick} />
      ))}
    </div>
  )
}
}
