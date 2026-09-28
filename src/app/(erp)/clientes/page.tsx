'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ClientModal } from '@/components/clients/ClientModal';
import { ClientDrawer } from '@/components/clients/ClientDrawer';
import { getEntitiesAction, createEntityAction, updateEntityAction, deleteEntityAction } from '@/app/actions/entities';
import { getAuditLogsAction } from '@/app/actions/audit';
import { getTenantEntitySchemaAction } from '@/app/actions/entitySchema';
import { CustomFieldDefinition } from '@/lib/core/industryTemplates';
import { Entity } from '@/lib/api/entities';
import { 
  Plus, Download, Users, DollarSign, Activity, Calendar, MessageSquare, 
  ShoppingBag, ArrowRight, Search, Filter, Sparkles, UserCheck, ShieldAlert,
  Phone, Mail, Tag, Copy, Check, Stethoscope
} from 'lucide-react';
import { exportToCSV } from '@/lib/core/exportToCSV';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useToast } from '@/components/core/ToastProvider';
import { ViewToggle, useViewPreference } from '@/components/ui/ViewToggle';
import { SkeletonCardGrid } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useActionActor } from '@/hooks/useActionActor';
import { useRouter } from 'next/navigation';
import { UnderlineTabs } from '@/components/ui/Tabs';
import { AuditTrailSection } from '@/components/ui/AuditTrailSection';

type TabType = 'clients' | 'audit';

