import { useEffect, useState } from 'react';
import { supabase } from '@/core/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Mail, Loader2, CheckCircle2, AlertTriangle, Send, Eye, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { loadPresentacionForClient, type ClientPresentacionResult } from '@/features/potencias/lib/presentacion';
import { generateEmailPresentacion } from '@/core/email/email-templates';
import { sendEditableEmail } from '@/core/email/email-sender';
import { generateSignature, getAsesorData } from '@/core/email/email-signatures';
import { formatEUR } from '@/core/energia/savings_potencias';
import { generatePresentacionPdfBytes } from '@/core/pdf/presentacion-pdf';
import { saveBinaryDocumentToClientFolder } from '@/features/potencias/lib/client-docs';
import type { RegulatedRate } from '@/core/types/entities';

interface Props {
  open: boolean;
  onClose: () => void;
  clientIds: string[];
  userId: string;
  userProfile: { email: string; nombre: string; apellidos: string } | null;
  onDone: () => void;
}

type RowStatus = 'pending' | 'loading' | 'ready' | 'skipped' | 'sent' | 'error';

interface PresentacionRow {
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  asesorEmail?: string;
  numCups?: number;
  ahorroTotal?: number;
  status: RowStatus;
  skipReason?: 'no_email' | 'no_expedientes' | 'sin_bajadas';
  error?: string;
  result?: ClientPresentacionResult;
}

