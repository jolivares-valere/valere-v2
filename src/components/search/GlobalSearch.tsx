import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Building2, User, FileText, TrendingUp, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../core/supabase/client'
import { useDebounce } from '../../core/hooks/useDebounce'

interface EmpresaHit { id: string; nombre: string; nif: string | null }
interface ContactoHit { id: string; nombre: string; apellidos: string | null; email: string | null; empresa: { nombre: string } | null }
interface ContratoHit { id: string; cups: string | null; empresa: { nombre: string } | null }
interface OportunidadHit { id: string; nombre: string; empresa: { nombre: string } | null }

interface SearchResults {
  empresas: EmpresaHit[]
  contactos: ContactoHit[]
  contratos: ContratoHit[]
  oportunidades: OportunidadHit[]
}

async function runSearch(q: string): Promise<SearchResults> {
  const like = `%${q}%`
  const [emp, con, ctr, opo] = await Promise.all([
    supabase.from('empresas').select('id, nombre, nif').or(`nombre.ilike.${like},nif.ilike.${like}`).is('deleted_at', null).limit(5),
    supabase.from('contactos').select('id, nombre, apellidos, email, empresa:empresas(nombre)').or(`nombre.ilike.${like},apellidos.ilike.${like},email.ilike.${like}`).is('deleted_at', null).limit(5),
    supabase.from('contratos').select('id, cups, empresa:empresas(nombre)').ilike('cups', like).is('deleted_at', null).limit(5),
    supabase.from('oportunidades').select('id, nombre, empresa:empresas(nombre)').ilike('nombre', like).is('deleted_at', null).limit(5),
  ])
  return {
    empresas: (emp.data ?? []) as EmpresaHit[],
    contactos: (con.data ?? []) as unknown as ContactoHit[],
    contratos: (ctr.data ?? []) as unknown as ContratoHit[],
    oportunidades: (opo.data ?? []) as unknown as OportunidadHit[],
  }
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const debounced = useDebounce(query, 350)
  const trimmed = debounced.trim()
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const { data, isFetching } = useQuery({
    queryKey: ['globalSearch', trimmed],
    queryFn: () => runSearch(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
  })

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const onGo = (to: string) => {
    navigate(to)
    setQuery('')
    setOpen(false)
  }

  const total = (data?.empresas.length ?? 0) + (data?.contactos.length ?? 0) + (data?.contratos.length ?? 0) + (data?.oportunidades.length ?? 0)
  const showDropdown = open && trimmed.length >= 2

  return (
    <div ref={containerRef} className="relative w-full max-w-lg">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          placeholder="Buscar empresas, contactos, contratos, oportunidades…"
          className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm focus:border-slate-500 focus:outline-none"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); setOpen(false) }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Limpiar">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-[60vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {isFetching && <p className="p-4 text-xs text-slate-500">Buscando…</p>}
          {!isFetching && total === 0 && <p className="p-4 text-xs text-slate-500">Sin resultados para "{trimmed}"</p>}
          {!isFetching && total > 0 && data && (
            <div className="divide-y divide-slate-100">
              {data.empresas.length > 0 && (
                <Group icon={<Building2 className="h-3.5 w-3.5" />} label="Empresas">
                  {data.empresas.map((e) => (
                    <button key={e.id} type="button" onClick={() => onGo(`/empresas/${e.id}`)} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
                      <span className="font-medium text-slate-900">{e.nombre}</span>
                      {e.nif && <span className="ml-2 text-xs text-slate-500">{e.nif}</span>}
                    </button>
                  ))}
                </Group>
              )}
              {data.contactos.length > 0 && (
                <Group icon={<User className="h-3.5 w-3.5" />} label="Contactos">
                  {data.contactos.map((c) => (
                    <button key={c.id} type="button" onClick={() => onGo('/contactos')} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
                      <span className="font-medium text-slate-900">{c.nombre}{c.apellidos ? ` ${c.apellidos}` : ''}</span>
                      {(c.email || c.empresa?.nombre) && <span className="ml-2 text-xs text-slate-500">{c.empresa?.nombre ?? c.email}</span>}
                    </button>
                  ))}
                </Group>
              )}
              {data.contratos.length > 0 && (
                <Group icon={<FileText className="h-3.5 w-3.5" />} label="Contratos">
                  {data.contratos.map((c) => (
                    <button key={c.id} type="button" onClick={() => onGo(`/contratos/${c.id}`)} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
                      <span className="font-mono text-xs text-slate-700">{c.cups ?? '—'}</span>
                      {c.empresa?.nombre && <span className="ml-2 text-xs text-slate-500">{c.empresa.nombre}</span>}
                    </button>
                  ))}
                </Group>
              )}
              {data.oportunidades.length > 0 && (
                <Group icon={<TrendingUp className="h-3.5 w-3.5" />} label="Oportunidades">
                  {data.oportunidades.map((o) => (
                    <button key={o.id} type="button" onClick={() => onGo('/oportunidades')} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
                      <span className="font-medium text-slate-900">{o.nombre}</span>
                      {o.empresa?.nombre && <span className="ml-2 text-xs text-slate-500">{o.empresa.nombre}</span>}
                    </button>
                  ))}
                </Group>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Group({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
        {icon} {label}
      </div>
      {children}
    </div>
  )
}
