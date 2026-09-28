'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ClipboardList, User, AlertTriangle, UserCheck, Plus, Trash2, ListChecks, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getEntitiesAction } from '@/app/actions/entities';
import { Entity } from '@/lib/api/entities';
import { useActionActor } from '@/hooks/useActionActor';
import { getStepTemplatesAction } from '@/app/actions/documents';

interface ProcessStep {
  id: string;
  title: string;
  description?: string;
  order: number;
  completed: boolean;
}

interface StepTemplate {
  id: string;
  name: string;
  steps: Array<{ title: string; description?: string; order: number }>;
}

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: unknown) => Promise<void>;
  tenantId?: string;
}

const PRIORITIES = [
  { value: 'low', label: 'Baja', color: 'text-emerald-600' },
  { value: 'medium', label: 'Media', color: 'text-amber-600' },
  { value: 'high', label: 'Alta', color: 'text-red-600' },
];

export function TicketModal({ isOpen, onClose, onSave, tenantId }: TicketModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Entity[]>([]);
  const [employees, setEmployees] = useState<Entity[]>([]);
  const [processMode, setProcessMode] = useState<'single_task' | 'step_by_step'>('single_task');
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [templates, setTemplates] = useState<StepTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState('general');
  const actor = useActionActor();

  const loadData = useCallback(async () => {
    if (!isOpen || !tenantId || !actor) return;
    const [custRes, empRes, tplRes] = await Promise.all([
      getEntitiesAction(tenantId, 'customer', 50, actor),
      getEntitiesAction(tenantId, 'employee', 50, actor),
      getStepTemplatesAction(tenantId, actor),
    ]);
    if (custRes.success && custRes.entities) setCustomers(custRes.entities);
    if (empRes.success && empRes.entities) setEmployees(empRes.entities);
    if (tplRes.success && tplRes.templates) setTemplates(tplRes.templates);
  }, [isOpen, tenantId, actor]);

  useEffect(() => { loadData(); }, [loadData]);

  const addStep = () => {
    if (!newStepTitle.trim()) return;
    const step: ProcessStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newStepTitle.trim(),
      order: steps.length + 1,
      completed: false,
    };
    setSteps(prev => [...prev, step]);
    setNewStepTitle('');
  };

  const removeStep = (id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id).map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  const applyTemplate = (tpl: StepTemplate) => {
    const newSteps: ProcessStep[] = tpl.steps.map((s, idx) => ({
      id: `step-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
      title: s.title,
      description: s.description,
      order: s.order || idx + 1,
      completed: false,
    }));
    setSteps(newSteps);
    setProcessMode('step_by_step');
    setShowTemplates(false);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const assignedId = (form.get('assigned_to') as string) || '';
    const assignedEmp = employees.find(emp => emp.id === assignedId);

    if (processMode === 'step_by_step' && steps.length === 0) {
      setError('Agrega al menos un paso para el proceso.');
      setIsLoading(false);
      return;
    }

    const data = {
      entity_id: form.get('entity_id') as string,
      title: form.get('title') as string,
      description: form.get('description') as string,
      priority: form.get('priority') as string,
      assigned_to: assignedId || null,
      assigned_to_name: assignedEmp ? assignedEmp.name : null,
      process_mode: processMode,
      pipeline: selectedPipeline,
      steps: processMode === 'step_by_step' ? steps : [],
      total_amount: parseFloat((form.get('total_amount') as string) || '0') || 0,
    };

    if (!data.entity_id) {
      setError('Debes seleccionar un cliente.');
      setIsLoading(false);
      return;
    }

    try {
      await onSave(data);
      // Reset state
      setSteps([]);
      setProcessMode('single_task');
      setSelectedPipeline('general');
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Error al guardar la orden');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-600">
              <ClipboardList size={18} />
            </div>
            Nueva Orden de Trabajo
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}


          {/* Cliente */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <User size={14} className="text-slate-400" />
              Cliente *
            </label>
            <select
              name="entity_id"
              className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none"
            >
              <option value="">Seleccionar cliente...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.phone ? `— ${c.phone}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Técnico */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <UserCheck size={14} className="text-slate-400" />
              Técnico / Responsable Asignado
            </label>
            <select
              name="assigned_to"
              className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none"
            >
              <option value="">Sin asignar (Cualquiera)</option>
              {employees.map(e => {
                const role = (e.metadata?.role as string) || '';
                return (
                  <option key={e.id} value={e.id}>{e.name} {role ? `(${role})` : ''}</option>
                );
              })}
            </select>
          </div>

          {/* Título */}
          <Input
            name="title"
            label="Trabajo a Realizar *"
            placeholder="Ej: Limpieza dental / Reparación motor"
            icon={<ClipboardList size={18} />}
            required
            autoFocus
          />

          {/* Descripción */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Descripción / Problema Reportado</label>
            <textarea
              name="description"
              rows={2}
              placeholder="Descripción del trabajo o problema reportado..."
              className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
            />
          </div>

          {/* Monto estimado */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Monto Total Estimado</label>
            <input
              type="number"
              name="total_amount"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          {/* Modo de proceso */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Modo de Seguimiento</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProcessMode('single_task')}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                  processMode === 'single_task'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-slate-500 hover:border-primary/30'
                }`}
              >
                <Zap size={18} className="shrink-0" />
                <div>
                  <p className="text-xs font-bold">Tarea Simple</p>
                  <p className="text-[10px] opacity-70">Avance rápido por etapas</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setProcessMode('step_by_step')}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                  processMode === 'step_by_step'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-slate-500 hover:border-primary/30'
                }`}
              >
                <ListChecks size={18} className="shrink-0" />
                <div>
                  <p className="text-xs font-bold">Proceso por Pasos</p>
                  <p className="text-[10px] opacity-70">Checklist secuencial</p>
                </div>
              </button>
            </div>
          </div>

          {/* Pasos del proceso */}
          {processMode === 'step_by_step' && (
            <div className="space-y-3">
              {/* Plantillas */}
              {templates.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowTemplates(v => !v)}
                    className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                  >
                    {showTemplates ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    Cargar Plantilla de Pasos ({templates.length} disponibles)
                  </button>
                  {showTemplates && (
                    <div className="mt-2 grid gap-1.5">
                      {templates.map(tpl => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => applyTemplate(tpl)}
                          className="text-left px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                        >
                          📋 {tpl.name} <span className="opacity-60">({tpl.steps.length} pasos)</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Lista de pasos */}
              {steps.length > 0 && (
                <div className="space-y-1.5">
                  {steps.map(step => (
                    <div key={step.id} className="flex items-center gap-2 p-2.5 bg-background border border-border rounded-lg">
                      <span className="text-xs font-black text-slate-400 w-5 shrink-0">{step.order}.</span>
                      <span className="text-sm font-medium text-foreground flex-1">{step.title}</span>
                      <button type="button" onClick={() => removeStep(step.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Agregar paso */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStepTitle}
                  onChange={e => setNewStepTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addStep(); } }}
                  placeholder="Nombre del paso (Enter para agregar)"
                  className="flex-1 bg-background border border-input rounded-xl px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={addStep}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors flex items-center gap-1"
                >
                  <Plus size={16} />
                </button>
              </div>

              {steps.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">Sin pasos definidos — agrega pasos arriba o carga una plantilla</p>
              )}
            </div>
          )}

          {/* Prioridad */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Prioridad</label>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <label key={p.value} className="flex-1 cursor-pointer">
                  <input type="radio" name="priority" value={p.value} defaultChecked={p.value === 'medium'} className="sr-only peer" />
                  <div className={`text-center py-2 px-3 rounded-xl border-2 text-sm font-bold transition-all border-border peer-checked:border-primary peer-checked:bg-primary/5 ${p.color}`}>
                    {p.label}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <Button type="button" variant="outline" className="w-full" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Crear Orden
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
