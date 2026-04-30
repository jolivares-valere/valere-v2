// ============================================================
// Relleno de plantillas PDF (AcroForm) del lado del cliente.
//
// Flujo tipico:
//   1) detectPdfFormFields(bytes) -> lista de campos del PDF
//   2) Para cada campo, el usuario asigna una clave del sistema (ej. cliente.nombre_fiscal)
//   3) fillPdfTemplate(bytes, mapeo, datos) -> PDF rellenado
// ============================================================
import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup } from 'pdf-lib';

/** Claves del sistema disponibles para mapear. Orden y labels se usan en la UI. */
export const SYSTEM_FIELDS: { key: string; label: string; group: string }[] = [
  // Cliente
  { key: 'cliente.nombre_fiscal', label: 'Nombre fiscal (razon social)', group: 'Cliente' },
  { key: 'cliente.cif', label: 'CIF / NIF', group: 'Cliente' },
  { key: 'cliente.persona_contacto', label: 'Persona de contacto', group: 'Cliente' },
  { key: 'cliente.email_contacto', label: 'Email de contacto', group: 'Cliente' },
  { key: 'cliente.telefono', label: 'Telefono', group: 'Cliente' },
  { key: 'cliente.direccion_fiscal', label: 'Direccion fiscal', group: 'Cliente' },
  { key: 'cliente.ciudad', label: 'Ciudad (fiscal)', group: 'Cliente' },
  { key: 'cliente.codigo_postal', label: 'Codigo postal (fiscal)', group: 'Cliente' },
  // Suministro
  { key: 'supply.cups', label: 'CUPS', group: 'Suministro' },
  { key: 'supply.denominacion', label: 'Denominacion', group: 'Suministro' },
  { key: 'supply.direccion_suministro', label: 'Direccion del suministro', group: 'Suministro' },
  { key: 'supply.ciudad_suministro', label: 'Ciudad del suministro', group: 'Suministro' },
  { key: 'supply.tariff_type', label: 'Tarifa (3.0TD / 6.1TD / 6.2TD)', group: 'Suministro' },
  { key: 'supply.distribuidora', label: 'Distribuidora', group: 'Suministro' },
  { key: 'supply.comercializadora', label: 'Comercializadora (texto)', group: 'Suministro' },
  { key: 'supply.tension_kv', label: 'Tension (kV)', group: 'Suministro' },
  // Potencias actuales
  { key: 'request.p1_actual', label: 'Potencia P1 actual (kW)', group: 'Potencias actuales' },
  { key: 'request.p2_actual', label: 'Potencia P2 actual (kW)', group: 'Potencias actuales' },
  { key: 'request.p3_actual', label: 'Potencia P3 actual (kW)', group: 'Potencias actuales' },
  { key: 'request.p4_actual', label: 'Potencia P4 actual (kW)', group: 'Potencias actuales' },
  { key: 'request.p5_actual', label: 'Potencia P5 actual (kW)', group: 'Potencias actuales' },
  { key: 'request.p6_referencia', label: 'Potencia P6 (no cambia)', group: 'Potencias actuales' },
  // Potencias nuevas
  { key: 'request.p1_nueva', label: 'Potencia P1 solicitada (kW)', group: 'Potencias solicitadas' },
  { key: 'request.p2_nueva', label: 'Potencia P2 solicitada (kW)', group: 'Potencias solicitadas' },
  { key: 'request.p3_nueva', label: 'Potencia P3 solicitada (kW)', group: 'Potencias solicitadas' },
  { key: 'request.p4_nueva', label: 'Potencia P4 solicitada (kW)', group: 'Potencias solicitadas' },
  { key: 'request.p5_nueva', label: 'Potencia P5 solicitada (kW)', group: 'Potencias solicitadas' },
  // Fechas
  { key: 'request.fecha_prevista_inicio', label: 'Fecha inicio prevista', group: 'Fechas' },
  { key: 'request.fecha_prevista_fin', label: 'Fecha fin prevista', group: 'Fechas' },
  { key: 'hoy', label: 'Fecha de hoy', group: 'Fechas' },
  { key: 'hoy_larga', label: 'Fecha de hoy (larga, ej: 17 de abril de 2026)', group: 'Fechas' },
  // Varios
  { key: 'request.tipo', label: 'Tipo (bajada / subida)', group: 'Otros' },
  { key: 'asesor.nombre_completo', label: 'Asesor / remitente (nombre completo)', group: 'Otros' },
  { key: 'asesor.email', label: 'Asesor / remitente (email)', group: 'Otros' },
];

