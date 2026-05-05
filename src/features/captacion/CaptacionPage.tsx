import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Button } from '../../components/ui/button'
import { useMisOportunidades, useTodosMisCasosCaptacion, type VMisOportunidadesRow } from './api'
import BandejaCard from './components/BandejaCard'
import OportunidadDrawer from './components/OportunidadDrawer'
import NuevoLeadModal from './components/NuevoLeadModal'
import { useAuth } from '../../core/hooks/useAuth'

export default function CaptacionPage() {
  const { user } = useAuth()
  const { data: oportunidades = [], isLoading } = useMisOportunidades()
  const { data: todosMisCasos = [] } = useTodosMisCasosCaptacion()
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [nuevoLeadOpen, setNuevoLeadOpen] = useState(false)

  const filterByEtapas = (etapas: string[]): VMisOportunidadesRow[] => {
    return oportunidades.filter(op => etapas.includes(op.etapa_operativa ?? ''))
  }

  const porLlamar = filterByEtapas(['nuevo', 'contactado'])
  const esperandoFactura = filterByEtapas(['esperando_factura'])
  const propuestasEnviar = filterByEtapas(['propuesta_lista'])
  const seguimientos = filterByEtapas(['propuesta_enviada', 'seguimiento'])

  // Tab default: primero con datos. Si todos vacíos, queda 'por-llamar'.
  const defaultTab =
    porLlamar.length > 0 ? 'por-llamar'
    : esperandoFactura.length > 0 ? 'esperando-factura'
    : propuestasEnviar.length > 0 ? 'propuestas-enviar'
    : seguimientos.length > 0 ? 'seguimientos'
    : 'por-llamar'

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
            Bandeja de telemarketing — leads que captas, propuestas que envías y seguimientos.
          </p>
        </div>
        <Button onClick={() => setNuevoLeadOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" />
          Nuevo lead
        </Button>
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
          <TabsTrigger value="seguimientos">
            Seguimientos ({seguimientos.length})
          </TabsTrigger>
          <TabsTrigger value="todos-mis-casos">
            Todos mis casos ({todosMisCasos.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Por llamar */}
        <TabsContent value="por-llamar" className="mt-6">
          {porLlamar.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-8 text-center">
              <p className="text-slate-500">No tienes nada en esta bandeja</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {porLlamar.map(op => (
                <BandejaCard key={op.id} op={op} onClick={setDrawerId} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Esperando factura */}
        <TabsContent value="esperando-factura" className="mt-6">
          {esperandoFactura.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-8 text-center">
              <p className="text-slate-500">No tienes nada en esta bandeja</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {esperandoFactura.map(op => (
                <BandejaCard key={op.id} op={op} onClick={setDrawerId} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Propuestas para enviar */}
        <TabsContent value="propuestas-enviar" className="mt-6">
          {propuestasEnviar.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-8 text-center">
              <p className="text-slate-500">No tienes nada en esta bandeja</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {propuestasEnviar.map(op => (
                <BandejaCard key={op.id} op={op} onClick={setDrawerId} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Seguimientos */}
        <TabsContent value="seguimientos" className="mt-6">
          {seguimientos.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-8 text-center">
              <p className="text-slate-500">No tienes nada en esta bandeja</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {seguimientos.map(op => (
                <BandejaCard key={op.id} op={op} onClick={setDrawerId} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Todos mis casos (cross-bandeja, incluye casos en handoff a otros) */}
        <TabsContent value="todos-mis-casos" className="mt-6">
          {todosMisCasos.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-8 text-center">
              <p className="text-slate-500">No tienes ningún caso en seguimiento todavía</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500 mb-3">
                Incluye casos donde fuiste creadora o aparece tu mano en handoffs, aunque ahora estén en manos de Carolina M o un asesor senior. Lectura/seguimiento; las acciones siguen en su bandeja propia.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {todosMisCasos.map(op => (
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
      </Tabs>

      <OportunidadDrawer oportunidadId={drawerId} onClose={() => setDrawerId(null)} />

      <NuevoLeadModal open={nuevoLeadOpen} onOpenChange={setNuevoLeadOpen} onCreated={(id) => setDrawerId(id)} />
    </div>
  )
}
