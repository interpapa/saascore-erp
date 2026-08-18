'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClientModal } from '@/components/clients/ClientModal';
import { ClientDrawer } from '@/components/clients/ClientDrawer';
import { getEntitiesAction, createEntityAction, updateEntityAction, deleteEntityAction } from '@/app/actions/entities';
import { getAuditLogsAction } from '@/app/actions/audit';
import { Entity } from '@/lib/api/entities';
import { Plus, Download, Users, DollarSign, Activity, Calendar, MessageSquare, ShoppingBag, ArrowRight } from 'lucide-react';
import { exportToCSV } from '@/lib/core/exportToCSV';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useToast } from '@/components/core/ToastProvider';
import { ViewToggle, useViewPreference } from '@/components/ui/ViewToggle';
import { SkeletonCardGrid } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useRouter } from 'next/navigation';
import { UnderlineTabs } from '@/components/ui/Tabs';
import { AuditTrailSection } from '@/components/ui/AuditTrailSection';

type TabType = 'clients' | 'audit';

export default function ClientesPage() {
  const currentTenant = useTenantResolver();
  const { session } = useERPStore();
  const { toast } = useToast();
  const router = useRouter();
  const [clients, setClients] = useState<Entity[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Entity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useViewPreference('clientes-view-mode', 'grid');
  const [selectedClient, setSelectedClient] = useState<Entity | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('clients');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  const actor = {
    email: session?.userEmail || 'admin@saascore.com',
    role: session?.role || ('owner' as const),
  };

  const handleExportCSV = () => {
    exportToCSV(
      'directorio_clientes.csv',
      [
        { header: 'Nombre', accessor: c => c.name },
        { header: 'Email', accessor: c => c.email || '' },
        { header: 'Teléfono', accessor: c => c.phone || '' },
        { header: 'Identificación Fiscal', accessor: c => c.tax_id || '' },
        { header: 'Dirección', accessor: c => c.address || '' },
        { header: 'Estado', accessor: c => c.status || 'active' },
      ],
      clients
    );
    toast({ variant: 'success', title: 'Reporte Exportado', description: 'El directorio de clientes se ha descargado en formato CSV.' });
  };

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      if (!currentTenant?.id) return;
      const result = await getEntitiesAction(currentTenant.id, 'customer');
      if (result.success && result.entities) {
        setClients(result.entities as any);
      }
    } catch (error) {
      console.error('Error cargando clientes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAuditLogs = useCallback(async () => {
    if (!currentTenant?.id) return;
    try {
      setIsLoadingAudit(true);
      const res = await getAuditLogsAction(currentTenant.id, 'entity', 40);
      if (res.success) {
        setAuditLogs(res.logs);
      }
    } catch (err) {
      console.error('Error cargando auditoría de clientes:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    if (currentTenant) {
      fetchClients();
    }
  }, [currentTenant]);

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab, loadAuditLogs]);

  const handleCreateClient = async (data: any) => {
    if (!currentTenant) return;

    if (clientToEdit) {
      const res = await updateEntityAction(
        clientToEdit.id,
        {
          name: data.full_name,
          email: data.email || null,
          phone: data.phone || null,
          tax_id: data.tax_id || null,
          address: data.address || null,
          metadata: { ...clientToEdit.metadata, total_debt: data.total_debt || 0 },
        },
        currentTenant.id,
        actor
      );
      if (!res.success) {
        toast({ variant: 'error', title: 'Error al actualizar', description: res.error });
      } else {
        toast({ variant: 'success', title: 'Cliente Actualizado', description: `Los datos de "${data.full_name}" han sido modificados.` });
        fetchClients();
      }
    } else {
      const tempId = `temp_client_${Date.now()}`;
      const newClient: any = {
        id: tempId,
        type: 'customer',
        name: data.full_name,
        email: data.email || null,
        phone: data.phone || 'Sin teléfono',
        tax_id: data.tax_id || null,
        address: data.address || null,
        status: 'active',
        metadata: { total_debt: data.total_debt || 0 },
      };
      setClients((prev) => [newClient, ...prev]);

      try {
        const res = await createEntityAction(
          {
            type: 'customer',
            name: data.full_name,
            email: data.email || null,
            phone: data.phone || null,
            tax_id: data.tax_id || null,
            address: data.address || null,
            status: 'active',
            metadata: { total_debt: data.total_debt || 0 },
          },
          currentTenant.id,
          actor
        );
        if (!res.success) {
          toast({ variant: 'warning', title: 'Guardado Local', description: 'Cliente agregado en pantalla. Configura Supabase para sincronizar.' });
        } else {
          toast({ variant: 'success', title: 'Cliente Registrado', description: `"${data.full_name}" se agregó al CRM.` });
          fetchClients();
        }
      } catch (err) {
        toast({ variant: 'info', title: 'Modo Offline', description: 'Cliente guardado en esta sesión.' });
      }
    }
    setClientToEdit(null);
  };

  const handleDeleteClient = async (id: string) => {
    if (!currentTenant) return;
    const res = await deleteEntityAction(id, currentTenant.id, actor);
    if (res.success) {
      toast({ variant: 'info', title: 'Cliente Eliminado', description: 'El registro se marcó como eliminado (Soft Delete).' });
    }
    await fetchClients();
    setSelectedClient(null);
  };

  const totalDebt = clients.reduce((acc, c) => acc + Number(c.metadata?.total_debt || 0), 0);

  const tabs = [
    { id: 'clients', label: 'Directorio de Clientes', icon: Users, count: clients.length },
    { id: 'audit', label: 'Auditoría de Contactos', icon: Activity },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 relative">
      {/* Cabecera Estandarizada */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Directorio CRM</h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium mt-0.5 font-sans">Gestión de clientes y cuentas por cobrar</p>
        </div>
        {activeTab === 'clients' && (
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <ViewToggle storageKey="clientes-view-mode" currentView={viewMode} onViewChange={setViewMode} />
            <button
              onClick={handleExportCSV}
              className="bg-card hover:bg-slate-100 dark:hover:bg-slate-800 border border-border text-foreground px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 btn-haptic"
            >
              <Download size={18} />
              Exportar CSV
            </button>
            <button
              onClick={() => {
                setClientToEdit(null);
                setIsModalOpen(true);
              }}
              className="btn-base btn-primary btn-haptic flex items-center gap-2"
            >
              <Plus size={18} />
              Nuevo Cliente
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
          {/* KPI Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[rgba(27,95,168,0.15)] flex items-center justify-center text-primary">
                <Users size={20} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Clientes</p>
                <p className="text-2xl font-bold text-foreground">{clients.length}</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[rgba(220,38,38,0.15)] flex items-center justify-center text-danger">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cuentas x Cobrar</p>
                <p className="text-2xl font-bold text-foreground">${totalDebt.toLocaleString('es', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[rgba(22,163,74,0.15)] flex items-center justify-center text-success">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Activos</p>
                <p className="text-2xl font-bold text-foreground">{clients.filter((c) => c.status === 'active').length}</p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <SkeletonCardGrid count={6} columns={3} showAvatar />
          ) : clients.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Sin clientes registrados"
              description="Comienza a registrar clientes en tu ERP para emitir facturas y gestionar sus deudas."
              actionLabel="Registrar primer cliente"
              onAction={() => setIsModalOpen(true)}
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {clients.map((client) => {
                const debt = Number(client.metadata?.total_debt || 0);
                const hasDebt = debt > 0;

                return (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className="bg-card border border-border rounded-2xl p-5 flex flex-col justify-between hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm uppercase">
                          {client.name.substring(0, 2)}
                        </div>
                        <span className={`badge ${hasDebt ? 'badge-danger' : 'badge-success'}`}>
                          {hasDebt ? 'Con Deuda' : 'Al día'}
                        </span>
                      </div>
                      <h3 className="text-h3 font-bold text-foreground mb-1 group-hover:text-primary transition-colors font-sans">
                        {client.name}
                      </h3>
                      <p className="text-xs text-slate-500 mb-2">{client.phone || 'Sin teléfono'}</p>
                      <p className="text-xs text-slate-400 line-clamp-1">{client.email || 'Sin correo'}</p>
                    </div>

                    <div className="flex justify-between items-center mt-5 pt-4 border-t border-border/50">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Deuda Pendiente</p>
                        <p className={`text-md font-bold ${hasDebt ? 'text-danger' : 'text-foreground'}`}>
                          ${debt.toLocaleString('es', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <ArrowRight size={16} className="text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>

                    {/* Smart Action Buttons (hover overlay) */}
                    <div className="absolute inset-x-0 bottom-0 bg-slate-900/95 dark:bg-slate-955/95 p-3 flex justify-around items-center translate-y-full group-hover:translate-y-0 transition-transform duration-200" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/calendario?client=${client.id}`)}
                        className="flex flex-col items-center gap-1 text-[10px] font-bold text-white hover:text-primary transition-colors btn-haptic"
                      >
                        <Calendar size={18} />
                        Agendar
                      </button>
                      <button
                        onClick={() => router.push(`/whatsapp?client=${client.id}`)}
                        className="flex flex-col items-center gap-1 text-[10px] font-bold text-white hover:text-success transition-colors btn-haptic"
                      >
                        <MessageSquare size={18} />
                        Chat CRM
                      </button>
                      <button
                        onClick={() => router.push(`/caja?client=${client.id}`)}
                        className="flex flex-col items-center gap-1 text-[10px] font-bold text-white hover:text-warning transition-colors btn-haptic"
                      >
                        <ShoppingBag size={18} />
                        Venta POS
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500">
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Identificación</th>
                    <th className="p-4">Teléfono</th>
                    <th className="p-4">Correo</th>
                    <th className="p-4 text-right">Saldo Deuda</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Acciones CRM</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => {
                    const debt = Number(client.metadata?.total_debt || 0);
                    const hasDebt = debt > 0;

                    return (
                      <tr
                        key={client.id}
                        onClick={() => setSelectedClient(client)}
                        className="border-b border-border/50 last:border-0 hover:bg-slate-50/30 dark:hover:bg-slate-900/10 cursor-pointer transition-colors text-sm"
                      >
                        <td className="p-4 font-semibold text-foreground">{client.name}</td>
                        <td className="p-4 text-xs font-mono">{client.tax_id || '-'}</td>
                        <td className="p-4">{client.phone || '-'}</td>
                        <td className="p-4 text-slate-500 text-xs">{client.email || '-'}</td>
                        <td className="p-4 text-right font-bold text-foreground">
                          ${debt.toLocaleString('es', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4">
                          <span className={`badge ${hasDebt ? 'badge-danger' : 'badge-success'}`}>
                            {hasDebt ? 'Con Deuda' : 'Al día'}
                          </span>
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => router.push(`/calendario?client=${client.id}`)}
                              className="btn-base btn-ghost btn-sm"
                              title="Agendar Cita"
                            >
                              <Calendar size={14} />
                            </button>
                            <button
                              onClick={() => router.push(`/whatsapp?client=${client.id}`)}
                              className="btn-base btn-ghost btn-sm"
                              title="WhatsApp Chat"
                            >
                              <MessageSquare size={14} />
                            </button>
                            <button
                              onClick={() => router.push(`/caja?client=${client.id}`)}
                              className="btn-base btn-ghost btn-sm"
                              title="Cobrar / Registrar Venta"
                            >
                              <ShoppingBag size={14} />
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
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="mb-4">
            <h3 className="text-h3 font-bold text-foreground font-sans">Bitácora de Cambios de CRM Clientes</h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">Bitácora de auditoría histórica para clientes agregados, modificados o deudas cambiadas.</p>
          </div>
          <AuditTrailSection logs={auditLogs} isLoading={isLoadingAudit} />
        </div>
      )}

      <ClientModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setClientToEdit(null);
        }}
        onSave={handleCreateClient}
        initialData={clientToEdit}
      />

      <ClientDrawer
        client={selectedClient}
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        onDelete={handleDeleteClient}
        onEdit={(c) => {
          setClientToEdit(c);
          setIsModalOpen(true);
        }}
      />
    </div>
  );
}
