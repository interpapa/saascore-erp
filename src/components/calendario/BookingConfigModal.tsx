'use client';

import { useState, useEffect } from 'react';
import { updateBookingConfigAction } from '@/app/actions/booking';
import { useToast } from '@/components/core/ToastProvider';
import { useERPStore } from '@/store/useERPStore';
import { Palette, MessageCircle, Clock, Save, X } from 'lucide-react';

export function BookingConfigModal({ 
  isOpen, 
  onClose, 
  tenant 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  tenant: any 
}) {
  const { toast } = useToast();
  const { setCurrentTenant } = useERPStore();
  const [isSaving, setIsSaving] = useState(false);
  
  // Default values
  const defaultSettings = {
    intervalMinutes: 30,
    whatsappNumber: '', 
    resourceName: 'Profesional',
    whatsappMessageTemplate: '¡Hola! 👋 Vengo de su página web y me gustaría agendar una cita.\n\n👤 *Cliente:* {{cliente}}\n📅 *Fecha:* {{fecha}}\n⏰ *Hora:* {{hora}}\n✂️ *{{recurso}}:* {{profesional}}\n\nPor favor confirmen mi reserva. ¡Gracias!',
    themeBg: '#ffffff',
    themeBtn: '#0B3B24'
  };

  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    if (isOpen) {
      if (tenant?.metadata) {
        const dbSettings = tenant.metadata.booking_settings || {};
        const publicTheme = tenant.metadata.public_theme || {};
        
        setSettings({
          intervalMinutes: dbSettings.intervalMinutes || defaultSettings.intervalMinutes,
          whatsappNumber: dbSettings.whatsappNumber || defaultSettings.whatsappNumber,
          resourceName: dbSettings.resourceName || defaultSettings.resourceName,
          whatsappMessageTemplate: dbSettings.whatsappMessageTemplate || defaultSettings.whatsappMessageTemplate,
          themeBg: publicTheme.bgColor || defaultSettings.themeBg,
          themeBtn: publicTheme.btnColor || defaultSettings.themeBtn
        });
      } else {
        setSettings(defaultSettings);
      }
    }
  }, [isOpen, tenant]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    const payload = {
      intervalMinutes: settings.intervalMinutes,
      whatsappNumber: settings.whatsappNumber,
      resourceName: settings.resourceName,
      whatsappMessageTemplate: settings.whatsappMessageTemplate,
      publicTheme: {
        bgColor: settings.themeBg,
        btnColor: settings.themeBtn
      }
    };
    
    const result = await updateBookingConfigAction(tenant.id, payload);
    
    if (result.success && result.metadata) {
      setCurrentTenant({ ...tenant, metadata: result.metadata });
      toast({ variant: 'success', title: 'Configuración Guardada', description: 'La configuración ha sido actualizada.' });
      onClose();
    } else {
      toast({ variant: 'error', title: 'Error', description: 'No se pudo guardar la configuración.' });
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto py-10">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800 my-auto">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white">Configuración de Reservas</h2>
              <p className="text-xs font-medium text-slate-500">Ajusta tu página pública y notificaciones</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-100 dark:bg-slate-800 p-2 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {/* Apariencia / Tema */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-sm">
              <Palette className="w-4 h-4 text-emerald-600" />
              Apariencia de la Página Pública
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Color de Fondo</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={settings.themeBg}
                    onChange={e => setSettings({...settings, themeBg: e.target.value})}
                    className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent"
                  />
                  <input 
                    type="text" 
                    value={settings.themeBg}
                    onChange={e => setSettings({...settings, themeBg: e.target.value})}
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Color de Botones / Acentos</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={settings.themeBtn}
                    onChange={e => setSettings({...settings, themeBtn: e.target.value})}
                    className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent"
                  />
                  <input 
                    type="text" 
                    value={settings.themeBtn}
                    onChange={e => setSettings({...settings, themeBtn: e.target.value})}
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contacto WhatsApp */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 space-y-4">
            <h3 className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2 text-sm">
              <MessageCircle className="w-4 h-4" />
              Comunicaciones y Textos
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Terminología del Recurso</label>
                <input 
                  type="text" 
                  placeholder="Ej: Barbero, Cancha, Médico"
                  value={settings.resourceName || ''}
                  onChange={e => setSettings({...settings, resourceName: e.target.value})}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">WhatsApp del Negocio</label>
                <input 
                  type="text" 
                  placeholder="Ej: 584241234567"
                  value={settings.whatsappNumber || ''}
                  onChange={e => setSettings({...settings, whatsappNumber: e.target.value})}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Mensaje Automático del Cliente</label>
              <p className="text-[10px] text-slate-500 mb-2">Variables mágicas permitidas: <code className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 px-1 rounded">{"{{profesional}}"}</code> <code className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 px-1 rounded">{"{{fecha}}"}</code> <code className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 px-1 rounded">{"{{hora}}"}</code> <code className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 px-1 rounded">{"{{cliente}}"}</code> <code className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 px-1 rounded">{"{{recurso}}"}</code></p>
              <textarea 
                rows={5}
                value={settings.whatsappMessageTemplate}
                onChange={e => setSettings({...settings, whatsappMessageTemplate: e.target.value})}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Intervalos */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Duración de cada cita</label>
            <select 
              value={settings.intervalMinutes}
              onChange={e => setSettings({...settings, intervalMinutes: Number(e.target.value)})}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            >
              <option value={15}>15 minutos</option>
              <option value={30}>30 minutos (Recomendado)</option>
              <option value={45}>45 minutos</option>
              <option value={60}>1 hora</option>
              <option value={120}>2 horas</option>
            </select>
          </div>

        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 sticky bottom-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm">Cancelar</button>
          <button 
            disabled={isSaving}
            onClick={handleSave} 
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 shadow-md transition-colors text-sm"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}
