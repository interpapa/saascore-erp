'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Calendar, Trash2, FileText, Sparkles, 
  CheckCircle2, Image as ImageIcon, Camera, Upload, X, ZoomIn, 
  Download, SplitSquareVertical, Clipboard, Scissors, Wrench, Smile, Stethoscope
} from 'lucide-react';
import { 
  getEntityRecordsAction, 
  createEntityRecordAction, 
  deleteEntityRecordAction,
  addPhotoToEntityRecordAction
} from '@/app/actions/entityRecords';
import { type EntityRecord, type RecordPhoto } from '@/lib/core/entityRecordTypes';
import { useToast } from '@/components/core/ToastProvider';

interface ClientRecordsTabProps {
  entityId: string;
  tenantId: string;
  actor: any;
  clientName: string;
  triggerNewRecord?: number;
}

interface PendingPhoto {
  id: string;
  url: string;
  name: string;
  caption: string;
  category: 'foto_antes' | 'foto_despues' | 'rx' | 'receta' | 'general';
}

export function ClientRecordsTab({ 
  entityId, 
  tenantId, 
  actor, 
  clientName,
  triggerNewRecord 
}: ClientRecordsTabProps) {
  const { toast } = useToast();
  const [records, setRecords] = useState<EntityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulario nuevo registro
  const [recordType, setRecordType] = useState<EntityRecord['record_type']>('visit_note');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const appendFileInputRef = useRef<HTMLInputElement>(null);
  const formTopRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Estado para agregar foto a un registro existente
  const [activeRecordForUpload, setActiveRecordForUpload] = useState<string | null>(null);
  const [isAppendingPhoto, setIsAppendingPhoto] = useState(false);

  // Lightbox / Modal de Foto en Pantalla Completa
  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState<{
    url: string;
    title?: string;
    caption?: string;
    category?: string;
    date?: string;
  } | null>(null);

  const loadRecords = async () => {
    if (!tenantId || !entityId || !actor) return;
    setIsLoading(true);
    try {
      const res = await getEntityRecordsAction(tenantId, entityId, actor);
      if (res.success && res.records) {
        setRecords(res.records);
      }
    } catch (e: any) {
      console.error('Error cargando registros:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [entityId, tenantId]);

  // Si se dispara triggerNewRecord desde el exterior, abrir formulario inmediatamente
  useEffect(() => {
    if (triggerNewRecord && triggerNewRecord > 0) {
      startNewRecord('visit_note');
    }
  }, [triggerNewRecord]);

  // SOPORTE DE PEGADO DIRECTO DEL PORTAPAPELES (Ctrl + V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (!blob) continue;

          setIsCreating(true);

          const reader = new FileReader();
          reader.onload = () => {
            const base64Url = reader.result as string;
            setPendingPhotos((prev) => [
              ...prev,
              {
                id: 'photo_paste_' + Date.now(),
                url: base64Url,
                name: `Captura ${new Date().toLocaleTimeString('es-VE')}`,
                caption: 'Imagen pegada desde portapapeles',
                category: 'general',
              }
            ]);
            toast({
              variant: 'success',
              title: 'Foto Pegada (Ctrl + V)',
              description: 'La imagen fue añadida a la entrada actual.',
            });
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Iniciar nuevo registro con plantillas universales o limpias
  const startNewRecord = (type: EntityRecord['record_type'] = 'visit_note', templatePreset?: 'service' | 'before_after' | 'clinical' | 'blank') => {
    setRecordType(type);
    setIsCreating(true);

    if (templatePreset === 'service') {
      setTitle('');
      setBody('• Trabajo / Servicio realizado:\n• Materiales, piezas o fórmulas utilizadas:\n• Observaciones o recomendaciones:');
    } else if (templatePreset === 'before_after') {
      setTitle('Registro de Trabajo y Evolución');
      setBody('• Estado inicial:\n• Procedimiento aplicado:\n• Resultado obtenido:');
    } else if (templatePreset === 'clinical') {
      setTitle('Atención / Procedimiento Clínico');
      setBody('• Motivo de consulta o revisión:\n• Procedimiento realizado:\n• Indicaciones y plan de seguimiento:');
    } else {
      setTitle('');
      setBody('');
    }

    setTimeout(() => {
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      titleInputRef.current?.focus();
    }, 100);
  };

  // Manejar fotos seleccionadas
  const handlePhotoFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast({ variant: 'warning', title: 'Formato no soportado', description: `"${file.name}" no es una imagen válida.` });
        return;
      }
      if (file.size > 6 * 1024 * 1024) {
        toast({ variant: 'warning', title: 'Foto muy pesada', description: `"${file.name}" supera los 6MB permitidos.` });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Url = reader.result as string;
        setPendingPhotos((prev) => [
          ...prev,
          {
            id: 'photo_temp_' + Math.random().toString(36).substring(2, 9),
            url: base64Url,
            name: file.name,
            caption: '',
            category: 'general',
          }
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleRemovePendingPhoto = (photoId: string) => {
    setPendingPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const handleUpdatePendingPhotoCategory = (photoId: string, category: PendingPhoto['category']) => {
    setPendingPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, category } : p))
    );
  };

  const handleUpdatePendingPhotoCaption = (photoId: string, caption: string) => {
    setPendingPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, caption } : p))
    );
  };

  // Crear Registro con fotos adjuntas
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ variant: 'warning', title: 'Título requerido', description: 'Ingresa un título o motivo para el registro.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedPhotos: RecordPhoto[] = pendingPhotos.map((p) => ({
        id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        url: p.url,
        name: p.name,
        caption: p.caption,
        category: p.category,
        created_at: new Date().toISOString(),
      }));

      const res = await createEntityRecordAction(
        {
          entity_id: entityId,
          record_type: recordType,
          title: title.trim(),
          body: body.trim(),
          record_date: new Date(recordDate).toISOString(),
          metadata: {
            photos: formattedPhotos,
          }
        },
        tenantId,
        actor
      );

      if (res.success && res.record) {
        toast({ 
          variant: 'success', 
          title: 'Entrada Guardada', 
          description: formattedPhotos.length > 0 
            ? `Se registró con ${formattedPhotos.length} foto(s) de evidencia.` 
            : 'La entrada ha sido agregada a la bitácora.' 
        });
        setRecords([res.record, ...records]);
        setTitle('');
        setBody('');
        setPendingPhotos([]);
        setIsCreating(false);
      } else {
        toast({ variant: 'error', title: 'Error', description: res.error || 'No se pudo guardar la entrada.' });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Agregar foto directamente a un registro ya guardado
  const handleAppendPhotoToRecord = (recordId: string) => {
    setActiveRecordForUpload(recordId);
    if (appendFileInputRef.current) {
      appendFileInputRef.current.click();
    }
  };

  const handleAppendFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetRecordId = activeRecordForUpload;
    if (!file || !targetRecordId) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: 'warning', title: 'Formato no soportado', description: 'Selecciona una imagen válida.' });
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      toast({ variant: 'warning', title: 'Foto muy pesada', description: 'La imagen supera los 6MB permitidos.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Url = reader.result as string;
      setIsAppendingPhoto(true);
      try {
        const res = await addPhotoToEntityRecordAction(
          tenantId,
          entityId,
          targetRecordId,
          {
            url: base64Url,
            name: file.name,
            category: 'general',
            caption: `Adjuntado el ${new Date().toLocaleDateString('es-VE')}`,
          },
          actor
        );

        if (res.success && res.photo) {
          toast({ variant: 'success', title: 'Foto Agregada', description: 'La foto fue añadida a este registro.' });
          setRecords((prev) =>
            prev.map((r) => {
              if (r.id === targetRecordId) {
                const existingPhotos = Array.isArray(r.metadata?.photos) ? r.metadata!.photos! : [];
                return {
                  ...r,
                  metadata: {
                    ...(r.metadata || {}),
                    photos: [...existingPhotos, res.photo!],
                  }
                };
              }
              return r;
            })
          );
        } else {
          toast({ variant: 'error', title: 'Error', description: res.error || 'No se pudo agregar la foto.' });
        }
      } catch (err: any) {
        toast({ variant: 'error', title: 'Error', description: err.message });
      } finally {
        setIsAppendingPhoto(false);
        setActiveRecordForUpload(null);
        if (appendFileInputRef.current) appendFileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm('¿Deseas eliminar esta entrada de la bitácora?')) return;
    try {
      const res = await deleteEntityRecordAction(recordId, entityId, tenantId, actor);
      if (res.success) {
        setRecords(records.filter((r) => r.id !== recordId));
        toast({ variant: 'info', title: 'Entrada Eliminada', description: 'Se removió el registro de la bitácora.' });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
    }
  };

  const getBadgeStyle = (type: EntityRecord['record_type']) => {
    switch (type) {
      case 'visit_note':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'custom':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'clinical_note':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'dental_chart':
        return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20';
      case 'prescription':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  const getTypeLabel = (type: EntityRecord['record_type']) => {
    switch (type) {
      case 'visit_note': return '📝 Nota de Servicio / Trabajo';
      case 'custom': return '📋 Bitácora & Seguimiento';
      case 'dental_chart': return '🦷 Procedimiento Dental';
      case 'clinical_note': return '🩺 Atención Clínica';
      case 'prescription': return '📄 Comprobante / Receta';
      default: return '📋 Entrada';
    }
  };

  const getPhotoCategoryBadge = (category?: string) => {
    switch (category) {
      case 'foto_antes':
        return <span className="bg-amber-500/90 text-white px-2 py-0.5 rounded-md text-[10px] font-black uppercase shadow-xs">📸 Antes / Inicial</span>;
      case 'foto_despues':
        return <span className="bg-emerald-500/90 text-white px-2 py-0.5 rounded-md text-[10px] font-black uppercase shadow-xs">✨ Después / Final</span>;
      case 'rx':
        return <span className="bg-purple-600/90 text-white px-2 py-0.5 rounded-md text-[10px] font-black uppercase shadow-xs">☢️ Escaneo / RX</span>;
      case 'receta':
        return <span className="bg-blue-600/90 text-white px-2 py-0.5 rounded-md text-[10px] font-black uppercase shadow-xs">📄 Documento</span>;
      default:
        return <span className="bg-slate-700/80 text-white px-2 py-0.5 rounded-md text-[10px] font-black uppercase shadow-xs">🔍 Evidencia</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Input oculto para anexar fotos a registros existentes */}
      <input
        type="file"
        ref={appendFileInputRef}
        onChange={handleAppendFileSelected}
        accept="image/*"
        className="hidden"
      />

      {/* Input de Cámara Directa Móvil */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handlePhotoFilesSelected}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* BARRA SUPERIOR DE ACCIÓN RÁPIDA UNIVERSAL */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-border/80 space-y-3 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles size={14} className="text-primary" />
              <span>Bitácora y Registro de Trabajos</span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Registra qué pasó, cómo se resolvió y adjunta fotos de evidencia o pega con <strong>Ctrl + V</strong>.
            </p>
          </div>

          <button
            type="button"
            onClick={() => startNewRecord('visit_note', 'blank')}
            className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold transition-all flex items-center gap-1.5 btn-haptic shadow-xs hover:bg-primary/90"
          >
            <Plus size={15} />
            <span>+ Nueva Entrada</span>
          </button>
        </div>

        {/* Acceso rápido a plantillas comunes */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border/50 text-[11px]">
          <span className="text-slate-400 font-semibold mr-1">Plantillas rápidas:</span>
          <button
            type="button"
            onClick={() => startNewRecord('visit_note', 'service')}
            className="px-2.5 py-1 rounded-lg bg-card border border-border/80 text-foreground hover:border-primary/40 font-medium transition-colors flex items-center gap-1 shadow-2xs"
          >
            <Wrench size={12} className="text-amber-500" />
            <span>Servicio / Taller / Barbería</span>
          </button>

          <button
            type="button"
            onClick={() => startNewRecord('visit_note', 'before_after')}
            className="px-2.5 py-1 rounded-lg bg-card border border-border/80 text-foreground hover:border-primary/40 font-medium transition-colors flex items-center gap-1 shadow-2xs"
          >
            <SplitSquareVertical size={12} className="text-emerald-500" />
            <span>Antes & Después</span>
          </button>

          <button
            type="button"
            onClick={() => startNewRecord('clinical_note', 'clinical')}
            className="px-2.5 py-1 rounded-lg bg-card border border-border/80 text-foreground hover:border-primary/40 font-medium transition-colors flex items-center gap-1 shadow-2xs"
          >
            <Stethoscope size={12} className="text-blue-500" />
            <span>Atención Clínica / Salud</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsCreating(true);
              setTimeout(() => cameraInputRef.current?.click(), 100);
            }}
            className="px-2.5 py-1 rounded-lg bg-card border border-border/80 text-foreground hover:border-primary/40 font-medium transition-colors flex items-center gap-1 shadow-2xs"
          >
            <Camera size={12} className="text-indigo-500" />
            <span>+ Subir Foto Directa</span>
          </button>
        </div>
      </div>

      {/* Formulario de Entrada con Soporte de Fotos Directas */}
      {isCreating && (
        <form 
          ref={formTopRef as any}
          onSubmit={handleCreate} 
          className="p-5 rounded-3xl border-2 border-primary/40 bg-card space-y-4 animate-in fade-in duration-150 shadow-lg"
        >
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <span className="text-sm font-black text-foreground flex items-center gap-2">
              <FileText size={17} className="text-primary" />
              <span>Nueva Entrada en la Bitácora</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setPendingPhotos([]);
              }}
              className="text-slate-400 hover:text-foreground text-xs font-bold p-1"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Categoría de Entrada</label>
              <select
                value={recordType}
                onChange={(e) => setRecordType(e.target.value as any)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground"
              >
                <option value="visit_note">📝 Servicio / Trabajo Realizado</option>
                <option value="custom">📋 Nota de Seguimiento General</option>
                <option value="dental_chart">🦷 Procedimiento Dental</option>
                <option value="clinical_note">🩺 Atención Médica / Clínica</option>
                <option value="prescription">📄 Comprobante / Receta / Documento</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Fecha</label>
              <input
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Título o Asunto *</label>
            <input
              ref={titleInputRef}
              type="text"
              required
              placeholder="¿Qué trabajo o procedimiento se realizó? (Ej. Mantenimiento, Cambio de pieza, Sesión de corte)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-foreground focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Descripción / ¿Qué pasó y cómo se realizó?</label>
            <textarea
              rows={4}
              placeholder="Describe los detalles de lo realizado, diagnóstico, observaciones técnicas, materiales utilizados o recomendaciones..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed font-sans"
            />
          </div>

          {/* SECCIÓN ADJUNTAR FOTOS Y EVIDENCIAS */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-border/80 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                  <ImageIcon size={15} className="text-indigo-500" />
                  <span>Fotos y Evidencias Visuales</span>
                </span>
                <p className="text-[10px] text-slate-400">
                  Agrega fotos del estado inicial, resultado final o pega directamente con <strong>Ctrl + V</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-foreground text-xs font-bold transition-colors flex items-center gap-1 btn-haptic sm:hidden"
                  title="Tomar foto con la cámara"
                >
                  <Camera size={14} />
                  <span>Cámara</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-colors flex items-center gap-1.5 border border-indigo-500/20 btn-haptic"
                >
                  <Upload size={14} />
                  <span>Seleccionar Fotos</span>
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoFilesSelected}
                accept="image/*"
                multiple
                className="hidden"
              />
            </div>

            {/* Vista Previa de Fotos Pendientes */}
            {pendingPhotos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {pendingPhotos.map((photo) => (
                  <div key={photo.id} className="relative bg-card border border-border rounded-2xl p-2.5 space-y-2 shadow-xs group">
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center">
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePendingPhoto(photo.id)}
                        className="absolute top-1.5 right-1.5 p-1.5 bg-black/70 hover:bg-rose-600 text-white rounded-lg transition-colors"
                        title="Remover foto"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Clasificación</label>
                        <select
                          value={photo.category}
                          onChange={(e) => handleUpdatePendingPhotoCategory(photo.id, e.target.value as any)}
                          className="w-full bg-background border border-border rounded-lg px-2 py-1 text-[11px] font-bold text-foreground"
                        >
                          <option value="general">🔍 General / Evidencia</option>
                          <option value="foto_antes">📸 Antes / Inicial</option>
                          <option value="foto_despues">✨ Después / Resultado</option>
                          <option value="receta">📄 Comprobante / Documento</option>
                          <option value="rx">☢️ Radiografía / Escaneo</option>
                        </select>
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Nota o descripción (opcional)"
                          value={photo.caption}
                          onChange={(e) => handleUpdatePendingPhotoCaption(photo.id, e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-2 py-1 text-[11px] text-foreground placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setPendingPhotos([]);
              }}
              className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:bg-primary/90 disabled:opacity-50 btn-haptic shadow-md flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>Guardar Entrada {pendingPhotos.length > 0 ? `(${pendingPhotos.length} Fotos)` : ''}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Lista Cronológica */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400 space-y-2">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Cargando bitácora de {clientName}...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-3xl p-8 text-slate-400 space-y-3">
          <FileText size={36} className="mx-auto opacity-30 text-indigo-500" />
          <p className="text-sm font-bold text-foreground">Sin registros en la bitácora aún</p>
          <p className="text-xs max-w-sm mx-auto text-slate-500">
            Haz clic en <strong>+ Nueva Entrada</strong> para registrar los trabajos realizados, notas de evolución o evidencias fotográficas.
          </p>
        </div>
      ) : (
        <div className="relative pl-7 space-y-5 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-border/70">
          {records.map((rec) => {
            const dateObj = new Date(rec.record_date);
            const dateStr = dateObj.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
            const photos: RecordPhoto[] = Array.isArray(rec.metadata?.photos) ? rec.metadata!.photos! : [];

            // Identificar fotos de Antes y Después para vista comparativa
            const fotoAntes = photos.find((p) => p.category === 'foto_antes');
            const fotoDespues = photos.find((p) => p.category === 'foto_despues');
            const hasBeforeAfter = fotoAntes && fotoDespues;

            return (
              <div key={rec.id} className="relative group">
                {/* Punto del timeline */}
                <div className="absolute -left-7 top-2.5 w-3.5 h-3.5 rounded-full bg-primary border-2 border-background ring-4 ring-card" />

                <div className="bg-card border border-border rounded-3xl p-5 shadow-xs space-y-3.5 hover:border-primary/40 transition-all">
                  {/* Cabecera de la Entrada */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md border ${getBadgeStyle(rec.record_type)}`}>
                          {getTypeLabel(rec.record_type)}
                        </span>
                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                          <Calendar size={13} /> {dateStr}
                        </span>
                        {photos.length > 0 && (
                          <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-md flex items-center gap-1 border border-indigo-500/20">
                            <ImageIcon size={11} /> {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
                          </span>
                        )}
                      </div>
                      <h5 className="text-sm font-black text-foreground">{rec.title}</h5>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Botón rápido para agregar foto a esta entrada */}
                      <button
                        type="button"
                        onClick={() => handleAppendPhotoToRecord(rec.id)}
                        disabled={isAppendingPhoto && activeRecordForUpload === rec.id}
                        className="p-1.5 px-2.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-colors flex items-center gap-1 text-xs font-bold border border-border/60 btn-haptic"
                        title="Adjuntar foto o evidencia a esta entrada"
                      >
                        <Camera size={14} className="text-indigo-500" />
                        <span>+ Foto</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(rec.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 p-1.5 rounded-lg transition-all"
                        title="Eliminar registro"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Cuerpo / Texto del Registro */}
                  {rec.body && (
                    <div className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-border/50 font-sans">
                      {rec.body}
                    </div>
                  )}

                  {/* VISTA COMPARATIVA ANTES / DESPUÉS SI EXISTEN AMBAS */}
                  {hasBeforeAfter && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-background to-emerald-500/10 border border-border/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                          <SplitSquareVertical size={15} className="text-primary" />
                          <span>Comparativa de Evolución (Antes vs. Después)</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Foto Antes */}
                        <div 
                          onClick={() => setActiveLightboxPhoto({
                            url: fotoAntes.url,
                            title: rec.title,
                            caption: fotoAntes.caption || 'Foto Inicial',
                            category: 'foto_antes',
                            date: dateStr,
                          })}
                          className="relative aspect-4/3 rounded-2xl overflow-hidden bg-slate-900 border-2 border-amber-500/40 group/img cursor-pointer shadow-md"
                        >
                          <img
                            src={fotoAntes.url}
                            alt="Antes"
                            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2.5 left-2.5">
                            {getPhotoCategoryBadge('foto_antes')}
                          </div>
                          {fotoAntes.caption && (
                            <div className="absolute bottom-0 inset-x-0 bg-black/70 backdrop-blur-xs p-2 text-xs text-white truncate font-medium">
                              {fotoAntes.caption}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn size={24} className="text-white drop-shadow-md" />
                          </div>
                        </div>

                        {/* Foto Después */}
                        <div 
                          onClick={() => setActiveLightboxPhoto({
                            url: fotoDespues.url,
                            title: rec.title,
                            caption: fotoDespues.caption || 'Resultado Final',
                            category: 'foto_despues',
                            date: dateStr,
                          })}
                          className="relative aspect-4/3 rounded-2xl overflow-hidden bg-slate-900 border-2 border-emerald-500/40 group/img cursor-pointer shadow-md"
                        >
                          <img
                            src={fotoDespues.url}
                            alt="Después"
                            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2.5 left-2.5">
                            {getPhotoCategoryBadge('foto_despues')}
                          </div>
                          {fotoDespues.caption && (
                            <div className="absolute bottom-0 inset-x-0 bg-black/70 backdrop-blur-xs p-2 text-xs text-white truncate font-medium">
                              {fotoDespues.caption}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn size={24} className="text-white drop-shadow-md" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* GALERÍA INTEGRAL DE FOTOS */}
                  {photos.length > 0 && (
                    <div className="space-y-2.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Fotografías y Evidencias Adjuntas ({photos.length})
                      </span>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {photos.map((photo, pIdx) => (
                          <div
                            key={photo.id || pIdx}
                            onClick={() => setActiveLightboxPhoto({
                              url: photo.url,
                              title: rec.title,
                              caption: photo.caption || photo.name,
                              category: photo.category,
                              date: dateStr,
                            })}
                            className="relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-border group/card cursor-pointer shadow-xs hover:border-primary/60 hover:shadow-md transition-all"
                          >
                            <img
                              src={photo.url}
                              alt={photo.name || 'Evidencia'}
                              className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                            />

                            {/* Badge de Categoría */}
                            <div className="absolute top-2 left-2">
                              {getPhotoCategoryBadge(photo.category)}
                            </div>

                            {/* Hover Overlay con Lupa */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white">
                              <ZoomIn size={24} className="drop-shadow-md" />
                              <span className="text-[10px] font-bold drop-shadow-md">Ampliar</span>
                            </div>

                            {/* Pie con nota/caption */}
                            {photo.caption && (
                              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-2 pt-4 text-[10px] text-white font-medium truncate">
                                {photo.caption}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pie de Auditoría */}
                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-border/40">
                    <span>Registrado por: <strong>{rec.created_by?.split('@')[0] || 'Operador'}</strong></span>
                    {photos.length > 0 && (
                      <span className="text-slate-400 font-medium">
                        {photos.length} {photos.length === 1 ? 'adjunto gráfico' : 'adjuntos gráficos'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIGHTBOX / MODAL EXPANDIDO DE FOTOS EN PANTALLA COMPLETA */}
      {activeLightboxPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setActiveLightboxPhoto(null)}
        >
          {/* Barra Superior del Lightbox */}
          <div className="w-full max-w-5xl flex items-center justify-between pb-3 text-white">
            <div className="flex items-center gap-2.5">
              {getPhotoCategoryBadge(activeLightboxPhoto.category)}
              <div>
                <h4 className="text-sm font-black truncate">{activeLightboxPhoto.title}</h4>
                <p className="text-xs text-slate-400">{activeLightboxPhoto.date}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={activeLightboxPhoto.url}
                download={`evidencia_${clientName}_${Date.now()}.jpg`}
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Descargar imagen"
              >
                <Download size={18} />
              </a>
              <button
                type="button"
                onClick={() => setActiveLightboxPhoto(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Cerrar visor"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Imagen en Grande */}
          <div 
            className="relative max-w-5xl max-h-[80vh] flex items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-black/40 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeLightboxPhoto.url}
              alt="Foto ampliada"
              className="max-h-[80vh] w-auto object-contain select-none"
            />
          </div>

          {/* Pie de foto / Nota descriptiva */}
          {activeLightboxPhoto.caption && (
            <div 
              className="mt-3 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md text-white text-xs font-medium max-w-2xl text-center border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {activeLightboxPhoto.caption}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
