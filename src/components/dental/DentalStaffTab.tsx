'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Stethoscope, 
  Phone, 
  DollarSign, 
  Percent, 
  Check, 
  X, 
  Edit3, 
  Sparkles, 
  Save, 
  Award,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { ModuleStaffMember, saveModuleStaffAction, toggleModuleStaffStatusAction } from '@/app/actions/moduleStaff';
import { ActionActor, getEntitiesAction } from '@/app/actions/entities';
import { Entity } from '@/lib/api/entities';
import { useToast } from '@/components/core/ToastProvider';

interface DentalStaffTabProps {
  staff: ModuleStaffMember[];
  onRefresh: () => void;
  tenantId: string;
  actor: ActionActor;
}

const DENTAL_AVATARS = ['🦷', '🔬', '⚕️', '🩺', '😷', '💉', '🌟', '👨‍⚕️', '👩‍⚕️'];

export function DentalStaffTab({ staff, onRefresh, tenantId, actor }: DentalStaffTabProps) {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editingCommission, setEditingCommission] = useState<number>(45);

  // Colaboradores existentes del tenant
  const [availableEmployees, setAvailableEmployees] = useState<Entity[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  // Formulario nuevo especialista
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Ortodoncista');
  const [specialty, setSpecialty] = useState('Ortodoncia & Brackets');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [commissionPercent, setCommissionPercent] = useState<number>(45);
  const [selectedAvatar, setSelectedAvatar] = useState('🦷');

  useEffect(() => {
    if (tenantId && actor) {
      getEntitiesAction(tenantId, 'employee', 100, actor).then((res) => {
        if (res.success && res.entities) {
          setAvailableEmployees(res.entities as Entity[]);
        }
      });
    }
  }, [tenantId, actor]);

  const handleOpenNewModal = () => {
    setSelectedEmployeeId('');
    setName('');
    setPhone('');
    setRole('Ortodoncista');
    setSpecialty('Ortodoncia & Brackets');
    setLicenseNumber('');
    setCommissionPercent(45);
    setSelectedAvatar('🦷');
    setIsModalOpen(true);
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ variant: 'error', title: 'Campo requerido', description: 'Ingresa el nombre del odontólogo o especialista.' });
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveModuleStaffAction(
        tenantId,
        {
          id: selectedEmployeeId || undefined,
          name: name.trim(),
          phone: phone.trim() || null,
          role,
          specialty,
          licenseNumber: licenseNumber.trim() || undefined,
          commissionPercent: Number(commissionPercent) || 45,
          avatar: selectedAvatar,
          module: 'odontologia',
          isActive: true
        },
        actor
      );

      if (res.success) {
        toast({ variant: 'success', title: 'Especialista registrado', description: `${name} forma parte del cuerpo médico.` });
        setIsModalOpen(false);
        onRefresh();
      } else {
        toast({ variant: 'error', title: 'Error al guardar', description: res.error || 'No se pudo guardar el odontólogo.' });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error inesperado', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCommissionInline = async (member: ModuleStaffMember) => {
    setIsSaving(true);
    try {
      const res = await saveModuleStaffAction(
        tenantId,
        {
          id: member.id.startsWith('starter-') ? undefined : member.id,
          name: member.name,
          phone: member.phone,
          role: member.role,
          specialty: member.specialty,
          licenseNumber: member.licenseNumber,
          commissionPercent: Number(editingCommission),
          avatar: member.avatar,
          module: 'odontologia',
          isActive: member.isActive
        },
        actor
      );

      if (res.success) {
        toast({ 
          variant: 'success', 
          title: 'Honorario actualizado', 
          description: `Comisión/Honorarios de ${member.name} fijada en ${editingCommission}%.` 
        });
        setEditingStaffId(null);
        onRefresh();
      } else {
        toast({ variant: 'error', title: 'Error al actualizar', description: res.error });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (member: ModuleStaffMember) => {
    try {
      await toggleModuleStaffStatusAction(tenantId, member.id, !member.isActive, actor);
      toast({ 
        variant: 'success', 
        title: member.isActive ? 'Especialista desactivado' : 'Especialista activado',
        description: `El estado de ${member.name} ha sido actualizado.`
      });
      onRefresh();
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
    }
  };

  const hasStarters = staff.some(s => s.id.startsWith('starter-'));

  const handlePersistAllStarters = async () => {
    setIsSaving(true);
    try {
      for (const starter of staff.filter(s => s.id.startsWith('starter-'))) {
        await saveModuleStaffAction(
          tenantId,
          {
            name: starter.name,
            role: starter.role,
            specialty: starter.specialty,
            licenseNumber: starter.licenseNumber,
            commissionPercent: starter.commissionPercent,
            avatar: starter.avatar,
            module: 'odontologia',
            isActive: true
          },
          actor
        );
      }
      toast({ variant: 'success', title: 'Cuerpo médico guardado', description: 'Todos los especialistas sugeridos han sido registrados en la base de datos.' });
      onRefresh();
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error al guardar', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera & Botón de Creación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-indigo-500" />
              Cuerpo Médico & Especialistas Clínicos
            </h2>
            <span className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full">
              {staff.length} especialistas
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestiona los odontólogos tratantes, ortodoncistas, endodoncistas y fija sus honorarios médicos o porcentaje de liquidación por tratamiento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasStarters && (
            <button
              onClick={handlePersistAllStarters}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 rounded-xl font-bold text-xs transition-colors"
            >
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Registrar Plantilla Médica
            </button>
          )}

          <button
            onClick={handleOpenNewModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            + Agregar Odontólogo
          </button>
        </div>
      </div>

      {/* Grid de Doctores o Estado Vacío */}
      {staff.length === 0 ? (
        <div className="text-center py-14 bg-card border border-dashed border-border rounded-3xl space-y-4 p-6">
          <div className="w-16 h-16 rounded-3xl bg-teal-500/10 text-teal-600 flex items-center justify-center text-3xl mx-auto border border-teal-500/20">
            🦷
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">No hay odontólogos asignados al cuerpo médico</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              Los odontólogos provienen de tu equipo de colaboradores. Puedes habilitarlos desde el <strong>Directorio de Personal</strong> o vincular uno directamente a continuación.
            </p>
          </div>
          <button
            onClick={handleOpenNewModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs shadow-md shadow-teal-600/20 transition-all btn-haptic"
          >
            <Plus size={16} />
            + Asignar o Agregar Odontólogo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((member) => {
          const isEditing = editingStaffId === member.id;

          return (
            <div
              key={member.id}
              className={`p-5 rounded-2xl border transition-all ${
                member.isActive
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200/60 dark:border-slate-800/60 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-2xl shadow-inner">
                    {member.avatar || '🦷'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      {member.name}
                      {member.id.startsWith('starter-') && (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                          Sugerido
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                      {member.role}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleStatus(member)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-full border transition-colors ${
                    member.isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {member.isActive ? 'Activo' : 'Inactivo'}
                </button>
              </div>

              {member.specialty && (
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                  <span>{member.specialty}</span>
                </div>
              )}

              {member.licenseNumber && (
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  <span>Colegiatura: <strong className="text-slate-700 dark:text-slate-300">{member.licenseNumber}</strong></span>
                </div>
              )}

              {member.phone && (
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span>{member.phone}</span>
                </div>
              )}

              {/* Sección de Honorarios Médicos / Comisión */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Honorario / Comisión Médica
                  </span>
                  
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editingCommission}
                        onChange={(e) => setEditingCommission(Number(e.target.value))}
                        className="w-16 px-2 py-1 text-sm font-bold bg-white dark:bg-slate-800 border border-indigo-400 rounded-lg text-slate-900 dark:text-white"
                        autoFocus
                      />
                      <span className="text-xs font-bold text-slate-500">%</span>
                      <button
                        onClick={() => handleSaveCommissionInline(member)}
                        disabled={isSaving}
                        className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                        title="Guardar porcentaje"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingStaffId(null)}
                        className="p-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-300"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                        {member.commissionPercent}%
                      </span>
                      <span className="text-[11px] text-slate-400">
                        (Doctor {member.commissionPercent}% / Clínica {100 - member.commissionPercent}%)
                      </span>
                    </div>
                  )}
                </div>

                {!isEditing && (
                  <button
                    onClick={() => {
                      setEditingStaffId(member.id);
                      setEditingCommission(member.commissionPercent);
                    }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 rounded-xl transition-colors"
                    title="Editar honorario"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Modal para Agregar Odontólogo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center font-bold text-lg">
                  🦷
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Nuevo Odontólogo / Especialista
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDoctor} className="space-y-4">
              {availableEmployees.length > 0 && (
                <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-2xl space-y-1.5">
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                    Vincular a Empleado de tu Nómina
                  </label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => {
                      const empId = e.target.value;
                      setSelectedEmployeeId(empId);
                      if (empId) {
                        const emp = availableEmployees.find(x => x.id === empId);
                        if (emp) {
                          setName(emp.name.startsWith('Dr') ? emp.name : `Dr(a). ${emp.name}`);
                          setPhone(emp.phone || '');
                          const meta = (emp.metadata || {}) as any;
                          if (meta.dentist_config?.role || meta.role_title) setRole(meta.dentist_config?.role || meta.role_title);
                          if (meta.dentist_config?.specialty) setSpecialty(meta.dentist_config?.specialty);
                          if (meta.dentist_config?.license_number) setLicenseNumber(meta.dentist_config?.license_number);
                          if (meta.dentist_config?.commission_percent) setCommissionPercent(meta.dentist_config?.commission_percent);
                          if (meta.dentist_config?.avatar) setSelectedAvatar(meta.dentist_config?.avatar);
                        }
                      }
                    }}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-teal-500/30"
                  >
                    <option value="">+ Registrar un nuevo odontólogo desde cero</option>
                    {availableEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        👤 {emp.name} {emp.metadata?.role_title ? `(${emp.metadata.role_title})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500">
                    Selecciona un miembro de tu equipo para asignarlo al cuerpo médico conservando su ficha unificada.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Nombre Completo con Título *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Dra. Valentina Morales"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Especialidad Médica
                  </label>
                  <select
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      if (e.target.value === 'Ortodoncista') setSpecialty('Ortodoncia & Brackets');
                      else if (e.target.value === 'Endodoncista') setSpecialty('Conductometría & Tratamiento Pulpar');
                      else if (e.target.value === 'Periodoncista') setSpecialty('Salud Gingival & Raspaje Radicular');
                      else if (e.target.value === 'Cirujano Maxilofacial') setSpecialty('Cirugía Oral & Terceros Molares');
                      else setSpecialty('Operatoria & Rehabilitación Oral');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Ortodoncista">Ortodoncista</option>
                    <option value="Endodoncista">Endodoncista</option>
                    <option value="Periodoncista">Periodoncista</option>
                    <option value="Cirujano Maxilofacial">Cirujano Maxilofacial</option>
                    <option value="Odontopediatra">Odontopediatra</option>
                    <option value="Odontólogo General">Odontólogo General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Nº Colegiatura / Licencia
                  </label>
                  <input
                    type="text"
                    placeholder="ej. OD-5582"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="tel"
                  placeholder="+58 412 1112233"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  % Honorario / Liquidación del Doctor *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="10"
                    max="90"
                    step="5"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <span className="w-16 px-2 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-black text-center text-sm rounded-lg border border-indigo-200 dark:border-indigo-800">
                    {commissionPercent}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Reparto: {commissionPercent}% honorarios para el doctor y {100 - commissionPercent}% para la clínica.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Icono / Avatar
                </label>
                <div className="flex items-center gap-2">
                  {DENTAL_AVATARS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setSelectedAvatar(em)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-transform ${
                        selectedAvatar === em
                          ? 'bg-indigo-100 dark:bg-indigo-950/70 border-2 border-indigo-500 scale-110'
                          : 'bg-slate-100 dark:bg-slate-800 hover:scale-105'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/20 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Guardando...' : 'Registrar Especialista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
