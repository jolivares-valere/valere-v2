import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/core/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  FileUp, Loader2, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, X,
  ArrowRight, Save, Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  parseExcelFile, autoMapHeaders, applyMappingToRows, SUPPLY_FIELDS,
  type ParsedExcel, type SupplyField, type MappedSupplyRow,
} from '@/core/excel/excel-import';

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: (clientId: string) => void;
  userId: string;
  /** Si se pasa, importar CUPS para este cliente existente. Si no, hay que crear cliente primero. */
  existingClientId?: string;
  existingClientName?: string;
}

interface Comercializadora {
  id: string;
  nombre: string;
}

export default function MultiSupplyImportDialog({
  open, onClose, onImported, userId, existingClientId, existingClientName,
}: Props) {
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'client' | 'importing' | 'done'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedExcel | null>(null);
  const [mapping, setMapping] = useState<Record<string, SupplyField | ''>>({});
  const [preview, setPreview] = useState<MappedSupplyRow[]>([]);
  const [processing, setProcessing] = useState(false);

  // Comercializadora
  const [comercializadoras, setComercializadoras] = useState<Comercializadora[]>([]);
  const [comId, setComId] = useState<string>('');
  const [comNombre, setComNombre] = useState<string>('');
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(null);
  const [saveAsTemplate, setSaveAsTemplate] = useState(true);
  const [templateName, setTemplateName] = useState('');

  // Cliente (solo cuando no hay existingClientId)
  const [clientForm, setClientForm] = useState({
    nombre: '', cif: '', email_contacto: '', persona_contacto: '',
    telefono: '', direccion_fiscal: '', ciudad: '', codigo_postal: '',
  });
  const [existingClientMatch, setExistingClientMatch] = useState<any>(null);

  // Resumen final
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; failed: number; failedRows?: any[] }>({ created: 0, skipped: 0, failed: 0 });

  useEffect(() => {
    if (!open) return;
    reset();
    loadComercializadoras();
  }, [open]);

  function reset() {
    setStep('upload');
    setFile(null);
    setParsed(null);
    setMapping({});
    setPreview([]);
    setComId('');
    setComNombre('');
    setSavedTemplateId(null);
    setTemplateName('');
    setClientForm({
      nombre: '', cif: '', email_contacto: '', persona_contacto: '',
      telefono: '', direccion_fiscal: '', ciudad: '', codigo_postal: '',
    });
    setExistingClientMatch(null);
    setImportResult({ created: 0, skipped: 0, failed: 0 });
  }

  async function loadComercializadoras() {
    const { data } = await supabase.from('comercializadoras').select('id, nombre').eq('activa', true).order('nombre');
    if (data) setComercializadoras(data);
  }

  const onDrop = useCallback(async (files: File[]) => {
    if (!files[0]) return;
    setProcessing(true);
    setFile(files[0]);
    try {
      const p = await parseExcelFile(files[0]);
      setParsed(p);

      // Intentar cargar plantilla existente si hay comercializadora elegida
      let used = false;
      if (comId) {
        const { data: tpl } = await supabase
          .from('excel_import_templates')
          .select('id, campos_mapeados')
          .eq('comercializadora_id', comId)
          .order('updated_at', { ascending: false })
          .limit(1);
        if (tpl && tpl[0]) {
          setMapping(tpl[0].campos_mapeados as any);
          setSavedTemplateId(tpl[0].id);
          toast.success('Plantilla de mapeo reutilizada');
          used = true;
        }
      }
      if (!used) {
        setMapping(autoMapHeaders(p.headers));
      }
      setStep('map');
    } catch (e: any) {
      toast.error('Error leyendo el archivo: ' + (e.message || ''));
      setFile(null);
    } finally {
      setProcessing(false);
    }
  }, [comId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
    disabled: processing,
  });

  function goToPreview() {
    if (!parsed) return;
    // Validar que los campos obligatorios tengan mapeo
    const required = SUPPLY_FIELDS.filter(f => f.required).map(f => f.key);
    const mapped = Object.values(mapping).filter(Boolean);
    const missing = required.filter(r => !mapped.includes(r));
    if (missing.length > 0) {
      toast.error('Falta mapear: ' + missing.join(', '));
      return;
    }
    const rows = applyMappingToRows(parsed.rows, mapping);
    setPreview(rows);
    setStep('preview');
  }

  async function goToClient() {
    // Si ya hay cliente, pasar directo a importing
    if (existingClientId) {
      await doImport(existingClientId);
      return;
    }
    setStep('client');
  }

  async function handleCheckCif() {
    if (!clientForm.cif) return;
    const { data } = await supabase
      .from('empresas')
      .select('*')
      .eq('cif', clientForm.cif.trim().toUpperCase())
      .eq('activo', true)
      .maybeSingle();
    if (data) {
      setExistingClientMatch(data);
      toast.info('CIF ya existe: los suministros se asociaran a "' + data.nombre_fiscal + '"');
    } else {
      setExistingClientMatch(null);
    }
  }

  async function handleCreateClientAndImport() {
    let clientId = existingClientMatch?.id;

    if (!clientId) {
      if (!clientForm.nombre_fiscal.trim() || !clientForm.cif.trim()) {
        toast.error('Nombre fiscal y CIF son obligatorios');
        return;
      }
      const { data, error } = await supabase.from('empresas').insert({
        ...clientForm,
        cif: clientForm.cif.trim().toUpperCase(),
        created_by: userId,
      }).select('id').single();
      if (error || !data) {
        toast.error('Error creando cliente: ' + (error?.message || ''));
        return;
      }
      clientId = data.id;
    }
    await doImport(clientId);
  }

  async function doImport(clientId: string) {
    setStep('importing');
    const valid = preview.filter(r => r._errors.length === 0);
    let created = 0;
    let skipped = 0;
    let failed = 0;
    const failedRows: any[] = [];

    // Detectar CUPS ya existentes
    const cupsList = valid.map(r => r.cups!).filter(Boolean);
    const { data: existing } = await supabase
      .from('cups')
      .select('cups')
      .in('cups', cupsList);
    const existingCups = new Set((existing || []).map(e => e.cups));

    for (const r of valid) {
      if (existingCups.has(r.cups!)) { skipped++; continue; }
      const payload: any = {
        empresa_id: clientId,
        cups: r.cups,
        denominacion: r.denominacion,
        direccion_suministro: r.direccion_suministro,
        ciudad_suministro: r.ciudad_suministro,
        tariff_type: r.tariff_type || '3.0TD',
        channel: 'distribuidora' as const,
        distribuidora: r.distribuidora,
        comercializadora: r.comercializadora || comNombre || null,
        tension_kv: r.tension_kv,
        p1_kw: r.p1_kw || 0, p2_kw: r.p2_kw || 0, p3_kw: r.p3_kw || 0,
        p4_kw: r.p4_kw || 0, p5_kw: r.p5_kw || 0, p6_kw: r.p6_kw || 0,
        comercializadora_id: comId || null,
        created_by: userId,
      };
      const { error } = await supabase.from('cups').insert(payload);
      if (error) { failed++; failedRows.push({ cups: r.cups, error: error.message }); }
      else created++;
    }

    // Guardar plantilla de mapeo si aplica
    if (saveAsTemplate && comId) {
      const templatePayload = {
        comercializadora_id: comId,
        nombre: templateName || `Plantilla ${comNombre || 'comercializadora'}`,
        campos_mapeados: mapping,
        header_row: parsed?.headerRow || 1,
        sheet_name: parsed?.activeSheet,
        creado_por: userId,
      };
      if (savedTemplateId) {
        await supabase.from('excel_import_templates').update({
          campos_mapeados: mapping,
          header_row: parsed?.headerRow || 1,
          sheet_name: parsed?.activeSheet,
          updated_at: new Date().toISOString(),
        }).eq('id', savedTemplateId);
      } else {
        await supabase.from('excel_import_templates').insert(templatePayload);
      }
    }

    setImportResult({ created, skipped, failed, failedRows });
    setStep('done');
    if (created > 0) {
      toast.success(`${created} suministros importados`);
      onImported(clientId);
    }
  }

  const numErrors = preview.filter(r => r._errors.length > 0).length;
  const numValid = preview.filter(r => r._errors.length === 0).length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !processing && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#284e8f]">
            <FileSpreadsheet size={20} /> Importar multi-suministro desde Excel
            {existingClientName && <span className="text-sm text-gray-500 ml-2">→ {existingClientName}</span>}
          </DialogTitle>
        </DialogHeader>

        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900">
              <p className="font-medium mb-1">📊 Sube el Excel que te envia la comercializadora</p>
              <p>Aceptamos <strong>.xlsx, .xls o .csv</strong>. El sistema detectara automaticamente las columnas (CUPS, potencias, tarifa...).</p>
              <p className="mt-1">Si ya has importado un Excel de esta comercializadora antes, reutilizaremos tu mapeo guardado.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#284e8f]">Comercializadora (opcional pero recomendado)</Label>
              <Select value={comId} onValueChange={(v) => {
                setComId(v);
                const com = comercializadoras.find(c => c.id === v);
                if (com) setComNombre(com.nombre);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar (para reutilizar el mapeo despues)" />
                </SelectTrigger>
                <SelectContent>
                  {comercializadoras.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-gray-500">Si no existe, crea primero la comercializadora en <strong>Documentacion → Comercializadoras</strong>.</p>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-2">
                {processing ? (
                  <><Loader2 size={28} className="animate-spin text-blue-500" /><span>Analizando archivo...</span></>
                ) : (
                  <>
                    <FileUp size={28} className="text-gray-400" />
                    <p className="text-sm font-medium text-gray-700">Arrastra el Excel o haz click</p>
                    <p className="text-xs text-gray-400">.xlsx · .xls · .csv (max 20 MB)</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: MAP */}
        {step === 'map' && parsed && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-900">
              <p className="font-medium">🔍 Revisa el mapeo de columnas</p>
              <p>Asigna cada columna del Excel a un campo del sistema. Las marcadas con ⭐ son obligatorias.</p>
              <p className="mt-1">Detectamos <strong>{parsed.totalRows}</strong> filas de datos en la hoja "<strong>{parsed.activeSheet}</strong>" (cabecera en fila {parsed.headerRow}).</p>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Columna del Excel</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Muestra (1ª fila)</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">→ Mapear a</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.headers.map(h => (
                    <tr key={h} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{h}</td>
                      <td className="px-3 py-2 text-xs text-gray-500 truncate max-w-[200px]">
                        {parsed.rows[0]?.[h] != null ? String(parsed.rows[0][h]).slice(0, 40) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={mapping[h] || ''}
                          onChange={(e) => setMapping({ ...mapping, [h]: e.target.value as SupplyField | '' })}
                          className="w-full px-2 py-1 border rounded text-xs"
                        >
                          <option value="">— Ignorar —</option>
                          {SUPPLY_FIELDS.map(f => (
                            <option key={f.key} value={f.key}>
                              {f.required ? '⭐ ' : ''}{f.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STEP 3: PREVIEW */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-green-50 border border-green-200 rounded px-3 py-2 text-sm flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-600" />
                <strong className="text-green-700">{numValid}</strong> validos
              </div>
              {numErrors > 0 && (
                <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-600" />
                  <strong className="text-red-700">{numErrors}</strong> con errores (se omitiran)
                </div>
              )}
            </div>

            <div className="border rounded-lg overflow-auto max-h-[400px]">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-left">#</th>
                    <th className="px-2 py-1.5 text-left">CUPS</th>
                    <th className="px-2 py-1.5 text-left">Tarifa</th>
                    <th className="px-2 py-1.5 text-center">P1</th>
                    <th className="px-2 py-1.5 text-center">P2</th>
                    <th className="px-2 py-1.5 text-center">P3</th>
                    <th className="px-2 py-1.5 text-center">P4</th>
                    <th className="px-2 py-1.5 text-center">P5</th>
                    <th className="px-2 py-1.5 text-center">P6</th>
                    <th className="px-2 py-1.5 text-left">Direccion</th>
                    <th className="px-2 py-1.5 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map(r => (
                    <tr key={r._rowIndex} className={`border-t ${r._errors.length > 0 ? 'bg-red-50' : r._warnings.length > 0 ? 'bg-amber-50' : ''}`}>
                      <td className="px-2 py-1 text-gray-500">{r._rowIndex}</td>
                      <td className="px-2 py-1 font-mono">{r.cups || '—'}</td>
                      <td className="px-2 py-1">{r.tariff_type || '—'}</td>
                      <td className="px-2 py-1 text-center font-mono">{r.p1_kw || 0}</td>
                      <td className="px-2 py-1 text-center font-mono">{r.p2_kw || 0}</td>
                      <td className="px-2 py-1 text-center font-mono">{r.p3_kw || 0}</td>
                      <td className="px-2 py-1 text-center font-mono">{r.p4_kw || 0}</td>
                      <td className="px-2 py-1 text-center font-mono">{r.p5_kw || 0}</td>
                      <td className="px-2 py-1 text-center font-mono">{r.p6_kw || 0}</td>
                      <td className="px-2 py-1 truncate max-w-[200px]">{r.direccion_suministro || '—'}</td>
                      <td className="px-2 py-1">
                        {r._errors.length > 0 ? (
                          <span className="text-red-600 font-medium" title={r._errors.join('; ')}>❌ {r._errors[0]}</span>
                        ) : r._warnings.length > 0 ? (
                          <span className="text-amber-700" title={r._warnings.join('; ')}>⚠ OK con avisos</span>
                        ) : (
                          <span className="text-green-600">✓ OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {comId && (
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={e => setSaveAsTemplate(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Guardar este mapeo como plantilla de <strong>{comNombre}</strong> para reutilizarlo en futuras importaciones.
                </span>
              </label>
            )}
            {saveAsTemplate && comId && (
              <Input
                placeholder={`Nombre plantilla (ej: "Excel oficial ${comNombre}")`}
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                className="text-xs"
              />
            )}
          </div>
        )}

        {/* STEP 4: CLIENT */}
        {step === 'client' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900">
              Datos del cliente propietario de estos {numValid} suministros. Si el CIF ya existe, los CUPS se anadiran al cliente existente.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nombre fiscal *</Label>
                <Input value={clientForm.nombre_fiscal} onChange={e => setClientForm({ ...clientForm, nombre: e.target.value })} />
              </div>
              <div>
                <Label>CIF *</Label>
                <Input value={clientForm.cif} onChange={e => setClientForm({ ...clientForm, cif: e.target.value })} onBlur={handleCheckCif} />
                {existingClientMatch && (
                  <p className="text-[11px] text-blue-700 mt-1 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Cliente existente: <strong>{existingClientMatch.nombre_fiscal}</strong>
                  </p>
                )}
              </div>
              <div>
                <Label>Email de contacto</Label>
                <Input type="email" value={clientForm.email_contacto} onChange={e => setClientForm({ ...clientForm, email_contacto: e.target.value })} />
              </div>
              <div>
                <Label>Persona de contacto</Label>
                <Input value={clientForm.persona_contacto} onChange={e => setClientForm({ ...clientForm, persona_contacto: e.target.value })} />
              </div>
              <div>
                <Label>Telefono</Label>
                <Input value={clientForm.telefono} onChange={e => setClientForm({ ...clientForm, telefono: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Direccion fiscal</Label>
                <Input value={clientForm.direccion_fiscal} onChange={e => setClientForm({ ...clientForm, direccion_fiscal: e.target.value })} />
              </div>
              <div>
                <Label>Ciudad</Label>
                <Input value={clientForm.ciudad} onChange={e => setClientForm({ ...clientForm, ciudad: e.target.value })} />
              </div>
              <div>
                <Label>Codigo postal</Label>
                <Input value={clientForm.codigo_postal} onChange={e => setClientForm({ ...clientForm, codigo_postal: e.target.value })} maxLength={5} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: IMPORTING */}
        {step === 'importing' && (
          <div className="py-12 text-center">
            <Loader2 size={32} className="animate-spin mx-auto mb-3 text-blue-500" />
            <p className="text-sm text-gray-700">Importando suministros...</p>
          </div>
        )}

        {/* STEP 6: DONE */}
        {step === 'done' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-300 rounded-lg p-6 text-center">
              <CheckCircle2 size={40} className="mx-auto text-green-600 mb-2" />
              <p className="text-lg font-semibold text-green-800">Importacion completada</p>
              <div className="mt-3 flex items-center justify-center gap-6 text-sm">
                <div><span className="text-2xl font-bold text-green-700">{importResult.created}</span><br/><span className="text-xs text-gray-600">creados</span></div>
                {importResult.skipped > 0 && <div><span className="text-2xl font-bold text-amber-700">{importResult.skipped}</span><br/><span className="text-xs text-gray-600">ya existian</span></div>}
                {importResult.failed > 0 && <div><span className="text-2xl font-bold text-red-700">{importResult.failed}</span><br/><span className="text-xs text-gray-600">fallaron</span></div>}
              </div>
            </div>
            {importResult.failed > 0 && importResult.failedRows && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-xs">
                <p className="font-medium mb-1 text-red-900">Filas que fallaron:</p>
                {importResult.failedRows.slice(0, 5).map((f, i) => (
                  <p key={i} className="text-red-700">• {f.cups}: {f.error}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
          )}
          {step === 'map' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>Atras</Button>
              <Button onClick={goToPreview}><ArrowRight size={14} className="mr-1" /> Previsualizar</Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('map')}>Atras</Button>
              <Button onClick={goToClient} disabled={numValid === 0}>
                <ArrowRight size={14} className="mr-1" /> {existingClientId ? `Importar ${numValid} suministros` : 'Datos del cliente'}
              </Button>
            </>
          )}
          {step === 'client' && (
            <>
              <Button variant="outline" onClick={() => setStep('preview')}>Atras</Button>
              <Button onClick={handleCreateClientAndImport}>
                <Save size={14} className="mr-1" /> Importar {numValid} suministros
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button onClick={onClose}>Cerrar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
