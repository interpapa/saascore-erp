'use client';

import { useState, useEffect } from 'react';
import { useERPStore } from '@/store/useERPStore';
import { updateTenantSettings, createTenantUserAction } from '@/app/actions/tenant';
import { useActionActor } from '@/hooks/useActionActor';
import { UserRole } from '@/lib/rbac';
import { 
  ArrowLeft, Save, Building2, Globe, Image as ImageIcon, 
  AlertTriangle, CheckCircle2, Smartphone, UserPlus, Shield,
  Sparkles, Landmark, Trash2, Plus, Phone, MapPin, Printer, Receipt, CreditCard, X
} from 'lucide-react';
import { 
  getBankAccountsAction, 
  createBankAccountAction, 
  deleteBankAccountAction, 
  BankAccount 
} from '@/app/actions/bankAccounts';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const AVAILABLE_MODULES = [
  { id: 'caja', name: 'Caja POS' },
  { id: 'calendario', name: 'Citas y Turnos' },
  { id: 'clientes', name: 'CRM (Clientes)' },
  { id: 'whatsapp', name: 'WhatsApp' },
  { id: 'kanban', name: 'Kanban' },
  { id: 'equipo', name: 'Personal' },
  { id: 'compras', name: 'Compras' },
  { id: 'catalogo', name: 'Catálogo' },
  { id: 'contabilidad', name: 'Contabilidad' },
  { id: 'estadisticas', name: 'Estadísticas' },
  { id: 'franquicias', name: 'Franquicias' },
  { id: 'apps', name: 'Apps / Extensiones' },
  { id: 'config', name: 'Ajustes' },
  { id: 'admin', name: 'Super Admin' },
];

