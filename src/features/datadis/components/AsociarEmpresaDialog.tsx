import { useState, useMemo } from 'react'
import { Search, Loader2, Link2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { ScrollArea } from '../../../components/ui/scroll-area'
import { useDebounce } from '../../../core/hooks/useDebounce'
import { useEmpresas } from '../../empresas/api'
import { useAsociarSuministroAEmpresa } from '../api'
import type { DatadisSupply } from '../api'
import type { Empresa } from '../../../core/types/entities'

interface AsociarEmpresaDialogProps {
  supply: DatadisSupply
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function AsociarEmpresaDialog({
  supply,
  open,
  onClose,
  onSuccess,
}: AsociarEmpresaDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null)

  // Debounce búsqueda (250ms)
  const debouncedSearch = useDebounce(searchQuery, 250)

  // Fetch empresas con filtro de búsqueda
  const { data: empresasResult, isLoading: isLoadingEmpresas } = useEmpresas({
    filter: {
      search: debouncedSearch.length >= 2 ? debouncedSearch : '',
    },
    pageSize: 50,
  })

  const empresas = empresasResult?.data ?? []

  // Mutation hook
  const { mutate: asociar, isPending } = useAsociarSuministroAEmpresa()

  // Filtrar resultados con búsqueda en vivo (para UX rápido)
  const filteredEmpresas = useMemo(() => {
    if (searchQuery.length < 2) return []
    const q = searchQuery.toLowerCase()
    return empresas.filter(
      e =>
        (e.nombre?.toLowerCase().includes(q) || false) ||
        (e.nif?.toLowerCase().includes(q) || false),
    )
  }, [searchQuery, empresas])

  function handleSelectEmpresa(empresa: Empresa) {
    setSelectedEmpresa(empresa)
  }

  function handleAsociar() {
    if (!selectedEmpresa) return

    asociar(
      {
        supply,
        empresa_id: selectedEmpresa.id,
      },
      {
        onSuccess: () => {
          onSuccess?.()
          setSearchQuery('')
          setSelectedEmpresa(null)
          onClose()
        },
      },
    )
  }

  const isLoading = isLoadingEmpresas || isPending

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Asociar suministro a empresa
          </DialogTitle>
          <DialogDescription>
            CUPS: <span className="font-mono font-semibold text-slate-700">{supply.cups}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por nombre o NIF (mín. 2 caracteres)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
              disabled={isLoading}
            />
          </div>

          {/* Lista de resultados */}
          {searchQuery.length >= 2 ? (
            <div className="rounded-lg border border-slate-200 bg-white">
              <ScrollArea className="h-64">
                {isLoadingEmpresas ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  </div>
                ) : filteredEmpresas.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {filteredEmpresas.map(empresa => (
                      <button
                        key={empresa.id}
                        type="button"
                        onClick={() => handleSelectEmpresa(empresa)}
                        className={`w-full px-4 py-3 text-left transition-colors ${
                          selectedEmpresa?.id === empresa.id
                            ? 'bg-blue-50 border-l-2 border-l-blue-600'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <p className="font-medium text-slate-900">{empresa.nombre}</p>
                        {empresa.nif && (
                          <p className="text-xs text-slate-500">{empresa.nif}</p>
                        )}
                        {empresa.ciudad && (
                          <p className="text-xs text-slate-400">{empresa.ciudad}</p>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-xs text-slate-400">No se encontraron empresas</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <p className="text-xs text-slate-500">
                Escribe al menos 2 caracteres para buscar empresas
              </p>
            </div>
          )}

          {/* Resumen selección */}
          {selectedEmpresa && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
              <p className="text-xs text-blue-700">
                Seleccionado: <span className="font-semibold">{selectedEmpresa.nombre}</span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleAsociar}
            disabled={!selectedEmpresa || isLoading}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Asociar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
