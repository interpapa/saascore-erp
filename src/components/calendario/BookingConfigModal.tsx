'use client';

import { useState, useEffect } from 'react';
import { updateBookingConfigAction } from '@/app/actions/booking';
import { useToast } from '@/components/core/ToastProvider';
import { useERPStore } from '@/store/useERPStore';
import { useActionActor } from '@/hooks/useActionActor';
import { 
  Clock, 
  Save, 
  X, 
  DollarSign, 
  QrCode, 
  Download, 
  Share2, 
  Phone, 
  ExternalLink,
  Calendar,
  Building2,
  BellRing
} from 'lucide-react';
import { normalizeHexColor } from '@/lib/theme/colorUtils';

export function BookingConfigModal({ 
  isOpen, 
  onClose, 
  tenant 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  tenant: any; 
}) {
  const { toast } = useToast();
  const { setCurrentTenant } = useERPStore();
  const actor = useActionActor();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'schedule' | 'preferences'>('qr');
  
  // Valores por defecto
  const defaultSettings = {
    intervalMinutes: 30,
    maxDaysInAdvance: 14,
    whatsappNumber: '', 
    resourceName: 'Profesional',
    whatsappMessageTemplate: '¡Hola! 👋 Vengo de su página web y me gustaría agendar una cita.',
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

  const bookingPublicUrl = typeof window !== 'undefined' && tenant?.id
    ? `${window.location.origin}/reservas/${tenant.id}`
    : `https://rendorp.com/reservas/${tenant?.id || ''}`;

  const handleSave = async () => {
    setIsSaving(true);
    const payload = {
      intervalMinutes: Number(settings.intervalMinutes) || 30,
      maxDaysInAdvance: Number(settings.maxDaysInAdvance) || 14,
      whatsappNumber: settings.whatsappNumber,
      resourceName: settings.resourceName || 'Profesional',
      whatsappMessageTemplate: settings.whatsappMessageTemplate,
      showPricesOnBookingPage: settings.showPricesOnBookingPage,
      noPriceLabel: settings.noPriceLabel || 'A convenir',
      logoUrl: settings.logoUrl.trim(),
      headerTitle: settings.headerTitle.trim(),
      headerSubtitle: settings.headerSubtitle.trim(),
      publicTheme: {
        bgColor: normalizeHexColor(settings.themeBg, '#ffffff'),
        btnColor: normalizeHexColor(settings.themeBtn, '#0B3B24'),
        logoUrl: settings.logoUrl.trim()
      }
    };
    
    if (!actor) {
      toast({ variant: 'error', title: 'Error de autenticación', description: 'No se detectó una sesión activa.' });
      setIsSaving(false);
      return;
    }

    const result = await updateBookingConfigAction(tenant.id, payload, actor);
    
    if (result.success && result.metadata) {
      setCurrentTenant({ ...tenant, metadata: result.metadata });
      toast({ variant: 'success', title: 'Configuración Guardada', description: 'Las preferencias de citas han sido actualizadas.' });
      onClose();
    } else {
      toast({ variant: 'error', title: 'Error', description: 'No se pudo guardar la configuración.' });
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md">
      <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden text-foreground animate-in fade-in zoom-in-95">
        
        {/* Cabecera Fija */}
        <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between shrink-0 bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground leading-tight">Configuración de Citas & Reservas</h2>
              <p className="text-xs text-muted-foreground">Código QR, horarios y opciones de agenda pública</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-foreground bg-slate-100 dark:bg-slate-800 p-2 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de Pestañas Compacto */}
        <div className="px-6 pt-3 pb-0 border-b border-border/80 bg-slate-50/50 dark:bg-slate-900/40 shrink-0 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'qr'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            Código QR & Enlace
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'schedule'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Horarios & Agenda
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'preferences'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Precios & Alertas
          </button>
        </div>

        {/* Contenido Central Scrolleable Fluido */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              PESTAÑA 1: CÓDIGO QR Y ENLACE DE COMPARTIR
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'qr' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-5 rounded-2xl border border-emerald-500/30 text-center sm:text-left flex flex-col sm:flex-row items-center gap-5">
                {/* Cuadro del QR */}
                <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 shrink-0 mx-auto sm:mx-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(bookingPublicUrl)}`}
                    alt="Código QR de Reservas"
                    className="w-36 h-36 object-contain block mx-auto"
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-black">
                    <QrCode className="w-3 h-3" />
                    Página de Reservas Activa
                  </div>
                  <h3 className="font-black text-foreground text-base leading-snug">
                    Código QR para tus Clientes
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Escanea este código o comparte el enlace para que tus pacientes o clientes reserven turnos en línea desde su móvil.
                  </p>
                  
                  {/* Enlace Directo Copiable */}
                  <div className="flex items-center gap-2 bg-card p-2 rounded-xl border border-border text-xs text-muted-foreground font-mono">
                    <span className="flex-1 truncate text-left">{bookingPublicUrl}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(bookingPublicUrl);
                        toast({ variant: 'success', title: '¡Enlace copiado!', description: 'URL de reservas copiada al portapapeles.' });
                      }}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-emerald-600 font-bold transition-colors shrink-0"
                      title="Copiar Link"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Acciones del QR en Cuadrícula 2x2 */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(bookingPublicUrl)}`;
                      const response = await fetch(qrUrl);
                      const blob = await response.blob();
                      const blobUrl = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = blobUrl;
                      link.download = `QR_Reservas_${tenant?.name || 'Clinica'}.png`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(blobUrl);
                      toast({ variant: 'success', title: 'QR Descargado', description: 'Imagen PNG en alta resolución guardada.' });
                    } catch {
                      window.open(`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(bookingPublicUrl)}`, '_blank');
                    }
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Descargar PNG
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(bookingPublicUrl);
                    toast({ variant: 'success', title: '¡Enlace Copiado!', description: 'Listo para compartir en Instagram o redes sociales.' });
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground text-xs font-bold transition-colors border border-border"
                >
                  <Share2 className="w-4 h-4" />
                  Copiar Link
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const text = encodeURIComponent(`¡Hola! Puedes reservar tu cita médica en línea fácilmente desde aquí:\n${bookingPublicUrl}`);
                    window.open(`https://wa.me/?text=${text}`, '_blank');
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Enviar WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() => window.open(bookingPublicUrl, '_blank')}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground text-xs font-bold transition-colors border border-border"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ver Página Web
                </button>
              </div>

              {/* Mensaje de Ayuda */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-border text-[11px] text-muted-foreground flex items-center gap-2.5">
                <span className="text-base">💡</span>
                <span>
                  <strong>Recomendación:</strong> Puedes descargar la imagen del QR para imprimir un display de acrílico o afiche y colocarlo en el mostrador de recepción o sala de espera.
                </span>
              </div>
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              PESTAÑA 2: HORARIOS Y REGLAS DE AGENDA
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'schedule' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Duración de Citas */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-foreground">
                    Duración Estimada de Cita
                  </label>
                  <select 
                    value={settings.intervalMinutes}
                    onChange={e => setSettings({...settings, intervalMinutes: Number(e.target.value)})}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-border rounded-xl px-3 py-2.5 text-xs text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={15}>15 minutos (Control / Rápida)</option>
                    <option value={30}>30 minutos (Recomendado)</option>
                    <option value={45}>45 minutos (Consulta Médica)</option>
                    <option value={60}>1 hora (Especialidad / Eco)</option>
                    <option value={90}>1 hora y media</option>
                    <option value={120}>2 horas (Tratamiento Extenso)</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground">Define el bloque de tiempo asignado a cada turno.</p>
                </div>

                {/* Anticipación Máxima */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-foreground">
                    Días Visibles para Reservar
                  </label>
                  <select 
                    value={settings.maxDaysInAdvance}
                    onChange={e => setSettings({...settings, maxDaysInAdvance: Number(e.target.value)})}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-border rounded-xl px-3 py-2.5 text-xs text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={3}>Próximos 3 días</option>
                    <option value={7}>Próximos 7 días (1 semana)</option>
                    <option value={14}>Próximos 14 días (2 semanas)</option>
                    <option value={30}>Próximos 30 días (1 mes)</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground">Hasta cuántos días en el futuro pueden agendar los clientes.</p>
                </div>
              </div>

              {/* Título de la Portada */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-black text-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  Nombre o Título del Consultorio / Clínica
                </label>
                <input 
                  type="text" 
                  placeholder={`Por defecto: ${tenant?.name || 'Nombre de la empresa'}`}
                  value={settings.headerTitle}
                  onChange={e => setSettings({ ...settings, headerTitle: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-muted-foreground">Encabezado principal visible en la página pública de reservas.</p>
              </div>

              {/* Mensaje de Bienvenida */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-foreground">
                  Mensaje o Instrucción de Bienvenida
                </label>
                <input 
                  type="text" 
                  placeholder="Por defecto: Selecciona el servicio y fecha para tu consulta"
                  value={settings.headerSubtitle}
                  onChange={e => setSettings({ ...settings, headerSubtitle: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-muted-foreground">Frase corta para orientar a los pacientes al reservar.</p>
              </div>
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              PESTAÑA 3: PRECIOS Y NOTIFICACIONES
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'preferences' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* WhatsApp de Recepción */}
              <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black text-xs">
                  <BellRing className="w-4 h-4" />
                  WhatsApp para Avisos de Nuevas Citas
                </div>
                <input 
                  type="text" 
                  placeholder="Ej: 584241234567 (con código de país)"
                  value={settings.whatsappNumber || ''}
                  onChange={e => setSettings({...settings, whatsappNumber: e.target.value})}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <p className="text-[10px] text-muted-foreground">Número de WhatsApp donde tu equipo o recepción recibe las notificaciones de cada reserva.</p>
              </div>

              {/* Switch de Precios Públicos */}
              <div className="bg-card border border-border p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Mostrar Precios en la Página de Reservas
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Activa si deseas que los pacientes vean el valor de cada consulta o servicio.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, showPricesOnBookingPage: !prev.showPricesOnBookingPage }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${
                      settings.showPricesOnBookingPage ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition ${
                      settings.showPricesOnBookingPage ? 'translate-x-2.5' : '-translate-x-2.5'
                    }`} />
                  </button>
                </div>

                {!settings.showPricesOnBookingPage && (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/50 text-[11px] text-amber-800 dark:text-amber-200">
                    🔒 <strong>Modo Privado:</strong> Los clientes podrán agendar libremente pero sin ver tarifas públicas.
                  </div>
                )}

                <div className="pt-1">
                  <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                    Texto para servicios sin precio fijo
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: A convenir, En consulta, A evaluar"
                    value={settings.noPriceLabel || ''}
                    onChange={e => setSettings({ ...settings, noPriceLabel: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Fijo con Botones */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-border flex items-center justify-end gap-3 shrink-0">
          <button 
            type="button"
            onClick={onClose} 
            className="px-4 py-2 rounded-xl font-bold text-slate-500 hover:text-foreground hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-xs"
          >
            Cancelar
          </button>
          
          <button 
            type="button"
            disabled={isSaving}
            onClick={handleSave} 
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-md transition-all text-xs"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>

      </div>
    </div>
  );
}
