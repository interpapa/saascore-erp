'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Image as ImageIcon, FileText, Trash2, Eye, UploadCloud, X, Download, ExternalLink } from 'lucide-react';
import { getEntityAttachmentsAction, createEntityAttachmentAction, deleteEntityAttachmentAction } from '@/app/actions/entityRecords';
import { type EntityAttachment } from '@/lib/core/entityRecordTypes';
import { useToast } from '@/components/core/ToastProvider';

interface ClientAttachmentsTabProps {
  entityId: string;
  tenantId: string;
  actor: any;
  clientName: string;
}

export function ClientAttachmentsTab({ entityId, tenantId, actor, clientName }: ClientAttachmentsTabProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<EntityAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<EntityAttachment | null>(null);

  // Formulario manual
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualCategory, setManualCategory] = useState<EntityAttachment['category']>('general');
  const [manualDesc, setManualDesc] = useState('');

  const loadAttachments = async () => {
    if (!tenantId || !entityId || !actor) return;
    setIsLoading(true);
    try {
      const res = await getEntityAttachmentsAction(tenantId, entityId, actor);
      if (res.success && res.attachments) {
        setAttachments(res.attachments);
      }
    } catch (e: any) {
      console.error('Error cargando archivos:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttachments();
  }, [entityId, tenantId]);

  // Manejador de selección de archivos directos del dispositivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validación de tamaño (máx 5MB para Base64 instantáneo)
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'warning', title: 'Archivo muy pesado', description: 'Por favor selecciona un archivo menor a 5MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Url = reader.result as string;
      setIsUploading(true);
      try {
        const res = await createEntityAttachmentAction(
          {
            entity_id: entityId,
            file_name: file.name,
            file_url: base64Url,
            file_type: file.type,
            file_size: file.size,
            category: file.type.startsWith('image/') ? 'general' : 'documento',
            description: `Subido el ${new Date().toLocaleDateString('es-VE')}`,
          },
          tenantId,
          actor
        );

        if (res.success && res.attachment) {
          toast({ variant: 'success', title: 'Archivo Guardado', description: `${file.name} adjuntado a la ficha.` });
          setAttachments([res.attachment, ...attachments]);
        } else {
          toast({ variant: 'error', title: 'Error al subir', description: res.error || 'No se pudo guardar el archivo.' });
        }
      } catch (err: any) {
        toast({ variant: 'error', title: 'Error', description: err.message });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualUrl.trim()) return;

    setIsUploading(true);
    try {
      const res = await createEntityAttachmentAction(
        {
          entity_id: entityId,
          file_name: manualName.trim(),
          file_url: manualUrl.trim(),
          file_type: manualUrl.match(/\.(jpeg|jpg|png|webp|gif)/i) ? 'image/jpeg' : 'application/pdf',
          category: manualCategory,
          description: manualDesc.trim(),
        },
        tenantId,
        actor
      );

      if (res.success && res.attachment) {
        toast({ variant: 'success', title: 'Adjunto Agregado', description: 'El enlace al archivo ha sido registrado.' });
        setAttachments([res.attachment, ...attachments]);
        setManualName('');
        setManualUrl('');
        setManualDesc('');
        setShowManualForm(false);
      } else {
        toast({ variant: 'error', title: 'Error', description: res.error });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (attId: string) => {
    if (!confirm('¿Deseas eliminar este archivo adjunto?')) return;
    try {
      const res = await deleteEntityAttachmentAction(attId, entityId, tenantId, actor);
      if (res.success) {
        setAttachments(attachments.filter((a) => a.id !== attId));
        toast({ variant: 'info', title: 'Archivo Eliminado', description: 'El documento fue removido.' });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
    }
  };

  const getCategoryBadge = (cat: EntityAttachment['category']) => {
    switch (cat) {
      case 'rx': return <span className="bg-purple-500/10 text-purple-600 border border-purple-500/20 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">☢️ Rayos X</span>;
      case 'foto_antes': return <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">📸 Foto Antes</span>;
      case 'foto_despues': return <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">✨ Foto Después</span>;
      case 'receta': return <span className="bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">💊 Receta</span>;
      default: return <span className="bg-slate-500/10 text-slate-600 border border-slate-500/20 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">📄 Documento</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Input oculto de archivos */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,application/pdf"
        className="hidden"
      />

      {/* Cabecera y Botones de Acción */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Galería, Fotos & Archivos ({attachments.length})
          </h4>
          <p className="text-[11px] text-slate-500">
            Radiografías, fotos de progreso, estudios clínicos o contratos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:bg-primary/90 transition-all btn-haptic disabled:opacity-50 shadow-xs"
            title="Subir imagen o PDF desde este dispositivo"
          >
            <UploadCloud size={14} />
            <span>{isUploading ? 'Subiendo...' : 'Subir Foto / Archivo'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowManualForm(!showManualForm)}
            className="p-1.5 rounded-xl border border-border text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Agregar por enlace externo URL"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Formulario de URL Manual Opcional */}
      {showManualForm && (
        <form onSubmit={handleManualSubmit} className="p-3.5 rounded-2xl border border-border bg-slate-50 dark:bg-slate-900/50 space-y-2.5 animate-in fade-in duration-150">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-foreground">Vincular Archivo por URL Externa</span>
            <button type="button" onClick={() => setShowManualForm(false)} className="text-slate-400 hover:text-foreground text-xs">✕</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              required
              placeholder="Nombre del archivo (ej. RX Panorámica Septiembre)"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-foreground"
            />

            <select
              value={manualCategory}
              onChange={(e) => setManualCategory(e.target.value as any)}
              className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-foreground"
            >
              <option value="rx">☢️ Rayos X / Estudio</option>
              <option value="foto_antes">📸 Foto Antes</option>
              <option value="foto_despues">✨ Foto Después</option>
              <option value="receta">💊 Receta / Indicación</option>
              <option value="documento">📄 Documento / Contrato</option>
              <option value="general">📁 General</option>
            </select>
          </div>

          <input
            type="url"
            required
            placeholder="URL del archivo o imagen (https://...)"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs font-mono text-foreground"
          />

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              disabled={isUploading}
              className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold btn-haptic disabled:opacity-50"
            >
              Guardar Enlace
            </button>
          </div>
        </form>
      )}

      {/* Grid de Archivos y Fotos */}
      {isLoading ? (
        <div className="py-8 text-center text-xs text-slate-400 space-y-2">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Cargando galería de {clientName}...</p>
        </div>
      ) : attachments.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-border rounded-2xl p-6 text-slate-400 space-y-2">
          <ImageIcon size={32} className="mx-auto opacity-30 text-teal-500" />
          <p className="text-xs font-bold text-foreground">Sin archivos ni fotos adjuntas</p>
          <p className="text-[11px] max-w-xs mx-auto">
            Guarda fotos de antes/después, radiografías dentales, exámenes de laboratorio o recetas firmadas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {attachments.map((att) => {
            const isImage = att.file_url.startsWith('data:image') || att.file_url.match(/\.(jpeg|jpg|png|webp|gif)/i);

            return (
              <div
                key={att.id}
                className="group relative border border-border rounded-2xl bg-card overflow-hidden shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between"
              >
                {/* Visualizador de Contenido */}
                <div
                  onClick={() => isImage && setSelectedImage(att)}
                  className={`aspect-square bg-slate-100 dark:bg-slate-900 flex items-center justify-center relative ${
                    isImage ? 'cursor-pointer' : ''
                  }`}
                >
                  {isImage ? (
                    <img
                      src={att.file_url}
                      alt={att.file_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="text-center p-3 space-y-1">
                      <FileText size={32} className="mx-auto text-indigo-500 opacity-80" />
                      <span className="text-[10px] font-bold text-slate-500 block truncate max-w-[120px]">
                        {att.file_name}
                      </span>
                    </div>
                  )}

                  {/* Overlay con acciones rápidas */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {isImage ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImage(att);
                        }}
                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white text-white hover:text-black transition-colors"
                        title="Ver en grande"
                      >
                        <Eye size={15} />
                      </button>
                    ) : (
                      <a
                        href={att.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white text-white hover:text-black transition-colors"
                        title="Abrir archivo"
                      >
                        <ExternalLink size={15} />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(att.id);
                      }}
                      className="p-1.5 rounded-lg bg-rose-500/30 hover:bg-rose-600 text-white transition-colors"
                      title="Eliminar archivo"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Pie con nombre y categoría */}
                <div className="p-2.5 space-y-1 border-t border-border/40">
                  <div className="flex items-center justify-between gap-1">
                    {getCategoryBadge(att.category)}
                  </div>
                  <p className="text-[11px] font-bold text-foreground truncate" title={att.file_name}>
                    {att.file_name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Visor de Imagen en Grande */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] bg-card rounded-2xl overflow-hidden border border-white/20 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-border flex items-center justify-between bg-slate-900 text-white">
              <span className="text-xs font-bold truncate pr-4">{selectedImage.file_name}</span>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-2 bg-black flex items-center justify-center overflow-auto max-h-[70vh]">
              <img
                src={selectedImage.file_url}
                alt={selectedImage.file_name}
                className="max-h-[68vh] max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
