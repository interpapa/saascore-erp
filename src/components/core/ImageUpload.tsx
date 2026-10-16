'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Loader2, 
  X, 
  ZoomIn, 
  ZoomOut, 
  Check, 
  Sliders, 
  User, 
  Target, 
  Shirt, 
  RefreshCw, 
  Maximize2, 
  Minimize2, 
  RotateCw,
  Move
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/core/ToastProvider';

export interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
  className?: string;
  shape?: 'circle' | 'square';
}

export function ImageUpload({ 
  value, 
  onChange, 
  bucket = 'avatars', 
  folder = 'employees', 
  className = '',
  shape = 'circle'
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  
  // Transformaciones geométricas de encuadre en espacio de coordenadas Canvas (512x512)
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0); // Desplazamiento en px relativo al centro
  const [offsetY, setOffsetY] = useState(0);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
  const [bgStyle, setBgStyle] = useState<'blur' | 'dark' | 'white'>('blur');

  // Drag interactivo con refs para máxima estabilidad y rendimiento a 60fps
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ 
    x: number; 
    y: number; 
    initialOffsetX: number; 
    initialOffsetY: number;
    viewportWidth: number;
  }>({ 
    x: 0, 
    y: 0, 
    initialOffsetX: 0, 
    initialOffsetY: 0,
    viewportWidth: 288
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const loadedSrcRef = useRef<string | null>(null);
  const { toast } = useToast();

  // Redibujado del canvas en tiempo real con soporte de rotación, escalado inteligente y blur background
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageElementRef.current;
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = img.naturalWidth;
    const H = img.naturalHeight;
    const targetSize = 512;
    const centerX = targetSize / 2;
    const centerY = targetSize / 2;

    ctx.clearRect(0, 0, targetSize, targetSize);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Dimensiones efectivas según rotación
    const isRotated90or270 = rotation === 90 || rotation === 270;
    const effectiveW = isRotated90or270 ? H : W;
    const effectiveH = isRotated90or270 ? W : H;

    // Escalas de ajuste
    const coverScale = Math.max(targetSize / effectiveW, targetSize / effectiveH);
    const containScale = Math.min(targetSize / effectiveW, targetSize / effectiveH);
    const baseScale = fitMode === 'contain' ? (containScale * 0.94) : coverScale;

    const currentScale = baseScale * zoom;
    const drawW = W * currentScale;
    const drawH = H * currentScale;

    // Fondo cuando la imagen no llena los 512x512
    const renderedWidth = effectiveW * currentScale;
    const renderedHeight = effectiveH * currentScale;
    const needsBg = fitMode === 'contain' || 
                    renderedWidth < targetSize || 
                    renderedHeight < targetSize || 
                    Math.abs(offsetX) > 10 || 
                    Math.abs(offsetY) > 10;

    if (needsBg) {
      if (bgStyle === 'blur') {
        ctx.save();
        ctx.filter = 'blur(22px) brightness(0.65) saturate(1.2)';
        const blurScale = Math.max((targetSize + 60) / effectiveW, (targetSize + 60) / effectiveH);
        ctx.translate(centerX, centerY);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, (-W * blurScale) / 2, (-H * blurScale) / 2, W * blurScale, H * blurScale);
        ctx.restore();
      } else if (bgStyle === 'dark') {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, targetSize, targetSize);
      } else if (bgStyle === 'white') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetSize, targetSize);
      }
    }

    // Dibujado principal con traslación y rotación
    ctx.save();
    ctx.translate(centerX + offsetX, centerY + offsetY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }, [zoom, offsetX, offsetY, rotation, fitMode, bgStyle]);

  // Cargar imagen en memoria SÓLO cuando cambia rawImageSrc o al abrir el modal por primera vez
  useEffect(() => {
    if (!rawImageSrc || !isCropModalOpen) {
      loadedSrcRef.current = null;
      return;
    }

    // Si ya cargamos esta misma fuente de imagen en memoria, no reinicializar coordenadas
    if (loadedSrcRef.current === rawImageSrc && imageElementRef.current) {
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageElementRef.current = img;
      loadedSrcRef.current = rawImageSrc;

      // Detección automática de aspecto:
      // Si es muy vertical (móvil retrato 9:16 o 3:4), se inicia en cover con un zoom balanceado
      const ar = img.naturalWidth / img.naturalHeight;
      if (ar < 0.75) {
        setFitMode('cover');
        setZoom(1.0);
        // Pre-enfocar levemente el tercio superior para retratos de cuerpo entero
        const coverScale = Math.max(512 / img.naturalWidth, 512 / img.naturalHeight);
        const shiftY = (img.naturalHeight * 0.16) * coverScale;
        setOffsetY(Math.round(shiftY));
      } else {
        setFitMode('cover');
        setZoom(1.0);
        setOffsetY(0);
      }
      setOffsetX(0);
      setRotation(0);
    };
    img.src = rawImageSrc;
  }, [rawImageSrc, isCropModalOpen]);

  // Re-renderizado reactivo en el canvas cada vez que cambien las transformaciones
  useEffect(() => {
    if (isCropModalOpen && imageElementRef.current) {
      renderCanvas();
    }
  }, [isCropModalOpen, renderCanvas]);

  // Listeners globales para Drag interactivo libre y suave (Mouse y Touch)
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const factor = 512 / (dragStartRef.current.viewportWidth || 288);
      const deltaX = (e.clientX - dragStartRef.current.x) * factor;
      const deltaY = (e.clientY - dragStartRef.current.y) * factor;

      setOffsetX(Math.round(dragStartRef.current.initialOffsetX + deltaX));
      setOffsetY(Math.round(dragStartRef.current.initialOffsetY + deltaY));
    };

    const handleWindowMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
      }
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const factor = 512 / (dragStartRef.current.viewportWidth || 288);
      const deltaX = (touch.clientX - dragStartRef.current.x) * factor;
      const deltaY = (touch.clientY - dragStartRef.current.y) * factor;

      setOffsetX(Math.round(dragStartRef.current.initialOffsetX + deltaX));
      setOffsetY(Math.round(dragStartRef.current.initialOffsetY + deltaY));
    };

    const handleWindowTouchEnd = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: true });
    window.addEventListener('touchend', handleWindowTouchEnd);
    window.addEventListener('touchcancel', handleWindowTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);
    };
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ 
        variant: 'error', 
        title: 'Archivo inválido', 
        description: 'Por favor selecciona un archivo de imagen (JPG, PNG, WebP).' 
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({ 
        variant: 'error', 
        title: 'Archivo muy grande', 
        description: 'La imagen debe pesar menos de 20MB.' 
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        loadedSrcRef.current = null; // Reiniciar referencia para cargar la nueva imagen limpia
        setRawImageSrc(reader.result);
        setIsCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Presets de encuadre matemático dinámico
  const applyPreset = (preset: 'face' | 'center' | 'full' | 'body') => {
    const img = imageElementRef.current;
    if (!img) return;

    const W = img.naturalWidth;
    const H = img.naturalHeight;
    const isRotated90or270 = rotation === 90 || rotation === 270;
    const effectiveW = isRotated90or270 ? H : W;
    const effectiveH = isRotated90or270 ? W : H;
    const targetSize = 512;

    const coverScale = Math.max(targetSize / effectiveW, targetSize / effectiveH);

    if (preset === 'full') {
      // Ver foto completa sin recortar ningún detalle
      setFitMode('contain');
      setZoom(0.92);
      setOffsetX(0);
      setOffsetY(0);
    } else if (preset === 'face') {
      // Enfocar rostro / cabeza: calcula el tercio superior relativo a la altura real
      setFitMode('cover');
      const targetZoom = 1.35;
      const currentScale = coverScale * targetZoom;
      // La cabeza suele estar en el ~22-26% superior de la foto
      const shiftY = (effectiveH * 0.22) * currentScale;
      setZoom(targetZoom);
      setOffsetX(0);
      setOffsetY(Math.round(shiftY));
    } else if (preset === 'center') {
      // Centrado perfecto
      setFitMode('cover');
      setZoom(1.0);
      setOffsetX(0);
      setOffsetY(0);
    } else if (preset === 'body') {
      // Enfocar torso o zona media
      setFitMode('cover');
      const targetZoom = 1.05;
      const currentScale = coverScale * targetZoom;
      // Desplazar hacia arriba para mostrar el cuerpo
      const shiftY = -(effectiveH * 0.12) * currentScale;
      setZoom(targetZoom);
      setOffsetX(0);
      setOffsetY(Math.round(shiftY));
    }
  };

  // Girar 90 grados en el sentido de las agujas del reloj
  const handleRotate = () => {
    setRotation(prev => {
      const next = ((prev + 90) % 360) as 0 | 90 | 180 | 270;
      return next;
    });
    setOffsetX(0);
    setOffsetY(0);
  };

  // Inicio de Drag con Mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
    const vpWidth = viewportRef.current?.clientWidth || 288;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialOffsetX: offsetX,
      initialOffsetY: offsetY,
      viewportWidth: vpWidth
    };
  };

  // Inicio de Drag con Touch en Móviles
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      isDraggingRef.current = true;
      setIsDragging(true);
      const vpWidth = viewportRef.current?.clientWidth || 288;
      dragStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        initialOffsetX: offsetX,
        initialOffsetY: offsetY,
        viewportWidth: vpWidth
      };
    }
  };

  // Zoom interactivo con rueda del mouse
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom(prev => Math.min(3.5, Math.max(0.4, Number((prev + zoomDelta).toFixed(2)))));
  };

  // Guardar y subir a Supabase Storage con compresión de alta calidad
  const handleCropAndSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setIsUploading(true);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
      });

      if (!blob) {
        throw new Error('No se pudo procesar la imagen.');
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
      loadedSrcRef.current = null;
      toast({ 
        variant: 'success', 
        title: 'Foto actualizada con éxito', 
        description: 'La foto de perfil se encuadró y guardó con resolución nítida.' 
      });
    } catch (err: any) {
      console.error('Error al guardar foto:', err);
      toast({ 
        variant: 'error', 
        title: 'Error al procesar foto', 
        description: err.message || 'Inténtalo de nuevo o verifica tu conexión.' 
      });
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
          className={`relative w-24 h-24 ${shape === 'circle' ? 'rounded-full' : 'rounded-2xl'} border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition-all ${
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
              loadedSrcRef.current = null;
              setRawImageSrc(value);
              setIsCropModalOpen(true);
            }}
            className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
          >
            <Sliders size={12} />
            Reencuadrar Foto
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

      {/* MODAL DE ENCUADRE Y RECORTE PROFESIONAL WYSIWYG */}
      {isCropModalOpen && rawImageSrc && (
        <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div 
            className="bg-card border border-border w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200 flex flex-col max-h-[94vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
              <div className="pr-4">
                <h3 className="text-base font-black text-foreground flex items-center gap-2">
                  <Sliders size={18} className="text-primary" />
                  Editor de Foto de Perfil
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Arrastra libremente, ajusta el zoom o usa los botones inteligentes para el encuadre perfecto.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { if (!isUploading) setIsCropModalOpen(false); }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-foreground hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4">
              
              {/* Botones de Modo Base (Llenar Círculo vs Foto Completa) */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-border">
                <button
                  type="button"
                  onClick={() => applyPreset('full')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    fitMode === 'contain'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-slate-500 hover:text-foreground'
                  }`}
                >
                  <Minimize2 size={14} className="text-teal-500" />
                  <span>Ver Foto Completa</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('center')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    fitMode === 'cover'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-slate-500 hover:text-foreground'
                  }`}
                >
                  <Maximize2 size={14} className="text-indigo-500" />
                  <span>Llenar Avatar (Cover)</span>
                </button>
              </div>

              {/* Viewport Interactivo con Canvas y Máscara Visual Tipo WhatsApp / Google */}
              <div className="flex flex-col items-center bg-slate-950 p-5 rounded-3xl border border-slate-800 select-none relative">
                <div 
                  ref={viewportRef}
                  className="relative w-64 h-64 sm:w-72 sm:h-72 overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing group select-none rounded-2xl touch-none"
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                  onWheel={handleWheel}
                  title="Arrastra para mover la imagen · Usa la rueda del mouse o el slider para zoom"
                >
                  {/* Canvas de procesamiento 512x512 */}
                  <canvas
                    ref={canvasRef}
                    width={512}
                    height={512}
                    className="w-full h-full object-cover pointer-events-none"
                  />

                  {/* Overlay con Máscara Circular y Guías de Regla de los Tercios */}
                  {shape === 'circle' ? (
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Máscara oscura exterior al círculo */}
                      <svg className="w-full h-full absolute inset-0" viewBox="0 0 100 100">
                        <defs>
                          <mask id="avatar-circle-mask">
                            <rect width="100" height="100" fill="white" />
                            <circle cx="50" cy="50" r="48" fill="black" />
                          </mask>
                        </defs>
                        <rect 
                          width="100" 
                          height="100" 
                          fill="rgba(0, 0, 0, 0.55)" 
                          mask="url(#avatar-circle-mask)" 
                        />
                        {/* Borde exterior del círculo */}
                        <circle 
                          cx="50" 
                          cy="50" 
                          r="48" 
                          fill="none" 
                          stroke="rgba(255, 255, 255, 0.7)" 
                          strokeWidth="0.8" 
                          strokeDasharray="2 1"
                        />
                      </svg>

                      {/* Guías tenues en cruz / regla de los tercios */}
                      <div className="absolute inset-2.5 rounded-full border border-white/20 flex items-center justify-center pointer-events-none">
                        <div className="w-full h-[1px] bg-white/10" />
                        <div className="h-full w-[1px] bg-white/10 absolute" />
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-white/60 rounded-2xl" />
                  )}

                  {/* Badge flotante indicador */}
                  <div className="absolute bottom-2.5 inset-x-0 text-center pointer-events-none">
                    <span className="text-[10px] bg-black/75 text-white/90 px-3 py-0.5 rounded-full backdrop-blur-xs font-medium inline-flex items-center gap-1 shadow-sm border border-white/10">
                      <Move size={10} /> Arrastra libremente para reubicar
                    </span>
                  </div>
                </div>

                {/* Barra de Presets y Rotación */}
                <div className="mt-4 flex items-center gap-1.5 flex-wrap justify-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Enfoque:</span>
                  
                  <button
                    type="button"
                    onClick={() => applyPreset('face')}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 btn-haptic"
                    title="Centrar y enfocar el rostro en la parte superior"
                  >
                    <User size={12} className="text-indigo-400" />
                    Rostro
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('body')}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 btn-haptic"
                    title="Enfocar torso o plano medio"
                  >
                    <Shirt size={12} className="text-pink-400" />
                    Cuerpo
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('center')}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 btn-haptic"
                    title="Centrar foto en el medio"
                  >
                    <Target size={12} className="text-amber-400" />
                    Centro
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('full')}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 btn-haptic"
                    title="Ver imagen completa sin ningún corte"
                  >
                    <Minimize2 size={12} className="text-teal-400" />
                    Completa
                  </button>

                  <button
                    type="button"
                    onClick={handleRotate}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 btn-haptic text-sky-400"
                    title="Girar foto 90 grados"
                  >
                    <RotateCw size={12} />
                    Girar 90°
                  </button>
                </div>
              </div>

              {/* Controles de Precisión (Zoom y Posición) */}
              <div className="space-y-3.5 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-border">
                {/* Slider de Zoom con botones +/- */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-foreground mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <ZoomIn size={14} className="text-slate-400" />
                      Zoom / Escala: <strong className="text-primary font-mono">{Math.round(zoom * 100)}%</strong>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setZoom(prev => Math.max(0.4, Number((prev - 0.1).toFixed(2))))}
                        className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                        title="Alejar foto"
                      >
                        <ZoomOut size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoom(prev => Math.min(3.5, Number((prev + 0.1).toFixed(2))))}
                        className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                        title="Acercar foto"
                      >
                        <ZoomIn size={13} />
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="3.5"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-primary h-2 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                    <span>Alejar (Foto Completa)</span>
                    <span>100% (Estándar)</span>
                    <span>Primer Plano</span>
                  </div>
                </div>

                {/* Slider Fino de Desplazamiento Vertical */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-foreground mb-1">
                    <span>Ajuste Fino Vertical</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {offsetY > 30 ? 'Enfocado Arriba' : offsetY < -30 ? 'Enfocado Abajo' : 'Centrado'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-300"
                    max="300"
                    step="2"
                    value={offsetY}
                    onChange={(e) => setOffsetY(parseFloat(e.target.value))}
                    className="w-full accent-primary h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Slider Fino de Desplazamiento Horizontal */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-foreground mb-1">
                    <span>Ajuste Fino Horizontal</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {offsetX < -30 ? 'Izquierda' : offsetX > 30 ? 'Derecha' : 'Centrado'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-300"
                    max="300"
                    step="2"
                    value={offsetX}
                    onChange={(e) => setOffsetX(parseFloat(e.target.value))}
                    className="w-full accent-primary h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Opciones de Fondo al alejar */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs flex-wrap gap-2">
                  <span className="font-bold text-slate-500">Fondo al alejar la foto:</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBgStyle('blur')}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                        bgStyle === 'blur' 
                          ? 'bg-primary/10 text-primary border-primary/40 shadow-xs' 
                          : 'bg-card text-slate-500 border-border hover:text-foreground'
                      }`}
                    >
                      ✨ Desenfoque Artístico
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgStyle('dark')}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                        bgStyle === 'dark' 
                          ? 'bg-primary/10 text-primary border-primary/40 shadow-xs' 
                          : 'bg-card text-slate-500 border-border hover:text-foreground'
                      }`}
                    >
                      Oscuro
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgStyle('white')}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                        bgStyle === 'white' 
                          ? 'bg-primary/10 text-primary border-primary/40 shadow-xs' 
                          : 'bg-card text-slate-500 border-border hover:text-foreground'
                      }`}
                    >
                      Blanco
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer de Acciones */}
            <div className="p-4 sm:p-5 border-t border-border flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => {
                  setFitMode('cover');
                  setZoom(1.0);
                  setOffsetX(0);
                  setOffsetY(0);
                  setRotation(0);
                  setBgStyle('blur');
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
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-sm btn-haptic disabled:opacity-50"
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
