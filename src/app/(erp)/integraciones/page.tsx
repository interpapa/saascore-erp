'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, MessageCircle, CalendarDays, Power, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useERPStore } from '@/store/useERPStore';
import { updateTenantSettings } from '@/app/actions/tenant';

const AVAILABLE_INTEGRATIONS = [
  {
    id: 'stripe',
    name: 'Stripe / Facturación',
    description: 'Procesa pagos con tarjetas de crédito y débito a nivel global.',
    icon: CreditCard,
    colorClass: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business API',
    description: 'Conecta tu cuenta de Meta Cloud para automatizar el CRM y notificaciones.',
    icon: MessageCircle,
    colorClass: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sincroniza tus citas de taller y mantenimientos preventivos con Google.',
    icon: CalendarDays,
    colorClass: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  }
];

export default function IntegracionesPage() {
  const { currentTenant, setCurrentTenant } = useERPStore();
  const [integrationsState, setIntegrationsState] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentTenant?.metadata?.integrations) {
      setIntegrationsState(currentTenant.metadata.integrations);
    } else {
      // Default: all off
      setIntegrationsState({
        stripe: false,
        whatsapp: false,
        google_calendar: false
      });
    }
  }, [currentTenant]);

  const toggleIntegration = async (integrationId: string) => {
    if (!currentTenant) return;
    setIsLoading(integrationId);
    setError(null);

    const newState = !integrationsState[integrationId];
    const newMetadata = {
      ...currentTenant.metadata,
      integrations: {
        ...integrationsState,
        [integrationId]: newState
      }
    };

    try {
      const res = await updateTenantSettings(currentTenant.id, currentTenant.name, newMetadata);
      if (res.success && res.tenant) {
        setCurrentTenant(res.tenant); // Actualizamos la store local
        setIntegrationsState(newMetadata.integrations);
      } else {
        throw new Error(res.error || 'Error desconocido');
      }
    } catch (err: any) {
      setError(`No se pudo actualizar ${integrationId}: ${err.message}`);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tight">Centro de Integraciones</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Conecta tu plataforma con servicios de terceros. Los cambios se guardan automáticamente.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-2">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {AVAILABLE_INTEGRATIONS.map(integration => {
          const Icon = integration.icon;
          const isActive = integrationsState[integration.id] || false;
          const isToggling = isLoading === integration.id;

          return (
            <div 
              key={integration.id} 
              className={`bg-card border-2 rounded-2xl p-6 shadow-sm transition-all flex flex-col relative overflow-hidden ${
                isActive ? 'border-emerald-500/50 dark:border-emerald-500/30 shadow-emerald-500/10' : 'border-border hover:border-border/80'
              }`}
            >
              {/* Status Indicator */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  {isActive ? 'Conectado' : 'Inactivo'}
                </span>
              </div>

              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${integration.colorClass}`}>
                <Icon size={24} />
              </div>
              
              <h3 className="text-lg font-bold text-foreground mb-2">{integration.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-1">
                {integration.description}
              </p>
              
              <button
                onClick={() => toggleIntegration(integration.id)}
                disabled={isToggling}
                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 btn-haptic ${
                  isActive 
                    ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20' 
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                }`}
              >
                {isToggling ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isActive ? (
                  <>
                    <Power size={16} />
                    Desconectar
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Conectar
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
