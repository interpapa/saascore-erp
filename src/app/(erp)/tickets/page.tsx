'use client';

import { useState, useEffect } from 'react';
import { Plus, ClipboardList, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getDocuments, createDocumentWithLines, updateDocumentStatus, Document } from '@/lib/api/documents';
import { TicketModal } from '@/components/tickets/TicketModal';
import { TicketDrawer } from '@/components/tickets/TicketDrawer';
import { useERPStore } from '@/store/useERPStore';

const STATUS_PILLS: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  draft:       { label: 'Pendiente',  className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',     icon: Clock },
  in_progress: { label: 'En Proceso', className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',         icon: AlertTriangle },
  invoiced:    { label: 'Completado', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400', icon: CheckCircle2 },
};

const PRIORITY_DOTS: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-emerald-500',
};

export default function TicketsPage() {
  const { currentTenant } = useERPStore();
  const [tickets, setTickets] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Document | null>(null);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const data = await getDocuments('work_order');
      setTickets(data);
    } catch (err) {
      console.error('Error cargando tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (formData: any) => {
    if (!currentTenant) throw new Error('No hay empresa activa');
    await createDocumentWithLines({
      tenant_id: currentTenant.id,
      entity_id: formData.entity_id,
      type: 'work_order',
      status: 'draft',
      document_number: `OT-${Date.now().toString().slice(-6)}`,
      issue_date: new Date().toISOString(),
      due_date: null,
      notes: formData.description || null,
      metadata: {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
      },
      lines: [],
    });
    await fetchTickets();
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await updateDocumentStatus(ticketId, newStatus as Document['status']);
      setSelectedTicket(null);
      await fetchTickets();
    } catch (err) {
      console.error('Error cambiando estado:', err);
    }
  };

  // Stats en tiempo real
  const stats = {
    total:       tickets.length,
    pending:     tickets.filter(t => t.status === 'draft').length,
    inProgress:  tickets.filter(t => t.status === 'in_progress').length,
    completed:   tickets.filter(t => t.status === 'invoiced').length,
  };

  return (
    <div className="max-w-5xl mx-auto w-full h-full overflow-y-auto p-4 md:p-8">

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Órdenes de Trabajo</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Gestión de tickets y trabajos del taller</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] flex items-center gap-2 btn-haptic"
        >
          <Plus size={18} />
          Nueva Orden
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total',       value: stats.total,      color: 'from-indigo-500 to-blue-600' },
          { label: 'Pendientes',  value: stats.pending,    color: 'from-amber-400 to-orange-500' },
          { label: 'En Proceso',  value: stats.inProgress, color: 'from-blue-500 to-cyan-600' },
          { label: 'Completados', value: stats.completed,  color: 'from-emerald-500 to-teal-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
            <span className={`text-3xl font-black bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Lista de Tickets */}
      {isLoading ? (
        <div className="flex justify-center p-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <ClipboardList size={56} className="mb-4 opacity-40" />
          <p className="font-semibold text-lg">No hay órdenes de trabajo aún</p>
          <p className="text-sm mt-1">Crea la primera orden con el botón de arriba</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => {
            const meta = ticket.metadata || {};
            const pill = STATUS_PILLS[ticket.status] || STATUS_PILLS['draft'];
            const PillIcon = pill.icon;
            const priorityDot = PRIORITY_DOTS[meta.priority] || PRIORITY_DOTS['medium'];
            return (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
              >
                {/* Priority dot */}
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${priorityDot}`} />

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                    {meta.title || 'Orden sin título'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5 truncate">
                    {(ticket.entity as any)?.name || 'Sin cliente'} · #{ticket.document_number}
                  </p>
                </div>

                {/* Status pill */}
                <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${pill.className}`}>
                  <PillIcon size={11} />
                  {pill.label}
                </div>

                {/* Date */}
                <span className="text-xs text-slate-400 font-medium shrink-0 hidden sm:block">
                  {new Date(ticket.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <TicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateTicket}
      />

      <TicketDrawer
        ticket={selectedTicket}
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
