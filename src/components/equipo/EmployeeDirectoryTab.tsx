'use client';

import { useState } from 'react';
import { Entity } from '@/lib/api/entities';
import { createEntityAction, updateEntityAction, deleteEntityAction } from '@/app/actions/entities';
import { useActionActor } from '@/hooks/useActionActor';
import { useToast } from '@/components/core/ToastProvider';
import { Users, Plus, Briefcase, Mail, X, Trash2, Clock, Scissors, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmployeeScheduleEditor, defaultWorkingHours, WorkingHours } from './EmployeeScheduleEditor';
import { ImageUpload } from '@/components/core/ImageUpload';

interface EmployeeDirectoryTabProps {
  employees: Entity[];
  tenantId: string;
  onRefresh: () => void;
}

type ModalTab = 'datos' | 'horarios' | 'servicios';

export function EmployeeDirectoryTab({ employees, tenantId, onRefresh }: EmployeeDirectoryTabProps) {
  const actor = useActionActor();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>('datos');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const defaultForm = {
    name: '',
    email: '',
    phone: '',
    roleTitle: 'Especialista',
    baseSalary: 0,
    paymentFrequency: 'quincenal' as 'semanal' | 'quincenal' | 'mensual',
    bookable: true,
    isResource: false,
    avatarUrl: '',
    color: '#3b82f6',
    workingHours: defaultWorkingHours as WorkingHours,
    services: [] as { id: string; name: string; durationMinutes: number; price?: number; priceDisplay?: 'visible' | 'from' | 'hidden' }[],
  };
  
  const [form, setForm] = useState(defaultForm);

  const openNewModal = () => {
    setEditingId(null);
    setForm(defaultForm);
    setModalTab('datos');
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Entity) => {
    setEditingId(emp.id);
    setModalTab('datos');
    setForm({
      name: emp.name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      roleTitle: (emp.metadata?.role_title as string) || (emp.metadata?.is_resource ? 'Espacio / Recurso' : 'Especialista'),
      baseSalary: Number(emp.metadata?.base_salary || emp.metadata?.salary) || 0,
      paymentFrequency: (emp.metadata?.payment_frequency as 'semanal' | 'quincenal' | 'mensual') || 'quincenal',
      bookable: emp.metadata?.bookable !== false,
      isResource: Boolean(emp.metadata?.is_resource),
      avatarUrl: (emp.metadata?.avatar_url as string) || '',
      color: (emp.metadata?.color as string) || '#3b82f6',
      workingHours: (emp.metadata?.working_hours as WorkingHours) || defaultWorkingHours,
      services: (emp.metadata?.services as any[]) || [],
    });
    setIsModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) {
      toast({ variant: 'error', title: 'Error', description: 'Tu sesión ha expirado. Por favor, recarga la página.' });
      return;
    }
    
    setIsSaving(true);
    
    try {
      const payload = {
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        metadata: {
          role_title: form.isResource ? (form.roleTitle || 'Espacio / Recurso') : form.roleTitle,
          base_salary: form.isResource ? 0 : Number(form.baseSalary || 0),
          salary: form.isResource ? 0 : Number(form.baseSalary || 0),
          payment_frequency: form.paymentFrequency,
          bookable: form.bookable, 
          is_resource: form.isResource,
          resource_type: form.isResource ? 'space' : 'human',
          avatar_url: form.avatarUrl,
          color: form.color,
          working_hours: form.workingHours,
          services: form.bookable ? form.services : [],
        },
      };

      let res: any;
      if (editingId) {
        res = await updateEntityAction(editingId, payload, tenantId, actor);
      } else {
        res = await createEntityAction(
          { type: 'employee', ...payload },
          tenantId,
          actor
        );
      }

      if (res && res.success) {
        toast({ variant: 'success', title: 'Éxito', description: `Colaborador guardado correctamente.` });
        setIsModalOpen(false);
        onRefresh();
      } else {
        toast({ variant: 'error', title: 'Error', description: res?.error || 'No se pudo guardar.' });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error de servidor', description: (err as Error).message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!editingId || !actor) return;
    setIsDeleting(true);
    try {
      const res = await deleteEntityAction(editingId, tenantId, actor);
      if (res.success) {
        toast({
          variant: 'success',
          title: 'Colaborador Eliminado',
          description: 'El colaborador fue retirado del equipo. Sus registros contables y nóminas históricas se conservan intactos.',
        });
        setIsDeleteConfirmOpen(false);
        setIsModalOpen(false);
        onRefresh();
      } else {
        toast({
          variant: 'error',
          title: 'Error al eliminar',
          description: res.error || 'No se pudo eliminar el colaborador.',
        });
      }
    } catch (err: unknown) {
      toast({
        variant: 'error',
        title: 'Error de servidor',
        description: (err as Error).message,
      });
    } finally {
      setIsDeleting(false);
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
          Nuevo Colaborador
        </Button>
      </div>

      {/* Grid de Empleados */}
      {employees.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-3xl space-y-3">
          <Users size={36} className="mx-auto text-slate-400 opacity-50" />
          <p className="text-sm font-bold text-foreground">No hay colaboradores registrados</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Registra tu equipo de trabajo para controlar la asistencia y procesar la nómina.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => {
            const isBookable = emp.metadata?.bookable !== false;
            const salary = Number(emp.metadata?.base_salary || emp.metadata?.salary || 0);
            const freq = (emp.metadata?.payment_frequency as string) || 'quincenal';
            
            return (
              <div 
                key={emp.id} 
                onClick={() => openEditModal(emp)}
                className="bg-card border border-border rounded-2xl p-5 shadow-xs hover:border-indigo-500/50 hover:shadow-md transition-all space-y-4 cursor-pointer group relative"
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-base border border-indigo-500/20 group-hover:scale-105 transition-transform overflow-hidden">
                    {emp.metadata?.avatar_url ? (
                      <img src={emp.metadata.avatar_url as string} alt={emp.name} className="w-full h-full object-cover" />
                    ) : (
                      emp.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {emp.metadata?.is_resource ? (
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                        🏟️ Espacio / Cancha
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        Activo
                      </span>
                    )}
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${isBookable ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                      {isBookable ? 'Disponible Reservas' : 'No en Reservas'}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-foreground text-sm tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {emp.name}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
                    <Briefcase size={13} className="text-indigo-500" />
                    {(emp.metadata?.role_title as string) || (emp.metadata?.is_resource ? 'Espacio / Recurso' : 'Especialista')}
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
                  {emp.metadata?.is_resource ? (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400 font-medium">Nómina:</span>
                      <span className="text-indigo-500 font-bold text-[11px]">
                        Excluido de Nómina ($0.00)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400 font-medium">Sueldo Base:</span>
                      <div className="text-right">
                        <span className="font-mono font-bold text-foreground text-xs">
                          ${salary.toFixed(2)} USD
                        </span>
                        <span className="block text-[10px] text-slate-400 capitalize">
                          {freq}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="pt-2 flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(emp);
                    }}
                    className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-500 group-hover:text-white rounded-xl text-xs font-bold transition-colors text-slate-600 dark:text-slate-300"
                  >
                    Ver Ficha Técnica
                  </button>
                  <button
                    type="button"
                    title="Eliminar colaborador"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(emp.id);
                      setForm({
                        ...defaultForm,
                        name: emp.name,
                      });
                      setIsDeleteConfirmOpen(true);
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors border border-transparent hover:border-red-200"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Ficha Técnica / Nuevo Colaborador (z-[100] para evitar obstrucción con barra de navegación) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div 
            className="bg-card border border-border rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[88vh] overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Sticky Header */}
            <div className="p-5 sm:p-6 border-b border-border bg-card sticky top-0 z-20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/20 shrink-0">
                  {form.isResource ? '🏟️' : <Users size={20} />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-foreground">
                    {editingId ? `Ficha Técnica: ${form.name || 'Colaborador'}` : 'Registrar Nuevo Colaborador'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Datos personales, jornada laboral y funciones del personal
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-foreground flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sub-tabs dentro de la Ficha Técnica */}
            <div className="flex border-b border-border bg-slate-50/50 dark:bg-slate-900/50 px-6 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalTab('datos')}
                className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                  modalTab === 'datos'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-foreground'
                }`}
              >
                <FileText size={14} />
                1. Datos & Contrato
              </button>

              <button
                type="button"
                onClick={() => setModalTab('horarios')}
                className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                  modalTab === 'horarios'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-foreground'
                }`}
              >
                <Clock size={14} />
                2. Jornada & Horarios
              </button>

              <button
                type="button"
                onClick={() => setModalTab('servicios')}
                className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                  modalTab === 'servicios'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-foreground'
                }`}
              >
                <Scissors size={14} />
                3. Funciones & Servicios
              </button>
            </div>

            {/* Modal Body Scrollable */}
            <form onSubmit={handleSaveEmployee} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {/* TAB 1: DATOS & CONTRATO */}
                {modalTab === 'datos' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Tipo de Registro
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, isResource: false, roleTitle: form.roleTitle === 'Espacio / Recurso' ? 'Especialista' : form.roleTitle })}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            !form.isResource
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                              : 'bg-card text-slate-600 border-border hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          👤 Persona (Staff)
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, isResource: true, roleTitle: 'Espacio / Recurso', baseSalary: 0 })}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            form.isResource
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-card text-slate-600 border-border hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          🏟️ Cancha / Espacio
                        </button>
                      </div>
                    </div>

                    <Input
                      label={form.isResource ? "Nombre del Espacio / Cancha *" : "Nombre Completo *"}
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder={form.isResource ? "Ej. Cancha de Pádel #1, Cabina Spa #2" : "Ej. Carlos Mendoza"}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Teléfono Móvil"
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
                        placeholder="contacto@empresa.com"
                      />
                    </div>

                    {!form.isResource ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Input
                          label="Cargo / Profesión"
                          value={form.roleTitle}
                          onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
                          placeholder="Ej. Barbero, Masajista"
                        />
                        <Input
                          label="Sueldo Base ($)"
                          type="number"
                          value={form.baseSalary === 0 ? '' : form.baseSalary}
                          onChange={(e) => setForm({ ...form, baseSalary: e.target.value === '' ? 0 : Number(e.target.value) })}
                          placeholder="0"
                        />
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Frecuencia de Pago
                          </label>
                          <select
                            value={form.paymentFrequency}
                            onChange={(e) => setForm({ ...form, paymentFrequency: e.target.value as any })}
                            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="quincenal">Quincenal (Cada 15 días)</option>
                            <option value="mensual">Mensual (Fin de mes)</option>
                            <option value="semanal">Semanal (Cada semana)</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 rounded-2xl text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                        <span>🛡️ <strong>Aislamiento de Nómina Activo:</strong> Este espacio tiene sueldo fijado en $0.00 y está protegido para no alterar costos en nómina.</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 items-start">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Foto de Perfil
                        </label>
                        <ImageUpload 
                          value={form.avatarUrl}
                          onChange={(url) => setForm({ ...form, avatarUrl: url })}
                          bucket="avatars"
                          folder={tenantId}
                          className="items-start"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Color en Calendario de Citas
                        </label>
                        <div className="flex items-center gap-3">
                          <input 
                            type="color" 
                            value={form.color}
                            onChange={(e) => setForm({ ...form, color: e.target.value })}
                            className="w-10 h-10 rounded-xl cursor-pointer border border-border p-1 bg-background"
                          />
                          <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">{form.color.toUpperCase()}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Distingue sus reservas visualmente en la agenda.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: JORNADA & HORARIOS */}
                {modalTab === 'horarios' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-border">
                      <h4 className="text-xs font-black uppercase tracking-wider text-foreground mb-1">Horario Laboral Semanal</h4>
                      <p className="text-xs text-slate-500">Define los días y franjas horarias en que este colaborador o espacio atiende al público.</p>
                    </div>

                    <EmployeeScheduleEditor 
                      value={form.workingHours} 
                      onChange={(wh) => setForm({ ...form, workingHours: wh })} 
                    />
                  </div>
                )}

                {/* TAB 3: FUNCIONES & SERVICIOS */}
                {modalTab === 'servicios' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <div className="flex-1">
                        <span className="block text-xs font-bold text-foreground">Mostrar en Agenda y Reservas</span>
                        <span className="block text-[11px] text-slate-500">Permite a los clientes agendar citas directamente con este colaborador.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, bookable: !form.bookable })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${form.bookable ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${form.bookable ? 'translate-x-2.5' : '-translate-x-2.5'}`}
                        />
                      </button>
                    </div>

                    {form.bookable && (
                      <div className="p-4 border border-border rounded-2xl bg-card space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Servicios, Duración & Precio</h4>
                            <p className="text-[11px] text-slate-500">Configura los servicios que realiza, minutos y precio sugerido (o déjalo en blanco para precio libre).</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setForm({...form, services: [...form.services, { id: crypto.randomUUID(), name: '', durationMinutes: 60, price: undefined }]})}
                            className="px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-500/20 transition-colors flex items-center gap-1.5 uppercase"
                          >
                            <Plus size={14} /> Añadir Servicio
                          </button>
                        </div>
                        
                        {form.services.length === 0 ? (
                          <div className="text-center p-6 border border-dashed border-border rounded-2xl">
                            <p className="text-xs text-slate-500 font-medium">Los clientes podrán seleccionarlo para cualquier servicio general de 60 minutos con precio estándar.</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {form.services.map((svc, idx) => (
                              <div key={svc.id} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Ej: Tratamiento Capilar, Consulta, Corte"
                                  value={svc.name}
                                  onChange={(e) => {
                                    const newServices = [...form.services];
                                    newServices[idx].name = e.target.value;
                                    setForm({...form, services: newServices});
                                  }}
                                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-border bg-background outline-none text-foreground focus:border-indigo-500 transition-colors font-medium"
                                />
                                <div className="flex items-center gap-1 border border-border bg-background rounded-xl px-2 focus-within:border-indigo-500 transition-colors" title="Duración del servicio">
                                  <input
                                    type="number"
                                    min="5"
                                    step="5"
                                    value={svc.durationMinutes === 0 ? '' : svc.durationMinutes}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const newServices = [...form.services];
                                      newServices[idx].durationMinutes = e.target.value === '' ? 0 : Number(e.target.value);
                                      setForm({...form, services: newServices});
                                    }}
                                    className="w-12 text-xs py-2 outline-none bg-transparent text-center text-foreground font-bold"
                                  />
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">min</span>
                                </div>
                                <div className="flex items-center gap-1 border border-border bg-background rounded-xl px-2 focus-within:border-indigo-500 transition-colors" title="Precio establecido (deja vacío para precio libre/a convenir)">
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={svc.price === undefined || svc.price === null ? '' : svc.price}
                                    placeholder="Libre"
                                    onChange={(e) => {
                                      const newServices = [...form.services];
                                      newServices[idx].price = e.target.value === '' ? undefined : Math.max(0, Number(e.target.value));
                                      setForm({...form, services: newServices});
                                    }}
                                    className="w-14 text-xs py-2 outline-none bg-transparent text-center text-foreground font-bold placeholder:text-slate-400 placeholder:font-normal"
                                  />
                                </div>
                                <select
                                  value={svc.priceDisplay || 'visible'}
                                  onChange={(e) => {
                                    const newServices = [...form.services];
                                    newServices[idx].priceDisplay = e.target.value as any;
                                    setForm({...form, services: newServices});
                                  }}
                                  className="text-[10px] font-bold px-1.5 py-2 rounded-xl border border-border bg-background text-foreground outline-none focus:border-indigo-500 transition-colors"
                                  title="Cómo se mostrará el precio al cliente en la página web"
                                >
                                  <option value="visible">Fijo</option>
                                  <option value="from">Desde</option>
                                  <option value="hidden">Oculto 🔒</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newServices = form.services.filter((_, i) => i !== idx);
                                    setForm({...form, services: newServices});
                                  }}
                                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Sticky Footer */}
              <div className="p-4 sm:p-5 border-t border-border bg-card flex items-center justify-between gap-3 sticky bottom-0 z-20">
                <div>
                  {editingId ? (
                    <button
                      type="button"
                      onClick={() => setIsDeleteConfirmOpen(true)}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/40 flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 size={14} />
                      Eliminar Colaborador
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400">Todos los campos con * son obligatorios</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                  <Button type="submit" disabled={isSaving} className="btn-haptic font-bold text-xs">
                    {isSaving ? 'Guardando...' : 'Guardar Ficha Técnica'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación (z-[110]) */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center border border-red-500/20">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h3 className="text-base font-black text-foreground">
                ¿Eliminar a {form.name || 'este colaborador'}?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Este colaborador será archivado y dejará de aparecer en la lista de personal activo y en la agenda de reservas. 
                <strong className="text-foreground block mt-1">Los comprobantes de pago de nómina y el historial de ventas previas se mantendrán intactos.</strong>
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteEmployee}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
              >
                <Trash2 size={14} />
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