export default function ClientesPage() {
  const currentTenant = useTenantResolver();
  const session = useERPStore(s => s.session);
  const { toast } = useToast();
  const router = useRouter();
  const actor = useActionActor();

  // Estados Principales
  const [clients, setClients] = useState<Entity[]>([]);
  const [customSchema, setCustomSchema] = useState<CustomFieldDefinition[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Entity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useViewPreference('clientes-view-mode', 'grid');
  const [selectedClient, setSelectedClient] = useState<Entity | null>(null);
  const [drawerInitialTab, setDrawerInitialTab] = useState<'perfil' | 'registros' | 'archivos' | 'historial'>('perfil');
  const [activeTab, setActiveTab] = useState<TabType>('clients');
  const [auditLogs, setAuditLogs] = useState<unknown[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Búsqueda y Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'debt' | 'up_to_date' | 'natural' | 'juridica'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleExportCSV = () => {
    exportToCSV(
      'directorio_clientes.csv',
      [
        { header: 'Nombre', accessor: c => c.name },
        { header: 'Identificación (Cédula/RIF)', accessor: c => c.tax_id || '' },
        { header: 'Teléfono', accessor: c => c.phone || '' },
        { header: 'Email', accessor: c => c.email || '' },
        { header: 'Dirección', accessor: c => c.address || '' },
        { header: 'Deuda Pendiente', accessor: c => (c.metadata as any)?.total_debt || '0' },
        { header: 'Estado', accessor: c => c.status || 'active' },
      ],
      clients
    );
    toast({ variant: 'success', title: 'Reporte Exportado', description: 'El directorio de clientes se ha descargado en formato CSV.' });
  };

  const fetchClients = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!currentTenant?.id || !actor) return;
      const [entitiesRes, schemaRes] = await Promise.all([
        getEntitiesAction(currentTenant.id, 'customer', 150, actor),
        getTenantEntitySchemaAction(currentTenant.id, actor),
      ]);

      if (entitiesRes.success && entitiesRes.entities) {
        setClients(entitiesRes.entities as any);
      }
      if (schemaRes.success && schemaRes.schema) {
        setCustomSchema(schemaRes.schema);
      }
    } catch (error) {
      console.error('Error cargando clientes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant?.id, actor]);

  const loadAuditLogs = useCallback(async () => {
    if (!currentTenant?.id || !actor) return;
    try {
      setIsLoadingAudit(true);
      const res = await getAuditLogsAction(currentTenant.id, 'entity', 40, actor);
      if (res.success) {
        setAuditLogs(res.logs);
      }
    } catch (err) {
      console.error('Error cargando auditoría de clientes:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  }, [currentTenant?.id, actor]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab, loadAuditLogs]);

  const handleCreateOrUpdateClient = async (data: any) => {
    const effectiveActor = actor || (session?.userEmail ? {
      email: session.userEmail,
      role: session.role,
      token: session.token,
    } : null);

    if (!currentTenant?.id) {
      throw new Error('Empresa no seleccionada. Por favor recarga la página.');
    }
    if (!effectiveActor) {
      throw new Error('Sesión de usuario no disponible. Por favor recarga la página o inicia sesión.');
    }

    if (clientToEdit) {
      const res = await updateEntityAction(
        clientToEdit.id,
        {
          name: data.full_name,
          email: data.email,
          phone: data.phone,
          tax_id: data.tax_id,
          address: data.address,
          metadata: {
            ...clientToEdit.metadata,
            ...data.metadata,
            total_debt: data.total_debt || 0,
          },
        },
        currentTenant.id,
        effectiveActor
      );

      if (!res.success) {
        throw new Error(res.error || 'Error al actualizar el contacto');
      }

      toast({ variant: 'success', title: 'Ficha Actualizada', description: `Los datos de "${data.full_name}" han sido modificados.` });
      await fetchClients();
      if (selectedClient && selectedClient.id === clientToEdit.id) {
        setSelectedClient(res.entity as any);
      }
    } else {
      // Optimistic update inmediato para respuesta instantánea
      const tempId = `temp_${Date.now()}`;
      const optimisticEntity: Entity = {
        id: tempId,
        tenant_id: currentTenant.id,
        type: 'customer',
        name: data.full_name,
        email: data.email,
        phone: data.phone || 'Sin teléfono',
        tax_id: data.tax_id,
        address: data.address,
        status: 'active',
        metadata: {
          ...data.metadata,
          total_debt: data.total_debt || 0,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setClients(prev => [optimisticEntity, ...prev]);

      const res = await createEntityAction(
        {
          type: 'customer',
          name: data.full_name,
          email: data.email,
          phone: data.phone,
          tax_id: data.tax_id,
          address: data.address,
          status: 'active',
          metadata: {
            ...data.metadata,
            total_debt: data.total_debt || 0,
          },
        },
        currentTenant.id,
        effectiveActor
      );

      if (!res.success) {
        // Revertir optimistic si falla
        setClients(prev => prev.filter(c => c.id !== tempId));
        throw new Error(res.error || 'Error al registrar el cliente');
      }

      toast({ variant: 'success', title: 'Cliente Registrado', description: `"${data.full_name}" ha sido agregado al directorio.` });
      await fetchClients();
    }
    setClientToEdit(null);
  };

  const handleDeleteClient = async (id: string) => {
    if (!currentTenant || !actor) return;
    const res = await deleteEntityAction(id, currentTenant.id, actor);
    if (res.success) {
      toast({ variant: 'info', title: 'Cliente Eliminado', description: 'El contacto se removió del directorio.' });
      setClients(clients.filter(c => c.id !== id));
      setSelectedClient(null);
    } else {
      toast({ variant: 'error', title: 'Error al eliminar', description: res.error });
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    toast({ variant: 'success', title: 'Copiado', description: text });
  };

  // Filtrado y Búsqueda Reactiva (por Cédula, Nombre y Teléfono)
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = client.name?.toLowerCase().includes(q);
      const taxIdMatch = client.tax_id?.toLowerCase().includes(q);
      const phoneMatch = client.phone?.toLowerCase().includes(q);
      const matchesSearch = !q || nameMatch || taxIdMatch || phoneMatch;

      const debt = Number((client.metadata as any)?.total_debt || 0);
      const subtype = (client.metadata as any)?.entity_subtype;
      const clientTags: string[] = Array.isArray((client.metadata as any)?.tags) ? (client.metadata as any).tags : [];

      let matchesFilter = true;
      if (filterStatus === 'debt') matchesFilter = debt > 0;
      if (filterStatus === 'up_to_date') matchesFilter = debt <= 0;
      if (filterStatus === 'natural') matchesFilter = subtype !== 'juridica';
      if (filterStatus === 'juridica') matchesFilter = subtype === 'juridica';

      let matchesTag = true;
      if (selectedTag !== 'all') {
        matchesTag = clientTags.includes(selectedTag);
      }

      return matchesSearch && matchesFilter && matchesTag;
    });
  }, [clients, searchQuery, filterStatus, selectedTag]);

  // Lista de tags únicos disponibles
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    clients.forEach((c) => {
      const t = (c.metadata as any)?.tags;
      if (Array.isArray(t)) t.forEach(tag => set.add(tag));
    });
    return Array.from(set);
  }, [clients]);

  // Métricas y KPIs
  const totalDebt = useMemo(() => {
    return clients.reduce((acc, c) => acc + Number((c.metadata as any)?.total_debt || 0), 0);
  }, [clients]);

  const newThisMonth = useMemo(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return clients.filter(c => new Date(c.created_at) >= firstDay).length;
  }, [clients]);

  const tabs = [
    { id: 'clients', label: 'Directorio de Contactos', icon: Users, count: clients.length },
    { id: 'audit', label: 'Auditoría de Modificaciones', icon: Activity },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 relative">
      {/* Cabecera Estandarizada */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Directorio Universal</h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium mt-0.5 text-xs">
            Fichas de clientes, pacientes, historias de atención y cuentas por cobrar
          </p>
        </div>

        {activeTab === 'clients' && (
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <ViewToggle storageKey="clientes-view-mode" currentView={viewMode} onViewChange={setViewMode} />
            <button
              onClick={handleExportCSV}
              className="bg-card hover:bg-slate-100 dark:hover:bg-slate-800 border border-border text-foreground px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 btn-haptic shadow-xs"
            >
              <Download size={15} />
              <span>Exportar</span>
            </button>
            <button
              onClick={() => {
                setClientToEdit(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-black text-xs flex items-center gap-1.5 hover:bg-primary/90 transition-all btn-haptic shadow-xs"
            >
              <Plus size={16} />
              <span>Nuevo Contacto</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <UnderlineTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as TabType)}
      />

      {activeTab === 'clients' ? (
        <>
          {/* KPI Bar Enriquecida */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Users size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Contactos</p>
                <p className="text-xl font-black text-foreground font-mono">{clients.length}</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <DollarSign size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cuentas x Cobrar</p>
                <p className="text-xl font-black text-foreground font-mono">${totalDebt.toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <UserCheck size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Al Día</p>
                <p className="text-xl font-black text-foreground font-mono">
                  {clients.filter(c => Number((c.metadata as any)?.total_debt || 0) <= 0).length}
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nuevos Este Mes</p>
                <p className="text-xl font-black text-foreground font-mono">{newThisMonth}</p>
              </div>
            </div>
          </div>

          {/* Barra de Búsqueda Avanzada y Filtros Rápidos */}
          <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Input de Búsqueda Multicriterio (Cédula, Nombre, Teléfono) */}
              <div className="relative flex-1 w-full">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por cédula (V-12345678), nombre o teléfono..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filtro por Estado / Subtipo */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    filterStatus === 'all'
                      ? 'bg-foreground text-background shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-foreground'
                  }`}
                >
                  Todos ({clients.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('debt')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    filterStatus === 'debt'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-foreground'
                  }`}
                >
                  Con Deuda
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('up_to_date')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    filterStatus === 'up_to_date'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-foreground'
                  }`}
                >
                  Al Día
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('natural')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    filterStatus === 'natural'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-foreground'
                  }`}
                >
                  Personas
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('juridica')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    filterStatus === 'juridica'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-foreground'
                  }`}
                >
                  Empresas
                </button>
              </div>
            </div>

            {/* Chips de Tags si existen */}
            {availableTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-border/50 text-[11px]">
                <span className="text-slate-400 font-bold shrink-0 flex items-center gap-1 mr-1">
                  <Tag size={12} /> Tags:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTag('all')}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                    selectedTag === 'all'
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'text-slate-400 hover:text-foreground'
                  }`}
                >
                  Todos
                </button>
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag === selectedTag ? 'all' : tag)}
                    className={`px-2 py-0.5 rounded-md font-bold border transition-all ${
                      selectedTag === tag
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border text-slate-500 hover:border-slate-400'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Visualización Principal: Grid o Tabla */}
          {isLoading ? (
            <SkeletonCardGrid count={6} columns={3} showAvatar />
          ) : filteredClients.length === 0 ? (
            <EmptyState
              icon={Users}
              title={searchQuery ? 'No se encontraron contactos' : 'Sin clientes registrados'}
              description={
                searchQuery
                  ? `No hay coincidencias para "${searchQuery}". Revisa la cédula o nombre ingresado.`
                  : 'Registra tus primeros clientes o pacientes para llevar su historial clínico, turnos y ventas.'
              }
              actionLabel="Registrar primer cliente"
              onAction={() => setIsModalOpen(true)}
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map((client) => {
                const metadata = (client.metadata as any) || {};
                const debt = Number(metadata.total_debt || 0);
                const hasDebt = debt > 0;
                const isNew = (Date.now() - new Date(client.created_at).getTime()) < (7 * 24 * 60 * 60 * 1000);
                const tags: string[] = Array.isArray(metadata.tags) ? metadata.tags : [];

                return (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className="bg-card border border-border rounded-2xl p-5 flex flex-col justify-between hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden space-y-4"
                  >
                    <div>
                      {/* Cabecera de la Tarjeta */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-sm uppercase shadow-xs">
                            {client.name.substring(0, 2)}
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase text-slate-400 block">
                              {metadata.entity_subtype === 'juridica' ? 'Empresa' : 'Persona'}
                            </span>
                            {client.tax_id && (
                              <span className="text-xs font-mono font-bold text-foreground">
                                {client.tax_id}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isNew && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-500/10 text-blue-600 border border-blue-500/20">
                              NUEVO
                            </span>
                          )}
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            hasDebt
                              ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          }`}>
                            {hasDebt ? 'Con Deuda' : 'Al Día'}
                          </span>
                        </div>
                      </div>

                      {/* Nombre y Contacto */}
                      <h3 className="text-base font-black text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {client.name}
                      </h3>

                      <div className="space-y-1 text-xs text-slate-500 mt-2">
                        {client.phone && (
                          <p className="flex items-center gap-1.5 truncate">
                            <Phone size={12} className="text-slate-400 shrink-0" />
                            <span>{client.phone}</span>
                          </p>
                        )}
                        {client.email && (
                          <p className="flex items-center gap-1.5 truncate">
                            <Mail size={12} className="text-slate-400 shrink-0" />
                            <span>{client.email}</span>
                          </p>
                        )}
                      </div>

                      {/* Tags */}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {tags.slice(0, 3).map((t) => (
                            <span key={t} className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-bold">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer de Tarjeta con Deuda y Flecha */}
                    <div className="pt-3 border-t border-border/50 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Saldo Pendiente</p>
                        <p className={`text-sm font-black font-mono ${hasDebt ? 'text-rose-600' : 'text-foreground'}`}>
                          ${debt.toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            setDrawerInitialTab('registros');
                            setSelectedClient(client);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all flex items-center gap-1 border border-blue-500/20 btn-haptic"
                          title="Abrir historia médica / servicios en 1 clic"
                        >
                          <Stethoscope size={13} />
                          <span>Historia</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDrawerInitialTab('perfil');
                            setSelectedClient(client);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground text-xs font-bold transition-all flex items-center gap-1 btn-haptic"
                        >
                          <span>Ficha</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Vista Tabla */
            <div className="bg-card border border-border rounded-2xl overflow-hidden overflow-x-auto shadow-xs">
              <table className="w-full text-left border-collapse min-w-[700px] text-xs">
                <thead>
                  <tr className="border-b border-border bg-slate-50/70 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="p-3.5">Contacto</th>
                    <th className="p-3.5">Identificación (Cédula/RIF)</th>
                    <th className="p-3.5">Teléfono</th>
                    <th className="p-3.5">Correo</th>
                    <th className="p-3.5 text-right">Saldo Deuda</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredClients.map((client) => {
                    const metadata = (client.metadata as any) || {};
                    const debt = Number(metadata.total_debt || 0);
                    const hasDebt = debt > 0;

                    return (
                      <tr
                        key={client.id}
                        onClick={() => setSelectedClient(client)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        <td className="p-3.5 font-bold text-foreground">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs shrink-0">
                              {client.name.charAt(0)}
                            </div>
                            <span className="truncate max-w-[180px]">{client.name}</span>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-foreground">{client.tax_id || '-'}</td>
                        <td className="p-3.5">{client.phone || '-'}</td>
                        <td className="p-3.5 text-slate-400 truncate max-w-[160px]">{client.email || '-'}</td>
                        <td className="p-3.5 text-right font-mono font-black text-foreground">
                          ${debt.toFixed(2)}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                            hasDebt
                              ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          }`}>
                            {hasDebt ? 'Con Deuda' : 'Al Día'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setDrawerInitialTab('registros');
                                setSelectedClient(client);
                              }}
                              className="p-1.5 rounded-lg border border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors"
                              title="Abrir Historia Clínica y Fotos en 1 clic"
                            >
                              <Stethoscope size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => router.push(`/calendario?client=${client.id}`)}
                              className="p-1.5 rounded-lg border border-border text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Agendar Cita"
                            >
                              <Calendar size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => router.push(`/caja?client=${client.id}`)}
                              className="p-1.5 rounded-lg border border-border text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Cobro POS"
                            >
                              <ShoppingBag size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs">
          <div className="mb-4">
            <h3 className="text-base font-black text-foreground">Bitácora de Auditoría CRM</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Registro inmutable de creación, edición y eliminación de contactos
            </p>
          </div>
          <AuditTrailSection logs={auditLogs as any} isLoading={isLoadingAudit} />
        </div>
      )}

      {/* Modal de Creación / Edición */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setClientToEdit(null);
        }}
        onSave={handleCreateOrUpdateClient}
        initialData={clientToEdit}
        customSchema={customSchema}
      />

      {/* Drawer Detallado con Historias Clínicas, Fotos y Compras */}
      <ClientDrawer
        client={selectedClient}
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        onDelete={handleDeleteClient}
        onEdit={(c) => {
          setClientToEdit(c);
          setIsModalOpen(true);
        }}
        tenantId={currentTenant?.id}
        actor={actor}
        customSchema={customSchema}
        initialTab={drawerInitialTab}
      />
    </div>
  );
}
