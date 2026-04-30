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
  FileSignature, Loader2, Download, Mail, CheckCircle2, AlertTriangle, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  generateAutorizacionValerePdfBytes,
  type AutorizacionValereData,
  type ExpedienteAutorizacionItem,
} from '@/core/pdf/autorizacion-valere-pdf';
import { saveBinaryDocumentToClientFolder } from '@/features/potencias/lib/client-docs';
import { sendEditableEmail } from '@/core/email/email-sender';

interface Props {
  open: boolean;
  onClose: () => void;
  /**
   * Opcion A: pasar expediente_ids (ExpedientesPage) y el dialogo carga los datos agrupando por cliente
   * Opcion B: pasar clientId directamente (ClientDetailPage) y toma todos los expedientes activos del cliente
   */
  expedienteIds?: string[];
  clientId?: string;
  userId: string;
  onDone: () => void;
}

interface ClientData {
  id: string;
  nombre: string;
  cif: string;
  direccion_fiscal?: string | null;
  ciudad?: string | null;
  codigo_postal?: string | null;
  email_contacto?: string | null;
  asesor_id?: string | null;
  asesor_email?: string | null;
}

export default function GenerateGroupAuthValereDialog({
  open, onClose, expedienteIds, clientId, userId, onDone,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<ClientData | null>(null);
  const [suministros, setSuministros] = useState<ExpedienteAutorizacionItem[]>([]);
  const [expedientesAsociados, setExpedientesAsociados] = useState<string[]>([]);

  const [representanteNombre, setRepresentanteNombre] = useState('');
  const [representanteDni, setRepresentanteDni] = useState('');
  const [representanteCargo, setRepresentanteCargo] = useState('');

  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [ccAsesor, setCcAsesor] = useState(true);

  const [processing, setProcessing] = useState(false);
  const [savedDocId, setSavedDocId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    reset();
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expedienteIds?.join(','), clientId]);

  function reset() {
    setLoading(true);
    setError(null);
    setClient(null);
    setSuministros([]);
    setExpedientesAsociados([]);
    setRepresentanteNombre('');
    setRepresentanteDni('');
    setRepresentanteCargo('');
    setSavedDocId(null);
  }

  async function loadData() {
    try {
      // Resolver clientId: si vienen expedienteIds, obtener el cliente del primero
      let targetClientId = clientId;
      let expIds: string[] = [];

      if (expedienteIds && expedienteIds.length > 0) {
        // Cargar expedientes para sacar cliente_id y verificar que son del mismo cliente
        const { data: exps } = await supabase
          .from('expedientes')
          .select('id, client_id, supply:cups!inner(cups, tariff_type, direccion_suministro, comercializadora, distribuidora)')
          .in('id', expedienteIds);

        if (!exps || exps.length === 0) throw new Error('No se encontraron los expedientes');

        const clientIds = Array.from(new Set(exps.map(e => e.empresa_id)));
        if (clientIds.length > 1) {
          throw new Error('Los expedientes seleccionados pertenecen a clientes distintos. Selecciona solo expedientes de un mismo cliente.');
        }
        targetClientId = clientIds[0];
        expIds = exps.map(e => e.id);
        setExpedientesAsociados(expIds);
        setSuministros(exps.map((e: any) => ({
          cups: e.supply?.cups || '',
          tarifa: e.supply?.tariff_type || '',
          direccion_suministro: e.supply?.direccion_suministro || '',
          comercializadora: e.supply?.comercializadora || null,
          distribuidora: e.supply?.distribuidora || null,
        })));
      } else if (clientId) {
        // Modo "desde cliente": cargar todos los expedientes activos del cliente
        const { data: exps } = await supabase
          .from('expedientes')
          .select('id, supply:cups!inner(cups, tariff_type, direccion_suministro, comercializadora, distribuidora)')
          .eq('empresa_id', clientId)
          .eq('estado', 'activo');

        if (!exps || exps.length === 0) throw new Error('El cliente no tiene expedientes activos');

        expIds = exps.map(e => e.id);
        setExpedientesAsociados(expIds);
        setSuministros(exps.map((e: any) => ({
          cups: e.supply?.cups || '',
          tarifa: e.supply?.tariff_type || '',
          direccion_suministro: e.supply?.direccion_suministro || '',
          comercializadora: e.supply?.comercializadora || null,
          distribuidora: e.supply?.distribuidora || null,
        })));
      }

      if (!targetClientId) throw new Error('No se pudo identificar el cliente');

      // Cargar datos del cliente
      const { data: c } = await supabase
        .from('empresas')
        .select('id, nombre, cif, direccion_fiscal, ciudad, codigo_postal, email_contacto, asesor_id, persona_contacto, asesor:profiles!empresas_comercial_id_fkey(email)')
        .eq('id', targetClientId)
        .single();

      if (!c) throw new Error('Cliente no encontrado');

      setClient({
        id: c.id,
        nombre: c.nombre_fiscal,
        cif: c.cif,
        direccion_fiscal: c.direccion_fiscal,
        ciudad: c.ciudad,
        codigo_postal: c.codigo_postal,
        email_contacto: c.email_contacto,
        asesor_id: c.asesor_id,
        asesor_email: (c.asesor as any)?.email,
      });

      // Prerellenar nombre del representante con persona_contacto del cliente
      if ((c as any).persona_contacto) {
        setRepresentanteNombre((c as any).persona_contacto);
      }

      // Preparar email
      setEmailSubject(`Autorización de representación Valere — ${c.nombre_fiscal}`);
      setEmailBody(defaultEmailBody(c.nombre_fiscal, expIds.length));

      setLoading(false);
    } catch (e: any) {
      setError(e.message || 'Error cargando datos');
      setLoading(false);
    }
  }

  function buildData(): AutorizacionValereData | null {
    if (!client) return null;
    if (!representanteNombre.trim()) { toast.error('Falta el nombre del representante legal'); return null; }
    if (!representanteDni.trim()) { toast.error('Falta el DNI del representante legal'); return null; }

    return {
      razon_social: client.nombre_fiscal,
      cif: client.cif,
      direccion_fiscal: client.direccion_fiscal || '',
      ciudad_fiscal: client.ciudad || undefined,
      codigo_postal_fiscal: client.codigo_postal || undefined,
      representante_nombre: representanteNombre.trim(),
      representante_dni: representanteDni.trim().toUpperCase(),
      representante_cargo: representanteCargo.trim() || undefined,
      suministros,
    };
  }

  async function previewPdf() {
    const data = buildData();
    if (!data) return;
    try {
      const { bytes } = await generateAutorizacionValerePdfBytes(data);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e: any) {
      toast.error('Error generando PDF: ' + (e.message || ''));
    }
  }

  async function downloadPdf() {
    const data = buildData();
    if (!data) return;
    try {
      const { bytes, fileName } = await generateAutorizacionValerePdfBytes(data);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e: any) {
      toast.error('Error generando PDF: ' + (e.message || ''));
    }
  }

  async function saveAndSend() {
    const data = buildData();
    if (!data || !client) return;

    setProcessing(true);
    try {
      const { bytes, base64, fileName } = await generateAutorizacionValerePdfBytes(data);

      // 1) Guardar en carpeta cliente
      const saved = await saveBinaryDocumentToClientFolder({
        clientId: client.id,
        tipo: 'autorizacion',
        nombre: `Autorización Valere conjunta (${suministros.length} CUPS)`,
        fileName,
        bytes,
        contentType: 'application/pdf',
        userId,
        metadata: {
          tipo_documento: 'autorizacion_valere_conjunta',
          num_cups: suministros.length,
          expedientes: expedientesAsociados,
          representante_nombre: data.representante_nombre,
          representante_dni: data.representante_dni,
          fecha_emision: new Date().toISOString(),
        },
      });

      if (!saved.success || !saved.docId) {
        toast.error('Error guardando PDF: ' + (saved.error || ''));
        setProcessing(false);
        return;
      }
      setSavedDocId(saved.docId);

      // 2) Enviar email al cliente si tiene email
      if (client.email_contacto) {
        const html = wrapEmailHtml(emailBody);
        const result = await sendEditableEmail({
          to: client.email_contacto,
          cc: ccAsesor && client.asesor_email ? client.asesor_email : '',
          subject: emailSubject,
          html,
          clientId: client.id,
          expedienteId: '',
          cicloId: '',
          userId,
          tipo: 'libre',
          attachments: [{
            filename: fileName,
            content: base64,
            content_type: 'application/pdf',
          }],
        });
        if (!result.success) {
          toast.error('PDF guardado pero fallo el email: ' + (result.error || ''));
          setProcessing(false);
          return;
        }
      } else {
        toast.info('PDF guardado en la carpeta del cliente. No se envío email (el cliente no tiene email de contacto).');
      }

      toast.success(`Autorización conjunta generada y enviada para ${suministros.length} CUPS`);
      onDone();
      onClose();
    } catch (e: any) {
      toast.error('Error: ' + (e.message || ''));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !processing && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#284e8f]">
            <FileSignature size={20} /> Autorización Valere conjunta
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-gray-500">
            <Loader2 size={24} className="animate-spin mx-auto mb-2" /> Cargando datos...
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <AlertTriangle size={32} className="mx-auto text-red-500 mb-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : client ? (
          <div className="space-y-4">
            {/* Resumen */}
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
              <p className="font-medium text-blue-900">
                {client.nombre_fiscal} <span className="font-normal text-blue-700">· CIF {client.cif}</span>
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Se autorizara a Valere a gestionar <strong>{suministros.length}</strong> punto{suministros.length !== 1 ? 's' : ''} de suministro
                con <strong>una sola firma</strong>.
              </p>
            </div>

            {/* CUPS incluidos */}
            <div>
              <Label className="text-xs font-semibold text-[#284e8f]">CUPS incluidos</Label>
              <div className="mt-1 max-h-40 overflow-y-auto border rounded p-2 bg-gray-50 text-xs space-y-0.5">
                {suministros.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="font-mono text-gray-600">{s.cups}</span>
                    <span className="text-gray-500">· {s.tarifa}</span>
                    {s.comercializadora && <span className="text-gray-500">· {s.comercializadora}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Datos representante legal */}
            <div className="border-t pt-3">
              <p className="text-sm font-semibold text-[#284e8f] mb-2">Datos del representante legal</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Nombre y apellidos *</Label>
                  <Input value={representanteNombre} onChange={e => setRepresentanteNombre(e.target.value)} placeholder="Juan Pérez García" />
                </div>
                <div>
                  <Label>DNI *</Label>
                  <Input value={representanteDni} onChange={e => setRepresentanteDni(e.target.value)} placeholder="12345678A" className="font-mono" />
                </div>
                <div className="md:col-span-2">
                  <Label>Cargo (opcional)</Label>
                  <Input value={representanteCargo} onChange={e => setRepresentanteCargo(e.target.value)} placeholder="Administrador único, apoderado, etc." />
                </div>
              </div>
            </div>

            {/* Email */}
            {client.email_contacto && (
              <div className="border-t pt-3">
                <p className="text-sm font-semibold text-[#284e8f] mb-2">Email al cliente</p>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Destinatario</Label>
                    <Input value={client.email_contacto} readOnly className="bg-gray-50" />
                  </div>
                  <div>
                    <Label className="text-xs">Asunto</Label>
                    <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Mensaje</Label>
                    <Textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={6} className="font-mono text-xs" />
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={ccAsesor} onChange={e => setCcAsesor(e.target.checked)} />
                    <span>Enviar CC al asesor asignado</span>
                  </label>
                </div>
              </div>
            )}

            {!client.email_contacto && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
                ⚠ El cliente no tiene email de contacto. El PDF se guardara en la carpeta del cliente pero no se enviara por email.
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={processing}>Cancelar</Button>
          <Button variant="outline" onClick={previewPdf} disabled={loading || !!error || processing}>
            <Eye size={14} className="mr-1" /> Previsualizar PDF
          </Button>
          <Button variant="outline" onClick={downloadPdf} disabled={loading || !!error || processing}>
            <Download size={14} className="mr-1" /> Descargar
          </Button>
          <Button onClick={saveAndSend} disabled={loading || !!error || processing}>
            {processing ? <Loader2 size={14} className="animate-spin mr-1" /> : <Mail size={14} className="mr-1" />}
            {client?.email_contacto ? 'Guardar y enviar' : 'Guardar en cliente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function defaultEmailBody(clientName: string, numCups: number): string {
  return `Estimado/a ${clientName}:

Adjuntamos el documento oficial de autorización de representación para que Valere Consultores Asociados pueda tramitar en su nombre las modificaciones temporales de potencia contratada al amparo del Real Decreto-Ley 7/2026.

Este documento agrupa en un único formulario la autorización para los ${numCups} punto${numCups === 1 ? '' : 's'} de suministro del titular, de modo que únicamente es necesaria una firma y sello para abarcarlos todos.

Le rogamos:
 1. Revisar los datos del titular, del representante legal y la tabla de CUPS.
 2. Firmar y sellar en el apartado 7 del documento.
 3. Devolvernos el PDF firmado respondiendo a este email o por el canal habitual.

Una vez recibido, podremos iniciar formalmente la tramitación con las comercializadoras y distribuidoras correspondientes.

Si tiene cualquier duda, puede contactarnos directamente.

Un cordial saludo,
Equipo Valere Consultores
Valere Consultores Asociados, S.L.`;
}

function wrapEmailHtml(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background: #f3f4f6; font-family: Arial, sans-serif;">
  <div style="max-width: 640px; margin: 20px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: #1d3b78; padding: 20px 28px; text-align: center;">
      <p style="color: #fff; font-size: 22px; font-weight: bold; margin: 0;">Valere</p>
      <p style="color: #a3bffa; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; margin: 4px 0 0 0;">Consultores</p>
    </div>
    <div style="padding: 28px; color: #374151; font-size: 14px; line-height: 1.6;">
      ${escaped}
    </div>
    <div style="background: #f9fafb; padding: 12px 28px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 10px; margin: 0;">Valere Consultores Asociados SL — C/Astronomía S/N, Torre 4, planta 1, puerta 3, 41015 Sevilla</p>
    </div>
  </div>
</body></html>`;
}
