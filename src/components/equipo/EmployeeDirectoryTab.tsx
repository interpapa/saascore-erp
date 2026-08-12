'use client';

import { useState } from 'react';
import { Entity } from '@/lib/api/entities';
import { createEntityAction } from '@/app/actions/entities';
import { useActionActor } from '@/hooks/useActionActor';
import { useToast } from '@/components/core/ToastProvider';
import { Users, Plus, Award, Briefcase, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface EmployeeDirectoryTabProps {
  employees: Entity[];
  tenantId: string;
  onRefresh: () => void;
}

export function EmployeeDirectoryTab({ employees, tenantId, onRefresh }: EmployeeDirectoryTabProps) {
  const actor = useActionActor();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    roleTitle: 'Técnico de Servicio',
    baseSalary: 450,
  });

  const handleCreateEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      setIsSaving(true);
      const res = await createEntityAction(
        {
          type: 'employee',
          name: form.name,
          email: form.email || null,
          phone: form.phone || null,
          metadata: {
            role_title: form.roleTitle,
            base_salary: Number(form.baseSalary),
          },
        },
        tenantId,
        actor
      );

      if (res.success) {
        toast({ variant: 'success', title: 'Empleado registrado', description: `Se ha agregado a ${form.name} al equipo.` });
        setForm({ name: '', email: '', phone: '', roleTitle: 'Técnico de Servicio', baseSalary: 450 });
        setIsModalOpen(false);
        onRefresh();
      } else {
        toast({ variant: 'error', title: 'Error', description: res.error || 'No se pudo guardar el empleado.' });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error de servidor', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users size={20} className="text-indigo-500" />
            Directorio de Personal
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Personal operativo, técnicos y administrativos registrados en la empresa
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 text-xs font-bold btn-haptic">
          <Plus size={16} />
          Nuevo Empleado
        </Button>
      </div>

      {/* Grid de Empleados */}
      {employees.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-3xl space-y-3">
          <Users size={36} className="mx-auto text-slate-400 opacity-50" />
          <p className="text-sm font-bold text-foreground">No hay empleados registrados</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Registra tu equipo de trabajo para controlar la asistencia y procesar la nómina.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => (
            <div key={emp.id} className="bg-card border border-border rounded-2xl p-5 shadow-xs hover:border-indigo-500/30 transition-all space-y-4">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-base border border-indigo-500/20">
                  {emp.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Activo
                </span>
              </div>

              <div>
                <h3 className="font-bold text-foreground text-sm tracking-tight">{emp.name}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
                  <Briefcase size={13} className="text-indigo-500" />
                  {emp.metadata?.role_title || 'Empleado General'}
                </p>
              </div>

              <div className="pt-3 border-t border-border space-y-1.5 text-xs text-slate-500">
                {emp.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-slate-400" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400 font-medium">Sueldo Base:</span>
                  <span className="font-mono font-bold text-foreground text-xs">
                    ${Number(emp.metadata?.base_salary || 450).toFixed(2)} USD
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nuevo Empleado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-foreground mb-4">Registrar Nuevo Empleado</h3>
            
            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <Input
                label="Nombre Completo *"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Carlos Mendoza"
              />

              <Input
                label="Correo Electrónico"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="carlos@empresa.com"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Cargo / Puesto"
                  value={form.roleTitle}
                  onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
                  placeholder="Ej. Mecánico Principal"
                />
                <Input
                  label="Sueldo Base ($)"
                  type="number"
                  value={form.baseSalary}
                  onChange={(e) => setForm({ ...form, baseSalary: Number(e.target.value) })}
                  placeholder="450"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-foreground"
                >
                  Cancelar
                </button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Guardando...' : 'Guardar Empleado'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
