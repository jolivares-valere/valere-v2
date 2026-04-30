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
  Loader2, FileText, Download, Mail, CheckCircle2, AlertTriangle, Upload, Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { fillPdfTemplate, bytesToBase64, generateDataSheetHtml, type SystemData } from '@/core/pdf/pdf-fill';
import { saveBinaryDocumentToClientFolder } from '@/features/potencias/lib/client-docs';
import { sendEditableEmail } from '@/core/email/email-sender';

interface Template {
  id: string;
  nombre: string;
  storage_path: string;
  comercializadora_id: string;
  comercializadora_nombre?: string;
  campos_mapeados: Record<string, string>;
  campos_detectados: Array<{ name: string; type: string }>;
  instrucciones?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  expedienteId: string;
  cicloId: string;
  requestId: string;
  clientId: string;
  clientEmail: string | null;
  systemData: SystemData;
  comercializadoraNombreSupply: string | null; // nombre texto guardado en supply
  onAdvanced: () => void;
  userId: string;
  asesorEmail: string;
}

export default function GenerateAuthorizationDialog({
  open, onClose, expedienteId, cicloId, requestId, clientId, clientEmail,
  systemData, comercializadoraNombreSupply, onAdvanced, userId, asesorEmail,
}: Props) {
  const [step, setStep] = useState<'choose' | 'preview' | 'send'>('choose');
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filledBytes, setFilledBytes] = useState<Uint8Array | null>(null);
  const [filledInfo, setFilledInfo] = useState<{ filled: string[]; missing: string[] } | null>(null);
  const [mode, setMode] = useState<'acroform' | 'ficha'>('acroform');
  const [processing, setProcessing] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [savedDocId, setSavedDocId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    reset();
    loadTemplates();
  }, [open]);

  function reset() {
    setStep('choose');
    setSelectedId(null);
    setFilledBytes(null);
    setFilledInfo(null);
    setSavedDocId(null);
  }

  async function loadTemplates() {
    setLoading(true);
    const { data, error } = await supabase
      .from('comercializadora_docs')
      .select('id, nombre, storage_path, comercializadora_id, campos_mapeados, campos_detectados, instrucciones, comercializadora:comercializadoras(nombre)')
      .eq('es_plantilla_autorizacion', true)
      .order('created_at', { ascending: false });

    if (error) { toast.error('Error cargando plantillas'); setLoading(false); return; }

    const all: Template[] = (data || []).map((d: any) => ({
      id: d.id,
      nombre: d.nombre,
      storage_path: d.storage_path,
      comercializadora_id: d.comercializadora_id,
      comercializadora_nombre: d.comercializadora?.nombre,
      campos_mapeados: d.campos_mapeados || {},
      campos_detectados: d.campos_detectados || [],
      instrucciones: d.instrucciones,
    }));

    // Ordenar: primero las que coinciden con la comercializadora del supply
    if (comercializadoraNombreSupply) {
      const norm = comercializadoraNombreSupply.toLowerCase().trim();
      all.sort((a, b) => {
        const aMatch = (a.comercializadora_nombre || '').toLowerCase().trim() === norm;
        const bMatch = (b.comercializadora_nombre || '').toLowerCase().trim() === norm;
        return (aMatch ? 0 : 1) - (bMatch ? 0 : 1);
      });
      if (all.length > 0) {
        const first = all[0];
        const firstMatch = (first.comercializadora_nombre || '').toLowerCase().trim() === norm;
        if (firstMatch) setSelectedId(first.id);
      }
    }

    setTemplates(all);
    setLoading(false);
  }

  async function handleGenerate() {
    if (!selectedId) return;
    const tpl = templates.find(t => t.id === selectedId);
    if (!tpl) return;

    setProcessing(true);
    try {
      // Descargar plantilla
      const { data: blob, error: dlErr } = await supabase.storage
        .from('expediente-docs')
        .download(tpl.storage_path);
      if (dlErr || !blob) throw new Error('No se pudo descargar la plantilla');

      const templateBytes = await blob.arrayBuffer();

      // Detectar modo: si la plantilla tiene campos detectados, modo AcroForm;
      // si no, modo "ficha" (PDF en blanco + ficha HTML en el email)
      const hasFields = (tpl.campos_detectados || []).length > 0;
      const useMode: 'acroform' | 'ficha' = hasFields ? 'acroform' : 'ficha';
      setMode(useMode);

      let bytes: Uint8Array;
      let filled: string[] = [];
      let missing: string[] = [];

      if (useMode === 'acroform') {
        const result = await fillPdfTemplate(templateBytes, tpl.campos_mapeados, systemData, { flatten: false });
        bytes = result.bytes;
        filled = result.filled;
        missing = result.missing;
      } else {
        // Modo ficha: usamos el PDF original tal cual
        bytes = new Uint8Array(templateBytes);
      }

      setFilledBytes(bytes);
      setFilledInfo({ filled, missing });

      // Preparar email
      const nombre = systemData.cliente?.nombre_fiscal || 'cliente';
      const asunto = `Autorizacion cambio de potencia - ${nombre}`;
      setEmailSubject(asunto);
      setEmailBody(defaultEmailBody({
        clienteNombre: nombre,
        cups: systemData.supply?.cups || '',
        comercializadora: tpl.comercializadora_nombre || comercializadoraNombreSupply || '',
        asesorNombre: systemData.asesor?.nombre_completo || '',
        modo: useMode,
      }));

      setStep('preview');
    } catch (e: any) {
      toast.error(e.message || 'Error generando el PDF');
    } finally {
      setProcessing(false);
    }
  }

  function handleDownload() {
    if (!filledBytes) return;
    const tpl = templates.find(t => t.id === selectedId);
    const fileName = buildFileName(tpl?.comercializadora_nombre, systemData.cliente?.nombre_fiscal);
    const blob = new Blob([filledBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleSaveToClient(): Promise<{ docId: string; fileName: string } | null> {
    if (!filledBytes) return null;
    const tpl = templates.find(t => t.id === selectedId);
    const fileName = buildFileName(tpl?.comercializadora_nombre, systemData.cliente?.nombre_fiscal);

    const res = await saveBinaryDocumentToClientFolder({
      clientId,
      tipo: 'autorizacion_cliente',
      nombre: `Autorizacion ${tpl?.comercializadora_nombre || ''} - ${systemData.cliente?.nombre_fiscal || ''}`.trim(),
      fileName,
      bytes: filledBytes,
      contentType: 'application/pdf',
      expedienteId, cicloId, userId,
      metadata: {
        comercializadora: tpl?.comercializadora_nombre,
        plantilla_id: tpl?.id,
        request_id: requestId,
        campos_rellenados: filledInfo?.filled.length || 0,
        campos_pendientes: filledInfo?.missing.length || 0,
      },
    });

    if (!res.success || !res.docId) {
      toast.error('Error guardando en la carpeta del cliente: ' + (res.error || ''));
      return null;
    }
    setSavedDocId(res.docId);
    return { docId: res.docId, fileName };
  }

  async function handleSendEmail() {
    if (!filledBytes || !clientEmail) return;
    setProcessing(true);
    try {
      // 1) Guardar PDF en carpeta cliente (si aun no)
      let saved: { docId: string; fileName: string } | null;
      if (savedDocId) {
        const tpl = templates.find(t => t.id === selectedId);
        saved = { docId: savedDocId, fileName: buildFileName(tpl?.comercializadora_nombre, systemData.cliente?.nombre_fiscal) };
      } else {
        saved = await handleSaveToClient();
        if (!saved) { setProcessing(false); return; }
      }

      // 2) Enviar email con PDF adjunto
      const pdfBase64 = bytesToBase64(filledBytes);
      const tpl = templates.find(t => t.id === selectedId);
      const fichaHtml = mode === 'ficha'
        ? generateDataSheetHtml(systemData, tpl?.comercializadora_nombre || comercializadoraNombreSupply || '')
        : '';
      const htmlWrapped = wrapEmailHtml(emailBody, fichaHtml);

      const result = await sendEditableEmail({
        to: clientEmail,
        cc: asesorEmail,
        subject: emailSubject,
        html: htmlWrapped,
        clientId,
        expedienteId,
        cicloId,
        userId,
        tipo: 'libre',
        attachments: [{
          filename: saved.fileName,
          content: pdfBase64,
          content_type: 'application/pdf',
        }],
      });

      if (!result.success) {
        toast.error('Error enviando email: ' + (result.error || ''));
        setProcessing(false);
        return;
      }

      // 3) Avanzar request a pendiente_firma_cliente
      const hoy = new Date().toISOString().split('T')[0];
      const { error: reqErr } = await supabase
        .from('solicitudes_potencia')
        .update({
          estado: 'pendiente_firma_cliente',
          doc_autorizacion_id: saved.docId,
          fecha_envio_autorizacion: hoy,
        })
        .eq('id', requestId);

      if (reqErr) {
        toast.error('Email enviado pero no se pudo avanzar el estado: ' + reqErr.message);
        setProcessing(false);
        return;
      }

      // 4) Log de cambio de estado
      await supabase.from('status_log').insert({
        expediente_id: expedienteId,
        ciclo_id: cicloId,
        request_id: requestId,
        estado_anterior: 'borrador',
        estado_nuevo: 'pendiente_firma_cliente',
        cambiado_por: userId,
        notas: `Enviado documento autorizacion a ${clientEmail}`,
      });

      toast.success('Autorizacion enviada al cliente');
      onAdvanced();
      onClose();
    } catch (e: any) {
      toast.error('Error: ' + (e.message || ''));
    } finally {
      setProcessing(false);
    }
  }

  const selectedTpl = templates.find(t => t.id === selectedId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !processing && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#284e8f]">
            <FileText size={20} /> Generar autorizacion del cliente
          </DialogTitle>
        </DialogHeader>

        {/* STEP 1: choose template */}
        {step === 'choose' && (
          <div className="space-y-4">
            {loading ? (
              <div className="py-12 text-center text-gray-500">
                <Loader2 size={24} className="animate-spin mx-auto mb-2" /> Cargando plantillas...
              </div>
            ) : templates.length === 0 ? (
              <div className="py-8 text-center">
                <AlertTriangle size={32} className="mx-auto text-amber-500 mb-2" />
                <p className="text-sm text-gray-700">
                  No hay plantillas de autorizacion configuradas.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Ve a <strong>Documentacion &gt; Comercializadoras</strong>, sube el PDF oficial de la
                  comercializadora, y marcalo como "plantilla de autorizacion".
                </p>
              </div>
            ) : (
              <>
                {comercializadoraNombreSupply && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-800 flex items-center gap-2">
                    <Building2 size={14} />
                    Comercializadora del suministro: <strong>{comercializadoraNombreSupply}</strong>
                  </div>
                )}
                <Label className="text-sm font-semibold text-[#284e8f]">Selecciona la plantilla:</Label>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {templates.map(t => (
                    <label
                      key={t.id}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedId === t.id ? 'border-[#284e8f] bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tpl"
                        checked={selectedId === t.id}
                        onChange={() => setSelectedId(t.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">{t.nombre}</p>
                          {t.comercializadora_nombre && (
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {t.comercializadora_nombre}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {t.campos_detectados.length} campos detectados ·{' '}
                          {Object.values(t.campos_mapeados).filter(v => v).length} mapeados
                        </p>
                        {t.instrucciones && (
                          <p className="text-[11px] text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1">
                            💡 {t.instrucciones}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 2: preview & edit */}
        {step === 'preview' && filledBytes && filledInfo && (
          <div className="space-y-4">
            {mode === 'acroform' ? (
              <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-900">
                      PDF generado · {filledInfo.filled.length} campos rellenados automaticamente
                    </p>
                    {filledInfo.missing.length > 0 && (
                      <p className="text-xs text-amber-700 mt-1">
                        ⚠️ {filledInfo.missing.length} campo(s) sin rellenar (el cliente o Julia los completaran):{' '}
                        <span className="font-mono">{filledInfo.missing.slice(0, 5).join(', ')}{filledInfo.missing.length > 5 ? '...' : ''}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-300 rounded p-3 text-sm">
                <div className="flex items-start gap-2">
                  <FileText size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-900">Modo ficha activado</p>
                    <p className="text-xs text-blue-800 mt-1">
                      La plantilla es un PDF plano. Se enviara <strong>en blanco</strong> al cliente y en el cuerpo del email
                      incluiremos una <strong>ficha de datos</strong> con todos los valores que debe transcribir. Pulsa "Previsualizar ficha"
                      para verla antes de enviar.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Botones de descarga / guardar manualmente */}
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download size={14} className="mr-1" /> Descargar PDF{mode === 'ficha' ? ' (en blanco)' : ''}
              </Button>
              {mode === 'ficha' && (
                <Button variant="outline" size="sm" onClick={() => {
                  const tpl = templates.find(t => t.id === selectedId);
                  const html = wrapEmailHtml(emailBody, generateDataSheetHtml(systemData, tpl?.comercializadora_nombre || comercializadoraNombreSupply || ''));
                  const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  window.open(url, '_blank');
                  setTimeout(() => URL.revokeObjectURL(url), 30000);
                }}>
                  <FileText size={14} className="mr-1" /> Previsualizar ficha
                </Button>
              )}
              <Button
                variant="outline" size="sm"
                onClick={async () => {
                  const r = await handleSaveToClient();
                  if (r) toast.success('PDF guardado en la carpeta del cliente');
                }}
                disabled={!!savedDocId}
              >
                {savedDocId ? <CheckCircle2 size={14} className="mr-1 text-green-600" /> : <Upload size={14} className="mr-1" />}
                {savedDocId ? 'Guardado en cliente' : 'Guardar en cliente'}
              </Button>
            </div>

            {/* Composicion del email */}
            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-[#284e8f] mb-3">Email para el cliente</p>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Destinatario</Label>
                  <Input value={clientEmail || ''} readOnly className="bg-gray-50" />
                  {!clientEmail && (
                    <p className="text-xs text-red-600 mt-1">⚠️ El cliente no tiene email asignado. Edita el cliente para anadirlo antes de enviar.</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Asunto</Label>
                  <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Mensaje</Label>
                  <Textarea
                    value={emailBody}
                    onChange={e => setEmailBody(e.target.value)}
                    rows={10}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'choose' && (
            <>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleGenerate} disabled={!selectedId || processing}>
                {processing ? <Loader2 size={14} className="animate-spin mr-1" /> : <FileText size={14} className="mr-1" />}
                Generar PDF
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('choose')}>Atras</Button>
              <Button
                onClick={handleSendEmail}
                disabled={!clientEmail || processing}
                className="bg-[#284e8f] hover:bg-[#1e3d70]"
              >
                {processing ? <Loader2 size={14} className="animate-spin mr-1" /> : <Mail size={14} className="mr-1" />}
                Enviar al cliente
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildFileName(comercializadora?: string, cliente?: string | null): string {
  const clean = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 40);
  const com = comercializadora ? clean(comercializadora) : 'comercializadora';
  const cli = cliente ? clean(cliente) : 'cliente';
  return `autorizacion_${com}_${cli}.pdf`;
}

function defaultEmailBody(p: { clienteNombre: string; cups: string; comercializadora: string; asesorNombre: string; modo: 'acroform' | 'ficha' }): string {
  if (p.modo === 'ficha') {
    return `Estimado/a ${p.clienteNombre || 'cliente'}:

Adjuntamos el documento oficial de ${p.comercializadora || 'su comercializadora'} para autorizar el cambio de potencia del suministro con CUPS ${p.cups}, al amparo del Real Decreto-Ley 7/2026.

A continuacion de este mensaje encontrara una FICHA DE DATOS con todos los valores que debe consignar en el PDF adjunto. Le rogamos:

 1. Imprimir el documento PDF adjunto.
 2. Cumplimentarlo a mano siguiendo la ficha de datos que aparece mas abajo (razon social, CIF, CUPS, potencias contratadas actuales y solicitadas, etc.).
 3. Marcar la tarifa de acceso correspondiente con una "X".
 4. Firmar y sellar en el recuadro habilitado.
 5. Escanearlo y devolvernoslo respondiendo a este email.

Tan pronto recibamos el documento firmado, tramitaremos la solicitud con la comercializadora.

Si tiene cualquier duda, puede contactarnos directamente.

Un cordial saludo,
${p.asesorNombre || 'Equipo Valere Consultores'}
Valere Consultores Asociados SL`;
  }

  return `Estimado/a ${p.clienteNombre || 'cliente'}:

Adjuntamos el documento de autorizacion oficial de ${p.comercializadora || 'su comercializadora'} para que podamos iniciar el proceso de cambio de potencia del suministro con CUPS ${p.cups}, al amparo del Real Decreto-Ley 7/2026.

Le rogamos:
 1. Revisar los datos ya rellenados.
 2. Completar cualquier campo pendiente (firma, fecha, DNI, etc.).
 3. Firmar el documento.
 4. Devolvernos el PDF firmado respondiendo a este email.

Tan pronto recibamos el documento firmado, tramitaremos la solicitud con la comercializadora.

Si tiene cualquier duda, puede contactarnos directamente.

Un cordial saludo,
${p.asesorNombre || 'Equipo Valere Consultores'}
Valere Consultores Asociados SL`;
}

function wrapEmailHtml(text: string, fichaHtml: string = ''): string {
  const escaped = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0; padding:0; background:#f3f4f6; font-family:Arial, sans-serif;">
  <div style="max-width:720px; margin:20px auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#284e8f; padding:20px 28px; text-align:center;">
      <p style="color:#fff; font-size:22px; font-weight:bold; margin:0;">Valere</p>
      <p style="color:#a3bffa; font-size:10px; letter-spacing:3px; text-transform:uppercase; margin:4px 0 0 0;">Consultores</p>
    </div>
    <div style="padding:28px; color:#374151; font-size:14px; line-height:1.6;">
      ${escaped}
      ${fichaHtml}
    </div>
    <div style="background:#f9fafb; padding:12px 28px; border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af; font-size:10px; margin:0;">
        Valere Consultores Asociados SL — C/ Astronomia S/N, Torre 4, 41015 Sevilla
      </p>
    </div>
  </div>
</body></html>`;
}
