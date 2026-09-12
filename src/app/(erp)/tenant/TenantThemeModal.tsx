'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { updateTenantMetadataAction } from '@/app/actions/tenant';
import { useToast } from '@/components/ui/use-toast';
import { X } from 'lucide-react';

interface TenantThemeModalProps {
  tenantId: string;
  initialTheme?: { bgColor: string; btnColor: string };
  onClose: () => void;
}

export function TenantThemeModal({ tenantId, initialTheme, onClose }: TenantThemeModalProps) {
  const [bgColor, setBgColor] = useState(initialTheme?.bgColor || '#ffffff');
  const [btnColor, setBtnColor] = useState(initialTheme?.btnColor || '#0B3B24');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const result = await updateTenantMetadataAction(tenantId, {
        public_theme: { bgColor, btnColor }
      }, null);
      if (!result.success) throw new Error(result.error);

      toast({
        title: 'Tema actualizado',
        description: 'Los colores de tu página pública se han guardado exitosamente.',
      });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Ocurrió un error al guardar el tema.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-800">Personalizar Tema Público</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-bold text-slate-700">Color de fondo</label>
                <p className="text-xs text-slate-500">Color principal de la página</p>
              </div>
              <div className="relative">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-12 h-12 rounded-xl cursor-pointer border-2 border-slate-200 p-1 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-bold text-slate-700">Color de botones</label>
                <p className="text-xs text-slate-500">Color de botones y elementos destacados</p>
              </div>
              <div className="relative">
                <input
                  type="color"
                  value={btnColor}
                  onChange={(e) => setBtnColor(e.target.value)}
                  className="w-12 h-12 rounded-xl cursor-pointer border-2 border-slate-200 p-1 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 space-y-3" style={{ backgroundColor: bgColor }}>
            <p className="text-xs font-bold text-center opacity-70" style={{ color: btnColor }}>Vista Previa</p>
            <div 
              className="w-full py-3 rounded-xl font-bold text-center text-white shadow-sm"
              style={{ backgroundColor: btnColor }}
            >
              Botón Principal
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}
