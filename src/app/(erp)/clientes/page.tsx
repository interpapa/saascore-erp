'use client';

import { LegoModuleDNA } from '@/types/lego';
import { useState, useEffect } from 'react';
import { LegoEngine } from '@/components/lego/LegoEngine';
import { ClientModal } from '@/components/clients/ClientModal';
import { ClientDrawer } from '@/components/clients/ClientDrawer';
import { getEntitiesAction, createEntityAction, updateEntityAction, deleteEntityAction } from '@/app/actions/entities';
import { Entity } from '@/lib/api/entities';
import { Plus } from 'lucide-react';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useToast } from '@/components/core/ToastProvider';

export default function ClientesPage() {
  const currentTenant = useTenantResolver();
  const { session } = useERPStore();
  const { toast } = useToast();
  const [clients, setClients] = useState<Entity[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Entity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const actor = {
    email: session?.userEmail || 'admin@saascore.com',
    role: session?.role || ('owner' as const),
  };

  const fetchClients = async () => {
    if (!currentTenant) return;
    try {
      setIsLoading(true);
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

  useEffect(() => {
    if (currentTenant) {
      fetchClients();
    }
  }, [currentTenant]);

  const handleCreateClient = async (data: any) => {
    if (!currentTenant) return;

    if (clientToEdit) {
      const res = await updateEntityAction(
        clientToEdit.id,
        {
          name: data.full_name,
          email: data.email || null,
          phone: data.phone || null,
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
      }
    } else {
      // Inserción optimista en memoria para renderizado instantáneo
      const tempId = `temp_client_${Date.now()}`;
      const newClient: any = {
        id: tempId,
        type: 'customer',
        name: data.full_name,
        email: data.email || null,
        phone: data.phone || 'Sin teléfono',
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
  const [selectedClient, setSelectedClient] = useState<Entity | null>(null);

  const realCustomData = {
    'crm-stats-real': [{ dummy: true }],
    'crm-clients-real': clients.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone || 'Sin teléfono',
      debt: c.metadata?.total_debt || 0,
      status: Number(c.metadata?.total_debt || 0) > 0 ? 'Con Deuda' : 'Al día',
    })),
  };

  const handlePieceAction = (pieceId: string, item: any) => {
    if (pieceId === 'crm-list-real') {
      const fullClient = clients.find((c) => c.id === item.id);
      if (fullClient) setSelectedClient(fullClient);
    }
  };

  const realCrmDNA: LegoModuleDNA = {
    moduleId: 'crm-module-real-unified',
    name: 'Directorio de Clientes CRM',
    layout: [
      {
        id: 'crm-stats-real',
        type: 'stat-grid',
        span: 'full',
        dataSource: 'crm-stats-real',
        config: {
          metrics: [
            { label: 'Total Clientes', value: clients.length.toString(), icon: 'Users', colorClass: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
            { label: 'Cuentas x Cobrar', value: totalDebt.toString(), format: 'currency', icon: 'DollarSign', colorClass: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
            { label: 'Activos Hoy', value: clients.filter((c) => c.status === 'active').length.toString(), icon: 'Activity', colorClass: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
          ],
        },
      },
      {
        id: 'crm-list-real',
        type: 'list-feed',
        span: 'full',
        dataSource: 'crm-clients-real',
        config: {
          title: 'Directorio de Clientes',
          columns: [
            { field: 'name', label: 'Cliente' },
            { field: 'phone', label: 'Teléfono' },
            { field: 'debt', label: 'Deuda', format: 'currency' },
            { field: 'status', label: 'Estado', type: 'status' },
          ],
        },
      },
    ],
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 relative">
      {/* Cabecera Estandarizada */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Directorio CRM</h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium mt-0.5">Gestión de clientes y cuentas por cobrar</p>
        </div>
        <button
          onClick={() => {
            setClientToEdit(null);
            setIsModalOpen(true);
          }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] flex items-center gap-2 btn-haptic"
        >
          <Plus size={18} />
          Nuevo Cliente
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <LegoEngine dna={realCrmDNA} customData={realCustomData} onPieceAction={handlePieceAction} />
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
