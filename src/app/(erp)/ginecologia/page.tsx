'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Baby, 
  Search, 
  UserPlus, 
  Save, 
  Send, 
  Printer, 
  FileText, 
  Activity, 
  Calendar, 
  Stethoscope, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Trash2, 
  Plus, 
  Minus, 
  Heart, 
  Layers, 
  ChevronRight, 
  Sparkles, 
  Shield, 
  HelpCircle, 
  FolderOpen, 
  X, 
  BookOpen,
  Microscope,
  FlaskConical,
  Scissors,
  User,
  Users,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  Phone,
  QrCode,
  Share2,
  Download,
  ChevronDown,
  ChevronUp,
  Eye
} from 'lucide-react';
import { useERPStore } from '@/store/useERPStore';
import { useActionActor } from '@/hooks/useActionActor';
import { useToast } from '@/components/core/ToastProvider';
import { useViewModeStore } from '@/store/useViewModeStore';
import { getEntitiesAction, createEntityAction, updateEntityAction } from '@/app/actions/entities';
import { getItemsAction } from '@/app/actions/items';
import { getAppointmentsAction } from '@/app/actions/appointments';
import { 
  getGinecoPatientRecordAction, 
  saveGinecoEncounterAction, 
  sendGinecoOrderToCashierAction, 
  getPatientGinecoWorkOrdersAction, 
  updateGinecoWorkOrderStepAction,
  saveGinecoUltrasoundReportAction,
  saveGinecoExamsRecordAction,
  saveGinecoLabRecordAction,
  saveGinecoSurgeryRecordAction,
  GinecoObstetricProfile,
  PatientGinecoWorkOrder
} from '@/app/actions/ginecologia';
import { 
  GINECO_PROCEDURES_MASTER, 
  GINECO_CIE10_CATALOG, 
  GINECO_PRESCRIPTION_TEMPLATES, 
  mergeTenantGinecoServices,
  GinecoProcedureDefinition,
  BLOOD_TYPES,
  ALLERGY_PRESETS,
  MEDICATION_PRESETS,
  SURGERY_PRESETS,
  FAMILY_ANTECEDENT_PRESETS,
  MENSTRUAL_RHYTHM_PRESETS,
  CONTRACEPTIVE_PRESETS,
  CESAREAN_REASON_PRESETS,
  ABORTION_TYPE_PRESETS,
  ABORTION_RESOLUTION_PRESETS,
  BETHESDA_PRESETS,
} from '@/lib/ginecologia/proceduresCatalog';
import { VENEZUELA_STATES, getCitiesForState } from '@/lib/medical/venezuelaGeo';
import { GestationalWheelWidget } from '@/components/ginecologia/GestationalWheelWidget';
import { GinecoPrescriptionPrintModal } from '@/components/ginecologia/GinecoPrescriptionPrintModal';
import { GinecoClinicalGuideModal } from '@/components/ginecologia/GinecoClinicalGuideModal';
import { UltrasoundGinecoModal, GinecoUltrasoundReport } from '@/components/ginecologia/UltrasoundGinecoModal';
import { UltrasoundObstetricModal, ObstetricUltrasoundReport } from '@/components/ginecologia/UltrasoundObstetricModal';
import { GinecoExamsModal, GinecoExamsData } from '@/components/ginecologia/GinecoExamsModal';
import { GinecoLabPanelModal, GinecoLabRecord } from '@/components/ginecologia/GinecoLabPanelModal';
import { GinecoSurgeriesModal, SurgicalInterventionRecord } from '@/components/ginecologia/GinecoSurgeriesModal';
import { GinecoDocumentsModal } from '@/components/ginecologia/GinecoDocumentsModal';
import { GinecoEncounterDetailModal } from '@/components/ginecologia/GinecoEncounterDetailModal';
import { calculateBMI } from '@/lib/medical/clinicalCalculators';

export interface ObstetricDeliveryItem {
  id: string;
  gestationNumber: number;
  deliveryType: 'Parto Vaginal' | 'Parto Distócico' | 'Cesárea' | 'Aborto' | 'Ectópico';
  year?: string;
  sex?: 'Varón' | 'Hembra' | 'No especificado';
  weightGrams?: number;
  indicationOrNotes?: string;
}

type PatientChartTab = 'paciente' | 'conyugue' | 'antecedentes_fp' | 'ant_gin' | 'ant_obs';

