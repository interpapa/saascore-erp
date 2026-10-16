'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Loader2, X, ZoomIn, ZoomOut, Check, Sliders, User, Target, Shirt, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/core/ToastProvider';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
  className?: string;
}

export function ImageUpload({ 
  value, 
  onChange, 
  bucket = 'avatars', 
  folder = 'employees', 
  className = '' 
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  
  // Controles de encuadre
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(50); // 0% (izq) a 100% (der)
  const [panY, setPanY] = useState(50); // 0% (arriba) a 100% (abajo)
  
  // Drag interactivo
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; initialPanX: number; initialPanY: number }>({ x: 0, y: 0, initialPanX: 50, initialPanY: 50 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: 'error', title: 'Archivo inválido', description: 'Por favor selecciona un archivo de imagen (JPG, PNG, WebP).' });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast({ variant: 'error', title: 'Archivo muy grande', description: 'La imagen debe pesar menos de 8MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setRawImageSrc(reader.result);
        setZoom(1);
        setPanX(50);
        setPanY(50);
        setIsCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Preset rápido de encuadre
  const applyPreset = (preset: 'face' | 'center' | 'body') => {
    if (preset === 'face') {
      setZoom(1.35);
      setPanX(50);
      setPanY(18); // Enfocar arriba (rostro)
    } else if (preset === 'center') {
      setZoom(1.0);
      setPanX(50);
      setPanY(50);
    } else if (preset === 'body') {
      setZoom(1.05);
      setPanX(50);
      setPanY(82); // Enfocar abajo
    }
  };

  // Manejo de drag sobre el viewport
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPanX: panX,
      initialPanY: panY
    };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    // Sensibilidad del arrastre ajustada al zoom
    const sensitivity = 0.25 / zoom;
    setPanX(prev => Math.min(100, Math.max(0, dragStartRef.current.initialPanX - deltaX * sensitivity)));
    setPanY(prev => Math.min(100, Math.max(0, dragStartRef.current.initialPanY - deltaY * sensitivity)));
  }, [isDragging, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch drag para móviles
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      dragStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        initialPanX: panX,
        initialPanY: panY
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStartRef.current.x;
    const deltaY = touch.clientY - dragStartRef.current.y;
    const sensitivity = 0.25 / zoom;
    setPanX(Math.min(100, Math.max(0, dragStartRef.current.initialPanX - deltaX * sensitivity)));
    setPanY(Math.min(100, Math.max(0, dragStartRef.current.initialPanY - deltaY * sensitivity)));
  };

  // Renderizar canvas recortado y subir a Supabase
  const handleCropAndSave = async () => {
    if (!rawImageSrc) return;

    try {
      setIsUploading(true);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = rawImageSrc;
      });

      const canvas = document.createElement('canvas');
      const targetSize = 512;
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('No se pudo inicializar el procesador de imagen.');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Dimensiones de corte basadas en zoom y pan
      const imgWidth = img.naturalWidth || img.width;
      const imgHeight = img.naturalHeight || img.height;

      // El área visible mínima es un cuadrado
      const minDimension = Math.min(imgWidth, imgHeight);
      const cropSize = minDimension / zoom;

      // Rango de desplazamiento disponible
      const maxOffsetX = imgWidth - cropSize;
      const maxOffsetY = imgHeight - cropSize;

      const sourceX = Math.max(0, Math.min(maxOffsetX, (panX / 100) * maxOffsetX));
      const sourceY = Math.max(0, Math.min(maxOffsetY, (panY / 100) * maxOffsetY));

      // Dibujar en canvas
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        cropSize,
        cropSize,
        0,
        0,
        targetSize,
        targetSize
      );

      // Convertir a blob JPEG optimizado
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
      });

      if (!blob) {
        throw new Error('No se pudo generar el archivo de imagen.');
      }

      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.jpg`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

      onChange(data.publicUrl);
      setIsCropModalOpen(false);
      setRawImageSrc(null);
      toast({ variant: 'success', title: 'Foto actualizada', description: 'La imagen ha sido encuadrada y guardada con éxito.' });
    } catch (err: any) {
      console.error('Error al encuadrar y subir foto:', err);
      toast({ variant: 'error', title: 'Error al procesar foto', description: err.message || 'Inténtalo de nuevo.' });
    } finally {
      setIsUploading(false);
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <>
      <div className={`relative flex flex-col items-center gap-2 ${className}`}>
        <div 
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`relative w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition-all ${
            value 
              ? 'border-primary shadow-md hover:ring-2 hover:ring-primary/40' 
              : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
          } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {value ? (
            <>
              <img src={value} alt="Avatar" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/45 opacity-0 hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white">
                <Camera className="w-5 h-5 mb-0.5" />
                <span className="text-[9px] font-bold">Cambiar</span>
              </div>
              <button
                type="button"
                onClick={clearImage}
                title="Eliminar foto"
                className="absolute top-0 right-0 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 shadow-sm transition-colors z-10"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400">
              {isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              ) : (
                <Camera className="w-6 h-6 mb-1" />
              )}
              <span className="text-[10px] uppercase font-bold">{isUploading ? 'Subiendo' : 'Foto'}</span>
            </div>
          )}
        </div>

        {value && (
          <button
            type="button"
            onClick={() => {
              setRawImageSrc(value);
              setZoom(1);
              setPanX(50);
              setPanY(50);
              setIsCropModalOpen(true);
            }}
            className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
          >
            <Sliders size={12} />
            Ajustar Encuadre
          </button>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* MODAL DE ENCUADRE Y RECORTE INTERACTIVO */}
      {isCropModalOpen && rawImageSrc && (
        <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div 
            className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
              <div>
                <h3 className="text-base font-black text-foreground flex items-center gap-2">
                  <Sliders size={18} className="text-primary" />
                  Ajustar Encuadre de la Foto
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Centra el rostro o la zona que deseas que se vea en el perfil.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { if (!isUploading) setIsCropModalOpen(false); }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-foreground hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Viewport Interactivo con Máscara Circular */}
            <div className="p-5 flex flex-col items-center bg-slate-950/90 select-none">
              <div 
                className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-primary/60 shadow-2xl cursor-grab active:cursor-grabbing bg-slate-900 group"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={() => setIsDragging(false)}
              >
                {/* Imagen manipulada con transformaciones */}
                <img
                  src={rawImageSrc}
                  alt="Encuadre"
                  draggable={false}
                  className="w-full h-full object-cover pointer-events-none transition-transform duration-75 ease-out"
                  style={{
                    transform: `scale(${zoom}) translate(${(50 - panX) / zoom}%, ${(50 - panY) / zoom}%)`,
                    transformOrigin: 'center center'
                  }}
                />

                {/* Guía visual en cruz central tenue */}
                <div className="absolute inset-0 pointer-events-none border border-white/20 rounded-full flex items-center justify-center">
                  <div className="w-full h-[1px] bg-white/10" />
                  <div className="h-full w-[1px] bg-white/10 absolute" />
                </div>

                {/* Tip flotante al pasar el mouse */}
                <div className="absolute bottom-3 inset-x-0 text-center pointer-events-none">
                  <span className="text-[10px] bg-black/60 text-white/90 px-2.5 py-0.5 rounded-full backdrop-blur-xs font-medium">
                    Arrastra para posicionar
                  </span>
                </div>
              </div>

              {/* Presets Rápidos de 1-Click */}
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Presets:</span>
                <button
                  type="button"
                  onClick={() => applyPreset('face')}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 btn-haptic"
                >
                  <User size={13} className="text-teal-400" />
                  Rostro
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('center')}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 btn-haptic"
                >
                  <Target size={13} className="text-indigo-400" />
                  Centro
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('body')}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 btn-haptic"
                >
                  <Shirt size={13} className="text-amber-400" />
                  Cuerpo
                </button>
              </div>
            </div>

            {/* Controles Detallados */}
            <div className="p-5 space-y-4 bg-card">
              {/* Slider de Zoom */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-foreground mb-1">
                  <span className="flex items-center gap-1.5">
                    <ZoomIn size={14} className="text-slate-400" />
                    Zoom ({zoom.toFixed(1)}x)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setZoom(prev => Math.max(1, prev - 0.1))}
                      className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                    >
                      <ZoomOut size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoom(prev => Math.min(3, prev + 0.1))}
                      className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                    >
                      <ZoomIn size={13} />
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Slider de Posición Vertical (Y) */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-foreground mb-1">
                  <span>Posición Vertical (Eje Y)</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {panY < 35 ? 'Arriba / Rostro' : panY > 65 ? 'Abajo' : 'Centro'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={panY}
                  onChange={(e) => setPanY(parseFloat(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Slider de Posición Horizontal (X) */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-foreground mb-1">
                  <span>Posición Horizontal (Eje X)</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {panX < 35 ? 'Izquierda' : panX > 65 ? 'Derecha' : 'Centro'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={panX}
                  onChange={(e) => setPanX(parseFloat(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Footer de Acciones */}
            <div className="p-4 sm:p-5 border-t border-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => {
                  setZoom(1);
                  setPanX(50);
                  setPanY(50);
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-foreground hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw size={13} />
                Restablecer
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setIsCropModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleCropAndSave}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-sm btn-haptic disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Confirmar y Guardar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
