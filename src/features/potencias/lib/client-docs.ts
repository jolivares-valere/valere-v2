import { supabase } from '@/core/supabase/client';

/**
 * Guarda un documento generado (HTML como archivo .html) en la carpeta del cliente
 */
export async function saveDocumentToClientFolder(params: {
  clientId: string;
  tipo: 'estudio_ahorro' | 'autorizacion' | 'email_enviado' | 'factura' | 'contrato' | 'otro';
  nombre: string;
  contenidoHtml: string;
  expedienteId?: string;
  cicloId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safeNombre = params.nombre
      .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s_-]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 80);
    const fileName = `${timestamp}_${safeNombre}.html`;
    const storagePath = `client-docs/${params.clientId}/${fileName}`;

    // Crear el blob HTML con codificacion UTF-8 correcta
    const encoder = new TextEncoder();
    const utf8Bytes = encoder.encode(params.contenidoHtml);
    const htmlBlob = new Blob([utf8Bytes], { type: 'text/html; charset=utf-8' });

    // Subir a Supabase Storage con content-type UTF-8
    const { error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(storagePath, htmlBlob, {
        contentType: 'text/html; charset=utf-8',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading doc to storage:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Registrar en la tabla client_documents
    const { error: dbError } = await supabase.from('documentos').insert({
      empresa_id: params.clientId,
      tipo: params.tipo,
      nombre: params.nombre,
      descripcion: '',
      nombre_archivo: fileName,
      storage_path: storagePath,
      tamano_bytes: htmlBlob.size,
      expediente_id: params.expedienteId || null,
      ciclo_id: params.cicloId || null,
      metadata: params.metadata || {},
      subido_por: params.userId || null,
    });

    if (dbError) {
      console.error('Error saving doc record:', dbError);
      return { success: false, error: dbError.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error saving document to client folder:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Guarda un archivo binario (p.ej. PDF) en la carpeta del cliente.
 */
export async function saveBinaryDocumentToClientFolder(params: {
  clientId: string;
  tipo: 'estudio_ahorro' | 'autorizacion' | 'autorizacion_cliente' | 'autorizacion_firmada' | 'email_enviado' | 'factura' | 'contrato' | 'otro';
  nombre: string;
  fileName: string;         // nombre del archivo con extension (ej. "autorizacion_ENDESA.pdf")
  bytes: Uint8Array | ArrayBuffer;
  contentType: string;       // ej. "application/pdf"
  expedienteId?: string;
  cicloId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; docId?: string; storagePath?: string; error?: string }> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safeFile = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `client-docs/${params.clientId}/${timestamp}_${safeFile}`;

    const bytesArr = params.bytes instanceof Uint8Array ? params.bytes : new Uint8Array(params.bytes);
    const blob = new Blob([bytesArr], { type: params.contentType });

    const { error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(storagePath, blob, {
        contentType: params.contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading binary doc:', uploadError);
      return { success: false, error: uploadError.message };
    }

    const { data, error: dbError } = await supabase.from('documentos').insert({
      empresa_id: params.clientId,
      tipo: params.tipo,
      nombre: params.nombre,
      descripcion: '',
      nombre_archivo: params.fileName,
      storage_path: storagePath,
      tamano_bytes: blob.size,
      expediente_id: params.expedienteId || null,
      ciclo_id: params.cicloId || null,
      metadata: params.metadata || {},
      subido_por: params.userId || null,
    }).select('id').single();

    if (dbError) {
      console.error('Error saving binary doc record:', dbError);
      return { success: false, error: dbError.message };
    }

    return { success: true, docId: data?.id, storagePath };
  } catch (err: any) {
    console.error('Error saving binary doc:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Genera y guarda el estudio de ahorro detallado como documento HTML en la carpeta del cliente
 */
export async function saveEstudioAhorro(params: {
  clientId: string;
  clientName: string;
  cups: string;
  tarifa: string;
  potenciasActuales: { p1: number; p2: number; p3: number; p4: number; p5: number; p6: number };
  potenciasNuevas: { p1: number; p2: number; p3: number; p4: number; p5: number };
  precios: { p1: number; p2: number; p3: number; p4: number; p5: number };
  dias: number;
  fechaInicio: string;
  fechaFin: string;
  ahorroPorPeriodo: { p1: number; p2: number; p3: number; p4: number; p5: number; total: number };
  expedienteId?: string;
  cicloId?: string;
  userId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const formatEUR = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
  const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

  const periods = ['P1', 'P2', 'P3', 'P4', 'P5'];
  const actArr = [params.potenciasActuales.p1, params.potenciasActuales.p2, params.potenciasActuales.p3, params.potenciasActuales.p4, params.potenciasActuales.p5];
  const newArr = [params.potenciasNuevas.p1, params.potenciasNuevas.p2, params.potenciasNuevas.p3, params.potenciasNuevas.p4, params.potenciasNuevas.p5];
  const priceArr = [params.precios.p1, params.precios.p2, params.precios.p3, params.precios.p4, params.precios.p5];
  const ahorroArr = [params.ahorroPorPeriodo.p1, params.ahorroPorPeriodo.p2, params.ahorroPorPeriodo.p3, params.ahorroPorPeriodo.p4, params.ahorroPorPeriodo.p5];

  const rowsHtml = periods.map((p, i) => {
    const diff = actArr[i] - newArr[i];
    const diffColor = diff > 0 ? '#166534' : diff < 0 ? '#991b1b' : '#6b7280';
    return `<tr>
      <td style="border:1px solid #e5e7eb; padding:8px 12px; text-align:center; font-weight:bold; color:#284e8f;">${p}</td>
      <td style="border:1px solid #e5e7eb; padding:8px 12px; text-align:center; font-family:monospace;">${actArr[i].toFixed(2)}</td>
      <td style="border:1px solid #e5e7eb; padding:8px 12px; text-align:center; font-family:monospace; color:#166534; font-weight:bold;">${newArr[i].toFixed(2)}</td>
      <td style="border:1px solid #e5e7eb; padding:8px 12px; text-align:center; color:${diffColor}; font-weight:600;">${diff > 0 ? '-' + diff.toFixed(2) : diff === 0 ? '—' : '+' + Math.abs(diff).toFixed(2)}</td>
      <td style="border:1px solid #e5e7eb; padding:8px 12px; text-align:center; font-family:monospace; color:#6b7280;">${priceArr[i] > 0 ? priceArr[i].toFixed(6) : '—'}</td>
      <td style="border:1px solid #e5e7eb; padding:8px 12px; text-align:center;">${params.dias}</td>
      <td style="border:1px solid #e5e7eb; padding:8px 12px; text-align:right; font-weight:bold; color:#166534;">${formatEUR(ahorroArr[i])}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Estudio de Ahorro - ${params.clientName}</title></head>
<body style="margin:0; padding:0; background:#f3f4f6; font-family:Arial, Helvetica, sans-serif;">
  <div style="max-width:720px; margin:20px auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background:#284e8f; padding:24px 32px; text-align:center;">
      <p style="color:#ffffff; font-size:24px; font-weight:bold; margin:0; letter-spacing:1px;">Valere</p>
      <p style="color:#a3bffa; font-size:11px; letter-spacing:3px; text-transform:uppercase; margin:4px 0 0 0;">Consultores</p>
    </div>

    <div style="padding:32px;">
      <!-- Title -->
      <h1 style="color:#284e8f; font-size:20px; margin:0 0 4px 0;">Estudio de Ahorro por Optimizacion de Potencia</h1>
      <p style="color:#6b7280; font-size:12px; margin:0 0 24px 0;">Al amparo del Real Decreto-Ley 7/2026</p>

      <!-- Client info -->
      <table style="width:100%; margin-bottom:24px;">
        <tr>
          <td style="font-size:13px; color:#374151; padding:4px 0;"><strong>Cliente:</strong> ${params.clientName}</td>
          <td style="font-size:13px; color:#374151; padding:4px 0; text-align:right;"><strong>Fecha:</strong> ${fecha}</td>
        </tr>
        <tr>
          <td style="font-size:13px; color:#374151; padding:4px 0;"><strong>CUPS:</strong> <code style="background:#f3f4f6; padding:2px 6px; border-radius:3px;">${params.cups}</code></td>
          <td style="font-size:13px; color:#374151; padding:4px 0; text-align:right;"><strong>Tarifa:</strong> ${params.tarifa}</td>
        </tr>
        <tr>
          <td colspan="2" style="font-size:13px; color:#374151; padding:4px 0;">
            <strong>Periodo de reduccion:</strong> ${params.fechaInicio} a ${params.fechaFin} (${params.dias} dias)
          </td>
        </tr>
      </table>

      <!-- P6 note -->
      <p style="font-size:11px; color:#92400e; background:#fffbeb; padding:8px 12px; border-radius:4px; border-left:3px solid #f59e0b; margin:0 0 16px 0;">
        P6: ${params.potenciasActuales.p6.toFixed(2)} kW — No se modifica para preservar los derechos de extension de red.
      </p>

      <!-- Detailed table -->
      <h2 style="color:#284e8f; font-size:14px; margin:0 0 8px 0;">Desglose de ahorro por periodo</h2>
      <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
        <thead>
          <tr>
            <th style="background:#284e8f; color:white; padding:10px 12px; font-size:11px; text-align:center;">Periodo</th>
            <th style="background:#284e8f; color:white; padding:10px 12px; font-size:11px; text-align:center;">P. Actual (kW)</th>
            <th style="background:#284e8f; color:white; padding:10px 12px; font-size:11px; text-align:center;">P. Propuesta (kW)</th>
            <th style="background:#284e8f; color:white; padding:10px 12px; font-size:11px; text-align:center;">Reduccion (kW)</th>
            <th style="background:#284e8f; color:white; padding:10px 12px; font-size:11px; text-align:center;">Precio (€/kW/dia)</th>
            <th style="background:#284e8f; color:white; padding:10px 12px; font-size:11px; text-align:center;">Dias</th>
            <th style="background:#166534; color:white; padding:10px 12px; font-size:11px; text-align:center;">Ahorro (€)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr style="background:#f0fdf4;">
            <td colspan="6" style="border:1px solid #e5e7eb; padding:12px; font-weight:bold; color:#166534; text-align:center;">AHORRO TOTAL PREVISTO</td>
            <td style="border:1px solid #e5e7eb; padding:12px; font-weight:bold; color:#166534; font-size:16px; text-align:right;">${formatEUR(params.ahorroPorPeriodo.total)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Formula -->
      <p style="font-size:10px; color:#9ca3af; font-style:italic; margin:0 0 24px 0;">
        Formula: Ahorro = (Potencia actual - Potencia propuesta) × Precio regulado (€/kW/dia) × Dias de reduccion
      </p>

      <!-- Highlight box -->
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:24px; text-align:center; margin-bottom:24px;">
        <p style="font-size:36px; font-weight:bold; color:#166534; margin:0;">${formatEUR(params.ahorroPorPeriodo.total)}</p>
        <p style="font-size:13px; color:#6b7280; margin:4px 0 0 0;">Ahorro total previsto en el periodo</p>
      </div>

      <!-- Legal note -->
      <div style="background:#f9fafb; padding:16px; border-radius:6px; border:1px solid #e5e7eb;">
        <p style="font-size:11px; color:#6b7280; margin:0 0 8px 0;">
          <strong>Notas importantes:</strong>
        </p>
        <ul style="font-size:11px; color:#6b7280; margin:0; padding-left:20px;">
          <li>La potencia P6 no se modifica en ningun caso para preservar los derechos de extension de red.</li>
          <li>Los cambios de potencia no tienen coste adicional al amparo del RDL 7/2026.</li>
          <li>Las potencias se restauraran a sus valores originales antes de los periodos de mayor consumo.</li>
          <li>Los precios corresponden a las tarifas reguladas CNMC vigentes.</li>
          <li>El ahorro real puede variar en funcion de las fechas efectivas de ejecucion.</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb; padding:16px 32px; border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af; font-size:10px; margin:0;">
        Valere Consultores Asociados SL — C/ Astronomia S/N, Torre 4, Planta 1, Puerta 3, 41015 Sevilla<br>
        Documento generado automaticamente el ${fecha}. Este documento tiene caracter informativo.
      </p>
    </div>
  </div>
</body>
</html>`;

  return saveDocumentToClientFolder({
    clientId: params.clientId,
    tipo: 'estudio_ahorro',
    nombre: `Estudio de ahorro - ${params.cups} - ${params.fechaInicio}`,
    contenidoHtml: html,
    expedienteId: params.expedienteId,
    cicloId: params.cicloId,
    userId: params.userId,
    metadata: {
      cups: params.cups,
      tarifa: params.tarifa,
      dias: params.dias,
      ahorro_total: params.ahorroPorPeriodo.total,
      fecha_inicio: params.fechaInicio,
      fecha_fin: params.fechaFin,
    },
  });
}
