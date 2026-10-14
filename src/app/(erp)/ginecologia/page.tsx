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
  CheckSquare, 
  Square,
  Shield,
  HelpCircle,
  FolderOpen,
  X,
  BookOpen
} from 'lucide-react';
import { useERPStore } from '@/store/useERPStore';
import { useActionActor } from '@/hooks/useActionActor';
import { useToast } from '@/components/core/ToastProvider';
import { useViewModeStore } from '@/store/useViewModeStore';
import { getEntitiesAction, createEntityAction } from '@/app/actions/entities';
import { getItemsAction } from '@/app/actions/items';
import { 
  getGinecoPatientRecordAction, 
  saveGinecoEncounterAction, 
  sendGinecoOrderToCashierAction, 
  getPatientGinecoWorkOrdersAction, 
  updateGinecoWorkOrderStepAction,
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
import { calculateBMI } from '@/lib/medical/clinicalCalculators';

type ActiveTab = 'obstetricia' | 'ginecologia' | 'soap_recipe' | 'procedimientos' | 'historial';

export default function GinecologiaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTenant, session } = useERPStore();
  const { viewMode, toggleViewMode, isMobile } = useViewModeStore();
  const tenantMeta = (currentTenant?.metadata as Record<string, any>) || {};
  const exchangeRate = Number(tenantMeta.exchange_rate?.rate || tenantMeta.exchange_rate || 850.0);
  const actor = useActionActor();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>('obstetricia');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Pacientes y Médicos
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);

  // Modal para nueva paciente
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientTaxId, setNewPatientTaxId] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientBirthDate, setNewPatientBirthDate] = useState('');
  const [newPatientAllergies, setNewPatientAllergies] = useState('');
  const [isSubmittingPatient, setIsSubmittingPatient] = useState(false);

  // Perfil Gineco-Obstétrico de la Paciente Activa
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
    alergias: '',
    patologiasCronicas: '',
  });

  // Signos Vitales Maternos
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

  // Examen Obstétrico
  const [obstetricExam, setObstetricExam] = useState({
    uterineHeightCm: 0,
    fetalHeartRateBpm: 140,
    fetalMovements: 'presentes' as 'presentes' | 'disminuidos' | 'ausentes',
    presentation: 'cefalica' as 'cefalica' | 'podalica' | 'transversa',
    edema: 'ausente' as 'ausente' | 'leve' | 'moderado' | 'severo',
    ultrasoundFindings: '',
  });

  // Examen Ginecológico & Citología
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

  // Búsqueda interactiva de pacientes
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);

  // SOAP & Diagnóstico
  const [chiefComplaint, setChiefComplaint] = useState('Control prenatal de rutina.');
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
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Catálogo de Procedimientos & Presupuesto de la Sesión
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

  // Historial de Consultas & OTs
  const [encountersHistory, setEncountersHistory] = useState<any[]>([]);
  const [patientWorkOrders, setPatientWorkOrders] = useState<PatientGinecoWorkOrder[]>([]);
  const [isLoadingWorkOrders, setIsLoadingWorkOrders] = useState(false);

  const activePatient = useMemo(() => {
    return patients.find((p) => p.id === selectedPatientId) || null;
  }, [patients, selectedPatientId]);

  const filteredPatients = useMemo(() => {
    if (!patientSearchQuery.trim()) return patients.slice(0, 30);
    const q = patientSearchQuery.toLowerCase();
    return patients.filter((p) =>
      p.name?.toLowerCase().includes(q) ||
      p.tax_id?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q)
    );
  }, [patients, patientSearchQuery]);

  const activeDoctor = useMemo(() => {
    return doctors.find((d) => d.id === selectedDoctorId) || null;
  }, [doctors, selectedDoctorId]);

  // Cálculo de IMC Materno dinámico con validación de peso y talla
  const bmiInfo = useMemo(() => {
    const w = Number(vitals.weightKg);
    const h = Number(vitals.heightCm);
    if (!w || !h || w <= 0 || h <= 0) {
      return { bmi: 0, category: 'Pendiente de registrar peso/talla', color: '#94a3b8' };
    }
    return calculateBMI(w, h);
  }, [vitals.weightKg, vitals.heightCm]);

  // Carga inicial de pacientes, médicos y catálogo
  const loadInitialData = useCallback(async () => {
    if (!currentTenant?.id || !actor) return;
    setIsLoadingPatients(true);
    try {
      const [patientsRes, employeesRes, itemsRes] = await Promise.all([
        getEntitiesAction(currentTenant.id, 'customer', 200, actor),
        getEntitiesAction(currentTenant.id, 'employee', 100, actor),
        getItemsAction(currentTenant.id, undefined, 200, actor),
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
    } catch (err) {
      console.error('Error cargando datos de Ginecología:', err);
    } finally {
      setIsLoadingPatients(false);
    }
  }, [currentTenant?.id, actor, selectedDoctorId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Selección automática por URL (?patient=ID o ?client_id=ID)
  useEffect(() => {
    const urlPatientId = searchParams.get('patient') || searchParams.get('client_id');
    if (urlPatientId && patients.length > 0) {
      const found = patients.find((p) => p.id === urlPatientId);
      if (found) {
        setSelectedPatientId(found.id);
      }
    }
  }, [searchParams, patients]);

  // Carga de expediente al seleccionar paciente + Session Guard Draft Recovery
  useEffect(() => {
    if (!selectedPatientId || !currentTenant?.id || !actor) return;

    // 1. Cargar expediente desde la base de datos
    getGinecoPatientRecordAction(selectedPatientId, currentTenant.id, actor).then((res) => {
      if (res.success && res.profile) {
        setProfile(res.profile);
      }
      if (res.success && res.encounters) {
        setEncountersHistory(res.encounters);
      }
    });

    // 2. Cargar OTs de la paciente
    setIsLoadingWorkOrders(true);
    getPatientGinecoWorkOrdersAction(selectedPatientId, currentTenant.id, actor)
      .then((res) => {
        if (res.success && res.workOrders) {
          setPatientWorkOrders(res.workOrders);
        }
      })
      .finally(() => setIsLoadingWorkOrders(false));

    // 3. Draft Recovery (recuperación de borrador local)
    try {
      const draftKey = `rendo_gineco_draft_${selectedPatientId}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.soapSubjective) setSoapSubjective(parsed.soapSubjective);
        if (parsed.soapObjective) setSoapObjective(parsed.soapObjective);
        if (parsed.soapAssessment) setSoapAssessment(parsed.soapAssessment);
        if (parsed.soapPlan) setSoapPlan(parsed.soapPlan);
        if (parsed.prescriptionMedications) setPrescriptionMedications(parsed.prescriptionMedications);
        if (parsed.prescriptionInstructions) setPrescriptionInstructions(parsed.prescriptionInstructions);
        if (parsed.sessionProcedures) setSessionProcedures(parsed.sessionProcedures);
        toast({
          variant: 'info',
          title: 'Borrador Recuperado',
          description: 'Se restableció el progreso previo de la consulta.',
        });
      }
    } catch (e) {
      console.warn('Error leyendo borrador local:', e);
    }
  }, [selectedPatientId, currentTenant?.id, actor, toast]);

  // Auto-guardado de borrador en localStorage
  useEffect(() => {
    if (!selectedPatientId) return;
    const draftKey = `rendo_gineco_draft_${selectedPatientId}`;
    const payload = {
      soapSubjective,
      soapObjective,
      soapAssessment,
      soapPlan,
      prescriptionMedications,
      prescriptionInstructions,
      sessionProcedures,
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(payload));
    } catch (e) {
      // Ignorar si quota excedida
    }
  }, [
    selectedPatientId,
    soapSubjective,
    soapObjective,
    soapAssessment,
    soapPlan,
    prescriptionMedications,
    prescriptionInstructions,
    sessionProcedures,
  ]);

  // Modificar fórmula obstétrica (incrementar / decrementar)
  const adjustObstetricParam = (key: keyof GinecoObstetricProfile, delta: number) => {
    setProfile((prev) => {
      const current = Number(prev[key] || 0);
      const next = Math.max(0, current + delta);
      return { ...prev, [key]: next };
    });
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

  // Agregar procedimiento al presupuesto de la sesión
  const handleAddProcedure = (proc: GinecoProcedureDefinition) => {
    setSessionProcedures((prev) => [
      ...prev,
      {
        id: proc.id,
        code: proc.code,
        name: proc.name,
        price: proc.defaultPriceUSD,
        category: proc.categoryLabel,
        stages: proc.stages,
      },
    ]);
    toast({
      variant: 'info',
      title: 'Procedimiento Agregado',
      description: `${proc.name} agregado al presupuesto de hoy.`,
    });
  };

  const handleRemoveProcedure = (index: number) => {
    setSessionProcedures((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateProcedurePrice = (index: number, newPrice: number) => {
    setSessionProcedures((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], price: Math.max(0, newPrice) };
      return copy;
    });
  };

  const totalUSD = useMemo(() => {
    return sessionProcedures.reduce((acc, p) => acc + (Number(p.price) || 0), 0);
  }, [sessionProcedures]);

  const totalVES = totalUSD * (exchangeRate || 1);

  // Aplicar plantilla rápida de récipe
  const handleApplyTemplate = (tmpl: (typeof GINECO_PRESCRIPTION_TEMPLATES)[0]) => {
    setPrescriptionMedications(tmpl.medications);
    setPrescriptionInstructions(tmpl.instructions);
    if (tmpl.labOrders) {
      setPrescriptionLabOrders(tmpl.labOrders);
    }
    toast({
      variant: 'success',
      title: 'Plantilla Aplicada',
      description: `Se cargó la plantilla: ${tmpl.title}`,
    });
  };

  // Agregar orden de paraclínico
  const handleAddLabOrder = () => {
    if (!newLabOrderInput.trim()) return;
    setPrescriptionLabOrders((prev) => [...prev, newLabOrderInput.trim()]);
    setNewLabOrderInput('');
  };

  const handleRemoveLabOrder = (index: number) => {
    setPrescriptionLabOrders((prev) => prev.filter((_, i) => i !== index));
  };

  // Guardar consulta en historial
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
          encounterType: activeTab === 'obstetricia' ? 'prenatal' : 'ginecologia',
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
            fppDate: '',
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
        // Limpiar borrador local tras guardado exitoso
        try {
          localStorage.removeItem(`rendo_gineco_draft_${selectedPatientId}`);
        } catch (e) {}
      } else {
        toast({ variant: 'error', title: 'Error al Guardar', description: res.error || 'Ocurrió un error.' });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
    } finally {
      setIsSavingEncounter(false);
    }
  };

  // Despachar orden a Caja POS
  const handleSendToCashier = async () => {
    if (!selectedPatientId || !currentTenant?.id || !actor) {
      toast({ variant: 'error', title: 'Paciente Requerida', description: 'Selecciona una paciente para continuar.' });
      return;
    }
    if (sessionProcedures.length === 0) {
      toast({ variant: 'warning', title: 'Sin Procedimientos', description: 'Agrega al menos un procedimiento o consulta para cobrar.' });
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
          title: 'Orden Despachada a Caja POS',
          description: `Orden #${res.documentNumber} enviada a recepción para cobro ($${totalUSD.toFixed(2)} USD).`,
        });
        // Si tiene etapas, actualizar la lista de OTs en vivo
        getPatientGinecoWorkOrdersAction(selectedPatientId, currentTenant.id, actor).then((otRes) => {
          if (otRes.success && otRes.workOrders) {
            setPatientWorkOrders(otRes.workOrders);
          }
        });
      } else {
        toast({ variant: 'error', title: 'Error al Despachar', description: res.error || 'No se pudo enviar la orden.' });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
    } finally {
      setIsSendingToCashier(false);
    }
  };

  // Marcar etapa completada en OT
  const handleToggleStep = async (documentId: string, stepId: string, currentCompleted: boolean) => {
    if (!currentTenant?.id || !actor) return;
    const nextCompleted = !currentCompleted;
    setPatientWorkOrders((prev) =>
      prev.map((order) => {
        if (order.id !== documentId) return order;
        return {
          ...order,
          steps: order.steps.map((stg) => (stg.id === stepId ? { ...stg, completed: nextCompleted } : stg)),
        };
      })
    );

    const res = await updateGinecoWorkOrderStepAction(documentId, stepId, nextCompleted, currentTenant.id, actor);
    if (!res.success) {
      toast({ variant: 'error', title: 'Error', description: 'No se pudo actualizar la etapa.' });
    }
  };

  return (
    <div className="min-h-screen pb-24 text-foreground max-w-7xl mx-auto px-4 sm:px-6 pt-4 space-y-5 animate-in fade-in duration-300">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          CABECERA PRINCIPAL & SELECTOR DE PACIENTE / MÉDICO
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center font-black shadow-md shadow-pink-500/20 shrink-0">
              <Baby size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-foreground">
                  Ginecología & Obstetricia
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20">
                  Estación Clínica Especializada
                </span>
                {/* Botón de Guía Clínica Didáctica */}
                <button
                  type="button"
                  onClick={() => setIsGuideOpen(true)}
                  className="px-2.5 py-1 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/20 text-[11px] font-black flex items-center gap-1.5 transition-all btn-haptic"
                  title="Abrir Guía Clínica y Flujos de Ginecología"
                >
                  <BookOpen size={13} />
                  <span>¿Cómo funciona? (Guía)</span>
                </button>
                {/* Toggle de Modo de Vista Escritorio Pro / Express */}
                <button
                  type="button"
                  onClick={toggleViewMode}
                  className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-border text-[11px] font-bold transition-all btn-haptic"
                  title="Alternar entre Vista Pro Panorámica y Vista Compacta"
                >
                  <Layers size={13} className="text-pink-500" />
                  <span>{viewMode === 'pro' ? 'Modo Pro (Panorámico)' : 'Modo Express'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Control prenatal con gestograma, citología Bethesda, colposcopia y despacho a Caja POS
              </p>
            </div>
          </div>

          {/* Selectores de Paciente y Médico */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Selector Predictivo de Paciente */}
            <div className="relative min-w-[280px]">
              {selectedPatientId && activePatient ? (
                <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl border border-pink-500/40 bg-pink-500/10 text-xs font-bold text-foreground">
                  <div className="truncate mr-2">
                    <span className="text-pink-600 dark:text-pink-400 block truncate">{activePatient.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {activePatient.tax_id ? `ID: ${activePatient.tax_id}` : 'Sin ID'} {activePatient.phone ? `· ${activePatient.phone}` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatientId('');
                      setPatientSearchQuery('');
                    }}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors"
                    title="Cambiar paciente"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="flex items-center px-3 py-2 rounded-2xl border border-border bg-background focus-within:ring-2 focus-within:ring-pink-500/30 focus-within:border-pink-500">
                    <Search size={14} className="text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={patientSearchQuery}
                      onChange={(e) => {
                        setPatientSearchQuery(e.target.value);
                        setIsPatientDropdownOpen(true);
                      }}
                      onFocus={() => setIsPatientDropdownOpen(true)}
                      placeholder="Buscar paciente (nombre, cédula)..."
                      className="w-full bg-transparent text-xs font-bold text-foreground outline-none"
                    />
                  </div>

                  {isPatientDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsPatientDropdownOpen(false)}
                      />
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-64 overflow-y-auto bg-card border border-border rounded-2xl shadow-xl py-1.5 animate-in fade-in zoom-in-95">
                        {filteredPatients.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-400">
                            No se encontraron pacientes
                          </div>
                        ) : (
                          filteredPatients.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedPatientId(p.id);
                                setIsPatientDropdownOpen(false);
                                setPatientSearchQuery('');
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-pink-500/10 transition-colors flex items-center justify-between group"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground group-hover:text-pink-600 truncate">
                                  {p.name}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {p.tax_id ? `ID: ${p.tax_id} ` : ''}{p.phone ? `· Tel: ${p.phone}` : ''}
                                </p>
                              </div>
                              <span className="text-[10px] text-pink-500 opacity-0 group-hover:opacity-100 font-bold">
                                Seleccionar →
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Botón Nueva Paciente */}
            <button
              onClick={() => setIsNewPatientModalOpen(true)}
              className="px-3 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-border btn-haptic whitespace-nowrap"
            >
              <UserPlus size={15} className="text-pink-500" />
              <span>+ Paciente</span>
            </button>

            {/* Selector de Médico Tratante */}
            <div className="relative min-w-[200px]">
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-xs font-bold text-foreground focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 outline-none transition-all appearance-none pr-8 cursor-pointer"
              >
                <option value="">-- Médico Tratante --</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr(a). {d.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronRight size={16} className="rotate-90" />
              </div>
            </div>
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            CINTILLO GINECO-OBSTÉTRICO: FÓRMULA G-P-C-A + TRIAJE
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activePatient ? (
          <div className="pt-3 border-t border-border/60 space-y-3">
            {/* Fila Superior: Ficha y Fórmula Obstétrica G-P-C-A */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-pink-500/5 dark:bg-pink-500/10 border border-pink-500/20 p-3.5 rounded-2xl">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-pink-600 dark:text-pink-400 block">
                  Paciente Activa en Consulta
                </span>
                <p className="text-lg font-black text-foreground">{activePatient.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activePatient.tax_id ? `Cédula/ID: ${activePatient.tax_id} • ` : ''}
                  Tel: {activePatient.phone || 'Sin teléfono registrado'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-pink-600 bg-pink-500/10 px-3 py-1.5 rounded-xl border border-pink-500/20">
                  Historia Clínica Activa
                </span>
              </div>
            </div>

            {/* Fórmula Obstétrica G-P-C-A con Significado Explícito y Botones Grandes */}
            <div className="bg-gradient-to-r from-pink-500/10 via-rose-500/5 to-purple-500/10 border border-pink-500/20 p-4 rounded-3xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider text-pink-600 dark:text-pink-400">
                    Fórmula Obstétrica Reproductiva (G • P • C • A)
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Usa los botones grandes [+] y [-] para ajustar el historial gestacional
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* G: Gestas */}
                <div className="bg-card border border-border/80 hover:border-pink-500/40 p-3.5 rounded-2xl shadow-xs transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-xl bg-pink-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
                        G
                      </span>
                      <span className="text-[10px] font-black text-pink-600 bg-pink-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Total
                      </span>
                    </div>
                    <p className="text-sm font-black text-foreground mt-2">Gestas</p>
                    <p className="text-xs text-slate-500 font-medium">
                      Total de embarazos
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/50">
                    <button
                      type="button"
                      onClick={() => adjustObstetricParam('gestas', -1)}
                      className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground font-black text-lg flex items-center justify-center transition-colors btn-haptic"
                      title="Disminuir Gestas"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="text-2xl font-black text-foreground font-mono">
                      {profile.gestas}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustObstetricParam('gestas', 1)}
                      className="w-9 h-9 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-black text-lg flex items-center justify-center shadow-xs transition-colors btn-haptic"
                      title="Aumentar Gestas"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* P: Partos */}
                <div className="bg-card border border-border/80 hover:border-pink-500/40 p-3.5 rounded-2xl shadow-xs transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-xl bg-purple-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
                        P
                      </span>
                      <span className="text-[10px] font-black text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Vaginales
                      </span>
                    </div>
                    <p className="text-sm font-black text-foreground mt-2">Partos</p>
                    <p className="text-xs text-slate-500 font-medium">
                      Partos naturales
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/50">
                    <button
                      type="button"
                      onClick={() => adjustObstetricParam('partos', -1)}
                      className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground font-black text-lg flex items-center justify-center transition-colors btn-haptic"
                      title="Disminuir Partos"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="text-2xl font-black text-foreground font-mono">
                      {profile.partos}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustObstetricParam('partos', 1)}
                      className="w-9 h-9 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-black text-lg flex items-center justify-center shadow-xs transition-colors btn-haptic"
                      title="Aumentar Partos"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* C: Cesáreas */}
                <div className="bg-card border border-border/80 hover:border-pink-500/40 p-3.5 rounded-2xl shadow-xs transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-xl bg-blue-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
                        C
                      </span>
                      <span className="text-[10px] font-black text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Cirugía
                      </span>
                    </div>
                    <p className="text-sm font-black text-foreground mt-2">Cesáreas</p>
                    <p className="text-xs text-slate-500 font-medium">
                      Partos por cesárea
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/50">
                    <button
                      type="button"
                      onClick={() => adjustObstetricParam('cesareas', -1)}
                      className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground font-black text-lg flex items-center justify-center transition-colors btn-haptic"
                      title="Disminuir Cesáreas"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="text-2xl font-black text-foreground font-mono">
                      {profile.cesareas}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustObstetricParam('cesareas', 1)}
                      className="w-9 h-9 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-xs transition-colors btn-haptic"
                      title="Aumentar Cesáreas"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* A: Abortos */}
                <div className="bg-card border border-border/80 hover:border-pink-500/40 p-3.5 rounded-2xl shadow-xs transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
                        A
                      </span>
                      <span className="text-[10px] font-black text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Pérdidas
                      </span>
                    </div>
                    <p className="text-sm font-black text-foreground mt-2">Abortos</p>
                    <p className="text-xs text-slate-500 font-medium">
                      Pérdidas gestacionales
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/50">
                    <button
                      type="button"
                      onClick={() => adjustObstetricParam('abortos', -1)}
                      className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground font-black text-lg flex items-center justify-center transition-colors btn-haptic"
                      title="Disminuir Abortos"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="text-2xl font-black text-foreground font-mono">
                      {profile.abortos}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustObstetricParam('abortos', 1)}
                      className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-lg flex items-center justify-center shadow-xs transition-colors btn-haptic"
                      title="Aumentar Abortos"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Fila Inferior: Triaje y Signos Vitales Maternos con Tipografía Clara */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {/* Presión Arterial */}
              <div className="p-3.5 rounded-2xl bg-card border border-border shadow-2xs hover:border-pink-500/30 transition-all">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                  Presión Arterial
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <input
                    type="text"
                    value={vitals.bloodPressure}
                    onChange={(e) => setVitals((v) => ({ ...v, bloodPressure: e.target.value }))}
                    placeholder="120/80"
                    className="w-full text-base font-black text-foreground bg-transparent outline-none font-mono"
                  />
                  <span className="text-xs font-bold text-slate-400 font-mono shrink-0">mmHg</span>
                </div>
              </div>

              {/* Frecuencia Cardíaca */}
              <div className="p-3.5 rounded-2xl bg-card border border-border shadow-2xs hover:border-pink-500/30 transition-all">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                  FC Materna
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <input
                    type="number"
                    value={vitals.heartRate}
                    onChange={(e) => setVitals((v) => ({ ...v, heartRate: Number(e.target.value) }))}
                    className="w-full text-base font-black text-foreground bg-transparent outline-none font-mono"
                  />
                  <span className="text-xs font-bold text-slate-400 font-mono shrink-0">lpm</span>
                </div>
              </div>

              {/* Peso Materno */}
              <div className="p-3.5 rounded-2xl bg-card border border-border shadow-2xs hover:border-pink-500/30 transition-all">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                  Peso
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <input
                    type="number"
                    step="0.1"
                    value={vitals.weightKg === '' ? '' : vitals.weightKg}
                    onChange={(e) =>
                      setVitals((v) => ({ ...v, weightKg: e.target.value === '' ? '' : Number(e.target.value) }))
                    }
                    placeholder="62.5"
                    className="w-full text-base font-black text-foreground bg-transparent outline-none font-mono"
                  />
                  <span className="text-xs font-bold text-slate-400 font-mono shrink-0">kg</span>
                </div>
              </div>

              {/* Talla Materna */}
              <div className="p-3.5 rounded-2xl bg-card border border-border shadow-2xs hover:border-pink-500/30 transition-all">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                  Talla
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <input
                    type="number"
                    value={vitals.heightCm === '' ? '' : vitals.heightCm}
                    onChange={(e) =>
                      setVitals((v) => ({ ...v, heightCm: e.target.value === '' ? '' : Number(e.target.value) }))
                    }
                    placeholder="165"
                    className="w-full text-base font-black text-foreground bg-transparent outline-none font-mono"
                  />
                  <span className="text-xs font-bold text-slate-400 font-mono shrink-0">cm</span>
                </div>
              </div>

              {/* IMC Materno Calculado Dinámicamente */}
              <div className="p-3.5 rounded-2xl bg-card border border-border col-span-2 sm:col-span-1 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                    IMC (OMS)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono" title="Fórmula OMS: Peso (kg) ÷ [Talla (m)]²">
                    kg/m²
                  </span>
                </div>
                <p className="text-base font-black text-foreground mt-1 font-mono">
                  {bmiInfo.bmi > 0 ? `${bmiInfo.bmi}` : '—'}
                </p>
                <span className="text-xs font-black block truncate mt-0.5" style={{ color: bmiInfo.color }}>
                  {bmiInfo.category}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-border/80 text-center text-xs text-slate-500">
            Selecciona una paciente del listado o pulsa <strong className="text-foreground">+ Paciente</strong> para iniciar la historia clínica.
          </div>
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          BARRA DE PESTAÑAS OPERATIVAS DE ATENCIÓN
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex border-b border-border bg-card rounded-2xl p-1.5 gap-1.5 overflow-x-auto shadow-xs">
        <button
          onClick={() => setActiveTab('obstetricia')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap btn-haptic ${
            activeTab === 'obstetricia'
              ? 'bg-pink-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Baby size={15} />
          <span className="sm:hidden">Obstetricia</span>
          <span className="hidden sm:inline">1. Control Obstétrico (FUM & Gestograma)</span>
        </button>

        <button
          onClick={() => setActiveTab('ginecologia')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap btn-haptic ${
            activeTab === 'ginecologia'
              ? 'bg-pink-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Activity size={15} />
          <span className="sm:hidden">Citología</span>
          <span className="hidden sm:inline">2. Consulta Ginecológica & Citología</span>
        </button>

        <button
          onClick={() => setActiveTab('soap_recipe')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap btn-haptic ${
            activeTab === 'soap_recipe'
              ? 'bg-pink-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText size={15} />
          <span className="sm:hidden">Evolución</span>
          <span className="hidden sm:inline">3. Evolución Médica, Diagnóstico & Récipe</span>
        </button>

        <button
          onClick={() => setActiveTab('procedimientos')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap btn-haptic ${
            activeTab === 'procedimientos'
              ? 'bg-pink-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <DollarSign size={15} />
          <span className="sm:hidden">Caja POS</span>
          <span className="hidden sm:inline">4. Procedimientos & Caja POS</span>
          {sessionProcedures.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-white text-pink-600 text-[10px] font-black flex items-center justify-center">
              {sessionProcedures.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('historial')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap btn-haptic ${
            activeTab === 'historial'
              ? 'bg-pink-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FolderOpen size={15} />
          <span className="sm:hidden">Historial</span>
          <span className="hidden sm:inline">5. Historial & Kanban OTs</span>
        </button>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          CONTENEDOR DE TRABAJO RESPONSIVO DUAL (PRO / EXPRESS)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className={viewMode === 'pro' ? 'grid grid-cols-1 lg:grid-cols-12 gap-5 items-start' : 'space-y-5'}>
        {/* Columna Principal / Workspace de la Pestaña Activa */}
        <div className={viewMode === 'pro' ? 'lg:col-span-8 space-y-5' : 'space-y-5'}>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PESTAÑA 1: CONTROL OBSTÉTRICO & GESTOGRAMA
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'obstetricia' && (
        <div className="space-y-5">
          {/* Widget de Calculadora Obstétrica */}
          <GestationalWheelWidget
            fum={profile.fum || ''}
            onFumChange={(newFum) => setProfile((p) => ({ ...p, fum: newFum }))}
            uterineHeightCm={obstetricExam.uterineHeightCm}
            fetalHeartRateBpm={obstetricExam.fetalHeartRateBpm}
          />

          {/* Formulario de Evaluación Obstétrica */}
          <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-sm space-y-4">
            <h4 className="text-base font-black text-foreground flex items-center gap-2">
              <Stethoscope size={18} className="text-pink-500" />
              Exploración Obstétrica de la Sesión
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Altura Uterina */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-card border border-border shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Altura Uterina
                  </label>
                  <span className="text-xs font-bold text-pink-600 font-mono">cm</span>
                </div>
                <input
                  type="number"
                  value={obstetricExam.uterineHeightCm || ''}
                  onChange={(e) =>
                    setObstetricExam((prev) => ({ ...prev, uterineHeightCm: Number(e.target.value) }))
                  }
                  placeholder="Ej: 24"
                  className="w-full text-base font-black text-foreground bg-transparent outline-none font-mono"
                />
              </div>

              {/* FCF Doppler Fetal */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-card border border-border shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                    FCF Doppler Fetal
                  </label>
                  <span className="text-xs font-bold text-pink-600 font-mono">lpm</span>
                </div>
                <input
                  type="number"
                  value={obstetricExam.fetalHeartRateBpm || ''}
                  onChange={(e) =>
                    setObstetricExam((prev) => ({ ...prev, fetalHeartRateBpm: Number(e.target.value) }))
                  }
                  placeholder="Ej: 142 (Normal: 110-160)"
                  className="w-full text-base font-black text-foreground bg-transparent outline-none font-mono"
                />
              </div>
            </div>

            {/* Selectores Visuales Táctiles Grandes */}
            <div className="space-y-4 pt-1 border-t border-border/60">
              {/* Movimientos Fetales */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 block">
                  Movimientos Fetales:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'presentes', label: '✅ Presentes y Activos', desc: 'Movimientos normales' },
                    { id: 'disminuidos', label: '⚠️ Disminuidos', desc: 'Menor actividad percibida' },
                    { id: 'ausentes', label: '🚨 Ausentes (Alerta)', desc: 'Sin movimientos percibidos' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setObstetricExam((prev) => ({ ...prev, fetalMovements: opt.id as any }))}
                      className={`p-3 rounded-2xl text-left border transition-all btn-haptic ${
                        obstetricExam.fetalMovements === opt.id
                          ? opt.id === 'ausentes'
                            ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                            : opt.id === 'disminuidos'
                              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                              : 'bg-pink-500 text-white border-pink-600 shadow-xs'
                          : 'bg-card text-foreground border-border hover:bg-pink-500/10'
                      }`}
                    >
                      <p className="text-xs font-black">{opt.label}</p>
                      <p className={`text-[11px] mt-0.5 ${obstetricExam.fetalMovements === opt.id ? 'opacity-90' : 'text-slate-400'}`}>
                        {opt.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Presentación Fetal */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 block">
                  Presentación Fetal:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'cefalica', label: '👶 Cefálica', desc: 'Cabeza orientada a pelvis' },
                    { id: 'podalica', label: '🔄 Podálica / Pelviana', desc: 'Glúteos / pies abajo' },
                    { id: 'transversa', label: '↔️ Transversa', desc: 'Posición perpendicular' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setObstetricExam((prev) => ({ ...prev, presentation: opt.id as any }))}
                      className={`p-3 rounded-2xl text-left border transition-all btn-haptic ${
                        obstetricExam.presentation === opt.id
                          ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                          : 'bg-card text-foreground border-border hover:bg-purple-500/10'
                      }`}
                    >
                      <p className="text-xs font-black">{opt.label}</p>
                      <p className={`text-[11px] mt-0.5 ${obstetricExam.presentation === opt.id ? 'opacity-90' : 'text-slate-400'}`}>
                        {opt.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Edema Materno */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 block">
                  Edema de Miembros:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'ausente', label: 'Ausente', desc: 'Sin retención' },
                    { id: 'leve', label: 'Leve (+)', desc: 'Tobillos al final del día' },
                    { id: 'moderado', label: 'Moderado (++)', desc: 'Piernas y manos' },
                    { id: 'severo', label: 'Severo (+++)', desc: 'Descartar Preeclampsia' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setObstetricExam((prev) => ({ ...prev, edema: opt.id as any }))}
                      className={`p-3 rounded-2xl text-left border transition-all btn-haptic ${
                        obstetricExam.edema === opt.id
                          ? opt.id === 'severo'
                            ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                            : 'bg-pink-500 text-white border-pink-600 shadow-xs'
                          : 'bg-card text-foreground border-border hover:bg-pink-500/10'
                      }`}
                    >
                      <p className="text-xs font-black">{opt.label}</p>
                      <p className={`text-[11px] mt-0.5 ${obstetricExam.edema === opt.id ? 'opacity-90' : 'text-slate-400'}`}>
                        {opt.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PESTAÑA 2: GINECOLOGÍA, CITOLOGÍA & COLPOSCOPIA
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'ginecologia' && (
        <div className="space-y-5">
          {/* Antecedentes Ginecológicos */}
          <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-sm space-y-4">
            <h4 className="text-base font-black text-foreground flex items-center gap-2">
              <Activity size={18} className="text-pink-500" />
              Antecedentes Ginecológicos & Reproductivos
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Menarquia (edad):</label>
                <input
                  type="number"
                  value={profile.menarquia || ''}
                  onChange={(e) => setProfile((p) => ({ ...p, menarquia: Number(e.target.value) }))}
                  className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Ritmo Menstrual:</label>
                <input
                  type="text"
                  value={profile.ritmoMenstrual || ''}
                  onChange={(e) => setProfile((p) => ({ ...p, ritmoMenstrual: e.target.value }))}
                  placeholder="28 x 4"
                  className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Método Anticonceptivo:</label>
                <input
                  type="text"
                  value={profile.metodoAnticonceptivo || ''}
                  onChange={(e) => setProfile((p) => ({ ...p, metodoAnticonceptivo: e.target.value }))}
                  placeholder="ACOs, DIU, Implante..."
                  className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Última Citología PAP:</label>
                <input
                  type="date"
                  value={profile.ultimaCitologiaFecha || ''}
                  onChange={(e) => setProfile((p) => ({ ...p, ultimaCitologiaFecha: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground outline-none"
                />
              </div>
            </div>
          </div>

          {/* Exploración Colposcópica & Patología Cervical */}
          <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-sm space-y-4">
            <h4 className="text-base font-black text-foreground flex items-center gap-2">
              <Stethoscope size={18} className="text-pink-500" />
              Especuloscopia, Test de Schiller & Colposcopia
            </h4>

            {/* Prueba de Ácido Acético al 3-5% */}
            <div className="space-y-2 p-4 rounded-3xl bg-card border border-border shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-pink-600 dark:text-pink-400">
                  Prueba de Ácido Acético al 3-5% (Reacción Acetoblanca):
                </label>
                <span className="text-[11px] text-slate-400 font-medium">Toca para seleccionar</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'normal', label: '✅ Normal', desc: 'Sin epitelio acetoblanco' },
                  { id: 'acetoblanco_tenue', label: '⚠️ Tenue (LSIL)', desc: 'Epitelio acetoblanco fino / bajo grado' },
                  { id: 'acetoblanco_denso', label: '🚨 Denso Opaco (HSIL)', desc: 'Epitelio grueso / sospecha alto grado' },
                  { id: 'mosaico', label: '🔶 Mosaico Vascular', desc: 'Patrón vascular en mosaico' },
                  { id: 'punteado', label: '🟣 Punteado Basófilo', desc: 'Capilares punteados atípicos' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setGynecologicExam((prev) => ({ ...prev, aceticAcidTest: opt.id as any }))}
                    className={`p-3 rounded-2xl text-left border transition-all btn-haptic ${
                      gynecologicExam.aceticAcidTest === opt.id
                        ? opt.id === 'acetoblanco_denso'
                          ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                          : opt.id === 'acetoblanco_tenue'
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                            : 'bg-pink-500 text-white border-pink-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900/40 text-foreground border-border hover:bg-pink-500/10'
                    }`}
                  >
                    <p className="text-xs font-black">{opt.label}</p>
                    <p className={`text-[11px] mt-0.5 ${gynecologicExam.aceticAcidTest === opt.id ? 'opacity-90' : 'text-slate-400'}`}>
                      {opt.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Test de Schiller (Lugol) */}
            <div className="space-y-2 p-4 rounded-3xl bg-card border border-border shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-pink-600 dark:text-pink-400">
                  Test de Schiller (Tinción con Solución de Lugol):
                </label>
                <span className="text-[11px] text-slate-400 font-medium">Toca para seleccionar</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    id: 'positivo_caoba',
                    label: '🟤 Schiller Negativo / Caoba',
                    desc: 'Normal: El epitelio sano capta yodo homogéneamente',
                  },
                  {
                    id: 'negativo_yodonegativo',
                    label: '🟡 Schiller Positivo / Mostaza',
                    desc: 'Zona Yodonegativa (Sospecha: tomar biopsia dirigida)',
                  },
                  {
                    id: 'no_realizado',
                    label: '⚪ No Realizado',
                    desc: 'No se aplicó Lugol en esta consulta',
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setGynecologicExam((prev) => ({ ...prev, schillerTest: opt.id as any }))}
                    className={`p-3 rounded-2xl text-left border transition-all btn-haptic ${
                      gynecologicExam.schillerTest === opt.id
                        ? opt.id === 'negativo_yodonegativo'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-pink-500 text-white border-pink-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900/40 text-foreground border-border hover:bg-pink-500/10'
                    }`}
                  >
                    <p className="text-xs font-black">{opt.label}</p>
                    <p className={`text-[11px] mt-0.5 ${gynecologicExam.schillerTest === opt.id ? 'opacity-90' : 'text-slate-400'}`}>
                      {opt.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Clasificación Citopatológica Bethesda (PAP) */}
            <div className="space-y-2 p-4 rounded-3xl bg-card border border-border shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-pink-600 dark:text-pink-400">
                  Clasificación Citopatológica Bethesda (PAP):
                </label>
                <span className="text-[11px] text-slate-400 font-medium">Diagnóstico de Citología</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {[
                  {
                    val: 'Negativo para lesión intraepitelial o malignidad (NILM)',
                    code: 'NILM',
                    name: 'Normal / Negativo',
                    desc: 'Sin signos de lesión intraepitelial o malignidad',
                    color: 'emerald',
                  },
                  {
                    val: 'ASC-US — Células escamosas atípicas de significado indeterminado',
                    code: 'ASC-US',
                    name: 'Atipia Indeterminada',
                    desc: 'Células escamosas atípicas de significado incierto',
                    color: 'amber',
                  },
                  {
                    val: 'LSIL — Lesión intraepitelial escamosa de bajo grado (CIN I)',
                    code: 'LSIL',
                    name: 'Bajo Grado (CIN I / VPH)',
                    desc: 'Displasia leve vinculada a infección por VPH',
                    color: 'orange',
                  },
                  {
                    val: 'ASC-H — Células escamosas atípicas, no se descarta HSIL',
                    code: 'ASC-H',
                    name: 'Atipia Sugestiva de Alto Grado',
                    desc: 'No se descarta lesión intraepitelial de alto grado',
                    color: 'rose',
                  },
                  {
                    val: 'HSIL — Lesión intraepitelial escamosa de alto grado (CIN II / CIN III)',
                    code: 'HSIL',
                    name: 'Alto Grado (CIN II / CIN III)',
                    desc: 'Displasia moderada a severa / carcinoma in situ',
                    color: 'red',
                  },
                  {
                    val: 'AGC — Células glandulares atípicas (Endocervicales / Endometriales)',
                    code: 'AGC',
                    name: 'Atipia Glandular',
                    desc: 'Células endocervicales o endometriales atípicas',
                    color: 'purple',
                  },
                ].map((b) => (
                  <button
                    key={b.code}
                    type="button"
                    onClick={() => setGynecologicExam((prev) => ({ ...prev, bethesdaPapClassification: b.val }))}
                    className={`p-3 rounded-2xl text-left border transition-all btn-haptic ${
                      gynecologicExam.bethesdaPapClassification === b.val
                        ? 'bg-pink-500 text-white border-pink-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900/40 text-foreground border-border hover:bg-pink-500/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md ${
                        gynecologicExam.bethesdaPapClassification === b.val
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-foreground'
                      }`}>
                        {b.code}
                      </span>
                    </div>
                    <p className="text-xs font-black mt-1">{b.name}</p>
                    <p className={`text-[11px] mt-0.5 leading-tight ${
                      gynecologicExam.bethesdaPapClassification === b.val ? 'opacity-90' : 'text-slate-400'
                    }`}>
                      {b.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Checkbox de Biopsia */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-pink-500/5 border border-pink-500/20">
              <input
                type="checkbox"
                id="biopsyTaken"
                checked={gynecologicExam.biopsyTaken}
                onChange={(e) =>
                  setGynecologicExam((prev) => ({ ...prev, biopsyTaken: e.target.checked }))
                }
                className="w-4 h-4 rounded text-pink-500 accent-pink-500 cursor-pointer"
              />
              <label htmlFor="biopsyTaken" className="text-xs font-bold text-foreground cursor-pointer">
                Se tomó muestra de Biopsia Cervical / Endometrial dirigida en esta consulta
              </label>
              {gynecologicExam.biopsyTaken && (
                <input
                  type="text"
                  placeholder="Localización: ej: hora 12 y hora 6"
                  value={gynecologicExam.biopsyLocation}
                  onChange={(e) =>
                    setGynecologicExam((prev) => ({ ...prev, biopsyLocation: e.target.value }))
                  }
                  className="ml-auto px-3 py-1 rounded-xl border border-border bg-background text-xs font-bold text-foreground outline-none"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PESTAÑA 3: EVOLUCIÓN SOAP, CIE-10 & RÉCIPE MÉDICO
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'soap_recipe' && (
        <div className="space-y-5">
          {/* Evolución Médica & Diagnóstico Clínico */}
          <div className="bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <h4 className="text-base font-black text-foreground flex items-center gap-2">
                  <FileText size={18} className="text-pink-500" />
                  Evolución Clínica & Diagnóstico
                </h4>
                <p className="text-xs text-slate-500">
                  Registro del motivo de consulta, diagnóstico, acto médico y conducta terapéutica
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveEncounter}
                disabled={isSavingEncounter || !selectedPatientId}
                className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-black transition-all flex items-center justify-center gap-2 shadow-xs btn-haptic disabled:opacity-40 whitespace-nowrap"
              >
                <Save size={15} />
                <span>{isSavingEncounter ? 'Guardando...' : 'Guardar Consulta en Historial'}</span>
              </button>
            </div>

            {/* 1. Motivo de Consulta con Atajos Rápidos */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-pink-600 block">
                1. Motivo de Consulta Principal:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '🤰 Control Prenatal de Rutina', text: 'Control prenatal de rutina.' },
                  { label: '🌸 Chequeo Ginecológico Anual', text: 'Chequeo ginecológico y citología preventiva.' },
                  { label: '💧 Flujo / Infección Vaginal', text: 'Secreción vaginal atípica y prurito vulvar.' },
                  { label: '⚡ Dolor Pélvico / Dismenorrea', text: 'Dolor pélvico espasmódico / dismenorrea moderada.' },
                  { label: '🩸 Sangrado Anormal / Retraso', text: 'Retraso menstrual y sangrado uterino anormal.' },
                  { label: '👶 Control Post-Parto / Puerperio', text: 'Evaluación de puerperio mediato y lactancia.' },
                  { label: '🔬 Citología / Colposcopia', text: 'Toma de citología cervical PAP y colposcopia.' },
                ].map((m) => (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => setChiefComplaint(m.text)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all btn-haptic ${
                      chiefComplaint === m.text
                        ? 'bg-pink-500 text-white border-pink-500 shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-border hover:bg-pink-500/10 hover:text-pink-600'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="Describe el motivo por el cual acude la paciente..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-pink-500/30"
              />
            </div>

            {/* 2. Diagnóstico Clínico & CIE-10 */}
            <div className="space-y-2 pt-1 border-t border-border/50">
              <label className="text-xs font-black uppercase tracking-wider text-pink-600 block">
                2. Diagnóstico Clínico & CIE-10:
              </label>

              {/* Botones de Diagnósticos Frecuentes */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: 'Embarazo Normoevolutivo', code: 'Z34.0', desc: 'Supervisión de primer embarazo normal' },
                  { name: 'Vaginitis / Candidiasis', code: 'N76.0', desc: 'Vaginitis aguda' },
                  { name: 'Miomatosis Uterina', code: 'D25.9', desc: 'Leiomioma del útero, sin otra especificación' },
                  { name: 'Ovario Poliquístico (SOP)', code: 'E28.2', desc: 'Síndrome de ovario poliquístico' },
                  { name: 'Dismenorrea Primaria', code: 'N94.4', desc: 'Dismenorrea primaria' },
                  { name: 'Infección Urinaria en Embarazo', code: 'O23.4', desc: 'Infección no especificada de las vías urinarias en el embarazo' },
                  { name: 'Cervicitis / VPH', code: 'N72', desc: 'Enfermedad inflamatoria del cuello uterino' },
                ].map((d) => (
                  <button
                    key={d.name}
                    type="button"
                    onClick={() => {
                      setSoapAssessment(d.name);
                      setSelectedCie10({ code: d.code, description: d.desc });
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all btn-haptic ${
                      soapAssessment === d.name
                        ? 'bg-pink-500 text-white border-pink-500 shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-border hover:bg-pink-500/10 hover:text-pink-600'
                    }`}
                  >
                    <span>{d.name}</span>
                    <span className="ml-1 text-[10px] font-mono opacity-70">[{d.code}]</span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={soapAssessment}
                onChange={(e) => setSoapAssessment(e.target.value)}
                placeholder="Diagnóstico médico principal..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-pink-500/30"
              />

              {/* Codificación CIE-10 */}
              {selectedCie10 ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/30">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-pink-600 text-xs">[{selectedCie10.code}]</span>
                    <span className="font-bold text-foreground text-xs">{selectedCie10.description}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCie10(null)}
                    className="p-1 text-slate-400 hover:text-rose-500"
                    title="Quitar CIE-10"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center px-3 py-1.5 rounded-xl border border-border bg-background">
                    <Search size={13} className="text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={cie10Search}
                      onChange={(e) => setCie10Search(e.target.value)}
                      placeholder="Buscar otro código CIE-10 por nombre o código..."
                      className="w-full bg-transparent text-xs font-bold text-foreground outline-none"
                    />
                  </div>
                  {cie10Search.trim() && (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {GINECO_CIE10_CATALOG.filter(
                        (c) =>
                          c.description.toLowerCase().includes(cie10Search.toLowerCase()) ||
                          c.code.toLowerCase().includes(cie10Search.toLowerCase())
                      ).map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setSelectedCie10({ code: c.code, description: c.description });
                            if (!soapAssessment) setSoapAssessment(c.description);
                            setCie10Search('');
                          }}
                          className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-pink-500/10 hover:text-pink-600 hover:border-pink-500/30 text-[11px] font-bold border border-border text-foreground transition-all flex items-center gap-1.5 btn-haptic"
                        >
                          <span className="font-mono text-pink-500">[{c.code}]</span>
                          <span className="truncate max-w-[200px]">{c.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Nota de Evolución Médica & Examen Clínico */}
            <div className="space-y-2 pt-1 border-t border-border/50">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-pink-600 block">
                  3. Nota de Evolución Clínica & Examen:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSoapSubjective(
                        'Paciente femenina acude a control prenatal programado. Refiere movimientos fetales activos, niega pérdidas hemáticas o transvaginales. Al examen físico: Abdomen grávido, altura uterina acorde a edad gestacional, FCF rítmica y reactiva. Sin edema patológico en extremidades.'
                      );
                    }}
                    className="text-[11px] font-bold text-pink-600 hover:underline flex items-center gap-1"
                  >
                    <Sparkles size={12} />
                    <span>Plantilla Control Prenatal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSoapSubjective(
                        'Paciente acude a chequeo ginecológico preventivo. Asintomática al interrogatorio. Genitales externos e internos normoconfigurados, mucosa elástica, sin flujo patológico ni sangrado activo. Cuello uterino eutrófico.'
                      );
                    }}
                    className="text-[11px] font-bold text-pink-600 hover:underline flex items-center gap-1"
                  >
                    <Sparkles size={12} />
                    <span>Plantilla Chequeo Ginecológico</span>
                  </button>
                </div>
              </div>
              <textarea
                value={soapSubjective}
                onChange={(e) => {
                  setSoapSubjective(e.target.value);
                  setSoapObjective(e.target.value);
                }}
                rows={4}
                placeholder="Escribe la evolución clínica, síntomas referidos por la paciente, hallazgos de la exploración física y respuesta terapéutica..."
                className="w-full p-3.5 rounded-2xl border border-border bg-background text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-pink-500/30 resize-none leading-relaxed"
              />
            </div>

            {/* 4. Plan Terapéutico & Conducta */}
            <div className="space-y-2 pt-1 border-t border-border/50">
              <label className="text-xs font-black uppercase tracking-wider text-pink-600 block">
                4. Plan Terapéutico, Cuidados & Próxima Cita:
              </label>
              <textarea
                value={soapPlan}
                onChange={(e) => setSoapPlan(e.target.value)}
                rows={3}
                placeholder="Indica el plan médico, suplementación, paraclinicos solicitados, recomendaciones dietéticas o fecha del próximo control..."
                className="w-full p-3 rounded-2xl border border-border bg-background text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-pink-500/30 resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Récipe Digital e Indicaciones */}
          <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <h4 className="text-base font-black text-foreground flex items-center gap-2">
                  <FileText size={18} className="text-pink-500" />
                  Prescripción & Récipe Médico Digital
                </h4>
                <p className="text-xs text-slate-500">Plantillas rápidas e impresión oficial para la paciente</p>
              </div>

              {/* Botón Imprimir Récipe */}
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-black transition-all flex items-center justify-center gap-2 shadow-xs btn-haptic whitespace-nowrap"
              >
                <Printer size={15} />
                <span>Previsualizar / Imprimir Récipe</span>
              </button>
            </div>

            {/* Atajos de Plantillas Clínicas */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Plantillas Rápidas de Prescripción:
              </span>
              <div className="flex flex-wrap gap-2">
                {GINECO_PRESCRIPTION_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="px-3 py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 text-xs font-bold transition-all border border-pink-500/20 btn-haptic flex items-center gap-1"
                  >
                    <Sparkles size={12} />
                    <span>{tmpl.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Editores de Medicamentos e Indicaciones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                  Rp / Medicamentos (Fármaco, Concentración, Posología):
                </label>
                <textarea
                  value={prescriptionMedications}
                  onChange={(e) => setPrescriptionMedications(e.target.value)}
                  rows={5}
                  placeholder="1. Ácido Fólico 5 mg: 1 tab diaria en ayunas.&#10;2. Sulfato Ferroso 300 mg: 1 tab con jugo de naranja..."
                  className="w-full p-3 rounded-2xl border border-border bg-background text-xs text-foreground outline-none font-mono focus:ring-2 focus:ring-pink-500/30 leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                  Indicaciones, Dieta & Signos de Alarma:
                </label>
                <textarea
                  value={prescriptionInstructions}
                  onChange={(e) => setPrescriptionInstructions(e.target.value)}
                  rows={5}
                  placeholder="Tomar abundante líquido. Consultar ante sangrado genital, dolor cólico intenso o disminución de movimientos..."
                  className="w-full p-3 rounded-2xl border border-border bg-background text-xs text-foreground outline-none focus:ring-2 focus:ring-pink-500/30 leading-relaxed"
                />
              </div>
            </div>

            {/* Órdenes Paraclínicas / Ecografías */}
            <div className="pt-2 border-t border-border/50 space-y-2">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                Órdenes de Exámenes de Laboratorio y Ecografías:
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLabOrderInput}
                  onChange={(e) => setNewLabOrderInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLabOrder()}
                  placeholder="Ej: Curva de tolerancia a la glucosa / Ecografía morfológica / Urocultivo..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-border bg-background text-xs font-bold text-foreground outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddLabOrder}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-foreground border border-border btn-haptic"
                >
                  + Agregar
                </button>
              </div>

              {prescriptionLabOrders.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {prescriptionLabOrders.map((lab, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-foreground border border-border flex items-center gap-1.5"
                    >
                      <span>{lab}</span>
                      <button
                        onClick={() => handleRemoveLabOrder(i)}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PESTAÑA 4: PROCEDIMIENTOS & DESPACHO A CAJA POS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'procedimientos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Columna Izquierda: Catálogo de Procedimientos Disponibles */}
          <div className="lg:col-span-2 bg-card border border-border/80 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h4 className="text-base font-black text-foreground flex items-center gap-2">
                  <Stethoscope size={18} className="text-pink-500" />
                  Catálogo de Procedimientos Gineco-Obstétricos
                </h4>
                <p className="text-xs text-slate-500">
                  Precios sincronizados con el catálogo del negocio (editables en vivo)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {catalogProcedures.map((proc) => (
                <div
                  key={proc.id}
                  className="p-3.5 rounded-2xl border border-border/70 hover:border-pink-500/40 bg-card hover:bg-pink-500/5 transition-all space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-pink-600 bg-pink-500/10 px-2 py-0.5 rounded-md">
                        {proc.code}
                      </span>
                      <span className="text-sm font-black text-foreground">
                        ${Number(proc.defaultPriceUSD).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs font-black text-foreground">{proc.name}</p>
                    <p className="text-[10px] text-slate-500">{proc.categoryLabel} • {proc.estimatedDurationMin} min</p>
                  </div>

                  <button
                    onClick={() => handleAddProcedure(proc)}
                    className="w-full py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500 text-pink-600 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 btn-haptic mt-1"
                  >
                    <Plus size={14} />
                    <span>Agregar a Orden</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Columna Derecha: Presupuesto Activo & Despacho a Caja Mostrador */}
          <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="border-b border-border/60 pb-2">
                <h4 className="text-base font-black text-foreground flex items-center gap-2">
                  <DollarSign size={18} className="text-pink-500" />
                  Presupuesto de la Sesión
                </h4>
                <p className="text-xs text-slate-500">Ítems que serán facturados en recepción</p>
              </div>

              {sessionProcedures.length === 0 ? (
                <div className="text-center py-10 text-slate-400 space-y-1.5">
                  <DollarSign size={28} className="mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="text-xs font-bold text-foreground">Sin procedimientos seleccionados</p>
                  <p className="text-[11px] text-slate-500">Agrega procedimientos del catálogo a la izquierda.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {sessionProcedures.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-black text-foreground truncate">{item.name}</p>
                        <button
                          onClick={() => handleRemoveProcedure(idx)}
                          className="text-slate-400 hover:text-rose-500 p-0.5"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] text-slate-500">{item.category}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 font-bold">$</span>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => handleUpdateProcedurePrice(idx, Number(e.target.value))}
                            className="w-16 px-2 py-0.5 rounded-lg border border-border bg-background text-right font-black text-foreground text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totalizador & Botonera de Envío a Caja */}
            <div className="pt-3 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Total a Cobrar:</span>
                <div className="text-right">
                  <p className="text-xl font-black text-foreground">${totalUSD.toFixed(2)} USD</p>
                  <p className="text-xs font-mono font-bold text-pink-600">
                    ≈ Bs. {totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {/* Despachar a Caja POS */}
                <button
                  onClick={handleSendToCashier}
                  disabled={isSendingToCashier || sessionProcedures.length === 0}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-black text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-pink-500/20 disabled:opacity-50 btn-haptic"
                >
                  <Send size={15} />
                  <span>
                    {isSendingToCashier ? 'Despachando a Caja...' : 'Despachar a Caja Mostrador'}
                  </span>
                </button>

                {/* Guardar Consulta */}
                <button
                  onClick={handleSaveEncounter}
                  disabled={isSavingEncounter || !selectedPatientId}
                  className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-foreground font-bold text-xs transition-all flex items-center justify-center gap-1.5 border border-border btn-haptic disabled:opacity-50"
                >
                  <Save size={14} className="text-pink-500" />
                  <span>{isSavingEncounter ? 'Guardando...' : 'Guardar Consulta en Historial'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PESTAÑA 5: HISTORIAL CLÍNICO & SEGUIMIENTO KANBAN
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'historial' && (
        <div className="space-y-5">
          {/* Órdenes de Trabajo Activas (Kanban Gineco-Obstétrico) */}
          <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h4 className="text-base font-black text-foreground flex items-center gap-2">
                  <Layers size={18} className="text-pink-500" />
                  Seguimiento de Procedimientos & Etapas (Kanban)
                </h4>
                <p className="text-xs text-slate-500">
                  Monitoreo de tratamientos multisesión (ej. DIU, crioterapia o ecografías seriadas)
                </p>
              </div>
            </div>

            {isLoadingWorkOrders ? (
              <div className="py-8 text-center text-xs text-slate-500">Cargando etapas...</div>
            ) : patientWorkOrders.length === 0 ? (
              <div className="text-center py-8 text-slate-400 space-y-1">
                <CheckCircle2 size={24} className="mx-auto text-emerald-500/50" />
                <p className="text-xs font-bold text-foreground">Sin procedimientos activos pendientes</p>
                <p className="text-[11px] text-slate-500">
                  Cuando despaches procedimientos con etapas multisesión, su checklist aparecerá aquí.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {patientWorkOrders.map((wo) => (
                  <div key={wo.id} className="p-4 rounded-2xl border border-border bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-pink-600 bg-pink-500/10 px-2 py-0.5 rounded-md font-bold">
                          {wo.documentNumber}
                        </span>
                        <h5 className="text-sm font-black text-foreground mt-1">{wo.title}</h5>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-foreground">${wo.totalAmount.toFixed(2)} USD</span>
                        <span className={`block text-[10px] font-bold ${wo.balanceDue > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {wo.balanceDue > 0 ? `Pendiente: $${wo.balanceDue.toFixed(2)}` : 'Saldado'}
                        </span>
                      </div>
                    </div>

                    {/* Checklist interactivo de etapas */}
                    {wo.steps && wo.steps.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-border/50">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Etapas del Procedimiento:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {wo.steps.map((stg) => (
                            <button
                              key={stg.id}
                              type="button"
                              onClick={() => handleToggleStep(wo.id, stg.id, stg.completed)}
                              className={`p-2 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 btn-haptic ${
                                stg.completed
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-card border-border hover:border-pink-500/40 text-foreground'
                              }`}
                            >
                              {stg.completed ? (
                                <CheckSquare size={16} className="text-emerald-500 shrink-0" />
                              ) : (
                                <Square size={16} className="text-slate-400 shrink-0" />
                              )}
                              <span className={stg.completed ? 'line-through opacity-80' : ''}>
                                {stg.title}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historial de Consultas Previas */}
          <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-sm space-y-4">
            <h4 className="text-base font-black text-foreground flex items-center gap-2">
              <Clock size={18} className="text-pink-500" />
              Bitácora de Consultas Ginecológicas Anteriores
            </h4>

            {encountersHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-400 space-y-1">
                <FileText size={24} className="mx-auto text-slate-400/50" />
                <p className="text-xs font-bold text-foreground">Sin consultas previas registradas</p>
                <p className="text-[11px] text-slate-500">
                  Las evoluciones clínicas guardadas se archivarán cronológicamente en esta sección.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {encountersHistory.map((enc) => (
                  <div
                    key={enc.id}
                    className="p-4 rounded-2xl border border-border bg-card space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-foreground">{enc.title}</span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(enc.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                      {enc.content}
                    </p>
                    {enc.metadata?.doctorName && (
                      <p className="text-[10px] text-slate-400">
                        Atendido por: Dr(a). {enc.metadata.doctorName}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            PANEL DERECHO EN VIVO (ESCRITORIO PRO):
            DESPACHO INMEDIATO A CAJA, RESUMEN & ÓRDENES
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {viewMode === 'pro' && (
          <aside className="hidden lg:block lg:col-span-4 lg:sticky lg:top-24 space-y-4">
            <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-sm space-y-4">
              {/* Resumen Paciente y Gestograma Rápido */}
              <div className="border-b border-border/60 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-pink-600 dark:text-pink-400">
                    Estación en Vivo
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-600">
                    {activeTab.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-base font-black text-foreground truncate mt-1">
                  {activePatient ? activePatient.name : 'Sin Paciente Seleccionada'}
                </h3>
                {activePatient && (
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                    {profile.fum && (
                      <span className="px-2 py-0.5 rounded-lg bg-pink-500/10 text-pink-600 font-mono text-[10px] font-bold">
                        FUM: {profile.fum}
                      </span>
                    )}
                    {vitals.bloodPressure && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">
                        PA: {vitals.bloodPressure}
                      </span>
                    )}
                    {bmiInfo.bmi > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">
                        IMC: {bmiInfo.bmi}
                      </span>
                    )}
                  </div>
                )}
                {activePatient?.metadata?.allergies && (
                  <div className="mt-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] font-bold text-rose-600 flex items-center gap-1.5">
                    <AlertCircle size={13} className="shrink-0" />
                    <span className="truncate">Alergias: {activePatient.metadata.allergies}</span>
                  </div>
                )}
              </div>

              {/* Selector Rápido de Procedimientos */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 flex items-center justify-between">
                  <span>Agregar Procedimiento a la Sesión:</span>
                  <span className="text-[10px] text-pink-600 font-black">+ Clic</span>
                </label>
                <select
                  onChange={(e) => {
                    const procId = e.target.value;
                    if (!procId) return;
                    const found = catalogProcedures.find((p) => p.id === procId);
                    if (found) handleAddProcedure(found);
                    e.target.value = '';
                  }}
                  defaultValue=""
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-pink-500/30 cursor-pointer"
                >
                  <option value="">-- Seleccionar Procedimiento --</option>
                  {catalogProcedures.map((proc) => (
                    <option key={proc.id} value={proc.id}>
                      {proc.name} (${proc.defaultPriceUSD} USD)
                    </option>
                  ))}
                </select>
              </div>

              {/* Lista de Procedimientos en el Presupuesto */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-foreground">
                    Presupuesto Activo ({sessionProcedures.length})
                  </span>
                  {sessionProcedures.length > 0 && (
                    <button
                      onClick={() => setSessionProcedures([])}
                      className="text-[10px] text-slate-400 hover:text-rose-500"
                    >
                      Vaciar
                    </button>
                  )}
                </div>

                {sessionProcedures.length === 0 ? (
                  <div className="p-3 text-center rounded-2xl border border-dashed border-border/80 text-[11px] text-slate-400">
                    No has agregado procedimientos a la sesión actual.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {sessionProcedures.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-border flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-foreground truncate">{item.name}</p>
                          <span className="text-[10px] text-slate-400">{item.category}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono font-black text-foreground">${item.price}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveProcedure(idx)}
                            className="text-slate-400 hover:text-rose-500 p-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totalizador de Sesión */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-600 dark:text-slate-300">
                    Total a Facturar:
                  </span>
                  <span className="text-lg font-black text-pink-600 dark:text-pink-400">
                    ${totalUSD.toFixed(2)} USD
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>Tasa oficial: Bs. {exchangeRate.toFixed(2)}</span>
                  <span className="font-bold text-foreground">
                    Bs. {totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Botones de Acción Inmediata */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleSendToCashier}
                  disabled={isSendingToCashier || sessionProcedures.length === 0}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-black text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-pink-500/20 disabled:opacity-50 btn-haptic"
                >
                  <Send size={15} />
                  <span>
                    {isSendingToCashier ? 'Despachando...' : 'Despachar a Caja POS'}
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleSaveEncounter}
                    disabled={isSavingEncounter || !selectedPatientId}
                    className="py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-foreground font-bold text-xs transition-all flex items-center justify-center gap-1.5 border border-border btn-haptic disabled:opacity-50"
                  >
                    <Save size={14} className="text-pink-500" />
                    <span>Guardar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(true)}
                    className="py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-foreground font-bold text-xs transition-all flex items-center justify-center gap-1.5 border border-border btn-haptic"
                  >
                    <Printer size={14} className="text-pink-500" />
                    <span>Récipe</span>
                  </button>
                </div>
              </div>

              {/* Tracker de OTs Activas (Kanban Rápido) */}
              {patientWorkOrders.length > 0 && (
                <div className="pt-3 border-t border-border/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-foreground flex items-center gap-1.5">
                      <Layers size={13} className="text-pink-500" />
                      Tratamientos en Curso ({patientWorkOrders.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('historial')}
                      className="text-[10px] text-pink-600 hover:underline font-bold"
                    >
                      Ver todos
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {patientWorkOrders.slice(0, 2).map((ot) => {
                      const completedCount = ot.steps.filter((s) => s.completed).length;
                      const progress = ot.steps.length > 0 ? (completedCount / ot.steps.length) * 100 : 0;
                      return (
                        <div key={ot.id} className="p-2 rounded-xl bg-card border border-border text-[11px] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground truncate">{ot.title}</span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {completedCount}/{ot.steps.length}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                            <div className="bg-pink-500 h-full transition-all" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          BARRA FLOTANTE DE ACCIÓN RÁPIDA (MÓVIL / TABLET)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="lg:hidden fixed bottom-20 inset-x-3 z-30 bg-card/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl p-2.5 flex items-center justify-between gap-2 animate-in slide-in-from-bottom duration-300">
        <div className="min-w-0 mr-1">
          <p className="text-[10px] text-slate-400 font-bold uppercase truncate">
            {activePatient ? activePatient.name : 'Sin paciente'}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-black text-pink-600 dark:text-pink-400">
              ${totalUSD.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">USD</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-foreground border border-border text-xs font-bold"
            title="Ver Récipe"
          >
            <Printer size={16} className="text-pink-500" />
          </button>

          <button
            type="button"
            onClick={handleSaveEncounter}
            disabled={isSavingEncounter || !selectedPatientId}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-foreground border border-border text-xs font-bold flex items-center gap-1 disabled:opacity-50"
            title="Guardar Consulta"
          >
            <Save size={14} className="text-pink-500" />
            <span className="hidden sm:inline">Guardar</span>
          </button>

          <button
            type="button"
            onClick={handleSendToCashier}
            disabled={isSendingToCashier || sessionProcedures.length === 0}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-black shadow-md shadow-pink-500/20 flex items-center gap-1.5 disabled:opacity-50 btn-haptic"
            title="Despachar a Caja POS"
          >
            <Send size={14} />
            <span>Cobrar</span>
          </button>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: CREAR PACIENTE RÁPIDA
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isNewPatientModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <UserPlus size={18} className="text-pink-500" />
                Nueva Paciente Ginecológica
              </h3>
              <button
                onClick={() => setIsNewPatientModalOpen(false)}
                className="text-slate-400 hover:text-foreground p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Nombre Completo *:</label>
                <input
                  type="text"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  placeholder="Ej: María Valentina Gómez"
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-pink-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Cédula / Tax ID:</label>
                  <input
                    type="text"
                    value={newPatientTaxId}
                    onChange={(e) => setNewPatientTaxId(e.target.value)}
                    placeholder="V-18234567"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold text-foreground outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Teléfono:</label>
                  <input
                    type="tel"
                    value={newPatientPhone}
                    onChange={(e) => setNewPatientPhone(e.target.value)}
                    placeholder="+58 412..."
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold text-foreground outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Fecha de Nacimiento:</label>
                <input
                  type="date"
                  value={newPatientBirthDate}
                  onChange={(e) => setNewPatientBirthDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold text-foreground outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Alergias Conocidas:</label>
                <input
                  type="text"
                  value={newPatientAllergies}
                  onChange={(e) => setNewPatientAllergies(e.target.value)}
                  placeholder="Ej: Penicilina, AINEs, Látex..."
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold text-foreground outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsNewPatientModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateFastPatient}
                disabled={isSubmittingPatient}
                className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-black transition-all btn-haptic disabled:opacity-50"
              >
                {isSubmittingPatient ? 'Creando...' : 'Crear Paciente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: IMPRESIÓN OFICIAL DEL RÉCIPE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
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

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL DIDÁCTICO: GUÍA DE FLUJOS CLÍNICOS Y MANUAL
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <GinecoClinicalGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
