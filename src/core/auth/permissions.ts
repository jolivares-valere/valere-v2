/**
 * Capa A — permisos por función
 *
 * Whitelist de rutas accesibles por función. El AuthGuard usa esto para
 * decidir si el user puede acceder a una ruta o redirigirlo a su default.
 *
 * Se aplica solo a usuarios con role !== 'master' AND no tener 'admin' en funciones.
 * Master/admin pueden todo.
 *
 * Origen: docs/SPRINT_OPERATIVO_CAPTACION_2026-05-04.md
 */

/** Ruta principal a la que redirigir si la función no permite la ruta actual */
export const FUNCION_RUTAS_DEFAULT: Record<string, string> = {
  telemarketing: '/captacion',
  analista: '/analisis-captacion',
  asesor_senior: '/cartera-senior',
  admin: '/dashboard',
}

/**
 * Patrones de rutas permitidas por función. Una ruta es accesible si CUALQUIERA
 * de las funciones del user incluye un patrón que matchea la ruta actual.
 *
 * Rutas siempre permitidas (login, signup, pending) están en COMUNES.
 */
export const RUTAS_COMUNES: RegExp[] = [
  /^\/login$/,
  /^\/signup$/,
  /^\/pending-approval$/,
]

export const FUNCION_RUTAS_PERMITIDAS: Record<string, RegExp[]> = {
  telemarketing: [
    /^\/captacion(\/|$)/,
    /^\/$/,
  ],
  analista: [
    /^\/analisis-captacion(\/|$)/,
    /^\/empresas\/[^/]+$/, // detalle empresa solo lectura
    /^\/$/,
  ],
  asesor_senior: [
    /^\/cartera-senior(\/|$)/,
    /^\/buscador-cups(\/|$)/,
    /^\/empresas(\/|$)/,
    /^\/suministros(\/|$)/,
    /^\/contactos(\/|$)/,
    /^\/contratos(\/|$)/,
    /^\/oportunidades(\/|$)/,
    /^\/dashboard$/,
    /^\/calendario$/,
    /^\/actividades$/,
    /^\/$/,
  ],
  admin: [/.*/], // sin restricciones
}

/**
 * Devuelve true si el user (con sus funciones) puede acceder a la ruta dada.
 * Si tiene 'admin' en funciones o role 'master', permite todo.
 */
export function puedeAccederRuta(
  ruta: string,
  funciones: string[] | null | undefined,
  role: string | null | undefined,
): boolean {
  // Master o admin: acceso total
  if (role === 'master' || (funciones ?? []).includes('admin')) {
    return true
  }

  // Rutas comunes (login/signup/pending) siempre OK
  if (RUTAS_COMUNES.some(rgx => rgx.test(ruta))) {
    return true
  }

  // Ruta permitida si CUALQUIERA de sus funciones la incluye
  for (const f of funciones ?? []) {
    const patrones = FUNCION_RUTAS_PERMITIDAS[f]
    if (patrones && patrones.some(rgx => rgx.test(ruta))) {
      return true
    }
  }

  return false
}

/**
 * Devuelve la ruta por defecto a la que redirigir cuando la actual no es accesible.
 * Toma la primera función conocida; si no hay ninguna, manda a /pending-approval.
 */
export function rutaDefaultSegunFunciones(
  funciones: string[] | null | undefined,
  role: string | null | undefined,
): string {
  if (role === 'master') return '/dashboard'
  for (const f of funciones ?? []) {
    if (FUNCION_RUTAS_DEFAULT[f]) return FUNCION_RUTAS_DEFAULT[f]!
  }
  return '/pending-approval'
}
