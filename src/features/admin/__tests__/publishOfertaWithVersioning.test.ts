import { describe, it } from 'vitest'

/**
 * Tests del RPC publish_oferta_with_versioning.
 *
 * Estos tests están SKIP de momento porque el RPC se prueba mejor
 * end-to-end desde la Edge Function de Fase 3 (tariffs-extract), donde
 * sí hay un cliente Supabase server-side autenticado.
 *
 * Cuando se implemente Fase 3, mover estos casos a un test de
 * integración real:
 *
 * - Caso 1: insertar primera versión → status='published', version=1.
 * - Caso 2: insertar segunda versión de la misma combinación →
 *   anterior pasa a 'superseded', nueva es version=2.
 * - Caso 3: payload con arrays numéricos → se castean correctamente.
 * - Caso 4: payload con zones=['peninsula','baleares'] → array[]
 *   correcto.
 * - Caso 5: payload sin 'zones' → default ['peninsula'].
 * - Caso 6: payload con extension_data → se guarda como jsonb.
 * - Caso 7: SECURITY DEFINER respeta RLS al insertar.
 * - Caso 8: Publicar oferta Baleares NO debe supersedir oferta
 *   Península del mismo producto/acceso (versionado por zona principal).
 * - Caso 9: Invocar el RPC con usuario sin approved=true → raise
 *   exception 'not authorized' con SQLSTATE 42501.
 */
describe.skip('publish_oferta_with_versioning (TODO Fase 3)', () => {
  it('placeholder — implementar en Fase 3', () => {
    // intencionalmente vacío
  })
})
