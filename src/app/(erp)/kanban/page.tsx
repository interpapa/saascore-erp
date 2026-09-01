'use client';

import { useState, useEffect } from 'react';
import { Plus, GripVertical, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Document } from '@/lib/api/documents';
import { TicketModal } from '@/components/tickets/TicketModal';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useActionActor } from '@/hooks/useActionActor';
import { useToast } from '@/components/core/ToastProvider';
import { getDocumentsAction, updateDocumentStatusAction, createDocumentAction } from '@/app/actions/documents';

const COLUMNS = [
  {
    id: 'draft',
    title: 'Pendiente',
    color: 'border-amber-200 dark:border-amber-500/30',
    headerColor: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
    icon: Clock,
  },
  {
    id: 'in_progress',
    title: 'En Proceso',
    color: 'border-blue-200 dark:border-blue-500/30',
    headerColor: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
    icon: AlertTriangle,
  },
  {
    id: 'invoiced',
    title: 'Completado',
    color: 'border-emerald-200 dark:border-emerald-500/30',
    headerColor: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    icon: CheckCircle2,
  },
] as const;

const PRIORITY_LABELS: Record<string, string> = { high: '🔴', medium: '🟡', low: '🟢' };

export default function KanbanPage() {
  const currentTenant = useTenantResolver();
  const actor = useActionActor();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      if (!currentTenant?.id) return;
      const res = await getDocumentsAction(currentTenant.id, 'work_order');
      if (res.success) {
        setTickets(res.documents as Document[]);
      } else {
        toast({ variant: 'error', title: 'Error cargando tickets', description: res.error });
      }
    } catch (err: unknown) {
      console.error('Error loading kanban:', err);
      toast({ variant: 'error', title: 'Error cargando tickets' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, [currentTenant?.id]);

  const moveCard = async (ticketId: string, newStatus: Document['status']) => {
    if (!currentTenant?.id) return;
    // Optimistic update — actualizar UI inmediatamente
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
    setMovingId(ticketId);
    try {
      const res = await updateDocumentStatusAction(ticketId, newStatus as any, currentTenant.id, actor);
      if (!res.success) {
        toast({ variant: 'error', title: 'Error actualizando estado', description: res.error });
        await fetchTickets();
      }
    } catch (err: unknown) {
      // Rollback si falla
      console.error('Error moving card:', err);
      toast({ variant: 'error', title: 'Error actualizando estado' });
      await fetchTickets();
    } finally {
      setMovingId(null);
    }
  };

  const handleCreateTicket = async (formData: unknown) => {
    if (!currentTenant?.id) throw new Error('No hay empresa activa');
    const res = await createDocumentAction({
      entity_id: formData.entity_id,
      type: 'work_order',
      status: 'draft',
      document_number: `OT-${Date.now().toString().slice(-6)}`,
      issue_date: new Date().toISOString(),
      due_date: null,
      notes: formData.description || null,
      metadata: { title: formData.title, description: formData.description, priority: formData.priority },
      lines: [],
    }, currentTenant.id, actor);

    if (res.success) {
      toast({ variant: 'success', title: 'Ticket creado correctamente' });
      await fetchTickets();
    } else {
      toast({ variant: 'error', title: 'Error creando ticket', description: res.error });
      throw new Error(res.error);
    }
  };

  const ticketsByStatus = (status: string) => tickets.filter(t => t.status === status);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Tablero Kanban</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Flujo visual de órdenes de trabajo — {tickets.length} en total</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] flex items-center gap-2 btn-haptic"
        >
          <Plus size={18} />
          Nueva Orden
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-6 h-full min-w-max pb-4">
          {COLUMNS.map(col => {
            const colTickets = ticketsByStatus(col.id);
            const ColIcon = col.icon;

            return (
              <div key={col.id} className={`w-80 flex flex-col rounded-2xl border-2 ${col.color} bg-card/50 overflow-hidden`}>
                {/* Column Header */}
                <div className={`px-4 py-3 flex items-center justify-between ${col.headerColor}`}>
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <ColIcon size={15} />
                    {col.title}
                  </div>
                  <span className="text-xs font-black bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-full">
                    {colTickets.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {colTickets.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-xs font-medium">
                      Sin órdenes aquí
                    </div>
                  )}
                  {colTickets.map(ticket => {
                    const meta = ticket.metadata || {};
                    const isMoving = movingId === ticket.id;

                    return (
                      <div
                        key={ticket.id}
                        className={`bg-card border border-border rounded-xl p-4 shadow-sm transition-all ${isMoving ? 'opacity-50 scale-95' : 'hover:shadow-md hover:border-primary/30'}`}
                      >
                        {/* Priority + Title */}
                        <div className="flex items-start gap-2 mb-3">
                          <span className="text-sm leading-none mt-0.5">{PRIORITY_LABELS[meta.priority] || '🟡'}</span>
                          <p className="text-sm font-bold text-foreground leading-tight flex-1">
                            {meta.title || 'Orden sin título'}
                          </p>
                          <GripVertical size={14} className="text-slate-300 shrink-0 mt-0.5" />
                        </div>

                        {/* Client */}
                        <p className="text-xs text-slate-500 mb-3 truncate">
                          👤 {(ticket.entity as any)?.name || 'Sin cliente'}
                        </p>
                        <p className="text-xs text-slate-400 mb-3 font-mono">#{ticket.document_number}</p>

                        {/* Move buttons */}
                        <div className="flex gap-1.5">
                          {col.id !== 'draft' && (
                            <button
                              onClick={() => moveCard(ticket.id, col.id === 'in_progress' ? 'draft' : 'in_progress')}
                              disabled={isMoving}
                              className="flex-1 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                              ← Volver
                            </button>
                          )}
                          {col.id !== 'invoiced' && (
                            <button
                              onClick={() => moveCard(ticket.id, col.id === 'draft' ? 'in_progress' : 'invoiced')}
                              disabled={isMoving}
                              className={`flex-1 text-[11px] font-bold px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                                col.id === 'draft'
                                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-400'
                                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400'
                              }`}
                            >
                              {col.id === 'draft' ? 'Iniciar →' : 'Completar →'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <TicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateTicket}
      />
    </div>
  );
}
