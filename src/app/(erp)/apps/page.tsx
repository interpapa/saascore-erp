'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Box, 
  Scale, 
  CalendarDays, 
  MessageCircle, 
  Settings, 
  Crown, 
  Wrench,
  ShoppingCart,
  KanbanSquare,
  Building2,
  PlugZap,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  ShieldCheck
} from 'lucide-react';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { updateTenantSettings } from '@/app/actions/tenant';
import { useToast } from '@/components/core/ToastProvider';

interface AppModule {
  id: string;
  name: string;
  category: 'comercial' | 'operaciones' | 'finanzas' | 'administracion';
  icon: any;
  gradient: string;
  description: string;
  isCore?: boolean;
}

export default function AppsManagerPage() {
  const { currentTenant, setCurrentTenant } = useERPStore();
  const tenant = useTenantResolver();
  const { toast } = useToast();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeModules, setActiveModules] = useState<string[]>([
    'caja', 'clientes', 'catalogo', 'compras', 'contabilidad', 'calendario', 'whatsapp', 'kanban', 'equipo', 'franquicias', 'integraciones', 'config', 'admin'
  ]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentTenant?.metadata?.active_modules) {
      setActiveModules(currentTenant.metadata.active_modules);
    }
  }, [currentTenant]);

  const modulesList: AppModule[] = [
    { id: 'caja', name: 'Caja POS', category: 'comercial', icon: Wrench, gradient: 'from-emerald-500 to-teal-600', description: 'Registro de ventas en mostrador, emisión de tickets y cobros rápidos.' },
    { id: 'clientes', name: 'Directorio CRM', category: 'comercial', icon: Users, gradient: 'from-blue-500 to-indigo-600', description: 'Fichas de clientes, historial de compras y saldos por cobrar.' },
    { id: 'catalogo', name: 'Catálogo & Inventario', category: 'operaciones', icon: Box, gradient: 'from-violet-500 to-purple-600', description: 'Gestión de productos, productos terminados, servicios y stock.' },
    { id: 'compras', name: 'Compras y Proveedores', category: 'operaciones', icon: ShoppingCart, gradient: 'from-orange-500 to-amber-600', description: 'Órdenes de compra, recepción de mercadería y validación 3-Way Match.' },
    { id: 'contabilidad', name: 'Contabilidad NIIF', category: 'finanzas', icon: Scale, gradient: 'from-slate-800 to-slate-900', description: 'Libro mayor de partida doble, balance de comprobación y diario general.' },
    { id: 'calendario', name: 'Citas y Turnos', category: 'operaciones', icon: CalendarDays, gradient: 'from-blue-400 to-blue-600', description: 'Agenda de atención a clientes, asignación de técnicos y programación de servicios.' },
    { id: 'whatsapp', name: 'WhatsApp CRM', category: 'comercial', icon: MessageCircle, gradient: 'from-green-400 to-emerald-600', description: 'Bandeja omnicanal de soporte con chat en tiempo real y vinculación a clientes.' },
    { id: 'kanban', name: 'Órdenes de Trabajo', category: 'operaciones', icon: KanbanSquare, gradient: 'from-yellow-400 to-orange-500', description: 'Tablero visual de seguimiento de servicios, diagnósticos y reparaciones.' },
    { id: 'equipo', name: 'Personal & Nómina', category: 'administracion', icon: Users, gradient: 'from-indigo-400 to-indigo-600', description: 'Registro de empleados, marcaje de asistencia y liquidación de sueldos.' },
    { id: 'franquicias', name: 'Franquicias & Sedes', category: 'administracion', icon: Building2, gradient: 'from-cyan-500 to-blue-600', description: 'Control de múltiples locales, sucursales y consolidación de ingresos.' },
    { id: 'integraciones', name: 'Integraciones & APIs', category: 'administracion', icon: PlugZap, gradient: 'from-fuchsia-500 to-pink-600', description: 'Conexión con Stripe, WhatsApp Meta API y Google Calendar.' },
    { id: 'config', name: 'Ajustes del Sistema', category: 'administracion', icon: Settings, gradient: 'from-slate-500 to-slate-700', description: 'Datos del negocio, logotipo y moneda principal.', isCore: true },
    { id: 'admin', name: 'SaaSCore Hub', category: 'administracion', icon: Crown, gradient: 'from-pink-500 to-rose-600', description: 'Consola global de administración del software SaaS.', isCore: true },
  ];

  const handleToggleModule = async (moduleId: string) => {
    if (!currentTenant) return;

    const isInstalled = activeModules.includes(moduleId);
    const updatedModules = isInstalled
      ? activeModules.filter(m => m !== moduleId)
      : [...activeModules, moduleId];

    setActiveModules(updatedModules);

    try {
      setIsSaving(true);
      const newMetadata = {
        ...(currentTenant.metadata || {}),
        active_modules: updatedModules,
      };

      const result = await updateTenantSettings(currentTenant.id, currentTenant.name, newMetadata);
      if (result.success) {
        setCurrentTenant({
          ...currentTenant,
          metadata: newMetadata,
        });
        toast({
          variant: 'success',
          title: isInstalled ? 'Módulo Desactivado' : 'Módulo Activado',
          description: `El módulo "${modulesList.find(m => m.id === moduleId)?.name}" ha sido ${isInstalled ? 'desactivado' : 'activado'} correctamente.`,
        });
      }
    } catch (err) {
      console.error('Error guardando módulos:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredModules = modulesList.filter(m => {
    if (activeCategory === 'all') return true;
    return m.category === activeCategory;
  });

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8 animate-in fade-in zoom-in-95 duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
              <LayoutGrid size={22} />
            </div>
            Mercado de Aplicaciones
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Activa o desactiva módulos al estilo Odoo según las necesidades operativas de tu empresa
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 px-4 py-2 rounded-2xl border border-border">
          <ShieldCheck size={16} className="text-emerald-500" />
          <span className="text-xs font-bold text-foreground">
            {activeModules.length} de {modulesList.length} Módulos Activos
          </span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'all', label: 'Todos los Módulos' },
          { id: 'comercial', label: 'Comercial & Ventas' },
          { id: 'operaciones', label: 'Operaciones & Logística' },
          { id: 'finanzas', label: 'Finanzas & NIIF' },
          { id: 'administracion', label: 'Administración' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all btn-haptic ${
              activeCategory === tab.id
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-card border border-border text-slate-600 dark:text-slate-400 hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid de Cards Estilo Odoo Market */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredModules.map(mod => {
          const isActive = activeModules.includes(mod.id);
          const IconComp = mod.icon;

          return (
            <div 
              key={mod.id}
              className={`bg-card border rounded-3xl p-6 transition-all relative flex flex-col justify-between ${
                isActive 
                  ? 'border-border shadow-xs' 
                  : 'border-dashed border-slate-300 dark:border-slate-800 opacity-60 hover:opacity-100'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center shadow-md text-white shrink-0`}>
                    <IconComp size={26} strokeWidth={1.5} />
                  </div>
                  
                  {mod.isCore ? (
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Núcleo Base
                    </span>
                  ) : (
                    <button
                      onClick={() => handleToggleModule(mod.id)}
                      disabled={isSaving}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 btn-haptic ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/20'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}
                    >
                      {isActive ? (
                        <>
                          <CheckCircle2 size={14} /> Activo
                        </>
                      ) : (
                        <>
                          + Activar
                        </>
                      )}
                    </button>
                  )}
                </div>

                <h3 className="font-bold text-foreground text-base tracking-tight mb-1">{mod.name}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                  {mod.description}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-border flex items-center justify-between text-[11px] font-semibold text-slate-400">
                <span className="capitalize">{mod.category}</span>
                <span>{isActive ? 'Instalado' : 'Disponible'}</span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
