'use client';

import { useState, useEffect } from 'react';
import { X, ClipboardList, User, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getEntitiesAction } from '@/app/actions/entities';
import { Entity } from '@/lib/api/entities';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
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

  useEffect(() => {
    if (isOpen && tenantId) {
      getEntitiesAction(tenantId, 'customer').then(res => {
        if (res.success && res.entities) setCustomers(res.entities);
      }).catch(console.error);
    }
  }, [isOpen, tenantId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const data = {
      entity_id: form.get('entity_id') as string,
      title: form.get('title') as string,
      description: form.get('description') as string,
      priority: form.get('priority') as string,
    };

    if (!data.entity_id) {
      setError('Debes seleccionar un cliente.');
      setIsLoading(false);
      return;
    }

    try {
      await onSave(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la orden');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
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

          {/* Título */}
          <Input
            name="title"
            label="Trabajo a Realizar *"
            placeholder="Ej: Mantenimiento preventivo"
            icon={<ClipboardList size={18} />}
            required
            autoFocus
          />

          {/* Descripción */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Descripción / Problema Reportado</label>
            <textarea
              name="description"
              rows={3}
              placeholder="Cliente reporta ruido en motor al acelerar..."
              className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
            />
          </div>

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
