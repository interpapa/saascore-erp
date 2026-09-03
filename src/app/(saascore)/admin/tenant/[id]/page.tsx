'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useERPStore } from '@/store/useERPStore';
import { getTenantByIdAdmin, updateTenantAdminAction } from '@/app/actions/tenant';
import { ArrowLeft, Save, ShieldCheck, ToggleLeft, ToggleRight, LayoutTemplate, Briefcase, ChevronDown, ChevronRight, Settings2 } from 'lucide-react';
import { useToast } from '@/components/core/ToastProvider';
import Link from 'next/link';

const ALL_MODULES = [
  { 
    id: 'caja', 
    name: 'Caja POS', 
    features: [
      { key: 'use_pos_discounts', label: 'Permitir aplicar descuentos manuales' },
      { key: 'use_pos_credits', label: 'Habilitar ventas a crédito' }
    ]
  },
  { id: 'clientes', name: 'Clientes (CRM)', features: [] },
  { 
    id: 'catalogo', 
    name: 'Catálogo e Inventario',
    features: [
      { key: 'use_inventory_recipes', label: 'Usar Recetas e Insumos (BOM)' },
      { key: 'use_multiple_warehouses', label: 'Habilitar Múltiples Almacenes' }
    ]
  },
  { id: 'estadisticas', name: 'Estadísticas', features: [] },
  { id: 'compras', name: 'Compras AP', features: [] },
  { id: 'contabilidad', name: 'Contabilidad y Finanzas', features: [] },
  { 
    id: 'calendario', 
    name: 'Citas y Turnos',
    features: [
      { key: 'use_calendar_employees', label: 'Selección de Múltiples Profesionales/Empleados' },
      { key: 'use_calendar_whatsapp', label: 'Habilitar link de confirmación de WhatsApp' }
    ]
  },
  { id: 'whatsapp', name: 'WhatsApp Inbox', features: [] },
  { id: 'kanban', name: 'Órdenes de Trabajo', features: [] },
  { id: 'equipo', name: 'Personal HRMS', features: [] },
  { id: 'franquicias', name: 'Franquicias', features: [] },
  { id: 'integraciones', name: 'Conexiones API', features: [] },
  { id: 'config', name: 'Ajustes del Sistema', features: [] }
];