export default function SendPresentationDialog({
  open, onClose, clientIds, userId, userProfile, onDone,
}: Props) {
  const [rows, setRows] = useState<PresentacionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [ccAsesor, setCcAsesor] = useState(true);
  const [sending, setSending] = useState(false);
  const [customBody, setCustomBody] = useState('');
  const [useCustomBody, setUseCustomBody] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [rates, setRates] = useState<RegulatedRate[]>([]);
  const [adjuntarPdf, setAdjuntarPdf] = useState(true);
  const [guardarEnCliente, setGuardarEnCliente] = useState(true);

  useEffect(() => {
    if (!open) return;
    loadAll();
  }, [open, clientIds.join(',')]);

  async function loadAll() {
    setLoading(true);

    // Cargar tarifas reguladas una sola vez
    const { data: ratesData } = await supabase.from('precios_regulados_boe').select('*');
    const allRates = ratesData || [];
    setRates(allRates);

    // Firma del remitente
    const remitenteInfo = userProfile ? getAsesorData(userProfile.email) : null;
    const firmaHtml = remitenteInfo ? generateSignature(remitenteInfo) : '';
    const remitente = {
      nombre: userProfile ? `${userProfile.nombre} ${userProfile.apellidos}`.trim() : '',
      email: userProfile?.email || '',
      firmaHtml,
    };

    // Pre-cargar cada cliente
    const newRows: PresentacionRow[] = clientIds.map(id => ({ clientId: id, status: 'loading' as RowStatus }));
    setRows(newRows);

    const results = await Promise.all(
      clientIds.map(id => loadPresentacionForClient(id, allRates, remitente))
    );

    const finalRows: PresentacionRow[] = results.map((r, i) => {
      if (!r.success) {
        return {
          clientId: clientIds[i],
          status: 'skipped',
          skipReason: r.skipReason,
        };
      }
      return {
        clientId: clientIds[i],
        clientName: r.data!.nombre_cliente,
        clientEmail: r.clientEmail,
        asesorEmail: r.asesorEmail,
        numCups: r.data!.expedientes.length,
        ahorroTotal: r.data!.ahorro_total_global,
        status: 'ready',
        result: r,
      };
    });

    setRows(finalRows);
    setLoading(false);
  }

  function previewFirst() {
    const firstReady = rows.find(r => r.status === 'ready' && r.result?.data);
    if (!firstReady) { toast.error('No hay ningun destinatario listo'); return; }
    const data = { ...firstReady.result!.data!, cuerpo_personalizado: useCustomBody ? customBody : undefined };
    const { html } = generateEmailPresentacion(data);
    setPreviewHtml(html);
  }

  async function previewPdf() {
    const firstReady = rows.find(r => r.status === 'ready' && r.result?.data);
    if (!firstReady) { toast.error('No hay ningun destinatario listo'); return; }
    const data = { ...firstReady.result!.data!, cuerpo_personalizado: useCustomBody ? customBody : undefined };
    try {
      const { bytes } = await generatePresentacionPdfBytes(data);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e: any) {
      toast.error('Error generando PDF: ' + (e.message || ''));
    }
  }

  async function handleSendAll() {
    const readyRows = rows.filter(r => r.status === 'ready');
    if (readyRows.length === 0) { toast.error('No hay destinatarios listos'); return; }

    setSending(true);
    const updated = [...rows];

    for (let i = 0; i < updated.length; i++) {
      const row = updated[i];
      if (row.status !== 'ready' || !row.result?.data || !row.clientEmail) continue;

      const data = { ...row.result.data, cuerpo_personalizado: useCustomBody ? customBody : undefined };
      const { subject, html } = generateEmailPresentacion(data);

      // Generar PDF de presentacion (si procede)
      let pdfAttachment: { filename: string; content: string; content_type: string } | undefined;
      let pdfBytes: Uint8Array | null = null;
      let pdfFileName = '';

      if (adjuntarPdf || guardarEnCliente) {
        try {
          const pdfResult = await generatePresentacionPdfBytes(data);
          pdfBytes = pdfResult.bytes;
          pdfFileName = pdfResult.fileName;
          if (adjuntarPdf) {
            pdfAttachment = {
              filename: pdfResult.fileName,
              content: pdfResult.base64,
              content_type: 'application/pdf',
            };
          }
        } catch (e: any) {
          console.error('Error generando PDF de presentacion:', e);
          // No bloqueamos el envio si falla el PDF
        }
      }

      const result = await sendEditableEmail({
        to: row.clientEmail,
        cc: ccAsesor && row.asesorEmail ? row.asesorEmail : '',
        subject,
        html,
        clientId: row.clientId,
        expedienteId: '', // presentacion es a nivel cliente, no expediente concreto
        cicloId: '',
        userId,
        tipo: 'libre',
        attachments: pdfAttachment ? [pdfAttachment] : undefined,
      });

      // Guardar copia del PDF en la carpeta del cliente
      if (result.success && guardarEnCliente && pdfBytes) {
        try {
          await saveBinaryDocumentToClientFolder({
            clientId: row.clientId,
            tipo: 'otro',
            nombre: `Propuesta de optimizacion - ${row.clientName}`,
            fileName: pdfFileName,
            bytes: pdfBytes,
            contentType: 'application/pdf',
            userId,
            metadata: {
              tipo_documento: 'propuesta_presentacion',
              fecha_envio: new Date().toISOString(),
              destinatario: row.clientEmail,
              num_cups: row.numCups,
              ahorro_total: row.ahorroTotal,
            },
          });
        } catch (e: any) {
          console.error('Error guardando PDF en carpeta cliente:', e);
        }
      }

      updated[i] = {
        ...row,
        status: result.success ? 'sent' : 'error',
        error: result.error,
      };
      setRows([...updated]);
    }

    setSending(false);
    const okCount = updated.filter(r => r.status === 'sent').length;
    const errCount = updated.filter(r => r.status === 'error').length;
    if (okCount > 0) toast.success(`${okCount} email(s) enviado(s)`);
    if (errCount > 0) toast.error(`${errCount} envio(s) fallaron`);
    if (okCount > 0) onDone();
  }

  const readyCount = rows.filter(r => r.status === 'ready').length;
  const skippedCount = rows.filter(r => r.status === 'skipped').length;
  const sentCount = rows.filter(r => r.status === 'sent').length;
  const errorCount = rows.filter(r => r.status === 'error').length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !sending && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#284e8f]">
            <Mail size={20} /> Enviar presentacion del servicio ({clientIds.length} clientes)
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-gray-500">
            <Loader2 size={24} className="animate-spin mx-auto mb-2" />
            Cargando datos de clientes y expedientes...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumen */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded"><strong>{readyCount}</strong> listos</span>
              {skippedCount > 0 && <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded"><strong>{skippedCount}</strong> se omitiran</span>}
              {sentCount > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded"><strong>{sentCount}</strong> enviados</span>}
              {errorCount > 0 && <span className="bg-red-100 text-red-700 px-2 py-1 rounded"><strong>{errorCount}</strong> con error</span>}
            </div>

            {/* Tabla destinatarios */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Cliente</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Email</th>
                    <th className="text-center px-3 py-2 text-xs font-medium text-gray-600">CUPS</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">Ahorro</th>
                    <th className="text-center px-3 py-2 text-xs font-medium text-gray-600">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.clientId} className="border-t">
                      <td className="px-3 py-1.5">{r.clientName || '—'}</td>
                      <td className="px-3 py-1.5 text-xs text-gray-500">{r.clientEmail || '—'}</td>
                      <td className="px-3 py-1.5 text-center">{r.numCups ?? '—'}</td>
                      <td className="px-3 py-1.5 text-right font-medium text-green-700">
                        {r.ahorroTotal != null ? formatEUR(r.ahorroTotal) : '—'}
                      </td>
                      <td className="px-3 py-1.5 text-center text-xs">
                        {r.status === 'loading' && <Loader2 size={14} className="animate-spin inline" />}
                        {r.status === 'ready' && <span className="text-green-700">✓ Listo</span>}
                        {r.status === 'sent' && <span className="text-blue-700">✓ Enviado</span>}
                        {r.status === 'skipped' && (
                          <span className="text-amber-700" title={r.skipReason}>
                            ⚠ {r.skipReason === 'no_email' ? 'Sin email' :
                               r.skipReason === 'no_expedientes' ? 'Sin expedientes' :
                               'Sin bajadas'}
                          </span>
                        )}
                        {r.status === 'error' && <span className="text-red-700" title={r.error}>❌ Error</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cuerpo personalizado */}
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={useCustomBody}
                  onChange={e => setUseCustomBody(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Usar cuerpo personalizado (reemplaza la introduccion por defecto; las tablas de
                  datos/ahorro y los 3 documentos requeridos se mantienen automaticamente).
                </span>
              </label>
              {useCustomBody && (
                <Textarea
                  value={customBody}
                  onChange={e => setCustomBody(e.target.value)}
                  rows={8}
                  placeholder="Escribe tu introduccion personalizada aqui..."
                />
              )}
            </div>

            <div className="space-y-1 border-t pt-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={adjuntarPdf}
                  onChange={e => setAdjuntarPdf(e.target.checked)}
                />
                <span>Adjuntar <strong>PDF de propuesta</strong> al email (con el mismo contenido, para que el cliente lo firme y selle).</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={guardarEnCliente}
                  onChange={e => setGuardarEnCliente(e.target.checked)}
                />
                <span>Guardar el PDF en la carpeta de documentos del cliente.</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={ccAsesor}
                  onChange={e => setCcAsesor(e.target.checked)}
                />
                <span>Incluir CC al asesor asignado de cada cliente.</span>
              </label>
            </div>

            {skippedCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-900">
                <p className="font-medium mb-1">⚠ {skippedCount} cliente(s) se omitiran porque:</p>
                <ul className="list-disc pl-5">
                  <li><strong>Sin email:</strong> edita el cliente y anade un email de contacto.</li>
                  <li><strong>Sin expedientes:</strong> crea primero un expediente desde Expedientes &rsaquo; Nuevo.</li>
                  <li><strong>Sin bajadas:</strong> el expediente no tiene solicitud de bajada de potencia todavia.</li>
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            {sentCount > 0 ? 'Cerrar' : 'Cancelar'}
          </Button>
          <Button variant="outline" onClick={previewFirst} disabled={loading || readyCount === 0}>
            <Eye size={14} className="mr-1" /> Previsualizar email
          </Button>
          <Button variant="outline" onClick={previewPdf} disabled={loading || readyCount === 0}>
            <FileText size={14} className="mr-1" /> Previsualizar PDF
          </Button>
          <Button onClick={handleSendAll} disabled={sending || loading || readyCount === 0}>
            {sending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Send size={14} className="mr-1" />}
            Enviar a {readyCount} cliente{readyCount !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Preview */}
      {previewHtml && (
        <Dialog open={!!previewHtml} onOpenChange={(v) => !v && setPreviewHtml(null)}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Previsualizacion del email</DialogTitle>
            </DialogHeader>
            <iframe
              srcDoc={previewHtml}
              className="w-full h-[70vh] border rounded"
              title="preview"
            />
            <DialogFooter>
              <Button onClick={() => setPreviewHtml(null)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
