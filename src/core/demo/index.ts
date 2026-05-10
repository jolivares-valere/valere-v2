/**
 * Modo DEMO — punto único de entrada.
 *
 * Activado mediante la variable de entorno VITE_DEMO_MODE=true.
 * Si está activado, el cliente Supabase devuelve un mock con datos ficticios
 * y la autenticación se cortocircuita (cualquier email/contraseña es válido).
 *
 * Diseño: ningún archivo de producción debe importar nada de aquí salvo el
 * switch en src/core/supabase/client.ts y el banner montado en main.tsx.
 *
 * Para desactivar el modo demo basta con cambiar la variable de entorno.
 * No hay efectos colaterales en producción.
 */

export const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

export const DEMO_BUILD_TIMESTAMP = new Date().toISOString()

/**
 * Email por defecto del auditor demo (rol master, ve todos los módulos).
 * El login en modo demo acepta CUALQUIER email/contraseña; se selecciona
 * el perfil cuyo email coincida con el introducido y, si no hay match,
 * se devuelve el usuario master.
 */
export const DEMO_DEFAULT_EMAIL = 'auditor@valere.demo'
export const DEMO_DEFAULT_PASSWORD = 'demo1234'

export { mockSupabase } from './mock-supabase'
