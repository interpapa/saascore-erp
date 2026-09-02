'use client';

import { useState, useEffect } from 'react';
import { updateBookingConfigAction } from '@/app/actions/booking';
import { useToast } from '@/components/core/ToastProvider';

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
  const [isSaving, setIsSaving] = useState(false);
  
  // Default values
  const defaultSettings = {
    openDays: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
    startHour: '09:00',
    endHour: '18:00',
    intervalMinutes: 30
  };

  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    if (tenant?.metadata?.booking_settings) {
      setSettings(tenant.metadata.booking_settings);
    }
  }, [tenant]);

  if (!isOpen) return null;

  const daysOfWeek = [
    { id: 1, name: 'Lunes' }, { id: 2, name: 'Martes' }, { id: 3, name: 'Miércoles' },
    { id: 4, name: 'Jueves' }, { id: 5, name: 'Viernes' }, { id: 6, name: 'Sábado' }, { id: 0, name: 'Domingo' }
  ];

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateBookingConfigAction(tenant.id, settings);
    
    if (result.success) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Configuración de Reservas</h2>
            <p className="text-xs font-medium text-slate-500">Ajusta cómo se ven los horarios en tu página pública</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-100 p-2 rounded-full">✕</button>
        </div>

        <div className="p-6 space-y-6">
          
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

        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
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
