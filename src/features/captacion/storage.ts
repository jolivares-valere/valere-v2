import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'

/**
 * Storage helper para Captación.
 *
 * Convención (validada con ChatGPT 2026-05-04):
 *   - Bucket: 'documentos' (existente, privado)
 *   - Path: oportunidades/{oportunidad_id}/{categoria}/{YYYYMMDD}_{filename}
 *   - Categoría: 'facturas' o 'propuestas'
 *
 * Robustez:
 *   - Tamaño max 15 MB
 *   - Tipos aceptados: PDF, JPG, PNG
 *   - Errores con mensajes claros
 *   - Separa upload de update de oportunidad — si la transición de etapa
 *     falla, el documento queda guardado y se puede reintentar.
 */

export const MAX_FILE_BYTES = 15 * 1024 * 1024
export const ACCEPTED_MIME = ['application/pdf', 'image/jpeg', 'image/png'] as const
export const ACCEPTED_EXT_LABEL = 'PDF, JPG, PNG (máx 15 MB)'

export type CategoriaDocumento = 'facturas' | 'propuestas'

export type UploadDocumentoInput = {
  file: File
  oportunidadId: string
  empresaId: string
  categoria: CategoriaDocumento
  /** tipo en tabla documentos: 'factura' o 'oferta' (oferta = propuesta) */
  tipoDocumento: 'factura' | 'oferta'
  descripcion?: string
}

export type UploadDocumentoResult = {
  documentoId: string
  rutaStorage: string
  nombre: string
  mimeType: string
  tamanoBytes: number
}

/**
 * Validación cliente antes de subir.
 * Devuelve null si OK, o string con mensaje de error.
 */
export function validarFichero(file: File): string | null {
  if (!ACCEPTED_MIME.includes(file.type as typeof ACCEPTED_MIME[number])) {
    return `Tipo de archivo no permitido (${file.type || 'desconocido'}). Acepta: ${ACCEPTED_EXT_LABEL}`
  }
  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    return `Archivo demasiado grande (${mb} MB). Máximo 15 MB.`
  }
  if (file.size === 0) {
    return 'Archivo vacío'
  }
  return null
}

function fechaPath(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}

function sanitizarNombre(name: string): string {
  // Conserva extensión, sustituye chars problemáticos
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diacríticos
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 100)
}

/**
 * Sube fichero a Supabase Storage + crea fila en tabla `documentos`.
 * NO actualiza la oportunidad — eso es responsabilidad del caller para
 * mantener la operación resiliente (si el update falla, el documento queda
 * y se puede reintentar la transición sin reuploadear).
 */
export async function subirDocumentoOportunidad(
  input: UploadDocumentoInput,
): Promise<UploadDocumentoResult> {
  // 1. Validar
  const errorVal = validarFichero(input.file)
  if (errorVal) throw new Error(errorVal)

  // 2. Path determinístico
  const safeName = sanitizarNombre(input.file.name)
  const ruta = `oportunidades/${input.oportunidadId}/${input.categoria}/${fechaPath()}_${Date.now()}_${safeName}`

  // 3. Upload al bucket
  const { error: errUp } = await supabase.storage
    .from('documentos')
    .upload(ruta, input.file, {
      cacheControl: '3600',
      upsert: false,
      contentType: input.file.type,
    })
  if (errUp) {
    logError(errUp, 'subirDocumentoOportunidad.upload')
    throw new Error(`Error subiendo archivo: ${errUp.message}`)
  }

  // 4. Auth: subido_por
  const { data: userData } = await supabase.auth.getUser()
  const subidoPor = userData.user?.id ?? null

  // 5. INSERT en documentos
  // Cast: la tabla `documentos` puede tener columnas extra (cups_id, expediente_id, etc)
  // que no aplican aquí. Usamos .insert() sólo con lo que necesitamos.
  const { data: doc, error: errIns } = await (supabase as unknown as {
    from: (rel: string) => {
      insert: (row: Record<string, unknown>) => {
        select: (cols: string) => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> }
      }
    }
  })
    .from('documentos')
    .insert({
      nombre: safeName,
      nombre_archivo: safeName,
      nombre_original: input.file.name,
      tipo: input.tipoDocumento,
      entidad_tipo: 'oportunidad',
      entidad_id: input.oportunidadId,
      empresa_id: input.empresaId,
      ruta_storage: ruta,
      mime_type: input.file.type,
      tamano_bytes: input.file.size,
      subido_por: subidoPor,
      descripcion: input.descripcion ?? null,
    })
    .select('id')
    .single()

  if (errIns || !doc) {
    // Si falla el insert, intento limpiar el blob subido (best-effort)
    void supabase.storage.from('documentos').remove([ruta])
    logError(errIns ?? 'documento insert null', 'subirDocumentoOportunidad.insert')
    throw new Error(`Archivo subido pero no se pudo registrar en BD: ${errIns?.message ?? 'sin detalle'}`)
  }

  return {
    documentoId: doc.id,
    rutaStorage: ruta,
    nombre: safeName,
    mimeType: input.file.type,
    tamanoBytes: input.file.size,
  }
}

/**
 * Genera URL firmada (1 hora) para descargar un documento.
 */
export async function urlFirmadaDocumento(rutaStorage: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('documentos')
    .createSignedUrl(rutaStorage, 3600)
  if (error || !data) {
    logError(error, 'urlFirmadaDocumento')
    throw new Error('No se pudo generar enlace de descarga')
  }
  return data.signedUrl
}

/**
 * Carga la ruta_storage + nombre de un documento por id.
 */
export async function obtenerDocumento(documentoId: string): Promise<{ ruta_storage: string; nombre: string } | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('documentos')
    .select('ruta_storage, nombre, nombre_original')
    .eq('id', documentoId)
    .maybeSingle()
  if (error) {
    logError(error, 'obtenerDocumento')
    return null
  }
  if (!data) return null
  return {
    ruta_storage: data.ruta_storage as string,
    nombre: (data.nombre_original as string) || (data.nombre as string),
  }
}