export default function TenantAdminPage() {
  const { id } = useParams();
  const router = useRouter();
  const { session } = useERPStore();
  const { toast } = useToast();
  const [tenant, setTenant] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  // Formularios locales
  const [name, setName] = useState('');
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (session?.userEmail && id) {
      fetchTenant();
    }
  }, [session, id]);

  const fetchTenant = async () => {
    setIsLoading(true);
    const result = await getTenantByIdAdmin(id as string, session!.userEmail!);
    if (result.success && result.tenant) {
      setTenant(result.tenant);
      setName(result.tenant.name || '');
      // Si está vacío en BD asume que todos estaban activos por retrocompatibilidad
      const savedModules = result.tenant.active_modules || ALL_MODULES.map(m => m.id);
      setActiveModules(savedModules);
      
      setFeatureFlags(result.tenant.metadata?.features || {
        use_inventory_recipes: true,
        use_calendar_employees: true,
        use_pos_discounts: true,
        use_calendar_whatsapp: true
      });
    }
    setIsLoading(false);
  };

  const toggleModule = (modId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que el click expanda/colapse si le dimos al interruptor
    if (activeModules.includes(modId)) {
      setActiveModules(activeModules.filter(m => m !== modId));
      if (expandedModule === modId) setExpandedModule(null);
    } else {
      setActiveModules([...activeModules, modId]);
      setExpandedModule(modId); // Expandir automáticamente al activarlo
    }
  };

  const toggleFeature = (key: string) => {
    setFeatureFlags(prev => ({ ...prev, [key]: prev[key] === undefined ? false : !prev[key] }));
  };

  const handleSave = async () => {
    if (!session?.userEmail) return;
    setIsSaving(true);
    
    const newMetadata = {
      ...(tenant.metadata || {}),
      features: featureFlags
    };

    const updates = {
      name,
      active_modules: activeModules,
      metadata: newMetadata
    };

    const result = await updateTenantAdminAction(tenant.id, updates, session.userEmail);
    if (result.success) {
      toast({ title: 'Guardado', description: 'Configuración actualizada exitosamente.' });
    } else {
      toast({ variant: 'error', title: 'Error', description: result.error });
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-400">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
        Cargando perfil del cliente...
      </div>
    );
  }

  if (!tenant) {
    return <div className="p-8 text-rose-400 text-center font-bold">Inquilino no encontrado.</div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6 animate-in fade-in">
      {/* Header Sticky para Móviles */}
      <div className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:bg-transparent sm:backdrop-blur-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 sm:border-none mb-6">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Link href="/admin" className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors shrink-0">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 truncate">
            <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2 truncate">
              {tenant.name}
            </h1>
            <p className="text-slate-400 font-mono text-[10px] sm:text-xs mt-1 truncate">ID: {tenant.id}</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full sm:w-auto justify-center bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm shrink-0"
        >
          {isSaving ? 'Guardando...' : <><Save size={18} /> Guardar Cambios</>}
        </button>
      </div>

      {/* Datos Generales */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <Briefcase size={18} className="text-slate-400"/> Información General
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Nombre del Negocio</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Plan Actual</label>
              <div className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-indigo-400 font-bold text-sm uppercase">
                {tenant.subscription_plan || 'BASIC'}
              </div>
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Estado</label>
              <div className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                {tenant.status === 'active' 
                  ? <><ShieldCheck size={16} className="text-emerald-400"/> <span className="text-emerald-400 font-bold">Activo</span></>
                  : <><span className="text-rose-400 font-bold">Suspendido</span></>
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Arquitectura Modular */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-white/5 bg-slate-800/20">
          <h3 className="font-bold text-white flex items-center gap-2 text-lg">
            <LayoutTemplate size={20} className="text-rose-400"/> Configuración de Módulos
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Enciende o apaga aplicaciones completas. Expande un módulo encendido para ajustar sus opciones finas.
          </p>
        </div>
        
        <div className="divide-y divide-white/5">
          {ALL_MODULES.map(mod => {
            const isActive = activeModules.includes(mod.id);
            const isExpanded = expandedModule === mod.id;
            const hasFeatures = mod.features.length > 0;

            return (
              <div key={mod.id} className={`transition-colors ${isExpanded ? 'bg-white/[0.02]' : 'hover:bg-white/[0.01]'}`}>
                {/* Cabecera del Módulo */}
                <div 
                  className={`flex items-center justify-between p-4 sm:p-5 cursor-pointer ${!isActive ? 'opacity-60' : ''}`}
                  onClick={() => {
                    if (isActive && hasFeatures) {
                      setExpandedModule(isExpanded ? null : mod.id);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    {hasFeatures && isActive ? (
                      <div className="text-slate-500">
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                    ) : (
                      <div className="w-[18px]" /> // Spacer
                    )}
                    <span className={`font-bold sm:text-lg ${isActive ? 'text-white' : 'text-slate-400'}`}>
                      {mod.name}
                    </span>
                    {hasFeatures && (
                      <span className="hidden sm:inline-block bg-white/5 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-md ml-2 border border-white/10">
                        {mod.features.length} Ajustes
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={(e) => toggleModule(mod.id, e)}
                    className="p-1 -m-1"
                  >
                    {isActive 
                      ? <ToggleRight size={32} className="text-emerald-500" />
                      : <ToggleLeft size={32} className="text-slate-600" />
                    }
                  </button>
                </div>

                {/* Configuraciones Internas (Feature Flags) */}
                {isExpanded && isActive && hasFeatures && (
                  <div className="px-4 sm:px-12 pb-5 pt-1 bg-black/20 border-t border-white/5">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-400 mb-4 uppercase tracking-widest">
                      <Settings2 size={14} /> Opciones Internas
                    </div>
                    <div className="space-y-1">
                      {mod.features.map(feat => {
                        const isEnabled = featureFlags[feat.key] !== false; // true by default si es undefined
                        return (
                          <div key={feat.key} className="flex items-center justify-between p-3 sm:p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                            <span className="text-xs sm:text-sm font-medium text-slate-200 leading-tight pr-4">
                              {feat.label}
                            </span>
                            <button 
                              onClick={() => toggleFeature(feat.key)} 
                              className="shrink-0 p-1 -m-1"
                            >
                              {isEnabled 
                                ? <ToggleRight size={28} className="text-indigo-400" />
                                : <ToggleLeft size={28} className="text-slate-600" />
                              }
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}
