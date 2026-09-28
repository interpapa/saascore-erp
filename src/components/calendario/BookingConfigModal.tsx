'use client';

import { useState, useEffect } from 'react';
import { updateBookingConfigAction } from '@/app/actions/booking';
import { useToast } from '@/components/core/ToastProvider';
import { useERPStore } from '@/store/useERPStore';
import { useActionActor } from '@/hooks/useActionActor';
import { Palette, MessageCircle, Clock, Save, X, DollarSign, Image as ImageIcon, Sparkles } from 'lucide-react';

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
  const actor = useActionActor();
  const [isSaving, setIsSaving] = useState(false);
  
  // Default values
  const defaultSettings = {
    intervalMinutes: 30,
    maxDaysInAdvance: 14,
    whatsappNumber: '', 
    resourceName: 'Profesional',
    whatsappMessageTemplate: '¡Hola! 👋 Vengo de su página web y me gustaría agendar una cita.\n\n👤 *Cliente:* {{cliente}}\n📅 *Fecha:* {{fecha}}\n⏰ *Hora:* {{hora}}\n✂️ *{{recurso}}:* {{profesional}}\n\nPor favor confirmen mi reserva. ¡Gracias!',
    themeBg: '#ffffff',
    themeBtn: '#0B3B24',
    showPricesOnBookingPage: true,
    noPriceLabel: 'A convenir',
    logoUrl: '',
    headerTitle: '',
    headerSubtitle: ''
  };

  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    if (isOpen) {
      if (tenant?.metadata) {
        const dbSettings = tenant.metadata.booking_settings || {};
        const publicTheme = tenant.metadata.public_theme || {};
        
        setSettings({
          intervalMinutes: dbSettings.intervalMinutes || defaultSettings.intervalMinutes,
          maxDaysInAdvance: dbSettings.maxDaysInAdvance || defaultSettings.maxDaysInAdvance,
          whatsappNumber: dbSettings.whatsappNumber || (tenant.metadata as any)?.phone || (tenant as any)?.phone || defaultSettings.whatsappNumber,
          resourceName: dbSettings.resourceName || defaultSettings.resourceName,
          whatsappMessageTemplate: dbSettings.whatsappMessageTemplate || defaultSettings.whatsappMessageTemplate,
          themeBg: publicTheme.bgColor || defaultSettings.themeBg,
          themeBtn: publicTheme.btnColor || defaultSettings.themeBtn,
          showPricesOnBookingPage: dbSettings.showPricesOnBookingPage !== false,
          noPriceLabel: dbSettings.noPriceLabel || defaultSettings.noPriceLabel,
          logoUrl: dbSettings.logoUrl || publicTheme.logoUrl || (tenant.metadata as any)?.logo_url || '',
          headerTitle: dbSettings.headerTitle || '',
          headerSubtitle: dbSettings.headerSubtitle || ''
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
      maxDaysInAdvance: settings.maxDaysInAdvance,
      whatsappNumber: settings.whatsappNumber,
      resourceName: settings.resourceName,
      whatsappMessageTemplate: settings.whatsappMessageTemplate,
      showPricesOnBookingPage: settings.showPricesOnBookingPage,
      noPriceLabel: settings.noPriceLabel,
      logoUrl: settings.logoUrl.trim(),
      headerTitle: settings.headerTitle.trim(),
      headerSubtitle: settings.headerSubtitle.trim(),
      publicTheme: {
        bgColor: settings.themeBg,
        btnColor: settings.themeBtn,
        logoUrl: settings.logoUrl.trim()
      }
    };
    
    if (!actor) {
      toast({ variant: 'error', title: 'Error de autenticación', description: 'No se detectó una sesión activa con token de seguridad.' });
      setIsSaving(false);
      return;
    }

    const result = await updateBookingConfigAction(tenant.id, payload, actor);
    
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
          
          {/* Identidad de Marca y Portada Pública */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Identidad de Marca y Portada de Reservas
            </h3>
            
            {/* Logo de la Empresa */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Logo de la Empresa (URL de Imagen)
                </label>
                {settings.logoUrl && (
                  <button 
                    type="button" 
                    onClick={() => setSettings({ ...settings, logoUrl: '' })} 
                    className="text-[11px] text-red-500 hover:underline font-medium"
                  >
                    Quitar logo
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                  {settings.logoUrl ? (
                    <img 
                      src={settings.logoUrl} 
                      alt="Logo Preview" 
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <input 
                  type="url" 
                  placeholder="https://ejemplo.com/logo.png"
                  value={settings.logoUrl}
                  onChange={e => setSettings({ ...settings, logoUrl: e.target.value })}
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Pega el enlace directo a tu logo (PNG, JPG o SVG). Se mostrará en la cabecera destacada de la página de reservas.
              </p>
            </div>

            {/* Título de la Portada */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Título Principal de la Portada
              </label>
              <input 
                type="text" 
                placeholder={`Por defecto: ${tenant?.name || 'Nombre del negocio'}`}
                value={settings.headerTitle}
                onChange={e => setSettings({ ...settings, headerTitle: e.target.value })}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Nombre o frase principal que encabeza tu página pública (Ej: Centro Odontológico Sonrisas, Barbería Deluxe). Si lo dejas vacío, usa el nombre de la empresa.
              </p>
            </div>

            {/* Subtítulo / Mensaje de Bienvenida */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Texto Secundario / Mensaje de Bienvenida
              </label>
              <input 
                type="text" 
                placeholder="Por defecto: ¿Qué necesitas hoy? Selecciona el servicio."
                value={settings.headerSubtitle}
                onChange={e => setSettings({ ...settings, headerSubtitle: e.target.value })}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Frase o instrucción para los clientes antes de seleccionar su turno o tratamiento.
              </p>
            </div>
          </div>

          {/* Apariencia / Tema */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-sm">
              <Palette className="w-4 h-4 text-emerald-600" />
              Colores de la Página Pública
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
                <p className="text-[11px] text-slate-500 mt-1">Número donde recibirás los avisos de reservas (con código de país, ej. 584241234567).</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Mensaje Automático de WhatsApp</label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Personalizable</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Toca los botones para insertar datos automáticos en el mensaje:
              </p>
              
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, whatsappMessageTemplate: prev.whatsappMessageTemplate + ' {{cliente}}' }))}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors"
                >
                  + Nombre Cliente
                </button>
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, whatsappMessageTemplate: prev.whatsappMessageTemplate + ' {{fecha}}' }))}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors"
                >
                  + Fecha
                </button>
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, whatsappMessageTemplate: prev.whatsappMessageTemplate + ' {{hora}}' }))}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors"
                >
                  + Hora
                </button>
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, whatsappMessageTemplate: prev.whatsappMessageTemplate + ' {{servicio}}' }))}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors"
                >
                  + Servicio
                </button>
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, whatsappMessageTemplate: prev.whatsappMessageTemplate + ' {{profesional}}' }))}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors"
                >
                  + Especialista / Cancha
                </button>
              </div>

              <textarea 
                rows={4}
                value={settings.whatsappMessageTemplate}
                onChange={e => setSettings({...settings, whatsappMessageTemplate: e.target.value})}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans leading-relaxed mt-2"
              />

              {/* Vista previa en vivo estilo WhatsApp */}
              <div className="mt-3 bg-[#EFEAE2] dark:bg-slate-950 p-3 rounded-2xl border border-emerald-200/50 dark:border-emerald-900/40">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <span>📱 Vista Previa en WhatsApp del Cliente:</span>
                </p>
                <div className="bg-white dark:bg-emerald-950/50 text-slate-800 dark:text-slate-100 p-3 rounded-xl rounded-tr-none shadow-xs text-xs whitespace-pre-wrap leading-relaxed border border-emerald-100 dark:border-emerald-900/50">
                  {settings.whatsappMessageTemplate
                    .replace(/{{profesional}}/g, 'Carlos Mendoza (o Cancha #1)')
                    .replace(/{{fecha}}/g, '2026-09-18')
                    .replace(/{{hora}}/g, '10:30 AM')
                    .replace(/{{cliente}}/g, 'Pedro Gómez')
                    .replace(/{{servicio}}/g, 'Servicio General')
                    .replace(/{{recurso}}/g, settings.resourceName || 'Profesional')
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Control y Visibilidad de Precios al Público */}
          <div className="bg-amber-50/70 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4" />
                  Precios en la Página Pública
                </h3>
                <p className="text-[11px] text-slate-500">
                  Elige si los clientes ven los precios o si prefieres agendar turnos de forma discreta (modo consulta o presupuesto personalizado).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, showPricesOnBookingPage: !prev.showPricesOnBookingPage }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${settings.showPricesOnBookingPage ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition ${settings.showPricesOnBookingPage ? 'translate-x-2.5' : '-translate-x-2.5'}`} />
              </button>
            </div>

            {!settings.showPricesOnBookingPage && (
              <div className="p-2.5 bg-white/70 dark:bg-slate-900/70 rounded-xl border border-amber-200/50 text-xs text-amber-800 dark:text-amber-200">
                🔒 <strong>Modo Discreto Activado:</strong> Los clientes podrán agendar sus turnos normalmente, pero no verán montos ni tarifas en la web. Ideal para consultas, servicios a medida o tarifas personalizadas.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Texto para servicios a convenir</label>
                <input
                  type="text"
                  placeholder="Ej: A convenir, Consulta, A evaluar"
                  value={settings.noPriceLabel || ''}
                  onChange={e => setSettings({ ...settings, noPriceLabel: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Intervalos y Días */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Días visibles al público</label>
              <select 
                value={settings.maxDaysInAdvance}
                onChange={e => setSettings({...settings, maxDaysInAdvance: Number(e.target.value)})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              >
                <option value={3}>Próximos 3 días</option>
                <option value={7}>Próximos 7 días</option>
                <option value={14}>Próximos 14 días</option>
                <option value={30}>Próximo mes (30 días)</option>
              </select>
            </div>
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
