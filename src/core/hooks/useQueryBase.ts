import type { QueryOptions } from '../types/api'

export function buildQueryKey(resource: string, options?: QueryOptions): unknown[] {
  if (!options) return [resource]
  return [resource, options]
}
