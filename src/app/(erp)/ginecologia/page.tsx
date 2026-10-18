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
  Download
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
  GinecoProcedureDefinition 
} from '@/lib/ginecologia/proceduresCatalog';
import { GestationalWheelWidget } from '@/components/ginecologia/GestationalWheelWidget';
import { GinecoPrescriptionPrintModal } from '@/components/ginecologia/GinecoPrescriptionPrintModal';
import { GinecoClinicalGuideModal } from '@/components/ginecologia/GinecoClinicalGuideModal';
import { UltrasoundGinecoModal, GinecoUltrasoundReport } from '@/components/ginecologia/UltrasoundGinecoModal';
import { UltrasoundObstetricModal, ObstetricUltrasoundReport } from '@/components/ginecologia/UltrasoundObstetricModal';
import { GinecoExamsModal, GinecoExamsData } from '@/components/ginecologia/GinecoExamsModal';
import { GinecoLabPanelModal, GinecoLabRecord } from '@/components/ginecologia/GinecoLabPanelModal';
import { GinecoSurgeriesModal, SurgicalInterventionRecord } from '@/components/ginecologia/GinecoSurgeriesModal';
import { GinecoDocumentsModal } from '@/components/ginecologia/GinecoDocumentsModal';
import { calculateBMI } from '@/lib/medical/clinicalCalculators';

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
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // Pacientes, Citas y Médicos
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);

  // Estado del Centro de Mando
  const [isConsulting, setIsConsulting] = useState(false);
  const [patientChartTab, setPatientChartTab] = useState<PatientChartTab>('paciente');

  // Modal para nueva paciente rápida
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientTaxId, setNewPatientTaxId] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientBirthDate, setNewPatientBirthDate] = useState('');
  const [newPatientAllergies, setNewPatientAllergies] = useState('');
  const [isSubmittingPatient, setIsSubmittingPatient] = useState(false);

  // Búsqueda interactiva
  const [patientSearchQuery, setPatientSearchQuery] = useState('');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FICHA BIOLÓGICA PERMANENTE (HIMEGO V9+ 5 PESTAÑAS)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const [demographics, setDemographics] = useState({
    address: '',
    city: '',
    state: '',
    phoneHome: '',
    phoneCell: '',
    email: '',
    civilStatus: 'Casada',
    occupation: 'Profesional',
    education: 'Universitario',
    referredBy: 'Iniciativa propia',
    birthPlace: '',
  });

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
  const [extendedObstetrics, setExtendedObstetrics] = useState({
    partosEutocicos: 0,
    partosDistocicos: 0,
    cesareaReason: 'ESTRECHA',
    abortoType: 'ESPONTANEO',
    hijosVarones: 0,
    hijosHembras: 0,
    pesoMaxFetalGrams: 3500,
    pesoMinFetalGrams: 2900,
    firstDeliveryDate: '',
    lastDeliveryDate: '',
    isPregnant: true,
    fppNaegele: '',
    plannedDeliveryPlace: 'Clínica Privada',
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
    const q = patientSearchQuery.toLowerCase();
    return patients.filter((p) =>
      p.name?.toLowerCase().includes(q) ||
      p.tax_id?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q)
    );
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

      if (itemsRes.success && itemsRes.items) {
        const merged = mergeTenantGinecoServices(itemsRes.items as any[]);
        setCatalogProcedures(merged);
      }

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
      if (meta.demographics) setDemographics((prev) => ({ ...prev, ...meta.demographics }));
      if (meta.spouse_data) setSpouseData((prev) => ({ ...prev, ...meta.spouse_data }));
      if (meta.medical_antecedents) setMedicalAntecedents((prev) => ({ ...prev, ...meta.medical_antecedents }));
      if (meta.extended_obstetrics) setExtendedObstetrics((prev) => ({ ...prev, ...meta.extended_obstetrics }));
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
              {/* Botón QR de Reservas */}
              <button
                type="button"
                onClick={() => setIsQRModalOpen(true)}
                className="px-3.5 py-2.5 rounded-2xl bg-card border border-border hover:border-pink-500/40 text-xs font-bold text-foreground transition-all flex items-center gap-2 shadow-2xs btn-haptic"
                title="Ver y Compartir Código QR de Reservas para Clientes"
              >
                <QrCode size={16} className="text-pink-500" />
                <span>QR de Reservas</span>
              </button>

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
                  FUM: {profile.fum || 'Sin FUM'} | Médico: {activeDoctor?.name || 'Ginecólogo/a'} | Tel: {activePatient?.phone || 'Sin teléfono'}
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

          {/* EL COCKPIT: DISTRIBUCIÓN EN 3 PANELES */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                PANEL IZQUIERDO (4/12 = 33%): LA FICHA BIOLÓGICA PERMANENTE (5 PESTAÑAS HIMEGO)
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div className="lg:col-span-4 bg-card border border-border/80 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <User size={15} className="text-pink-500" /> Ficha Médica Permanente
                </h3>
                <button
                  type="button"
                  onClick={handleSaveBiologicalChart}
                  disabled={isSavingChart}
                  className="px-2.5 py-1 rounded-lg bg-pink-500/10 hover:bg-pink-500 text-pink-600 hover:text-white text-[11px] font-black transition-all disabled:opacity-50"
                >
                  {isSavingChart ? 'Guardando...' : 'Guardar Ficha'}
                </button>
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
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Dirección de Habitación</label>
                      <input
                        type="text"
                        value={demographics.address}
                        onChange={(e) => setDemographics({ ...demographics, address: e.target.value })}
                        placeholder="Calle, Residencia, Apto..."
                        className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Ciudad</label>
                        <input
                          type="text"
                          value={demographics.city}
                          onChange={(e) => setDemographics({ ...demographics, city: e.target.value })}
                          className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Estado</label>
                        <input
                          type="text"
                          value={demographics.state}
                          onChange={(e) => setDemographics({ ...demographics, state: e.target.value })}
                          className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Estado Civil</label>
                        <select
                          value={demographics.civilStatus}
                          onChange={(e) => setDemographics({ ...demographics, civilStatus: e.target.value })}
                          className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border"
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
                          className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. CÓNYUGE / PAREJA */}
                {patientChartTab === 'conyugue' && (
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Nombre de la Pareja</label>
                      <input
                        type="text"
                        value={spouseData.name}
                        onChange={(e) => setSpouseData({ ...spouseData, name: e.target.value })}
                        className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Cédula</label>
                        <input
                          type="text"
                          value={spouseData.taxId}
                          onChange={(e) => setSpouseData({ ...spouseData, taxId: e.target.value })}
                          className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Grupo Sanguíneo & Rh</label>
                        <input
                          type="text"
                          value={spouseData.bloodTypeRh}
                          onChange={(e) => setSpouseData({ ...spouseData, bloodTypeRh: e.target.value })}
                          placeholder="Ej: O+ o A-"
                          className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border font-black text-pink-600"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Antecedentes de la Pareja</label>
                      <textarea
                        rows={2}
                        value={spouseData.medicalNotes}
                        onChange={(e) => setSpouseData({ ...spouseData, medicalNotes: e.target.value })}
                        className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border"
                      />
                    </div>
                  </div>
                )}

                {/* 3. ANTECEDENTES F/P */}
                {patientChartTab === 'antecedentes_fp' && (
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-red-500 block mb-1">Alergias Medicamentosas (Crítico)</label>
                      <input
                        type="text"
                        value={medicalAntecedents.personalAllergies}
                        onChange={(e) => setMedicalAntecedents({ ...medicalAntecedents, personalAllergies: e.target.value })}
                        placeholder="Penicilina, AINEs, Yodo..."
                        className="w-full p-2 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-500/30 text-red-600 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Cirugías Previas</label>
                      <input
                        type="text"
                        value={medicalAntecedents.personalSurgeries}
                        onChange={(e) => setMedicalAntecedents({ ...medicalAntecedents, personalSurgeries: e.target.value })}
                        placeholder="Apendicectomía, Laparoscopia..."
                        className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Antecedentes Familiares (HTA, DM, Cáncer)</label>
                      <textarea
                        rows={2}
                        value={medicalAntecedents.familyNotes}
                        onChange={(e) => setMedicalAntecedents({ ...medicalAntecedents, familyNotes: e.target.value })}
                        className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border"
                      />
                    </div>
                  </div>
                )}

                {/* 4. ANT GIN */}
                {patientChartTab === 'ant_gin' && (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Menarquia (edad)</label>
                        <input
                          type="number"
                          value={profile.menarquia || 12}
                          onChange={(e) => setProfile({ ...profile, menarquia: Number(e.target.value) })}
                          className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Ritmo Menstrual</label>
                        <input
                          type="text"
                          value={profile.ritmoMenstrual || '28 x 4'}
                          onChange={(e) => setProfile({ ...profile, ritmoMenstrual: e.target.value })}
                          className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border font-mono font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Método Anticonceptivo (MAC)</label>
                      <select
                        value={profile.metodoAnticonceptivo || 'Ninguno'}
                        onChange={(e) => setProfile({ ...profile, metodoAnticonceptivo: e.target.value })}
                        className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border"
                      >
                        <option value="Ninguno">Ninguno</option>
                        <option value="Anticonceptivos Orales">Anticonceptivos Orales (AOC)</option>
                        <option value="Inyectable Mensual">Inyectable Mensual</option>
                        <option value="DIU T de Cobre">DIU T de Cobre</option>
                        <option value="DIU Mirena / Hormonal">DIU Mirena / Hormonal</option>
                        <option value="Implante Subdérmico">Implante Subdérmico</option>
                        <option value="Preservativo">Preservativo</option>
                        <option value="Esterilización Quirúrgica">Esterilización Quirúrgica</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* 5. ANT OBS */}
                {patientChartTab === 'ant_obs' && (
                  <div className="space-y-2.5">
                    {/* Switch En Gestante */}
                    <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-between">
                      <span className="text-[11px] font-black text-pink-700 dark:text-pink-300">
                        ¿Actualmente en Estado Gestante?
                      </span>
                      <input
                        type="checkbox"
                        checked={extendedObstetrics.isPregnant}
                        onChange={(e) => setExtendedObstetrics({ ...extendedObstetrics, isPregnant: e.target.checked })}
                        className="w-4 h-4 rounded text-pink-600"
                      />
                    </div>

                    {/* Fórmula Obstétrica G-P-C-A-E */}
                    <div className="grid grid-cols-5 gap-1 text-center">
                      <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-xl">
                        <span className="text-[9px] font-black text-slate-400 block">G</span>
                        <span className="text-sm font-black font-mono">{profile.gestas}</span>
                      </div>
                      <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-xl">
                        <span className="text-[9px] font-black text-slate-400 block">P</span>
                        <span className="text-sm font-black font-mono">{profile.partos}</span>
                      </div>
                      <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-xl">
                        <span className="text-[9px] font-black text-slate-400 block">C</span>
                        <span className="text-sm font-black font-mono">{profile.cesareas}</span>
                      </div>
                      <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-xl">
                        <span className="text-[9px] font-black text-slate-400 block">A</span>
                        <span className="text-sm font-black font-mono">{profile.abortos}</span>
                      </div>
                      <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-xl">
                        <span className="text-[9px] font-black text-slate-400 block">E</span>
                        <span className="text-sm font-black font-mono">{profile.ectopicos}</span>
                      </div>
                    </div>

                    {/* Desplegables Himego de Cesáreas y Abortos */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Causa de Cesárea</label>
                        <select
                          value={extendedObstetrics.cesareaReason}
                          onChange={(e) => setExtendedObstetrics({ ...extendedObstetrics, cesareaReason: e.target.value })}
                          className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border text-[11px]"
                        >
                          <option value="ESTRECHA">ESTRECHA (Pelvis)</option>
                          <option value="PODALICO">PODÁLICO</option>
                          <option value="ITERATIVA">ITERATIVA (2+ cesáreas)</option>
                          <option value="SFA">SFA (Sufrimiento fetal)</option>
                          <option value="PLACENTA PREVIA">PLACENTA PREVIA</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Tipo de Aborto</label>
                        <select
                          value={extendedObstetrics.abortoType}
                          onChange={(e) => setExtendedObstetrics({ ...extendedObstetrics, abortoType: e.target.value })}
                          className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border text-[11px]"
                        >
                          <option value="ESPONTANEO">ESPONTÁNEO</option>
                          <option value="TERAPEUTICO">TERAPÉUTICO</option>
                          <option value="HUEVO ANEMBRIONADO">HUEVO ANEMBRIONADO</option>
                          <option value="SEPTICO">SÉPTICO</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                PANEL CENTRAL (5/12 = 42%): LÍNEA DE TIEMPO CLÍNICA O CONSULTA ACTIVA DE HOY
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div className="lg:col-span-5 space-y-4">
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
                        <div key={enc.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/70 space-y-2">
                          <div className="flex items-center justify-between text-xs font-black">
                            <span className="text-foreground">{enc.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {enc.createdAt ? new Date(enc.createdAt).toLocaleDateString() : 'Fecha'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                            {enc.content || enc.metadata?.soap?.assessment || 'Sin notas'}
                          </p>
                          {enc.metadata?.vitals && (
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono pt-1 border-t border-border/40">
                              <span>TA: {enc.metadata.vitals.bloodPressure || '—'}</span>
                              <span>·</span>
                              <span>Peso: {enc.metadata.vitals.weightKg ? `${enc.metadata.vitals.weightKg} kg` : '—'}</span>
                            </div>
                          )}
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
                PANEL DERECHO (3/12 = 25%): GABINETE DE ESTUDIOS ESPECIALIZADOS & COBRANZA
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div className="lg:col-span-3 space-y-4">
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
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-foreground">Crear Nueva Paciente</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
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
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={newPatientPhone}
                    onChange={(e) => setNewPatientPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Alergias Conocidas</label>
                <input
                  type="text"
                  value={newPatientAllergies}
                  onChange={(e) => setNewPatientAllergies(e.target.value)}
                  placeholder="Ninguna o Penicilina, AINEs..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border"
                />
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
                className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-black shadow-md shadow-pink-500/20"
              >
                {isSubmittingPatient ? 'Creando...' : 'Crear Paciente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: QR DE RESERVAS EN LÍNEA PARA CLIENTES
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isQRModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center mx-auto shadow-md">
              <QrCode size={26} />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">QR de Reservas en Línea</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Los clientes pueden escanear este código con su teléfono para agendar su cita de ginecología o consulta.
              </p>
            </div>

            {/* Código QR Generado Dinámicamente */}
            <div className="p-4 bg-white rounded-2xl shadow-inner border border-slate-200 inline-block mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(bookingPublicUrl)}`}
                alt="QR de Reservas"
                className="w-48 h-48 mx-auto"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border text-[11px] text-slate-500 font-mono break-all text-left">
              {bookingPublicUrl}
            </div>

            {/* Acciones del QR */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(bookingPublicUrl)}`;
                    const response = await fetch(qrUrl);
                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = `QR_Reservas_${currentTenant?.name || 'Clinica'}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(blobUrl);
                    toast({ variant: 'success', title: 'QR Descargado', description: 'Imagen PNG guardada en tu equipo.' });
                  } catch (e) {
                    window.open(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(bookingPublicUrl)}`, '_blank');
                  }
                }}
                className="py-2.5 px-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Download size={14} /> Descargar PNG
              </button>

              <button
                type="button"
                onClick={() => {
                  const text = encodeURIComponent(`Hola! Puedes reservar tu cita médica en línea aquí: ${bookingPublicUrl}`);
                  window.open(`https://wa.me/?text=${text}`, '_blank');
                }}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Phone size={14} /> WhatsApp
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(bookingPublicUrl);
                  toast({ variant: 'success', title: 'Enlace Copiado', description: 'Enlace de reservas copiado al portapapeles.' });
                }}
                className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-foreground transition-all flex items-center justify-center gap-1.5"
              >
                <Share2 size={14} /> Copiar Link
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-foreground transition-all flex items-center justify-center gap-1.5"
              >
                <Printer size={14} /> Imprimir Afiche
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsQRModalOpen(false)}
              className="text-xs font-bold text-slate-400 hover:text-foreground pt-1 block mx-auto"
            >
              Cerrar
            </button>
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

      <GinecoClinicalGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
