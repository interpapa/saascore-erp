'use client';

import { useState } from 'react';
import { X, User, Mail, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PhoneInput } from '@/components/ui/PhoneInput';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: unknown) => Promise<void>;
  initialData?: unknown;
}

export function ClientModal({ isOpen, onClose, onSave, initialData }: ClientModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState<string>(initialData?.phone || '');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const clientData = {
      full_name: (formData.get('full_name') as string) || (formData.get('name') as string),
      phone: phone || (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
      tax_id: (formData.get('tax_id') as string) || null,
      address: (formData.get('address') as string) || null,
      total_debt: initialData ? initialData.metadata?.total_debt : 0
    };

    try {
      await onSave(clientData);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Error al guardar el cliente');
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
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
        <div className="sticky top-0 bg-card z-10 flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1">
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
            name="tax_id"
            label="Identificación Fiscal (RIF/NIF)"
            placeholder="Ej. J-12345678-0"
            icon={<User size={18} />}
            defaultValue={initialData?.tax_id}
          />

          <PhoneInput
            label="Teléfono / WhatsApp"
            value={phone}
            onChange={setPhone}
            placeholder="412 1234567"
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

          <div className="pt-2 flex gap-3 sticky bottom-0 bg-card mt-auto">
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
