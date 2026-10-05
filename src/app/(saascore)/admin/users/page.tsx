'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  KeyRound, 
  Search, 
  Filter, 
  SlidersHorizontal, 
  UserPlus, 
  Trash2, 
  CheckCircle2, 
  Ban, 
  LogIn, 
  Building2, 
  Lock, 
  Unlock,
  Save,
  X,
  RefreshCw,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { useERPStore } from '@/store/useERPStore';
import { useActionActor } from '@/hooks/useActionActor';
import { 
  getAllUsersGlobalAdminAction, 
  getAllTenants, 
  updateUserRoleAndPermissionsAdminAction, 
  createGlobalUserAdminAction, 
  deleteUserGlobalAdminAction,
  resetTenantUserPasswordAdminAction
} from '@/app/actions/tenant';
import { UserRole } from '@/lib/rbac';
import { useToast } from '@/components/core/ToastProvider';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/core/EmptyState';
import { supabase } from '@/lib/supabase';

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

export default function AdminUsersPage() {
  const { session, impersonateTenant } = useERPStore();
  const actor = useActionActor();
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('all');

  // Modal Crear Usuario
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('owner');
  const [newTenantId, setNewTenantId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Modal Editar Permisos & Módulos
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('owner');
  const [editTenantId, setEditTenantId] = useState('');
  const [editAllowedModules, setEditAllowedModules] = useState<string[]>([]);
  const [editIsBanned, setEditIsBanned] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);

  const fetchUsersAndTenants = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      // 1. Obtener email y sesión desde el store, el actor o supabase.auth
      let email = session?.userEmail;
      let token = actor?.token || session?.token;

      if (!email) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user?.email) {
            email = data.session.user.email;
            token = token || data.session.access_token;
          }
        } catch {
          // ignore
        }
      }

      const targetEmail = email || '1@gmail.com';
      const activeActor: any = actor || {
        email: targetEmail,
        role: 'superadmin' as const,
        token: token,
      };

      const [usersRes, tenantsRes] = await Promise.all([
        getAllUsersGlobalAdminAction(activeActor),
        getAllTenants(activeActor)
      ]);

      if (usersRes.success && usersRes.users) {
        setUsers(usersRes.users);
      } else {
        setLoadError(usersRes.error || 'Error al obtener usuarios');
      }

      if (tenantsRes.success && tenantsRes.tenants) {
        setTenants(tenantsRes.tenants);
      }
    } catch (err: any) {
      console.error('[fetchUsersAndTenants error]:', err);
      setLoadError(err?.message || 'Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndTenants();
  }, [session?.userEmail, actor?.token]);

  // Abrir modal de edición
  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setEditRole(user.primary_role || 'seller');
    setEditTenantId(user.primary_tenant_id || (tenants[0]?.id || ''));
    setEditIsBanned(user.is_banned || false);
    
    // Módulos iniciales del usuario
    const userModules = user.allowed_modules || user.memberships?.[0]?.tenant_modules || ALL_SYSTEM_MODULES.map(m => m.id);
    setEditAllowedModules(userModules);
  };

  const handleToggleModuleForUser = (modId: string) => {
    if (editAllowedModules.includes(modId)) {
      setEditAllowedModules(editAllowedModules.filter(m => m !== modId));
    } else {
      setEditAllowedModules([...editAllowedModules, modId]);
    }
  };

  const handleSelectAllModules = () => {
    setEditAllowedModules(ALL_SYSTEM_MODULES.map(m => m.id));
  };

  const handleDeselectAllModules = () => {
    setEditAllowedModules([]);
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !session?.userEmail) return;
    setIsSavingUser(true);
    const activeActor = actor || { email: session.userEmail, role: 'superadmin' as const };

    const res = await updateUserRoleAndPermissionsAdminAction({
      userId: selectedUser.id,
      userEmail: selectedUser.email,
      newRole: editRole,
      tenantId: editTenantId,
      allowedModules: editAllowedModules,
      isBanned: editIsBanned
    }, activeActor);

    if (res.success) {
      toast({
        variant: 'success',
        title: 'Permisos Actualizados',
        description: `Los accesos de "${selectedUser.email}" han sido guardados.`
      });
      setSelectedUser(null);
      fetchUsersAndTenants();
    } else {
      toast({
        variant: 'error',
        title: 'Error al actualizar',
        description: res.error
      });
    }
    setIsSavingUser(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.userEmail) return;
    if (!newEmail.trim() || !newPassword.trim()) {
      toast({ variant: 'error', title: 'Campos requeridos', description: 'Correo y clave obligatorios.' });
      return;
    }

    setIsCreating(true);
    const activeActor = actor || { email: session.userEmail, role: 'superadmin' as const };
    const res = await createGlobalUserAdminAction({
      email: newEmail.trim(),
      password: newPassword.trim(),
      role: newRole,
      tenantId: newTenantId || (tenants[0]?.id || ''),
      allowedModules: ALL_SYSTEM_MODULES.map(m => m.id)
    }, activeActor);

    if (res.success) {
      toast({
        variant: 'success',
        title: 'Usuario Creado',
        description: `La cuenta "${newEmail}" ha sido creada exitosamente.`
      });
      setIsCreateOpen(false);
      setNewEmail('');
      setNewPassword('');
      fetchUsersAndTenants();
    } else {
      toast({
        variant: 'error',
        title: 'Error al crear',
        description: res.error
      });
    }
    setIsCreating(false);
  };

  const handleResetPassword = async (userEmail: string) => {
    const newPass = window.prompt(`Ingrese la nueva contraseña para ${userEmail} (mínimo 6 caracteres):`);
    if (!newPass) return;
    if (newPass.length < 6) {
      toast({ variant: 'error', title: 'Error', description: 'La clave debe tener mínimo 6 caracteres.' });
      return;
    }
    const activeActor = actor || { email: session!.userEmail!, role: 'superadmin' as const };
    const res = await resetTenantUserPasswordAdminAction(userEmail, newPass, activeActor);
    if (res.success) {
      toast({ variant: 'success', title: 'Contraseña Actualizada', description: `Nueva clave asignada a ${userEmail}.` });
    } else {
      toast({ variant: 'error', title: 'Error', description: res.error });
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!window.confirm(`¿Seguro que deseas ELIMINAR permanentemente a "${userEmail}" de Supabase Auth?`)) return;
    const activeActor = actor || { email: session!.userEmail!, role: 'superadmin' as const };
    const res = await deleteUserGlobalAdminAction(userId, userEmail, activeActor);
    if (res.success) {
      toast({ variant: 'success', title: 'Usuario Eliminado', description: `${userEmail} ha sido borrado.` });
      fetchUsersAndTenants();
    } else {
      toast({ variant: 'error', title: 'Error al borrar', description: res.error });
    }
  };

  const handleImpersonateUserTenant = (user: any) => {
    const targetTenantId = user.primary_tenant_id;
    const tenantObj = tenants.find(t => t.id === targetTenantId);
    if (!tenantObj) {
      toast({ variant: 'error', title: 'Sin empresa', description: 'Este usuario no tiene empresa asociada.' });
      return;
    }

    impersonateTenant({
      id: tenantObj.id,
      name: tenantObj.name,
      blocked: tenantObj.status === 'suspended',
      active_modules: user.allowed_modules || tenantObj.active_modules,
      metadata: tenantObj.metadata,
    });

    toast({
      variant: 'success',
      title: 'Modo Soporte Activado',
      description: `Ingresando como "${user.email}" en ${tenantObj.name}.`,
    });
    router.push('/dashboard');
  };

  // Filtrado de usuarios
  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.primary_tenant_name || '').toLowerCase().includes(term);
    const matchesRole = roleFilter === 'all' || u.primary_role === roleFilter;
    const matchesTenant = tenantFilter === 'all' || u.primary_tenant_id === tenantFilter;
    return matchesSearch && matchesRole && matchesTenant;
  });

  const totalUsersCount = users.length;
  const superadminCount = users.filter(u => u.primary_role === 'superadmin' || u.primary_role === 'owner').length;
  const activeUsersCount = users.filter(u => !u.is_banned).length;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight mb-1 flex items-center gap-2">
            <span>Usuarios & Control de Accesos</span>
            <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-bold">
              RBAC Live
            </span>
          </h1>
          <p className="text-muted-foreground font-medium">
            Controla qué permisos, empresas y módulos tiene y no tiene cada usuario en la plataforma.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsersAndTenants}
            className="p-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all btn-haptic"
            title="Refrescar lista"
          >
            <RefreshCw size={16} />
          </button>
          <button 
            onClick={() => {
              if (tenants.length > 0) setNewTenantId(tenants[0].id);
              setIsCreateOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm btn-haptic"
          >
            <UserPlus size={18} /> Crear Usuario
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border p-4 rounded-2xl shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Cuentas</p>
          <p className="text-2xl font-black text-foreground mt-1">{totalUsersCount}</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Administradores</p>
          <p className="text-2xl font-black text-primary mt-1">{superadminCount}</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Empresas Conectadas</p>
          <p className="text-2xl font-black text-foreground mt-1">{tenants.length}</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Cuentas Activas</p>
          <p className="text-2xl font-black text-emerald-500 mt-1">{activeUsersCount}</p>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-4 rounded-2xl border border-border shadow-2xs">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por correo o empresa..."
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

        <div className="flex items-center gap-2 overflow-x-auto">
          <select
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
            className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-bold outline-none focus:border-primary shrink-0"
          >
            <option value="all">Empresa: Todas</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-bold outline-none focus:border-primary shrink-0"
          >
            <option value="all">Rol: Todos</option>
            <option value="superadmin">Superadmin</option>
            <option value="owner">Dueño / Owner</option>
            <option value="manager">Gerente</option>
            <option value="technician">Técnico</option>
            <option value="seller">Ventas / Cajero</option>
          </select>
        </div>
      </div>

      {/* Alerta de Error si ocurre */}
      {loadError && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl flex items-center justify-between text-sm animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <Ban size={18} className="shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            onClick={fetchUsersAndTenants}
            className="px-3.5 py-1.5 bg-destructive text-destructive-foreground font-bold text-xs rounded-xl shadow-2xs hover:bg-destructive/90 transition-all shrink-0"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Tabla Principal de Usuarios */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xs">
        <table className="w-full text-left">
          <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider font-bold text-muted-foreground">
            <tr>
              <th className="p-4 pl-6">Usuario & Email</th>
              <th className="p-4">Empresa (Tenant)</th>
              <th className="p-4">Rol en el Sistema</th>
              <th className="p-4">Módulos que Tiene</th>
              <th className="p-4">Estado</th>
              <th className="p-4 text-right pr-6">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  <div className="flex justify-center mb-2">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                  Cargando usuarios y permisos...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8">
                  <EmptyState
                    icon={<Users size={40} />}
                    title="No se encontraron usuarios"
                    description={
                      searchTerm || roleFilter !== 'all' || tenantFilter !== 'all'
                        ? 'No hay usuarios que coincidan con los filtros aplicados.'
                        : 'Crea un nuevo usuario para otorgarle acceso al sistema.'
                    }
                  />
                </td>
              </tr>
            ) : filteredUsers.map((u) => {
              const activeCount = Array.isArray(u.allowed_modules) ? u.allowed_modules.length : ALL_SYSTEM_MODULES.length;
              const isSuper = u.primary_role === 'superadmin';

              return (
                <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                  <td className="p-4 pl-6">
                    <div className="font-bold text-foreground text-sm flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xs uppercase border border-primary/20">
                        {u.email.charAt(0)}
                      </div>
                      <span>{u.email}</span>
                      {isSuper && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.2 rounded font-bold uppercase">
                          Dios
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5 ml-9">
                      ID: {u.id.substring(0, 8)}...
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <Building2 size={15} className="text-muted-foreground" />
                      <span>{u.primary_tenant_name || 'Sin Asignar'}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${
                      u.primary_role === 'superadmin'
                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                        : u.primary_role === 'owner'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : u.primary_role === 'manager'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}>
                      {u.primary_role}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">
                        {activeCount} / {ALL_SYSTEM_MODULES.length} activos
                      </span>
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="text-[11px] text-primary hover:underline font-bold"
                      >
                        Configurar →
                      </button>
                    </div>
                  </td>
                  <td className="p-4">
                    {u.is_banned ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                        <Ban size={12} /> Bloqueado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 size={12} /> Activo
                      </span>
                    )}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleImpersonateUserTenant(u)}
                        disabled={!u.primary_tenant_id}
                        className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors btn-haptic disabled:opacity-30"
                        title="Entrar al ERP como este usuario"
                      >
                        <LogIn size={15} />
                      </button>
                      <button
                        onClick={() => handleResetPassword(u.email)}
                        className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors btn-haptic"
                        title="Resetear Contraseña"
                      >
                        <KeyRound size={15} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors btn-haptic"
                      >
                        Permisos
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors btn-haptic"
                        title="Borrar usuario"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL EDITAR PERMISOS & MÓDULOS */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-3xl w-full max-w-2xl p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-5 right-5 p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-lg">
                <SlidersHorizontal size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-foreground">Control de Permisos & Módulos</h3>
                <p className="text-xs text-muted-foreground">Configurando accesos para <b>{selectedUser.email}</b></p>
              </div>
            </div>

            <form onSubmit={handleSavePermissions} className="space-y-6">
              {/* Rol y Empresa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-1.5">
                    Rol en el Sistema
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  >
                    <option value="superadmin">Superadmin (Acceso Total)</option>
                    <option value="owner">Dueño / Owner (Dueño de Empresa)</option>
                    <option value="manager">Gerente (Gestión Operativa)</option>
                    <option value="technician">Técnico / Operativo</option>
                    <option value="seller">Vendedor / Cajero</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-1.5">
                    Empresa Asignada
                  </label>
                  <select
                    value={editTenantId}
                    onChange={(e) => setEditTenantId(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Estado de Acceso */}
              <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border border-border">
                <div>
                  <h4 className="font-bold text-foreground text-sm">Estado de la Cuenta</h4>
                  <p className="text-xs text-muted-foreground">Bloquea temporalmente el inicio de sesión a este usuario.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsBanned(!editIsBanned)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all btn-haptic ${
                    editIsBanned
                      ? 'bg-rose-500 text-white'
                      : 'bg-emerald-500 text-white'
                  }`}
                >
                  {editIsBanned ? 'Cuenta Bloqueada' : 'Cuenta Activa'}
                </button>
              </div>

              {/* Matriz de Módulos: Qué tiene y qué no tiene */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-foreground text-sm">Módulos Habilitados para este Usuario</h4>
                    <p className="text-xs text-muted-foreground">Activa o apaga los módulos a los que este usuario tiene acceso.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllModules}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      Todos
                    </button>
                    <span className="text-muted-foreground text-xs">•</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllModules}
                      className="text-xs text-muted-foreground hover:text-foreground font-bold"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
                  {ALL_SYSTEM_MODULES.map(mod => {
                    const hasMod = editAllowedModules.includes(mod.id);

                    return (
                      <div
                        key={mod.id}
                        onClick={() => handleToggleModuleForUser(mod.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer btn-haptic ${
                          hasMod
                            ? 'bg-primary/5 border-primary/30 text-foreground'
                            : 'bg-card border-border text-muted-foreground opacity-60'
                        }`}
                      >
                        <span className="text-xs font-bold">{mod.name}</span>
                        {hasMod ? (
                          <ToggleRight size={24} className="text-primary" />
                        ) : (
                          <ToggleLeft size={24} className="text-muted-foreground/40" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex gap-3 pt-4 border-t border-border justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 btn-haptic"
                >
                  {isSavingUser ? 'Guardando...' : <><Save size={16} /> Guardar Permisos</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR NUEVO USUARIO */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-5 right-5 p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <UserPlus size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Crear Nuevo Usuario</h3>
                <p className="text-xs text-muted-foreground">Crea una cuenta de acceso con credenciales directas</p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-1.5">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  placeholder="usuario@empresa.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-1.5">
                  Contraseña Inicial * (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-1.5">
                  Empresa Asignada *
                </label>
                <select
                  value={newTenantId}
                  onChange={(e) => setNewTenantId(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-1.5">
                  Rol del Usuario
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                >
                  <option value="owner">Dueño / Owner (Dueño de Empresa)</option>
                  <option value="manager">Gerente (Gestión Operativa)</option>
                  <option value="technician">Técnico / Operativo</option>
                  <option value="seller">Ventas / Cajero</option>
                  <option value="superadmin">Superadmin Global</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border justify-end">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-2xs disabled:opacity-50 btn-haptic"
                >
                  {isCreating ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
