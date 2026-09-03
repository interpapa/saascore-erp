'use client';

import { useState, useEffect } from 'react';
import { X, Send, User, AlertTriangle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Entity } from '@/lib/api/entities';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: unknown) => Promise<void>;
  clients: Entity[];
  initialClientId?: string | null;
}

export function WhatsAppModal({ isOpen, onClose, onSend, clients, initialClientId }: WhatsAppModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Entity | null>(null);

  // Initialize selected client
  useEffect(() => {
    if (isOpen && initialClientId) {
      const client = clients.find(c => c.id === initialClientId);
      if (client) setSelectedClient(client);
    }
  }, [initialClientId, clients, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const entityId = form.get('entity_id') as string;
    const message = form.get('message') as string;

    const client = clients.find(c => c.id === entityId);
    if (!client) {
      setError('Debes seleccionar un cliente válido.');
      setIsLoading(false);
      return;
    }

    if (!client.phone) {
      setError('Este cliente no tiene un número de teléfono registrado.');
      setIsLoading(false);
      return;
    }

    if (!message || message.trim() === '') {
      setError('El mensaje no puede estar vacío.');
      setIsLoading(false);
      return;
    }

    try {
      await onSend({
        entity_id: client.id,
        phone: client.phone,
        message: message.trim()
      });
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Error al enviar el mensaje');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-emerald-50/50 dark:bg-emerald-500/5 rounded-t-2xl">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <MessageCircle size={18} />
            </div>
            Enviar Mensaje WhatsApp
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 flex flex-col">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-2 shrink-0">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {/* Cliente */}
          <div className="shrink-0">
            <label className="block text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <User size={14} className="text-slate-400" />
              Destinatario *
            </label>
            <select
              name="entity_id"
              defaultValue={initialClientId || ''}
              onChange={(e) => setSelectedClient(clients.find(c => c.id === e.target.value) || null)}
              className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none"
            >
              <option value="">Seleccionar cliente...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.phone ? `— ${c.phone}` : '(Sin número)'}</option>
              ))}
            </select>
          </div>

          {/* Mensaje */}
          <div className="flex-1 flex flex-col min-h-[150px]">
            <label className="block text-sm font-semibold text-foreground mb-1.5">Mensaje *</label>
            <textarea
              name="message"
              placeholder="Escribe tu mensaje aquí..."
              className="w-full flex-1 bg-background border border-input rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all resize-none"
            />
          </div>

          {/* Preview del número */}
          {selectedClient && (
            <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-border flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Enviando a:</span>
              {selectedClient.phone || <span className="text-red-500">Número no registrado</span>}
            </div>
          )}

          <div className="pt-2 flex gap-3 shrink-0">
            <Button type="button" variant="outline" className="w-full" onClick={onClose}>Cancelar</Button>
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground btn-haptic shadow-md" 
              isLoading={isLoading}
              icon={<Send size={16} />}
            >
              Enviar Mensaje
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