export default function GinecologiaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTenant, session } = useERPStore();
  const { viewMode, toggleViewMode } = useViewModeStore();
  const tenantMeta = (currentTenant?.metadata as Record<string, any>) || {};
  const exchangeRate = Number(tenantMeta.exchange_rate?.rate || tenantMeta.exchange_rate || 850.0);
  const actor = useActionActor();
  const { toast } = useToast();

  // Guía y modales de gabinetes Himego
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isEcoGinecoOpen, setIsEcoGinecoOpen] = useState(false);
  const [isEcoObsOpen, setIsEcoObsOpen] = useState(false);
  const [isExamsOpen, setIsExamsOpen] = useState(false);
  const [isLabPanelOpen, setIsLabPanelOpen] = useState(false);
  const [isSurgeriesOpen, setIsSurgeriesOpen] = useState(false);
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Pacientes, Citas y Médicos
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);

  // Estado del Centro de Mando
  const [isConsulting, setIsConsulting] = useState(false);
  const [isChartExpanded, setIsChartExpanded] = useState(true);
  const [patientChartTab, setPatientChartTab] = useState<PatientChartTab>('paciente');

  // Detalle de consulta previa en historial
  const [selectedHistoryEncounter, setSelectedHistoryEncounter] = useState<any>(null);
  const [isHistoryDetailOpen, setIsHistoryDetailOpen] = useState(false);

  // Modal para nueva paciente rápida
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientTaxId, setNewPatientTaxId] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientBirthDate, setNewPatientBirthDate] = useState('');
  const [newPatientAllergies, setNewPatientAllergies] = useState('');
  const [newPatientBloodType, setNewPatientBloodType] = useState('O+');
  const [newPatientState, setNewPatientState] = useState('Distrito Capital');
  const [newPatientCity, setNewPatientCity] = useState('Caracas');
  const [isSubmittingPatient, setIsSubmittingPatient] = useState(false);

  // Búsqueda interactiva
  const [patientSearchQuery, setPatientSearchQuery] = useState('');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FICHA BIOLÓGICA PERMANENTE (HIMEGO V9+ 5 PESTAÑAS)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const [demographics, setDemographics] = useState({
    address: '',
    city: 'Caracas',
    state: 'Distrito Capital',
    phoneHome: '',
    phoneCell: '',
    email: '',
    civilStatus: 'Casada',
    occupation: 'Profesional',
    education: 'Universitario',
    referredBy: 'Iniciativa propia',
    birthPlace: '',
    bloodTypeRh: 'O+',
  });
  const [isCustomCity, setIsCustomCity] = useState(false);

  const [spouseData, setSpouseData] = useState({
    name: '',
    age: '',
    taxId: '',
    phone: '',
    occupation: '',
    education: 'Universitario',
    bloodTypeRh: 'O+',
    medicalNotes: 'Aparentemente sano.',
  });

  const [medicalAntecedents, setMedicalAntecedents] = useState({
    familyHypertension: false,
    familyDiabetes: false,
    familyCancer: false,
    familyTwinPregnancy: false,
    familyNotes: '',
    personalAsthma: false,
    personalHypertension: false,
    personalDiabetes: false,
    personalSurgeries: '',
    personalAllergies: '',
    personalMedications: '',
  });

  // Ant Gin
  const [profile, setProfile] = useState<GinecoObstetricProfile>({
    gestas: 0,
    partos: 0,
    cesareas: 0,
    abortos: 0,
    ectopicos: 0,
    hijosVivos: 0,
    fum: '',
    menarquia: 12,
    ritmoMenstrual: '28 x 4',
    dismenorrea: false,
    ciclosRegulares: true,
    metodoAnticonceptivo: 'Ninguno',
    tiempoUsoAnticonceptivo: 'N/A',
    inicioVidaSexual: 18,
    parejasSexuales: 1,
    ultimaCitologiaFecha: '',
    ultimaCitologiaResultado: 'NILM',
    alergias: '',
    patologiasCronicas: '',
  });

  // Ant Obs ampliados Himego
  const [extendedObstetrics, setExtendedObstetrics] = useState<{
    partosEutocicos: number;
    partosDistocicos: number;
    cesareaReason: string;
    cesareaNotes: string;
    abortoType: string;
    abortoResolution: string;
    abortoNotes: string;
    hijosVarones: number;
    hijosHembras: number;
    pesoMaxFetalGrams: number;
    pesoMinFetalGrams: number;
    firstDeliveryDate: string;
    lastDeliveryDate: string;
    isPregnant: boolean;
    fppNaegele: string;
    plannedDeliveryPlace: string;
    complicationsPrev: string;
    deliveries: ObstetricDeliveryItem[];
  }>({
    partosEutocicos: 0,
    partosDistocicos: 0,
    cesareaReason: 'ESTRECHA',
    cesareaNotes: '',
    abortoType: 'ESPONTANEO',
    abortoResolution: 'AMEU',
    abortoNotes: '',
    hijosVarones: 0,
    hijosHembras: 0,
    pesoMaxFetalGrams: 3500,
    pesoMinFetalGrams: 2900,
    firstDeliveryDate: '',
    lastDeliveryDate: '',
    isPregnant: true,
    fppNaegele: '',
    plannedDeliveryPlace: 'Clínica Privada',
    complicationsPrev: '',
    deliveries: [],
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CONSULTA DE HOY (ENCOUNTER ACTIVO)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const [encounterType, setEncounterType] = useState<'prenatal' | 'ginecologia' | 'ecografia'>('prenatal');
  const [chiefComplaint, setChiefComplaint] = useState('Control prenatal de rutina.');
  
  // Signos vitales maternos de hoy
  const [vitals, setVitals] = useState<{
    bloodPressure: string;
    heartRate: number | '';
    weightKg: number | '';
    heightCm: number | '';
    temperature: number | '';
  }>({
    bloodPressure: '120/80',
    heartRate: 75,
    weightKg: '',
    heightCm: '',
    temperature: 36.5,
  });

  // Examen Obstétrico de hoy
  const [obstetricExam, setObstetricExam] = useState({
    uterineHeightCm: 0,
    fetalHeartRateBpm: 140,
    fetalMovements: 'presentes' as 'presentes' | 'disminuidos' | 'ausentes',
    presentation: 'cefalica' as 'cefalica' | 'podalica' | 'transversa',
    situation: 'Longitudinal',
    fetalDorsum: 'Dorso Izquierdo',
    edema: 'ausente' as 'ausente' | 'leve' | 'moderado' | 'severo',
    ultrasoundFindings: '',
  });

  // Examen Ginecológico de hoy
  const [gynecologicExam, setGynecologicExam] = useState({
    inspectionVulva: 'Genitales externos normoconfigurados sin lesiones activas.',
    speculoscopyVagina: 'Mucosa vaginal elástica, rosada, sin flujo patológico.',
    speculoscopyCervix: 'Cuello uterino eutrófico, orificio cervical externo cerrado.',
    aceticAcidTest: 'normal' as 'normal' | 'acetoblanco_tenue' | 'acetoblanco_denso' | 'mosaico' | 'punteado',
    schillerTest: 'positivo_caoba' as 'positivo_caoba' | 'negativo_yodonegativo' | 'no_realizado',
    bethesdaPapClassification: 'Negativo para lesión intraepitelial o malignidad (NILM)',
    biopsyTaken: false,
    biopsyLocation: '',
  });

  // SOAP & CIE-10
  const [soapSubjective, setSoapSubjective] = useState('');
  const [soapObjective, setSoapObjective] = useState('');
  const [soapAssessment, setSoapAssessment] = useState('');
  const [soapPlan, setSoapPlan] = useState('');
  const [selectedCie10, setSelectedCie10] = useState<{ code: string; description: string } | null>(null);
  const [cie10Search, setCie10Search] = useState('');

  // Récipe Médico
  const [prescriptionMedications, setPrescriptionMedications] = useState('');
  const [prescriptionInstructions, setPrescriptionInstructions] = useState('');
  const [prescriptionLabOrders, setPrescriptionLabOrders] = useState<string[]>([]);
  const [newLabOrderInput, setNewLabOrderInput] = useState('');

  // Procedimientos en Sesión
  const [catalogProcedures, setCatalogProcedures] = useState<GinecoProcedureDefinition[]>(GINECO_PROCEDURES_MASTER);
  const [sessionProcedures, setSessionProcedures] = useState<Array<{
    id: string;
    code: string;
    name: string;
    price: number;
    category: string;
    stages?: any[];
  }>>([]);
  const [isSendingToCashier, setIsSendingToCashier] = useState(false);
  const [isSavingEncounter, setIsSavingEncounter] = useState(false);
  const [isSavingChart, setIsSavingChart] = useState(false);

  // Historial de Consultas
  const [encountersHistory, setEncountersHistory] = useState<any[]>([]);
  const [patientWorkOrders, setPatientWorkOrders] = useState<PatientGinecoWorkOrder[]>([]);

  const activePatient = useMemo(() => {
    return patients.find((p) => p.id === selectedPatientId) || null;
  }, [patients, selectedPatientId]);

  const activeDoctor = useMemo(() => {
    return doctors.find((d) => d.id === selectedDoctorId) || null;
  }, [doctors, selectedDoctorId]);

  const filteredPatients = useMemo(() => {
    if (!patientSearchQuery.trim()) return patients.slice(0, 30);
    const q = patientSearchQuery.toLowerCase().trim();
    const cleanDigits = (s: string) => (s || '').replace(/\D/g, '');
    const qDigits = cleanDigits(q);

    return patients.filter((p) => {
      const pTaxDigits = cleanDigits(
        p.tax_id ||
        (p.metadata as any)?.cedula ||
        (p.metadata as any)?.dni ||
        (p.metadata as any)?.ci ||
        ''
      );

      const nameMatch = p.name?.toLowerCase().includes(q);
      const taxMatch =
        p.tax_id?.toLowerCase().includes(q) ||
        Boolean((p.metadata as any)?.cedula && String((p.metadata as any).cedula).toLowerCase().includes(q)) ||
        Boolean((p.metadata as any)?.dni && String((p.metadata as any).dni).toLowerCase().includes(q)) ||
        Boolean((p.metadata as any)?.ci && String((p.metadata as any).ci).toLowerCase().includes(q));
      const digitMatch = qDigits.length >= 3 && pTaxDigits.includes(qDigits);
      const phoneMatch = p.phone?.toLowerCase().includes(q);

      return nameMatch || taxMatch || digitMatch || phoneMatch;
    });
  }, [patients, patientSearchQuery]);

  const bmiInfo = useMemo(() => {
    const w = Number(vitals.weightKg);
    const h = Number(vitals.heightCm);
    if (!w || !h || w <= 0 || h <= 0) {
      return { bmi: 0, category: 'Pendiente de registrar peso/talla', color: '#94a3b8' };
    }
    return calculateBMI(w, h);
  }, [vitals.weightKg, vitals.heightCm]);

  // Carga inicial
  const loadInitialData = useCallback(async () => {
    if (!currentTenant?.id || !actor) return;
    setIsLoadingPatients(true);
    try {
      const [patientsRes, employeesRes, itemsRes, apptRes] = await Promise.all([
        getEntitiesAction(currentTenant.id, 'customer', 200, actor),
        getEntitiesAction(currentTenant.id, 'employee', 100, actor),
        getItemsAction(currentTenant.id, undefined, 200, actor),
        getAppointmentsAction(currentTenant.id, undefined, actor),
      ]);

      if (patientsRes.success && patientsRes.entities) {
        setPatients(patientsRes.entities);
      }

      if (employeesRes.success && employeesRes.entities) {
        const medicalDocs = employeesRes.entities.filter((e: any) => {
          const m = e.metadata || {};
          return (
            m.is_doctor ||
            m.is_gineco ||
            m.doctor_config?.is_active ||
            (Array.isArray(m.modules) && (m.modules.includes('ginecologia') || m.modules.includes('clinica')))
          );
        });
        const finalDocs = medicalDocs.length > 0 ? medicalDocs : employeesRes.entities;
        setDoctors(finalDocs);
        if (finalDocs.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(finalDocs[0].id);
        }
      }

      // Extraer servicios configurados en los colaboradores/médicos en Citas/Equipo
      const employeeServices: any[] = [];
      if (employeesRes.success && employeesRes.entities) {
        employeesRes.entities.forEach((emp: any) => {
          const svcs = emp.metadata?.services;
          if (Array.isArray(svcs)) {
            svcs.forEach((s: any) => {
              if (s && s.name && s.name.trim()) {
                employeeServices.push({
                  id: s.id || `emp-svc-${s.name.toLowerCase().replace(/\s+/g, '-')}`,
                  name: s.name.trim(),
                  base_price: s.price !== undefined && s.price !== null ? Number(s.price) : 50,
                  metadata: {
                    specialty: 'ginecologia',
                    source_module: 'ginecologia',
                    category: 'procedimientos',
                    duration_minutes: s.durationMinutes || 45,
                  },
                });
              }
            });
          }
        });
      }

      const allItems = [
        ...(itemsRes.success && itemsRes.items ? itemsRes.items : []),
        ...employeeServices,
      ];
      const merged = mergeTenantGinecoServices(allItems as any[]);
      setCatalogProcedures(merged);

      if (apptRes.success && apptRes.appointments) {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayList = apptRes.appointments.filter((a: any) => a.start_time?.startsWith(todayStr));
        setTodayAppointments(todayList.length > 0 ? todayList : apptRes.appointments.slice(0, 10));
      }
    } catch (err) {
      console.error('Error cargando datos de Ginecología:', err);
    } finally {
      setIsLoadingPatients(false);
    }
  }, [currentTenant?.id, actor, selectedDoctorId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Selección automática por URL
  useEffect(() => {
    const urlPatientId = searchParams.get('patient') || searchParams.get('client_id');
    if (urlPatientId && patients.length > 0) {
      const found = patients.find((p) => p.id === urlPatientId);
      if (found) {
        setSelectedPatientId(found.id);
      }
    }
  }, [searchParams, patients]);

  // Carga de expediente al seleccionar paciente
  useEffect(() => {
    if (!selectedPatientId || !currentTenant?.id || !actor) return;

    getGinecoPatientRecordAction(selectedPatientId, currentTenant.id, actor).then((res) => {
      if (res.success && res.profile) {
        setProfile(res.profile);
      }
      if (res.success && res.encounters) {
        setEncountersHistory(res.encounters);
      }
    });

    getPatientGinecoWorkOrdersAction(selectedPatientId, currentTenant.id, actor).then((res) => {
      if (res.success && res.workOrders) {
        setPatientWorkOrders(res.workOrders);
      }
    });

    // Cargar metadatos extendidos si existen en la entidad
    const p = patients.find((pat) => pat.id === selectedPatientId);
    if (p && p.metadata) {
      const meta = p.metadata;
      if (meta.demographics) {
        setDemographics((prev) => ({
          ...prev,
          ...meta.demographics,
          bloodTypeRh: meta.demographics.bloodTypeRh || meta.blood_type || prev.bloodTypeRh || 'O+',
        }));
      } else if (meta.blood_type) {
        setDemographics((prev) => ({ ...prev, bloodTypeRh: meta.blood_type }));
      }
      if (meta.spouse_data) setSpouseData((prev) => ({ ...prev, ...meta.spouse_data }));
      if (meta.medical_antecedents) setMedicalAntecedents((prev) => ({ ...prev, ...meta.medical_antecedents }));
      if (meta.extended_obstetrics) {
        setExtendedObstetrics((prev) => ({
          ...prev,
          ...meta.extended_obstetrics,
          deliveries: Array.isArray(meta.extended_obstetrics.deliveries) ? meta.extended_obstetrics.deliveries : [],
        }));
      }
    }
  }, [selectedPatientId, currentTenant?.id, actor, patients]);

  // Guardar ficha biológica permanente
  const handleSaveBiologicalChart = async () => {
    if (!selectedPatientId || !currentTenant?.id || !actor) return;
    setIsSavingChart(true);
    try {
      const existingMeta = (activePatient?.metadata || {}) as Record<string, any>;
      const updatedMeta = {
        ...existingMeta,
        gineco_profile: profile,
        demographics,
        spouse_data: spouseData,
        medical_antecedents: medicalAntecedents,
        extended_obstetrics: extendedObstetrics,
        blood_type: demographics.bloodTypeRh,
        allergies: medicalAntecedents.personalAllergies || profile.alergias,
        fum: profile.fum,
      };

      const res = await updateEntityAction(
        selectedPatientId,
        { metadata: updatedMeta },
        currentTenant.id,
        actor
      );

      if (res.success) {
        toast({ variant: 'success', title: 'Ficha Guardada', description: 'Expediente clínico actualizado exitosamente.' });
      } else {
        toast({ variant: 'error', title: 'Error', description: res.error || 'No se pudo guardar la ficha.' });
      }
    } catch (e: any) {
      toast({ variant: 'error', title: 'Error', description: e.message });
    } finally {
      setIsSavingChart(false);
    }
  };

  // Crear paciente rápida
  const handleCreateFastPatient = async () => {
    if (!newPatientName.trim() || !currentTenant?.id || !actor) {
      toast({ variant: 'error', title: 'Error', description: 'El nombre es obligatorio.' });
      return;
    }
    setIsSubmittingPatient(true);
    try {
      const res = await createEntityAction(
        {
          name: newPatientName.trim(),
          type: 'customer',
          tax_id: newPatientTaxId.trim() || undefined,
          phone: newPatientPhone.trim() || undefined,
          metadata: {
            birth_date: newPatientBirthDate || undefined,
            allergies: newPatientAllergies.trim() || undefined,
            blood_type: newPatientBloodType,
            demographics: {
              state: newPatientState,
              city: newPatientCity,
              bloodTypeRh: newPatientBloodType,
            },
            has_clinical_history: true,
            has_history: true,
          },
        },
        currentTenant.id,
        actor
      );

      if (res.success && res.entity) {
        setPatients((prev) => [res.entity, ...prev]);
        setSelectedPatientId(res.entity.id);
        setIsNewPatientModalOpen(false);
        setNewPatientName('');
        setNewPatientTaxId('');
        setNewPatientPhone('');
        setNewPatientBirthDate('');
        setNewPatientAllergies('');
        setNewPatientBloodType('O+');
        toast({ variant: 'success', title: 'Paciente Creada', description: 'Expediente ginecológico iniciado.' });
      } else {
        toast({ variant: 'error', title: 'Error', description: res.error || 'No se pudo crear.' });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
    } finally {
      setIsSubmittingPatient(false);
    }
  };

  // Guardar consulta
  const handleSaveEncounter = async () => {
    if (!selectedPatientId || !currentTenant?.id || !actor) {
      toast({ variant: 'error', title: 'Paciente Requerida', description: 'Selecciona una paciente para continuar.' });
      return;
    }
    setIsSavingEncounter(true);
    try {
      const res = await saveGinecoEncounterAction(
        currentTenant.id,
        {
          patientId: selectedPatientId,
          doctorId: selectedDoctorId || undefined,
          doctorName: activeDoctor?.name || session?.userEmail || 'Ginecólogo/a',
          encounterType: encounterType === 'prenatal' ? 'prenatal' : 'ginecologia',
          chiefComplaint,
          profileUpdates: profile,
          vitals: {
            bloodPressure: vitals.bloodPressure || undefined,
            heartRate: vitals.heartRate === '' ? undefined : Number(vitals.heartRate),
            weightKg: vitals.weightKg === '' ? undefined : Number(vitals.weightKg),
            heightCm: vitals.heightCm === '' ? undefined : Number(vitals.heightCm),
            temperature: vitals.temperature === '' ? undefined : Number(vitals.temperature),
          },
          obstetricExam: {
            ...obstetricExam,
            fumUsed: profile.fum || '',
            gestationalWeeks: 0,
            gestationalDays: 0,
            fppDate: extendedObstetrics.fppNaegele || '',
          },
          gynecologicExam,
          soap: {
            subjective: soapSubjective,
            objective: soapObjective,
            assessment: soapAssessment,
            cie10Code: selectedCie10?.code,
            cie10Description: selectedCie10?.description,
            plan: soapPlan,
          },
          prescription: {
            medications: prescriptionMedications,
            instructions: prescriptionInstructions,
            labOrders: prescriptionLabOrders,
          },
          selectedProcedures: sessionProcedures,
        },
        actor
      );

      if (res.success) {
        toast({
          variant: 'success',
          title: 'Consulta Registrada',
          description: 'Evolución clínica guardada exitosamente en el historial.',
        });
        setIsConsulting(false);
        // Refrescar historial
        getGinecoPatientRecordAction(selectedPatientId, currentTenant.id, actor).then((hist) => {
          if (hist.success && hist.encounters) setEncountersHistory(hist.encounters);
        });
      } else {
        toast({ variant: 'error', title: 'Error al Guardar', description: res.error || 'Ocurrió un error.' });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
    } finally {
      setIsSavingEncounter(false);
    }
  };

  // Despacho a Caja POS
  const totalUSD = useMemo(() => {
    return sessionProcedures.reduce((acc, p) => acc + (Number(p.price) || 0), 0);
  }, [sessionProcedures]);

  const totalVES = totalUSD * (exchangeRate || 1);

  const handleSendToCashier = async () => {
    if (!selectedPatientId || !currentTenant?.id || !actor) return;
    if (sessionProcedures.length === 0) {
      toast({ variant: 'warning', title: 'Sin Procedimientos', description: 'Agrega al menos una consulta o estudio para cobrar.' });
      return;
    }
    setIsSendingToCashier(true);
    try {
      const itemsToCharge = sessionProcedures.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        cost: p.price,
        category: p.category,
        stages: p.stages,
      }));

      const res = await sendGinecoOrderToCashierAction(
        selectedPatientId,
        activePatient?.name || 'Paciente',
        itemsToCharge,
        totalUSD,
        currentTenant.id,
        actor,
        {
          doctorId: selectedDoctorId,
          doctorName: activeDoctor?.name || 'Ginecólogo/a',
        }
      );

      if (res.success) {
        toast({
          variant: 'success',
          title: 'Orden en Caja POS',
          description: `Orden enviada para cobro en recepción ($${totalUSD.toFixed(2)} USD ≈ Bs ${totalVES.toFixed(2)}).`,
        });
      }
    } catch (e: any) {
      toast({ variant: 'error', title: 'Error', description: e.message });
    } finally {
      setIsSendingToCashier(false);
    }
  };

  // Handlers de estudios Himego
  const handleSaveEcoGinecoReport = async (rep: GinecoUltrasoundReport) => {
    if (!currentTenant?.id || !actor || !selectedPatientId) return;
    const res = await saveGinecoUltrasoundReportAction(
      currentTenant.id,
      {
        patientId: selectedPatientId,
        patientName: activePatient?.name || 'Paciente',
        doctorName: activeDoctor?.name || 'Ginecólogo/a',
        reportType: 'ginecologico',
        title: 'Ecografía Ginecológica Pélvica / Transvaginal',
        reportData: rep,
      },
      actor
    );
    if (res.success) toast({ variant: 'success', title: 'Eco Guardado', description: 'Reporte ecográfico archivado.' });
  };

  const handleSaveEcoObsReport = async (rep: ObstetricUltrasoundReport) => {
    if (!currentTenant?.id || !actor || !selectedPatientId) return;
    const res = await saveGinecoUltrasoundReportAction(
      currentTenant.id,
      {
        patientId: selectedPatientId,
        patientName: activePatient?.name || 'Paciente',
        doctorName: activeDoctor?.name || 'Ginecólogo/a',
        reportType: rep.trimestre === 'I' ? 'obstetrico_i' : 'obstetrico_ii_iii',
        title: `Ecografía Obstétrica ${rep.trimestre} Trimestre`,
        reportData: rep,
      },
      actor
    );
    if (res.success) toast({ variant: 'success', title: 'Eco Obstétrico Guardado', description: 'Biometría Hadlock archivada.' });
  };

  const handleSaveExamsData = async (data: GinecoExamsData) => {
    if (!currentTenant?.id || !actor || !selectedPatientId) return;
    const res = await saveGinecoExamsRecordAction(
      currentTenant.id,
      {
        patientId: selectedPatientId,
        patientName: activePatient?.name || 'Paciente',
        doctorName: activeDoctor?.name || 'Ginecólogo/a',
        examsData: data,
      },
      actor
    );
    if (res.success) toast({ variant: 'success', title: 'Exámenes Guardados', description: 'Registro Bethesda actualizado.' });
  };

  const handleSaveLabRecord = async (record: GinecoLabRecord) => {
    if (!currentTenant?.id || !actor || !selectedPatientId) return;
    const res = await saveGinecoLabRecordAction(
      currentTenant.id,
      {
        patientId: selectedPatientId,
        patientName: activePatient?.name || 'Paciente',
        doctorName: activeDoctor?.name || 'Ginecólogo/a',
        labData: record,
      },
      actor
    );
    if (res.success) toast({ variant: 'success', title: 'Laboratorio Guardado', description: 'Parámetros registrados.' });
  };

  const handleSaveSurgeryRecord = async (record: SurgicalInterventionRecord, dispatchToPOS: boolean = false) => {
    if (!currentTenant?.id || !actor || !selectedPatientId) return;
    const res = await saveGinecoSurgeryRecordAction(
      currentTenant.id,
      {
        patientId: selectedPatientId,
        patientName: activePatient?.name || 'Paciente',
        doctorName: activeDoctor?.name || 'Ginecólogo/a',
        surgeryData: record,
        dispatchToPOS,
      },
      actor
    );
    if (res.success) toast({ variant: 'success', title: 'Cirugía Registrada', description: 'Honorarios y protocolo guardados.' });
  };

  // URL del portal público para el QR
  const bookingPublicUrl = typeof window !== 'undefined' && currentTenant?.id
    ? `${window.location.origin}/reservas/${currentTenant.id}`
    : `https://rendorp.com/reservas/${currentTenant?.id || ''}`;

  return (
    <div className="min-h-screen pb-24 text-foreground max-w-7xl mx-auto px-4 sm:px-6 pt-4 space-y-5 animate-in fade-in duration-300">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ESTADO 1: SIN PACIENTE SELECCIONADO (RECEPCIÓN & SALA DE ESPERA)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {!selectedPatientId ? (
        <div className="space-y-6">
          {/* Cabecera Principal */}
          <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center font-black shadow-lg shadow-pink-500/20 shrink-0">
                <Baby size={30} />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-black text-foreground">Ginecología & Obstetricia</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20">
                    Centro de Mando
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Recepción de pacientes, citas del día y expedientes clínicos gineco-obstétricos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="px-3.5 py-2.5 rounded-2xl bg-card border border-border hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all flex items-center gap-2 btn-haptic"
              >
                <BookOpen size={15} />
                <span>Guía</span>
              </button>

              <button
                type="button"
                onClick={() => setIsNewPatientModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-black shadow-md shadow-pink-500/20 transition-all flex items-center gap-2 btn-haptic"
              >
                <UserPlus size={16} />
                <span>+ Nueva Paciente</span>
              </button>
            </div>
          </div>

          {/* Buscador Universal Prominente */}
          <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Search size={16} className="text-pink-500" /> Buscar Paciente para Iniciar Atención
            </h2>
            <div className="relative">
              <input
                type="text"
                value={patientSearchQuery}
                onChange={(e) => setPatientSearchQuery(e.target.value)}
                placeholder="Escribe el nombre, cédula o teléfono de la paciente..."
                className="w-full text-base font-bold p-4 pl-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 transition-all"
              />
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Resultados de Búsqueda o Pacientes Recientes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {filteredPatients.slice(0, 9).map((p) => {
                const isGestante = p.metadata?.extended_obstetrics?.isPregnant ?? p.metadata?.gineco_profile?.gestas > 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPatientId(p.id)}
                    className="p-4 rounded-2xl bg-card border border-border/80 hover:border-pink-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-foreground group-hover:text-pink-600 transition-colors truncate">
                          {p.name}
                        </span>
                        {isGestante ? (
                          <span className="px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 text-[10px] font-black uppercase">
                            🤰 Gestante
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase">
                            Ginecología
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-1">
                        C.I: {p.tax_id || 'S/C'} {p.phone ? `· Tel: ${p.phone}` : ''}
                      </p>
                      {p.metadata?.allergies && (
                        <p className="text-[10px] font-bold text-red-500 mt-1">
                          Alergia: {p.metadata.allergies}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-xs font-bold text-pink-600">
                      <span>Abrir Expediente</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Citas del Día / Sala de Espera */}
          <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Clock size={16} className="text-pink-500" /> Agenda Médica & Sala de Espera de Hoy
              </h2>
              <span className="text-xs font-bold text-slate-400">
                {todayAppointments.length} citas registradas
              </span>
            </div>

            {todayAppointments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No hay citas agendadas para hoy en el calendario.
              </p>
            ) : (
              <div className="divide-y divide-border/60">
                {todayAppointments.map((appt) => (
                  <div key={appt.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 flex items-center justify-center font-black text-xs">
                        {appt.start_time ? appt.start_time.split('T')[1]?.slice(0, 5) : '09:00'}
                      </div>
                      <div>
                        <p className="text-xs font-black text-foreground">{appt.title || 'Consulta Médica'}</p>
                        <p className="text-[11px] text-slate-500">
                          {appt.metadata?.patient_name || 'Paciente'} · {appt.metadata?.service_name || 'Ginecología'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (appt.entity_id) setSelectedPatientId(appt.entity_id);
                        else toast({ variant: 'info', title: 'Cita sin paciente vinculado' });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500 text-pink-600 hover:text-white text-xs font-bold transition-all btn-haptic"
                    >
                      Atender →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           ESTADO 2: CON PACIENTE SELECCIONADO (CENTRO DE MANDO / COCKPIT)
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        <div className="space-y-4">
          {/* CINTILLO PERMANENTE DE LA PACIENTE (PATIENT BANNER) */}
          <div className="bg-card border border-border/80 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 sticky top-2 z-30 backdrop-blur-md bg-card/95">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white font-black text-sm flex items-center justify-center shadow-md shrink-0">
                {activePatient?.name?.slice(0, 2).toUpperCase() || 'PA'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-black text-foreground">{activePatient?.name}</h2>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[11px] font-bold">
                    C.I: {activePatient?.tax_id || 'S/C'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black text-[11px] flex items-center gap-1 border border-rose-500/20">
                    <Heart size={11} className="fill-rose-500 text-rose-500" /> {demographics.bloodTypeRh || 'O+'}
                  </span>
                  {extendedObstetrics.isPregnant && (
                    <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-600 dark:text-pink-300 text-[11px] font-black uppercase tracking-wider animate-pulse">
                      🤰 En Gestante
                    </span>
                  )}
                  {medicalAntecedents.personalAllergies && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 text-[10px] font-black uppercase">
                      ⚠️ Alergia: {medicalAntecedents.personalAllergies}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  FUM: {profile.fum || 'Sin FUM'} | Médico: {activeDoctor?.name || 'Ginecólogo/a'} | Tel: {activePatient?.phone || 'Sin teléfono'}{demographics.city ? ` · ${demographics.city}, ${demographics.state}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isConsulting ? (
                <button
                  type="button"
                  onClick={() => setIsConsulting(true)}
                  className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-black shadow-md shadow-pink-500/20 transition-all flex items-center gap-1.5 btn-haptic"
                >
                  <Plus size={15} />
                  <span>+ Iniciar Consulta de Hoy</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConsulting(false)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all"
                >
                  Ver Historial / Ficha
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelectedPatientId('');
                  setIsConsulting(false);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                title="Cambiar o Salir de la Paciente"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* CINTILLO RESUMEN CUANDO LA FICHA MÉDICA ESTÁ PLEGADA */}
          {!isChartExpanded && (
            <div className="bg-card border border-border/80 rounded-2xl p-3.5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-pink-50/50 via-card to-card dark:from-pink-950/20">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-black text-pink-600">
                  <User size={15} />
                  <span>Ficha Médica Permanente (Plegada)</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  <span className="px-2 py-0.5 rounded-lg bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 font-bold">
                    Rh: {demographics.bloodTypeRh || 'O+'}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold">
                    GPCAE: G{profile.gestas} P{profile.partos} C{profile.cesareas} A{profile.abortos} E{profile.ectopicos}
                  </span>
                  {profile.fum && (
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                      FUM: {profile.fum}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    MAC: {profile.metodoAnticonceptivo || 'Ninguno'}
                  </span>
                  {medicalAntecedents.personalAllergies && (
                    <span className="px-2 py-0.5 rounded-lg bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 font-bold">
                      Alergias: {medicalAntecedents.personalAllergies}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChartExpanded(true)}
                className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-black transition-all flex items-center gap-1.5 shrink-0 shadow-xs btn-haptic"
              >
                <ChevronDown size={14} />
                <span>Desplegar Ficha (5 Pestañas)</span>
              </button>
            </div>
          )}

          {/* EL COCKPIT: DISTRIBUCIÓN EN 3 PANELES */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                PANEL IZQUIERDO (4/12 = 33%): LA FICHA BIOLÓGICA PERMANENTE (5 PESTAÑAS HIMEGO)
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {isChartExpanded && (
              <div className="lg:col-span-4 bg-card border border-border/80 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <User size={15} className="text-pink-500" /> Ficha Médica Permanente
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveBiologicalChart}
                      disabled={isSavingChart}
                      className="px-2.5 py-1 rounded-lg bg-pink-500/10 hover:bg-pink-500 text-pink-600 hover:text-white text-[11px] font-black transition-all disabled:opacity-50"
                    >
                      {isSavingChart ? 'Guardando...' : 'Guardar Ficha'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsChartExpanded(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Plegar Ficha Médica"
                    >
                      <ChevronUp size={16} />
                    </button>
                  </div>
                </div>

              {/* Selector de Pestaña de Ficha */}
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl gap-1 text-[11px] font-bold overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setPatientChartTab('paciente')}
                  className={`px-2.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                    patientChartTab === 'paciente' ? 'bg-card text-pink-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  1. Paciente
                </button>
                <button
                  type="button"
                  onClick={() => setPatientChartTab('conyugue')}
                  className={`px-2.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                    patientChartTab === 'conyugue' ? 'bg-card text-pink-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  2. Cónyuge
                </button>
                <button
                  type="button"
                  onClick={() => setPatientChartTab('antecedentes_fp')}
                  className={`px-2.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                    patientChartTab === 'antecedentes_fp' ? 'bg-card text-pink-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  3. Ant F/P
                </button>
                <button
                  type="button"
                  onClick={() => setPatientChartTab('ant_gin')}
                  className={`px-2.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                    patientChartTab === 'ant_gin' ? 'bg-card text-pink-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  4. Ant Gin
                </button>
                <button
                  type="button"
                  onClick={() => setPatientChartTab('ant_obs')}
                  className={`px-2.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                    patientChartTab === 'ant_obs' ? 'bg-card text-pink-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  5. Ant Obs
                </button>
              </div>

              {/* CONTENIDO DE LA PESTAÑA DE FICHA SELECCIONADA */}
              <div className="space-y-3 text-xs">
                {/* 1. PACIENTE */}
                {patientChartTab === 'paciente' && (
                  <div className="space-y-3">
                    {/* Dirección */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Dirección de Habitación</label>
                      <input
                        type="text"
                        value={demographics.address}
                        onChange={(e) => setDemographics({ ...demographics, address: e.target.value })}
                        placeholder="Calle, Residencia, Edificio, Apto..."
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border text-xs"
                      />
                    </div>

                    {/* Geografía de Venezuela: Estado y Ciudad en Cascada */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-border/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-pink-600 dark:text-pink-400 flex items-center gap-1">
                          🇻🇪 Ubicación (Venezuela)
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsCustomCity(!isCustomCity)}
                          className="text-[10px] font-bold text-slate-400 hover:text-pink-500 underline"
                        >
                          {isCustomCity ? '← Usar lista desplegable' : '✏️ Escribir ciudad manual'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Estado</label>
                          <select
                            value={demographics.state || 'Distrito Capital'}
                            onChange={(e) => {
                              const newState = e.target.value;
                              const cities = getCitiesForState(newState);
                              setDemographics({
                                ...demographics,
                                state: newState,
                                city: cities[0] || '',
                              });
                            }}
                            className="w-full p-2 rounded-xl bg-card border border-border text-xs font-semibold"
                          >
                            {VENEZUELA_STATES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                            <option value="Otro">Otro / Fuera del país</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Ciudad / Municipio</label>
                          {isCustomCity ? (
                            <input
                              type="text"
                              value={demographics.city}
                              onChange={(e) => setDemographics({ ...demographics, city: e.target.value })}
                              placeholder="Escribe la ciudad o sector..."
                              className="w-full p-2 rounded-xl bg-card border border-border text-xs font-semibold"
                            />
                          ) : (
                            <select
                              value={demographics.city}
                              onChange={(e) => {
                                if (e.target.value === '__custom__') {
                                  setIsCustomCity(true);
                                  setDemographics({ ...demographics, city: '' });
                                } else {
                                  setDemographics({ ...demographics, city: e.target.value });
                                }
                              }}
                              className="w-full p-2 rounded-xl bg-card border border-border text-xs font-semibold"
                            >
                              {getCitiesForState(demographics.state || 'Distrito Capital').map((ct) => (
                                <option key={ct} value={ct}>
                                  {ct}
                                </option>
                              ))}
                              <option value="__custom__">✏️ Otra / No listada...</option>
                            </select>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Grupo Sanguíneo & Rh */}
                    <div className="p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <Heart size={12} className="fill-rose-500 text-rose-500" /> Grupo Sanguíneo & Factor Rh
                        </label>
                        <span className="text-[11px] font-black font-mono text-rose-600">
                          {demographics.bloodTypeRh || 'O+'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {BLOOD_TYPES.map((bt) => (
                          <button
                            key={bt}
                            type="button"
                            onClick={() => setDemographics({ ...demographics, bloodTypeRh: bt })}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                              demographics.bloodTypeRh === bt
                                ? 'bg-rose-500 text-white shadow-xs'
                                : 'bg-card border border-border hover:border-rose-400 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {bt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Estado Civil y Ocupación */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Estado Civil</label>
                        <select
                          value={demographics.civilStatus}
                          onChange={(e) => setDemographics({ ...demographics, civilStatus: e.target.value })}
                          className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border text-xs"
                        >
                          <option value="Soltera">Soltera</option>
                          <option value="Casada">Casada</option>
                          <option value="Conviviente / Unión Estable">Unión Estable</option>
                          <option value="Divorciada">Divorciada</option>
                          <option value="Viuda">Viuda</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Ocupación</label>
                        <input
                          type="text"
                          value={demographics.occupation}
                          onChange={(e) => setDemographics({ ...demographics, occupation: e.target.value })}
                          placeholder="Profesión u ocupación..."
                          className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. CÓNYUGE / PAREJA */}
                {patientChartTab === 'conyugue' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Nombre de la Pareja</label>
                      <input
                        type="text"
                        value={spouseData.name}
                        onChange={(e) => setSpouseData({ ...spouseData, name: e.target.value })}
                        placeholder="Nombre y apellido del cónyuge..."
                        className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Cédula</label>
                        <input
                          type="text"
                          value={spouseData.taxId}
                          onChange={(e) => setSpouseData({ ...spouseData, taxId: e.target.value })}
                          placeholder="V-..."
                          className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Teléfono</label>
                        <input
                          type="text"
                          value={spouseData.phone}
                          onChange={(e) => setSpouseData({ ...spouseData, phone: e.target.value })}
                          placeholder="0412 / 0414..."
                          className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border text-xs"
                        />
                      </div>
                    </div>

                    {/* Grupo Sanguíneo Pareja */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-border/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Heart size={12} className="text-pink-500" /> Grupo Sanguíneo Pareja
                        </label>
                        <span className="text-[11px] font-black font-mono text-pink-600">
                          {spouseData.bloodTypeRh || 'O+'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {BLOOD_TYPES.map((bt) => (
                          <button
                            key={bt}
                            type="button"
                            onClick={() => setSpouseData({ ...spouseData, bloodTypeRh: bt })}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${
                              spouseData.bloodTypeRh === bt
                                ? 'bg-pink-500 text-white shadow-xs'
                                : 'bg-card border border-border hover:border-pink-400 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {bt}
                          </button>
                        ))}
                      </div>

                      {/* Alerta de Incompatibilidad Rh */}
                      {demographics.bloodTypeRh?.includes('-') && spouseData.bloodTypeRh?.includes('+') && (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-700 dark:text-amber-400 flex items-start gap-1.5 mt-2">
                          <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-500" />
                          <span>
                            <strong>Incompatibilidad Rh Posible:</strong> Madre Rh (-) y Pareja Rh (+). Se sugiere solicitar Test de Coombs Indirecto seriado e indicación de Inmunoglobulina Anti-D (RhoGAM) en semana 28 de gestación.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Antecedentes de la Pareja con Chips */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-400">Antecedentes Clínicos de la Pareja</label>
                        <span className="text-[9px] text-slate-400">Toca para agregar</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {['Aparentemente sano', 'Hipertensión', 'Diabetes', 'Fumador activo', 'Asma'].map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => {
                              const cur = spouseData.medicalNotes.trim();
                              if (!cur || cur === 'Aparentemente sano.') {
                                setSpouseData({ ...spouseData, medicalNotes: chip });
                              } else if (!cur.includes(chip)) {
                                setSpouseData({ ...spouseData, medicalNotes: `${cur}, ${chip}` });
                              }
                            }}
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-pink-500 hover:text-white transition-all"
                          >
                            + {chip}
                          </button>
                        ))}
                      </div>
                      <textarea
                        rows={2}
                        value={spouseData.medicalNotes}
                        onChange={(e) => setSpouseData({ ...spouseData, medicalNotes: e.target.value })}
                        placeholder="Notas médicas o hábitos psicobiológicos de la pareja..."
                        className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* 3. ANTECEDENTES F/P */}
                {patientChartTab === 'antecedentes_fp' && (
                  <div className="space-y-3">
                    {/* Alergias con Chips */}
                    <div className="p-3 rounded-2xl bg-red-50/60 dark:bg-red-950/20 border border-red-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-red-600 uppercase flex items-center gap-1">
                          <AlertCircle size={12} /> Alergias Medicamentosas (Crítico)
                        </label>
                        <span className="text-[9px] text-red-500">Toca chips o escribe</span>
                      </div>
                      <input
                        type="text"
                        value={medicalAntecedents.personalAllergies}
                        onChange={(e) => setMedicalAntecedents({ ...medicalAntecedents, personalAllergies: e.target.value })}
                        placeholder="Penicilina, AINEs, Yodo..."
                        className="w-full p-2 rounded-xl bg-card border border-red-500/30 text-red-600 font-bold text-xs"
                      />
                      <div className="flex flex-wrap gap-1 pt-1">
                        {ALLERGY_PRESETS.map((allergy) => {
                          const isSelected = medicalAntecedents.personalAllergies?.toLowerCase().includes(allergy.toLowerCase());
                          return (
                            <button
                              key={allergy}
                              type="button"
                              onClick={() => {
                                const cur = medicalAntecedents.personalAllergies.trim();
                                if (allergy === 'Ninguna conocida (NKDA)') {
                                  setMedicalAntecedents({ ...medicalAntecedents, personalAllergies: 'Ninguna conocida (NKDA)' });
                                  return;
                                }
                                if (isSelected) {
                                  const updated = cur.replace(new RegExp(`(^|,\\s*)${allergy}`, 'i'), '').replace(/^,\s*/, '').trim();
                                  setMedicalAntecedents({ ...medicalAntecedents, personalAllergies: updated });
                                } else {
                                  const cleanCur = cur === 'Ninguna conocida (NKDA)' ? '' : cur;
                                  setMedicalAntecedents({
                                    ...medicalAntecedents,
                                    personalAllergies: cleanCur ? `${cleanCur}, ${allergy}` : allergy,
                                  });
                                }
                              }}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                                isSelected
                                  ? 'bg-red-600 text-white shadow-xs'
                                  : 'bg-card border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-500 hover:text-white'
                              }`}
                            >
                              {isSelected ? '✓ ' : '+ '}{allergy}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Medicamentos Habituales */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-border/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-500 uppercase">
                          Medicamentos Habituales / Prenatales
                        </label>
                        <span className="text-[9px] text-slate-400">Toca chips o escribe</span>
                      </div>
                      <input
                        type="text"
                        value={medicalAntecedents.personalMedications}
                        onChange={(e) => setMedicalAntecedents({ ...medicalAntecedents, personalMedications: e.target.value })}
                        placeholder="Ácido fólico, Hierro, Calcio, Levotiroxina..."
                        className="w-full p-2 rounded-xl bg-card border border-border text-xs"
                      />
                      <div className="flex flex-wrap gap-1">
                        {MEDICATION_PRESETS.map((med) => {
                          const isSelected = medicalAntecedents.personalMedications?.toLowerCase().includes(med.toLowerCase());
                          return (
                            <button
                              key={med}
                              type="button"
                              onClick={() => {
                                const cur = medicalAntecedents.personalMedications.trim();
                                if (med === 'Ninguno') {
                                  setMedicalAntecedents({ ...medicalAntecedents, personalMedications: 'Ninguno' });
                                  return;
                                }
                                if (isSelected) {
                                  const updated = cur.replace(new RegExp(`(^|,\\s*)${med}`, 'i'), '').replace(/^,\s*/, '').trim();
                                  setMedicalAntecedents({ ...medicalAntecedents, personalMedications: updated });
                                } else {
                                  const cleanCur = cur === 'Ninguno' ? '' : cur;
                                  setMedicalAntecedents({
                                    ...medicalAntecedents,
                                    personalMedications: cleanCur ? `${cleanCur}, ${med}` : med,
                                  });
                                }
                              }}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
                                isSelected
                                  ? 'bg-pink-600 text-white'
                                  : 'bg-card border border-border hover:border-pink-400 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {isSelected ? '✓ ' : '+ '}{med}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Cirugías Previas */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-border/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-500 uppercase">
                          Cirugías Previas (Quirúrgicos)
                        </label>
                        <span className="text-[9px] text-slate-400">Toca chips o escribe</span>
                      </div>
                      <input
                        type="text"
                        value={medicalAntecedents.personalSurgeries}
                        onChange={(e) => setMedicalAntecedents({ ...medicalAntecedents, personalSurgeries: e.target.value })}
                        placeholder="Cesárea, Apendicectomía, Miomectomía..."
                        className="w-full p-2 rounded-xl bg-card border border-border text-xs"
                      />
                      <div className="flex flex-wrap gap-1">
                        {SURGERY_PRESETS.map((surg) => {
                          const isSelected = medicalAntecedents.personalSurgeries?.toLowerCase().includes(surg.toLowerCase());
                          return (
                            <button
                              key={surg}
                              type="button"
                              onClick={() => {
                                const cur = medicalAntecedents.personalSurgeries.trim();
                                if (surg === 'Ninguna previa') {
                                  setMedicalAntecedents({ ...medicalAntecedents, personalSurgeries: 'Ninguna previa' });
                                  return;
                                }
                                if (isSelected) {
                                  const updated = cur.replace(new RegExp(`(^|,\\s*)${surg}`, 'i'), '').replace(/^,\s*/, '').trim();
                                  setMedicalAntecedents({ ...medicalAntecedents, personalSurgeries: updated });
                                } else {
                                  const cleanCur = cur === 'Ninguna previa' ? '' : cur;
                                  setMedicalAntecedents({
                                    ...medicalAntecedents,
                                    personalSurgeries: cleanCur ? `${cleanCur}, ${surg}` : surg,
                                  });
                                }
                              }}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
                                isSelected
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-card border border-border hover:border-purple-400 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {isSelected ? '✓ ' : '+ '}{surg}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Antecedentes Familiares */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-border/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-500 uppercase">
                          Antecedentes Familiares
                        </label>
                        <span className="text-[9px] text-slate-400">Toca chips o escribe</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {FAMILY_ANTECEDENT_PRESETS.map((fam) => {
                          const isSelected = medicalAntecedents.familyNotes?.toLowerCase().includes(fam.toLowerCase());
                          return (
                            <button
                              key={fam}
                              type="button"
                              onClick={() => {
                                const cur = medicalAntecedents.familyNotes.trim();
                                if (fam === 'Sin antecedentes relevantes') {
                                  setMedicalAntecedents({ ...medicalAntecedents, familyNotes: 'Sin antecedentes relevantes' });
                                  return;
                                }
                                if (isSelected) {
                                  const updated = cur.replace(new RegExp(`(^|,\\s*)${fam}`, 'i'), '').replace(/^,\s*/, '').trim();
                                  setMedicalAntecedents({ ...medicalAntecedents, familyNotes: updated });
                                } else {
                                  const cleanCur = cur === 'Sin antecedentes relevantes' ? '' : cur;
                                  setMedicalAntecedents({
                                    ...medicalAntecedents,
                                    familyNotes: cleanCur ? `${cleanCur}, ${fam}` : fam,
                                  });
                                }
                              }}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
                                isSelected
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-card border border-border hover:border-indigo-400 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {isSelected ? '✓ ' : '+ '}{fam}
                            </button>
                          );
                        })}
                      </div>
                      <textarea
                        rows={2}
                        value={medicalAntecedents.familyNotes}
                        onChange={(e) => setMedicalAntecedents({ ...medicalAntecedents, familyNotes: e.target.value })}
                        placeholder="Detalles de antecedentes familiares..."
                        className="w-full p-2 rounded-xl bg-card border border-border text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* 4. ANT GIN */}
                {patientChartTab === 'ant_gin' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Menarquia (edad 1ª regla)</label>
                        <select
                          value={profile.menarquia || 12}
                          onChange={(e) => setProfile({ ...profile, menarquia: Number(e.target.value) })}
                          className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border text-xs font-mono font-bold"
                        >
                          {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((age) => (
                            <option key={age} value={age}>
                              {age} años
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Sexarquia (Inicio sexual)</label>
                        <select
                          value={profile.inicioVidaSexual || 18}
                          onChange={(e) => setProfile({ ...profile, inicioVidaSexual: Number(e.target.value) })}
                          className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border text-xs font-mono font-bold"
                        >
                          {[14, 15, 16, 17, 18, 19, 20, 21, 22, 25].map((age) => (
                            <option key={age} value={age}>
                              {age} años
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Ritmo Menstrual con Dropdown y Fallback */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-border/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-500 uppercase">
                          Ritmo Menstrual (Intervalo x Días)
                        </label>
                        <span className="text-[11px] font-mono font-black text-pink-600">
                          {profile.ritmoMenstrual || '28 x 4'}
                        </span>
                      </div>
                      <select
                        value={
                          MENSTRUAL_RHYTHM_PRESETS.some((p) => p.startsWith(profile.ritmoMenstrual || ''))
                            ? MENSTRUAL_RHYTHM_PRESETS.find((p) => p.startsWith(profile.ritmoMenstrual || ''))
                            : '__custom__'
                        }
                        onChange={(e) => {
                          if (e.target.value !== '__custom__') {
                            const clean = e.target.value.split(' ')[0] + ' x ' + e.target.value.split(' ')[2];
                            setProfile({ ...profile, ritmoMenstrual: clean });
                          }
                        }}
                        className="w-full p-2 rounded-xl bg-card border border-border text-xs font-semibold"
                      >
                        {MENSTRUAL_RHYTHM_PRESETS.map((rhy) => (
                          <option key={rhy} value={rhy}>
                            {rhy}
                          </option>
                        ))}
                        <option value="__custom__">✏️ Personalizado (Escribir abajo)...</option>
                      </select>
                      <input
                        type="text"
                        value={profile.ritmoMenstrual || ''}
                        onChange={(e) => setProfile({ ...profile, ritmoMenstrual: e.target.value })}
                        placeholder="Ej: 28 x 4 o 30 x 3-5..."
                        className="w-full p-2 rounded-xl bg-card border border-border font-mono font-bold text-xs"
                      />
                    </div>

                    {/* Método Anticonceptivo (MAC) */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-border/80 space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase block">
                        Método Anticonceptivo (MAC)
                      </label>
                      <select
                        value={profile.metodoAnticonceptivo || 'Ninguno'}
                        onChange={(e) => setProfile({ ...profile, metodoAnticonceptivo: e.target.value })}
                        className="w-full p-2 rounded-xl bg-card border border-border text-xs font-semibold"
                      >
                        {CONTRACEPTIVE_PRESETS.map((mac) => (
                          <option key={mac} value={mac}>
                            {mac}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={profile.tiempoUsoAnticonceptivo && profile.tiempoUsoAnticonceptivo !== 'N/A' ? profile.tiempoUsoAnticonceptivo : ''}
                        onChange={(e) => setProfile({ ...profile, tiempoUsoAnticonceptivo: e.target.value })}
                        placeholder="Tiempo de uso, marca o notas (Ej: Hace 2 años, Mesigyna)..."
                        className="w-full p-2 rounded-xl bg-card border border-border text-xs"
                      />
                    </div>

                    {/* Última Citología (PAP) */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-border/80 space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase block">
                        Última Citología Vaginal (PAP / Bethesda)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block mb-1">Fecha de Toma</label>
                          <input
                            type="date"
                            value={profile.ultimaCitologiaFecha || ''}
                            onChange={(e) => setProfile({ ...profile, ultimaCitologiaFecha: e.target.value })}
                            className="w-full p-2 rounded-xl bg-card border border-border text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block mb-1">Resultado Bethesda</label>
                          <select
                            value={profile.ultimaCitologiaResultado || 'NILM'}
                            onChange={(e) => setProfile({ ...profile, ultimaCitologiaResultado: e.target.value })}
                            className="w-full p-2 rounded-xl bg-card border border-border text-xs font-semibold"
                          >
                            {BETHESDA_PRESETS.map((b) => (
                              <option key={b} value={b.split(' ')[0]}>
                                {b}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. ANT OBS */}
                {patientChartTab === 'ant_obs' && (
                  <div className="space-y-3">
                    {/* Banner Educativo & Clínico */}
                    <div className="p-3 rounded-2xl bg-pink-500/10 border border-pink-500/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-pink-700 dark:text-pink-300 flex items-center gap-1.5">
                          <Baby size={14} className="text-pink-600" /> Historial Obstétrico (Embarazos y Partos)
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-pink-600">¿Gestando?</span>
                          <input
                            type="checkbox"
                            checked={extendedObstetrics.isPregnant}
                            onChange={(e) => setExtendedObstetrics({ ...extendedObstetrics, isPregnant: e.target.checked })}
                            className="w-4 h-4 rounded text-pink-600"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-pink-600/80 leading-tight">
                        Fórmula GPCAE: <strong>G</strong> (Gestas totales) · <strong>P</strong> (Partos vaginales) · <strong>C</strong> (Cesáreas) · <strong>A</strong> (Abortos) · <strong>E</strong> (Ectópicos).
                      </p>
                    </div>

                    {/* Fórmula Obstétrica GPCAE con Steppers Táctiles */}
                    <div className="grid grid-cols-5 gap-1.5 text-center">
                      {[
                        { key: 'gestas', label: 'G', full: 'Gestas', val: profile.gestas },
                        { key: 'partos', label: 'P', full: 'Partos', val: profile.partos },
                        { key: 'cesareas', label: 'C', full: 'Cesáreas', val: profile.cesareas },
                        { key: 'abortos', label: 'A', full: 'Abortos', val: profile.abortos },
                        { key: 'ectopicos', label: 'E', full: 'Ectópicos', val: profile.ectopicos },
                      ].map((item) => (
                        <div key={item.key} className="p-2 bg-slate-50 dark:bg-slate-900/70 border border-border/80 rounded-2xl flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-black text-pink-600 block">{item.label}</span>
                            <span className="text-[8px] text-slate-400 block leading-tight">{item.full}</span>
                          </div>
                          <span className="text-base font-black font-mono my-1 text-foreground">{item.val}</span>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const cur = Number(profile[item.key as keyof GinecoObstetricProfile] || 0);
                                if (cur > 0) {
                                  setProfile({ ...profile, [item.key]: cur - 1 });
                                }
                              }}
                              className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs flex items-center justify-center hover:bg-slate-300"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const cur = Number(profile[item.key as keyof GinecoObstetricProfile] || 0);
                                setProfile({ ...profile, [item.key]: cur + 1 });
                              }}
                              className="w-5 h-5 rounded-md bg-pink-500 text-white font-black text-xs flex items-center justify-center hover:bg-pink-600"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Hijos Vivos */}
                    <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-border/80 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-black text-foreground block">Hijos Vivos Actuales</span>
                        <span className="text-[10px] text-slate-400">Total de hijos que conviven / vivos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (profile.hijosVivos > 0) setProfile({ ...profile, hijosVivos: profile.hijosVivos - 1 });
                          }}
                          className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black flex items-center justify-center hover:bg-slate-300"
                        >
                          -
                        </button>
                        <span className="text-sm font-black font-mono w-6 text-center">{profile.hijosVivos}</span>
                        <button
                          type="button"
                          onClick={() => setProfile({ ...profile, hijosVivos: (profile.hijosVivos || 0) + 1 })}
                          className="w-7 h-7 rounded-lg bg-pink-500 text-white font-black flex items-center justify-center hover:bg-pink-600"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Historial Individual de Gestaciones / Partos */}
                    <div className="pt-2 border-t border-border/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                          <Baby size={13} className="text-pink-500" />
                          Historial por Cada Parto / Gestación
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const currentList = extendedObstetrics.deliveries || [];
                            const nextNum = currentList.length + 1;
                            const newDelivery: ObstetricDeliveryItem = {
                              id: `del-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                              gestationNumber: nextNum,
                              deliveryType: 'Parto Vaginal',
                              year: new Date().getFullYear().toString(),
                              sex: 'No especificado',
                              weightGrams: 3200,
                              indicationOrNotes: '',
                            };
                            setExtendedObstetrics({
                              ...extendedObstetrics,
                              deliveries: [...currentList, newDelivery],
                            });
                          }}
                          className="px-2 py-0.5 rounded-lg bg-pink-500/10 hover:bg-pink-500 text-pink-600 hover:text-white text-[10px] font-bold transition-all flex items-center gap-1"
                        >
                          <Plus size={11} /> Agregar Gestación
                        </button>
                      </div>

                      {(!extendedObstetrics.deliveries || extendedObstetrics.deliveries.length === 0) ? (
                        <p className="text-[10px] text-slate-400 italic bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-dashed border-border/80 text-center">
                          No se han registrado gestaciones separadas. Haz clic en &quot;+ Agregar Gestación&quot; para detallar cada parto, cesárea o aborto de forma individual.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {extendedObstetrics.deliveries.map((del, idx) => (
                            <div key={del.id || idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border/80 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black text-pink-600">
                                  Gestación #{del.gestationNumber || idx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = (extendedObstetrics.deliveries || []).filter((_, i) => i !== idx);
                                    setExtendedObstetrics({ ...extendedObstetrics, deliveries: updated });
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                  title="Eliminar este parto"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-1.5">
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Tipo de Evento</label>
                                  <select
                                    value={del.deliveryType || 'Parto Vaginal'}
                                    onChange={(e) => {
                                      const updated = [...(extendedObstetrics.deliveries || [])];
                                      updated[idx] = { ...updated[idx], deliveryType: e.target.value as any };
                                      setExtendedObstetrics({ ...extendedObstetrics, deliveries: updated });
                                    }}
                                    className="w-full p-1.5 rounded-lg bg-card border border-border text-[11px] font-semibold"
                                  >
                                    <option value="Parto Vaginal">Parto Vaginal Eutócico</option>
                                    <option value="Parto Distócico">Parto Vaginal Distócico</option>
                                    <option value="Cesárea">Cesárea</option>
                                    <option value="Aborto">Aborto</option>
                                    <option value="Ectópico">Embarazo Ectópico</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Año / Fecha</label>
                                  <input
                                    type="text"
                                    value={del.year || ''}
                                    onChange={(e) => {
                                      const updated = [...(extendedObstetrics.deliveries || [])];
                                      updated[idx] = { ...updated[idx], year: e.target.value };
                                      setExtendedObstetrics({ ...extendedObstetrics, deliveries: updated });
                                    }}
                                    placeholder="Ej: 2021"
                                    className="w-full p-1.5 rounded-lg bg-card border border-border text-[11px] font-mono"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-1.5">
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Sexo del Recién Nacido</label>
                                  <select
                                    value={del.sex || 'No especificado'}
                                    onChange={(e) => {
                                      const updated = [...(extendedObstetrics.deliveries || [])];
                                      updated[idx] = { ...updated[idx], sex: e.target.value as any };
                                      setExtendedObstetrics({ ...extendedObstetrics, deliveries: updated });
                                    }}
                                    className="w-full p-1.5 rounded-lg bg-card border border-border text-[11px]"
                                  >
                                    <option value="No especificado">No especificado</option>
                                    <option value="Varón">Varón</option>
                                    <option value="Hembra">Hembra</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Peso al Nacer (g)</label>
                                  <input
                                    type="number"
                                    value={del.weightGrams || ''}
                                    onChange={(e) => {
                                      const updated = [...(extendedObstetrics.deliveries || [])];
                                      updated[idx] = { ...updated[idx], weightGrams: Number(e.target.value) };
                                      setExtendedObstetrics({ ...extendedObstetrics, deliveries: updated });
                                    }}
                                    placeholder="Ej: 3200"
                                    className="w-full p-1.5 rounded-lg bg-card border border-border text-[11px] font-mono"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Indicación / Causa / Complicaciones</label>
                                <input
                                  type="text"
                                  value={del.indicationOrNotes || ''}
                                  onChange={(e) => {
                                    const updated = [...(extendedObstetrics.deliveries || [])];
                                    updated[idx] = { ...updated[idx], indicationOrNotes: e.target.value };
                                    setExtendedObstetrics({ ...extendedObstetrics, deliveries: updated });
                                  }}
                                  placeholder={del.deliveryType === 'Cesárea' ? 'Causa de cesárea (ej: Desproporción feto-pélvica)...' : 'Evolución, complicaciones o detalles...'}
                                  className="w-full p-1.5 rounded-lg bg-card border border-border text-[11px]"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Causa de Cesárea: solo si profile.cesareas > 0 o si hay cesáreas registradas */}
                    {(Number(profile.cesareas) > 0 || extendedObstetrics.deliveries?.some((d) => d.deliveryType === 'Cesárea')) && (
                      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                        <label className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase block">
                          Causa Principal de Cesárea Previa
                        </label>
                        <select
                          value={extendedObstetrics.cesareaReason}
                          onChange={(e) => setExtendedObstetrics({ ...extendedObstetrics, cesareaReason: e.target.value })}
                          className="w-full p-2 rounded-xl bg-card border border-border text-[11px] font-semibold"
                        >
                          {CESAREAN_REASON_PRESETS.map((reason) => (
                            <option key={reason} value={reason}>
                              {reason}
                            </option>
                          ))}
                          <option value="OTRA">OTRA (No listada)</option>
                        </select>
                        <input
                          type="text"
                          value={extendedObstetrics.cesareaNotes || ''}
                          onChange={(e) => setExtendedObstetrics({ ...extendedObstetrics, cesareaNotes: e.target.value })}
                          placeholder="Notas adicionales sobre cesárea..."
                          className="w-full p-2 rounded-xl bg-card border border-border text-[11px]"
                        />
                      </div>
                    )}

                    {/* Tipo de Aborto y Resolución: solo si profile.abortos > 0 o si hay abortos registrados */}
                    {(Number(profile.abortos) > 0 || extendedObstetrics.deliveries?.some((d) => d.deliveryType === 'Aborto')) && (
                      <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                        <label className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase block">
                          Detalles de Aborto Previo
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-1">Tipo de Aborto</label>
                            <select
                              value={extendedObstetrics.abortoType}
                              onChange={(e) => setExtendedObstetrics({ ...extendedObstetrics, abortoType: e.target.value })}
                              className="w-full p-2 rounded-xl bg-card border border-border text-[11px] font-semibold"
                            >
                              {ABORTION_TYPE_PRESETS.map((ab) => (
                                <option key={ab} value={ab}>
                                  {ab}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-1">Resolución de Aborto</label>
                            <select
                              value={extendedObstetrics.abortoResolution || 'AMEU'}
                              onChange={(e) => setExtendedObstetrics({ ...extendedObstetrics, abortoResolution: e.target.value })}
                              className="w-full p-2 rounded-xl bg-card border border-border text-[11px] font-semibold"
                            >
                              {ABORTION_RESOLUTION_PRESETS.map((res) => (
                                <option key={res} value={res}>
                                  {res}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Peso Fetal Mayor */}
                    <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-border/80 flex items-center justify-between">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block">Peso Fetal Mayor Previo</label>
                        <span className="text-[9px] text-slate-400">Peso en gramos del hijo más grande</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={extendedObstetrics.pesoMaxFetalGrams || 3500}
                          onChange={(e) => setExtendedObstetrics({ ...extendedObstetrics, pesoMaxFetalGrams: Number(e.target.value) })}
                          className="w-24 p-1.5 rounded-xl bg-card border border-border text-xs font-mono font-bold text-right"
                        />
                        <span className="text-xs font-bold text-slate-400">g</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                PANEL CENTRAL (LÍNEA DE TIEMPO CLÍNICA O CONSULTA ACTIVA DE HOY)
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div className={`${isChartExpanded ? 'lg:col-span-5' : 'lg:col-span-8'} space-y-4`}>
              {!isConsulting ? (
                /* VISTA REPOSO: HISTORIAL CRONOLÓGICO Y TIMELINE */
                <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <FolderOpen size={15} className="text-pink-500" /> Línea de Tiempo Clínica
                      </h3>
                      <p className="text-[11px] text-slate-400">Consultas previas y evolución temporal</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsConsulting(true)}
                      className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-black shadow-xs transition-all flex items-center gap-1 btn-haptic"
                    >
                      <Plus size={14} /> Atender Hoy
                    </button>
                  </div>

                  {encountersHistory.length === 0 ? (
                    <div className="text-center py-10 space-y-2">
                      <Baby size={28} className="mx-auto text-slate-300" />
                      <p className="text-xs font-bold text-slate-400">Esta paciente aún no tiene consultas registradas.</p>
                      <button
                        type="button"
                        onClick={() => setIsConsulting(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-pink-600 hover:bg-pink-500 hover:text-white transition-all"
                      >
                        Iniciar Primera Consulta
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                      {encountersHistory.map((enc) => (
                        <div
                          key={enc.id}
                          onClick={() => {
                            setSelectedHistoryEncounter(enc);
                            setIsHistoryDetailOpen(true);
                          }}
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 hover:bg-pink-500/5 hover:border-pink-500/30 border border-border/70 space-y-2 cursor-pointer transition-all group"
                        >
                          <div className="flex items-center justify-between text-xs font-black">
                            <span className="text-foreground group-hover:text-pink-600 transition-colors flex items-center gap-1.5">
                              <FileText size={13} className="text-pink-500" />
                              {enc.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {enc.createdAt ? new Date(enc.createdAt).toLocaleDateString() : 'Fecha'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                            {enc.content || enc.metadata?.soap?.assessment || 'Sin notas'}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-border/40">
                            <div className="flex items-center gap-2">
                              {enc.metadata?.vitals?.bloodPressure && (
                                <span>TA: {enc.metadata.vitals.bloodPressure}</span>
                              )}
                              {enc.metadata?.vitals?.weightKg && (
                                <span>· Peso: {enc.metadata.vitals.weightKg} kg</span>
                              )}
                            </div>
                            <span className="text-pink-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                              <Eye size={12} /> Ver Registro Completo ↗
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* VISTA ACTIVA: CONSULTA DE HOY EN CURSO */
                <div className="bg-card border border-pink-500/40 rounded-3xl p-5 shadow-md space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div>
                      <span className="text-[10px] font-black text-pink-600 uppercase tracking-wider block">
                        Estación de Consulta Activa
                      </span>
                      <h3 className="text-sm font-black text-foreground">Evolución Médica & Récipe de Hoy</h3>
                    </div>
                    {/* Selector de Tipo de Consulta */}
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setEncounterType('prenatal')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          encounterType === 'prenatal' ? 'bg-card text-pink-600 shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        Prenatal
                      </button>
                      <button
                        type="button"
                        onClick={() => setEncounterType('ginecologia')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          encounterType === 'ginecologia' ? 'bg-card text-pink-600 shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        Ginecológica
                      </button>
                    </div>
                  </div>

                  {/* Triaje de Hoy */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-border/70 text-xs">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 block mb-0.5">Tensión Arterial</span>
                      <input
                        type="text"
                        value={vitals.bloodPressure}
                        onChange={(e) => setVitals({ ...vitals, bloodPressure: e.target.value })}
                        className="w-full p-1.5 rounded-lg bg-card border border-border font-mono font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 block mb-0.5">Peso (kg)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={vitals.weightKg}
                        onChange={(e) => setVitals({ ...vitals, weightKg: Number(e.target.value) })}
                        placeholder="65.0"
                        className="w-full p-1.5 rounded-lg bg-card border border-border font-mono font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 block mb-0.5">IMC</span>
                      <p className="p-1.5 font-mono font-black text-xs" style={{ color: bmiInfo.color }}>
                        {bmiInfo.bmi > 0 ? bmiInfo.bmi : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Examen Obstétrico si es Prenatal */}
                  {encounterType === 'prenatal' && (
                    <div className="p-3 bg-pink-500/5 rounded-2xl border border-pink-500/20 space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Altura Uterina (cm)</label>
                          <input
                            type="number"
                            value={obstetricExam.uterineHeightCm || ''}
                            onChange={(e) => setObstetricExam({ ...obstetricExam, uterineHeightCm: Number(e.target.value) })}
                            placeholder="Ej: 28"
                            className="w-full p-2 rounded-xl bg-card border border-border font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">FCF Fetal (lpm)</label>
                          <input
                            type="number"
                            value={obstetricExam.fetalHeartRateBpm || ''}
                            onChange={(e) => setObstetricExam({ ...obstetricExam, fetalHeartRateBpm: Number(e.target.value) })}
                            placeholder="Ej: 142"
                            className="w-full p-2 rounded-xl bg-card border border-border font-mono font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Evolución SOAP & CIE-10 */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Motivo & Subjetivo</label>
                      <input
                        type="text"
                        value={soapSubjective}
                        onChange={(e) => setSoapSubjective(e.target.value)}
                        placeholder="Paciente acude a control, refiere..."
                        className="w-full p-2 rounded-xl bg-card border border-border"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Impresión Diagnóstica (Assessment)</label>
                      <input
                        type="text"
                        value={soapAssessment}
                        onChange={(e) => setSoapAssessment(e.target.value)}
                        placeholder="Embarazo de 28 semanas en evolución normal..."
                        className="w-full p-2 rounded-xl bg-card border border-border font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Plan de Tratamiento & Récipe</label>
                      <textarea
                        rows={2}
                        value={prescriptionMedications}
                        onChange={(e) => setPrescriptionMedications(e.target.value)}
                        placeholder="Hierro + Ácido Fólico 1 tab VO OD..."
                        className="w-full p-2 rounded-xl bg-card border border-border"
                      />
                    </div>
                  </div>

                  {/* Acciones de la Consulta */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <button
                      type="button"
                      onClick={() => setIsPrintModalOpen(true)}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                    >
                      <Printer size={14} /> Imprimir Récipe
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEncounter}
                      disabled={isSavingEncounter}
                      className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-black shadow-md shadow-pink-500/20 transition-all flex items-center gap-1.5 btn-haptic disabled:opacity-50"
                    >
                      <Save size={14} /> {isSavingEncounter ? 'Guardando...' : 'Guardar Consulta'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                PANEL DERECHO: GABINETE DE ESTUDIOS ESPECIALIZADOS & COBRANZA
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div className={`${isChartExpanded ? 'lg:col-span-3' : 'lg:col-span-4'} space-y-4`}>
              {/* Suite de Estudios Himego */}
              <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Stethoscope size={15} className="text-pink-500" /> Gabinete de Estudios
                </h3>
                <p className="text-[11px] text-slate-400">Lanzadores directos pre-cargados con la paciente</p>

                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setIsEcoGinecoOpen(true)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-pink-500/10 hover:border-pink-500/30 border border-border text-left text-xs font-bold transition-all flex items-center gap-2 group"
                  >
                    <Activity size={15} className="text-pink-500" />
                    <span className="truncate group-hover:text-pink-600">Eco Ginecológico 3D</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEcoObsOpen(true)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-blue-500/10 hover:border-blue-500/30 border border-border text-left text-xs font-bold transition-all flex items-center gap-2 group"
                  >
                    <Baby size={15} className="text-blue-500" />
                    <span className="truncate group-hover:text-blue-600">Eco Obstétrico (Hadlock)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsExamsOpen(true)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-purple-500/10 hover:border-purple-500/30 border border-border text-left text-xs font-bold transition-all flex items-center gap-2 group"
                  >
                    <Microscope size={15} className="text-purple-500" />
                    <span className="truncate group-hover:text-purple-600">Citología & Bethesda</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsLabPanelOpen(true)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-border text-left text-xs font-bold transition-all flex items-center gap-2 group"
                  >
                    <FlaskConical size={15} className="text-emerald-500" />
                    <span className="truncate group-hover:text-emerald-600">Laboratorio Paramétrico</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSurgeriesOpen(true)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-amber-500/10 hover:border-amber-500/30 border border-border text-left text-xs font-bold transition-all flex items-center gap-2 group"
                  >
                    <Scissors size={15} className="text-amber-500" />
                    <span className="truncate group-hover:text-amber-600">Quirófano & Honorarios</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDocumentsOpen(true)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-indigo-500/10 hover:border-indigo-500/30 border border-border text-left text-xs font-bold transition-all flex items-center gap-2 group"
                  >
                    <FileText size={15} className="text-indigo-500" />
                    <span className="truncate group-hover:text-indigo-600">Reposos LOTTT & Cartas</span>
                  </button>
                </div>
              </div>

              {/* Módulo de Cobranza y Caja POS */}
              <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <DollarSign size={15} className="text-emerald-500" /> Cobro en Caja POS
                </h3>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-border text-xs space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Monto Sesión:</span>
                    <span className="font-mono">${totalUSD.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>Tasa BCV:</span>
                    <span>Bs {exchangeRate}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSendToCashier}
                  disabled={isSendingToCashier || sessionProcedures.length === 0}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 btn-haptic disabled:opacity-50"
                >
                  <Send size={14} /> Enviar Orden a Caja
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: NUEVA PACIENTE RÁPIDA
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isNewPatientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <UserPlus size={18} className="text-pink-500" /> Crear Nueva Paciente
              </h3>
              <button
                type="button"
                onClick={() => setIsNewPatientModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  placeholder="Nombres y Apellidos de la paciente..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Cédula</label>
                  <input
                    type="text"
                    value={newPatientTaxId}
                    onChange={(e) => setNewPatientTaxId(e.target.value)}
                    placeholder="V-..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={newPatientPhone}
                    onChange={(e) => setNewPatientPhone(e.target.value)}
                    placeholder="0412 / 0414..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border"
                  />
                </div>
              </div>

              {/* Grupo Sanguíneo */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Grupo Sanguíneo & Factor Rh</label>
                <div className="flex flex-wrap gap-1">
                  {BLOOD_TYPES.map((bt) => (
                    <button
                      key={bt}
                      type="button"
                      onClick={() => setNewPatientBloodType(bt)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                        newPatientBloodType === bt
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'bg-card border border-border text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {bt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ubicación: Estado y Ciudad */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Estado (Venezuela)</label>
                  <select
                    value={newPatientState}
                    onChange={(e) => {
                      const st = e.target.value;
                      setNewPatientState(st);
                      const cities = getCitiesForState(st);
                      setNewPatientCity(cities[0] || '');
                    }}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border text-xs font-semibold"
                  >
                    {VENEZUELA_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Ciudad</label>
                  <select
                    value={newPatientCity}
                    onChange={(e) => setNewPatientCity(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border text-xs font-semibold"
                  >
                    {getCitiesForState(newPatientState).map((ct) => (
                      <option key={ct} value={ct}>
                        {ct}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Alergias con chips */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-red-500">Alergias Conocidas</label>
                  <span className="text-[9px] text-slate-400">Toca para agregar</span>
                </div>
                <input
                  type="text"
                  value={newPatientAllergies}
                  onChange={(e) => setNewPatientAllergies(e.target.value)}
                  placeholder="Ninguna o Penicilina, AINEs..."
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border mb-1.5"
                />
                <div className="flex flex-wrap gap-1">
                  {['Ninguna conocida', 'Penicilina', 'AINEs / Ibuprofeno', 'Sulfas', 'Dipirona', 'Látex'].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        if (chip === 'Ninguna conocida') {
                          setNewPatientAllergies('Ninguna conocida (NKDA)');
                        } else {
                          const cur = newPatientAllergies === 'Ninguna conocida (NKDA)' ? '' : newPatientAllergies.trim();
                          setNewPatientAllergies(cur ? `${cur}, ${chip}` : chip);
                        }
                      }}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-pink-500 hover:text-white transition-all"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsNewPatientModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateFastPatient}
                disabled={isSubmittingPatient}
                className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-black shadow-md shadow-pink-500/20 disabled:opacity-50"
              >
                {isSubmittingPatient ? 'Creando...' : 'Crear Paciente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modales Especializados Himego */}
      <UltrasoundGinecoModal
        isOpen={isEcoGinecoOpen}
        onClose={() => setIsEcoGinecoOpen(false)}
        patientId={selectedPatientId}
        patientName={activePatient?.name || 'Paciente'}
        doctorName={activeDoctor?.name || 'Ginecólogo/a'}
        onSaveReport={handleSaveEcoGinecoReport}
      />

      <UltrasoundObstetricModal
        isOpen={isEcoObsOpen}
        onClose={() => setIsEcoObsOpen(false)}
        patientId={selectedPatientId}
        patientName={activePatient?.name || 'Paciente'}
        doctorName={activeDoctor?.name || 'Ginecólogo/a'}
        onSaveReport={handleSaveEcoObsReport}
      />

      <GinecoExamsModal
        isOpen={isExamsOpen}
        onClose={() => setIsExamsOpen(false)}
        patientId={selectedPatientId}
        patientName={activePatient?.name || 'Paciente'}
        doctorName={activeDoctor?.name || 'Ginecólogo/a'}
        onSaveExams={handleSaveExamsData}
      />

      <GinecoLabPanelModal
        isOpen={isLabPanelOpen}
        onClose={() => setIsLabPanelOpen(false)}
        patientId={selectedPatientId}
        patientName={activePatient?.name || 'Paciente'}
        doctorName={activeDoctor?.name || 'Ginecólogo/a'}
        onSaveLab={handleSaveLabRecord}
      />

      <GinecoSurgeriesModal
        isOpen={isSurgeriesOpen}
        onClose={() => setIsSurgeriesOpen(false)}
        patientId={selectedPatientId}
        patientName={activePatient?.name || 'Paciente'}
        doctorName={activeDoctor?.name || 'Ginecólogo/a'}
        exchangeRate={exchangeRate}
        onSaveRecord={(rec) => handleSaveSurgeryRecord(rec, false)}
        onDispatchToPOS={(rec) => handleSaveSurgeryRecord(rec, true)}
      />

      <GinecoDocumentsModal
        isOpen={isDocumentsOpen}
        onClose={() => setIsDocumentsOpen(false)}
        patientId={selectedPatientId}
        patientName={activePatient?.name || 'Paciente'}
        patientTaxId={activePatient?.tax_id}
        doctorName={activeDoctor?.name || 'Ginecólogo/a'}
        doctorLicense={activeDoctor?.metadata?.license_number || activeDoctor?.metadata?.mpps}
        fumDate={profile.fum}
      />

      <GinecoPrescriptionPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        patientName={activePatient?.name || 'Paciente'}
        patientTaxId={activePatient?.tax_id}
        patientPhone={activePatient?.phone}
        doctorName={activeDoctor?.name || 'Ginecólogo/a Tratante'}
        doctorLicense={activeDoctor?.metadata?.license_number || activeDoctor?.metadata?.mpps}
        gestationalWeeks={0}
        cie10={selectedCie10 || undefined}
        prescription={{
          medications: prescriptionMedications,
          instructions: prescriptionInstructions,
          labOrders: prescriptionLabOrders,
        }}
        clinicName={currentTenant?.name || 'CENTRO GINECOLÓGICO & OBSTÉTRICO'}
      />

      <GinecoEncounterDetailModal
        isOpen={isHistoryDetailOpen}
        onClose={() => {
          setIsHistoryDetailOpen(false);
          setSelectedHistoryEncounter(null);
        }}
        encounter={selectedHistoryEncounter}
        patientName={activePatient?.name || 'Paciente'}
        patientTaxId={activePatient?.tax_id}
        patientPhone={activePatient?.phone}
        doctorName={selectedHistoryEncounter?.metadata?.doctor_name || activeDoctor?.name || 'Ginecólogo/a Tratante'}
        doctorLicense={activeDoctor?.metadata?.license_number || activeDoctor?.metadata?.mpps}
        clinicName={currentTenant?.name || 'CENTRO GINECOLÓGICO & OBSTÉTRICO'}
      />

      <GinecoClinicalGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
