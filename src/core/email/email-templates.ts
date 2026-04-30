/**
 * Plantillas de email HTML para Valere Gestion de Potencias
 *
 * Email 1: Solicitud de autorizacion al cliente para iniciar el proceso
 * Email 2: Confirmacion de que el cambio se ha ejecutado
 * Notificacion al asesor: Cambio de estado en expediente
 */

// --- Estilos compartidos ---
const STYLES = {
  container: 'font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff;',
  header: 'background: #284e8f; padding: 24px 32px; text-align: center;',
  headerLogo: 'color: #ffffff; font-size: 24px; font-weight: bold; margin: 0; letter-spacing: 1px;',
  headerSub: 'color: #a3bffa; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; margin: 4px 0 0 0;',
  body: 'padding: 32px;',
  h2: 'color: #284e8f; font-size: 18px; margin: 0 0 16px 0;',
  text: 'color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;',
  table: 'width: 100%; border-collapse: collapse; margin: 16px 0;',
  th: 'background: #284e8f; color: white; padding: 8px 12px; font-size: 12px; text-align: center; font-weight: 600;',
  td: 'border: 1px solid #e5e7eb; padding: 8px 12px; font-size: 13px; text-align: center;',
  tdLabel: 'border: 1px solid #e5e7eb; padding: 8px 12px; font-size: 13px; text-align: left; font-weight: 600; color: #374151;',
  totalRow: 'background: #f0fdf4; font-weight: bold; color: #166534;',
  highlight: 'background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;',
  highlightAmount: 'font-size: 28px; font-weight: bold; color: #166534; margin: 0;',
  highlightLabel: 'font-size: 12px; color: #6b7280; margin: 4px 0 0 0;',
  footer: 'background: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb;',
  footerText: 'color: #9ca3af; font-size: 11px; line-height: 1.5; margin: 0;',
  badge: 'display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600;',
  divider: 'border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;',
};

// --- Interfaces ---
export interface EmailClienteAutorizacionData {
  nombre_cliente: string;
  cups: string;
  direccion_suministro: string;
  tarifa: string;
  fecha_prevista_inicio: string;
  fecha_prevista_fin: string;
  potencias_actuales: { p1: number; p2: number; p3: number; p4: number; p5: number; p6: number };
  potencias_nuevas: { p1: number; p2: number; p3: number; p4: number; p5: number };
  ahorro_previsto: { p1: number; p2: number; p3: number; p4: number; p5: number; total: number };
  dias_previstos: number;
  // Firma: datos del remitente (quien envia el email, no necesariamente el asesor)
  nombre_remitente: string;
  email_remitente: string;
  firma_html: string; // firma corporativa HTML completa del remitente
}

export interface EmailClienteConfirmacionData {
  nombre_cliente: string;
  cups: string;
  tarifa: string;
  fecha_inicio_real: string;
  fecha_fin_real: string;
  dias_reales: number;
  ahorro_real: { p1: number; p2: number; p3: number; p4: number; p5: number; total: number };
  ahorro_previsto_total: number;
  nombre_remitente: string;
  email_remitente: string;
  firma_html: string;
}

export interface EmailAsesorNotificacionData {
  nombre_asesor: string;
  nombre_cliente: string;
  cups: string;
  tarifa: string;
  estado_anterior: string;
  estado_nuevo: string;
  tipo_solicitud: string;
  fecha_cambio: string;
  cambiado_por: string;
}

// --- Helpers ---
function formatEUR(amount: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
}

