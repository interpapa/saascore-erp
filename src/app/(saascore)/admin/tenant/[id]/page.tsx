'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useERPStore } from '@/store/useERPStore';
import { useActionActor } from '@/hooks/useActionActor';
import { 
  getTenantByIdAdmin, 
  updateTenantAdminAction, 
  deleteTenantAdminAction,
  getTenantUsersAdminAction,
  resetTenantUserPasswordAdminAction,
  createTenantUserAction
} from '@/app/actions/tenant';
import { 
  ArrowLeft, 
  Save, 
  ShieldCheck, 
  ToggleLeft, 
  ToggleRight, 
  LayoutTemplate, 
  Briefcase, 
  ChevronDown, 
  ChevronRight, 
  Settings2, 
  Trash2,
  Users,
  KeyRound,
  LogIn,
  UserPlus,
  X
} from 'lucide-react';
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
    id: 'inventario', 
    name: 'Inventario de Mercancía',
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

import { UserRole } from '@/lib/rbac';

export default function TenantAdminPage() {
  const { id } = useParams();
  const router = useRouter();
  const { session, impersonateTenant } = useERPStore();
  const actor = useActionActor();
  const { toast } = useToast();
  const [tenant, setTenant] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  // Formularios locales
  const [name, setName] = useState('');
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});

  // Gestión de Usuarios del Tenant
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('seller');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  useEffect(() => {
    if (session?.userEmail && id) {
      fetchTenant();
      fetchUsers();
    }
  }, [session, id]);

  const fetchTenant = async () => {
    setIsLoading(true);
    const activeActor = actor || { email: session!.userEmail!, role: 'superadmin' as const };
    const result = await getTenantByIdAdmin(id as string, activeActor);
    if (result.success && result.tenant) {
      setTenant(result.tenant);
      setName(result.tenant.name || '');
      // Si está vacío en BD asume que todos estaban activos por retrocompatibilidad
      const rawModules: string[] = result.tenant.active_modules || ALL_MODULES.map(m => m.id);
      // Migración defensiva: convertir cualquier 'catalogo' legado en 'inventario'
      const normalizedModules = Array.from(new Set(rawModules.map(m => m === 'catalogo' ? 'inventario' : m)));
      setActiveModules(normalizedModules);
      
      setFeatureFlags(result.tenant.metadata?.features || {
        use_inventory_recipes: true,
        use_calendar_employees: true,
        use_pos_discounts: true,
        use_calendar_whatsapp: true
      });
    }
    setIsLoading(false);
  };

  const fetchUsers = async () => {
    if (!id) return;
    setIsLoadingUsers(true);
    const activeActor = actor || { email: session!.userEmail!, role: 'superadmin' as const };
    const res = await getTenantUsersAdminAction(id as string, activeActor);
    if (res.success && res.users) {
      setUsers(res.users);
    }
    setIsLoadingUsers(false);
  };

  const handleImpersonate = () => {
    if (!tenant) return;
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
      description: `Has ingresado al ERP como "${tenant.name}".`,
    });
    router.push('/dashboard');
  };

  const handleResetPassword = async (email: string) => {
    const newPass = window.prompt(`Ingrese la nueva contraseña para ${email} (mínimo 6 caracteres):`);
    if (!newPass) return;
    if (newPass.length < 6) {
      toast({ variant: 'error', title: 'Error', description: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }
    const activeActor = actor || { email: session!.userEmail!, role: 'superadmin' as const };
    const res = await resetTenantUserPasswordAdminAction(email, newPass, activeActor);
    if (res.success) {
      toast({ variant: 'success', title: 'Contraseña Actualizada', description: `La clave de ${email} ha sido cambiada con éxito.` });
    } else {
      toast({ variant: 'error', title: 'Error', description: res.error });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserPassword.trim()) {
      toast({ variant: 'error', title: 'Error', description: 'Correo y contraseña requeridos.' });
      return;
    }
    setIsSubmittingUser(true);
    const activeActor = actor || { email: session!.userEmail!, role: 'superadmin' as const };
    const res = await createTenantUserAction(id as string, newUserEmail.trim(), newUserPassword.trim(), newUserRole, activeActor);
    if (res.success) {
      toast({ variant: 'success', title: 'Usuario Creado', description: `Cuenta creada para ${newUserEmail}.` });
      setIsUserModalOpen(false);
      setNewUserEmail('');
      setNewUserPassword('');
      fetchUsers();
    } else {
      toast({ variant: 'error', title: 'Error', description: res.error });
    }
    setIsSubmittingUser(false);
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
    const activeActor = actor || { email: session.userEmail, role: 'superadmin' as const };
    
    const newMetadata = {
      ...(tenant.metadata || {}),
      features: featureFlags
    };

    const updates = {
      name,
      active_modules: activeModules,
      metadata: newMetadata
    };

    const result = await updateTenantAdminAction(tenant.id, updates, activeActor);
    if (result.success) {
      toast({ variant: 'success', title: 'Guardado', description: 'Configuración actualizada exitosamente.' });
    } else {
      toast({ variant: 'error', title: 'Error', description: result.error });
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!session?.userEmail) return;
    
    // Doble confirmación por seguridad
    const confirm1 = window.confirm(`¿Estás seguro de que quieres ELIMINAR permanentemente a "${tenant.name}"?`);
    if (!confirm1) return;
    const confirm2 = window.confirm(`CUIDADO: Esto borrará la empresa y no se puede deshacer. ¿Proceder?`);
    if (!confirm2) return;

    setIsSaving(true);
    const activeActor = actor || { email: session.userEmail, role: 'superadmin' as const };
    const result = await deleteTenantAdminAction(tenant.id, activeActor);
    if (result.success) {
      toast({ variant: 'success', title: 'Eliminado', description: 'La empresa fue borrada de la base de datos.' });
      router.replace('/admin');
    } else {
      toast({ variant: 'error', title: 'Error al eliminar', description: result.error });
      setIsSaving(false);
    }
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
        <div className="flex w-full sm:w-auto gap-2">
          <button
            onClick={handleImpersonate}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm shrink-0"
            title="Ingresar a la sesión de este negocio en modo soporte (Modo Dios)"
          >
            <LogIn size={16} /> Entrar al ERP
          </button>
          <button 
            onClick={handleDelete}
            disabled={isSaving}
            className="w-10 sm:w-auto flex justify-center items-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 px-3 py-2.5 rounded-xl transition-all shrink-0"
            title="Eliminar Empresa"
          >
            <Trash2 size={18} />
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 sm:flex-none justify-center bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            {isSaving ? 'Guardando...' : <><Save size={18} /> Guardar Cambios</>}
          </button>
        </div>
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

      {/* Usuarios y Accesos del Tenant */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-4">
          <div>
            <h3 className="font-bold text-white flex items-center gap-2 text-lg">
              <Users size={20} className="text-indigo-400" /> Miembros & Accesos del Tenant
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cuentas de usuario registradas para este negocio. Puedes resetear contraseñas o crear nuevos colaboradores.
            </p>
          </div>
          <button
            onClick={() => setIsUserModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
          >
            <UserPlus size={15} /> Crear Usuario
          </button>
        </div>

        {isLoadingUsers ? (
          <div className="text-center py-6 text-xs text-slate-400">Cargando colaboradores...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            No hay miembros explícitos en user_tenants para esta empresa.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] text-slate-400 uppercase tracking-wider font-bold border-b border-white/5">
                <tr>
                  <th className="pb-2">Usuario (Email / ID)</th>
                  <th className="pb-2">Rol Asignado</th>
                  <th className="pb-2">Fecha Vinculación</th>
                  <th className="pb-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => (
                  <tr key={u.id || u.user_email} className="hover:bg-white/[0.01]">
                    <td className="py-2.5 font-medium text-white">
                      {u.user_email || u.user_id}
                    </td>
                    <td className="py-2.5">
                      <span className="bg-white/10 text-indigo-300 px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-400">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-2.5 text-right">
                      {u.user_email && (
                        <button
                          onClick={() => handleResetPassword(u.user_email)}
                          className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[11px] font-semibold transition-all inline-flex items-center gap-1"
                          title="Resetear Contraseña"
                        >
                          <KeyRound size={12} /> Reset Clave
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

      {/* Modal Crear Usuario */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setIsUserModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <UserPlus size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Nuevo Miembro / Acceso</h3>
                <p className="text-xs text-slate-400">Crear cuenta con acceso inmediato a este negocio</p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  placeholder="empleado@empresa.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Contraseña Temporal * (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Rol en el Sistema
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                >
                  <option value="seller">Ventas / Cajero</option>
                  <option value="technician">Técnico / Operativo</option>
                  <option value="manager">Gerente (Inventario, Ventas, Reportes)</option>
                  <option value="owner">Dueño / Administrador</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10 justify-end">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isSubmittingUser ? 'Creando...' : 'Crear Acceso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
