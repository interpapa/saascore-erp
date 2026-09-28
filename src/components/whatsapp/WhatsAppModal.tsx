/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { X, Send, User, AlertTriangle, MessageCircle, Phone, ExternalLink, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Entity } from '@/lib/api/entities';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: {
    entity_id?: string | null;
    phone: string;
    client_name?: string;
    message: string;
    open_whatsapp?: boolean;
  }) => Promise<void>;
  clients: Entity[];
  initialClientId?: string | null;
}

export function WhatsAppModal({ isOpen, onClose, onSend, clients, initialClientId }: WhatsAppModalProps) {
  const [tab, setTab] = useState<'client' | 'free'>('client');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Entity | null>(null);

  // Free number fields
  const [freePhone, setFreePhone] = useState('');
  const [freeName, setFreeName] = useState('');
  const [message, setMessage] = useState('');
  const [openDirectly, setOpenDirectly] = useState(true);

  // Initialize selected client
  useEffect(() => {
    if (isOpen && initialClientId) {
      const client = clients.find(c => c.id === initialClientId);
      if (client) {
        setSelectedClient(client);
        setTab('client');
      }
    } else if (isOpen && clients.length === 0) {
      setTab('free');
    }
  }, [initialClientId, clients, isOpen]);

  if (!isOpen) return null;

  const sanitizePhone = (raw: string): string => {
    let clean = raw.replace(/[^0-9]/g, '');
    if (!clean) return '';
    if (clean.startsWith('0')) {
      clean = '58' + clean.slice(1);
    } else if (clean.length === 10 && (clean.startsWith('412') || clean.startsWith('414') || clean.startsWith('424') || clean.startsWith('416') || clean.startsWith('426'))) {
      clean = '58' + clean;
    }
    return clean;
  };

  const currentCleanPhone = tab === 'client' 
    ? (selectedClient?.phone ? sanitizePhone(selectedClient.phone) : '') 
    : sanitizePhone(freePhone);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const trimmedMsg = message.trim();
    if (!trimmedMsg) {
      setError('El mensaje no puede estar vacío.');
      setIsLoading(false);
      return;
    }

    if (tab === 'client') {
      if (!selectedClient) {
        setError('Debes seleccionar un cliente válido.');
        setIsLoading(false);
        return;
      }
      if (!selectedClient.phone) {
        setError('Este cliente no tiene un número de teléfono registrado.');
        setIsLoading(false);
        return;
      }

      const cleanNum = sanitizePhone(selectedClient.phone);
      try {
        await onSend({
          entity_id: selectedClient.id,
          phone: cleanNum,
          client_name: selectedClient.name,
          message: trimmedMsg,
          open_whatsapp: openDirectly,
        });

        if (openDirectly && cleanNum) {
          window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(trimmedMsg)}`, '_blank');
        }

        onClose();
      } catch (err: unknown) {
        setError((err as Error).message || 'Error al enviar el mensaje');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Free number
      const cleanNum = sanitizePhone(freePhone);
      if (!cleanNum || cleanNum.length < 7) {
        setError('Ingresa un número telefónico válido con código de país o prefijo nacional.');
        setIsLoading(false);
        return;
      }

      try {
        await onSend({
          entity_id: null,
          phone: cleanNum,
          client_name: freeName.trim() || `+${cleanNum}`,
          message: trimmedMsg,
          open_whatsapp: openDirectly,
        });

        if (openDirectly) {
          window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(trimmedMsg)}`, '_blank');
        }

        onClose();
      } catch (err: unknown) {
        setError((err as Error).message || 'Error al enviar el mensaje');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-emerald-500/5">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <MessageCircle size={18} />
            </div>
            Nuevo Mensaje WhatsApp
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-border bg-slate-50 dark:bg-slate-900/40 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setTab('client')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              tab === 'client'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-slate-500 hover:text-foreground'
            }`}
          >
            <User size={14} />
            <span>Cliente Registrado</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('free')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              tab === 'free'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-slate-500 hover:text-foreground'
            }`}
          >
            <Phone size={14} />
            <span>Número Libre / Directo</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 flex flex-col">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-2 shrink-0">
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}

          {tab === 'client' ? (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User size={13} className="text-slate-400" />
                Seleccionar Cliente *
              </label>
              <select
                defaultValue={selectedClient?.id || initialClientId || ''}
                onChange={(e) => setSelectedClient(clients.find(c => c.id === e.target.value) || null)}
                className="w-full bg-background border border-input rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="">Selecciona un cliente del directorio...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : '(Sin teléfono)'}
                  </option>
                ))}
              </select>
              {clients.length === 0 && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                  No hay clientes registrados en este tenant. Puedes usar la pestaña &quot;Número Libre&quot;.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Phone size={13} className="text-slate-400" />
                  Número de Teléfono (WhatsApp) *
                </label>
                <input
                  type="text"
                  placeholder="Ej: 04141234567 o +584141234567"
                  value={freePhone}
                  onChange={(e) => setFreePhone(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <UserPlus size={13} className="text-slate-400" />
                  Nombre o Alias (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez / Proveedor Insumos"
                  value={freeName}
                  onChange={(e) => setFreeName(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>
          )}

          {/* Mensaje */}
          <div className="flex-1 flex flex-col min-h-[120px]">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Mensaje Inicial *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe el mensaje que deseas enviar..."
              className="w-full flex-1 bg-background border border-input rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
            />
          </div>

          {/* Preview del número normalizado */}
          {currentCleanPhone && (
            <div className="text-xs bg-slate-100 dark:bg-slate-800/60 p-2.5 rounded-xl border border-border flex items-center justify-between">
              <span className="text-slate-500 font-medium">Destinatario WhatsApp:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                +{currentCleanPhone}
              </span>
            </div>
          )}

          {/* Checkbox para abrir wa.me directo */}
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={openDirectly}
              onChange={(e) => setOpenDirectly(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-border"
            />
            <span className="flex items-center gap-1">
              Abrir chat directamente en WhatsApp Web / App
              <ExternalLink size={12} className="text-slate-400" />
            </span>
          </label>

          <div className="pt-2 flex gap-3 shrink-0">
            <Button type="button" variant="outline" className="w-full" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold btn-haptic shadow-sm"
              isLoading={isLoading}
              icon={<Send size={15} />}
            >
              Iniciar Conversación
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
