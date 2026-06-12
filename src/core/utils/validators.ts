/**
 * Validadores españoles para identificadores fiscales y CUPS.
 *
 * - NIF (DNI personal): 8 dígitos + letra de control.
 * - NIE: X/Y/Z + 7 dígitos + letra de control.
 * - CIF: letra inicial + 7 dígitos + carácter de control (dígito o letra).
 * - CUPS: ES + 16 dígitos + 2 letras + 0/1/2 caracteres opcionales (extensión).
 *   Incluye dígito de control de 16+2 caracteres (algoritmo módulo 23).
 * - Teléfono ES: 9 dígitos comenzando por 6/7/8/9, opcionalmente con +34.
 * - Email: validación pragmática (no RFC 5321 completa) suficiente para CRM.
 *
 * Todas las funciones devuelven `boolean`. Aceptan null/undefined/strings vacías
 * → `false` (porque el campo "vacío" es opcional de cara al schema zod, NO
 * inválido — eso lo controla el `.optional()`).
 *
 * Sprint domingo 2026-06-12 — pulido módulos CRM.
 */

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'

/**
 * NIF (DNI español de persona física). Formato: 8 dígitos + letra de control.
 * Algoritmo: letra = DNI_LETTERS[numero mod 23].
 */
export function validateNIF(value: string | null | undefined): boolean {
  if (!value) return false
  const v = value.replace(/[\s-]/g, '').toUpperCase()
  if (!/^\d{8}[A-Z]$/.test(v)) return false
  const num = parseInt(v.slice(0, 8), 10)
  const letter = v[8]
  return DNI_LETTERS[num % 23] === letter
}

/**
 * NIE — extranjeros. Empieza por X/Y/Z, le siguen 7 dígitos y letra.
 * Para el cálculo, X=0, Y=1, Z=2 (es decir, se sustituye y se evalúa como NIF de 8 dígitos).
 */
export function validateNIE(value: string | null | undefined): boolean {
  if (!value) return false
  const v = value.replace(/[\s-]/g, '').toUpperCase()
  if (!/^[XYZ]\d{7}[A-Z]$/.test(v)) return false
  const prefix = { X: '0', Y: '1', Z: '2' }[v[0] as 'X' | 'Y' | 'Z']
  const num = parseInt(prefix + v.slice(1, 8), 10)
  return DNI_LETTERS[num % 23] === v[8]
}

/**
 * CIF (entidad jurídica). Letra inicial entre [A-W] (excepto LL y CH),
 * 7 dígitos, y carácter de control (dígito o letra dependiendo de la letra inicial).
 *
 * Algoritmo simplificado (BOE oficial):
 *   - Suma A = suma de las cifras en posición par (2,4,6).
 *   - Suma B = suma de las cifras en posición impar (1,3,5,7) tras duplicar cada una y
 *     sumar sus dos dígitos si > 9.
 *   - Total = A + B; dígito control = (10 - (Total mod 10)) mod 10.
 *   - Si la letra inicial es P, Q, R, S, N, W → control debe ser letra
 *     (JABCDEFGHI[control]). Si es A/B/E/H → control debe ser dígito.
 *     Si es C/D/F/G/J/L/M/U/V → cualquiera de los dos vale.
 */
export function validateCIF(value: string | null | undefined): boolean {
  if (!value) return false
  const v = value.replace(/[\s-]/g, '').toUpperCase()
  if (!/^[ABCDEFGHJKLMNPQRSUVW]\d{7}[0-9A-J]$/.test(v)) return false
  const letter = v[0]
  const middle = v.slice(1, 8)
  const control = v[8]

  let sumPar = 0
  let sumImpar = 0
  for (let i = 0; i < 7; i++) {
    const digit = parseInt(middle[i], 10)
    if ((i + 1) % 2 === 0) {
      // posición par (índices 1, 3, 5 → posición 2, 4, 6 de la cadena de 7 dígitos)
      sumPar += digit
    } else {
      const doubled = digit * 2
      sumImpar += doubled > 9 ? Math.floor(doubled / 10) + (doubled % 10) : doubled
    }
  }
  const total = sumPar + sumImpar
  const expected = (10 - (total % 10)) % 10
  const controlLetterMap = 'JABCDEFGHI'
  const expectedLetter = controlLetterMap[expected]

  const lettersOnly = ['P', 'Q', 'R', 'S', 'N', 'W']
  const digitsOnly = ['A', 'B', 'E', 'H']

  if (lettersOnly.includes(letter)) return control === expectedLetter
  if (digitsOnly.includes(letter)) return control === String(expected)
  return control === String(expected) || control === expectedLetter
}

/**
 * Documento fiscal español: acepta NIF, NIE o CIF.
 * Útil para campos `empresas.nif` que pueden contener cualquiera de los tres.
 */
export function validateDocumentoFiscal(value: string | null | undefined): boolean {
  return validateNIF(value) || validateNIE(value) || validateCIF(value)
}

/**
 * CUPS — 20 o 22 caracteres. Formato: ES + 16 dígitos + 2 letras (control) + ext opcional (0-2 chars).
 *
 * Algoritmo dígito control (Resolución de 14 dic 2006):
 *   - Tomar los 16 dígitos centrales como número N.
 *   - C = N mod 529.
 *   - C1 = floor(C / 23), C2 = C mod 23.
 *   - Letras = LETRAS[C1] + LETRAS[C2] con LETRAS = "TRWAGMYFPDXBNJZSQVHLCKE".
 */
const CUPS_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'

export function validateCUPS(value: string | null | undefined): boolean {
  if (!value) return false
  const v = value.replace(/\s+/g, '').toUpperCase()
  if (!/^ES\d{16}[A-Z]{2}([A-Z0-9]{0,2})?$/.test(v)) return false
  const digits = v.slice(2, 18)
  const letters = v.slice(18, 20)
  const num = parseInt(digits, 10)
  if (Number.isNaN(num)) return false
  const c = num % 529
  const c1 = Math.floor(c / 23)
  const c2 = c % 23
  return CUPS_LETTERS[c1] === letters[0] && CUPS_LETTERS[c2] === letters[1]
}

/**
 * Teléfono ES. Acepta:
 *   - 9 dígitos empezando por 6/7/8/9.
 *   - Opcional prefijo +34 / 0034 / 34 con/sin espacio.
 *   - Espacios y guiones se permiten y se ignoran.
 */
export function validateTelefonoES(value: string | null | undefined): boolean {
  if (!value) return false
  const v = value.replace(/[\s.\-()]/g, '')
  return /^(?:\+?34|0034)?[6-9]\d{8}$/.test(v)
}

/**
 * Email — validación pragmática (no RFC 5321 completa).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateEmail(value: string | null | undefined): boolean {
  if (!value) return false
  return EMAIL_RE.test(value.trim())
}

/**
 * Código postal ES — 5 dígitos, primer par 01-52.
 */
export function validateCP(value: string | null | undefined): boolean {
  if (!value) return false
  const v = value.replace(/\s/g, '')
  if (!/^\d{5}$/.test(v)) return false
  const prov = parseInt(v.slice(0, 2), 10)
  return prov >= 1 && prov <= 52
}
