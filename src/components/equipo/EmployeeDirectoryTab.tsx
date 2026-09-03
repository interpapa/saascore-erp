'use client';

import { useState } from 'react';
import { Entity } from '@/lib/api/entities';
import { createEntityAction } from '@/app/actions/entities';
import { useActionActor } from '@/hooks/useActionActor';
import { useToast } from '@/components/core/ToastProvider';
import { Users, Plus, Briefcase, Mail } from 'lucide-react';
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
  const [editingId, setEditingId] = useState<string | null>(null);

  const defaultForm = {
    name: '',
    email: '',
    phone: '',
    roleTitle: 'Especialista',
    baseSalary: 450,
    bookable: true,
  };
  
  const [form, setForm] = useState(defaultForm);

  const openNewModal = () => {
    setEditingId(null);
    setForm(defaultForm);
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Entity) => {
    setEditingId(emp.id);
    setForm({
      name: emp.name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      roleTitle: (emp.metadata?.role_title as string) || 'Empleado',
      baseSalary: Number(emp.metadata?.base_salary) || 0,
      bookable: emp.metadata?.bookable !== false, // Defaults to true if undefined
    });
    setIsModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      setIsSaving(true);
      let res;
      
      const payload = {
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        metadata: {
          role_title: form.roleTitle,
          base_salary: Number(form.baseSalary),
          bookable: form.bookable,
        },
      };

      if (editingId) {
        // dynamic import of updateEntityAction because it wasn't originally imported here
        const { updateEntityAction } = await import('@/app/actions/entities');
        res = await updateEntityAction(editingId, payload, tenantId, actor);
      } else {
        res = await createEntityAction(
          { type: 'employee', ...payload },
          tenantId,
          actor
        );
      }

      if (res.success) {
        toast({ variant: 'success', title: 'Éxito', description: `Empleado guardado correctamente.` });
        setIsModalOpen(false);
        onRefresh();
      } else {
        toast({ variant: 'error', title: 'Error', description: res.error || 'No se pudo guardar.' });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error de servidor', description: (err as Error).message });
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

        <Button onClick={openNewModal} className="flex items-center gap-2 text-xs font-bold btn-haptic">
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
          {employees.map((emp) => {
            const isBookable = emp.metadata?.bookable !== false;
            
            return (
              <div 
                key={emp.id} 
                onClick={() => openEditModal(emp)}
                className="bg-card border border-border rounded-2xl p-5 shadow-xs hover:border-indigo-500/50 hover:shadow-md transition-all space-y-4 cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-base border border-indigo-500/20 group-hover:scale-105 transition-transform">
                    {emp.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      Activo
                    </span>
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${isBookable ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                      {isBookable ? 'Disponible Reservas' : 'No en Reservas'}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-foreground text-sm tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{emp.name}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
                    <Briefcase size={13} className="text-indigo-500" />
                    {(emp.metadata?.role_title as string) || 'Empleado General'}
                  </p>
                </div>

                <div className="pt-3 border-t border-border space-y-1.5 text-xs text-slate-500">
                  {emp.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="text-slate-400" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                  )}
                  {emp.phone && (
                    <div className="flex items-center gap-2">
                      <span className="w-[13px] text-center text-[10px] font-black text-slate-400">📞</span>
                      <span className="truncate">{emp.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400 font-medium">Sueldo Base:</span>
                    <span className="font-mono font-bold text-foreground text-xs">
                      ${Number(emp.metadata?.base_salary || 0).toFixed(2)} USD
                    </span>
                  </div>
                </div>
                
                <div className="pt-2">
                  <button 
                    className="w-full py-2 bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-500 group-hover:text-white rounded-xl text-xs font-bold transition-colors text-slate-600 dark:text-slate-300"
                  >
                    Ver Ficha Técnica
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nuevo/Editar Empleado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-foreground mb-4">
              {editingId ? 'Ficha Técnica del Empleado' : 'Registrar Nuevo Empleado'}
            </h3>
            
            <form onSubmit={handleSaveEmployee} className="space-y-4">
              <Input
                label="Nombre Completo *"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Carlos Mendoza"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Teléfono"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 234 567 890"
                />
                <Input
                  label="Correo Electrónico"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="carlos@empresa.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Cargo / Profesión"
                  value={form.roleTitle}
                  onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
                  placeholder="Ej. Barbero"
                />
                <Input
                  label="Sueldo Base ($)"
                  type="number"
                  value={form.baseSalary}
                  onChange={(e) => setForm({ ...form, baseSalary: Number(e.target.value) })}
                  placeholder="450"
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex-1">
                  <span className="block text-xs font-bold text-foreground">Mostrar en Reservas</span>
                  <span className="block text-[10px] text-slate-500">Permite a los clientes agendar citas con este empleado.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, bookable: !form.bookable })}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${form.bookable ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <span className="sr-only">Habilitar reservas</span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${form.bookable ? 'translate-x-2' : '-translate-x-2'}`}
                  />
                </button>
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
                  {isSaving ? 'Guardando...' : 'Guardar Datos'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
