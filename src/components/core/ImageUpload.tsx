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
  Sparkles,
  Move
} from 'lucide-react';
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
  
  // Controles de encuadre en espacio de coordenadas Canvas (512x512)
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0); // Desplazamiento en px relativo al centro
  const [offsetY, setOffsetY] = useState(0);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
  const [bgStyle, setBgStyle] = useState<'blur' | 'dark' | 'white'>('blur');

  // Drag interactivo sobre el canvas
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; initialOffsetX: number; initialOffsetY: number }>({ 
    x: 0, 
    y: 0, 
    initialOffsetX: 0, 
    initialOffsetY: 0 
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const { toast } = useToast();

  // Función principal para redibujar el canvas en tiempo real (WYSIWYG 1:1)
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

    // 1. Escala base según modo de ajuste
    const coverScale = Math.max(targetSize / W, targetSize / H);
    const containScale = Math.min(targetSize / W, targetSize / H);
    const baseScale = fitMode === 'contain' ? containScale : coverScale;

    const currentScale = baseScale * zoom;
    const destW = W * currentScale;
    const destH = H * currentScale;
    const destX = centerX - (destW / 2) + offsetX;
    const destY = centerY - (destH / 2) + offsetY;

    // 2. Fondo cuando la foto no llena los 512x512 (por ejemplo al alejar o en modo contain)
    const needsBg = destW < targetSize || destH < targetSize || destX > 0 || destY > 0 || (destX + destW) < targetSize || (destY + destH) < targetSize;
    
    if (needsBg) {
      if (bgStyle === 'blur') {
        ctx.save();
        ctx.filter = 'blur(18px) brightness(0.65)';
        ctx.drawImage(img, -20, -20, targetSize + 40, targetSize + 40);
        ctx.restore();
      } else if (bgStyle === 'dark') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, targetSize, targetSize);
      } else if (bgStyle === 'white') {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, targetSize, targetSize);
      }
    }

    // 3. Dibujar la imagen principal
    ctx.drawImage(img, destX, destY, destW, destH);
  }, [zoom, offsetX, offsetY, fitMode, bgStyle]);

  // Cargar imagen en memoria cuando se abre el modal
  useEffect(() => {
    if (!rawImageSrc || !isCropModalOpen) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageElementRef.current = img;

      // Si la foto es muy vertical (como fotos de celular 9:16 o 3:4),
      // iniciar en modo 'contain' o con un zoom suave para que no aparezca cortada
      const ar = img.naturalWidth / img.naturalHeight;
      if (ar < 0.8) {
        setFitMode('contain');
        setZoom(1.0);
      } else {
        setFitMode('cover');
        setZoom(1.0);
      }
      setOffsetX(0);
      setOffsetY(0);
      renderCanvas();
    };
    img.src = rawImageSrc;
  }, [rawImageSrc, isCropModalOpen, renderCanvas]);

  // Re-renderizar al cambiar cualquier control
  useEffect(() => {
    if (isCropModalOpen) {
      renderCanvas();
    }
  }, [isCropModalOpen, renderCanvas]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: 'error', title: 'Archivo inválido', description: 'Por favor selecciona un archivo de imagen (JPG, PNG, WebP).' });
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast({ variant: 'error', title: 'Archivo muy grande', description: 'La imagen debe pesar menos de 15MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setRawImageSrc(reader.result);
        setIsCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Presets de encuadre con 1 toque
  const applyPreset = (preset: 'face' | 'center' | 'full' | 'body') => {
    const img = imageElementRef.current;
    if (!img) return;

    if (preset === 'full') {
      // Ver foto completa sin recortar absolutamente nada
      setFitMode('contain');
      setZoom(0.95);
      setOffsetX(0);
      setOffsetY(0);
    } else if (preset === 'face') {
      // Enfocar rostro / parte superior
      setFitMode('cover');
      setZoom(1.25);
      setOffsetX(0);
      setOffsetY(120); // Mueve la imagen hacia abajo para centrar la cara arriba
    } else if (preset === 'center') {
      // Centrado estándar
      setFitMode('cover');
      setZoom(1.0);
      setOffsetX(0);
      setOffsetY(0);
    } else if (preset === 'body') {
      // Enfocar abajo
      setFitMode('cover');
      setZoom(1.05);
      setOffsetX(0);
      setOffsetY(-110);
    }
  };

  // Drag interactivo sobre el canvas (Mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialOffsetX: offsetX,
      initialOffsetY: offsetY
    };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    // La vista en pantalla es de 256px y el canvas interno es de 512px (factor 2)
    const factor = 2;
    const deltaX = (e.clientX - dragStartRef.current.x) * factor;
    const deltaY = (e.clientY - dragStartRef.current.y) * factor;

    setOffsetX(dragStartRef.current.initialOffsetX + deltaX);
    setOffsetY(dragStartRef.current.initialOffsetY + deltaY);
  }, [isDragging]);

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

  // Touch Drag para móviles
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      dragStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        initialOffsetX: offsetX,
        initialOffsetY: offsetY
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const factor = 2;
    const deltaX = (touch.clientX - dragStartRef.current.x) * factor;
    const deltaY = (touch.clientY - dragStartRef.current.y) * factor;

    setOffsetX(dragStartRef.current.initialOffsetX + deltaX);
    setOffsetY(dragStartRef.current.initialOffsetY + deltaY);
  };

  // Zoom con rueda del ratón
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom(prev => Math.min(3.0, Math.max(0.35, Number((prev + zoomDelta).toFixed(2)))));
  };

  // Guardar y subir a Supabase Storage
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
      toast({ 
        variant: 'success', 
        title: 'Foto guardada', 
        description: 'La imagen ha sido encuadrada y guardada con la máxima nitidez.' 
      });
    } catch (err: any) {
      console.error('Error al guardar foto:', err);
      toast({ 
        variant: 'error', 
        title: 'Error al procesar', 
        description: err.message || 'Inténtalo de nuevo.' 
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

      {/* MODAL DE ENCUADRE Y RECORTE INTERACTIVO EN TIEMPO REAL */}
      {isCropModalOpen && rawImageSrc && (
        <div className="fixed inset-0 z-70 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div 
            className="bg-card border border-border w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
              <div className="pr-4">
                <h3 className="text-base font-black text-foreground flex items-center gap-2">
                  <Sliders size={18} className="text-primary" />
                  Ajustar y Encuadrar Foto de Perfil
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Aleja para ver la foto completa o amplía para enfocar el rostro. Arrastra directamente sobre el círculo.
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
              {/* Botones de Modo Rápido (Llenar vs Completa) */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-border">
                <button
                  type="button"
                  onClick={() => {
                    setFitMode('contain');
                    setZoom(0.95);
                    setOffsetX(0);
                    setOffsetY(0);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    fitMode === 'contain'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-slate-500 hover:text-foreground'
                  }`}
                >
                  <Minimize2 size={14} className="text-teal-500" />
                  <span>Ver Foto Completa (Fit)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFitMode('cover');
                    setZoom(1.0);
                    setOffsetX(0);
                    setOffsetY(0);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    fitMode === 'cover'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-slate-500 hover:text-foreground'
                  }`}
                >
                  <Maximize2 size={14} className="text-indigo-500" />
                  <span>Llenar Círculo (Cover)</span>
                </button>
              </div>

              {/* Viewport Interactivo con Canvas Real-Time */}
              <div className="flex flex-col items-center bg-slate-950 p-6 rounded-3xl border border-slate-800 select-none relative">
                <div 
                  className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-primary shadow-2xl cursor-grab active:cursor-grabbing group"
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={() => setIsDragging(false)}
                  onWheel={handleWheel}
                  title="Arrastra para mover la imagen · Usa la rueda del mouse para zoom"
                >
                  {/* Canvas de alta fidelidad WYSIWYG */}
                  <canvas
                    ref={canvasRef}
                    width={512}
                    height={512}
                    className="w-full h-full object-cover"
                  />

                  {/* Guía visual tenue en cruz */}
                  <div className="absolute inset-0 pointer-events-none border border-white/20 rounded-full flex items-center justify-center">
                    <div className="w-full h-[1px] bg-white/10" />
                    <div className="h-full w-[1px] bg-white/10 absolute" />
                  </div>

                  {/* Badge de ayuda al posarse */}
                  <div className="absolute bottom-2 inset-x-0 text-center pointer-events-none">
                    <span className="text-[10px] bg-black/70 text-white/90 px-2.5 py-0.5 rounded-full backdrop-blur-xs font-medium inline-flex items-center gap-1 shadow-sm">
                      <Move size={10} /> Arrastra para mover
                    </span>
                  </div>
                </div>

                {/* Presets Rápidos de 1-Clic */}
                <div className="mt-4 flex items-center gap-1.5 flex-wrap justify-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Enfoque:</span>
                  <button
                    type="button"
                    onClick={() => applyPreset('full')}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1 border border-slate-700 btn-haptic"
                    title="Alejar para que se vea toda la persona o foto sin recortar"
                  >
                    <Minimize2 size={12} className="text-teal-400" />
                    Completa
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('face')}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1 border border-slate-700 btn-haptic"
                    title="Ampliar y enfocar en la parte superior (rostro)"
                  >
                    <User size={12} className="text-indigo-400" />
                    Rostro
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('center')}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1 border border-slate-700 btn-haptic"
                    title="Centrar en el medio"
                  >
                    <Target size={12} className="text-amber-400" />
                    Centro
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('body')}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1 border border-slate-700 btn-haptic"
                    title="Enfocar la parte inferior"
                  >
                    <Shirt size={12} className="text-pink-400" />
                    Cuerpo
                  </button>
                </div>
              </div>

              {/* Controles Deslizadores */}
              <div className="space-y-3.5 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-border">
                {/* Slider de Zoom con soporte para alejar desde 0.35x */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-foreground mb-1">
                    <span className="flex items-center gap-1.5">
                      <ZoomIn size={14} className="text-slate-400" />
                      Zoom / Escala ({(zoom * 100).toFixed(0)}%)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setZoom(prev => Math.max(0.35, Number((prev - 0.1).toFixed(2))))}
                        className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
                        title="Alejar foto"
                      >
                        <ZoomOut size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoom(prev => Math.min(3.0, Number((prev + 0.1).toFixed(2))))}
                        className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
                        title="Acercar foto"
                      >
                        <ZoomIn size={13} />
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.35"
                    max="3.0"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-primary h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                    <span>Alejar (Ver completa)</span>
                    <span>100%</span>
                    <span>Primer Plano</span>
                  </div>
                </div>

                {/* Slider Posición Vertical */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-foreground mb-1">
                    <span>Posición Vertical</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {offsetY > 40 ? 'Enfocado Arriba' : offsetY < -40 ? 'Enfocado Abajo' : 'Centrado'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-250"
                    max="250"
                    step="2"
                    value={offsetY}
                    onChange={(e) => setOffsetY(parseFloat(e.target.value))}
                    className="w-full accent-primary h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Slider Posición Horizontal */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-foreground mb-1">
                    <span>Posición Horizontal</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {offsetX < -40 ? 'Izquierda' : offsetX > 40 ? 'Derecha' : 'Centrado'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-250"
                    max="250"
                    step="2"
                    value={offsetX}
                    onChange={(e) => setOffsetX(parseFloat(e.target.value))}
                    className="w-full accent-primary h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Estilo de Fondo al alejar */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500">Fondo al alejar la foto:</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBgStyle('blur')}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border ${
                        bgStyle === 'blur' 
                          ? 'bg-primary/10 text-primary border-primary/40' 
                          : 'bg-card text-slate-500 border-border'
                      }`}
                    >
                      ✨ Difuminado
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgStyle('dark')}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border ${
                        bgStyle === 'dark' 
                          ? 'bg-primary/10 text-primary border-primary/40' 
                          : 'bg-card text-slate-500 border-border'
                      }`}
                    >
                      Oscuro
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgStyle('white')}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border ${
                        bgStyle === 'white' 
                          ? 'bg-primary/10 text-primary border-primary/40' 
                          : 'bg-card text-slate-500 border-border'
                      }`}
                    >
                      Blanco
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer de Acciones */}
            <div className="p-4 sm:p-5 border-t border-border flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => {
                  setFitMode('contain');
                  setZoom(0.95);
                  setOffsetX(0);
                  setOffsetY(0);
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
