import { useEffect, useState } from 'react';
import { supabase } from '@/core/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, FileSearch, Save, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { detectPdfFormFields, SYSTEM_FIELDS, type PdfFieldInfo } from '@/core/pdf/pdf-fill';

interface Props {
  open: boolean;
  onClose: () => void;
  docId: string;
  docNombre: string;
  storagePath: string;
  onSaved: () => void;
}

export default function TemplateMappingDialog({ open, onClose, docId, docNombre, storagePath, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [esPlantilla, setEsPlantilla] = useState(true);
  const [instrucciones, setInstrucciones] = useState('');
  const [detectados, setDetectados] = useState<PdfFieldInfo[]>([]);
  const [mapeo, setMapeo] = useState<Record<string, string>>({});
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    loadAll();
  }, [open, docId]);

  async function loadAll() {
    setLoading(true);
    setInitError(null);

    // Carga metadatos actuales
    const { data: doc, error: docErr } = await supabase
      .from('comercializadora_docs')
      .select('es_plantilla_autorizacion, campos_mapeados, campos_detectados, instrucciones')
      .eq('id', docId)
      .single();

    if (docErr || !doc) {
      setInitError('No se pudo cargar el documento');
      setLoading(false);
      return;
    }

    setEsPlantilla(doc.es_plantilla_autorizacion ?? true);
    setInstrucciones(doc.instrucciones || '');
    setMapeo((doc.campos_mapeados as Record<string, string>) || {});

    // Detecta campos AcroForm
    try {
      const { data: blob, error: dlErr } = await supabase.storage.from('expediente-docs').download(storagePath);
      if (dlErr || !blob) throw new Error('No se pudo descargar el PDF');
      const bytes = await blob.arrayBuffer();
      const fields = await detectPdfFormFields(bytes);
      setDetectados(fields);

      // Guardar campos_detectados si ha cambiado
      const prev = (doc.campos_detectados as PdfFieldInfo[]) || [];
      if (JSON.stringify(prev) !== JSON.stringify(fields)) {
        await supabase
          .from('comercializadora_docs')
          .update({ campos_detectados: fields })
          .eq('id', docId);
      }

      // Auto-sugerir mapeos por similitud de nombre (primera vez)
      if (Object.keys((doc.campos_mapeados as any) || {}).length === 0 && fields.length > 0) {
        const sugerido: Record<string, string> = {};
        for (const f of fields) {
          const norm = f.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          const match = SYSTEM_FIELDS.find(sf => {
            const skey = sf.key.toLowerCase().replace(/[^a-z0-9]/g, '');
            const lastPart = sf.key.split('.').pop() || '';
            const slast = lastPart.toLowerCase().replace(/[^a-z0-9]/g, '');
            return norm === skey || norm === slast || norm.includes(slast) || slast.includes(norm);
          });
          if (match) sugerido[f.name] = match.key;
        }
        if (Object.keys(sugerido).length > 0) setMapeo(sugerido);
      }
    } catch (e: any) {
      setInitError(e.message || 'Error leyendo el PDF');
    }

    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from('comercializadora_docs')
      .update({
        es_plantilla_autorizacion: esPlantilla,
        campos_mapeados: mapeo,
        instrucciones,
      })
      .eq('id', docId);
    setSaving(false);
    if (error) { toast.error('Error guardando: ' + error.message); return; }
    toast.success('Plantilla configurada');
    onSaved();
    onClose();
  }

  // Agrupar SYSTEM_FIELDS por group para un <select> bonito
  const grupos = Array.from(new Set(SYSTEM_FIELDS.map(s => s.group)));

  const numMapeados = Object.values(mapeo).filter(v => v).length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#284e8f]">
            <FileSearch size={20} /> Configurar plantilla: {docNombre}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-gray-500">
            <Loader2 size={24} className="animate-spin mx-auto mb-2" />
            Analizando PDF...
          </div>
        ) : initError ? (
          <div className="py-8 text-center text-red-600">
            <p>{initError}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Marcar como plantilla */}
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={esPlantilla}
                onCheckedChange={(v) => setEsPlantilla(v === true)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  Es plantilla oficial de autorizacion del cliente
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Si se marca, aparecera en expedientes como plantilla para generar la autorizacion del cliente.
                </p>
              </div>
            </label>

            {/* Campos detectados */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold text-[#284e8f]">
                  Campos detectados en el PDF
                </Label>
                <span className="text-xs text-gray-500">
                  {detectados.length} campos · {numMapeados} mapeados
                </span>
              </div>

              {detectados.length === 0 ? (
                <div className="bg-blue-50 border border-blue-300 rounded p-3 text-xs text-blue-900 space-y-2">
                  <p className="font-semibold">📋 PDF plano detectado — modo "ficha + PDF en blanco"</p>
                  <p>
                    Este PDF no tiene campos de formulario rellenables (es lo habitual en plantillas oficiales).
                    No hace falta convertirlo. El sistema usara automaticamente el <strong>modo ficha</strong>:
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    <li>Al generar la autorizacion, se adjuntara el PDF <strong>en blanco</strong> al email.</li>
                    <li>El cuerpo del email incluira una <strong>ficha de datos</strong> con todos los valores que el cliente debe copiar.</li>
                    <li>El cliente imprime el PDF, rellena consultando la ficha, firma, y devuelve el PDF firmado.</li>
                  </ul>
                  <p className="text-[11px] text-blue-700 pt-1 border-t border-blue-200">
                    Si mas adelante quieres relleno 100% automatico, convierte el PDF con Adobe Acrobat Pro
                    (Herramientas &gt; Preparar formulario) y vuelve a subirlo.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                  {detectados.map(f => (
                    <div key={f.name} className="flex items-center gap-2 text-sm">
                      <FileText size={14} className="text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-xs text-gray-700">{f.name}</span>
                        <span className="ml-2 text-[10px] text-gray-400">({f.type})</span>
                      </div>
                      <span className="text-gray-400">→</span>
                      <select
                        value={mapeo[f.name] || ''}
                        onChange={(e) => setMapeo({ ...mapeo, [f.name]: e.target.value })}
                        className="px-2 py-1 border rounded text-xs bg-white min-w-[220px]"
                      >
                        <option value="">— Sin rellenar —</option>
                        {grupos.map(g => (
                          <optgroup key={g} label={g}>
                            {SYSTEM_FIELDS.filter(sf => sf.group === g).map(sf => (
                              <option key={sf.key} value={sf.key}>{sf.label}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Instrucciones internas */}
            <div>
              <Label className="text-sm font-semibold text-[#284e8f]">
                Instrucciones internas (opcional)
              </Label>
              <Textarea
                value={instrucciones}
                onChange={(e) => setInstrucciones(e.target.value)}
                placeholder="Notas para Julia sobre como usar esta plantilla, campos que siempre hay que revisar manualmente, etc."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : <Save size={14} className="mr-1" />}
            Guardar configuracion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