function wrapEmail(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f3f4f6;">
  <div style="${STYLES.container}">
    <!-- Header -->
    <div style="${STYLES.header}">
      <p style="${STYLES.headerLogo}">Valere</p>
      <p style="${STYLES.headerSub}">Consultores</p>
    </div>
    <!-- Body -->
    <div style="${STYLES.body}">
      ${content}
    </div>
    <!-- Footer -->
    <div style="${STYLES.footer}">
      <p style="${STYLES.footerText}">
        Valere Consultores Asociados SL<br>
        Sevilla, Espana<br>
        soporte@valereconsultores.com
      </p>
      <p style="${STYLES.footerText}; margin-top: 8px;">
        Este email ha sido generado automaticamente por el sistema de gestion de potencias de Valere Consultores.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function potenciasTable(
  actuales: { p1: number; p2: number; p3: number; p4: number; p5: number; p6: number },
  nuevas: { p1: number; p2: number; p3: number; p4: number; p5: number }
): string {
  const periods = ['P1', 'P2', 'P3', 'P4', 'P5'];
  const actValues = [actuales.p1, actuales.p2, actuales.p3, actuales.p4, actuales.p5];
  const newValues = [nuevas.p1, nuevas.p2, nuevas.p3, nuevas.p4, nuevas.p5];

  return `<table style="${STYLES.table}">
    <tr>
      <th style="${STYLES.th}"></th>
      ${periods.map(p => `<th style="${STYLES.th}">${p}</th>`).join('')}
      <th style="${STYLES.th}; background: #92400e;">P6</th>
    </tr>
    <tr>
      <td style="${STYLES.tdLabel}">Actual</td>
      ${actValues.map(v => `<td style="${STYLES.td}">${v} kW</td>`).join('')}
      <td style="${STYLES.td}; color: #92400e; font-style: italic;">${actuales.p6} kW</td>
    </tr>
    <tr>
      <td style="${STYLES.tdLabel}">Propuesta</td>
      ${newValues.map((v, i) => {
        const diff = actValues[i] - v;
        const color = diff > 0 ? '#166534' : diff < 0 ? '#991b1b' : '#374151';
        return `<td style="${STYLES.td}; color: ${color}; font-weight: bold;">${v} kW</td>`;
      }).join('')}
      <td style="${STYLES.td}; color: #92400e; font-style: italic;">No cambia</td>
    </tr>
    <tr>
      <td style="${STYLES.tdLabel}">Diferencia</td>
      ${newValues.map((v, i) => {
        const diff = actValues[i] - v;
        const sign = diff > 0 ? '-' : '+';
        const color = diff > 0 ? '#166534' : diff < 0 ? '#991b1b' : '#6b7280';
        return `<td style="${STYLES.td}; color: ${color};">${diff !== 0 ? sign + Math.abs(diff) + ' kW' : '—'}</td>`;
      }).join('')}
      <td style="${STYLES.td}; color: #6b7280;">—</td>
    </tr>
  </table>`;
}

function ahorroTable(ahorro: { p1: number; p2: number; p3: number; p4: number; p5: number; total: number }): string {
  const periods = ['P1', 'P2', 'P3', 'P4', 'P5'];
  const values = [ahorro.p1, ahorro.p2, ahorro.p3, ahorro.p4, ahorro.p5];

  return `<table style="${STYLES.table}">
    <tr>
      ${periods.map(p => `<th style="${STYLES.th}">${p}</th>`).join('')}
      <th style="${STYLES.th}; background: #166534;">TOTAL</th>
    </tr>
    <tr>
      ${values.map(v => `<td style="${STYLES.td}; color: #166534;">${formatEUR(v)}</td>`).join('')}
      <td style="${STYLES.td}; ${STYLES.totalRow}">${formatEUR(ahorro.total)}</td>
    </tr>
  </table>`;
}

// ============================================================
// EMAIL 1: Solicitud de autorizacion al cliente
// ============================================================
export function generateEmail1_Autorizacion(data: EmailClienteAutorizacionData): { subject: string; html: string } {
  const subject = `Valere Consultores — Optimizacion de potencia contratada | ${data.cups}`;

  const content = `
    <h2 style="${STYLES.h2}">Solicitud de autorizacion para optimizacion de potencia</h2>

    <p style="${STYLES.text}">Estimado/a <strong>${data.nombre_cliente}</strong>,</p>

    <p style="${STYLES.text}">
      Desde Valere Consultores hemos identificado una oportunidad de ahorro en su suministro electrico
      mediante la optimizacion temporal de las potencias contratadas, al amparo del Real Decreto-Ley 7/2026
      que permite modificaciones sin coste adicional hasta el 31 de diciembre de 2026.
    </p>

    <p style="${STYLES.text}"><strong>Datos del suministro:</strong></p>
    <ul style="${STYLES.text}">
      <li>CUPS: <code>${data.cups}</code></li>
      <li>Tarifa: ${data.tarifa}</li>
      <li>Direccion: ${data.direccion_suministro}</li>
    </ul>

    <p style="${STYLES.text}"><strong>Propuesta de cambio de potencias:</strong></p>
    ${potenciasTable(data.potencias_actuales, data.potencias_nuevas)}
    <p style="font-size: 11px; color: #6b7280; margin: 4px 0 16px 0;">* P6 no se modifica para preservar los derechos de extension de red.</p>

    <p style="${STYLES.text}"><strong>Periodo previsto:</strong> ${data.fecha_prevista_inicio} — ${data.fecha_prevista_fin} (${data.dias_previstos} dias)</p>

    <p style="${STYLES.text}"><strong>Ahorro previsto por periodo:</strong></p>
    ${ahorroTable(data.ahorro_previsto)}

    <div style="${STYLES.highlight}">
      <p style="${STYLES.highlightAmount}">${formatEUR(data.ahorro_previsto.total)}</p>
      <p style="${STYLES.highlightLabel}">Ahorro total previsto en el periodo</p>
    </div>

    <p style="${STYLES.text}">
      Le solicitamos su autorizacion para proceder con la tramitacion del cambio de potencia.
      No dude en contactar con su asesor para cualquier consulta.
    </p>

    <hr style="${STYLES.divider}">

    ${data.firma_html}
  `;

  return { subject, html: wrapEmail(content) };
}

// ============================================================
// EMAIL 2: Confirmacion de cambio ejecutado
// ============================================================
export function generateEmail2_Confirmacion(data: EmailClienteConfirmacionData): { subject: string; html: string } {
  const subject = `Valere Consultores — Cambio de potencia ejecutado | ${data.cups}`;

  const diferencia = data.ahorro_real.total - data.ahorro_previsto_total;
  const mejorPeor = diferencia >= 0 ? 'superior' : 'inferior';

  const content = `
    <h2 style="${STYLES.h2}">Confirmacion de cambio de potencia ejecutado</h2>

    <p style="${STYLES.text}">Estimado/a <strong>${data.nombre_cliente}</strong>,</p>

    <p style="${STYLES.text}">
      Le confirmamos que el proceso de optimizacion de potencia contratada para su suministro
      se ha completado satisfactoriamente.
    </p>

    <p style="${STYLES.text}"><strong>Datos del proceso:</strong></p>
    <ul style="${STYLES.text}">
      <li>CUPS: <code>${data.cups}</code></li>
      <li>Tarifa: ${data.tarifa}</li>
      <li>Periodo de bajada: ${data.fecha_inicio_real} — ${data.fecha_fin_real}</li>
      <li>Dias efectivos: <strong>${data.dias_reales} dias</strong></li>
    </ul>

    <p style="${STYLES.text}"><strong>Ahorro conseguido por periodo:</strong></p>
    ${ahorroTable(data.ahorro_real)}

    <div style="${STYLES.highlight}">
      <p style="${STYLES.highlightAmount}">${formatEUR(data.ahorro_real.total)}</p>
      <p style="${STYLES.highlightLabel}">Ahorro total conseguido</p>
    </div>

    <table style="${STYLES.table}">
      <tr>
        <th style="${STYLES.th}">Ahorro previsto</th>
        <th style="${STYLES.th}">Ahorro real</th>
        <th style="${STYLES.th}">Diferencia</th>
      </tr>
      <tr>
        <td style="${STYLES.td}">${formatEUR(data.ahorro_previsto_total)}</td>
        <td style="${STYLES.td}; font-weight: bold; color: #166534;">${formatEUR(data.ahorro_real.total)}</td>
        <td style="${STYLES.td}; color: ${diferencia >= 0 ? '#166534' : '#991b1b'};">
          ${diferencia >= 0 ? '+' : ''}${formatEUR(diferencia)} (${mejorPeor} al previsto)
        </td>
      </tr>
    </table>

    <p style="${STYLES.text}">
      La potencia contratada de su suministro ha sido restaurada a sus valores originales.
      Seguiremos monitorizando su consumo para identificar nuevas oportunidades de ahorro.
    </p>

    <hr style="${STYLES.divider}">

    ${data.firma_html}
  `;

  return { subject, html: wrapEmail(content) };
}

// ============================================================
// NOTIFICACION AL ASESOR: Cambio de estado
// ============================================================
export function generateEmailAsesor_CambioEstado(data: EmailAsesorNotificacionData): { subject: string; html: string } {
  const ESTADO_LABELS: Record<string, string> = {
    borrador: 'Borrador',
    solicitud_enviada: 'Solicitud enviada',
    autorizado: 'Autorizado',
    ejecutado: 'Ejecutado',
    cancelado: 'Cancelado',
  };

  const estadoAnterior = ESTADO_LABELS[data.estado_anterior] || data.estado_anterior;
  const estadoNuevo = ESTADO_LABELS[data.estado_nuevo] || data.estado_nuevo;

  const subject = `[Valere Potencias] ${data.nombre_cliente} — ${data.tipo_solicitud} → ${estadoNuevo}`;

  const content = `
    <h2 style="${STYLES.h2}">Cambio de estado en expediente</h2>

    <p style="${STYLES.text}">Hola <strong>${data.nombre_asesor}</strong>,</p>

    <p style="${STYLES.text}">
      Se ha producido un cambio de estado en un expediente de tu cliente:
    </p>

    <table style="${STYLES.table}">
      <tr>
        <td style="${STYLES.tdLabel}">Cliente</td>
        <td style="${STYLES.td}">${data.nombre_cliente}</td>
      </tr>
      <tr>
        <td style="${STYLES.tdLabel}">CUPS</td>
        <td style="${STYLES.td}"><code>${data.cups}</code></td>
      </tr>
      <tr>
        <td style="${STYLES.tdLabel}">Tarifa</td>
        <td style="${STYLES.td}">${data.tarifa}</td>
      </tr>
      <tr>
        <td style="${STYLES.tdLabel}">Tipo</td>
        <td style="${STYLES.td}">${data.tipo_solicitud}</td>
      </tr>
      <tr>
        <td style="${STYLES.tdLabel}">Estado anterior</td>
        <td style="${STYLES.td}">${estadoAnterior}</td>
      </tr>
      <tr>
        <td style="${STYLES.tdLabel}">Nuevo estado</td>
        <td style="${STYLES.td}; font-weight: bold; color: #284e8f;">${estadoNuevo}</td>
      </tr>
      <tr>
        <td style="${STYLES.tdLabel}">Fecha</td>
        <td style="${STYLES.td}">${data.fecha_cambio}</td>
      </tr>
      <tr>
        <td style="${STYLES.tdLabel}">Realizado por</td>
        <td style="${STYLES.td}">${data.cambiado_por}</td>
      </tr>
    </table>

    <p style="${STYLES.text}">
      Puedes consultar el detalle completo del expediente en la aplicacion de gestion.
    </p>
  `;

  return { subject, html: wrapEmail(content) };
}
