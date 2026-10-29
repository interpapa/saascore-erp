'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Stethoscope,
  Users,
  Activity,
  HeartPulse,
  Baby,
  Sparkles,
  Bone,
  Eye,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  FileText,
  Printer,
  Send,
  Pill,
  FlaskConical,
  DollarSign,
  Clock,
  Layers,
  UserCheck,
  RefreshCw,
  Trash2,
  Save,
  CreditCard,
  Edit3,
  Check,
  X,
  Calendar,
  ClipboardList,
  Smile,
  Image as ImageIcon,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  MedicalSpecialtyId,
  MedicalProcedureDefinition,
  MedicalSpecialtyConfig,
  MEDICAL_SPECIALTIES_LIST,
  MEDICAL_SPECIALTIES_MAP,
  mergeTenantMedicalServices,
} from '@/lib/medical/specialtyRegistry';
import { updateTenantSettings } from '@/app/actions/tenant';
import {
  calculateBMI,
  calculateMAP,
  calculateExactPediatricAge,
} from '@/lib/medical/clinicalCalculators';
import {
  ClinicalMedicalProfile,
  ClinicalEncounterRecord,
  getClinicalPatientRecordAction,
  saveClinicalEncounterAction,
  dispatchClinicalOrderToPOSAction,
} from '@/app/actions/clinica';
import {
  getEntitiesAction,
  createEntityAction,
  updateEntityAction,
  ActionActor,
} from '@/app/actions/entities';
import { getItemsAction } from '@/app/actions/items';
import { Entity } from '@/lib/api/entities';
import { useERPStore } from '@/store/useERPStore';
import { useActionActor } from '@/hooks/useActionActor';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useToast } from '@/components/core/ToastProvider';
import { SpecialtyWidgets, ClinicalVitalsInput } from '@/components/clinica/SpecialtyWidgets';
import { PrescriptionPrintModal } from '@/components/clinica/PrescriptionPrintModal';

const SPECIALTY_ICON_MAP: Record<MedicalSpecialtyId, React.ComponentType<{ className?: string }>> = {
  med_general: Stethoscope,
  med_cardiologia: Activity,
  med_pediatria: Baby,
  med_ginecologia: HeartPulse,
  med_dermatologia: Sparkles,
  med_traumatologia: Bone,
  med_oftalmologia: Eye,
};

interface SessionOrderItem {
  id: string;
  code: string;
  name: string;
  price: number;
  quantity: number;
  sessionsRequired: number;
  stages: Array<{ id: string; title: string; order: number; sessionNumber?: number }>;
}

export default function ClinicaMultiEspecialidadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const specParam = searchParams?.get('spec');
  const currentTenant = useTenantResolver();
  const session = useERPStore((s) => s.session);
  const actor = useActionActor();
  const effectiveActor: ActionActor = useMemo(
    () =>
      actor || {
        email: session?.userEmail || 'clinica@rendorp.com',
        role: (session?.role as any) || 'admin',
        token: session?.token,
      },
    [actor, session?.userEmail, session?.role, session?.token]
  );
  const { toast } = useToast();

  const tenantId = currentTenant?.id || session?.tenantId || '';
  const tenantMeta = (currentTenant?.metadata as Record<string, any>) || {};
  const currentExchangeRate = Number(
    tenantMeta.exchange_rate?.rate || tenantMeta.exchange_rate || 850.0
  );

  // 1. Filtrar pestañas de especialidades según sub-módulos activos del tenant en Rendo Hub
  const enabledSpecialties = useMemo(() => {
    const rawModules: string[] =
      (currentTenant?.active_modules && currentTenant.active_modules.length > 0
        ? currentTenant.active_modules
        : (tenantMeta.active_modules as string[])) || [];

    const activeMedSubmodules = MEDICAL_SPECIALTIES_LIST.filter((spec) => {
      const alias = spec.id.replace('med_', '');
      return rawModules.includes(spec.id) || rawModules.includes(alias);
    });

    // Si tiene sub-módulos específicos activos, mostrar esos; si solo tiene 'clinica' (o vacío), mostrar todas por defecto
    if (activeMedSubmodules.length > 0) {
      return activeMedSubmodules;
    }
    return MEDICAL_SPECIALTIES_LIST;
  }, [currentTenant?.active_modules, tenantMeta.active_modules]);

  const [activeSpecialtyId, setActiveSpecialtyId] = useState<MedicalSpecialtyId>('med_general');

  useEffect(() => {
    if (specParam) {
      const normalized = (specParam.startsWith('med_') ? specParam : `med_${specParam}`) as MedicalSpecialtyId;
      if (MEDICAL_SPECIALTIES_MAP[normalized]) {
        setActiveSpecialtyId(normalized);
        return;
      }
    }
    if (
      enabledSpecialties.length > 0 &&
      !enabledSpecialties.some((s) => s.id === activeSpecialtyId)
    ) {
      setActiveSpecialtyId(enabledSpecialties[0].id);
    }
  }, [enabledSpecialties, activeSpecialtyId, specParam]);

  const activeSpecialtyConfig =
    MEDICAL_SPECIALTIES_MAP[activeSpecialtyId] || MEDICAL_SPECIALTIES_MAP.med_general;

  // Personalización de Especialidades (Emojis, Fotos y Nombres)
  const [specialtyCustomizations, setSpecialtyCustomizations] = useState<Record<string, { emoji?: string; photoUrl?: string }>>({});
  const [customizingSpec, setCustomizingSpec] = useState<MedicalSpecialtyConfig | null>(null);
  const [editEmoji, setEditEmoji] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [isSavingCustomization, setIsSavingCustomization] = useState(false);

  useEffect(() => {
    const customs = (currentTenant?.metadata as any)?.specialty_customizations;
    if (customs && typeof customs === 'object') {
      setSpecialtyCustomizations(customs);
    }
  }, [currentTenant]);

  const handleOpenCustomizeSpec = (spec: MedicalSpecialtyConfig) => {
    setCustomizingSpec(spec);
    const existing = specialtyCustomizations[spec.id];
    setEditEmoji(existing?.emoji || spec.emoji || '🩺');
    setEditPhotoUrl(existing?.photoUrl || '');
  };

  const handleSaveSpecialtyCustomization = async () => {
    if (!customizingSpec || !tenantId || !currentTenant) return;
    setIsSavingCustomization(true);
    try {
      const newCustoms = {
        ...specialtyCustomizations,
        [customizingSpec.id]: {
          emoji: editEmoji.trim() || undefined,
          photoUrl: editPhotoUrl.trim() || undefined,
        },
      };
      setSpecialtyCustomizations(newCustoms);

      const updatedMeta = {
        ...((currentTenant.metadata || {}) as Record<string, any>),
        specialty_customizations: newCustoms,
      };

      const res = await updateTenantSettings(
        currentTenant.id,
        currentTenant.name,
        updatedMeta,
        currentTenant.active_modules,
        effectiveActor
      );

      if (res.success) {
        useERPStore.getState().setCurrentTenant({
          ...currentTenant,
          metadata: updatedMeta,
        });
        toast({
          title: 'Especialidad personalizada',
          description: `Emoji / Foto actualizado para ${customizingSpec.name}.`,
          variant: 'success',
        });
        setCustomizingSpec(null);
      } else {
        toast({
          title: 'Error al guardar',
          description: res.error || 'No fue posible guardar la personalización.',
          variant: 'error',
        });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'error' });
    } finally {
      setIsSavingCustomization(false);
    }
  };

  // 2. Estado de Pacientes, Médicos Tratantes y Catálogo de Servicios
  const [isLoading, setIsLoading] = useState(true);
  const [patients, setPatients] = useState<Entity[]>([]);
  const [doctors, setDoctors] = useState<Entity[]>([]);
  const [tenantItems, setTenantItems] = useState<any[]>([]);

  const [selectedPatient, setSelectedPatient] = useState<Entity | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [patientSearch, setPatientSearch] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);

  // Modal de Nuevo Paciente
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientTaxId, setNewPatientTaxId] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientBirthDate, setNewPatientBirthDate] = useState('');
  const [newPatientSex, setNewPatientSex] = useState<'M' | 'F' | 'Otro'>('F');
  const [newPatientBloodType, setNewPatientBloodType] = useState('O+');
  const [newPatientAllergies, setNewPatientAllergies] = useState('');

  // 3. Estado del Expediente Clínico del Paciente Activo
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);
  const [medicalProfile, setMedicalProfile] = useState<ClinicalMedicalProfile>({});
  const [specialtiesState, setSpecialtiesState] = useState<Record<string, any>>({});
  const [clinicalEncounters, setClinicalEncounters] = useState<ClinicalEncounterRecord[]>([]);

  // Edición en vivo del Cintillo de Alertas Médicas (Alergias y Patologías Crónicas)
  const [isEditingAlerts, setIsEditingAlerts] = useState(false);
  const [allergiesDraft, setAllergiesDraft] = useState('');
  const [chronicDraft, setChronicDraft] = useState('');
  const [bloodTypeDraft, setBloodTypeDraft] = useState('O+');

  // 4. Barra de Triaje y Signos Vitales
  const [vitals, setVitals] = useState<ClinicalVitalsInput>({
    systolic: 120,
    diastolic: 80,
    heartRate: 74,
    temperature: 36.6,
    spo2: 98,
    weightKg: 68,
    heightCm: 168,
  });

  const bmiCalc = useMemo(
    () => calculateBMI(vitals.weightKg, vitals.heightCm),
    [vitals.weightKg, vitals.heightCm]
  );
  const mapCalc = useMemo(
    () => calculateMAP(vitals.systolic, vitals.diastolic),
    [vitals.systolic, vitals.diastolic]
  );

  // 5. Evolución SOAP + CIE-10 + Récipe
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [soapSubjective, setSoapSubjective] = useState('');
  const [soapObjective, setSoapObjective] = useState('');
  const [soapAssessment, setSoapAssessment] = useState('');
  const [soapCie10, setSoapCie10] = useState('');
  const [soapPlan, setSoapPlan] = useState('');
  const [cie10Search, setCie10Search] = useState('');

  const [rxMedications, setRxMedications] = useState('');
  const [rxInstructions, setRxInstructions] = useState('');
  const [rxLabOrders, setRxLabOrders] = useState('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // 6. Catálogo de Procedimientos de la Especialidad & Presupuesto de la Sesión
  const [customPricesUSD, setCustomPricesUSD] = useState<Record<string, number>>({});
  const [editingPriceProcId, setEditingPriceProcId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>('');
  const [sessionOrderItems, setSessionOrderItems] = useState<SessionOrderItem[]>([]);
  const [isSavingAndDispatching, setIsSavingAndDispatching] = useState(false);

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === selectedDoctorId) || null,
    [doctors, selectedDoctorId]
  );

  // Carga inicial de pacientes, médicos (entities tipo employee) e inventario de servicios
  const loadInitialStationData = useCallback(async () => {
    if (!tenantId) return;
    try {
      setIsLoading(true);
      const [custRes, empRes, itemsRes] = await Promise.allSettled([
        getEntitiesAction(tenantId, 'customer', 250, effectiveActor),
        getEntitiesAction(tenantId, 'employee', 100, effectiveActor),
        getItemsAction(tenantId, undefined, 200, effectiveActor),
      ]);

      if (
        custRes.status === 'fulfilled' &&
        custRes.value?.success &&
        Array.isArray(custRes.value.entities)
      ) {
        const list = custRes.value.entities;
        setPatients(list);

        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const urlClientId = params.get('client_id') || params.get('client');
          if (urlClientId) {
            const matched = list.find((p) => p.id === urlClientId);
            if (matched) {
              setSelectedPatient(matched);
            }
          } else if (list.length > 0) {
            setSelectedPatient((prev) => prev || list[0]);
          }
        }
      }

      if (
        empRes.status === 'fulfilled' &&
        empRes.value?.success &&
        Array.isArray(empRes.value.entities)
      ) {
        const empList = empRes.value.entities;
        setDoctors(empList);
        if (empList.length > 0) {
          setSelectedDoctorId((prev) => prev || empList[0].id);
        }
      }

      if (
        itemsRes.status === 'fulfilled' &&
        itemsRes.value?.success &&
        Array.isArray(itemsRes.value.items)
      ) {
        setTenantItems(itemsRes.value.items);
      }
    } catch (err) {
      console.error('[ClinicaMultiEspecialidadPage] Error cargando datos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, effectiveActor]);

  useEffect(() => {
    loadInitialStationData();
  }, [loadInitialStationData]);

  // Cargar expediente clínico cuando cambia el paciente seleccionado
  const loadPatientClinicalRecord = useCallback(
    async (patientId: string) => {
      if (!tenantId || !patientId) return;
      try {
        setIsLoadingRecord(true);
        const res = await getClinicalPatientRecordAction(tenantId, patientId, effectiveActor);
        if (res.success) {
          setMedicalProfile(res.medical_profile || {});
          setSpecialtiesState(res.specialties_state || {});
          setClinicalEncounters(res.clinical_encounters || []);

          setAllergiesDraft(res.medical_profile?.allergies || '');
          setChronicDraft(res.medical_profile?.chronicConditions || '');
          setBloodTypeDraft(res.medical_profile?.bloodType || 'O+');

          if (res.vitals_history && res.vitals_history.length > 0) {
            const latest = res.vitals_history[0];
            setVitals({
              systolic: Number(latest.systolicBP ?? 120),
              diastolic: Number(latest.diastolicBP ?? 80),
              heartRate: Number(latest.heartRateBpm ?? 74),
              temperature: Number(latest.temperatureC ?? 36.6),
              spo2: Number(latest.spo2Percent ?? 98),
              weightKg: Number(latest.weightKg ?? 68),
              heightCm: Number(latest.heightCm ?? 168),
            });
          }
        }
      } catch (err) {
        console.error('[loadPatientClinicalRecord] Error:', err);
      } finally {
        setIsLoadingRecord(false);
      }
    },
    [tenantId, effectiveActor]
  );

  useEffect(() => {
    if (selectedPatient?.id) {
      loadPatientClinicalRecord(selectedPatient.id);
    } else {
      setMedicalProfile({});
      setSpecialtiesState({});
      setClinicalEncounters([]);
    }
  }, [selectedPatient?.id, loadPatientClinicalRecord]);

  // Procedimientos de la especialidad activa combinados con precios personalizados
  const specialtyProcedures: MedicalProcedureDefinition[] = useMemo(() => {
    const baseList = mergeTenantMedicalServices(tenantItems, activeSpecialtyId);
    return baseList.map((proc) => ({
      ...proc,
      defaultPriceUSD:
        customPricesUSD[proc.id] !== undefined
          ? customPricesUSD[proc.id]
          : proc.defaultPriceUSD,
    }));
  }, [tenantItems, activeSpecialtyId, customPricesUSD]);

  // Filtrado de pacientes en el buscador
  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients.slice(0, 30);
    return patients
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.tax_id || '').toLowerCase().includes(q) ||
          (p.phone || '').toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [patients, patientSearch]);

  // Filtrado de CIE-10 de la especialidad activa
  const filteredCie10List = useMemo(() => {
    const q = cie10Search.trim().toLowerCase();
    const list = activeSpecialtyConfig.commonCie10 || [];
    if (!q) return list;
    return list.filter(
      (item) =>
        item.code.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );
  }, [activeSpecialtyConfig.commonCie10, cie10Search]);

  // Guardar alertas médicas (Alergias, Patologías Crónicas, Grupo Sanguíneo) en vivo
  const handleSaveMedicalAlerts = async () => {
    if (!selectedPatient) return;
    const updatedProfile: ClinicalMedicalProfile = {
      ...medicalProfile,
      allergies: allergiesDraft,
      chronicConditions: chronicDraft,
      bloodType: bloodTypeDraft,
      updatedAt: new Date().toISOString(),
    };
    setMedicalProfile(updatedProfile);
    setIsEditingAlerts(false);

    const existingMeta = ((selectedPatient as any).metadata || {}) as Record<string, any>;
    const res = await updateEntityAction(
      selectedPatient.id,
      {
        metadata: {
          ...existingMeta,
          medical_profile: updatedProfile,
        },
      },
      tenantId,
      effectiveActor
    );
    if (res.success) {
      toast({
        title: 'Alertas médicas actualizadas',
        description: 'Alergias, grupo sanguíneo y patologías crónicas guardados en la ficha.',
        variant: 'success',
      });
    }
  };

  // Crear paciente nuevo con Fecha de Nacimiento, Sexo, Grupo Sanguíneo y Alergias
  const handleCreateNewPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim()) return;
    try {
      setIsCreatingPatient(true);
      const initialProfile: ClinicalMedicalProfile = {
        birthDate: newPatientBirthDate,
        biologicalSex: newPatientSex,
        bloodType: newPatientBloodType,
        allergies: newPatientAllergies || 'Negadas',
        chronicConditions: 'Sin antecedentes crónicos reportados',
        updatedAt: new Date().toISOString(),
      };

      const res = await createEntityAction(
        {
          type: 'customer',
          name: newPatientName.trim(),
          tax_id: newPatientTaxId.trim() || null,
          phone: newPatientPhone.trim() || null,
          metadata: {
            medical_profile: initialProfile,
            vitals_history: [],
            specialties_state: {},
            clinical_encounters: [],
          },
        },
        tenantId,
        effectiveActor
      );

      if (res.success && res.entity) {
        setPatients((prev) => [res.entity, ...prev]);
        setSelectedPatient(res.entity);
        setIsNewPatientModalOpen(false);
        setNewPatientName('');
        setNewPatientTaxId('');
        setNewPatientPhone('');
        setNewPatientBirthDate('');
        setNewPatientAllergies('');
        toast({
          title: 'Paciente registrado con éxito',
          description: `Historia clínica abierta para ${res.entity.name}.`,
          variant: 'success',
        });
      } else {
        toast({
          title: 'Error al crear paciente',
          description: res.error || 'No fue posible registrar el paciente.',
          variant: 'error',
        });
      }
    } finally {
      setIsCreatingPatient(false);
    }
  };

  // Actualizar estado interactivo de la especialidad activa
  const handleSpecialtyStateChange = (nextSpecState: Record<string, any>) => {
    setSpecialtiesState((prev) => ({
      ...prev,
      [activeSpecialtyId]: nextSpecState,
    }));
  };

  // Agregar dosis calculada desde widget pediátrico al récipe
  const handleAppendPrescriptionFromWidget = (medLine: string, instructionLine: string) => {
    setRxMedications((prev) => (prev ? `${prev}\n${medLine}` : `1. ${medLine}`));
    setRxInstructions((prev) => (prev ? `${prev}\n${instructionLine}` : instructionLine));
    toast({
      title: 'Posología añadida al Récipe',
      description: medLine,
      variant: 'success',
    });
  };

  // Aplicar plantilla rápida de Récipe por especialidad
  const handleApplyPrescriptionTemplate = (tpl: {
    title: string;
    medications: string;
    instructions: string;
    labOrders?: string[];
  }) => {
    setRxMedications(tpl.medications);
    setRxInstructions(tpl.instructions);
    if (tpl.labOrders && tpl.labOrders.length > 0) {
      setRxLabOrders(tpl.labOrders.map((l) => `• ${l}`).join('\n'));
    }
    toast({
      title: 'Plantilla clínica cargada',
      description: tpl.title,
      variant: 'info',
    });
  };

  // Agregar procedimiento del catálogo a la orden de la sesión
  const handleAddProcedureToOrder = (proc: MedicalProcedureDefinition) => {
    setSessionOrderItems((prev) => {
      const existing = prev.find((item) => item.id === proc.id);
      if (existing) {
        return prev.map((item) =>
          item.id === proc.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: proc.id,
          code: proc.code,
          name: proc.name,
          price: proc.defaultPriceUSD,
          quantity: 1,
          sessionsRequired: proc.sessionsRequired,
          stages: proc.stages,
        },
      ];
    });
  };

  const handleRemoveOrderItem = (id: string) => {
    setSessionOrderItems((prev) => prev.filter((item) => item.id !== id));
  };

  const sessionTotalUSD = useMemo(
    () =>
      Number(
        sessionOrderItems
          .reduce((sum, item) => sum + item.price * item.quantity, 0)
          .toFixed(2)
      ),
    [sessionOrderItems]
  );

  // Guardar Consulta (SOAP + Signos Vitales + Especialidad + Récipe) y Enviar Orden a Caja POS
  const handleSaveEncounterAndSendToPOS = async (sendToPos: boolean) => {
    if (!selectedPatient) {
      toast({
        title: 'Seleccione un paciente',
        description: 'Debe seleccionar o crear un paciente antes de guardar la consulta.',
        variant: 'warning',
      });
      return;
    }

    if (sendToPos && sessionOrderItems.length === 0) {
      toast({
        title: 'Orden de procedimientos vacía',
        description: 'Agregue al menos un procedimiento del catálogo de la especialidad para enviar a Caja POS.',
        variant: 'warning',
      });
      return;
    }

    try {
      setIsSavingAndDispatching(true);
      const doctorNameUsed = selectedDoctor?.name || effectiveActor.email;

      const saveRes = await saveClinicalEncounterAction(
        tenantId,
        {
          patientId: selectedPatient.id,
          specialtyId: activeSpecialtyId,
          doctorId: selectedDoctor?.id,
          doctorName: doctorNameUsed,
          vitals: {
            weightKg: vitals.weightKg,
            heightCm: vitals.heightCm,
            bmi: bmiCalc.bmi,
            systolicBP: vitals.systolic,
            diastolicBP: vitals.diastolic,
            map: mapCalc.map,
            heartRateBpm: vitals.heartRate,
            temperatureC: vitals.temperature,
            spo2Percent: vitals.spo2,
          },
          medicalProfileUpdates: {
            allergies: allergiesDraft || medicalProfile.allergies,
            chronicConditions: chronicDraft || medicalProfile.chronicConditions,
            bloodType: bloodTypeDraft || medicalProfile.bloodType,
          },
          specialtyStateUpdates: specialtiesState[activeSpecialtyId] || {},
          chiefComplaint:
            chiefComplaint.trim() ||
            `Consulta de ${activeSpecialtyConfig.name}`,
          soap: {
            subjective: soapSubjective,
            objective: soapObjective,
            assessment: soapAssessment,
            cie10Code: soapCie10,
            plan: soapPlan,
          },
          prescription: {
            medications: rxMedications,
            instructions: rxInstructions,
            labOrders: rxLabOrders,
          },
          selectedProcedures: sessionOrderItems.map((item) => ({
            id: item.id,
            code: item.code,
            name: item.name,
            price: item.price,
            sessionsRequired: item.sessionsRequired,
            stages: item.stages,
          })),
        },
        effectiveActor
      );

      if (!saveRes.success) {
        toast({
          title: 'Error al guardar la historia clínica',
          description: saveRes.error || 'No se pudo registrar el encuentro.',
          variant: 'error',
        });
        return;
      }

      if (saveRes.clinical_encounters) {
        setClinicalEncounters(saveRes.clinical_encounters);
      }

      if (sendToPos && sessionOrderItems.length > 0) {
        const posRes = await dispatchClinicalOrderToPOSAction(
          tenantId,
          {
            patientId: selectedPatient.id,
            patientName: selectedPatient.name,
            specialtyId: activeSpecialtyId,
            specialtyName: activeSpecialtyConfig.name,
            doctorId: selectedDoctor?.id,
            doctorName: doctorNameUsed,
            items: sessionOrderItems,
            notes: `${soapCie10 ? `[${soapCie10}] ` : ''}${soapAssessment || chiefComplaint}`,
          },
          effectiveActor
        );

        if (posRes.success) {
          toast({
            title: 'Consulta guardada y Orden enviada a Caja POS',
            description: `Orden ${posRes.documentNumber} por $${posRes.totalAmount?.toFixed(2)} lista en Caja y Kanban.`,
            variant: 'success',
          });
          setSessionOrderItems([]);
        } else {
          toast({
            title: 'Consulta guardada, pero falló el envío a Caja',
            description: posRes.error || 'Verifique los ítems seleccionados.',
            variant: 'warning',
          });
        }
      } else {
        toast({
          title: 'Evolución clínica guardada',
          description: 'El encuentro médico se anexó al historial cronológico del paciente.',
          variant: 'success',
        });
      }
    } finally {
      setIsSavingAndDispatching(false);
    }
  };

  const patientAgeDisplay = useMemo(() => {
    if (!medicalProfile.birthDate) return '';
    return calculateExactPediatricAge(medicalProfile.birthDate).formatted;
  }, [medicalProfile.birthDate]);

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)] p-3 sm:p-6 space-y-5">
      {/* CABECERA PRINCIPAL + SELECTOR DE PACIENTE Y MÉDICO TRATANTE */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
              style={{ backgroundColor: activeSpecialtyConfig.color }}
            >
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-[var(--text-primary)]">
                  Clínica Médica Multi-Especialidad
                </h1>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${activeSpecialtyConfig.badgeBg}`}>
                  {activeSpecialtyConfig.shortName}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {activeSpecialtyConfig.description}
              </p>
            </div>
          </div>

          {/* Selector de Paciente y Médico Tratante */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Selector de Paciente */}
            <div className="relative min-w-[240px] flex-1 sm:flex-initial">
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={
                      isPatientDropdownOpen
                        ? patientSearch
                        : selectedPatient
                        ? `${selectedPatient.name}${selectedPatient.tax_id ? ` (${selectedPatient.tax_id})` : ''}`
                        : patientSearch
                    }
                    onFocus={() => {
                      setIsPatientDropdownOpen(true);
                      setPatientSearch('');
                    }}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setIsPatientDropdownOpen(true);
                    }}
                    placeholder="Buscar paciente por nombre o cédula..."
                    className="w-full pl-8 pr-3 py-2 text-xs font-semibold bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-sky-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewPatientModalOpen(true)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition-all shrink-0"
                  title="Crear Paciente Nuevo"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Nuevo Paciente</span>
                </button>
              </div>

              {isPatientDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-xl z-30 divide-y divide-[var(--border-color)]">
                  {filteredPatients.length === 0 ? (
                    <div className="p-3 text-xs text-[var(--text-secondary)] text-center">
                      No se encontraron pacientes. Usa &ldquo;Nuevo Paciente&rdquo;.
                    </div>
                  ) : (
                    filteredPatients.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatient(p);
                          setIsPatientDropdownOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-[var(--bg-secondary)] transition-colors flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-[var(--text-primary)]">{p.name}</div>
                          <div className="text-[10px] text-[var(--text-secondary)]">
                            {p.tax_id || 'Sin Doc'} · {p.phone || 'Sin Teléfono'}
                          </div>
                        </div>
                        {selectedPatient?.id === p.id && (
                          <Check className="w-4 h-4 text-emerald-500" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Selector de Médico Tratante */}
            <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-1.5">
              <UserCheck className="w-4 h-4 text-sky-500 shrink-0" />
              <div>
                <div className="text-[10px] text-[var(--text-secondary)] leading-none">
                  Médico Tratante
                </div>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="text-xs font-bold bg-transparent text-[var(--text-primary)] focus:outline-none"
                >
                  {doctors.length === 0 ? (
                    <option value="">Dr(a). {effectiveActor.email}</option>
                  ) : (
                    doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        Dr(a). {doc.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* PESTAÑAS DE ESPECIALIDADES MÉDICAS (FILTRADAS POR SUB-MÓDULOS ACTIVOS EN RENDO HUB) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-[var(--border-color)]">
          {enabledSpecialties.map((spec) => {
            const IconComp = SPECIALTY_ICON_MAP[spec.id] || Stethoscope;
            const isActive = activeSpecialtyId === spec.id;
            const custom = specialtyCustomizations[spec.id];
            const customPhoto = custom?.photoUrl;
            const customEmoji = custom?.emoji || spec.emoji;

            return (
              <div
                key={spec.id}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border cursor-pointer select-none ${
                  isActive
                    ? 'text-white shadow-sm border-transparent'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
                }`}
                style={isActive ? { backgroundColor: spec.color } : undefined}
                onClick={() => setActiveSpecialtyId(spec.id)}
              >
                {customPhoto ? (
                  <img
                    src={customPhoto}
                    alt={spec.shortName}
                    className="w-4 h-4 rounded-full object-cover shrink-0 border border-white/40"
                  />
                ) : customEmoji ? (
                  <span className="text-sm leading-none shrink-0">{customEmoji}</span>
                ) : (
                  <IconComp className="w-4 h-4 shrink-0" />
                )}
                <span>{spec.shortName}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCustomizeSpec(spec);
                  }}
                  title={`Editar emoji o foto para ${spec.name}`}
                  className={`p-1 rounded-md transition-colors ${
                    isActive
                      ? 'hover:bg-white/20 text-white/80 hover:text-white'
                      : 'hover:bg-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => handleOpenCustomizeSpec(activeSpecialtyConfig)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border border-dashed border-[var(--border-color)] hover:border-sky-500 text-[var(--text-secondary)] hover:text-sky-500 ml-auto"
            title="Personalizar Emoji o Foto de la Especialidad"
          >
            <Smile className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Personalizar</span>
          </button>
        </div>
      </div>

      {/* CINTILLO DE ALERTAS MÉDICAS (ALERGIAS Y PATOLOGÍAS CRÓNICAS) + BARRA DE TRIAJE Y SIGNOS VITALES */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Cintillo de Alertas Médicas Editable en Vivo */}
        <div className="xl:col-span-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Cintillo de Alertas Médicas & Alergias
                </h3>
                {selectedPatient && (
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {selectedPatient.name}
                    {patientAgeDisplay ? ` · ${patientAgeDisplay}` : ''}
                  </p>
                )}
              </div>
            </div>

            {!isEditingAlerts ? (
              <button
                type="button"
                onClick={() => setIsEditingAlerts(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 text-xs font-bold transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Editar
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleSaveMedicalAlerts}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                >
                  <Check className="w-3.5 h-3.5" />
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingAlerts(false)}
                  className="p-1 rounded-lg text-[var(--text-secondary)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {!isEditingAlerts ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] p-2">
                <span className="block text-[10px] text-[var(--text-secondary)]">
                  Grupo Sanguíneo
                </span>
                <span className="font-black text-rose-600">
                  {medicalProfile.bloodType || 'O+'}
                </span>
              </div>
              <div className="rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] p-2">
                <span className="block text-[10px] text-[var(--text-secondary)]">
                  Alergias Medicamentosas
                </span>
                <span className="font-bold text-[var(--text-primary)]">
                  {medicalProfile.allergies || 'Negadas'}
                </span>
              </div>
              <div className="rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] p-2">
                <span className="block text-[10px] text-[var(--text-secondary)]">
                  Patologías Crónicas
                </span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {medicalProfile.chronicConditions || 'Sin antecedentes'}
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">
                  Grupo ABO/Rh
                </label>
                <select
                  value={bloodTypeDraft}
                  onChange={(e) => setBloodTypeDraft(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 font-bold"
                >
                  {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bt) => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">
                  Alergias
                </label>
                <input
                  type="text"
                  value={allergiesDraft}
                  onChange={(e) => setAllergiesDraft(e.target.value)}
                  placeholder="Ej: Penicilina, AINEs"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">
                  Patologías Crónicas
                </label>
                <input
                  type="text"
                  value={chronicDraft}
                  onChange={(e) => setChronicDraft(e.target.value)}
                  placeholder="Ej: HTA, Asma, DM2"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-2 py-1.5"
                />
              </div>
            </div>
          )}
        </div>

        {/* Barra de Triaje y Signos Vitales */}
        <div className="xl:col-span-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
                Barra de Triaje & Signos Vitales en Tiempo Real
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-[var(--text-secondary)]">
                PAM: <strong>{mapCalc.map} mmHg</strong> ({mapCalc.ahaStage})
              </span>
              <span
                className="font-bold px-2 py-0.5 rounded-full text-[11px]"
                style={{
                  backgroundColor: `${bmiCalc.color}20`,
                  color: bmiCalc.color,
                }}
              >
                IMC: {bmiCalc.bmi > 0 ? `${bmiCalc.bmi} (${bmiCalc.category})` : '--'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-secondary)]">
                PA Sistólica (mmHg)
              </label>
              <input
                type="number"
                value={vitals.systolic}
                onChange={(e) =>
                  setVitals((v) => ({ ...v, systolic: Number(e.target.value) }))
                }
                className="mt-0.5 w-full text-xs font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-secondary)]">
                PA Diastólica (mmHg)
              </label>
              <input
                type="number"
                value={vitals.diastolic}
                onChange={(e) =>
                  setVitals((v) => ({ ...v, diastolic: Number(e.target.value) }))
                }
                className="mt-0.5 w-full text-xs font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-secondary)]">
                FC (lpm)
              </label>
              <input
                type="number"
                value={vitals.heartRate}
                onChange={(e) =>
                  setVitals((v) => ({ ...v, heartRate: Number(e.target.value) }))
                }
                className="mt-0.5 w-full text-xs font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-secondary)]">
                Temp (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={vitals.temperature}
                onChange={(e) =>
                  setVitals((v) => ({ ...v, temperature: Number(e.target.value) }))
                }
                className="mt-0.5 w-full text-xs font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-secondary)]">
                SpO₂ (%)
              </label>
              <input
                type="number"
                value={vitals.spo2}
                onChange={(e) =>
                  setVitals((v) => ({ ...v, spo2: Number(e.target.value) }))
                }
                className="mt-0.5 w-full text-xs font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-secondary)]">
                Peso (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={vitals.weightKg}
                onChange={(e) =>
                  setVitals((v) => ({ ...v, weightKg: Number(e.target.value) }))
                }
                className="mt-0.5 w-full text-xs font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-secondary)]">
                Talla (cm)
              </label>
              <input
                type="number"
                value={vitals.heightCm}
                onChange={(e) =>
                  setVitals((v) => ({ ...v, heightCm: Number(e.target.value) }))
                }
                className="mt-0.5 w-full text-xs font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3 ÁREAS DE TRABAJO CLÍNICO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* COLUMNA IZQUIERDA/CENTRAL (7 cols): ÁREA 1 (SpecialtyWidgets) + ÁREA 2 (Evolución SOAP, CIE-10 y Récipe) */}
        <div className="lg:col-span-7 space-y-5">
          {/* ÁREA 1: HERRAMIENTA DE ESPECIALIDAD ACTIVA */}
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-color)]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-500">
                  1. Estación Clínica de Especialidad
                </span>
                <h2 className="text-base font-black text-[var(--text-primary)]">
                  {activeSpecialtyConfig.name}
                </h2>
              </div>
              {isLoadingRecord && (
                <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sincronizando ficha...
                </span>
              )}
            </div>

            <SpecialtyWidgets
              specialtyId={activeSpecialtyId}
              specialtyState={specialtiesState[activeSpecialtyId] || {}}
              onChangeSpecialtyState={handleSpecialtyStateChange}
              vitals={vitals}
              patientBirthDate={medicalProfile.birthDate}
              onAppendPrescription={handleAppendPrescriptionFromWidget}
            />
          </div>

          {/* ÁREA 2: EVOLUCIÓN SOAP + BUSCADOR CIE-10 + GENERADOR DE RÉCIPE */}
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border-color)]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500">
                  2. Registro Médico Estructurado
                </span>
                <h2 className="text-base font-black text-[var(--text-primary)]">
                  Evolución Clínica SOAP, Diagnóstico CIE-10 & Récipe Digital
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition-all"
              >
                <Printer className="w-4 h-4" />
                Previsualizar / Imprimir Récipe
              </button>
            </div>

            {/* Motivo de Consulta + Selector CIE-10 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Motivo de Consulta (MC)
                </label>
                <input
                  type="text"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder={`Ej: Control o síntoma principal en ${activeSpecialtyConfig.shortName}...`}
                  className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Buscador Rápido CIE-10 ({activeSpecialtyConfig.shortName})
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={cie10Search}
                    onChange={(e) => setCie10Search(e.target.value)}
                    placeholder="Filtrar código o patología..."
                    className="w-1/3 text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-2.5 py-2 text-[var(--text-primary)]"
                  />
                  <select
                    value={soapCie10}
                    onChange={(e) => {
                      const code = e.target.value;
                      setSoapCie10(code);
                      const found = activeSpecialtyConfig.commonCie10.find(
                        (c) => c.code === code
                      );
                      if (found && !soapAssessment) {
                        setSoapAssessment(`${found.code} — ${found.description}`);
                      }
                    }}
                    className="flex-1 text-xs font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-2.5 py-2 text-[var(--text-primary)]"
                  >
                    <option value="">Seleccionar código CIE-10...</option>
                    {filteredCie10List.map((c) => (
                      <option key={c.code} value={c.code}>
                        [{c.code}] {c.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Campos SOAP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  S — Subjetivo (Anamnesis y Enfermedad Actual)
                </label>
                <textarea
                  rows={2}
                  value={soapSubjective}
                  onChange={(e) => setSoapSubjective(e.target.value)}
                  placeholder="Inicio, evolución y características clínicas referidas por el paciente..."
                  className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-2.5 text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  O — Objetivo (Hallazgos al Examen Físico / Paraclínicos)
                </label>
                <textarea
                  rows={2}
                  value={soapObjective}
                  onChange={(e) => setSoapObjective(e.target.value)}
                  placeholder="Hallazgos positivos al examen físico segmentario..."
                  className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-2.5 text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  A — Análisis / Impresión Diagnóstica
                </label>
                <textarea
                  rows={2}
                  value={soapAssessment}
                  onChange={(e) => setSoapAssessment(e.target.value)}
                  placeholder="Diagnóstico definitivo o presuntivo..."
                  className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-2.5 text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  P — Plan de Estudio y Conducta Terapéutica
                </label>
                <textarea
                  rows={2}
                  value={soapPlan}
                  onChange={(e) => setSoapPlan(e.target.value)}
                  placeholder="Conducta médica, interconsultas y pauta de reevaluación..."
                  className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-2.5 text-[var(--text-primary)]"
                />
              </div>
            </div>

            {/* Generador de Récipe con Plantillas Rápidas por Especialidad */}
            <div className="pt-3 border-t border-[var(--border-color)] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-sky-500" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Plantillas Rápidas de Récipe ({activeSpecialtyConfig.shortName}):
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeSpecialtyConfig.prescriptionTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleApplyPrescriptionTemplate(tpl)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 border border-sky-500/20 transition-colors"
                    >
                      + {tpl.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Rp. / Medicamentos (Columna Izquierda del Récipe)
                  </label>
                  <textarea
                    rows={4}
                    value={rxMedications}
                    onChange={(e) => setRxMedications(e.target.value)}
                    placeholder="1. Nombre genérico / comercial, concentración, presentación y cantidad..."
                    className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-2.5 text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Indicaciones y Posología (Columna Derecha del Récipe)
                  </label>
                  <textarea
                    rows={4}
                    value={rxInstructions}
                    onChange={(e) => setRxInstructions(e.target.value)}
                    placeholder="• Dosis exacta, horario, duración del tratamiento y signos de alarma..."
                    className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-2.5 text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  <FlaskConical className="w-3.5 h-3.5 inline mr-1 text-indigo-500" />
                  Órdenes de Laboratorio e Imágenes Diagnósticas
                </label>
                <textarea
                  rows={2}
                  value={rxLabOrders}
                  onChange={(e) => setRxLabOrders(e.target.value)}
                  placeholder="Perfiles hematológicos, bioquímicos, ecografías, radiografías o estudios especiales..."
                  className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-2.5 text-[var(--text-primary)]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA (5 cols): ÁREA 3 (Catálogo de Procedimientos, Presupuesto POS e Historial Cronológico) */}
        <div className="lg:col-span-5 space-y-5">
          {/* ÁREA 3: CATÁLOGO DE PROCEDIMIENTOS DE LA ESPECIALIDAD & PRESUPUESTO DE LA SESIÓN */}
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                  3. Arancel Clínico & Despacho POS
                </span>
                <h2 className="text-base font-black text-[var(--text-primary)]">
                  Procedimientos de {activeSpecialtyConfig.shortName}
                </h2>
              </div>
              <span className="text-xs font-bold text-[var(--text-secondary)]">
                {specialtyProcedures.length} actos médicos
              </span>
            </div>

            {/* Lista de procedimientos de specialtyRegistry.ts con edición rápida de precio USD */}
            <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1">
              {specialtyProcedures.map((proc) => {
                const isEditingPrice = editingPriceProcId === proc.id;
                return (
                  <div
                    key={proc.id}
                    className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-3 hover:border-sky-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[10px] font-black px-2 py-0.5 rounded text-white"
                            style={{ backgroundColor: proc.color }}
                          >
                            {proc.code}
                          </span>
                          <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                            {proc.categoryLabel} · {proc.sessionsRequired} sesión(es)
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-[var(--text-primary)]">
                          {proc.name}
                        </h4>
                      </div>

                      {/* Precio en USD editable rápidamente */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isEditingPrice ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="1"
                              value={editingPriceValue}
                              onChange={(e) => setEditingPriceValue(e.target.value)}
                              className="w-16 text-xs font-bold bg-[var(--bg-primary)] border border-sky-500 rounded px-1.5 py-0.5 text-[var(--text-primary)]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const parsed = Number(editingPriceValue);
                                if (parsed >= 0) {
                                  setCustomPricesUSD((prev) => ({
                                    ...prev,
                                    [proc.id]: parsed,
                                  }));
                                }
                                setEditingPriceProcId(null);
                              }}
                              className="p-1 rounded bg-emerald-600 text-white"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPriceProcId(proc.id);
                              setEditingPriceValue(String(proc.defaultPriceUSD));
                            }}
                            className="text-xs font-black text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg hover:bg-emerald-500/20"
                            title="Clic para editar precio en USD"
                          >
                            ${proc.defaultPriceUSD.toFixed(2)}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleAddProcedureToOrder(proc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Agregar
                        </button>
                      </div>
                    </div>

                    {/* Etapas clínicas del procedimiento */}
                    {proc.stages && proc.stages.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[var(--border-color)]/60 space-y-1">
                        {proc.stages.map((stg) => (
                          <div
                            key={stg.id}
                            className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5"
                          >
                            <Layers className="w-3 h-3 text-sky-500 shrink-0" />
                            <span>
                              <strong>Etapa {stg.order}:</strong> {stg.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Presupuesto de la Sesión Actual + Botón Guardar Consulta y Enviar Orden a Caja POS */}
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
                  Orden de la Sesión ({sessionOrderItems.length} ítem/s)
                </span>
                <div className="text-right">
                  <div className="text-base font-black text-emerald-600">
                    Total: ${sessionTotalUSD.toFixed(2)} USD
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)]">
                    Bs. {(sessionTotalUSD * currentExchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {sessionOrderItems.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {sessionOrderItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5"
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold text-sky-600">[{item.code}]</span>{' '}
                        <span className="font-semibold text-[var(--text-primary)]">
                          {item.name}
                        </span>{' '}
                        <span className="text-[var(--text-secondary)]">x{item.quantity}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-emerald-600">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOrderItem(item.id)}
                          className="text-rose-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={isSavingAndDispatching}
                  onClick={() => handleSaveEncounterAndSendToPOS(false)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-xs font-bold text-[var(--text-primary)] transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-sky-500" />
                  Solo Guardar Consulta
                </button>
                <button
                  type="button"
                  disabled={isSavingAndDispatching}
                  onClick={() => handleSaveEncounterAndSendToPOS(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md transition-all disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" />
                  Guardar Consulta y Enviar Orden a Caja POS
                </button>
              </div>
            </div>
          </div>

          {/* HISTORIAL CRONOLÓGICO DE CONSULTAS ANTERIORES DEL PACIENTE */}
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-500" />
                <h3 className="text-sm font-black text-[var(--text-primary)]">
                  Historial Cronológico de Consultas Anteriores
                </h3>
              </div>
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                {clinicalEncounters.length} registro(s)
              </span>
            </div>

            {clinicalEncounters.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
                Este paciente aún no registra encuentros médicos previos en su historia clínica.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {clinicalEncounters.map((enc) => {
                  const specInfo =
                    MEDICAL_SPECIALTIES_MAP[enc.specialtyId as MedicalSpecialtyId] ||
                    MEDICAL_SPECIALTIES_MAP.med_general;
                  return (
                    <div
                      key={enc.id}
                      className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/40 p-3 space-y-1.5 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${specInfo.badgeBg}`}
                        >
                          {specInfo.shortName}
                        </span>
                        <span className="text-[11px] text-[var(--text-secondary)]">
                          {new Date(enc.createdAt).toLocaleString('es-VE', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                      <div className="font-bold text-[var(--text-primary)]">
                        {enc.chiefComplaint}
                      </div>
                      {enc.soap?.assessment && (
                        <div className="text-[11px] text-emerald-600 font-semibold">
                          Dx: {enc.soap.cie10Code ? `[${enc.soap.cie10Code}] ` : ''}
                          {enc.soap.assessment}
                        </div>
                      )}
                      {enc.soap?.plan && (
                        <div className="text-[11px] text-[var(--text-secondary)]">
                          Plan: {enc.soap.plan}
                        </div>
                      )}
                      <div className="text-[10px] text-[var(--text-secondary)] pt-1 border-t border-[var(--border-color)]/50 flex items-center justify-between">
                        <span>Dr(a). {enc.doctorName}</span>
                        {enc.vitals?.systolicBP && (
                          <span>
                            PA: {enc.vitals.systolicBP}/{enc.vitals.diastolicBP} mmHg · Peso:{' '}
                            {enc.vitals.weightKg} kg
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL PARA CREAR PACIENTE NUEVO */}
      {isNewPatientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-base font-black text-[var(--text-primary)]">
                Apertura de Nueva Historia Clínica
              </h3>
              <button
                type="button"
                onClick={() => setIsNewPatientModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewPatient} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[var(--text-secondary)] mb-1">
                  Nombre y Apellido del Paciente *
                </label>
                <input
                  type="text"
                  required
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  placeholder="Ej: María Fernanda Gómez"
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[var(--text-secondary)] mb-1">
                    Cédula / Documento de Identidad
                  </label>
                  <input
                    type="text"
                    value={newPatientTaxId}
                    onChange={(e) => setNewPatientTaxId(e.target.value)}
                    placeholder="V-18.234.567"
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[var(--text-secondary)] mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={newPatientPhone}
                    onChange={(e) => setNewPatientPhone(e.target.value)}
                    placeholder="+58 414-0000000"
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[var(--text-secondary)] mb-1">
                    Fecha de Nacimiento
                  </label>
                  <input
                    type="date"
                    value={newPatientBirthDate}
                    onChange={(e) => setNewPatientBirthDate(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[var(--text-secondary)] mb-1">
                    Sexo Biológico
                  </label>
                  <select
                    value={newPatientSex}
                    onChange={(e) => setNewPatientSex(e.target.value as any)}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)]"
                  >
                    <option value="F">Femenino (F)</option>
                    <option value="M">Masculino (M)</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[var(--text-secondary)] mb-1">
                    Grupo Sanguíneo
                  </label>
                  <select
                    value={newPatientBloodType}
                    onChange={(e) => setNewPatientBloodType(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)]"
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[var(--text-secondary)] mb-1">
                  Alergias Medicamentosas o Alimentarias
                </label>
                <input
                  type="text"
                  value={newPatientAllergies}
                  onChange={(e) => setNewPatientAllergies(e.target.value)}
                  placeholder="Ej: Penicilina, Sulfas, AINEs o Negadas"
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setIsNewPatientModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPatient}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-sm disabled:opacity-50"
                >
                  {isCreatingPatient ? 'Creando Ficha...' : 'Crear Paciente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE PERSONALIZACIÓN DE ESPECIALIDAD (EMOJI Y FOTO) */}
      {customizingSpec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm overflow-hidden"
                  style={{ backgroundColor: `${customizingSpec.color}20`, color: customizingSpec.color }}
                >
                  {editPhotoUrl ? (
                    <img
                      src={editPhotoUrl}
                      alt={customizingSpec.name}
                      className="w-full h-full rounded-xl object-cover"
                    />
                  ) : (
                    <span>{editEmoji || customizingSpec.emoji || '🩺'}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-[var(--text-primary)]">
                    Personalizar Especialidad
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {customizingSpec.name} ({customizingSpec.shortName})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomizingSpec(null)}
                className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector rápido de emojis médicos */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
                Seleccionar Emoji Rápido
              </label>
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                {['🩺', '👶', '🌸', '✨', '🦴', '👁️', '🔬', '💉', '💊', '🧠', '❤️', '🦷', '🧬', '🏥', '⚕️', '🩹', '🧪', '🚑', '🤰', '🤍'].map((emo) => (
                  <button
                    key={emo}
                    type="button"
                    onClick={() => setEditEmoji(emo)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-base hover:scale-110 transition-transform ${
                      editEmoji === emo
                        ? 'bg-sky-500/20 border border-sky-500 shadow-sm'
                        : 'hover:bg-[var(--bg-primary)]'
                    }`}
                  >
                    {emo}
                  </button>
                ))}
              </div>
            </div>

            {/* Input de Emoji Libre */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                Emoji Personalizado o Carácter
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editEmoji}
                  onChange={(e) => setEditEmoji(e.target.value)}
                  placeholder="Ej: 🩺, 🌟"
                  maxLength={4}
                  className="w-20 text-center text-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-sky-500"
                />
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Puedes escribir o pegar cualquier emoji desde tu teclado.
                </p>
              </div>
            </div>

            {/* Input de URL de Imagen/Foto */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                URL de Foto o Ícono (Opcional)
              </label>
              <div className="relative">
                <ImageIcon className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-3" />
                <input
                  type="url"
                  value={editPhotoUrl}
                  onChange={(e) => setEditPhotoUrl(e.target.value)}
                  placeholder="https://ejemplo.com/icono-especialidad.png"
                  className="w-full pl-9 pr-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-sky-500"
                />
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                Si especificas una URL de imagen válida, reemplazará al emoji en la barra de pestañas.
              </p>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => {
                  setEditEmoji(customizingSpec.emoji || '🩺');
                  setEditPhotoUrl('');
                }}
                className="text-xs text-[var(--text-secondary)] hover:text-rose-500 font-bold transition-colors"
              >
                Restablecer por Defecto
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomizingSpec(null)}
                  className="px-3.5 py-2 rounded-xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveSpecialtyCustomization}
                  disabled={isSavingCustomization}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingCustomization ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMPRESIÓN Y WHATSAPP DE RÉCIPE DE 2 COLUMNAS */}
      <PrescriptionPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        clinicName={currentTenant?.name || 'Clínica Médica Rendo Salud'}
        specialtyId={activeSpecialtyId}
        doctorName={selectedDoctor?.name || effectiveActor.email}
        patientName={selectedPatient?.name || 'Paciente Ambulatorio'}
        patientTaxId={selectedPatient?.tax_id || undefined}
        patientPhone={selectedPatient?.phone || undefined}
        patientAgeText={patientAgeDisplay}
        cie10Code={soapCie10}
        diagnosisText={soapAssessment}
        medications={rxMedications}
        instructions={rxInstructions}
        labOrders={rxLabOrders}
        specialtyState={specialtiesState[activeSpecialtyId] || {}}
      />
    </div>
  );
}
