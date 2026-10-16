'use client';

import { useState, useEffect } from 'react';
import { Entity } from '@/lib/api/entities';
import { createEntityAction, updateEntityAction, deleteEntityAction, ActionActor } from '@/app/actions/entities';
import { updateCompanyRolesAction } from '@/app/actions/tenant';
import { useActionActor } from '@/hooks/useActionActor';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useERPStore } from '@/store/useERPStore';
import { useToast } from '@/components/core/ToastProvider';
import { 
  Users, 
  Plus, 
  Briefcase, 
  Mail, 
  X, 
  Trash2, 
  Clock, 
  Tag, 
  FileText, 
  AlertTriangle,
  Sparkles,
  Stethoscope,
  Dog,
  Baby,
  HeartPulse,
  Check,
  Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmployeeScheduleEditor, defaultWorkingHours, WorkingHours } from './EmployeeScheduleEditor';
import { ImageUpload } from '@/components/core/ImageUpload';
import { parsePhoneNumbers, getPrimaryWhatsAppUrl } from '@/lib/phoneUtils';
import { AGENDA_20_COLORS, DEFAULT_AGENDA_COLOR } from '@/lib/calendario/calendarColors';

interface EmployeeDirectoryTabProps {
  employees: Entity[];
  tenantId: string;
  onRefresh: () => void;
}

type ModalTab = 'datos' | 'horarios' | 'servicios' | 'modulos';

