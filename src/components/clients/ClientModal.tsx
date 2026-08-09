'use client';

import { useState } from 'react';
import { X, User, Phone, Mail, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: any) => Promise<void>;
  initialData?: any;
}

export function ClientModal({ isOpen, onClose, onSave, initialData }: ClientModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const clientData = {
      full_name: (formData.get('full_name') as string) || (formData.get('name') as string),
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
      address: (formData.get('address') as string) || null,
      total_debt: initialData ? initialData.metadata?.total_debt : 0
    };

    try {
      await onSave(clientData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el cliente');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <User size={18} />
            </div>
            {initialData ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl">
              {error}
            </div>
          )}

          <Input
            name="full_name"
            label="Nombre Completo o Empresa"
            placeholder="Ej. Taller Central S.A."
            icon={<User size={18} />}
            required
            autoFocus
            defaultValue={initialData?.name}
          />

          <Input
            name="phone"
            label="Teléfono (WhatsApp)"
            type="tel"
            placeholder="+52 123 456 7890"
            icon={<Phone size={18} />}
            defaultValue={initialData?.phone}
          />

          <Input
            name="email"
            label="Correo Electrónico"
            type="email"
            placeholder="correo@empresa.com"
            icon={<Mail size={18} />}
            defaultValue={initialData?.email}
          />

          <Input
            name="address"
            label="Dirección"
            placeholder="Av. Principal 123..."
            icon={<MapPin size={18} />}
            defaultValue={initialData?.address}
          />

          <div className="pt-4 flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Guardando...' : 'Guardar Cliente'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
