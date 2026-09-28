'use client';

import { useState, useEffect } from 'react';
import { Shield, Ban, CheckCircle2, MoreVertical, CreditCard, Trash2, Plus, X, Search, LogIn, Filter } from 'lucide-react';
import { getAllTenants, toggleTenantStatus, deleteTenantAdminAction, createTenantAdminAction } from '@/app/actions/tenant';
import { useToast } from '@/components/core/ToastProvider';
import { EmptyState } from '@/components/core/EmptyState';
import { useERPStore } from '@/store/useERPStore';
import { useActionActor } from '@/hooks/useActionActor';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminTenantsPage() {
  const { session, impersonateTenant } = useERPStore();
  const actor = useActionActor();
  const router = useRouter();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros y Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  // Modal Nuevo Tenant
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantOwner, setNewTenantOwner] = useState('');
  const [newTenantPlan, setNewTenantPlan] = useState('pro');
  const [isCreating, setIsCreating] = useState(false);

  const fetchTenants = async () => {
    if (!actor && !session?.userEmail) return;
    setIsLoading(true);
    const activeActor = actor || { email: session!.userEmail!, role: 'superadmin' as const };
    const result = await getAllTenants(activeActor);
    if (result.success && result.tenants) {
      setTenants(result.tenants);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (session?.userEmail) {
      fetchTenants();
    }
  }, [session?.userEmail]);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim()) {
      toast({ variant: 'error', title: 'Error', description: 'El nombre de la empresa es obligatorio.' });
      return;
    }
    const activeActor = actor || { email: session!.userEmail!, role: 'superadmin' as const };
    setIsCreating(true);
    const result = await createTenantAdminAction(newTenantName.trim(), newTenantOwner.trim(), newTenantPlan, activeActor);
    if (result.success) {
      toast({ variant: 'success', title: 'Tenant Creado', description: `La empresa "${newTenantName}" ha sido registrada con éxito.` });
      setIsModalOpen(false);
      setNewTenantName('');
      setNewTenantOwner('');
      setNewTenantPlan('pro');
      fetchTenants();
    } else {
      toast({ variant: 'error', title: 'Error al crear', description: result.error });
    }
    setIsCreating(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    if (!session?.userEmail) return;
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const activeActor = actor || { email: session.userEmail, role: 'superadmin' as const };
    // Actualización optimista
    setTenants(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    
    const result = await toggleTenantStatus(id, newStatus, activeActor);
    if (!result.success) {
      toast({ variant: 'error', title: 'Error', description: result.error });
      fetchTenants(); // Revertir
    }
  };

  const handleDelete = async (id: string) => {
    if (!session?.userEmail) return;
    if (!window.confirm('¿Seguro que quieres borrar a esta empresa de Supabase por completo?')) return;

    const activeActor = actor || { email: session.userEmail, role: 'superadmin' as const };
    setTenants(prev => prev.filter(t => t.id !== id));
    const result = await deleteTenantAdminAction(id, activeActor);
    if (result.success) {
      toast({ variant: 'success', title: 'Eliminado', description: 'Empresa borrada.' });
    } else {
      toast({ variant: 'error', title: 'Error', description: result.error });
      fetchTenants(); // Revertir
    }
  };

  const handleImpersonate = (tenant: any) => {
    impersonateTenant({
      id: tenant.id,
      name: tenant.name,
      blocked: tenant.status === 'suspended',
      active_modules: tenant.active_modules,
      metadata: tenant.metadata,
    });
    toast({
      variant: 'success',
      title: 'Modo Soporte Activado',
      description: `Ingresando al ERP como "${tenant.name}".`,
    });
    router.push('/dashboard');
  };

  const totalCount = tenants.length;
  const activeCount = tenants.filter(t => t.status === 'active').length;
  const suspendedCount = tenants.filter(t => t.status === 'suspended').length;

  const filteredTenants = tenants.filter(t => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term ||
      (t.name || '').toLowerCase().includes(term) ||
      (t.id || '').toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPlan = planFilter === 'all' || (t.subscription_plan || 'basic').toLowerCase() === planFilter.toLowerCase();
    return matchesSearch && matchesStatus && matchesPlan;
  });

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-1">Gestión de Inquilinos</h1>
          <p className="text-slate-400 font-medium">Control maestro de acceso, telemetría y facturación de tus clientes SaaS.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm btn-haptic"
        >
          <Shield size={18} /> Nuevo Cliente (Tenant)
        </button>
      </div>

      {/* Barra de Búsqueda y Filtros Rápidos */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-white/5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nombre de empresa o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none placeholder:text-slate-600 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-white/10 shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'active'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Activos ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('suspended')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'suspended'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Suspendidos ({suspendedCount})
            </button>
          </div>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 font-bold outline-none focus:border-rose-500 shrink-0"
          >
            <option value="all">Planes: Todos</option>
            <option value="basic">Basic ($49)</option>
            <option value="pro">Pro ($99)</option>
            <option value="enterprise">Enterprise ($199)</option>
          </select>
        </div>
      </div>

      <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-slate-800/50 border-b border-white/10 text-xs uppercase tracking-wider font-bold text-slate-400">
            <tr>
              <th className="p-4 pl-6">Cliente (Tenant)</th>
              <th className="p-4">Estado</th>
              <th className="p-4">Plan & Módulos</th>
              <th className="p-4">Último Pago</th>
              <th className="p-4 text-right pr-6">Acciones (Kill Switch)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  <div className="flex justify-center mb-2">
                    <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                  Cargando inquilinos...
                </td>
              </tr>
            ) : filteredTenants.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8">
                  <EmptyState
                    icon={<Search size={40} />}
                    title="No se encontraron inquilinos"
                    description={
                      searchTerm || statusFilter !== 'all' || planFilter !== 'all'
                        ? 'No hay resultados que coincidan con los filtros de búsqueda aplicados.'
                        : 'Crea un nuevo inquilino para comenzar a gestionar clientes SaaS'
                    }
                  />
                </td>
              </tr>
            ) : filteredTenants.map(tenant => (
              <tr key={tenant.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4 pl-6">
                  <div className="font-bold text-white text-base">{tenant.name}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">ID: {tenant.id}</div>
                </td>
                <td className="p-4">
                  {tenant.status === 'active' ? (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      <CheckCircle2 size={14} /> Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      <Ban size={14} /> Suspendido
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <div className="text-sm text-slate-300 mb-1">
                    <span className="uppercase font-bold text-indigo-400 text-xs">{tenant.subscription_plan || 'basic'}</span>
                  </div>
                  <div className="flex gap-1 flex-wrap max-w-[200px]">
                    {(tenant.active_modules || []).map((mod: string) => (
                      <span key={mod} className="bg-white/10 text-slate-300 text-[10px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider border border-white/5">
                        {mod}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <CreditCard size={14} className={tenant.status === 'suspended' ? 'text-rose-500' : 'text-slate-500'} />
                    {new Date(tenant.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="p-4 pr-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleImpersonate(tenant)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5"
                      title="Entrar al ERP como esta empresa (Modo Dios)"
                    >
                      <LogIn size={13} /> Entrar
                    </button>
                    <button 
                      onClick={() => handleToggleStatus(tenant.id, tenant.status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        tenant.status === 'active' 
                          ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20' 
                          : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                      }`}
                    >
                      {tenant.status === 'active' ? 'Suspender' : 'Reactivar'}
                    </button>
                    <Link href={`/admin/tenant/${tenant.id}`} className="px-4 py-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition-colors">
                      Gestionar
                    </Link>
                    <button 
                      onClick={() => handleDelete(tenant.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-8 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 flex gap-4">
        <Shield className="text-blue-400 shrink-0 mt-1" />
        <div>
          <h4 className="font-bold text-blue-400 mb-1">Seguridad RLS Activa</h4>
          <p className="text-sm text-slate-400 leading-relaxed">
            Al suspender a un cliente aquí, las políticas de Row Level Security (RLS) en Supabase 
            le bloquearán inmediatamente el acceso a <b>TODAS</b> sus tablas (Facturas, Clientes, Inventario). 
            No hay forma de evadirlo desde el Frontend.
          </p>
        </div>
      </div>

      {/* Modal Crear Tenant */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Nuevo Cliente (Tenant)</h3>
                <p className="text-xs text-slate-400">Crear una nueva instancia aislada en Supabase</p>
              </div>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Nombre del Negocio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Taller Mecánico Los Próceres"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Correo del Dueño (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="admin@empresa.com"
                  value={newTenantOwner}
                  onChange={(e) => setNewTenantOwner(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Plan de Suscripción
                </label>
                <select
                  value={newTenantPlan}
                  onChange={(e) => setNewTenantPlan(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all"
                >
                  <option value="basic">Basic ($49/mes)</option>
                  <option value="pro">Pro ($99/mes)</option>
                  <option value="enterprise">Enterprise ($199/mes)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isCreating ? 'Creando...' : 'Crear Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
