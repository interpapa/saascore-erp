'use client';

import { useState, useEffect } from 'react';
import { updateBookingConfigAction } from '@/app/actions/booking';
import { useToast } from '@/components/core/ToastProvider';
import { useERPStore } from '@/store/useERPStore';

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
    openDays: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
    startHour: '09:00',
    endHour: '18:00',
    intervalMinutes: 30,
    whatsappNumber: '', // Ej: 584241234567
    whatsappMessageTemplate: '¡Hola! Quiero confirmar mi reserva con {{barbero}} para el día {{fecha}} a las {{hora}}. Mi nombre es {{cliente}}.'
  };

  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    if (isOpen) {
      if (tenant?.metadata?.booking_settings) {
        const dbSettings = tenant.metadata.booking_settings;
        setSettings({
          openDays: Array.isArray(dbSettings.openDays) ? dbSettings.openDays : defaultSettings.openDays,
          startHour: dbSettings.startHour || defaultSettings.startHour,
          endHour: dbSettings.endHour || defaultSettings.endHour,
          intervalMinutes: dbSettings.intervalMinutes || defaultSettings.intervalMinutes,
          whatsappNumber: dbSettings.whatsappNumber || defaultSettings.whatsappNumber,
          whatsappMessageTemplate: dbSettings.whatsappMessageTemplate || defaultSettings.whatsappMessageTemplate
        });
      } else {
        setSettings(defaultSettings);
      }
    }
  }, [isOpen, tenant]);

  if (!isOpen) return null;

  const daysOfWeek = [
    { id: 1, name: 'Lunes' }, { id: 2, name: 'Martes' }, { id: 3, name: 'Miércoles' },
    { id: 4, name: 'Jueves' }, { id: 5, name: 'Viernes' }, { id: 6, name: 'Sábado' }, { id: 0, name: 'Domingo' }
  ];

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateBookingConfigAction(tenant.id, settings);
    
    if (result.success && result.metadata) {
      setCurrentTenant({ ...tenant, metadata: result.metadata });
      toast({ variant: 'success', title: 'Configuración Guardada', description: 'Los horarios públicos han sido actualizados.' });
      onClose();
    } else {
      toast({ variant: 'error', title: 'Error', description: 'No se pudo guardar la configuración.' });
    }
    setIsSaving(false);
  };

  const toggleDay = (dayId: number) => {
    if (settings.openDays.includes(dayId)) {
      setSettings({ ...settings, openDays: settings.openDays.filter(d => d !== dayId) });
    } else {
      setSettings({ ...settings, openDays: [...settings.openDays, dayId] });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto py-10">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800 my-auto">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Configuración de Reservas</h2>
            <p className="text-xs font-medium text-slate-500">Ajusta tu página pública y notificaciones</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-100 p-2 rounded-full">✕</button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {/* Contacto WhatsApp */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 space-y-4">
            <h3 className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              Notificaciones de WhatsApp
            </h3>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Número de Teléfono (Con código de país, sin el +)</label>
              <input 
                type="text" 
                placeholder="Ej: 584241234567"
                value={settings.whatsappNumber || ''}
                onChange={e => setSettings({...settings, whatsappNumber: e.target.value})}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Mensaje Automático del Cliente</label>
              <p className="text-[10px] text-slate-500 mb-2">Variables mágicas permitidas: <code className="bg-emerald-100 text-emerald-700 px-1 rounded">{"{{barbero}}"}</code> <code className="bg-emerald-100 text-emerald-700 px-1 rounded">{"{{fecha}}"}</code> <code className="bg-emerald-100 text-emerald-700 px-1 rounded">{"{{hora}}"}</code> <code className="bg-emerald-100 text-emerald-700 px-1 rounded">{"{{cliente}}"}</code></p>
              <textarea 
                rows={3}
                value={settings.whatsappMessageTemplate}
                onChange={e => setSettings({...settings, whatsappMessageTemplate: e.target.value})}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />
          
          {/* Días Laborables */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Días Laborables</label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map(day => (
                <button
                  key={day.id}
                  onClick={() => toggleDay(day.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${settings.openDays.includes(day.id) ? 'bg-[#0B3B24] text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  {day.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Hora Inicio */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Hora de Apertura</label>
              <input 
                type="time" 
                value={settings.startHour}
                onChange={e => setSettings({...settings, startHour: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B3B24]"
              />
            </div>
            {/* Hora Cierre */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Hora de Cierre</label>
              <input 
                type="time" 
                value={settings.endHour}
                onChange={e => setSettings({...settings, endHour: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B3B24]"
              />
            </div>
          </div>

          {/* Intervalos */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Duración de cada cita</label>
            <select 
              value={settings.intervalMinutes}
              onChange={e => setSettings({...settings, intervalMinutes: Number(e.target.value)})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B3B24]"
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
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancelar</button>
          <button 
            disabled={isSaving}
            onClick={handleSave} 
            className="px-6 py-2.5 rounded-xl font-bold text-white bg-[#0B3B24] hover:bg-[#072617] disabled:opacity-70 shadow-md transition-colors"
          >
            {isSaving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}
