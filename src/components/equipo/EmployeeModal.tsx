'use client';

import { useState } from 'react';
import { X, User, Briefcase, DollarSign, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export function EmployeeModal({ isOpen, onClose, onSave }: EmployeeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get('name') as string,
      email: form.get('email') as string,
      phone: form.get('phone') as string,
      role: form.get('role') as string,
      salary: parseFloat(form.get('salary') as string) || 0,
    };

    if (!data.name) {
      setError('El nombre es requerido.');
      setIsLoading(false);
      return;
    }

    try {
      await onSave(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el empleado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
              <User size={18} />
            </div>
            Nuevo Empleado
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
            label="Nombre Completo *"
            placeholder="Ej: Carlos Ramírez"
            icon={<User size={18} />}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              name="email"
              type="email"
              label="Correo Electrónico"
              placeholder="carlos@ejemplo.com"
            />
            <Input
              name="phone"
              label="Teléfono"
              placeholder="+58 412..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              name="role"
              label="Cargo / Puesto"
              placeholder="Ej: Mecánico Senior"
              icon={<Briefcase size={18} />}
              required
            />
            <Input
              name="salary"
              type="number"
              step="0.01"
              min="0"
              label="Salario Base"
              placeholder="0.00"
              icon={<DollarSign size={18} />}
              required
            />
          </div>

          <div className="pt-2 flex gap-3">
            <Button type="button" variant="outline" className="w-full" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="w-full" isLoading={isLoading}>Guardar Empleado</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
