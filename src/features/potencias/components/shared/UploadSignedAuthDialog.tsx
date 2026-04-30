import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/core/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, FileUp, CheckCircle2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { saveBinaryDocumentToClientFolder } from '@/features/potencias/lib/client-docs';

interface Props {
  open: boolean;
  onClose: () => void;
  expedienteId: string;
  cicloId: string;
  requestId: string;
  clientId: string;
  clientName: string;
  onDone: () => void;
  userId: string;
}

export default function UploadSignedAuthDialog({
  open, onClose, expedienteId, cicloId, requestId, clientId, clientName, onDone, userId,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [fechaFirma, setFechaFirma] = useState(new Date().toISOString().split('T')[0]);
  const [processing, setProcessing] = useState(false);

  const onDrop = useCallback((files: File[]) => {
    if (files[0]) setFile(files[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
  });

  async function handleSubmit() {
    if (!file) { toast.error('Selecciona el PDF firmado'); return; }
    setProcessing(true);

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const saved = await saveBinaryDocumentToClientFolder({
        clientId,
        tipo: 'autorizacion_firmada',
        nombre: `Autorizacion firmada - ${clientName}`,
        fileName: file.name,
        bytes,
        contentType: 'application/pdf',
        expedienteId, cicloId, userId,
        metadata: {
          request_id: requestId,
          fecha_firma: fechaFirma,
        },
      });

      if (!saved.success || !saved.docId) {
        toast.error('Error guardando: ' + (saved.error || ''));
        setProcessing(false);
        return;
      }

      // Avanzar request: pendiente_firma_cliente -> solicitud_enviada? NO.
      // Mejor dejar que el usuario pulse "Avanzar" como hasta ahora: aqui solo
      // registramos el documento firmado y la fecha, y marcamos que esta listo.
      // Pero para simplificar, mantenemos el request en pendiente_firma_cliente
      // con el doc firmado vinculado, y el usuario usa el boton Avanzar normal.
      const { error: reqErr } = await supabase
        .from('solicitudes_potencia')
        .update({
          doc_autorizacion_firmada_id: saved.docId,
          fecha_firma_cliente: fechaFirma,
        })
        .eq('id', requestId);

      if (reqErr) {
        toast.error('Guardado pero no se vinculo al request: ' + reqErr.message);
        setProcessing(false);
        return;
      }

      toast.success('PDF firmado guardado. Ya puedes pulsar "Avanzar" para enviar a distribuidora.');
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#284e8f]">
            <Upload size={18} /> Subir autorizacion firmada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900">
            Sube el PDF firmado por el cliente. Se guardara en su carpeta y quedara vinculado a esta solicitud.
            Despues podras pulsar "Avanzar" para enviarlo a la comercializadora / distribuidora.
          </div>

          <div>
            <Label>Fecha de firma</Label>
            <Input type="date" value={fechaFirma} onChange={e => setFechaFirma(e.target.value)} />
          </div>

          <div>
            <Label>PDF firmado</Label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors mt-1 ${
                isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm text-green-700">
                  <CheckCircle2 size={16} />
                  {file.name} ({(file.size / 1024).toFixed(0)} KB)
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <FileUp size={16} />
                  Arrastra el PDF firmado o haz click
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={processing}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!file || processing}>
            {processing ? <Loader2 size={14} className="animate-spin mr-1" /> : <Upload size={14} className="mr-1" />}
            Guardar firmado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
