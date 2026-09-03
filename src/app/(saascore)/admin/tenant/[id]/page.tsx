'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useERPStore } from '@/store/useERPStore';
import { getTenantByIdAdmin, updateTenantAdminAction } from '@/app/actions/tenant';
import { ArrowLeft, Save, ShieldCheck, ToggleLeft, ToggleRight, LayoutTemplate, Briefcase, Calendar } from 'lucide-react';
import { useToast } from '@/components/core/ToastProvider';
import Link from 'next/link';

export default function TenantAdminPage() {
  const { id } = useParams();
  const router = useRouter();
  const { session } = useERPStore();
  const { toast } = useToast();
  const [tenant, setTenant] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
      setActiveModules(result.tenant.active_modules || []);
      setFeatureFlags(result.tenant.metadata?.features || {
        use_inventory_recipes: true,
        use_calendar_employees: true,
        use_pos_discounts: true
      });
    }
    setIsLoading(false);
  };

  const toggleModule = (modId: string) => {
    if (activeModules.includes(modId)) {
      setActiveModules(activeModules.filter(m => m !== modId));
    } else {
      setActiveModules([...activeModules, modId]);
    }
  };

  const toggleFeature = (key: string) => {
    setFeatureFlags(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!session?.userEmail) return;
    setIsSaving(true);
    
    // Unir metadata actual con las nuevas features
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
    return <div className="p-8 text-slate-400">Cargando perfil...</div>;
  }

  if (!tenant) {
    return <div className="p-8 text-rose-400">Inquilino no encontrado.</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
              {tenant.name}
            </h1>
            <p className="text-slate-400 font-mono text-xs mt-1">ID: {tenant.id}</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
        >
          {isSaving ? 'Guardando...' : <><Save size={18} /> Guardar Cambios</>}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Columna Izquierda (Datos básicos y Estado) */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Briefcase size={18} className="text-slate-400"/> Datos del Cliente
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nombre del Negocio</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Plan Actual</label>
                <div className="text-indigo-400 font-bold uppercase mt-1">{tenant.subscription_plan || 'BASIC'}</div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Estado</label>
                <div className="mt-1">
                  {tenant.status === 'active' 
                    ? <span className="text-emerald-400 text-sm font-bold flex items-center gap-1"><ShieldCheck size={16}/> Activo</span>
                    : <span className="text-rose-400 text-sm font-bold">Suspendido</span>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Central (Módulos Principales) */}
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <LayoutTemplate size={18} className="text-slate-400"/> Módulos Activos
          </h3>
          <p className="text-xs text-slate-400 mb-6">Enciende o apaga el acceso completo a los módulos principales del ERP.</p>
          
          <div className="space-y-3">
            {[
              { id: 'calendario', label: 'Calendario y Citas Web' },
              { id: 'pos', label: 'Punto de Venta (POS)' },
              { id: 'inventario', label: 'Gestión de Inventario' },
              { id: 'finanzas', label: 'Finanzas y Caja' }
            ].map(mod => {
              const isActive = activeModules.includes(mod.id);
              return (
                <div key={mod.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-sm font-medium text-slate-200">{mod.label}</span>
                  <button onClick={() => toggleModule(mod.id)}>
                    {isActive 
                      ? <ToggleRight size={28} className="text-emerald-500" />
                      : <ToggleLeft size={28} className="text-slate-600" />
                    }
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Columna Derecha (Feature Flags) */}
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <ToggleRight size={18} className="text-slate-400"/> Interfaz (Feature Flags)
          </h3>
          <p className="text-xs text-slate-400 mb-6">Oculta opciones complejas de la UI para simplificar el sistema si el cliente no las usa.</p>
          
          <div className="space-y-3">
            {[
              { key: 'use_inventory_recipes', label: 'Usar Recetas / Insumos (Inventario)' },
              { key: 'use_calendar_employees', label: 'Selección de Empleados (Calendario)' },
              { key: 'use_pos_discounts', label: 'Aplicar Descuentos (POS)' }
            ].map(feat => {
              const isEnabled = featureFlags[feat.key] !== false; // true by default if undefined
              return (
                <div key={feat.key} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-xs font-medium text-slate-300 leading-tight pr-4">{feat.label}</span>
                  <button onClick={() => toggleFeature(feat.key)} className="shrink-0">
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

      </div>
    </div>
  );
}
