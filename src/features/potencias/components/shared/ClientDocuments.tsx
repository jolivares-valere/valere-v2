import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/core/supabase/client';
import { useAuth } from '@/core/hooks/useAuth';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  FolderOpen, Upload, Download, Trash2, FileText, Mail, Calculator,
  FileCheck, File, Eye, Loader2, Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatFecha } from '@/core/utils/dates';

interface ClientDocument {
  id: string;
  empresa_id: string;
  tipo: string;
  nombre: string;
  descripcion: string;
  nombre_archivo: string;
  storage_path: string;
  tamano_bytes: number;
  expediente_id: string | null;
  ciclo_id: string | null;
  metadata: Record<string, any>;
  subido_por: string | null;
  created_at: string;
}

const TIPO_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  estudio_ahorro: { label: 'Estudio de ahorro', icon: Calculator, color: 'text-green-600 bg-green-50' },
  autorizacion: { label: 'Autorizacion', icon: FileCheck, color: 'text-blue-600 bg-blue-50' },
  email_enviado: { label: 'Email enviado', icon: Mail, color: 'text-purple-600 bg-purple-50' },
  factura: { label: 'Factura', icon: FileText, color: 'text-amber-600 bg-amber-50' },
  contrato: { label: 'Contrato', icon: File, color: 'text-indigo-600 bg-indigo-50' },
  otro: { label: 'Otro', icon: File, color: 'text-gray-600 bg-gray-50' },
};

const TIPOS = Object.entries(TIPO_LABELS).map(([value, { label }]) => ({ value, label }));

interface Props {
  clientId: string;
  clientName: string;
}

