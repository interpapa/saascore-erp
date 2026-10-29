'use client';

import { useState, useEffect } from 'react';
import { updateBookingConfigAction } from '@/app/actions/booking';
import { useToast } from '@/components/core/ToastProvider';
import { useERPStore } from '@/store/useERPStore';
import { useActionActor } from '@/hooks/useActionActor';
import { 
  Palette, 
  MessageCircle, 
  Clock, 
  Save, 
  X, 
  DollarSign, 
  Image as ImageIcon, 
  Sparkles, 
  Check, 
  QrCode, 
  Download, 
  Share2, 
  Phone, 
  ExternalLink,
  Calendar
} from 'lucide-react';
import { PRESET_PUBLIC_THEMES, normalizeHexColor, getContrastTextColor } from '@/lib/theme/colorUtils';
import { CourtResource, DEFAULT_SPORTS_COURTS } from '@/types/calendario';

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
  const [activeTab, setActiveTab] = useState<'qr' | 'schedule' | 'courts' | 'theme' | 'whatsapp'>('qr');
  const [courts, setCourts] = useState<CourtResource[]>(() => {
    if (tenant?.metadata?.courts && Array.isArray(tenant.metadata.courts) && tenant.metadata.courts.length > 0) {
      return tenant.metadata.courts as CourtResource[];
    }
    return DEFAULT_SPORTS_COURTS;
  });
  
  // Valores por defecto
  const defaultSettings = {
    intervalMinutes: 30,
    maxDaysInAdvance: 14,
    whatsappNumber: '', 
    whatsappRoutingMode: 'employee_first' as 'employee_first' | 'central_only',
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
          whatsappRoutingMode: dbSettings.whatsappRoutingMode || defaultSettings.whatsappRoutingMode,
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
      whatsappRoutingMode: settings.whatsappRoutingMode || 'employee_first',
      resourceName: settings.resourceName || 'Profesional',
      whatsappMessageTemplate: settings.whatsappMessageTemplate,
      showPricesOnBookingPage: settings.showPricesOnBookingPage,
      noPriceLabel: settings.noPriceLabel || 'A convenir',
      logoUrl: settings.logoUrl.trim(),
      headerTitle: settings.headerTitle.trim(),
      headerSubtitle: settings.headerSubtitle.trim(),
      courts: courts,
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
      toast({ variant: 'success', title: 'Configuración Guardada', description: 'Las preferencias han sido actualizadas.' });
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
              <p className="text-xs text-muted-foreground">Código QR, horarios, tema público y notificaciones</p>
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

        {/* Navegación por Pestañas (Scroll horizontal protegido sin salirse) */}
        <div className="px-6 pt-3 pb-0 border-b border-border/80 bg-slate-50/50 dark:bg-slate-900/40 shrink-0 flex gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
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
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'schedule'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Horarios & Precios
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('courts')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'courts'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>🎾</span>
            Pistas / Canchas ({courts.filter(c => c.is_active).length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'theme'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            Portada & Tema
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'whatsapp'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </button>
        </div>

        {/* Contenido Central Scrolleable Fluido */}
        <div className="p-6 overflow-y-auto overflow-x-hidden flex-1 space-y-5">
          
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              PESTAÑA 1: CÓDIGO QR Y ENLACE DE COMPARTIR
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'qr' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Tarjeta Centrada del QR */}
              <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-6 rounded-3xl border border-emerald-500/30 text-center space-y-4">
                
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-black mx-auto">
                  <QrCode className="w-3.5 h-3.5" />
                  Código QR de Reservas en Línea
                </div>

                {/* Imagen del QR Centrada */}
                <div className="p-4 bg-white rounded-2xl shadow-md border border-slate-200 inline-block mx-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(bookingPublicUrl)}`}
                    alt="Código QR de Reservas"
                    className="w-44 h-44 object-contain mx-auto"
                  />
                </div>

                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="font-black text-foreground text-base">
                    Escanea para Agendar Cita
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Los pacientes pueden apuntar con la cámara de su teléfono móvil a este código para ingresar directamente.
                  </p>
                </div>

                {/* Enlace Directo Centrado con Quiebre Hacia Abajo (break-all para nunca desbordar) */}
                <div className="w-full max-w-md mx-auto bg-card p-3 rounded-2xl border border-border shadow-xs text-center space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Enlace Público de tu Clínica
                  </div>
                  <div className="text-xs font-mono text-foreground break-all whitespace-normal text-center select-all leading-relaxed px-2 bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-xl border border-border/60">
                    {bookingPublicUrl}
                  </div>
                </div>
              </div>

              {/* Botones de Acción en Cuadrícula 2x2 */}
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
                      toast({ variant: 'success', title: 'QR Descargado', description: 'Imagen PNG guardada en tu equipo.' });
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
                    toast({ variant: 'success', title: '¡Enlace Copiado!', description: 'Listo para compartir en Instagram o WhatsApp.' });
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

              {/* Tips de Recepción */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-border text-[11px] text-muted-foreground flex items-center gap-2.5">
                <span className="text-base">💡</span>
                <span>
                  <strong>Tip:</strong> Puedes descargar la imagen PNG para mandar a imprimir un exhibidor de acrílico en la recepción para agilizar el ingreso de los pacientes.
                </span>
              </div>

              {/* Enlaces Directos por Especialidad / Rama */}
              <div className="bg-card p-4 rounded-3xl border border-border space-y-3">
                <div>
                  <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <span>🔗</span> Enlaces Directos por Especialidad
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Comparte un enlace específico para que el paciente entre directamente a ver los servicios de esa especialidad sin pasar por la lista general:
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  {[
                    { id: 'ginecologia', name: 'Ginecología y Obstetricia', icon: '👶' },
                    { id: 'odontologia', name: 'Odontología & Salud Dental', icon: '🦷' },
                    { id: 'cardiologia', name: 'Cardiología & Cardiovascular', icon: '❤️' },
                    { id: 'pediatria', name: 'Pediatría & Puericultura', icon: '🧸' },
                    { id: 'dermatologia', name: 'Dermatología & Estética', icon: '🧴' },
                    { id: 'traumatologia', name: 'Traumatología & Fisioterapia', icon: '🦴' },
                    { id: 'oftalmologia', name: 'Oftalmología & Salud Visual', icon: '👁️' },
                    { id: 'med_general', name: 'Medicina General', icon: '🩺' },
                  ]
                    .filter(spec => {
                      const activeMods = tenant?.active_modules || [];
                      if (!activeMods || activeMods.length === 0) return true;
                      return activeMods.includes(spec.id) || activeMods.includes(`med_${spec.id}`) || activeMods.includes('clinica');
                    })
                    .map((item) => {
                      const specUrl = `${bookingPublicUrl}?especialidad=${item.id}`;
                      return (
                        <div key={item.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-border/80 text-xs gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base">{item.icon}</span>
                            <span className="font-bold text-foreground truncate">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(specUrl);
                                toast({ variant: 'success', title: '¡Enlace Copiado!', description: `Link directo de ${item.name} listo para compartir.` });
                              }}
                              className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-foreground font-bold rounded-lg border border-border shadow-2xs text-[11px] transition-colors"
                            >
                              Copiar Link
                            </button>
                            <button
                              type="button"
                              onClick={() => window.open(specUrl, '_blank')}
                              className="p-1 text-slate-400 hover:text-foreground transition-colors"
                              title="Abrir enlace en nueva pestaña"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              PESTAÑA 2: HORARIOS & PRECIOS
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'schedule' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-4">
                {/* Nota de Duración Personalizada */}
                <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/50 dark:border-emerald-900/30 text-xs text-muted-foreground flex items-center gap-3">
                  <Clock className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-foreground">Duración Personalizada por Especialista y Servicio:</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Cada cita calcula automáticamente su duración en base al procedimiento agendado y la configuración particular de cada especialista en el sistema.
                    </p>
                  </div>
                </div>

                {/* Anticipación Máxima */}
                <div className="space-y-1.5 bg-card p-4 rounded-2xl border border-border">
                  <label className="block text-xs font-black text-foreground">
                    Días Visibles para Reservar en el Calendario
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
                    <option value={60}>Próximos 60 días (2 meses)</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground">Define hasta cuántos días en el futuro los pacientes pueden agendar turnos.</p>
                </div>
              </div>

              {/* Control de Precios al Público */}
              <div className="bg-card border border-border p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Mostrar Precios en la Página de Reservas
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Activa si deseas que los pacientes vean el precio de cada consulta o servicio.
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
                    🔒 <strong>Modo Privado Activado:</strong> Los clientes podrán agendar libremente pero sin ver tarifas públicas.
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

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              PESTAÑA: PISTAS Y CANCHAS DE LA ACADEMIA / CLUB
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'courts' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/50 dark:border-emerald-900/30 text-xs text-muted-foreground flex items-center gap-3">
                <span className="text-xl">🎾</span>
                <p>
                  <strong>Recursos Físicos de la Academia:</strong> Define tus canchas reales. El motor anti-colisión del calendario impedirá que se solapen dos clases o reservas en la misma pista ni con el mismo coach.
                </p>
              </div>

              <div className="space-y-3">
                {courts.map((court, idx) => (
                  <div key={court.id || idx} className="p-3 bg-card border border-border rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5 flex-1">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: court.color || '#10b981' }} />
                      <input
                        type="text"
                        value={court.name}
                        onChange={(e) => {
                          const updated = [...courts];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setCourts(updated);
                        }}
                        className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-border bg-background text-foreground flex-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="Nombre de la pista..."
                      />
                      <select
                        value={court.type || 'cristal'}
                        onChange={(e) => {
                          const updated = [...courts];
                          updated[idx] = { ...updated[idx], type: e.target.value };
                          setCourts(updated);
                        }}
                        className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background text-foreground focus:outline-none"
                      >
                        <option value="cristal">Cristal Pro</option>
                        <option value="panoramica">Panorámica</option>
                        <option value="individual">Individual</option>
                        <option value="standard">Estándar</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...courts];
                          updated[idx] = { ...updated[idx], is_active: !updated[idx].is_active };
                          setCourts(updated);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                          court.is_active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {court.is_active ? 'Activa' : 'Pausada'}
                      </button>

                      {courts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCourts(courts.filter((_, i) => i !== idx));
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Eliminar pista"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  const newId = `court-${Date.now()}`;
                  setCourts([
                    ...courts,
                    {
                      id: newId,
                      name: `Pista ${courts.length + 1}`,
                      type: 'cristal',
                      is_active: true,
                      color: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'][courts.length % 6]
                    }
                  ]);
                }}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold text-xs hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all flex items-center justify-center gap-2"
              >
                + Agregar Nueva Pista / Cancha
              </button>
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              PESTAÑA 3: PORTADA & TEMA
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'theme' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Logo de la Empresa */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-foreground">
                    Logo de la Empresa (URL de Imagen)
                  </label>
                  {settings.logoUrl && (
                    <button 
                      type="button" 
                      onClick={() => setSettings({ ...settings, logoUrl: '' })} 
                      className="text-[11px] text-red-500 hover:underline font-bold"
                    >
                      Quitar logo
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-border p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                    {settings.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={settings.logoUrl} 
                        alt="Logo Preview" 
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <input 
                    type="url" 
                    placeholder="https://ejemplo.com/logo.png"
                    value={settings.logoUrl}
                    onChange={e => setSettings({ ...settings, logoUrl: e.target.value })}
                    className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                  />
                </div>
              </div>

              {/* Título y Mensaje de Portada */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-foreground">
                    Título Principal
                  </label>
                  <input 
                    type="text" 
                    placeholder={`Por defecto: ${tenant?.name || 'Nombre del negocio'}`}
                    value={settings.headerTitle}
                    onChange={e => setSettings({ ...settings, headerTitle: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-foreground">
                    Mensaje de Bienvenida
                  </label>
                  <input 
                    type="text" 
                    placeholder="Por defecto: ¿Qué necesitas hoy?"
                    value={settings.headerSubtitle}
                    onChange={e => setSettings({ ...settings, headerSubtitle: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Paletas Prediseñadas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Paletas Recomendadas (1 Clic)
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                    Contraste WCAG 2.1
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_PUBLIC_THEMES.map((preset) => {
                    const isSelected = 
                      normalizeHexColor(settings.themeBg).toLowerCase() === preset.bgColor.toLowerCase() &&
                      normalizeHexColor(settings.themeBtn).toLowerCase() === preset.btnColor.toLowerCase();
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSettings({ ...settings, themeBg: preset.bgColor, themeBtn: preset.btnColor })}
                        className={`flex items-center gap-2 p-2 rounded-xl text-left border text-xs transition-all ${
                          isSelected 
                            ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-card shadow-xs' 
                            : 'border-border bg-card/60 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span 
                          className="w-4 h-4 rounded-full shrink-0 border border-black/10 shadow-xs" 
                          style={{ backgroundColor: preset.btnColor }} 
                        />
                        <span className="truncate font-medium text-foreground text-[11px]">
                          {preset.name}
                        </span>
                        {isSelected && <Check className="w-3 h-3 text-emerald-600 ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selectores Hex Personalizados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Color de Fondo</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={normalizeHexColor(settings.themeBg, '#ffffff')}
                      onChange={e => setSettings({...settings, themeBg: e.target.value})}
                      className="w-10 h-10 rounded-xl border border-border cursor-pointer bg-transparent"
                    />
                    <input 
                      type="text" 
                      value={settings.themeBg}
                      onChange={e => setSettings({...settings, themeBg: e.target.value})}
                      className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Color de Botones</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={normalizeHexColor(settings.themeBtn, '#0B3B24')}
                      onChange={e => setSettings({...settings, themeBtn: e.target.value})}
                      className="w-10 h-10 rounded-xl border border-border cursor-pointer bg-transparent"
                    />
                    <input 
                      type="text" 
                      value={settings.themeBtn}
                      onChange={e => setSettings({...settings, themeBtn: e.target.value})}
                      className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground"
                      placeholder="#0B3B24"
                    />
                  </div>
                </div>
              </div>

              {/* Vista Previa en Vivo */}
              {(() => {
                const previewBg = normalizeHexColor(settings.themeBg, '#ffffff');
                const previewBtn = normalizeHexColor(settings.themeBtn, '#0B3B24');
                const btnTextColor = getContrastTextColor(previewBtn);
                const bgTextColor = getContrastTextColor(previewBg);
                return (
                  <div 
                    className="p-3.5 rounded-2xl border border-border space-y-2.5 transition-colors shadow-xs"
                    style={{ backgroundColor: previewBg }}
                  >
                    <div className="flex items-center justify-between">
                      <span 
                        className="text-[10px] font-black tracking-wider uppercase opacity-75"
                        style={{ color: bgTextColor }}
                      >
                        Vista Previa en Vivo
                      </span>
                      <span 
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: previewBtn, color: btnTextColor }}
                      >
                        Paso 1 de 3
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div>
                        <h4 className="text-xs font-black truncate max-w-[200px]" style={{ color: bgTextColor }}>
                          {settings.headerTitle || tenant?.name || 'Mi Negocio'}
                        </h4>
                        <p className="text-[10px] opacity-70 truncate max-w-[220px]" style={{ color: bgTextColor }}>
                          {settings.headerSubtitle || 'Reserva tu cita en pocos pasos'}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs shrink-0 transition-transform pointer-events-none"
                        style={{ backgroundColor: previewBtn, color: btnTextColor }}
                      >
                        Confirmar Cita →
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              PESTAÑA 4: WHATSAPP & COMUNICACIONES
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Enrutamiento Inteligente de Mensajes */}
              <div className="space-y-2 bg-card border border-border p-4 rounded-2xl">
                <label className="block text-xs font-black text-foreground">
                  ¿A dónde deben llegar las reservas de los pacientes?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, whatsappRoutingMode: 'employee_first' })}
                    className={`p-3 rounded-xl border text-left text-xs transition-all flex flex-col gap-1 ${
                      settings.whatsappRoutingMode !== 'central_only'
                        ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/30'
                        : 'border-border bg-slate-50 dark:bg-slate-800/40 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span className="font-black text-foreground flex items-center gap-1.5">
                      📱 Al Especialista Asignado
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-snug">
                      Llega directo al WhatsApp del doctor o especialista. Si este no tiene número o no lo activa, se desvía a la Central de Recepción.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, whatsappRoutingMode: 'central_only' })}
                    className={`p-3 rounded-xl border text-left text-xs transition-all flex flex-col gap-1 ${
                      settings.whatsappRoutingMode === 'central_only'
                        ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/30'
                        : 'border-border bg-slate-50 dark:bg-slate-800/40 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span className="font-black text-foreground flex items-center gap-1.5">
                      🏥 Siempre a Central de Recepción
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-snug">
                      Todas las citas reservadas se envían exclusivamente al número central de la clínica para control administrativo.
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-foreground mb-1.5">
                    WhatsApp Central / Recepción (Respaldo)
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ej: 584241234567"
                    value={settings.whatsappNumber || ''}
                    onChange={e => setSettings({...settings, whatsappNumber: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Número donde se recibirán las alertas si el especialista no tiene teléfono o está en modo central.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black text-foreground mb-1.5">Terminología del Recurso</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Médico, Especialista, Profesional"
                    value={settings.resourceName || ''}
                    onChange={e => setSettings({...settings, resourceName: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Cómo se llama al profesional asignado (Médico, Especialista, etc.).</p>
                </div>
              </div>

              {/* Plantilla de Mensaje */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-foreground">Mensaje Automático de WhatsApp</label>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Personalizable</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Presiona los botones para insertar etiquetas dinámicas en el mensaje:
                </p>
                
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, whatsappMessageTemplate: prev.whatsappMessageTemplate + ' {{cliente}}' }))}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-card border border-border hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground transition-colors"
                  >
                    + Nombre Cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, whatsappMessageTemplate: prev.whatsappMessageTemplate + ' {{fecha}}' }))}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-card border border-border hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground transition-colors"
                  >
                    + Fecha
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, whatsappMessageTemplate: prev.whatsappMessageTemplate + ' {{hora}}' }))}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-card border border-border hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground transition-colors"
                  >
                    + Hora
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, whatsappMessageTemplate: prev.whatsappMessageTemplate + ' {{servicio}}' }))}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-card border border-border hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground transition-colors"
                  >
                    + Servicio
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, whatsappMessageTemplate: prev.whatsappMessageTemplate + ' {{profesional}}' }))}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-card border border-border hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground transition-colors"
                  >
                    + Profesional / Especialista
                  </button>
                </div>

                <textarea 
                  rows={4}
                  value={settings.whatsappMessageTemplate}
                  onChange={e => setSettings({...settings, whatsappMessageTemplate: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans leading-relaxed mt-2"
                />

                {/* Vista previa en vivo estilo WhatsApp */}
                <div className="mt-3 bg-[#EFEAE2] dark:bg-slate-950 p-3 rounded-2xl border border-emerald-200/50 dark:border-emerald-900/40">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <span>📱 Vista Previa en WhatsApp:</span>
                  </p>
                  <div className="bg-white dark:bg-emerald-950/50 text-slate-800 dark:text-slate-100 p-3 rounded-xl rounded-tr-none shadow-xs text-xs whitespace-pre-wrap leading-relaxed border border-emerald-100 dark:border-emerald-900/50">
                    {settings.whatsappMessageTemplate
                      .replace(/{{profesional}}/g, 'Dra. María Pérez')
                      .replace(/{{fecha}}/g, '2026-09-18')
                      .replace(/{{hora}}/g, '10:30 AM')
                      .replace(/{{cliente}}/g, 'Laura Gómez')
                      .replace(/{{servicio}}/g, 'Consulta Ginecológica')
                      .replace(/{{recurso}}/g, settings.resourceName || 'Especialista')
                    }
                  </div>
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
            {isSaving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>

      </div>
    </div>
  );
}
