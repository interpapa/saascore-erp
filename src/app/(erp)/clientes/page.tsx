'use client';

import { LegoModuleDNA } from '@/types/lego';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LegoEngine } from '@/components/lego/LegoEngine';
import { ClientModal } from '@/components/clients/ClientModal';
import { ClientDrawer } from '@/components/clients/ClientDrawer';
import { getEntities, createEntity, CreateEntityInput, Entity } from '@/lib/api/entities';
import { Plus, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function ClientesPage() {
  const [clients, setClients] = useState<Entity[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClients = async () => {
    try {
      console.log("Iniciando fetchClients...");
      setIsLoading(true);
      const data = await getEntities('customer');
      console.log("Datos recibidos:", data);
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      console.log("Terminando fetchClients (finally)");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreateClient = async (data: any) => {
    // Adapter for modal: convert old ClientModal payload to new Entity structure
    const newEntity: CreateEntityInput = {
      type: 'customer',
      name: data.full_name,
      email: data.email || null,
      phone: data.phone || null,
      tax_id: null,
      address: data.address || null,
      metadata: { total_debt: data.total_debt || 0 }, // Guardar la deuda vieja en metadata
      status: 'active'
    };
    await createEntity(newEntity);
    await fetchClients(); // Recargar la tabla
  };

  // Extraer total_debt sumando todos los metadata
  const totalDebt = clients.reduce((acc, c) => acc + Number(c.metadata?.total_debt || 0), 0);
  
  const [selectedClient, setSelectedClient] = useState<Entity | null>(null);

  const realCustomData = {
    'crm-stats-real': [
      { dummy: true }
    ],
    'crm-clients-real': clients.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone || 'Sin teléfono',
      debt: c.metadata?.total_debt || 0,
      status: (c.metadata?.total_debt || 0) > 0 ? 'Con Deuda' : 'Al día'
    }))
  };

  const handlePieceAction = (pieceId: string, item: any) => {
    if (pieceId === 'crm-list-real') {
      const fullClient = clients.find(c => c.id === item.id);
      if (fullClient) setSelectedClient(fullClient);
    }
  };

  const realCrmDNA: LegoModuleDNA = {
    moduleId: 'crm-module-real',
    name: '', // El título lo ponemos afuera
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
            { label: 'Activos Hoy', value: '0', icon: 'Activity', colorClass: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' }
          ]
        }
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
            { field: 'status', label: 'Estado', type: 'status' }
          ]
        }
      }
    ]
  };

  return (
    <div className="max-w-5xl mx-auto w-full h-full overflow-y-auto p-4 md:p-8 relative">
      {/* Cabecera del Módulo */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Directorio CRM</h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Gestión de clientes y estados de cuenta</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
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
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateClient}
      />

      <ClientDrawer
        client={selectedClient}
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
      />
    </div>
  );
}