export default function ConfiguracionPage() {
  const currentTenant = useERPStore(s => s.currentTenant);
  const setCurrentTenant = useERPStore(s => s.setCurrentTenant);
  const session = useERPStore(s => s.session);
  const actor = useActionActor();

  const isOwnerOrAdmin = session?.role === 'owner' || session?.role === 'manager' || session?.role === 'superadmin';
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    tax_id: '',
    phone: '',
    address: '',
    printer_paper_width: '80mm',
    currency: 'USD',
    language: 'es',
    logo_url: '',
    mobile_dock_modules: [] as string[]
  });

  // Estado para Cuentas Bancarias & Pago Móvil
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [newAccount, setNewAccount] = useState({
    bank_name: '',
    account_type: 'pago_movil',
    account_number: '',
    holder_name: '',
    tax_id: '',
    phone: '',
    email: '',
    notes: ''
  });

  // Estado para Creación de Cuentas por el Administrador (Solo Dueño)
  const [newUserData, setNewUserData] = useState<{ email: string; password: string; role: UserRole }>({
    email: '',
    password: '',
    role: 'seller'
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserSuccess, setCreateUserSuccess] = useState<string | null>(null);
  const [createUserError, setCreateUserError] = useState<string | null>(null);

  useEffect(() => {
    if (currentTenant) {
      setFormData({
        name: currentTenant.name || '',
        tax_id: (currentTenant.metadata as any)?.tax_id || (currentTenant.metadata as any)?.rif || '',
        phone: (currentTenant.metadata as any)?.phone || '',
        address: (currentTenant.metadata as any)?.address || '',
        printer_paper_width: (currentTenant.metadata as any)?.printer_paper_width || '80mm',
        currency: (currentTenant.metadata as any)?.currency || 'USD',
        language: (currentTenant.metadata as any)?.language || 'es',
        logo_url: (currentTenant.metadata as any)?.logo_url || '',
        mobile_dock_modules: ((currentTenant.metadata as any)?.mobile_dock_modules as string[]) || ['caja', 'calendario', 'clientes', 'whatsapp']
      });

      if (actor) {
        setIsLoadingAccounts(true);
        getBankAccountsAction(currentTenant.id, actor).then(res => {
          if (res.success && res.accounts) {
            setBankAccounts(res.accounts);
          }
        }).finally(() => setIsLoadingAccounts(false));
      }
    }
  }, [currentTenant, actor]);

  const toggleDockModule = (moduleId: string) => {
    setFormData(prev => {
      const isSelected = prev.mobile_dock_modules.includes(moduleId);
      if (isSelected) {
        return { ...prev, mobile_dock_modules: prev.mobile_dock_modules.filter(m => m !== moduleId) };
      } else {
        if (prev.mobile_dock_modules.length >= 5) {
          return prev; // MAX 5 items
        }
        return { ...prev, mobile_dock_modules: [...prev.mobile_dock_modules, moduleId] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      const metadata = {
        ...currentTenant.metadata,
        tax_id: formData.tax_id,
        rif: formData.tax_id,
        phone: formData.phone,
        address: formData.address,
        printer_paper_width: formData.printer_paper_width,
        currency: formData.currency,
        language: formData.language,
        logo_url: formData.logo_url,
        mobile_dock_modules: formData.mobile_dock_modules
      };

      if (!actor) {
        throw new Error('No se detectó una sesión activa con token de seguridad.');
      }

      const result = await updateTenantSettings(currentTenant.id, formData.name, metadata, undefined, actor);
      
      if (!result.success) throw new Error(result.error);

      // Actualizar estado local inmediatamente para reflejar cambios en toda la app
      setCurrentTenant({
        ...currentTenant,
        name: formData.name,
        metadata
      });

      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || 'Error al guardar la configuración');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !actor) return;
    setAccountSaving(true);
    setAccountError(null);
    setAccountSuccess(null);
    try {
      const res = await createBankAccountAction(newAccount, currentTenant.id, actor);
      if (!res.success || !res.account) throw new Error(res.error || 'No se pudo guardar la cuenta');
      setBankAccounts([res.account, ...bankAccounts]);
      setAccountSuccess('Cuenta bancaria registrada correctamente.');
      setIsAccountModalOpen(false);
      setNewAccount({
        bank_name: '',
        account_type: 'pago_movil',
        account_number: '',
        holder_name: '',
        tax_id: '',
        phone: '',
        email: '',
        notes: ''
      });
      setTimeout(() => setAccountSuccess(null), 4000);
    } catch (err: any) {
      setAccountError(err.message || 'Error al guardar');
    } finally {
      setAccountSaving(false);
    }
  };

  const handleDeleteAccount = async (accId: string) => {
    if (!currentTenant || !actor) return;
    if (!confirm('¿Estás seguro de eliminar esta cuenta bancaria?')) return;
    try {
      const res = await deleteBankAccountAction(accId, currentTenant.id, actor);
      if (res.success) {
        setBankAccounts(prev => prev.filter(a => a.id !== accId));
      } else {
        alert(res.error || 'No se pudo eliminar la cuenta');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant?.id || !actor) return;
    setCreateUserError(null);
    setCreateUserSuccess(null);

    if (!newUserData.email || !newUserData.password) {
      setCreateUserError('Correo y contraseña son obligatorios.');
      return;
    }
    if (newUserData.password.length < 6) {
      setCreateUserError('La contraseña temporal debe tener al menos 6 caracteres.');
      return;
    }

    setIsCreatingUser(true);
    try {
      const res = await createTenantUserAction(
        currentTenant.id,
        newUserData.email,
        newUserData.password,
        newUserData.role,
        actor
      );
      if (!res.success) throw new Error(res.error);
      setCreateUserSuccess(`¡Cuenta creada con éxito para ${newUserData.email}! El usuario ya puede iniciar sesión con la contraseña indicada.`);
      setNewUserData({ email: '', password: '', role: 'seller' });
      setTimeout(() => setCreateUserSuccess(null), 6000);
    } catch (err: any) {
      setCreateUserError(err.message || 'Error al crear la cuenta de usuario');
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Filtrar los módulos que el tenant tiene activos realmente
  const fallbackModules = ['caja', 'clientes', 'catalogo', 'compras', 'contabilidad', 'calendario', 'whatsapp', 'kanban', 'equipo', 'franquicias', 'config', 'admin', 'apps'];
  const tenantActiveModules = (currentTenant?.active_modules && currentTenant.active_modules.length > 0) ? currentTenant.active_modules : fallbackModules;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Ajustes del Sistema</h1>
          <p className="text-slate-500 font-medium mt-1 mb-8">Personaliza la configuración de tu instancia de negocio</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Alertas */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-2xl flex items-center gap-3">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}
        {isSuccess && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 size={18} />
            Configuración guardada exitosamente
          </div>
        )}

        {/* Sección: Perfil de Empresa */}
        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 size={16} />
            </div>
            Perfil de Empresa
          </h2>
          
          <div className="space-y-5">
            <Input
              label="Nombre del Negocio"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              icon={<Building2 size={18} />}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="RIF / Identificación Fiscal"
                placeholder="Ej: J-12345678-9"
                value={formData.tax_id}
                onChange={e => setFormData({ ...formData, tax_id: e.target.value })}
                icon={<Building2 size={18} />}
              />

              <Input
                label="Teléfono Principal del Negocio"
                placeholder="Ej: +58 412 1234567"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                icon={<Phone size={18} />}
              />
            </div>

            <Input
              label="Dirección Fiscal o Ubicación Física"
              placeholder="Ej: Av. Principal, Edificio Central, Caracas"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              icon={<MapPin size={18} />}
            />

            <Input
              label="URL del Logo (Opcional)"
              placeholder="https://ejemplo.com/logo.png"
              value={formData.logo_url}
              onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
              icon={<ImageIcon size={18} />}
            />
            {formData.logo_url && (
              <div className="mt-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-border flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-border flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={formData.logo_url} alt="Logo Preview" className="max-w-full max-h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vista Previa</span>
              </div>
            )}
          </div>
        </div>

        {/* Sección: Preferencias Regionales y POS */}
        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Globe size={16} />
            </div>
            Preferencias Regionales y de Impresión POS
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Moneda Principal</label>
              <select
                value={formData.currency}
                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none"
              >
                <option value="USD">Dólar Estadounidense (USD)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="MXN">Peso Mexicano (MXN)</option>
                <option value="COP">Peso Colombiano (COP)</option>
                <option value="VES">Bolívar (VES)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Idioma del Sistema</label>
              <select
                value={formData.language}
                onChange={e => setFormData({ ...formData, language: e.target.value })}
                className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none"
              >
                <option value="es">Español</option>
                <option value="en">Inglés</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Printer size={15} className="text-slate-400" />
                <span>Ancho de Ticket POS</span>
              </label>
              <select
                value={formData.printer_paper_width}
                onChange={e => setFormData({ ...formData, printer_paper_width: e.target.value })}
                className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none"
              >
                <option value="80mm">80 mm (Estándar Térmico POS / TM-T20)</option>
                <option value="58mm">58 mm (Portátil Bluetooth / Reducido)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sección: Cuentas Bancarias & Pago Móvil */}
        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Landmark size={16} />
                </div>
                Cuentas Bancarias & Pago Móvil
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Datos para transferencias que se sincronizan con Caja POS y los comandos automáticos de WhatsApp (/pago).
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setIsAccountModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 flex items-center gap-1.5 text-xs font-bold"
            >
              <Plus size={16} />
              Agregar Cuenta
            </Button>
          </div>

          {accountSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 size={16} />
              {accountSuccess}
            </div>
          )}

          {bankAccounts.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border rounded-2xl text-slate-400 text-xs space-y-2">
              <Landmark size={28} className="mx-auto opacity-30" />
              <p className="font-bold">No has registrado cuentas bancarias aún</p>
              <p className="text-[11px]">Agrega tu Pago Móvil, Zelle o cuentas de banco nacional.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {bankAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-border rounded-2xl flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 text-xs min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">{acc.bank_name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase">
                        {acc.account_type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Titular: {acc.holder_name}</p>
                    {acc.account_number && (
                      <p className="font-mono text-slate-500 text-[11px]">N°: {acc.account_number}</p>
                    )}
                    {acc.phone && (
                      <p className="font-mono text-blue-600 dark:text-blue-400 text-[11px]">📱 Pago Móvil: {acc.phone} {acc.tax_id ? `(${acc.tax_id})` : ''}</p>
                    )}
                    {acc.email && (
                      <p className="font-mono text-purple-600 dark:text-purple-400 text-[11px]">✉️ Zelle/Email: {acc.email}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAccount(acc.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Eliminar cuenta bancaria"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sección: Navegación Móvil */}
        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Smartphone size={16} />
            </div>
            Navegación Móvil (Acceso Rápido)
          </h2>
          <p className="text-xs font-medium text-slate-500 mb-6 max-w-2xl">
            Selecciona hasta 5 módulos para que aparezcan en la barra de navegación inferior en tu teléfono. El botón de Inicio siempre estará incluido por defecto.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {AVAILABLE_MODULES.filter(m => tenantActiveModules.includes(m.id)).map(module => {
              const isSelected = formData.mobile_dock_modules.includes(module.id);
              return (
                <div 
                  key={module.id}
                  onClick={() => toggleDockModule(module.id)}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                    isSelected 
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' 
                      : 'border-border bg-background text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mb-1 ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 dark:border-slate-700'}`}>
                    {isSelected && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                  <span className="text-xs font-bold text-center">{module.name}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-indigo-500 font-bold mt-4">
            Seleccionados: {formData.mobile_dock_modules.length} de 5
          </p>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" isLoading={isLoading} className="w-full md:w-auto px-8 bg-primary hover:bg-primary/90 text-primary-foreground btn-haptic">
            <Save size={18} className="mr-2" />
            Guardar Cambios de Empresa
          </Button>
        </div>
      </form>

      {/* SECCIÓN: CREAR Y GESTIONAR CUENTAS DE USUARIOS (SOLO ADMINISTRADORES) */}
      {isOwnerOrAdmin && (
        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <UserPlus size={16} />
                </div>
                Creación de Cuentas de Acceso (Solo Administrador)
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                Exclusivo Dueño / Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Crea y administra aquí las credenciales para los miembros de tu equipo. Por políticas de seguridad, las contraseñas quedan bajo el control exclusivo del Dueño de la empresa para evitar accesos no autorizados.
            </p>
          </div>

          {createUserError && (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-2xl flex items-center gap-3">
              <AlertTriangle size={18} />
              {createUserError}
            </div>
          )}

          {createUserSuccess && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium rounded-2xl flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 size={18} />
              {createUserSuccess}
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                type="email"
                label="Correo del Empleado *"
                placeholder="empleado@empresa.com"
                value={newUserData.email}
                onChange={e => setNewUserData({ ...newUserData, email: e.target.value })}
                required
              />
              <Input
                type="password"
                label="Contraseña Temporal *"
                placeholder="Clave inicial (mín. 6)"
                value={newUserData.password}
                onChange={e => setNewUserData({ ...newUserData, password: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Rol de Permisos</label>
                <select
                  value={newUserData.role}
                  onChange={e => setNewUserData({ ...newUserData, role: e.target.value as UserRole })}
                  className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none"
                >
                  <option value="seller">Ventas / Caja / Citas (seller)</option>
                  <option value="technician">Técnico / Operativo (technician)</option>
                  <option value="manager">Gerente / Administrador (manager)</option>
                  <option value="owner">Dueño / Acceso Total (owner)</option>
                </select>
              </div>
            </div>

            <Button type="submit" isLoading={isCreatingUser} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all">
              <UserPlus size={15} className="mr-2" />
              Crear Cuenta y Asignar Acceso
            </Button>
          </form>
        </div>
      )}

      {/* Modal para Agregar Cuenta Bancaria */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                <Landmark size={18} className="text-emerald-600" />
                Nueva Cuenta Bancaria / Pago Móvil
              </h3>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-foreground rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            {accountError && (
              <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 text-red-600 text-xs rounded-xl">
                {accountError}
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-foreground mb-1">Tipo de Cuenta *</label>
                <select
                  value={newAccount.account_type}
                  onChange={e => setNewAccount({ ...newAccount, account_type: e.target.value })}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 font-medium"
                >
                  <option value="pago_movil">📱 Pago Móvil</option>
                  <option value="zelle">📱 Zelle ($)</option>
                  <option value="corriente">🏦 Cuenta Corriente</option>
                  <option value="ahorro">🏦 Cuenta de Ahorro</option>
                  <option value="otro">💳 Otro Método</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">Banco / Entidad *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Banesco, Banco de Venezuela, Mercantil, Wells Fargo"
                  value={newAccount.bank_name}
                  onChange={e => setNewAccount({ ...newAccount, bank_name: e.target.value })}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">Nombre del Titular *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Mi Empresa C.A. o Nombre Personal"
                  value={newAccount.holder_name}
                  onChange={e => setNewAccount({ ...newAccount, holder_name: e.target.value })}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-foreground mb-1">Cédula / RIF</label>
                  <input
                    type="text"
                    placeholder="V-12345678 o J-..."
                    value={newAccount.tax_id}
                    onChange={e => setNewAccount({ ...newAccount, tax_id: e.target.value })}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">Teléfono (Pago Móvil)</label>
                  <input
                    type="text"
                    placeholder="04121234567"
                    value={newAccount.phone}
                    onChange={e => setNewAccount({ ...newAccount, phone: e.target.value })}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">Número de Cuenta (20 dígitos o últimos 4)</label>
                <input
                  type="text"
                  placeholder="01340000000000000000"
                  value={newAccount.account_number}
                  onChange={e => setNewAccount({ ...newAccount, account_number: e.target.value })}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">Correo Electrónico (Zelle / PayPal)</label>
                <input
                  type="email"
                  placeholder="pagos@empresa.com"
                  value={newAccount.email}
                  onChange={e => setNewAccount({ ...newAccount, email: e.target.value })}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAccountModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={accountSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {accountSaving ? 'Guardando...' : 'Guardar Cuenta'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