export function EmployeeDirectoryTab({ employees, tenantId, onRefresh }: EmployeeDirectoryTabProps) {
  const actor = useActionActor();
  const currentTenant = useTenantResolver();
  const session = useERPStore((s) => s.session);
  const effectiveActor: ActionActor = actor || { 
    email: session?.userEmail || 'admin@rendorp.com', 
    role: (session?.role as any) || 'admin',
    token: session?.token
  };

  const tenantModules: string[] = (currentTenant?.active_modules && currentTenant.active_modules.length > 0)
    ? currentTenant.active_modules
    : ((currentTenant?.metadata as any)?.active_modules && Array.isArray((currentTenant?.metadata as any).active_modules))
      ? (currentTenant?.metadata as any).active_modules
      : [];

  const isOdontologiaActive = tenantModules.includes('odontologia');
  const isBarberiaActive = tenantModules.includes('barberia');
  const isGroomingActive = tenantModules.includes('grooming');
  const isGinecologiaActive = tenantModules.includes('ginecologia') || tenantModules.includes('med_ginecologia');
  const isClinicaActive = tenantModules.includes('clinica') || tenantModules.some((m: string) => m.startsWith('med_'));
  const hasAnySpecializedModule = isOdontologiaActive || isBarberiaActive || isGroomingActive || isGinecologiaActive || isClinicaActive;

  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>('datos');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
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
    defaultSlotMinutes: 60,
    generalServiceEnabled: true,
    generalServiceName: '',
    generalServicePrice: undefined as number | undefined,
    services: [] as { id: string; name: string; durationMinutes: number; price?: number; priceDisplay?: 'visible' | 'from' | 'hidden' }[],
    // Configuración para Barbería
    isBarber: false,
    barberRole: '',
    barberSpecialty: '',
    barberCommission: 50,
    barberAvatar: '✂️',
    // Configuración para Odontología
    isDentist: false,
    dentistRole: '',
    dentistSpecialty: '',
    dentistLicense: '',
    dentistCommission: 45,
    dentistAvatar: '🦷',
    // Configuración para Grooming
    isGroomer: false,
    groomerRole: '',
    groomerSpecialty: '',
    groomerCommission: 45,
    groomerAvatar: '🐩',
    // Configuración para Ginecología / Médicos / Especialistas Clínicos
    isDoctor: false,
    doctorRole: '',
    doctorSpecialty: '',
    doctorLicense: '',
    doctorCommission: 50,
    doctorAvatar: '🩺',
  };
  
  const [form, setForm] = useState(defaultForm);

  // Catálogo Centralizado de Puestos / Roles de la Empresa con Íconos Personalizables
  const [companyRoles, setCompanyRoles] = useState<Array<{ name: string; icon: string }>>([]);
  const [isCreatingRoleInline, setIsCreatingRoleInline] = useState(false);
  const [inlineRoleName, setInlineRoleName] = useState('');
  const [inlineRoleIcon, setInlineRoleIcon] = useState('💼');
  const [isPickerOpenInline, setIsPickerOpenInline] = useState(false);

  const [isManageRolesOpen, setIsManageRolesOpen] = useState(false);
  const [manageNewRoleInput, setManageNewRoleInput] = useState('');
  const [manageNewRoleIcon, setManageNewRoleIcon] = useState('💼');
  const [isManagePickerOpen, setIsManagePickerOpen] = useState(false);
  const [editingRoleIconFor, setEditingRoleIconFor] = useState<string | null>(null);

  const [isSavingRolesToBackend, setIsSavingRolesToBackend] = useState(false);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

  // Paleta de Íconos / Emojis Universales para cualquier industria
  const ROLE_ICONS_LIST = [
    // Salud & Clínica
    '🩺', '🫀', '👶', '🦷', '👁️', '🦴', '🔬', '💉', '💊',
    // Belleza & Cuidado
    '💈', '✂️', '🧖', '💅', '💄', '🧴',
    // Servicios Profesionales & Oficina
    '💼', '⚖️', '📊', '💻', '🏢', '📋', '📞',
    // Deporte & Bienestar
    '🏋️', '🧘', '🥋', '🎾', '⚽', '🏊',
    // Mascotas
    '🐩', '🐕', '🐈', '🐾',
    // Técnicos & Oficios
    '🔧', '🚗', '⚡', '🔨', '🛡️',
    // Creativo & Docente
    '🎨', '📸', '🎓', '🎵',
    // Gastronomía & General
    '☕', '🍳', '🍕', '🍸', '⭐', '✨'
  ];

  const inferDefaultIcon = (name: string): string => {
    const norm = name.toLowerCase();
    if (norm.includes('cardio') || norm.includes('corazon')) return '🫀';
    if (norm.includes('gineco') || norm.includes('obstetr') || norm.includes('prenatal') || norm.includes('pediatr')) return '👶';
    if (norm.includes('odont') || norm.includes('dent') || norm.includes('bracket') || norm.includes('muela')) return '🦷';
    if (norm.includes('medic') || norm.includes('doctor') || norm.includes('salud') || norm.includes('clinica')) return '🩺';
    if (norm.includes('oftalmo') || norm.includes('optomet')) return '👁️';
    if (norm.includes('trauma') || norm.includes('fisioterap') || norm.includes('rehabilitac')) return '🦴';
    if (norm.includes('barber') || norm.includes('fade')) return '💈';
    if (norm.includes('estil') || norm.includes('peluqu') || norm.includes('corte')) return '✂️';
    if (norm.includes('groom') || norm.includes('canin') || norm.includes('mascot')) return '🐩';
    if (norm.includes('spa') || norm.includes('masaj')) return '🧖';
    if (norm.includes('abogad') || norm.includes('legal') || norm.includes('jurid')) return '⚖️';
    if (norm.includes('contad') || norm.includes('finanz')) return '📊';
    if (norm.includes('entrenad') || norm.includes('fitness') || norm.includes('gym')) return '🏋️';
    if (norm.includes('mecanic') || norm.includes('taller')) return '🔧';
    if (norm.includes('chef') || norm.includes('cocin')) return '🍳';
    return '💼';
  };

  // Sincronización reactiva del catálogo de puestos
  useEffect(() => {
    const rawTenantRoles = (currentTenant?.metadata as any)?.company_roles;

    const rawEmployeeRoles: string[] = employees
      .map(e => (e.metadata as any)?.role_title)
      .filter(Boolean) as string[];

    const defaultSuggestedRoles = [
      ...(isClinicaActive ? ['Médico General', 'Especialista en Cardiología', 'Ginecólogo Obstetra', 'Pediatra'] : []),
      ...(isOdontologiaActive ? ['Odontólogo General', 'Ortodoncista', 'Asistente Dental'] : []),
      ...(isBarberiaActive ? ['Master Barber', 'Barbero Profesional'] : []),
      ...(isGroomingActive ? ['Groomer Canino', 'Bañador & Estilista'] : []),
      'Especialista',
      'Administrador',
      'Recepcionista'
    ];

    const map = new Map<string, { name: string; icon: string }>();

    const parseAndAdd = (item: any) => {
      if (!item) return;
      let name = '';
      let icon = '';

      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (!trimmed || trimmed === 'Espacio / Recurso') return;
        const emojiMatch = trimmed.match(/^(\p{Extended_Pictographic}+)\s*(.+)$/u);
        if (emojiMatch) {
          icon = emojiMatch[1];
          name = emojiMatch[2].trim();
        } else {
          name = trimmed;
          icon = inferDefaultIcon(trimmed);
        }
      } else if (typeof item === 'object') {
        name = (item.name || '').trim();
        icon = item.icon || inferDefaultIcon(name);
      }

      if (!name) return;
      const lower = name.toLowerCase();
      if (!map.has(lower)) {
        map.set(lower, { name, icon: icon || '💼' });
      }
    };

    if (Array.isArray(rawTenantRoles)) {
      rawTenantRoles.forEach(parseAndAdd);
    }
    rawEmployeeRoles.forEach(parseAndAdd);

    if (map.size === 0) {
      defaultSuggestedRoles.forEach(parseAndAdd);
    }

    setCompanyRoles(Array.from(map.values()));
  }, [currentTenant?.metadata, employees, isClinicaActive, isOdontologiaActive, isBarberiaActive, isGroomingActive]);

  /**
   * Asigna el puesto seleccionado al formulario y activa de forma inteligente 
   * el módulo especializado correspondiente (médico, dental, barbero, groomer)
   * para evitar inconsistencias o tener que escribir el rol dos veces.
   */
  const applyRoleSelection = (roleName: string) => {
    const trimmed = roleName.trim();
    if (!trimmed) {
      setForm(prev => ({ ...prev, roleTitle: '' }));
      return;
    }

    const lower = trimmed.toLowerCase();
    const updates: Partial<typeof form> = {
      roleTitle: trimmed
    };

    // Detección Médica / Clínica
    const isMedRelated = lower.includes('médic') || lower.includes('medic') || lower.includes('doctor') ||
      lower.includes('cardio') || lower.includes('gineco') || lower.includes('pediatr') ||
      lower.includes('trauma') || lower.includes('derma') || lower.includes('oftalmo') ||
      lower.includes('cirujan') || lower.includes('obstetr') || lower.includes('especialista');

    if (isMedRelated && (isClinicaActive || isGinecologiaActive)) {
      updates.isDoctor = true;
      if (!form.doctorRole || form.doctorRole === 'Especialista' || form.doctorRole === form.roleTitle) {
        updates.doctorRole = trimmed;
      }
    }

    // Detección Odontología
    const isDentalRelated = lower.includes('odont') || lower.includes('dentist') || lower.includes('dental') || lower.includes('ortodonc');
    if (isDentalRelated && isOdontologiaActive) {
      updates.isDentist = true;
      if (!form.dentistRole || form.dentistRole === 'Especialista' || form.dentistRole === form.roleTitle) {
        updates.dentistRole = trimmed;
      }
    }

    // Detección Barbería
    const isBarberRelated = lower.includes('barber') || lower.includes('fade') || lower.includes('navaj');
    if (isBarberRelated && isBarberiaActive) {
      updates.isBarber = true;
      if (!form.barberRole || form.barberRole === 'Especialista' || form.barberRole === form.roleTitle) {
        updates.barberRole = trimmed;
      }
    }

    // Detección Grooming
    const isGroomerRelated = lower.includes('groom') || lower.includes('canin') || lower.includes('mascot') || lower.includes('bañador');
    if (isGroomerRelated && isGroomingActive) {
      updates.isGroomer = true;
      if (!form.groomerRole || form.groomerRole === 'Especialista' || form.groomerRole === form.roleTitle) {
        updates.groomerRole = trimmed;
      }
    }

    setForm(prev => ({ ...prev, ...updates }));
  };

  /**
   * Guarda o actualiza un puesto con su ícono en el catálogo persistido de la empresa
   */
  const handleSaveNewCompanyRole = async (newRoleText: string, iconText?: string) => {
    const trimmed = newRoleText.trim();
    if (!trimmed) {
      toast({ variant: 'error', title: 'Nombre Requerido', description: 'Por favor escribe el nombre del puesto.' });
      return;
    }

    const icon = iconText || inferDefaultIcon(trimmed);
    const lower = trimmed.toLowerCase();
    const existingIndex = companyRoles.findIndex(r => r.name.toLowerCase() === lower);

    let updatedRoles: Array<{ name: string; icon: string }>;
    if (existingIndex >= 0) {
      updatedRoles = [...companyRoles];
      updatedRoles[existingIndex] = { ...updatedRoles[existingIndex], icon };
    } else {
      updatedRoles = [...companyRoles, { name: trimmed, icon }];
    }

    setCompanyRoles(updatedRoles);
    setIsSavingRolesToBackend(true);
    try {
      const res = await updateCompanyRolesAction(tenantId, updatedRoles, effectiveActor);
      if (res.success) {
        toast({ variant: 'success', title: 'Puesto Guardado', description: `${icon} ${trimmed} configurado en la empresa.` });
        if (currentTenant) {
          useERPStore.getState().setCurrentTenant({
            ...currentTenant,
            metadata: {
              ...(currentTenant.metadata || {}),
              company_roles: updatedRoles
            }
          });
        }
      } else {
        toast({ variant: 'error', title: 'Error al persistir', description: res.error || 'No se pudo guardar el puesto en el servidor.' });
      }
    } catch (e: any) {
      toast({ variant: 'error', title: 'Error de red', description: e.message });
    } finally {
      setIsSavingRolesToBackend(false);
    }

    applyRoleSelection(trimmed);
    setInlineRoleName('');
    setInlineRoleIcon('💼');
    setIsCreatingRoleInline(false);
    setIsPickerOpenInline(false);
  };

  /**
   * Cambia el ícono de un puesto existente
   */
  const handleUpdateRoleIcon = async (roleName: string, newIcon: string) => {
    const updatedRoles = companyRoles.map(r => 
      r.name.toLowerCase() === roleName.toLowerCase() ? { ...r, icon: newIcon } : r
    );
    setCompanyRoles(updatedRoles);
    setEditingRoleIconFor(null);
    try {
      await updateCompanyRolesAction(tenantId, updatedRoles, effectiveActor);
      toast({ variant: 'success', title: 'Ícono Actualizado', description: `Se asignó ${newIcon} a ${roleName}.` });
      if (currentTenant) {
        useERPStore.getState().setCurrentTenant({
          ...currentTenant,
          metadata: {
            ...(currentTenant.metadata || {}),
            company_roles: updatedRoles
          }
        });
      }
    } catch (e: any) {
      toast({ variant: 'error', title: 'Error', description: e.message });
    }
  };

  /**
   * Elimina un puesto del catálogo de la empresa
   */
  const handleDeleteCompanyRole = async (roleToDelete: string) => {
    const updatedRoles = companyRoles.filter(r => r.name.toLowerCase() !== roleToDelete.toLowerCase());
    setCompanyRoles(updatedRoles);
    setIsSavingRolesToBackend(true);
    try {
      const res = await updateCompanyRolesAction(tenantId, updatedRoles, effectiveActor);
      if (res.success) {
        toast({ variant: 'success', title: 'Puesto Retirado', description: `Se retiró "${roleToDelete}" del catálogo de puestos.` });
        if (currentTenant) {
          useERPStore.getState().setCurrentTenant({
            ...currentTenant,
            metadata: {
              ...(currentTenant.metadata || {}),
              company_roles: updatedRoles
            }
          });
        }
      } else {
        toast({ variant: 'error', title: 'Error al eliminar', description: res.error });
      }
    } catch (e: any) {
      toast({ variant: 'error', title: 'Error', description: e.message });
    } finally {
      setIsSavingRolesToBackend(false);
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setForm(defaultForm);
    setModalTab('datos');
    setSaveError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Entity) => {
    setEditingId(emp.id);
    setModalTab('datos');
    setSaveError(null);
    const meta = (emp.metadata || {}) as any;
    const isBarber = Boolean(meta.is_barber || meta.barber_config?.is_active || meta.module === 'barberia' || (Array.isArray(meta.modules) && meta.modules.includes('barberia')));
    const isDentist = Boolean(meta.is_dentist || meta.dentist_config?.is_active || meta.module === 'odontologia' || (Array.isArray(meta.modules) && meta.modules.includes('odontologia')));
    const isGroomer = Boolean(meta.is_groomer || meta.groomer_config?.is_active || meta.module === 'grooming' || (Array.isArray(meta.modules) && meta.modules.includes('grooming')));
    const isDoctor = Boolean(meta.is_doctor || meta.is_gineco || meta.doctor_config?.is_active || meta.module === 'ginecologia' || meta.module === 'clinica' || (Array.isArray(meta.modules) && (meta.modules.includes('ginecologia') || meta.modules.includes('clinica'))));

    setForm({
      name: emp.name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      roleTitle: (meta.role_title as string) || (meta.is_resource ? 'Espacio / Recurso' : 'Especialista'),
      baseSalary: Number(meta.base_salary || meta.salary) || 0,
      paymentFrequency: (meta.payment_frequency as 'semanal' | 'quincenal' | 'mensual') || 'quincenal',
      bookable: meta.bookable !== false,
      isResource: Boolean(meta.is_resource),
      avatarUrl: (meta.avatar_url as string) || '',
      color: (meta.color as string) || '#3b82f6',
      workingHours: (meta.working_hours as WorkingHours) || defaultWorkingHours,
      defaultSlotMinutes: Number(meta.default_slot_minutes || meta.general_slot_minutes || 60),
      generalServiceEnabled: meta.general_service_enabled !== false,
      generalServiceName: (meta.general_service_name as string) || '',
      generalServicePrice: meta.general_service_price !== undefined ? Number(meta.general_service_price) : undefined,
      services: (meta.services as any[]) || [],

      // Barbería
      isBarber,
      barberRole: meta.barber_config?.role || (meta.role !== 'Especialista' ? meta.role : '') || '',
      barberSpecialty: meta.barber_config?.specialty || meta.specialty || '',
      barberCommission: Number(meta.barber_config?.commission_percent ?? meta.commission_percent ?? 50),
      barberAvatar: meta.barber_config?.avatar || (isBarber ? (meta.avatar || '✂️') : '✂️'),

      // Odontología
      isDentist,
      dentistRole: meta.dentist_config?.role || (meta.role !== 'Especialista' ? meta.role : '') || '',
      dentistSpecialty: meta.dentist_config?.specialty || meta.specialty || '',
      dentistLicense: meta.dentist_config?.license_number || meta.licenseNumber || meta.license_number || '',
      dentistCommission: Number(meta.dentist_config?.commission_percent ?? meta.commission_percent ?? 45),
      dentistAvatar: meta.dentist_config?.avatar || (isDentist ? (meta.avatar || '🦷') : '🦷'),

      // Grooming
      isGroomer,
      groomerRole: meta.groomer_config?.role || (meta.role !== 'Especialista' ? meta.role : '') || '',
      groomerSpecialty: meta.groomer_config?.specialty || meta.specialty || '',
      groomerCommission: Number(meta.groomer_config?.commission_percent ?? meta.commission_percent ?? 45),
      groomerAvatar: meta.groomer_config?.avatar || (isGroomer ? (meta.avatar || '🐩') : '🐩'),

      // Médico / Especialista Clínico
      isDoctor,
      doctorRole: meta.doctor_config?.role || (meta.role !== 'Especialista' ? meta.role : '') || (meta.role_title !== 'Especialista' ? meta.role_title : '') || '',
      doctorSpecialty: (() => {
        const rawSpec = meta.doctor_config?.specialty || meta.specialty || '';
        // Si el médico es cardiólogo u otra especialidad y tenía el viejo default residual de ginecología, limpiarlo
        const roleText = `${emp.name || ''} ${meta.role_title || ''} ${meta.role || ''}`.toLowerCase();
        if (rawSpec.toLowerCase().includes('control prenatal') && !roleText.includes('gineco') && !roleText.includes('obstetr')) {
          return '';
        }
        return rawSpec;
      })(),
      doctorLicense: meta.doctor_config?.license_number || meta.licenseNumber || meta.license_number || '',
      doctorCommission: Number(meta.doctor_config?.commission_percent ?? meta.commission_percent ?? 50),
      doctorAvatar: meta.doctor_config?.avatar || (isDoctor ? (meta.avatar || '🩺') : '🩺'),
    });
    setIsModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    if (!form.name || !form.name.trim()) {
      setModalTab('datos');
      const msg = form.isResource ? 'El nombre del espacio o cancha es requerido.' : 'El nombre del colaborador es requerido.';
      setSaveError(msg);
      toast({ variant: 'error', title: 'Campo Requerido', description: msg });
      return;
    }

    if (!effectiveActor?.email) {
      const msg = 'Tu sesión ha expirado o no está disponible. Por favor, recarga la página.';
      setSaveError(msg);
      toast({ variant: 'error', title: 'Sesión no disponible', description: msg });
      return;
    }
    
    setIsSaving(true);
    
    try {
      const existingMeta = (employees.find(emp => emp.id === editingId)?.metadata || {}) as any;
      const assignedModules: string[] = Array.isArray(existingMeta.modules) ? [...existingMeta.modules] : [];

      if (form.isBarber && !assignedModules.includes('barberia')) assignedModules.push('barberia');
      if (!form.isBarber && assignedModules.includes('barberia')) {
        const idx = assignedModules.indexOf('barberia');
        if (idx !== -1) assignedModules.splice(idx, 1);
      }

      if (form.isDentist && !assignedModules.includes('odontologia')) assignedModules.push('odontologia');
      if (!form.isDentist && assignedModules.includes('odontologia')) {
        const idx = assignedModules.indexOf('odontologia');
        if (idx !== -1) assignedModules.splice(idx, 1);
      }

      if (form.isGroomer && !assignedModules.includes('grooming')) assignedModules.push('grooming');
      if (!form.isGroomer && assignedModules.includes('grooming')) {
        const idx = assignedModules.indexOf('grooming');
        if (idx !== -1) assignedModules.splice(idx, 1);
      }

      if (form.isDoctor) {
        if (!assignedModules.includes('ginecologia')) assignedModules.push('ginecologia');
        if (!assignedModules.includes('clinica')) assignedModules.push('clinica');
      } else {
        const gIdx = assignedModules.indexOf('ginecologia');
        if (gIdx !== -1) assignedModules.splice(gIdx, 1);
        const cIdx = assignedModules.indexOf('clinica');
        if (cIdx !== -1) assignedModules.splice(cIdx, 1);
      }

      const payload = {
        name: form.name.trim(),
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
        metadata: {
          ...existingMeta,
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
          default_slot_minutes: form.defaultSlotMinutes || 60,
          general_slot_minutes: form.defaultSlotMinutes || 60,
          general_service_enabled: form.generalServiceEnabled,
          general_service_name: form.generalServiceName?.trim() || '',
          general_service_price: form.generalServicePrice,
          services: form.bookable ? form.services : [],
          modules: assignedModules,

          // Configuración Barbería
          is_barber: form.isBarber,
          barber_config: {
            is_active: form.isBarber,
            role: form.barberRole,
            specialty: form.barberSpecialty,
            commission_percent: Number(form.barberCommission) || 50,
            avatar: form.barberAvatar || '✂️',
          },

          // Configuración Odontología
          is_dentist: form.isDentist,
          dentist_config: {
            is_active: form.isDentist,
            role: form.dentistRole,
            specialty: form.dentistSpecialty,
            license_number: form.dentistLicense,
            commission_percent: Number(form.dentistCommission) || 45,
            avatar: form.dentistAvatar || '🦷',
          },

          // Configuración Grooming
          is_groomer: form.isGroomer,
          groomer_config: {
            is_active: form.isGroomer,
            role: form.groomerRole,
            specialty: form.groomerSpecialty,
            commission_percent: Number(form.groomerCommission) || 45,
            avatar: form.groomerAvatar || '🐩',
          },

          // Configuración Ginecología & Clínica Médica
          is_doctor: form.isDoctor,
          is_gineco: form.isDoctor,
          doctor_config: {
            is_active: form.isDoctor,
            role: form.doctorRole,
            specialty: form.doctorSpecialty,
            license_number: form.doctorLicense,
            commission_percent: Number(form.doctorCommission) || 50,
            avatar: form.doctorAvatar || '🩺',
          },

          // Compatibilidad legacy si solo tiene un rol principal activo:
          ...(form.isBarber ? {
            role: form.barberRole,
            specialty: form.barberSpecialty,
            commission_percent: form.barberCommission,
            avatar: form.barberAvatar,
            module: 'barberia'
          } : form.isDentist ? {
            role: form.dentistRole,
            specialty: form.dentistSpecialty,
            licenseNumber: form.dentistLicense,
            commission_percent: form.dentistCommission,
            avatar: form.dentistAvatar,
            module: 'odontologia'
          } : form.isGroomer ? {
            role: form.groomerRole,
            specialty: form.groomerSpecialty,
            commission_percent: form.groomerCommission,
            avatar: form.groomerAvatar,
            module: 'grooming'
          } : form.isDoctor ? {
            role: form.doctorRole,
            specialty: form.doctorSpecialty,
            licenseNumber: form.doctorLicense,
            commission_percent: form.doctorCommission,
            avatar: form.doctorAvatar,
            module: isGinecologiaActive ? 'ginecologia' : 'clinica'
          } : {}),
        },
      };

      let res: any;
      if (editingId) {
        res = await updateEntityAction(editingId, payload, tenantId, effectiveActor);
      } else {
        res = await createEntityAction(
          { type: 'employee', ...payload },
          tenantId,
          effectiveActor
        );
      }

      if (res && res.success) {
        toast({ variant: 'success', title: 'Éxito', description: `Colaborador guardado correctamente.` });
        setSaveError(null);
        setIsModalOpen(false);
        onRefresh();
      } else {
        const errorMsg = res?.error || 'No se pudo guardar.';
        setSaveError(errorMsg);
        toast({ variant: 'error', title: 'Error al guardar', description: errorMsg });
      }
    } catch (err: unknown) {
      const errorMsg = (err as Error).message || 'Error de servidor.';
      setSaveError(errorMsg);
      toast({ variant: 'error', title: 'Error de servidor', description: errorMsg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!editingId) return;
    if (!effectiveActor?.email) {
      toast({ variant: 'error', title: 'Sesión no disponible', description: 'Por favor recarga la página o inicia sesión.' });
      return;
    }
    setIsDeleting(true);
    try {
      const res = await deleteEntityAction(editingId, tenantId, effectiveActor);
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

  const filteredEmployees = employees.filter((emp) => {
    if (selectedRoleFilter === 'ALL') return true;
    const meta = (emp.metadata || {}) as Record<string, any>;
    const roleTitle = (meta.role_title as string) || (meta.is_resource ? 'Espacio / Recurso' : 'Especialista');
    return roleTitle.trim().toLowerCase() === selectedRoleFilter.trim().toLowerCase();
  });

  return (
    <div className="space-y-6">
      {/* Sub-header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users size={20} className="text-indigo-500" />
            Directorio de Personal
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Personal operativo, especialistas y administrativos registrados en la empresa
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsManageRolesOpen(true)}
            className="px-3 py-2 rounded-xl border border-border bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-foreground flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Settings2 size={14} className="text-indigo-500" />
            <span>Puestos de la Empresa ({companyRoles.length})</span>
          </button>
          <Button onClick={openNewModal} className="flex items-center gap-2 text-xs font-bold btn-haptic">
            <Plus size={16} />
            Nuevo Colaborador
          </Button>
        </div>
      </div>

      {/* Barra de Filtros Rápidos por Puesto */}
      {employees.length > 0 && companyRoles.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              selectedRoleFilter === 'ALL'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-card text-slate-600 dark:text-slate-300 border-border hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Todos ({employees.length})
          </button>
          {companyRoles.map((role) => {
            const count = employees.filter((e) => {
              const meta = (e.metadata || {}) as Record<string, any>;
              const title = (meta.role_title as string) || (meta.is_resource ? 'Espacio / Recurso' : 'Especialista');
              return title.trim().toLowerCase() === role.name.trim().toLowerCase();
            }).length;
            if (count === 0 && selectedRoleFilter !== role.name) return null;
            return (
              <button
                key={role.name}
                type="button"
                onClick={() => setSelectedRoleFilter(role.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                  selectedRoleFilter === role.name
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-card text-slate-600 dark:text-slate-300 border-border hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="select-none">{role.icon}</span>
                <span>{role.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedRoleFilter === role.name ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Grid de Empleados */}
      {employees.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-3xl space-y-3">
          <Users size={36} className="mx-auto text-slate-400 opacity-50" />
          <p className="text-sm font-bold text-foreground">No hay colaboradores registrados</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Registra tu equipo de trabajo para gestionar citas, comisiones y procesar la nómina.
          </p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-12 bg-card border border-dashed border-border rounded-3xl space-y-3">
          <Users size={32} className="mx-auto text-slate-400 opacity-40" />
          <p className="text-sm font-bold text-foreground">No hay colaboradores con el puesto "{selectedRoleFilter}"</p>
          <button
            type="button"
            onClick={() => setSelectedRoleFilter('ALL')}
            className="text-xs font-bold text-indigo-600 hover:underline"
          >
            Ver todos los colaboradores
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => {
            const meta = (emp.metadata || {}) as Record<string, any>;
            const isBookable = meta.bookable !== false;
            const salary = Number(meta.base_salary || meta.salary || 0);
            const freq = (meta.payment_frequency as string) || 'quincenal';
            const roleTitle = (meta.role_title as string) || (meta.is_resource ? 'Espacio / Recurso' : 'Especialista');
            const matchedRole = companyRoles.find(r => r.name.toLowerCase() === roleTitle.trim().toLowerCase());
            const roleIcon = matchedRole ? matchedRole.icon : inferDefaultIcon(roleTitle);
            
            return (
              <div 
                key={emp.id} 
                onClick={() => openEditModal(emp)}
                className="bg-card border border-border rounded-2xl p-5 shadow-xs hover:border-indigo-500/50 hover:shadow-md transition-all space-y-4 cursor-pointer group relative"
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-base border border-indigo-500/20 group-hover:scale-105 transition-transform overflow-hidden">
                    {meta.avatar_url ? (
                      <img src={meta.avatar_url as string} alt={emp.name} className="w-full h-full object-cover" />
                    ) : (
                      emp.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {meta.is_resource ? (
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

                    {/* Badges de Módulos Especializados (Solo si el módulo está activo en la empresa) */}
                    {isBarberiaActive && Boolean(meta.is_barber || meta.barber_config?.is_active || meta.module === 'barberia' || ((meta.modules as string[]) || []).includes('barberia')) && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <span>💈 Barbero</span>
                        <span className="opacity-75">({Number(meta.barber_config?.commission_percent ?? meta.commission_percent ?? 50)}%)</span>
                      </span>
                    )}
                    {isOdontologiaActive && Boolean(meta.is_dentist || meta.dentist_config?.is_active || meta.module === 'odontologia' || ((meta.modules as string[]) || []).includes('odontologia')) && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 flex items-center gap-1">
                        <span>🦷 Odontólogo</span>
                        <span className="opacity-75">({Number(meta.dentist_config?.commission_percent ?? meta.commission_percent ?? 45)}%)</span>
                      </span>
                    )}
                    {isGroomingActive && Boolean(meta.is_groomer || meta.groomer_config?.is_active || meta.module === 'grooming' || ((meta.modules as string[]) || []).includes('grooming')) && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <span>🐕 Groomer</span>
                        <span className="opacity-75">({Number(meta.groomer_config?.commission_percent ?? meta.commission_percent ?? 45)}%)</span>
                      </span>
                    )}
                    {(isClinicaActive || isGinecologiaActive) && Boolean(meta.is_doctor || meta.doctor_config?.is_active || meta.module === 'clinica' || ((meta.modules as string[]) || []).includes('clinica')) && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1">
                        <span>🩺 Médico / Especialista</span>
                        <span className="opacity-75">({Number(meta.doctor_config?.commission_percent ?? meta.commission_percent ?? 50)}%)</span>
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-foreground text-sm tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {emp.name}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
                    <span className="text-sm select-none">{roleIcon}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{roleTitle}</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-border space-y-1.5 text-xs text-slate-500">
                  {emp.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="text-slate-400" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                  )}
                  {emp.phone && (() => {
                    const parsed = parsePhoneNumbers(emp.phone);
                    return (
                      <div className="flex items-center gap-2">
                        <span className="w-[13px] text-center text-[10px] font-black text-slate-400">📞</span>
                        <span className="truncate" title={parsed.displayFormatted || emp.phone}>
                          {parsed.displayFormatted || emp.phone}
                        </span>
                        {parsed.primary && (
                          <a
                            href={getPrimaryWhatsAppUrl(emp.phone)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline ml-auto shrink-0 flex items-center gap-0.5"
                            title={parsed.hasMultiple ? `Escribir al primario (${parsed.primary})` : 'Abrir WhatsApp'}
                          >
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>
                    );
                  })()}
                  {meta.is_resource ? (
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
                className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
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
                className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                  modalTab === 'servicios'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-foreground'
                }`}
              >
                <Briefcase size={14} />
                3. Funciones & Servicios
              </button>

              {hasAnySpecializedModule && (
                <button
                  type="button"
                  onClick={() => setModalTab('modulos')}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                    modalTab === 'modulos'
                      ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-foreground'
                  }`}
                >
                  <Sparkles size={14} className="text-amber-500" />
                  4. Módulos Operativos
                  {((form.isBarber ? 1 : 0) + (form.isDentist ? 1 : 0) + (form.isGroomer ? 1 : 0)) > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500 text-white font-mono font-bold">
                      {(form.isBarber ? 1 : 0) + (form.isDentist ? 1 : 0) + (form.isGroomer ? 1 : 0)}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Modal Body Scrollable */}
            <form onSubmit={handleSaveEmployee} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {/* Banner de Error Visible si la Acción Falla */}
                {saveError && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between text-rose-700 dark:text-rose-300 text-xs font-semibold animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} className="text-rose-500 shrink-0" />
                      <span>{saveError}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setSaveError(null)} 
                      className="text-rose-400 hover:text-rose-600 p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

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
                      <div className="space-y-3">
                        {/* Selector Centralizado de Puesto / Rol de la Empresa */}
                        <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-border space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <Briefcase size={14} className="text-indigo-500" />
                              Puesto / Cargo en la Empresa *
                            </label>
                            <div className="flex items-center gap-2">
                              {!isCreatingRoleInline && (
                                <button
                                  type="button"
                                  onClick={() => setIsCreatingRoleInline(true)}
                                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 hover:underline"
                                >
                                  <Plus size={13} />
                                  Nuevo Puesto
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setIsManageRolesOpen(true)}
                                className="text-xs font-bold text-slate-500 hover:text-foreground flex items-center gap-1 hover:underline"
                              >
                                <Settings2 size={13} />
                                Gestionar ({companyRoles.length})
                              </button>
                            </div>
                          </div>

                          {isCreatingRoleInline ? (
                            <div className="space-y-2 animate-in fade-in">
                              <div className="flex items-center gap-2">
                                {/* Selector de Ícono Inline */}
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setIsPickerOpenInline(!isPickerOpenInline)}
                                    className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-lg hover:scale-105 active:scale-95 transition-all select-none shadow-2xs"
                                    title="Elegir ícono / emoji para este puesto"
                                  >
                                    {inlineRoleIcon}
                                  </button>

                                  {isPickerOpenInline && (
                                    <div className="absolute top-11 left-0 z-50 bg-card border border-border rounded-2xl p-2.5 shadow-2xl w-60 animate-in fade-in zoom-in-95">
                                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border">
                                        <span className="text-[10px] font-black text-foreground">Seleccionar Ícono</span>
                                        <button
                                          type="button"
                                          onClick={() => setIsPickerOpenInline(false)}
                                          className="text-slate-400 hover:text-foreground text-xs"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                      <div className="grid grid-cols-6 gap-1 max-h-40 overflow-y-auto p-0.5">
                                        {ROLE_ICONS_LIST.map((ic) => (
                                          <button
                                            key={ic}
                                            type="button"
                                            onClick={() => {
                                              setInlineRoleIcon(ic);
                                              setIsPickerOpenInline(false);
                                            }}
                                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors ${
                                              inlineRoleIcon === ic ? 'bg-indigo-100 dark:bg-indigo-900 border border-indigo-400' : ''
                                            }`}
                                          >
                                            {ic}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <input
                                  type="text"
                                  autoFocus
                                  value={inlineRoleName}
                                  onChange={(e) => {
                                    setInlineRoleName(e.target.value);
                                    if (inlineRoleIcon === '💼') {
                                      setInlineRoleIcon(inferDefaultIcon(e.target.value));
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveNewCompanyRole(inlineRoleName, inlineRoleIcon);
                                    } else if (e.key === 'Escape') {
                                      setIsCreatingRoleInline(false);
                                      setIsPickerOpenInline(false);
                                    }
                                  }}
                                  placeholder="Escribe el nuevo puesto (Ej. Cardiólogo Intervencionista, Barbero Master...)"
                                  className="flex-1 bg-background border border-indigo-500/50 rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveNewCompanyRole(inlineRoleName, inlineRoleIcon)}
                                  disabled={isSavingRolesToBackend || !inlineRoleName.trim()}
                                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0"
                                >
                                  <Check size={13} />
                                  Guardar y Asignar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsCreatingRoleInline(false);
                                    setInlineRoleName('');
                                    setInlineRoleIcon('💼');
                                    setIsPickerOpenInline(false);
                                  }}
                                  className="px-2.5 py-2 text-slate-500 hover:text-foreground rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-800"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {form.roleTitle && (
                                <div 
                                  className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-lg select-none shrink-0"
                                  title="Ícono del puesto"
                                >
                                  {companyRoles.find(r => r.name.toLowerCase() === form.roleTitle.toLowerCase())?.icon || inferDefaultIcon(form.roleTitle)}
                                </div>
                              )}
                              <div className="relative flex-1">
                                <select
                                  value={form.roleTitle}
                                  onChange={(e) => {
                                    if (e.target.value === '__NEW__') {
                                      setIsCreatingRoleInline(true);
                                    } else {
                                      applyRoleSelection(e.target.value);
                                    }
                                  }}
                                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                                >
                                  <option value="">-- Seleccionar puesto registrado --</option>
                                  {form.roleTitle && !companyRoles.some(r => r.name.toLowerCase() === form.roleTitle.toLowerCase()) && (
                                    <option value={form.roleTitle}>{inferDefaultIcon(form.roleTitle)} {form.roleTitle} (Actual)</option>
                                  )}
                                  {companyRoles.map((role) => (
                                    <option key={role.name} value={role.name}>{role.icon} {role.name}</option>
                                  ))}
                                  <option value="__NEW__" className="font-bold text-indigo-600">+ Crear nuevo puesto con ícono...</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Sueldo Base y Frecuencia de Pago */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          Color en Calendario de Citas (20 Tonos Protegidos)
                        </label>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-border space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-medium">
                              Tono: <strong className="text-foreground">{AGENDA_20_COLORS.find(c => c.hex.toLowerCase() === form.color.toLowerCase())?.name || form.color}</strong>
                            </span>
                            <div 
                              className="w-5 h-5 rounded-full border border-white/50 shadow-xs" 
                              style={{ backgroundColor: form.color }} 
                            />
                          </div>

                          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                            {AGENDA_20_COLORS.map((col) => {
                              const isSelected = form.color.toLowerCase() === col.hex.toLowerCase();
                              return (
                                <button
                                  key={col.id}
                                  type="button"
                                  onClick={() => setForm({ ...form, color: col.hex })}
                                  title={col.name}
                                  className={`w-7 h-7 rounded-xl transition-all flex items-center justify-center relative ${
                                    isSelected 
                                      ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110 shadow-sm z-10' 
                                      : 'hover:scale-105 opacity-85 hover:opacity-100'
                                  }`}
                                  style={{ backgroundColor: col.hex }}
                                >
                                  {isSelected && <Check size={13} className="text-white drop-shadow-md stroke-[3]" />}
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Este tono se asigna automáticamente a las citas de este colaborador y nunca colisiona con el verde de pago ni el rojo de cancelación.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: JORNADA & HORARIOS */}
                {modalTab === 'horarios' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <EmployeeScheduleEditor 
                      value={form.workingHours} 
                      onChange={(wh) => setForm({ ...form, workingHours: wh })}
                      slotMinutes={form.defaultSlotMinutes}
                      onSlotMinutesChange={(mins) => setForm({ ...form, defaultSlotMinutes: mins })}
                      onGoToServices={() => setModalTab('servicios')}
                    />
                  </div>
                )}

                {/* TAB 3: FUNCIONES & SERVICIOS */}
                {modalTab === 'servicios' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <div className="flex-1">
                        <span className="block text-xs font-bold text-foreground">Mostrar en Agenda y Reservas Web</span>
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
                      <div className="space-y-4">
                        {/* SECCIÓN 1: SERVICIO GENERAL VINCULADO AL HORARIO */}
                        <div className="p-4 border-2 border-indigo-200/80 dark:border-indigo-800/80 rounded-2xl bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Servicio General
                                </span>
                                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                                  Atención General (Bloque Estándar)
                                </h4>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1">
                                Utiliza el bloque general configurado en horarios (<strong>{form.defaultSlotMinutes} min</strong>). Ideal para consultas médicas generales o atenciones estándar.
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setForm({ ...form, generalServiceEnabled: !form.generalServiceEnabled })}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${form.generalServiceEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                              title={form.generalServiceEnabled ? 'Desactivar servicio general' : 'Activar servicio general'}
                            >
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${form.generalServiceEnabled ? 'translate-x-2' : '-translate-x-2'}`}
                              />
                            </button>
                          </div>

                          {form.generalServiceEnabled && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-indigo-100 dark:border-indigo-900/60">
                              <div className="sm:col-span-2 space-y-1">
                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                  Nombre del Servicio General
                                </label>
                                <input
                                  type="text"
                                  placeholder={form.roleTitle ? `Consulta / ${form.roleTitle}` : 'Consulta General'}
                                  value={form.generalServiceName}
                                  onChange={(e) => setForm({ ...form, generalServiceName: e.target.value })}
                                  className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-background outline-none text-foreground focus:border-indigo-500 font-medium"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                  Precio Base (USD)
                                </label>
                                <div className="flex items-center gap-1 border border-border bg-background rounded-xl px-2 focus-within:border-indigo-500">
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={form.generalServicePrice === undefined || form.generalServicePrice === null ? '' : form.generalServicePrice}
                                    placeholder="Libre"
                                    onChange={(e) => setForm({ ...form, generalServicePrice: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)) })}
                                    className="w-full text-xs py-2 outline-none bg-transparent text-foreground font-bold placeholder:text-slate-400 placeholder:font-normal"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* SECCIÓN 2: SERVICIOS PARTICULARES O ESPECIALIZADOS */}
                        <div className="p-4 border border-border rounded-2xl bg-card space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Particulares
                                </span>
                                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                                  Servicios Particulares (Duración & Precio Individual)
                                </h4>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Agrega procedimientos específicos que requieran tiempos propios (ej: 15, 30, 45, 90, 120 min) sin romper el horario.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setForm({
                                ...form, 
                                services: [
                                  ...form.services, 
                                  { 
                                    id: crypto.randomUUID(), 
                                    name: '', 
                                    durationMinutes: form.defaultSlotMinutes || 45, 
                                    price: undefined,
                                    priceDisplay: 'visible'
                                  }
                                ]
                              })}
                              className="px-3 py-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl text-xs font-bold hover:bg-purple-500/20 transition-colors flex items-center gap-1.5 uppercase shrink-0"
                            >
                              <Plus size={14} /> Añadir Particular
                            </button>
                          </div>
                          
                          {form.services.length === 0 ? (
                            <div className="text-center p-6 border border-dashed border-border rounded-2xl">
                              <p className="text-xs text-slate-500 font-medium">
                                No has añadido servicios particulares. {form.generalServiceEnabled ? `El colaborador atenderá citas en bloques de ${form.defaultSlotMinutes} minutos.` : 'Activa el servicio general o añade un servicio particular.'}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                              {form.services.map((svc, idx) => (
                                <div key={svc.id} className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 bg-slate-50/80 dark:bg-slate-900/40 rounded-xl border border-border/80">
                                  <input
                                    type="text"
                                    placeholder="Ej: Limpieza Profunda, Ecografía, Corte Fade"
                                    value={svc.name}
                                    onChange={(e) => {
                                      const newServices = [...form.services];
                                      newServices[idx].name = e.target.value;
                                      setForm({...form, services: newServices});
                                    }}
                                    className="flex-1 min-w-[140px] text-xs px-3 py-2 rounded-xl border border-border bg-background outline-none text-foreground focus:border-purple-500 transition-colors font-medium"
                                  />
                                  <div className="flex items-center gap-1 border border-border bg-background rounded-xl px-2 focus-within:border-purple-500 transition-colors" title="Duración del servicio">
                                    <input
                                      type="number"
                                      min="5"
                                      step="5"
                                      value={svc.durationMinutes === 0 ? '' : svc.durationMinutes}
                                      placeholder="min"
                                      onChange={(e) => {
                                        const newServices = [...form.services];
                                        newServices[idx].durationMinutes = e.target.value === '' ? 0 : Number(e.target.value);
                                        setForm({...form, services: newServices});
                                      }}
                                      className="w-12 text-xs py-2 outline-none bg-transparent text-center text-foreground font-bold"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">min</span>
                                  </div>
                                  <div className="flex items-center gap-1 border border-border bg-background rounded-xl px-2 focus-within:border-purple-500 transition-colors" title="Precio establecido (deja vacío para precio libre/a convenir)">
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
                                    className="text-[10px] font-bold px-1.5 py-2 rounded-xl border border-border bg-background text-foreground outline-none focus:border-purple-500 transition-colors"
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
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors shrink-0"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Banner Informativo de Convivencia */}
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                          <Sparkles size={16} className="text-emerald-600 shrink-0" />
                          <span>
                            <strong>Perfecta Armonía:</strong> La agenda adapta la duración de la cita al servicio que el cliente elija (general de {form.defaultSlotMinutes} min o particular) respetando siempre el horario laboral del colaborador sin choques ni sobreposiciones.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: MÓDULOS OPERATIVOS (HABILITACIONES ESPECIALIZADAS) */}
                {modalTab === 'modulos' && hasAnySpecializedModule && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-border">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-amber-500" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                          Asignación a Módulos Especializados
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Vincula a este colaborador con los módulos activos de tu empresa. Al habilitarlo, podrá ser seleccionado en las estaciones operativas, agendas de turnos y comisiones por servicio.
                      </p>
                    </div>

                    {/* CARD 1: BARBERÍA (Solo si 'barberia' está activo) */}
                    {isBarberiaActive && (
                      <div className="bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 rounded-2xl p-4.5 space-y-3.5 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl font-bold border border-amber-500/20">
                              💈
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-foreground">Barbería & Estilo Masculino</h4>
                                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                  Módulo Activo
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">Habilita a este colaborador para atender sillas de barbero, turnos walk-in y cobrar comisiones.</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setForm({ ...form, isBarber: !form.isBarber })}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out ${
                              form.isBarber ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                form.isBarber ? 'translate-x-2.5' : '-translate-x-2.5'
                              }`}
                            />
                          </button>
                        </div>

                        {form.isBarber && (
                          <div className="pt-3 border-t border-amber-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                            <div>
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Cargo en Barbería</label>
                              <input
                                type="text"
                                value={form.barberRole}
                                onChange={(e) => setForm({ ...form, barberRole: e.target.value })}
                                placeholder="Ej: Master Barber, Barbero Senior"
                                className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Especialidad</label>
                              <input
                                type="text"
                                value={form.barberSpecialty}
                                onChange={(e) => setForm({ ...form, barberSpecialty: e.target.value })}
                                placeholder="Ej: Degradados, Navaja & Ritual de Barba"
                                className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-background text-foreground"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Comisión por Servicio (%)</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={form.barberCommission}
                                  onChange={(e) => setForm({ ...form, barberCommission: Number(e.target.value) || 0 })}
                                  className="w-full text-xs px-3 py-2 pr-7 rounded-xl border border-border bg-background text-foreground font-bold font-mono"
                                />
                                <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Emoji / Avatar en Sillón</label>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {['✂️', '💈', '🔥', '👑', '🧔', '⚡', '🎩'].map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setForm({ ...form, barberAvatar: emoji })}
                                    className={`w-8 h-8 rounded-xl text-base flex items-center justify-center border transition-all ${
                                      form.barberAvatar === emoji
                                        ? 'border-amber-500 bg-amber-500/20 scale-105'
                                        : 'border-border bg-background hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CARD 2: ODONTOLOGÍA (Solo si 'odontologia' está activo) */}
                    {isOdontologiaActive && (
                      <div className="bg-teal-500/5 dark:bg-teal-950/20 border border-teal-500/20 rounded-2xl p-4.5 space-y-3.5 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xl font-bold border border-teal-500/20">
                              🦷
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-foreground">Odontología & Salud Dental</h4>
                                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                  Módulo Activo
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">Habilita a este colaborador como Doctor / Odontólogo para atender sillones dentales y firmar evoluciones.</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setForm({ ...form, isDentist: !form.isDentist })}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out ${
                              form.isDentist ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                form.isDentist ? 'translate-x-2.5' : '-translate-x-2.5'
                              }`}
                            />
                          </button>
                        </div>

                        {form.isDentist && (
                          <div className="pt-3 border-t border-teal-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                            <div>
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Cargo / Especialidad Médica</label>
                              <input
                                type="text"
                                value={form.dentistRole}
                                onChange={(e) => setForm({ ...form, dentistRole: e.target.value })}
                                placeholder="Ej: Ortodoncista, Endodoncista, Cirujano"
                                className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Área / Enfoque Clínico</label>
                              <input
                                type="text"
                                value={form.dentistSpecialty}
                                onChange={(e) => setForm({ ...form, dentistSpecialty: e.target.value })}
                                placeholder="Ej: Brackets, Alineadores & Cirugía Guiada"
                                className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-background text-foreground"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Nº Colegiatura / Matrícula Profesional</label>
                              <input
                                type="text"
                                value={form.dentistLicense}
                                onChange={(e) => setForm({ ...form, dentistLicense: e.target.value })}
                                placeholder="Ej: OD-5582"
                                className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-background text-foreground font-mono"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Comisión por Procedimiento (%)</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={form.dentistCommission}
                                  onChange={(e) => setForm({ ...form, dentistCommission: Number(e.target.value) || 0 })}
                                  className="w-full text-xs px-3 py-2 pr-7 rounded-xl border border-border bg-background text-foreground font-bold font-mono"
                                />
                                <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                              </div>
                            </div>

                            <div className="sm:col-span-2">
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Emoji / Avatar en Sillón Clínico</label>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {['🦷', '🔬', '⚕️', '🩺', '😷', '💉', '🌟', '👨‍⚕️', '👩‍⚕️'].map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setForm({ ...form, dentistAvatar: emoji })}
                                    className={`w-8 h-8 rounded-xl text-base flex items-center justify-center border transition-all ${
                                      form.dentistAvatar === emoji
                                        ? 'border-teal-500 bg-teal-500/20 scale-105'
                                        : 'border-border bg-background hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CARD 3: GROOMING (Solo si 'grooming' está activo) */}
                    {isGroomingActive && (
                      <div className="bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4.5 space-y-3.5 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl font-bold border border-emerald-500/20">
                              🐩
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-foreground">Peluquería & Spa Canino</h4>
                                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                  Módulo Activo
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">Habilita a este colaborador como Groomer / Estilista Canino para atender baños, cortes y tratamientos.</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setForm({ ...form, isGroomer: !form.isGroomer })}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out ${
                              form.isGroomer ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                form.isGroomer ? 'translate-x-2.5' : '-translate-x-2.5'
                              }`}
                            />
                          </button>
                        </div>

                        {form.isGroomer && (
                          <div className="pt-3 border-t border-emerald-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                            <div>
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Cargo en Peluquería</label>
                              <input
                                type="text"
                                value={form.groomerRole}
                                onChange={(e) => setForm({ ...form, groomerRole: e.target.value })}
                                placeholder="Ej: Groomer Senior, Bañador & Deslanador"
                                className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Especialidad</label>
                              <input
                                type="text"
                                value={form.groomerSpecialty}
                                onChange={(e) => setForm({ ...form, groomerSpecialty: e.target.value })}
                                placeholder="Ej: Corte a Tijera, Poodles & Doble Manto"
                                className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-background text-foreground"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Comisión por Servicio (%)</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={form.groomerCommission}
                                  onChange={(e) => setForm({ ...form, groomerCommission: Number(e.target.value) || 0 })}
                                  className="w-full text-xs px-3 py-2 pr-7 rounded-xl border border-border bg-background text-foreground font-bold font-mono"
                                />
                                <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Emoji / Avatar en Tina / Mesa</label>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {['🐩', '🐕', '🐈', '✂️', '🧼', '🛁', '⭐', '🐾'].map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setForm({ ...form, groomerAvatar: emoji })}
                                    className={`w-8 h-8 rounded-xl text-base flex items-center justify-center border transition-all ${
                                      form.groomerAvatar === emoji
                                        ? 'border-emerald-500 bg-emerald-500/20 scale-105'
                                        : 'border-border bg-background hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CARD 4: GINECOLOGÍA & CLÍNICA MÉDICA (Solo si 'ginecologia' o 'clinica' está activo) */}
                    {(isGinecologiaActive || isClinicaActive) && (
                      <div className="bg-pink-500/5 dark:bg-pink-950/20 border border-pink-500/20 rounded-2xl p-4.5 space-y-3.5 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center text-xl font-bold border border-pink-500/20">
                              🩺
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-foreground">Clínica Médica & Especialistas</h4>
                                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                  Módulo Activo
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">
                                Habilita a este colaborador como Médico Tratante / Especialista (Cardiología, Pediatría, Ginecología, etc.) para atender consultas y emitir órdenes a caja.
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const willBeDoctor = !form.isDoctor;
                              const autoRole = form.doctorRole || (form.roleTitle && form.roleTitle !== 'Especialista' && form.roleTitle !== 'Espacio / Recurso' ? form.roleTitle : '');
                              setForm({ 
                                ...form, 
                                isDoctor: willBeDoctor,
                                doctorRole: willBeDoctor ? autoRole : form.doctorRole
                              });
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out ${
                              form.isDoctor ? 'bg-pink-500' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                form.isDoctor ? 'translate-x-2.5' : '-translate-x-2.5'
                              }`}
                            />
                          </button>
                        </div>

                        {form.isDoctor && (
                          <div className="pt-3 border-t border-pink-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                            <div>
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                Cargo / Especialidad Clínica
                              </label>
                              <input
                                type="text"
                                value={form.doctorRole}
                                onChange={(e) => setForm({ ...form, doctorRole: e.target.value })}
                                placeholder="Ej: Cardiólogo, Pediatra, Ginecólogo, Médico Internista"
                                className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                Rama / Subespecialidad / Enfoque
                              </label>
                              <input
                                type="text"
                                value={form.doctorSpecialty}
                                onChange={(e) => setForm({ ...form, doctorSpecialty: e.target.value })}
                                placeholder="Ej: Cardiología Clínica, Control Prenatal, Eco Fetal"
                                className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-background text-foreground"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                Nº Colegiatura / Matrícula Médica (MPPS)
                              </label>
                              <input
                                type="text"
                                value={form.doctorLicense}
                                onChange={(e) => setForm({ ...form, doctorLicense: e.target.value })}
                                placeholder="Ej: MPPS-94812 / ColMed-342"
                                className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-background text-foreground font-mono"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                Comisión / Honorarios (%)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={form.doctorCommission}
                                  onChange={(e) => setForm({ ...form, doctorCommission: Number(e.target.value) || 0 })}
                                  className="w-full text-xs px-3 py-2 pr-7 rounded-xl border border-border bg-background text-foreground font-bold font-mono"
                                />
                                <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                              </div>
                            </div>

                            <div className="sm:col-span-2">
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                Emoji / Distintivo en Consulta
                              </label>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {['🩺', '👶', '🌸', '🔬', '⚕️', '👩‍⚕️', '👨‍⚕️', '💊', '❤️'].map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setForm({ ...form, doctorAvatar: emoji })}
                                    className={`w-8 h-8 rounded-xl text-base flex items-center justify-center border transition-all ${
                                      form.doctorAvatar === emoji
                                        ? 'border-pink-500 bg-pink-500/20 scale-105'
                                        : 'border-border bg-background hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
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

      {/* Modal de Gestión Centralizada de Puestos y Roles de la Empresa (z-[105]) */}
      {isManageRolesOpen && (
        <div className="fixed inset-0 z-[105] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                  <Briefcase size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">
                    Catálogo de Puestos de la Empresa
                  </h3>
                  <p className="text-xs text-slate-500">
                    Estandariza los cargos para que todo el equipo comparta los mismos puestos sin errores de tipeo.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManageRolesOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Input para agregar nuevo puesto con selector de ícono */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 relative">
                {/* Selector de Emoji para nuevo puesto */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsManagePickerOpen(!isManagePickerOpen)}
                    className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-lg hover:scale-105 active:scale-95 transition-all select-none shadow-2xs"
                    title="Elegir ícono / emoji para el puesto"
                  >
                    {manageNewRoleIcon}
                  </button>

                  {isManagePickerOpen && (
                    <div className="absolute top-12 left-0 z-[120] bg-card border border-border rounded-2xl p-3 shadow-2xl w-64 animate-in fade-in zoom-in-95">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                        <span className="text-[11px] font-black text-foreground">Elige un Ícono</span>
                        <button
                          type="button"
                          onClick={() => setIsManagePickerOpen(false)}
                          className="text-slate-400 hover:text-foreground text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="grid grid-cols-6 gap-1.5 max-h-48 overflow-y-auto p-1">
                        {ROLE_ICONS_LIST.map((ic) => (
                          <button
                            key={ic}
                            type="button"
                            onClick={() => {
                              setManageNewRoleIcon(ic);
                              setIsManagePickerOpen(false);
                            }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-base hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors ${
                              manageNewRoleIcon === ic ? 'bg-indigo-100 dark:bg-indigo-900 border border-indigo-400' : ''
                            }`}
                          >
                            {ic}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  value={manageNewRoleInput}
                  onChange={(e) => {
                    setManageNewRoleInput(e.target.value);
                    if (manageNewRoleIcon === '💼') {
                      setManageNewRoleIcon(inferDefaultIcon(e.target.value));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (manageNewRoleInput.trim()) {
                        handleSaveNewCompanyRole(manageNewRoleInput, manageNewRoleIcon);
                        setManageNewRoleInput('');
                        setManageNewRoleIcon('💼');
                      }
                    }
                  }}
                  placeholder="Escribe un nuevo puesto (Ej. Dermatólogo, Barbero Senior...)"
                  className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (manageNewRoleInput.trim()) {
                      handleSaveNewCompanyRole(manageNewRoleInput, manageNewRoleIcon);
                      setManageNewRoleInput('');
                      setManageNewRoleIcon('💼');
                    }
                  }}
                  disabled={!manageNewRoleInput.trim() || isSavingRolesToBackend}
                  className="text-xs font-bold shrink-0"
                >
                  <Plus size={14} className="mr-1" />
                  Agregar
                </Button>
              </div>
            </div>

            {/* Lista de puestos registrados */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[200px]">
              {companyRoles.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No hay puestos registrados en la empresa. Crea el primero arriba.
                </div>
              ) : (
                companyRoles.map((role) => {
                  const assignedCount = employees.filter(e => {
                    const t = ((e.metadata as any)?.role_title || '').trim().toLowerCase();
                    return t === role.name.toLowerCase();
                  }).length;

                  const isEditingThisIcon = editingRoleIconFor === role.name;

                  return (
                    <div
                      key={role.name}
                      className="flex items-center justify-between p-3 rounded-2xl border border-border bg-slate-50/50 dark:bg-slate-900/30 hover:border-indigo-500/30 transition-all relative"
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Botón de ícono interactivo para cambiar emoji con 1 clic */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setEditingRoleIconFor(isEditingThisIcon ? null : role.name)}
                            title="Haz clic para cambiar el ícono de este puesto"
                            className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-border hover:border-indigo-400 text-indigo-600 flex items-center justify-center font-bold text-base hover:scale-110 active:scale-95 transition-all shadow-2xs cursor-pointer select-none"
                          >
                            {role.icon}
                          </button>

                          {isEditingThisIcon && (
                            <div className="absolute top-11 left-0 z-[125] bg-card border border-border rounded-2xl p-3 shadow-2xl w-64 animate-in fade-in zoom-in-95">
                              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                                <span className="text-[11px] font-black text-foreground">Cambiar ícono de {role.name}</span>
                                <button
                                  type="button"
                                  onClick={() => setEditingRoleIconFor(null)}
                                  className="text-slate-400 hover:text-foreground text-xs"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="grid grid-cols-6 gap-1.5 max-h-48 overflow-y-auto p-1">
                                {ROLE_ICONS_LIST.map((ic) => (
                                  <button
                                    key={ic}
                                    type="button"
                                    onClick={() => handleUpdateRoleIcon(role.name, ic)}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-base hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors ${
                                      role.icon === ic ? 'bg-indigo-100 dark:bg-indigo-900 border border-indigo-400' : ''
                                    }`}
                                  >
                                    {ic}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div>
                          <span className="text-xs font-bold text-foreground block">{role.name}</span>
                          <span className="text-[10px] text-slate-400">
                            {assignedCount === 1 ? '1 colaborador asignado' : `${assignedCount} colaboradores asignados`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDeleteCompanyRole(role.name)}
                          disabled={isSavingRolesToBackend}
                          title={assignedCount > 0 ? `Atención: Hay ${assignedCount} empleado(s) con este puesto` : 'Eliminar puesto'}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <Button
                type="button"
                onClick={() => setIsManageRolesOpen(false)}
                className="text-xs font-bold"
              >
                Listo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
