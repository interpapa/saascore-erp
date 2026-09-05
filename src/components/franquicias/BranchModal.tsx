'use client';

import { useState } from 'react';
import { X, Building2, User, Phone, MapPin, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createEntityAction } from '@/app/actions/entities';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';

interface BranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BranchModal({ isOpen, onClose, onSuccess }: BranchModalProps) {
  const currentTenant = useTenantResolver();
  const { session } = useERPStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const actor = {
    email: session?.userEmail || 'admin@Rendo.com',
    role: session?.role || ('owner' as const),
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentTenant) return;

    setIsLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const branchName = form.get('name') as string;

    if (!branchName) {
      setError('El nombre de la sucursal es requerido.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await createEntityAction(
        {
          type: 'branch',
          name: branchName,
          email: (form.get('email') as string) || null,
          phone: (form.get('phone') as string) || null,
          address: (form.get('address') as string) || null,
          status: 'active',
          metadata: {
            manager: (form.get('manager') as string) || 'Sin asignar',
          },
        },
        currentTenant.id,
        actor
      );

      if (!res.success) throw new Error(res.error);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Error al registrar la sucursal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border bg-indigo-50/50 dark:bg-indigo-500/5 rounded-t-2xl">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <Building2 size={18} />
            </div>
            Nueva Sucursal
          </h2>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
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

          <Input
            name="name"
            label="Nombre de Sucursal *"
            placeholder="Ej: Sede Norte"
            icon={<Building2 size={18} />}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              name="manager"
              label="Nombre del Gerente"
              placeholder="Ej: Carlos Pérez"
              icon={<User size={18} />}
            />
            <Input
              name="phone"
              label="Teléfono"
              placeholder="+58 412..."
              icon={<Phone size={18} />}
            />
          </div>

          <Input
            name="email"
            type="email"
            label="Correo Electrónico"
            placeholder="norte@empresa.com"
            icon={<User size={18} />}
          />

          <Input
            name="address"
            label="Dirección Física"
            placeholder="Avenida Principal..."
            icon={<MapPin size={18} />}
          />

          <div className="pt-2 flex gap-3">
            <Button type="button" variant="outline" className="w-full" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20" isLoading={isLoading}>
              Registrar Sucursal
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
