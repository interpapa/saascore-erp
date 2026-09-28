'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, GripVertical, Clock, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { Document } from '@/lib/api/documents';
import { TicketModal } from '@/components/tickets/TicketModal';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useActionActor } from '@/hooks/useActionActor';
import { useToast } from '@/components/core/ToastProvider';
import { getDocumentsAction, updateDocumentStatusAction, createDocumentAction, toggleProcessStepAction } from '@/app/actions/documents';

// Suppress unused import warnings — kept for icon consistency
void Clock; void AlertTriangle; void CheckCircle2;

interface ProcessStep {
  id: string;
  title: string;
  completed: boolean;
  order: number;
}

const UNIVERSAL_COLUMNS = [
  { id: 'draft', title: 'Por Iniciar', color: 'border-amber-200 dark:border-amber-500/30', headerColor: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  { id: 'in_progress', title: 'En Proceso', color: 'border-blue-200 dark:border-blue-500/30', headerColor: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  { id: 'in_review', title: 'En Revisión / Control', color: 'border-purple-200 dark:border-purple-500/30', headerColor: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400' },
  { id: 'invoiced', title: 'Completado', color: 'border-emerald-200 dark:border-emerald-500/30', headerColor: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
];

const PRIORITY_LABELS: Record<string, string> = { high: '🔴', medium: '🟡', low: '🟢' };

const normalizeColumnStatus = (status: string): string => {
  if (status === 'draft' || status === 'presupuestado' || status === 'recibido') return 'draft';
  if (status === 'in_progress' || status === 'en_tratamiento' || status === 'en_reparacion' || status === 'diagnostico') return 'in_progress';
  if (status === 'in_review' || status === 'en_laboratorio' || status === 'control_post' || status === 'listo') return 'in_review';
  if (status === 'invoiced' || status === 'concluido' || status === 'entregado') return 'invoiced';
  return 'draft';
};

export default function KanbanPage() {
  const currentTenant = useTenantResolver();
  const actor = useActionActor();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'with_steps' | 'mine'>('all');
  const [pendingAdvance, setPendingAdvance] = useState<{ ticketId: string; currentColId: string } | null>(null);

  const COLUMNS = UNIVERSAL_COLUMNS;

  const fetchTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!currentTenant?.id || !actor) return;
      const res = await getDocumentsAction(currentTenant.id, 'work_order', 200, actor);
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
  }, [currentTenant?.id, actor]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const moveCard = async (ticketId: string, newStatus: string) => {
    if (!currentTenant?.id || !actor) return;
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus as Document['status'] } : t));
    setMovingId(ticketId);
    try {
      const res = await updateDocumentStatusAction(ticketId, newStatus as Document['status'], currentTenant.id, actor);
      if (!res.success) {
        toast({ variant: 'error', title: 'Error actualizando estado', description: res.error });
        await fetchTickets();
      }
    } catch (err: unknown) {
      console.error('Error moving card:', err);
      toast({ variant: 'error', title: 'Error actualizando estado' });
      await fetchTickets();
    } finally {
      setMovingId(null);
    }
  };

  const handleToggleStep = async (ticketId: string, stepId: string, completed: boolean, currentColId: string) => {
    if (!currentTenant?.id || !actor) return;

    // Optimistic update
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      const meta = { ...(t.metadata || {}) } as Record<string, unknown>;
      const steps = Array.isArray(meta.steps)
        ? (meta.steps as Array<Record<string, unknown>>).map(s =>
            s.id === stepId ? { ...s, completed } : s
          )
        : [];
      return { ...t, metadata: { ...meta, steps } };
    }));

    const res = await toggleProcessStepAction(ticketId, stepId, completed, currentTenant.id, actor);
    if (res.success && res.allCompleted) {
      const colIdx = COLUMNS.findIndex(c => c.id === currentColId);
      const nextCol = COLUMNS[colIdx + 1];
      if (nextCol) {
        setPendingAdvance({ ticketId, currentColId });
      }
    } else if (!res.success) {
      toast({ variant: 'error', title: 'Error al actualizar paso', description: res.error });
      await fetchTickets();
    }
  };

  const handleCreateTicket = async (formData: Record<string, unknown>) => {
    if (!currentTenant?.id || !actor) throw new Error('No hay empresa activa');
    const res = await createDocumentAction({
      entity_id: formData.entity_id as string,
      type: 'work_order',
      status: 'draft',
      document_number: `OT-${Date.now().toString().slice(-6)}`,
      issue_date: new Date().toISOString(),
      due_date: null,
      notes: (formData.description as string) || null,
      metadata: {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        assigned_to: formData.assigned_to || null,
        assigned_to_name: formData.assigned_to_name || null,
        process_mode: formData.process_mode || 'single_task',
        pipeline: formData.pipeline || 'general',
        steps: Array.isArray(formData.steps) ? formData.steps : [],
        total_amount: formData.total_amount || 0,
        paid_amount: 0,
      },
      lines: [],
    }, currentTenant.id, actor);

    if (res.success) {
      toast({ variant: 'success', title: 'Orden creada correctamente' });
      await fetchTickets();
    } else {
      toast({ variant: 'error', title: 'Error creando orden', description: res.error });
      throw new Error(res.error);
    }
  };

  const ticketsByStatus = (status: string) => tickets.filter(t => {
    const colMatch = normalizeColumnStatus(t.status) === status;
    if (!colMatch) return false;
    if (filterMode === 'with_steps') {
      const meta = (t.metadata || {}) as Record<string, unknown>;
      return Array.isArray(meta.steps) && meta.steps.length > 0;
    }
    if (filterMode === 'mine') {
      const meta = (t.metadata || {}) as Record<string, unknown>;
      return meta.assigned_to === actor?.email || meta.assigned_to_name?.toString().toLowerCase().includes(actor?.email.split('@')[0].toLowerCase() || '');
    }
    return true;
  });

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
      <div className="flex justify-between items-start mb-6 shrink-0 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Tablero de Procesos</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Seguimiento visual de órdenes y flujos de trabajo — {tickets.length} en total</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Universal Filters */}
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl p-1">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'with_steps', label: 'Con Pasos' },
              { id: 'mine', label: 'Mis Asignadas' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterMode(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterMode === f.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-slate-500 hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] flex items-center gap-2 btn-haptic"
          >
            <Plus size={18} />
            Nueva Orden
          </button>
        </div>
      </div>

      {/* Confirm advance banner */}
      {pendingAdvance && (() => {
        const colIdx = COLUMNS.findIndex(c => c.id === pendingAdvance.currentColId);
        const nextCol = COLUMNS[colIdx + 1];
        return (
          <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl flex items-center justify-between gap-4 shrink-0">
            <div>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">✅ ¡Todos los pasos completados!</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500">¿Deseas mover esta orden a <strong>{nextCol?.title}</strong>?</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => { moveCard(pendingAdvance.ticketId, nextCol!.id); setPendingAdvance(null); }}
                className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors flex items-center gap-1"
              >
                <ChevronRight size={14} /> Avanzar
              </button>
              <button
                onClick={() => setPendingAdvance(null)}
                className="px-3 py-1.5 bg-white dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-600 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
              >
                Mantener
              </button>
            </div>
          </div>
        );
      })()}

      {/* Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-6 h-full min-w-max pb-4">
          {COLUMNS.map(col => {
            const colTickets = ticketsByStatus(col.id);
            const isDragOver = dragOverColumnId === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOverColumnId !== col.id) setDragOverColumnId(col.id); }}
                onDragLeave={() => { if (dragOverColumnId === col.id) setDragOverColumnId(null); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverColumnId(null);
                  const droppedId = e.dataTransfer.getData('text/plain') || draggedTicketId;
                  if (droppedId) moveCard(droppedId, col.id);
                }}
                className={`w-80 flex flex-col rounded-2xl border-2 ${col.color} bg-card/50 overflow-hidden transition-all ${
                  isDragOver ? 'ring-2 ring-primary ring-offset-2 bg-primary/5 border-primary shadow-lg' : ''
                }`}
              >
                {/* Column Header */}
                <div className={`px-4 py-3 flex items-center justify-between ${col.headerColor}`}>
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {col.title}
                  </div>
                  <span className="text-xs font-black bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-full">
                    {colTickets.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {colTickets.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-xs font-medium border-2 border-dashed border-border/50 rounded-xl my-2">
                      Sin órdenes — suelta aquí para mover
                    </div>
                  )}
                  {colTickets.map(ticket => {
                    const meta = (ticket.metadata || {}) as Record<string, unknown>;
                    const isMoving = movingId === ticket.id;
                    const isBeingDragged = draggedTicketId === ticket.id;
                    const steps = Array.isArray(meta.steps) ? (meta.steps as ProcessStep[]) : [];
                    const completedSteps = steps.filter(s => s.completed).length;
                    const hasSteps = steps.length > 0;
                    const progressPct = hasSteps ? Math.round((completedSteps / steps.length) * 100) : 0;
                    const totalAmount = typeof meta.total_amount === 'number' ? meta.total_amount : 0;
                    const paidAmount = typeof meta.paid_amount === 'number' ? meta.paid_amount : 0;
                    const balance = totalAmount - paidAmount;

                    return (
                      <div
                        key={ticket.id}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.setData('text/plain', ticket.id); e.dataTransfer.effectAllowed = 'move'; setDraggedTicketId(ticket.id); }}
                        onDragEnd={() => setDraggedTicketId(null)}
                        className={`bg-card border border-border rounded-xl p-3.5 shadow-sm transition-all cursor-grab active:cursor-grabbing ${
                          isMoving || isBeingDragged ? 'opacity-40 scale-95' : 'hover:shadow-md hover:border-primary/40'
                        }`}
                      >
                        {/* Priority + Title */}
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-sm leading-none mt-0.5">{PRIORITY_LABELS[(meta.priority as string) || 'medium']}</span>
                          <p className="text-sm font-bold text-foreground leading-tight flex-1">
                            {(meta.title as string) || 'Orden sin título'}
                          </p>
                          <GripVertical size={14} className="text-slate-400 shrink-0 mt-0.5" />
                        </div>

                        {/* Assigned */}
                        {(meta.assigned_to_name as string) && (
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md w-fit mb-2">
                            <span>🛠️</span>
                            <span className="truncate max-w-[160px]">{meta.assigned_to_name as string}</span>
                          </div>
                        )}

                        {/* Client */}
                        <p className="text-xs text-slate-500 mb-1 truncate">👤 {(ticket.entity as { name?: string })?.name || 'Sin cliente'}</p>
                        <p className="text-xs text-slate-400 font-mono mb-2">#{ticket.document_number}</p>

                        {/* Progress bar for step_by_step */}
                        {hasSteps && (
                          <div className="mb-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold text-slate-500">Progreso</span>
                              <span className="text-[10px] font-black text-primary">{completedSteps}/{steps.length} pasos · {progressPct}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-indigo-400 rounded-full transition-all duration-500"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            {/* Inline checkboxes for steps */}
                            <div className="mt-2 space-y-1">
                              {steps.slice(0, 4).map(step => (
                                <label key={step.id} className="flex items-center gap-2 cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={step.completed}
                                    onChange={e => handleToggleStep(ticket.id, step.id, e.target.checked, col.id)}
                                    className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer"
                                  />
                                  <span className={`text-[11px] font-medium transition-colors ${
                                    step.completed ? 'line-through text-slate-400' : 'text-slate-600 dark:text-slate-300 group-hover:text-foreground'
                                  }`}>
                                    {step.title}
                                  </span>
                                </label>
                              ))}
                              {steps.length > 4 && (
                                <p className="text-[10px] text-slate-400 pl-5">+{steps.length - 4} más...</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Financial summary */}
                        {totalAmount > 0 && (
                          <div className="mb-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-500">Total</span>
                              <span className="font-bold">${totalAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-500">Abonado</span>
                              <span className="font-bold text-emerald-600">${paidAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-[10px] border-t border-border mt-1 pt-1">
                              <span className="text-slate-500">Saldo</span>
                              <span className={`font-black ${balance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>${balance.toFixed(2)}</span>
                            </div>
                          </div>
                        )}

                        {/* Move buttons */}
                        <div className="flex gap-1.5">
                          {col.id !== COLUMNS[0].id && (
                            <button
                              onClick={() => {
                                const idx = COLUMNS.findIndex(c => c.id === col.id);
                                if (idx > 0) moveCard(ticket.id, COLUMNS[idx - 1].id);
                              }}
                              disabled={isMoving}
                              className="flex-1 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                              ← Volver
                            </button>
                          )}
                          {col.id !== COLUMNS[COLUMNS.length - 1].id && (
                            <button
                              onClick={() => {
                                const idx = COLUMNS.findIndex(c => c.id === col.id);
                                if (idx < COLUMNS.length - 1) moveCard(ticket.id, COLUMNS[idx + 1].id);
                              }}
                              disabled={isMoving}
                              className="flex-1 text-[11px] font-bold px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-400"
                            >
                              Avanzar →
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
        onSave={handleCreateTicket as (data: unknown) => Promise<void>}
        tenantId={currentTenant?.id}
      />
    </div>
  );
}
