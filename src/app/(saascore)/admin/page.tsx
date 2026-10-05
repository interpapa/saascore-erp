'use client';

import { useState, useEffect } from 'react';
import { 
  Shield, 
  Ban, 
  CheckCircle2, 
  CreditCard, 
  Trash2, 
  Plus, 
  X, 
  Search, 
  LogIn, 
  Users, 
  SlidersHorizontal, 
  ToggleLeft, 
  ToggleRight, 
  Save 
} from 'lucide-react';
import { 
  getAllTenants, 
  toggleTenantStatus, 
  deleteTenantAdminAction, 
  createTenantAdminAction,
  updateTenantAdminAction 
} from '@/app/actions/tenant';
import { useToast } from '@/components/core/ToastProvider';
import { EmptyState } from '@/components/core/EmptyState';
import { useERPStore } from '@/store/useERPStore';
import { useActionActor } from '@/hooks/useActionActor';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ALL_SYSTEM_MODULES = [
  { id: 'caja', name: 'Caja POS' },
  { id: 'clientes', name: 'Clientes CRM' },
  { id: 'inventario', name: 'Inventario de Mercancía' },
  { id: 'compras', name: 'Compras & Proveedores' },
  { id: 'contabilidad', name: 'Contabilidad NIIF' },
  { id: 'estadisticas', name: 'Reportes & Estadísticas' },
  { id: 'calendario', name: 'Citas & Reservas' },
  { id: 'whatsapp', name: 'WhatsApp CRM' },
  { id: 'kanban', name: 'Órdenes de Trabajo' },
  { id: 'odontologia', name: 'Odontología' },
  { id: 'barberia', name: 'Barbería' },
  { id: 'grooming', name: 'Grooming Canino' },
  { id: 'equipo', name: 'Personal & Nómina' },
  { id: 'franquicias', name: 'Franquicias' },
  { id: 'config', name: 'Ajustes Generales' }
];

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

  // Modal Control Rápido de Módulos
  const [selectedTenantForModules, setSelectedTenantForModules] = useState<any | null>(null);
  const [tenantActiveModules, setTenantActiveModules] = useState<string[]>([]);
  const [isSavingModules, setIsSavingModules] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchTenants = async () => {
    const email = session?.userEmail;
    if (!email && !actor) return;
    setIsLoading(true);
    setLoadError(null);
    const activeActor = actor || { email: email!, role: 'superadmin' as const };
    const result = await getAllTenants(activeActor);
    if (result.success && result.tenants) {
      setTenants(result.tenants);
    } else {
      setLoadError(result.error || 'Error al cargar inquilinos');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (session?.userEmail || actor?.email) {
      fetchTenants();
    }
  }, [session?.userEmail, actor?.token]);

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

  const handleAccessTenantModule = (tenant: any, moduleId?: string) => {
    impersonateTenant({
      id: tenant.id,
      name: tenant.name,
      blocked: tenant.status === 'suspended',
      active_modules: tenant.active_modules,
      metadata: tenant.metadata,
    });
    const target = moduleId 
      ? (moduleId === 'catalogo' ? '/inventario' : moduleId === 'config' ? '/configuracion' : `/${moduleId}`) 
      : '/dashboard';
    toast({
      variant: 'success',
      title: 'Accediendo al Módulo',
      description: `Entrando a "${tenant.name}" en modo soporte (${moduleId ? moduleId.toUpperCase() : 'Dashboard'}).`,
    });
    router.push(target);
  };

  const handleOpenModulesModal = (tenant: any) => {
    setSelectedTenantForModules(tenant);
    const mods = tenant.active_modules || (tenant.metadata as any)?.active_modules || ALL_SYSTEM_MODULES.map(m => m.id);
    setTenantActiveModules(Array.isArray(mods) ? mods : []);
  };

  const handleToggleTenantModule = (modId: string) => {
    if (tenantActiveModules.includes(modId)) {
      setTenantActiveModules(tenantActiveModules.filter(m => m !== modId));
    } else {
      setTenantActiveModules([...tenantActiveModules, modId]);
    }
  };

  const handleSelectAllTenantModules = () => {
    setTenantActiveModules(ALL_SYSTEM_MODULES.map(m => m.id));
  };

  const handleDeselectAllTenantModules = () => {
    setTenantActiveModules([]);
  };

  const handleSaveTenantModules = async () => {
    if (!selectedTenantForModules || !session?.userEmail) return;
    setIsSavingModules(true);
    const activeActor = actor || { email: session.userEmail, role: 'superadmin' as const };

    const result = await updateTenantAdminAction(
      selectedTenantForModules.id,
      { active_modules: tenantActiveModules },
      activeActor
    );

    if (result.success) {
      toast({
        variant: 'success',
        title: 'Módulos Actualizados',
        description: `Los módulos de "${selectedTenantForModules.name}" se guardaron exitosamente.`
      });
      setTenants(prev => prev.map(t => 
        t.id === selectedTenantForModules.id 
          ? { ...t, active_modules: tenantActiveModules } 
          : t
      ));
      setSelectedTenantForModules(null);
    } else {
      toast({
        variant: 'error',
        title: 'Error al actualizar',
        description: result.error
      });
    }
    setIsSavingModules(false);
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
          <h1 className="text-3xl font-black text-foreground tracking-tight mb-1">Gestión de Empresas (Tenants)</h1>
          <p className="text-muted-foreground font-medium">Control maestro de acceso, telemetría y empresas de tu plataforma SaaS.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/users"
            className="bg-card hover:bg-muted text-foreground border border-border px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-xs"
          >
            <Users size={18} className="text-primary" /> Gestionar Usuarios
          </Link>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm btn-haptic"
          >
            <Shield size={18} /> Nueva Empresa
          </button>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros Rápidos */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-4 rounded-2xl border border-border shadow-xs">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre de empresa o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none placeholder:text-muted-foreground transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex bg-muted/60 p-1 rounded-xl border border-border shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Todos ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'active'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Activos ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('suspended')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'suspended'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Suspendidos ({suspendedCount})
            </button>
          </div>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground font-bold outline-none focus:border-primary shrink-0 shadow-xs"
          >
            <option value="all">Planes: Todos</option>
            <option value="basic">Basic ($49)</option>
            <option value="pro">Pro ($99)</option>
            <option value="enterprise">Enterprise ($199)</option>
          </select>
        </div>
      </div>

      {loadError && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <Ban size={18} className="shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            onClick={fetchTenants}
            className="px-3.5 py-1.5 bg-destructive text-destructive-foreground font-bold text-xs rounded-xl shadow-xs hover:bg-destructive/90 transition-all shrink-0"
          >
            Reintentar Conexión
          </button>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
        <table className="w-full text-left">
          <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider font-bold text-muted-foreground">
            <tr>
              <th className="p-4 pl-6">Empresa (Tenant)</th>
              <th className="p-4">Estado</th>
              <th className="p-4">Plan & Módulos Activos</th>
              <th className="p-4">Creado</th>
              <th className="p-4 text-right pr-6">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  <div className="flex justify-center mb-2">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
              <tr key={tenant.id} className="hover:bg-muted/40 transition-colors">
                <td className="p-4 pl-6">
                  <div className="font-bold text-foreground text-base">{tenant.name}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">ID: {tenant.id}</div>
                </td>
                <td className="p-4">
                  {tenant.status === 'active' ? (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      <CheckCircle2 size={14} /> Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      <Ban size={14} /> Suspendido
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <div className="text-sm text-foreground mb-1">
                    <span className="uppercase font-bold text-primary text-xs">{tenant.subscription_plan || 'basic'}</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap max-w-[260px]">
                    {(tenant.active_modules || []).map((mod: string) => (
                      <button
                        key={mod}
                        onClick={() => handleAccessTenantModule(tenant, mod)}
                        className="bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary text-[10px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider border border-border hover:border-primary/40 transition-colors btn-haptic cursor-pointer inline-flex items-center gap-1"
                        title={`Acceder directamente al módulo ${mod.toUpperCase()} en ${tenant.name}`}
                      >
                        <span>{mod}</span>
                        <span className="opacity-40 text-[8px]">↗</span>
                      </button>
                    ))}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard size={14} className={tenant.status === 'suspended' ? 'text-rose-500' : 'text-muted-foreground'} />
                    {new Date(tenant.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="p-4 pr-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleImpersonate(tenant)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 flex items-center gap-1.5 btn-haptic"
                      title="Entrar al ERP como esta empresa (Modo Soporte)"
                    >
                      <LogIn size={13} /> Entrar
                    </button>
                    <button 
                      onClick={() => handleToggleStatus(tenant.id, tenant.status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors btn-haptic ${
                        tenant.status === 'active' 
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20' 
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      {tenant.status === 'active' ? 'Suspender' : 'Reactivar'}
                    </button>
                    <button
                      onClick={() => handleOpenModulesModal(tenant)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-muted hover:bg-accent text-foreground border border-border flex items-center gap-1.5 btn-haptic"
                      title="Activar o desactivar módulos para esta empresa"
                    >
                      <SlidersHorizontal size={13} className="text-primary" /> Módulos
                    </button>
                    <Link href={`/admin/tenant/${tenant.id}`} className="px-3 py-1.5 text-foreground hover:bg-accent border border-border rounded-lg text-xs font-bold transition-colors">
                      Detalles
                    </Link>
                    <button 
                      onClick={() => handleDelete(tenant.id)}
                      className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Eliminar empresa"
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
        <Shield className="text-blue-500 shrink-0 mt-1" />
        <div>
          <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-1">Seguridad RLS Activa</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Al suspender a un cliente aquí, las políticas de Row Level Security (RLS) en Supabase 
            le bloquearán inmediatamente el acceso a <b>TODAS</b> sus tablas (Facturas, Clientes, Inventario). 
            No hay forma de evadirlo desde el Frontend.
          </p>
        </div>
      </div>

      {/* Modal Crear Tenant */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Nueva Empresa (Tenant)</h3>
                <p className="text-xs text-muted-foreground">Crear una nueva instancia aislada en Supabase</p>
              </div>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-1.5">
                  Nombre del Negocio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Taller Mecánico Los Próceres"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-1.5">
                  Correo del Dueño (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="admin@empresa.com"
                  value={newTenantOwner}
                  onChange={(e) => setNewTenantOwner(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-1.5">
                  Plan de Suscripción
                </label>
                <select
                  value={newTenantPlan}
                  onChange={(e) => setNewTenantPlan(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                >
                  <option value="basic">Basic ($49/mes)</option>
                  <option value="pro">Pro ($99/mes)</option>
                  <option value="enterprise">Enterprise ($199/mes)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isCreating ? 'Creando...' : 'Crear Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Control Rápido de Módulos */}
      {selectedTenantForModules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setSelectedTenantForModules(null)}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <SlidersHorizontal size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Módulos de {selectedTenantForModules.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Activa o desactiva qué secciones puede ver y usar esta empresa en el ERP.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
              <span className="text-xs font-bold text-muted-foreground">
                {tenantActiveModules.length} de {ALL_SYSTEM_MODULES.length} módulos habilitados
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllTenantModules}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  Activar Todos
                </button>
                <span className="text-muted-foreground text-xs">•</span>
                <button
                  type="button"
                  onClick={handleDeselectAllTenantModules}
                  className="text-xs text-muted-foreground hover:text-destructive font-bold hover:underline"
                >
                  Desactivar Todos
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 py-2">
              {ALL_SYSTEM_MODULES.map((mod) => {
                const isActive = tenantActiveModules.includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => handleToggleTenantModule(mod.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all btn-haptic ${
                      isActive
                        ? 'bg-primary/10 border-primary/30 text-foreground shadow-xs'
                        : 'bg-muted/30 border-border/60 text-muted-foreground opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-bold text-xs truncate">{mod.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono uppercase">{mod.id}</div>
                    </div>
                    {isActive ? (
                      <ToggleRight size={22} className="text-primary shrink-0" />
                    ) : (
                      <ToggleLeft size={22} className="text-muted-foreground shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-4">
              <button
                type="button"
                onClick={() => setSelectedTenantForModules(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveTenantModules}
                disabled={isSavingModules}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 btn-haptic"
              >
                <Save size={16} />
                {isSavingModules ? 'Guardando...' : 'Guardar Módulos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
