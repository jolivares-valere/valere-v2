/**
 * Valere CRM · Types de capa API (TanStack Query + Supabase).
 */

export interface PaginatedResult<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
}

export interface FilterState {
  search?: string
  [key: string]: unknown
}

export interface SortState {
  field: string
  direction: 'asc' | 'desc'
}

export interface QueryOptions {
  page?: number
  pageSize?: number
  filter?: FilterState
  sort?: SortState
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
}
