import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { useMisOportunidades, type VMisOportunidadesRow } from './api'
import BandejaCard from './components/BandejaCard'

export default function CaptacionPage() {
  const { data: oportunidades = [], isLoading } = useMisOportunidades()

  const filterByEtapas = (etapas: string[]): VMisOportunidadesRow[] => {
    return oportunidades.filter(op => etapas.includes(op.etapa_operativa ?? ''))
  }

  const porLlamar = filterByEtapas(['nuevo', 'contactado'])
  const esperandoFactura = filterByEtapas(['esperando_factura'])
  const propuestasEnviar = filterByEtapas(['propuesta_lista'])
  const seguimientos = filterByEtapas(['propuesta_enviada', 'seguimiento'])

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
      <div>
        <h1 className="text-3xl font-bold text-valere-blue-dark font-display">
          Captación
        </h1>
        <p className="text-slate-600 mt-1">
          Tu bandeja de leads y propuestas
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="por-llamar" className="w-full">
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
                <BandejaCard key={op.id} op={op} />
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
                <BandejaCard key={op.id} op={op} />
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
                <BandejaCard key={op.id} op={op} />
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
                <BandejaCard key={op.id} op={op} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
