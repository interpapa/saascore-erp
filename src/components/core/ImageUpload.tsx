'use client';

import { useState, useRef } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/core/ToastProvider';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
  className?: string;
}

export function ImageUpload({ value, onChange, bucket = 'avatars', folder = 'employees', className = '' }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true);
      const file = event.target.files?.[0];
      
      if (!file) {
        setIsUploading(false);
        return;
      }

      // Validar tipo
      if (!file.type.startsWith('image/')) {
        toast({ variant: 'error', title: 'Error', description: 'Por favor selecciona una imagen válida.' });
        return;
      }
      
      // Validar tamaño (Max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({ variant: 'error', title: 'Error', description: 'La imagen debe pesar menos de 5MB.' });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        throw uploadError;
      }

      // Obtener URL pública
      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

      onChange(data.publicUrl);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({ variant: 'error', title: 'Error al subir', description: error.message || 'Inténtalo de nuevo más tarde.' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className={`relative flex flex-col items-center gap-3 ${className}`}>
      <div 
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition-all ${
          value 
            ? 'border-primary shadow-md' 
            : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
        } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {value ? (
          <>
            <img src={value} alt="Avatar" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="text-white w-6 h-6" />
            </div>
            <button
              type="button"
              onClick={clearImage}
              className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors"
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
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}
