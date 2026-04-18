import { useState } from 'react'
import { BarChart3, Briefcase } from 'lucide-react'
import InformeComercialMensual from './components/InformeComercialMensual'
import InformeCarteraActiva from './components/InformeCarteraActiva'

type Tab = 'comercial' | 'cartera'

export default function InformesPage() {
  const [tab, setTab] = useState<Tab>('comercial')

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Informes</h1>
        <p className="text-sm text-slate-500">Métricas agregadas de actividad y cartera.</p>
      </div>

      <div className="mb-4 flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('comercial')}
          className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
            tab === 'comercial'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Comercial mensual
        </button>
        <button
          type="button"
          onClick={() => setTab('cartera')}
          className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
            tab === 'cartera'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          Cartera activa
        </button>
      </div>

      {tab === 'comercial' ? <InformeComercialMensual /> : <InformeCarteraActiva />}
    </div>
  )
}
