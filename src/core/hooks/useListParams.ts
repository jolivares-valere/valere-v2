import { useRef, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Estado de lista en la URL (PR-2.1, semana 2 "listas que trabajan").
 *
 * Fuente única del patrón búsqueda + filtros + orden + página compartibles
 * por URL, extraído de EmpresasPage (el más maduro). Convenciones de params:
 *   q     → búsqueda de texto (debounce 300ms vía setSearch)
 *   sort  → campo de orden (validado contra sortFields; inválido → default)
 *   dir   → 'asc' | 'desc'
 *   page  → página 1-based
 *   resto → filtros libres vía getFilter/updateParam ('tipo', 'estado'…)
 *
 * Cualquier cambio de búsqueda/filtro/orden resetea a página 1 (regla de
 * Empresas, ahora global). La URL resultante es compartible: abrirla
 * reproduce exactamente la misma vista.
 */
export interface UseListParamsOptions<F extends string> {
  /** Campos ordenables permitidos (whitelist; lo demás cae al default). */
  sortFields: readonly F[]
  /** Campo de orden por defecto si la URL no trae uno válido. */
  defaultSort: F
  /** Dirección por defecto (Empresas: 'desc' por created_at). */
  defaultDir?: 'asc' | 'desc'
  /**
   * Campos que al activarse ordenan descendente primero (fechas: lo más
   * reciente arriba). El resto empieza ascendente (texto).
   */
  descFirstFields?: readonly F[]
}

export interface ListParams<F extends string> {
  page: number
  search: string
  sortField: F
  sortDir: 'asc' | 'desc'
  /** Valor de un filtro libre de la URL ('' si no está). */
  getFilter: (key: string) => string
  /** Escribe un param ('' lo borra). Todo menos 'page' resetea a página 1. */
  updateParam: (key: string, value: string) => void
  /** Escribe VARIOS params a la vez ('' borra). Resetea a página 1. Para
   * acciones que tocan más de un filtro en el mismo clic (KPIs clicables,
   * PR-2.4): dos updateParam seguidos se pisarían entre sí. */
  updateParams: (entries: Record<string, string>) => void
  /** Búsqueda con debounce 300ms sobre el param 'q'. */
  setSearch: (value: string) => void
  /** Alterna orden: mismo campo invierte dirección; campo nuevo, dirección inicial. */
  toggleSort: (field: F) => void
  /** Limpia todos los params de la lista (vuelve a la vista por defecto). */
  clearAll: () => void
}

export default function useListParams<F extends string>(
  options: UseListParamsOptions<F>,
): ListParams<F> {
  const { sortFields, defaultSort, defaultDir = 'desc', descFirstFields = [] } = options
  const [params, setParams] = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cancelar el debounce pendiente al desmontar (no escribir en una URL muerta).
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)
  const search = params.get('q') ?? ''

  const sortParam = params.get('sort') ?? ''
  const sortField: F = (sortFields as readonly string[]).includes(sortParam)
    ? (sortParam as F)
    : defaultSort

  const dirParam = params.get('dir')
  const sortDir: 'asc' | 'desc' =
    dirParam === 'asc' || dirParam === 'desc' ? dirParam : defaultDir

  const getFilter = useCallback((key: string) => params.get(key) ?? '', [params])

  const updateParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'page') next.set('page', '1')
      setParams(next)
    },
    [params, setParams],
  )

  const updateParams = useCallback(
    (entries: Record<string, string>) => {
      const next = new URLSearchParams(params)
      for (const [key, value] of Object.entries(entries)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      next.set('page', '1')
      setParams(next)
    },
    [params, setParams],
  )

  const setSearch = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => updateParam('q', value), 300)
    },
    [updateParam],
  )

  const toggleSort = useCallback(
    (field: F) => {
      const next = new URLSearchParams(params)
      if (sortField === field) {
        next.set('dir', sortDir === 'asc' ? 'desc' : 'asc')
      } else {
        next.set('sort', field)
        next.set('dir', (descFirstFields as readonly string[]).includes(field) ? 'desc' : 'asc')
      }
      next.set('page', '1')
      setParams(next)
    },
    [params, setParams, sortField, sortDir, descFirstFields],
  )

  const clearAll = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setParams(new URLSearchParams())
  }, [setParams])

  return { page, search, sortField, sortDir, getFilter, updateParam, updateParams, setSearch, toggleSort, clearAll }
}
