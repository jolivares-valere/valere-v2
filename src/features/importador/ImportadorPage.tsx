import { useState } from 'react'
import ImportEmpresas from './components/ImportEmpresas'
import ImportContactos from './components/ImportContactos'
import ImportContratos from './components/ImportContratos'

type Tab = 'empresas' | 'contactos' | 'contratos'

export default function ImportadorPage() {
  const [tab, setTab] = useState<Tab>('empresas')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'empresas', label: 'Empresas' },
    { key: 'contactos', label: 'Contactos' },
    { key: 'contratos', label: 'Contratos + CUPS' },
  ]

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-valere-blue-dark">Importador CSV</h1>
        <p className="text-sm text-slate-500">Sube un CSV para importar datos en lote</p>
      </div>

      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm ${
              tab === t.key
                ? 'border-b-2 border-slate-900 font-medium text-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {tab === 'empresas' && <ImportEmpresas />}
        {tab === 'contactos' && <ImportContactos />}
        {tab === 'contratos' && <ImportContratos />}
      </div>
    </div>
  )
}
