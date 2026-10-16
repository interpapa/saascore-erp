'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { updateTenantMetadataAction } from '@/app/actions/tenant';
import { useActionActor } from '@/hooks/useActionActor';
import { X, CheckCircle2, AlertTriangle, Check, Palette } from 'lucide-react';
import { PRESET_PUBLIC_THEMES, normalizeHexColor, getContrastTextColor } from '@/lib/theme/colorUtils';

interface TenantThemeModalProps {
  tenantId: string;
  initialTheme?: { bgColor: string; btnColor: string };
  onClose: () => void;
}

export function TenantThemeModal({ tenantId, initialTheme, onClose }: TenantThemeModalProps) {
  const actor = useActionActor();
  const [bgColor, setBgColor] = useState(initialTheme?.bgColor || '#ffffff');
  const [btnColor, setBtnColor] = useState(initialTheme?.btnColor || '#0B3B24');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeBg = normalizeHexColor(bgColor, '#ffffff');
  const safeBtn = normalizeHexColor(btnColor, '#0B3B24');
  const btnTextColor = getContrastTextColor(safeBtn);
  const bgTextColor = getContrastTextColor(safeBg);

  const handleSave = async () => {
    if (!actor) {
      setError('Sesión no disponible.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await updateTenantMetadataAction(tenantId, {
        public_theme: { 
          bgColor: safeBg, 
          btnColor: safeBtn 
        }
      }, actor);
      if (!result.success) throw new Error(result.error);

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      setError(error.message || 'Ocurrió un error al guardar el tema.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Personalizar Tema Público</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-medium rounded-xl flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm font-medium rounded-xl flex items-center gap-2">
              <CheckCircle2 size={16} />
              Tema guardado con éxito.
            </div>
          )}

          {/* Paletas Prediseñadas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Paletas Recomendadas (1 Clic)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_PUBLIC_THEMES.map((preset) => {
                const isSelected = 
                  safeBg.toLowerCase() === preset.bgColor.toLowerCase() &&
                  safeBtn.toLowerCase() === preset.btnColor.toLowerCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => { setBgColor(preset.bgColor); setBtnColor(preset.btnColor); }}
                    className={`flex items-center gap-2 p-2 rounded-xl text-left border text-xs transition-all ${
                      isSelected 
                        ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-slate-50 dark:bg-slate-800' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span 
                      className="w-4 h-4 rounded-full shrink-0 border border-black/10" 
                      style={{ backgroundColor: preset.btnColor }} 
                    />
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200 text-[11px]">
                      {preset.name}
                    </span>
                    {isSelected && <Check className="w-3 h-3 text-emerald-600 ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Color de fondo</label>
                <p className="text-xs text-slate-500">Color principal de la página</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-24 px-2 py-1 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-lg text-center"
                />
                <input
                  type="color"
                  value={safeBg}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border-2 border-slate-200 p-1 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Color de botones</label>
                <p className="text-xs text-slate-500">Color de botones y elementos destacados</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={btnColor}
                  onChange={(e) => setBtnColor(e.target.value)}
                  className="w-24 px-2 py-1 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-lg text-center"
                />
                <input
                  type="color"
                  value={safeBtn}
                  onChange={(e) => setBtnColor(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border-2 border-slate-200 p-1 bg-white"
                />
              </div>
            </div>
          </div>

          <div 
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 transition-colors shadow-xs" 
            style={{ backgroundColor: safeBg }}
          >
            <p className="text-xs font-bold text-center opacity-75" style={{ color: bgTextColor }}>
              Vista Previa con Protección de Contraste
            </p>
            <div 
              className="w-full py-3 rounded-xl font-bold text-center shadow-xs transition-colors"
              style={{ backgroundColor: safeBtn, color: btnTextColor }}
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