export interface PdfFieldInfo {
  name: string;
  type: 'text' | 'checkbox' | 'dropdown' | 'radio' | 'other';
}

/** Detecta todos los campos AcroForm de un PDF. */
export async function detectPdfFormFields(bytes: ArrayBuffer | Uint8Array): Promise<PdfFieldInfo[]> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdf.getForm();
  const fields = form.getFields();
  return fields.map(f => {
    const name = f.getName();
    let type: PdfFieldInfo['type'] = 'other';
    if (f instanceof PDFTextField) type = 'text';
    else if (f instanceof PDFCheckBox) type = 'checkbox';
    else if (f instanceof PDFDropdown) type = 'dropdown';
    else if (f instanceof PDFRadioGroup) type = 'radio';
    return { name, type };
  });
}

/** Datos del sistema que se pueden volcar al PDF. */
export interface SystemData {
  cliente?: {
    nombre_fiscal?: string | null;
    cif?: string | null;
    persona_contacto?: string | null;
    email_contacto?: string | null;
    telefono?: string | null;
    direccion_fiscal?: string | null;
    ciudad?: string | null;
    codigo_postal?: string | null;
  };
  supply?: {
    cups?: string | null;
    denominacion?: string | null;
    direccion_suministro?: string | null;
    ciudad_suministro?: string | null;
    tariff_type?: string | null;
    distribuidora?: string | null;
    comercializadora?: string | null;
    tension_kv?: number | null;
  };
  request?: {
    tipo?: 'bajada' | 'subida' | null;
    p1_actual?: number | null;
    p2_actual?: number | null;
    p3_actual?: number | null;
    p4_actual?: number | null;
    p5_actual?: number | null;
    p6_referencia?: number | null;
    p1_nueva?: number | null;
    p2_nueva?: number | null;
    p3_nueva?: number | null;
    p4_nueva?: number | null;
    p5_nueva?: number | null;
    fecha_prevista_inicio?: string | null;
    fecha_prevista_fin?: string | null;
  };
  asesor?: {
    nombre_completo?: string | null;
    email?: string | null;
  };
}