export default function ClientDocuments({ clientId, clientName }: Props) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadDocuments();
  }, [clientId]);

  async function loadDocuments() {
    setLoading(true);
    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .eq('empresa_id', clientId)
      .order('created_at', { ascending: false });

    if (data) setDocuments(data);
    if (error) console.error('Error loading documents:', error);
    setLoading(false);
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setUploading(true);

    try {
      for (const file of acceptedFiles) {
        const ext = file.name.split('.').pop() || 'pdf';
        const storagePath = `client-docs/${clientId}/${Date.now()}_${file.name}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('documentos')
          .upload(storagePath, file);

        if (uploadError) {
          // If bucket doesn't exist, try creating it
          if (uploadError.message.includes('not found')) {
            toast.error('El bucket de almacenamiento no esta configurado. Contacta al administrador.');
            continue;
          }
          throw uploadError;
        }

        // Detect tipo from filename
        let tipo = 'otro';
        const nameLower = file.name.toLowerCase();
        if (nameLower.includes('estudio') || nameLower.includes('ahorro')) tipo = 'estudio_ahorro';
        else if (nameLower.includes('autorizacion')) tipo = 'autorizacion';
        else if (nameLower.includes('email') || nameLower.includes('correo')) tipo = 'email_enviado';
        else if (nameLower.includes('factura')) tipo = 'factura';
        else if (nameLower.includes('contrato')) tipo = 'contrato';

        // Save metadata in DB
        const { error: dbError } = await supabase.from('documentos').insert({
          empresa_id: clientId,
          tipo,
          nombre: file.name.replace(/\.[^.]+$/, ''),
          nombre_archivo: file.name,
          storage_path: storagePath,
          tamano_bytes: file.size,
          subido_por: user?.id,
        });

        if (dbError) throw dbError;
      }

      toast.success(`${acceptedFiles.length} documento(s) subido(s)`);
      loadDocuments();
    } catch (err: any) {
      toast.error('Error subiendo documento: ' + (err.message || ''));
    } finally {
      setUploading(false);
    }
  }, [clientId, user]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: 20 * 1024 * 1024, // 20MB
    disabled: uploading,
  });

  async function handleDownload(doc: ClientDocument) {
    try {
      const { data, error } = await supabase.storage
        .from('documentos')
        .download(doc.storage_path);

      if (error) throw error;
      if (!data) return;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nombre_archivo;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error('Error descargando: ' + (err.message || ''));
    }
  }

  async function handleDelete(doc: ClientDocument) {
    if (!confirm(`¿Eliminar "${doc.nombre}"?`)) return;

    try {
      await supabase.storage.from('documentos').remove([doc.storage_path]);
      await supabase.from('documentos').delete().eq('id', doc.id);
      toast.success('Documento eliminado');
      loadDocuments();
    } catch (err: any) {
      toast.error('Error eliminando: ' + (err.message || ''));
    }
  }

  async function handlePreview(doc: ClientDocument) {
    try {
      const isHtml = doc.nombre_archivo.endsWith('.html');

      if (isHtml) {
        // Para archivos HTML generados: descargar el contenido y abrirlo como blob
        // Esto asegura que el navegador lo renderice correctamente con UTF-8
        const { data, error } = await supabase.storage
          .from('documentos')
          .download(doc.storage_path);

        if (error) throw error;
        if (!data) return;

        // Leer como texto y recrear el blob con content-type correcto
        const text = await data.text();
        const blob = new Blob([text], { type: 'text/html; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // No revocamos inmediatamente para que la pestaña pueda cargar
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        // Para PDFs y otros archivos: usar signed URL
        const { data, error } = await supabase.storage
          .from('documentos')
          .createSignedUrl(doc.storage_path, 3600);

        if (error) throw error;
        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank');
        }
      }
    } catch (err: any) {
      toast.error('Error abriendo documento: ' + (err.message || ''));
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // Filter documents
  const filtered = documents.filter(doc => {
    if (filterTipo !== 'todos' && doc.tipo !== filterTipo) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return doc.nombre.toLowerCase().includes(term) || doc.nombre_archivo.toLowerCase().includes(term);
    }
    return true;
  });

  // Count by tipo
  const countByTipo = documents.reduce((acc, doc) => {
    acc[doc.tipo] = (acc[doc.tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen size={18} /> Documentos del cliente
          </CardTitle>
          <span className="text-xs text-gray-500">
            {documents.length} documento{documents.length !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tipo counts */}
        {documents.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterTipo('todos')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                filterTipo === 'todos' ? 'bg-[#284e8f] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos ({documents.length})
            </button>
            {Object.entries(countByTipo).map(([tipo, count]) => {
              const info = TIPO_LABELS[tipo] || TIPO_LABELS.otro;
              return (
                <button
                  key={tipo}
                  onClick={() => setFilterTipo(filterTipo === tipo ? 'todos' : tipo)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    filterTipo === tipo ? 'bg-[#284e8f] text-white' : `${info.color} hover:opacity-80`
                  }`}
                >
                  {info.label} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Search */}
        {documents.length > 3 && (
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar documentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Upload dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : uploading
              ? 'border-gray-300 bg-gray-50 cursor-wait'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-blue-500" />
              <span className="text-sm text-blue-600">Subiendo...</span>
            </div>
          ) : (
            <>
              <Upload size={20} className="mx-auto text-gray-400 mb-1" />
              <p className="text-xs text-gray-500">
                {isDragActive ? 'Suelta los archivos aqui' : 'Arrastra documentos o haz click para subir'}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">PDF, Word, Excel, imagenes — max 20MB</p>
            </>
          )}
        </div>

        {/* Document list */}
        {loading ? (
          <p className="text-sm text-gray-500 text-center py-4">Cargando documentos...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            {documents.length === 0
              ? 'No hay documentos en la carpeta de este cliente'
              : 'No hay documentos que coincidan con el filtro'}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((doc) => {
              const tipoInfo = TIPO_LABELS[doc.tipo] || TIPO_LABELS.otro;
              const IconComp = tipoInfo.icon;
              return (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 group">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${tipoInfo.color}`}>
                    <IconComp size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.nombre}</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <span className={`px-1.5 py-0.5 rounded font-medium ${tipoInfo.color}`}>
                        {tipoInfo.label}
                      </span>
                      <span>{formatSize(doc.tamano_bytes)}</span>
                      <span>{formatFecha(doc.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => handlePreview(doc)} title="Ver">
                      <Eye size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)} title="Descargar">
                      <Download size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(doc)} title="Eliminar"
                      className="text-red-500 hover:text-red-700">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
