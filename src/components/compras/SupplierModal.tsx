'use client';

import { useState } from 'react';
import { X, Building2, User, Phone, MapPin, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createEntityAction } from '@/app/actions/entities';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';

import { PhoneInput } from '@/components/ui/PhoneInput';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SupplierModal({ isOpen, onClose, onSuccess }: SupplierModalProps) {
  const currentTenant = useTenantResolver();
  const { session } = useERPStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState<string>('');

  if (!isOpen) return null;

  const actor = {
    email: session?.userEmail || 'admin@saascore.com',
    role: session?.role || ('owner' as const),
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentTenant) return;

    setIsLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const supplierName = form.get('name') as string;

    if (!supplierName) {
      setError('El nombre comercial es requerido.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await createEntityAction(
        {
          type: 'supplier',
          name: supplierName,
          email: (form.get('email') as string) || null,
          phone: phone || (form.get('phone') as string) || null,
          address: (form.get('address') as string) || null,
          tax_id: (form.get('tax_id') as string) || null,
          status: 'active',
          metadata: {},
        },
        currentTenant.id,
        actor
      );

      if (!res.success) throw new Error(res.error);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el proveedor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
        <div className="sticky top-0 bg-card z-10 flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
              <Building2 size={18} />
            </div>
            Nuevo Proveedor
          </h2>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <Input
            name="name"
            label="Razón Social / Nombre *"
            placeholder="Ej: Autopartes Express C.A."
            icon={<Building2 size={18} />}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              name="tax_id"
              label="RIF / Identificación Fiscal"
              placeholder="J-12345678-9"
            />
            <PhoneInput
              label="Teléfono"
              value={phone}
              onChange={setPhone}
              placeholder="412 1234567"
            />
          </div>

          <Input
            name="email"
            type="email"
            label="Correo Electrónico"
            placeholder="ventas@proveedor.com"
            icon={<User size={18} />}
          />

          <Input
            name="address"
            label="Dirección Física"
            placeholder="Avenida Principal..."
            icon={<MapPin size={18} />}
          />

          <div className="pt-2 flex gap-3 sticky bottom-0 bg-card mt-auto">
            <Button type="button" variant="outline" className="w-full" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="w-full" isLoading={isLoading}>Registrar Proveedor</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