/** Devuelve el valor de una clave del sistema (ej. "cliente.nombre_fiscal") en formato string. */
export function resolveSystemValue(key: string, data: SystemData): string {
  if (key === 'hoy') return new Date().toLocaleDateString('es-ES');
  if (key === 'hoy_larga') {
    const d = new Date();
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  }
  const parts = key.split('.');
  let cur: any = data;
  for (const p of parts) {
    if (cur == null) return '';
    cur = cur[p];
  }
  if (cur == null) return '';
  if (typeof cur === 'number') return cur.toString();
  if (key.includes('fecha') && typeof cur === 'string') {
    // ISO -> DD/MM/YYYY
    const m = cur.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  return String(cur);
}

export interface FilledPdfResult {
  bytes: Uint8Array;
  filled: string[];   // campos que se rellenaron con exito
  missing: string[];  // campos del mapeo que no se pudieron rellenar
}

/**
 * Rellena un PDF AcroForm con los datos del sistema segun el mapeo proporcionado.
 * @param templateBytes bytes del PDF plantilla
 * @param campos_mapeados { campo_pdf: clave_sistema }
 * @param data datos del sistema
 * @param options.flatten si true, aplana el PDF (no editable). Por defecto false.
 */
export async function fillPdfTemplate(
  templateBytes: ArrayBuffer | Uint8Array,
  campos_mapeados: Record<string, string>,
  data: SystemData,
  options: { flatten?: boolean } = {}
): Promise<FilledPdfResult> {
  const pdf = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const form = pdf.getForm();
  const filled: string[] = [];
  const missing: string[] = [];

  for (const [pdfFieldName, systemKey] of Object.entries(campos_mapeados)) {
    if (!systemKey) continue;
    const value = resolveSystemValue(systemKey, data);
    if (!value) { missing.push(pdfFieldName); continue; }

    try {
      const field = form.getField(pdfFieldName);
      if (field instanceof PDFTextField) {
        field.setText(value);
        filled.push(pdfFieldName);
      } else if (field instanceof PDFCheckBox) {
        const truthy = ['si', 'sí', 'true', '1', 'x', 'yes'].includes(value.toLowerCase());
        if (truthy) field.check(); else field.uncheck();
        filled.push(pdfFieldName);
      } else if (field instanceof PDFDropdown) {
        try { field.select(value); filled.push(pdfFieldName); }
        catch { missing.push(pdfFieldName); }
      } else {
        missing.push(pdfFieldName);
      }
    } catch {
      missing.push(pdfFieldName);
    }
  }

  if (options.flatten) {
    try { form.flatten(); } catch { /* ignorar */ }
  }

  const bytes = await pdf.save();
  return { bytes, filled, missing };
}

/**
 * Genera un HTML con la ficha de datos del cliente/suministro/solicitud
 * lista para incluir en el cuerpo del email cuando el PDF es plano.
 * El cliente lo usa como referencia para rellenar el PDF a mano.
 */
export function generateDataSheetHtml(data: SystemData, comercializadora?: string): string {
  const cliente = data.cliente || {};
  const supply = data.supply || {};
  const request = data.request || {};

  const fmt = (v: any): string => {
    if (v == null || v === '') return '—';
    if (typeof v === 'number') return v.toString();
    return String(v);
  };
  const fmtFecha = (s?: string | null): string => {
    if (!s) return '—';
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
  };

  const tarifaOriginal = supply.tariff_type || '—';

  return `
<div style="background:#f0f7ff; border:2px solid #284e8f; border-radius:8px; padding:20px; margin:16px 0; font-family:Arial, sans-serif;">
  <p style="color:#284e8f; font-size:15px; font-weight:bold; margin:0 0 6px 0;">
    📋 FICHA DE DATOS — Para rellenar el documento adjunto
  </p>
  <p style="color:#6b7280; font-size:11px; margin:0 0 16px 0;">
    Use estos datos para cumplimentar el PDF adjunto${comercializadora ? ` de ${comercializadora}` : ''}. Despues firmelo y devuelvanoslo por email.
  </p>

  <table style="width:100%; border-collapse:collapse; background:#fff; border:1px solid #dbeafe; border-radius:4px; overflow:hidden;">
    <tr><td colspan="2" style="background:#284e8f; color:#fff; padding:8px 12px; font-size:12px; font-weight:bold;">TITULAR DEL CONTRATO</td></tr>
    <tr><td style="padding:6px 12px; font-size:12px; color:#6b7280; width:40%;">Razon Social / Apellidos, Nombre</td><td style="padding:6px 12px; font-size:13px; font-weight:600; color:#111;">${fmt(cliente.nombre_fiscal)}</td></tr>
    <tr style="background:#f9fafb;"><td style="padding:6px 12px; font-size:12px; color:#6b7280;">CIF / NIF / NIE</td><td style="padding:6px 12px; font-size:13px; font-weight:600; color:#111; font-family:monospace;">${fmt(cliente.cif)}</td></tr>
    <tr><td style="padding:6px 12px; font-size:12px; color:#6b7280;">Persona de contacto</td><td style="padding:6px 12px; font-size:13px; color:#111;">${fmt(cliente.persona_contacto)}</td></tr>
    <tr style="background:#f9fafb;"><td style="padding:6px 12px; font-size:12px; color:#6b7280;">Telefono</td><td style="padding:6px 12px; font-size:13px; color:#111;">${fmt(cliente.telefono)}</td></tr>
    <tr><td style="padding:6px 12px; font-size:12px; color:#6b7280;">Email</td><td style="padding:6px 12px; font-size:13px; color:#111;">${fmt(cliente.email_contacto)}</td></tr>
    <tr style="background:#f9fafb;"><td style="padding:6px 12px; font-size:12px; color:#6b7280;">Direccion fiscal</td><td style="padding:6px 12px; font-size:13px; color:#111;">${fmt(cliente.direccion_fiscal)}</td></tr>
    <tr><td style="padding:6px 12px; font-size:12px; color:#6b7280;">Ciudad / C.P.</td><td style="padding:6px 12px; font-size:13px; color:#111;">${fmt(cliente.ciudad)} / ${fmt(cliente.codigo_postal)}</td></tr>

    <tr><td colspan="2" style="background:#284e8f; color:#fff; padding:8px 12px; font-size:12px; font-weight:bold;">PUNTO DE SUMINISTRO</td></tr>
    <tr><td style="padding:6px 12px; font-size:12px; color:#6b7280;">CUPS</td><td style="padding:6px 12px; font-size:13px; font-weight:600; color:#111; font-family:monospace;">${fmt(supply.cups)}</td></tr>
    <tr style="background:#f9fafb;"><td style="padding:6px 12px; font-size:12px; color:#6b7280;">Direccion suministro</td><td style="padding:6px 12px; font-size:13px; color:#111;">${fmt(supply.direccion_suministro)}</td></tr>
    <tr><td style="padding:6px 12px; font-size:12px; color:#6b7280;">Ciudad suministro</td><td style="padding:6px 12px; font-size:13px; color:#111;">${fmt(supply.ciudad_suministro)}</td></tr>
    <tr style="background:#f9fafb;"><td style="padding:6px 12px; font-size:12px; color:#6b7280;">Distribuidora</td><td style="padding:6px 12px; font-size:13px; color:#111;">${fmt(supply.distribuidora)}</td></tr>
    <tr><td style="padding:6px 12px; font-size:12px; color:#6b7280;">Comercializadora</td><td style="padding:6px 12px; font-size:13px; color:#111;">${fmt(supply.comercializadora)}</td></tr>

    <tr><td colspan="2" style="background:#7c3aed; color:#fff; padding:8px 12px; font-size:12px; font-weight:bold;">TARIFA Y POTENCIAS ACTUALES (marcar en el PDF)</td></tr>
    <tr><td style="padding:6px 12px; font-size:12px; color:#6b7280;">Tarifa de acceso ACTUAL</td><td style="padding:6px 12px; font-size:14px; font-weight:bold; color:#7c3aed;">${tarifaOriginal}</td></tr>
    <tr style="background:#f9fafb;">
      <td colspan="2" style="padding:10px 12px;">
        <table style="width:100%; border-collapse:collapse; text-align:center;">
          <tr>
            <td style="padding:4px; font-size:11px; color:#6b7280;">P1</td>
            <td style="padding:4px; font-size:11px; color:#6b7280;">P2</td>
            <td style="padding:4px; font-size:11px; color:#6b7280;">P3</td>
            <td style="padding:4px; font-size:11px; color:#6b7280;">P4</td>
            <td style="padding:4px; font-size:11px; color:#6b7280;">P5</td>
            <td style="padding:4px; font-size:11px; color:#6b7280;">P6</td>
          </tr>
          <tr style="font-family:monospace; font-size:14px; font-weight:bold; color:#111;">
            <td style="padding:4px; background:#fff; border:1px solid #e5e7eb;">${fmt(request.p1_actual)}</td>
            <td style="padding:4px; background:#fff; border:1px solid #e5e7eb;">${fmt(request.p2_actual)}</td>
            <td style="padding:4px; background:#fff; border:1px solid #e5e7eb;">${fmt(request.p3_actual)}</td>
            <td style="padding:4px; background:#fff; border:1px solid #e5e7eb;">${fmt(request.p4_actual)}</td>
            <td style="padding:4px; background:#fff; border:1px solid #e5e7eb;">${fmt(request.p5_actual)}</td>
            <td style="padding:4px; background:#fff; border:1px solid #e5e7eb; color:#b45309;">${fmt(request.p6_referencia)}</td>
          </tr>
          <tr><td colspan="6" style="padding:2px; font-size:10px; color:#9ca3af;">(kW por periodo)</td></tr>
        </table>
      </td>
    </tr>

    <tr><td colspan="2" style="background:#059669; color:#fff; padding:8px 12px; font-size:12px; font-weight:bold;">TARIFA Y POTENCIAS SOLICITADAS (escribir en el PDF)</td></tr>
    <tr><td style="padding:6px 12px; font-size:12px; color:#6b7280;">Tarifa de acceso SOLICITADA</td><td style="padding:6px 12px; font-size:14px; font-weight:bold; color:#059669;">${tarifaOriginal} <span style="font-size:11px; color:#6b7280; font-weight:normal;">(se mantiene)</span></td></tr>
    <tr style="background:#f9fafb;">
      <td colspan="2" style="padding:10px 12px;">
        <table style="width:100%; border-collapse:collapse; text-align:center;">
          <tr>
            <td style="padding:4px; font-size:11px; color:#6b7280;">P1</td>
            <td style="padding:4px; font-size:11px; color:#6b7280;">P2</td>
            <td style="padding:4px; font-size:11px; color:#6b7280;">P3</td>
            <td style="padding:4px; font-size:11px; color:#6b7280;">P4</td>
            <td style="padding:4px; font-size:11px; color:#6b7280;">P5</td>
            <td style="padding:4px; font-size:11px; color:#6b7280;">P6</td>
          </tr>
          <tr style="font-family:monospace; font-size:14px; font-weight:bold; color:#059669;">
            <td style="padding:4px; background:#f0fdf4; border:1px solid #bbf7d0;">${fmt(request.p1_nueva)}</td>
            <td style="padding:4px; background:#f0fdf4; border:1px solid #bbf7d0;">${fmt(request.p2_nueva)}</td>
            <td style="padding:4px; background:#f0fdf4; border:1px solid #bbf7d0;">${fmt(request.p3_nueva)}</td>
            <td style="padding:4px; background:#f0fdf4; border:1px solid #bbf7d0;">${fmt(request.p4_nueva)}</td>
            <td style="padding:4px; background:#f0fdf4; border:1px solid #bbf7d0;">${fmt(request.p5_nueva)}</td>
            <td style="padding:4px; background:#fff; border:1px solid #e5e7eb; color:#b45309;">${fmt(request.p6_referencia)} <span style="font-size:9px;">(igual)</span></td>
          </tr>
          <tr><td colspan="6" style="padding:2px; font-size:10px; color:#9ca3af;">(kW por periodo — igual que actual EXCEPTO los valores en verde)</td></tr>
        </table>
      </td>
    </tr>

    <tr><td colspan="2" style="background:#f59e0b; color:#fff; padding:8px 12px; font-size:12px; font-weight:bold;">FECHAS</td></tr>
    <tr><td style="padding:6px 12px; font-size:12px; color:#6b7280;">Fecha prevista de inicio</td><td style="padding:6px 12px; font-size:13px; color:#111;">${fmtFecha(request.fecha_prevista_inicio)}</td></tr>
    <tr style="background:#f9fafb;"><td style="padding:6px 12px; font-size:12px; color:#6b7280;">Fecha prevista de fin</td><td style="padding:6px 12px; font-size:13px; color:#111;">${fmtFecha(request.fecha_prevista_fin)}</td></tr>
  </table>

  <p style="font-size:11px; color:#6b7280; margin:12px 0 0 0; font-style:italic;">
    💡 Aviso: La potencia P6 nunca se modifica (se respeta su valor original para conservar los derechos de extension de red).
  </p>
</div>`;
}

/** Convierte un Uint8Array a base64 (para enviar por email como adjunto). */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}
