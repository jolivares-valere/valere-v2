import { supabase } from '@/core/supabase/client';
import {
  generateEmail1_Autorizacion,
  generateEmail2_Confirmacion,
  generateEmailAsesor_CambioEstado,
  type EmailClienteAutorizacionData,
  type EmailClienteConfirmacionData,
  type EmailAsesorNotificacionData,
} from './email-templates';
import { saveDocumentToClientFolder } from '@/features/potencias/lib/client-docs';

const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

/**
 * Envia un email via la serverless function /api/send-email
 */
export interface EmailAttachment {
  filename: string;
  content: string; // base64
  content_type?: string;
}

async function sendEmail(params: {
  to: string;
  cc?: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    // En desarrollo local la API serverless no existe
    if (!response.ok && response.status === 404) {
      if (IS_DEV) {
        console.log('[EMAIL DEV - no serverless]', params.subject, '→', params.to);
        return { success: true, messageId: 'dev-' + Date.now() };
      }
      return { success: false, error: 'API de email no disponible (404)' };
    }

    // Respuesta HTML en vez de JSON = rewrite incorrecto
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      if (IS_DEV) {
        console.log('[EMAIL DEV - no JSON response]', params.subject, '→', params.to);
        return { success: true, messageId: 'dev-' + Date.now() };
      }
      return { success: false, error: 'La API de email no respondio correctamente' };
    }

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || JSON.stringify(data) };
    }

    return { success: true, messageId: data.messageId };
  } catch (error: any) {
    if (IS_DEV) {
      console.log('[EMAIL DEV - error]', params.subject, '→', params.to, error.message);
      return { success: true, messageId: 'dev-' + Date.now() };
    }
    return { success: false, error: 'Error enviando email: ' + error.message };
  }
}

/**
 * Registra la comunicacion en la base de datos
 */
async function logCommunication(params: {
  empresa_id: string;
  expediente_id?: string;
  ciclo_id?: string;
  tipo: 'email1_prevision' | 'email2_ahorro_real' | 'libre';
  asunto: string;
  cuerpo_html: string;
  destinatario_email: string;
  cc_email?: string;
  enviado_por?: string;
  resend_message_id?: string;
  estado: 'enviado' | 'error';
  error_detalle?: string;
}) {
  await supabase.from('comunicaciones_cliente').insert({
    ...params,
    fecha_envio: new Date().toISOString(),
  });
}

/**
 * Envia un email con los datos posiblemente editados por el usuario desde el dialog.
 * Registra la comunicacion en la base de datos.
 */
export async function sendEditableEmail(params: {
  to: string;
  cc: string;
  subject: string;
  html: string;
  clientId: string;
  expedienteId: string;
  cicloId: string;
  userId: string;
  tipo: 'email1_prevision' | 'email2_ahorro_real' | 'libre';
  attachments?: EmailAttachment[];
}): Promise<{ success: boolean; error?: string }> {
  const result = await sendEmail({
    to: params.to,
    cc: params.cc || undefined,
    subject: params.subject,
    html: params.html,
    attachments: params.attachments,
  });

  await logCommunication({
    empresa_id: params.clientId,
    expediente_id: params.expedienteId,
    ciclo_id: params.cicloId,
    tipo: params.tipo,
    asunto: params.subject,
    cuerpo_html: params.html,
    destinatario_email: params.to,
    cc_email: params.cc || undefined,
    enviado_por: params.userId,
    resend_message_id: result.messageId,
    estado: result.success ? 'enviado' : 'error',
    error_detalle: result.error,
  });

  // Auto-guardar copia del email en la carpeta del cliente
  if (result.success && params.clientId) {
    const tipoLabel = params.tipo === 'email1_prevision'
      ? 'Solicitud de autorizacion'
      : params.tipo === 'email2_ahorro_real'
      ? 'Confirmacion de ahorro'
      : 'Email';
    const fecha = new Date().toLocaleDateString('es-ES');

    saveDocumentToClientFolder({
      clientId: params.clientId,
      tipo: 'email_enviado',
      nombre: `${tipoLabel} - ${fecha} - ${params.subject}`,
      contenidoHtml: params.html,
      expedienteId: params.expedienteId,
      cicloId: params.cicloId,
      userId: params.userId,
      metadata: {
        destinatario: params.to,
        cc: params.cc,
        asunto: params.subject,
        fecha_envio: new Date().toISOString(),
        tipo_email: params.tipo,
      },
    }).catch(err => console.error('Error guardando copia del email en carpeta cliente:', err));
  }

  return result;
}

/**
 * Envia notificacion al asesor cuando cambia el estado de un expediente
 * Esta se envia automaticamente sin preview ni edicion
 */
export async function sendEmailAsesor_Notificacion(
  data: EmailAsesorNotificacionData,
  asesorEmail: string
): Promise<{ success: boolean; error?: string }> {
  const { subject, html } = generateEmailAsesor_CambioEstado(data);

  const result = await sendEmail({
    to: asesorEmail,
    subject,
    html,
  });

  return result;
}

// Re-export template generators for use in ExpedienteDetailPage
export { generateEmail1_Autorizacion, generateEmail2_Confirmacion };
