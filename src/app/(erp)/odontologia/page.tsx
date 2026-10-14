'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Stethoscope, 
  Users, 
  Activity, 
  CheckCircle2, 
  DollarSign, 
  Search, 
  KanbanSquare, 
  CalendarDays, 
  Plus, 
  ArrowRight,
  UserCheck,
  RefreshCw,
  Sparkles,
  FileText,
  Clock,
  Phone,
  MessageSquare,
  AlertTriangle,
  Receipt,
  Printer,
  ChevronRight,
  Package,
  Layers,
  Check,
  X,
  Send,
  Pill,
  Save,
  CreditCard,
  ExternalLink,
  ShieldAlert,
  ClipboardList,
  Sliders,
  Tag,
  ArrowRightLeft,
  UserPlus
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Odontogram } from '@/components/dental/Odontogram';
import { ClientRecordsTab } from '@/components/clients/ClientRecordsTab';
import { CatalogModal } from '@/components/catalog/CatalogModal';
import { DentalCheckoutModal } from '@/components/dental/DentalCheckoutModal';
import { DentalScheduleModal } from '@/components/dental/DentalScheduleModal';
import { PatientProfileModal } from '@/components/dental/PatientProfileModal';
import { PatientSelectModal } from '@/components/dental/PatientSelectModal';
import { NewConsumableModal } from '@/components/dental/NewConsumableModal';
import { OrthodonticsTracker } from '@/components/dental/OrthodonticsTracker';
import { EndodonticsSheet } from '@/components/dental/EndodonticsSheet';
import { PeriodonticsMiniChart } from '@/components/dental/PeriodonticsMiniChart';
import { DentalStaffTab } from '@/components/dental/DentalStaffTab';
import { DentalPricingTab } from '@/components/dental/DentalPricingTab';
import { getModuleStaffAction, ModuleStaffMember } from '@/app/actions/moduleStaff';
import { getModulePricingConfigAction } from '@/app/actions/modulePricing';
import { DentalPricingConfig, DEFAULT_DENTAL_PRICING } from '@/lib/modulePricingDefaults';
import { mergeTenantDentalServices, DentalProcedureDefinition, DENTAL_PROCEDURES_MASTER } from '@/lib/dental/proceduresCatalog';
import { syncDentalCatalogToInventoryAction } from '@/lib/dental/dentalInventorySync';
import { 
  DentalChart, 
  DentalTreatmentPlan, 
  DentalEvolutionEntry,
  getDentalOverviewAction, 
  saveDentalChartAction, 
  getDentalChartAction, 
  createTreatmentKanbanFromChartAction,
  saveDentalEvolutionAction,
  getDentalEvolutionsAction,
  sendDentalOrderToCashierAction
} from '@/app/actions/dental';
import { getEntitiesAction, createEntityAction, updateEntityAction, ActionActor } from '@/app/actions/entities';
import { getAppointmentsAction, updateAppointmentStatusAction } from '@/app/actions/appointments';
import { getItemsAction } from '@/app/actions/items';
import { Entity } from '@/lib/api/entities';
import { useERPStore } from '@/store/useERPStore';
import { useViewModeStore } from '@/store/useViewModeStore';
import { DentalSillonExpress } from '@/components/dental/DentalSillonExpress';
import { useActionActor } from '@/hooks/useActionActor';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useToast } from '@/components/core/ToastProvider';

// Frases clínicas rápidas para agilizar la evolución diaria del odontólogo
const QUICK_CLINICAL_NOTES = [
  'Paciente asiste a control post-operatorio. Evolución asintomática, tejidos en franca cicatrización sin signos de infección.',
  'Apertura cameral, biomecánica rotatoria e instrumentación de conductos radiculares. Irrigación con NaOCl 2.5%. Medicación con hidróxido de calcio.',
  'Aislamiento absoluto, remoción de caries dentinaria profunda y obturación estética con resina nanohíbrida fotocurada. Pulido oclusal.',
  'Tartrectomía con ultrasonido piezoeléctrico en arcada superior e inferior. Profilaxis con pasta fluorada y aplicación tópica de flúor.',
  'Exodoncia simple bajo anestesia infiltrativa local (Mepivacaína al 2%). Hemostasia lograda y sutura reabsorbible 3-0. Indicaciones post-quirúrgicas dadas.'
];

export default function OdontologiaPage() {
  const router = useRouter();
  const currentTenant = useTenantResolver();
  const session = useERPStore((s) => s.session);
  const actor = useActionActor();
  const effectiveActor: ActionActor = actor || { 
    email: session?.userEmail || 'dental@rendorp.com', 
    role: (session?.role as any) || 'admin',
    token: session?.token
  };
  const { toast } = useToast();
  const viewMode = useViewModeStore((s) => s.viewMode);

  const tenantId = currentTenant?.id || session?.tenantId || '';

  // Estado general de datos
  const [mainTab, setMainTab] = useState<'sillon' | 'staff' | 'pricing'>('sillon');
  const [dentalStaff, setDentalStaff] = useState<ModuleStaffMember[]>([]);
  const [dentalPricingConfig, setDentalPricingConfig] = useState<DentalPricingConfig>(DEFAULT_DENTAL_PRICING);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState<Entity[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [dentalServices, setDentalServices] = useState<any[]>([]);

  // Paciente Activo en Consulta (Sillón Dental)
  const [selectedPatient, setSelectedPatient] = useState<Entity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Odontograma y Tratamientos del Paciente Activo
  const [currentChart, setCurrentChart] = useState<DentalChart | undefined>(undefined);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [isSavingChart, setIsSavingChart] = useState(false);

  // Estaciones Clínicas Panorámicas (Opción A: Flujo paso a paso)
  type ClinicalStation = 'diagnostico' | 'especialidades' | 'evolucion' | 'expediente';
  const [clinicalStation, setClinicalStation] = useState<ClinicalStation>('diagnostico');
  const [specialtySubTab, setSpecialtySubTab] = useState<'ortodoncia' | 'endodoncia' | 'periodoncia'>('ortodoncia');

  // Evolución Médica de la Consulta de Hoy
  const [evolutionText, setEvolutionText] = useState('');
  const [isSavingEvolution, setIsSavingEvolution] = useState(false);
  const [patientEvolutions, setPatientEvolutions] = useState<DentalEvolutionEntry[]>([]);
  const [selectedConsumables, setSelectedConsumables] = useState<Array<{ itemId: string; name: string; quantity: number; cost?: number }>>([]);
  const [selectedConsumableId, setSelectedConsumableId] = useState('');
  const [consumableQty, setConsumableQty] = useState(1);

  // Récipe Médico Farmacológico
  const [prescriptionMeds, setPrescriptionMeds] = useState<Array<{ drug: string; dosage: string; frequency: string; duration: string }>>([]);
  const [newMedDrug, setNewMedDrug] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedFreq, setNewMedFreq] = useState('');
  const [newMedDuration, setNewMedDuration] = useState('');
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);

  // Alerta Médica Editable
  const [isEditingAllergies, setIsEditingAllergies] = useState(false);
  const [allergyInput, setAllergyInput] = useState('');

  // Modales
  const [isSelectPatientModalOpen, setIsSelectPatientModalOpen] = useState(false);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNewConsumableModalOpen, setIsNewConsumableModalOpen] = useState(false);
  const [isSubmittingPatient, setIsSubmittingPatient] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isSyncingCatalog, setIsSyncingCatalog] = useState(false);
  const [isSendingToCashier, setIsSendingToCashier] = useState(false);

  // Edición rápida de precios y procedimientos en presupuesto
  const [editingTreatmentId, setEditingTreatmentId] = useState<string | null>(null);
  const [tempPriceInput, setTempPriceInput] = useState<string>('');
  const [selectedCatalogToAdd, setSelectedCatalogToAdd] = useState<string>('');

  // Tasa de cambio oficial / configurada
  const tenantMeta = (currentTenant?.metadata as Record<string, any>) || {};
  const currentExchangeRate = Number(tenantMeta.exchange_rate?.rate || tenantMeta.exchange_rate || 850.0);

  // Especialista seleccionado actualmente
  const selectedDoctor = useMemo(() => {
    return dentalStaff.find((s) => s.id === selectedDoctorId);
  }, [dentalStaff, selectedDoctorId]);

  // 1. CARGA INICIAL DE DATOS CLÍNICOS, EQUIPO, TARIFAS Y CITAS DE HOY
  const loadClinicalData = useCallback(async () => {
    if (!tenantId) return;
    try {
      setIsLoading(true);
      const todayStr = new Date().toISOString().split('T')[0];

      const [custRes, apptRes, itemsRes, staffRes, pricingRes] = await Promise.allSettled([
        getEntitiesAction(tenantId, 'customer', 250, effectiveActor),
        getAppointmentsAction(tenantId, undefined, effectiveActor),
        getItemsAction(tenantId, undefined, 200, effectiveActor),
        getModuleStaffAction(tenantId, 'odontologia', effectiveActor),
        getModulePricingConfigAction(tenantId, 'odontologia', effectiveActor),
      ]);

      if (custRes.status === 'fulfilled' && custRes.value?.success && custRes.value?.entities) {
        const loadedPatients = custRes.value.entities;
        setCustomers(loadedPatients);
        if (typeof window !== 'undefined') {
          const searchParams = new URLSearchParams(window.location.search);
          const urlPatientId = searchParams.get('client_id') || searchParams.get('client');
          if (urlPatientId) {
            const matchedPatient = loadedPatients.find((p: Entity) => p.id === urlPatientId);
            if (matchedPatient) {
              setSelectedPatient(matchedPatient);
            }
          }
        }
      }

      if (apptRes.status === 'fulfilled' && apptRes.value?.success && apptRes.value?.appointments) {
        // Filtrar citas correspondientes a hoy
        const todayList = apptRes.value.appointments.filter((a: any) => {
          const aDate = a.date || (a.start_time ? a.start_time.split('T')[0] : '');
          return aDate === todayStr;
        });
        setTodayAppointments(todayList);
      }

      if (itemsRes.status === 'fulfilled' && itemsRes.value?.success && itemsRes.value?.items) {
        setInventoryItems(itemsRes.value.items);
        setDentalServices(
          itemsRes.value.items.filter((i: any) => i.type === 'service' || i.category?.toLowerCase().includes('odon'))
        );
      }

      if (staffRes.status === 'fulfilled' && staffRes.value?.success && staffRes.value?.staff) {
        const staffList = staffRes.value.staff;
        setDentalStaff(staffList);
        setSelectedDoctorId((prev) => {
          if (prev) return prev;
          const firstActive = staffList.find((s: ModuleStaffMember) => s.isActive);
          return firstActive ? firstActive.id : '';
        });
      }

      if (pricingRes.status === 'fulfilled' && pricingRes.value?.success && pricingRes.value?.config) {
        setDentalPricingConfig(pricingRes.value.config as DentalPricingConfig);
      }
    } catch (err: unknown) {
      console.error('[OdontologiaPage] Error cargando estación clínica:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, effectiveActor]);

  useEffect(() => {
    loadClinicalData();
  }, [loadClinicalData]);

  // 2. CARGA DE EXPEDIENTE DEL PACIENTE SELECCIONADO
  const loadPatientChartAndEvolutions = useCallback(
    async (patientId: string) => {
      if (!tenantId) return;
      try {
        setIsLoadingChart(true);
        const [chartRes, evoRes] = await Promise.allSettled([
          getDentalChartAction(patientId, tenantId, effectiveActor),
          getDentalEvolutionsAction(patientId, tenantId, effectiveActor),
        ]);

        if (chartRes.status === 'fulfilled' && chartRes.value?.success && chartRes.value?.chart) {
          setCurrentChart(chartRes.value.chart);
        } else {
          // Iniciar odontograma limpio si no existe previo
          setCurrentChart({
            mode: 'adult',
            teeth: {},
            supernumeraryTeeth: [],
            lastUpdated: new Date().toISOString(),
          });
        }

        if (evoRes.status === 'fulfilled' && evoRes.value?.success && evoRes.value?.evolutions) {
          setPatientEvolutions(evoRes.value.evolutions);
        } else {
          setPatientEvolutions([]);
        }
      } catch (err) {
        console.error('[loadPatientChartAndEvolutions]:', err);
      } finally {
        setIsLoadingChart(false);
      }
    },
    [tenantId, effectiveActor]
  );

  useEffect(() => {
    if (selectedPatient?.id) {
      loadPatientChartAndEvolutions(selectedPatient.id);
      const meta = (selectedPatient.metadata as any) || {};
      setAllergyInput(meta.allergies || meta.notes || '');
    } else {
      setCurrentChart(undefined);
      setPatientEvolutions([]);
      setEvolutionText('');
      setSelectedConsumables([]);
      setPrescriptionMeds([]);
    }
  }, [selectedPatient?.id, loadPatientChartAndEvolutions]);

  // Catálogo unificado de tratamientos dentales
  const unifiedDentalCatalog = useMemo(() => {
    return mergeTenantDentalServices(dentalServices);
  }, [dentalServices]);

  // CÁLCULO DE TRATAMIENTOS PLANIFICADOS UNIFICADO
  // Combina procedimientos del plan explícito + condiciones activas marcadas en el odontograma
  // Excluye condiciones existentes/históricas y evita duplicaciones
  const plannedTreatments = useMemo(() => {
    if (!currentChart) return [];

    const unifiedMap = new Map<string, {
      id: string;
      toothNum: string;
      condition: string;
      code: string;
      procedureName: string;
      category: string;
      cost: number;
      color: string;
      stages: Array<{ id: string; title: string; order: number; sessionNumber?: number }>;
      notes?: string;
      completed: boolean;
      source: 'tooth' | 'plan';
    }>();

    // 1. Incorporar condiciones planificadas marcadas en el arco dental
    if (currentChart.teeth) {
      Object.entries(currentChart.teeth).forEach(([num, data]) => {
        data.conditions?.forEach((c, cIdx) => {
          if (c.code !== 'ausente' && c.status !== 'existente') {
            const match = unifiedDentalCatalog.find((p) => p.conditionCode === c.code);
            const procName = match ? match.name : (c.label || `Tratamiento ${c.code.toUpperCase()}`);
            const cost = typeof c.customPrice === 'number' ? c.customPrice : (match ? match.defaultPriceUSD : 40.0);
            const category = match ? match.categoryLabel : 'Restauradora';
            const stages = match?.stages || [];
            const key = `${num}-${procName.toLowerCase()}`;

            unifiedMap.set(key, {
              id: `auto-${num}-${c.code}-${cIdx}`,
              toothNum: num,
              condition: c.label || c.code.toUpperCase(),
              code: c.code,
              procedureName: procName,
              category,
              cost,
              color: c.color || match?.color || '#0ea5e9',
              stages,
              notes: c.notes || data.notes,
              completed: c.status === 'realizado',
              source: 'tooth',
            });
          }
        });
      });
    }

    // 2. Incorporar procedimientos explícitos guardados en el plan de tratamiento
    if (currentChart.treatmentPlan?.procedures) {
      currentChart.treatmentPlan.procedures.forEach((p, idx) => {
        const match = unifiedDentalCatalog.find(
          (c) => c.name.toLowerCase() === p.procedure.toLowerCase() || (p.conditionCode && c.conditionCode === p.conditionCode)
        );
        const toothNum = p.toothNumber || 'General';
        const key = `${toothNum}-${p.procedure.toLowerCase()}`;

        // Si ya existe (derivado del odontograma), respetar el costo personalizado o notas del plan
        const existing = unifiedMap.get(key);
        if (existing) {
          unifiedMap.set(key, {
            ...existing,
            cost: typeof p.estimatedCost === 'number' && p.estimatedCost > 0 ? p.estimatedCost : existing.cost,
            notes: p.notes || existing.notes,
            completed: p.completed ?? existing.completed,
            stages: p.stages && p.stages.length > 0 ? p.stages : existing.stages,
          });
        } else {
          unifiedMap.set(key, {
            id: p.id || `plan-${idx}-${Date.now()}`,
            toothNum,
            condition: p.conditionCode || 'Tratamiento',
            code: p.conditionCode || 'general',
            procedureName: p.procedure,
            category: p.category || match?.categoryLabel || 'General',
            cost: typeof p.estimatedCost === 'number' ? p.estimatedCost : (match?.defaultPriceUSD || 40),
            color: match?.color || '#0ea5e9',
            stages: p.stages || match?.stages || [],
            notes: p.notes,
            completed: p.completed || false,
            source: 'plan',
          });
        }
      });
    }

    return Array.from(unifiedMap.values());
  }, [currentChart, unifiedDentalCatalog]);

  // Totales presupuestarios
  const totalBudgetUSD = useMemo(() => {
    return plannedTreatments.reduce((sum, item) => sum + (item.cost || 0), 0);
  }, [plannedTreatments]);

  const totalBudgetVES = useMemo(() => {
    return totalBudgetUSD * currentExchangeRate;
  }, [totalBudgetUSD, currentExchangeRate]);

  // Sugerido a cobrar hoy (las sesiones no completadas sugeridas)
  const todaySuggestedUSD = useMemo(() => {
    if (plannedTreatments.length === 0) return 0;
    // Si hay procedimientos con sesiones, calcular arancel de 1era sesión; sino el total
    return plannedTreatments.reduce((sum, t) => {
      if (t.stages && t.stages.length > 1) {
        return sum + Math.round((t.cost / t.stages.length) * 100) / 100;
      }
      return sum + t.cost;
    }, 0);
  }, [plannedTreatments]);

  const todaySuggestedVES = useMemo(() => {
    return todaySuggestedUSD * currentExchangeRate;
  }, [todaySuggestedUSD, currentExchangeRate]);

  // Metadatos del paciente activo
  const patientMeta = (selectedPatient?.metadata as any) || {};
  const patientAge = patientMeta.birth_date
    ? Math.floor((Date.now() - new Date(patientMeta.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;
  const patientDebt = Number(patientMeta.total_debt || 0);

  // Pacientes filtrados en el buscador omnicanal
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.tax_id && c.tax_id.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [searchQuery, customers]);

  // Insumos físicos descartables disponibles para consumo clínico (filtrados por categoría médica o consumible)
  const availableConsumables = useMemo(() => {
    const clinicalCategories = ['insumo', 'consumible', 'material', 'odontología', 'odontologia', 'farmacia', 'dental'];
    const supplies = inventoryItems.filter((i) => {
      const cat = (i.category || '').toLowerCase();
      const isMarkedConsumable = Boolean(i.metadata?.is_consumable || i.metadata?.clinical_supply);
      const matchesCategory = clinicalCategories.some((c) => cat.includes(c));
      return isMarkedConsumable || matchesCategory;
    });
    // Si no hay insumos categorizados explícitamente, mostrar los productos físicos con inventario
    if (supplies.length === 0) {
      return inventoryItems.filter((i) => i.type === 'product');
    }
    return supplies;
  }, [inventoryItems]);

  // GUARDAR ODONTOGRAMA
  const handleSaveChart = async (newChart: DentalChart) => {
    if (!tenantId || !effectiveActor || !selectedPatient) return;
    try {
      setIsSavingChart(true);
      const res = await saveDentalChartAction(selectedPatient.id, newChart, tenantId, effectiveActor);
      if (res.success) {
        setCurrentChart(newChart);
        toast({
          variant: 'success',
          title: 'Odontograma Guardado',
          description: `Se actualizó el registro dental de ${selectedPatient.name}.`,
        });
      } else {
        toast({
          variant: 'error',
          title: 'Error al guardar',
          description: res.error || 'No se pudo guardar el odontograma.',
        });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error de red', description: (err as Error).message });
    } finally {
      setIsSavingChart(false);
    }
  };

  // AGREGAR PROCEDIMIENTO RÁPIDO DEL CATÁLOGO AL PLAN DE TRATAMIENTO
  const handleAddProcedureToPlan = (procedureId: string) => {
    if (!selectedPatient || !procedureId) return;
    const item = unifiedDentalCatalog.find((p) => p.id === procedureId);
    if (!item) return;

    const currentPlan = currentChart?.treatmentPlan || {
      id: `plan-${Date.now()}`,
      title: `Plan Odontológico — ${selectedPatient.name}`,
      teeth: [],
      procedures: [],
      totalCost: 0,
      createdAt: new Date().toISOString(),
    };

    const newProc = {
      id: `proc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      toothNumber: 'Gral',
      conditionCode: item.code,
      procedure: item.name,
      category: item.categoryLabel,
      estimatedCost: item.defaultPriceUSD,
      completed: false,
      stages: item.stages || [],
      notes: 'Añadido desde catálogo de procedimientos',
    };

    const updatedPlan: DentalTreatmentPlan = {
      ...currentPlan,
      procedures: [...(currentPlan.procedures || []), newProc],
      totalCost: (currentPlan.totalCost || 0) + item.defaultPriceUSD,
    };

    const updatedChart: DentalChart = {
      ...(currentChart || {
        mode: 'adult',
        teeth: {},
        supernumeraryTeeth: [],
        lastUpdated: new Date().toISOString(),
      }),
      treatmentPlan: updatedPlan,
      lastUpdated: new Date().toISOString(),
    };

    handleSaveChart(updatedChart);
    toast({
      variant: 'success',
      title: 'Procedimiento Añadido',
      description: `${item.name} se agregó al presupuesto activo.`,
    });
  };

  // QUITAR PROCEDIMIENTO DEL PLAN O CONDICIÓN DEL DIENTE
  const handleRemovePlannedTreatment = (treatment: { id: string; toothNum: string; code: string; source: 'tooth' | 'plan' }) => {
    if (!currentChart || !selectedPatient) return;

    if (treatment.source === 'plan' && currentChart.treatmentPlan) {
      const filtered = (currentChart.treatmentPlan.procedures || []).filter((p) => p.id !== treatment.id);
      const updatedChart: DentalChart = {
        ...currentChart,
        treatmentPlan: {
          ...currentChart.treatmentPlan,
          procedures: filtered,
          totalCost: filtered.reduce((sum, p) => sum + (p.estimatedCost || 0), 0),
        },
        lastUpdated: new Date().toISOString(),
      };
      handleSaveChart(updatedChart);
      toast({ variant: 'info', title: 'Procedimiento Eliminado', description: 'Se quitó del presupuesto activo.' });
      return;
    }

    if (treatment.source === 'tooth' && currentChart.teeth && currentChart.teeth[treatment.toothNum]) {
      const toothData = currentChart.teeth[treatment.toothNum];
      const updatedConditions = (toothData.conditions || []).filter((c) => !(c.code === treatment.code && c.status !== 'existente'));
      const updatedChart: DentalChart = {
        ...currentChart,
        teeth: {
          ...currentChart.teeth,
          [treatment.toothNum]: {
            ...toothData,
            conditions: updatedConditions,
          },
        },
        lastUpdated: new Date().toISOString(),
      };
      handleSaveChart(updatedChart);
      toast({ variant: 'info', title: 'Tratamiento Quitado', description: `Se removió de la pieza #${treatment.toothNum}.` });
    }
  };

  // ACTUALIZAR PRECIO PERSONALIZADO DE UN TRATAMIENTO EN VIVO
  const handleUpdateTreatmentCost = (treatment: { id: string; toothNum: string; code: string; source: 'tooth' | 'plan' }, newCost: number) => {
    if (!currentChart || !selectedPatient || isNaN(newCost) || newCost < 0) return;

    if (treatment.source === 'plan' && currentChart.treatmentPlan) {
      const updated = (currentChart.treatmentPlan.procedures || []).map((p) => {
        if (p.id === treatment.id) {
          return { ...p, estimatedCost: newCost };
        }
        return p;
      });
      const updatedChart: DentalChart = {
        ...currentChart,
        treatmentPlan: {
          ...currentChart.treatmentPlan,
          procedures: updated,
          totalCost: updated.reduce((sum, p) => sum + (p.estimatedCost || 0), 0),
        },
        lastUpdated: new Date().toISOString(),
      };
      handleSaveChart(updatedChart);
      return;
    }

    if (treatment.source === 'tooth' && currentChart.teeth && currentChart.teeth[treatment.toothNum]) {
      const toothData = currentChart.teeth[treatment.toothNum];
      const updatedConditions = (toothData.conditions || []).map((c) => {
        if (c.code === treatment.code && c.status !== 'existente') {
          return { ...c, customPrice: newCost };
        }
        return c;
      });
      const updatedChart: DentalChart = {
        ...currentChart,
        teeth: {
          ...currentChart.teeth,
          [treatment.toothNum]: {
            ...toothData,
            conditions: updatedConditions,
          },
        },
        lastUpdated: new Date().toISOString(),
      };
      handleSaveChart(updatedChart);
    }
  };

  // ENVIAR ORDEN A CAJA MOSTRADOR (RECEPCIÓN DESACOPLADA)
  const handleSendOrderToCashier = async () => {
    if (!tenantId || !effectiveActor || !selectedPatient) return;
    if (plannedTreatments.length === 0) {
      toast({
        variant: 'warning',
        title: 'Sin tratamientos a cobrar',
        description: 'No hay procedimientos activos planificados en el odontograma para facturar.',
      });
      return;
    }

    try {
      setIsSendingToCashier(true);
      const itemsToCharge = plannedTreatments.map((t) => ({
        id: t.id,
        toothNum: t.toothNum,
        procedureName: t.procedureName,
        cost: t.cost,
        category: t.category,
        notes: t.notes,
      }));

      const doctorInfo = selectedDoctor
        ? {
            doctorId: selectedDoctor.id,
            doctorName: selectedDoctor.name,
            doctorCommissionPercent: selectedDoctor.commissionPercent,
          }
        : undefined;

      const res = await sendDentalOrderToCashierAction(
        selectedPatient.id,
        selectedPatient.name,
        itemsToCharge,
        todaySuggestedUSD,
        tenantId,
        effectiveActor,
        doctorInfo
      );

      if (res.success) {
        toast({
          variant: 'success',
          title: 'Orden Despachada a Caja',
          description: `Se notificó a recepción (#${res.documentNumber}). El sillón ha quedado liberado para el siguiente paciente.`,
        });

        // Marcar cita de hoy como atendida/completada si existía
        const currentAppt = todayAppointments.find(
          (a) => a.client_id === selectedPatient.id || a.entity_id === selectedPatient.id
        );
        if (currentAppt) {
          await updateAppointmentStatusAction(currentAppt.id, 'completed', tenantId, effectiveActor);
          loadClinicalData();
        }

        // Liberar pantalla del odontólogo para atender al siguiente paciente
        setSelectedPatient(null);
      } else {
        toast({
          variant: 'error',
          title: 'Error al enviar orden',
          description: res.error || 'No se pudo despachar la orden a la caja.',
        });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error', description: (err as Error).message });
    } finally {
      setIsSendingToCashier(false);
    }
  };

  // DESPACHO RÁPIDO DESDE MODO SILLÓN EXPRESS A CAJA
  const handleExpressSendToCashier = async (
    items: Array<{ toothNum: string; procedureName: string; cost: number; category?: string; notes?: string }>,
    notes?: string
  ) => {
    if (!tenantId || !effectiveActor || !selectedPatient) return;
    const totalCost = items.reduce((acc, curr) => acc + curr.cost, 0);
    try {
      const doctorInfo = selectedDoctor
        ? {
            doctorId: selectedDoctor.id,
            doctorName: selectedDoctor.name,
            doctorCommissionPercent: selectedDoctor.commissionPercent,
          }
        : undefined;

      const res = await sendDentalOrderToCashierAction(
        selectedPatient.id,
        selectedPatient.name,
        items,
        totalCost,
        tenantId,
        effectiveActor,
        doctorInfo
      );

      if (res.success) {
        if (notes && notes.trim()) {
          await saveDentalEvolutionAction(
            selectedPatient.id,
            {
              patientId: selectedPatient.id,
              note: notes.trim(),
              teethInvolved: items.map((i) => i.toothNum).filter(Boolean),
              doctorName: session?.userEmail || effectiveActor.email,
            },
            tenantId,
            effectiveActor
          );
        }

        toast({
          variant: 'success',
          title: 'Orden Despachada a Caja',
          description: `Se despachó la orden a recepción (#${res.documentNumber}). El sillón ha quedado liberado.`,
        });

        // Marcar cita como completada si aplica
        const currentAppt = todayAppointments.find(
          (a) => a.client_id === selectedPatient.id || a.entity_id === selectedPatient.id
        );
        if (currentAppt) {
          await updateAppointmentStatusAction(currentAppt.id, 'completed', tenantId, effectiveActor);
        }

        setSelectedPatient(null);
        loadClinicalData();
      } else {
        toast({
          variant: 'error',
          title: 'Error al enviar orden',
          description: res.error || 'No se pudo despachar a la caja.',
        });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error', description: (err as Error).message });
    }
  };

  // GUARDAR EVOLUCIÓN CLÍNICA DE HOY
  const handleSaveEvolution = async () => {
    if (!tenantId || !effectiveActor || !selectedPatient) return;
    if (!evolutionText.trim()) {
      toast({
        variant: 'warning',
        title: 'Evolución vacía',
        description: 'Escribe una breve descripción del procedimiento realizado en la consulta.',
      });
      return;
    }

    try {
      setIsSavingEvolution(true);
      const teethInvolved = Array.from(new Set(plannedTreatments.map((t) => t.toothNum).filter(Boolean)));

      const res = await saveDentalEvolutionAction(
        selectedPatient.id,
        {
          patientId: selectedPatient.id,
          note: evolutionText.trim(),
          teethInvolved,
          doctorName: session?.userEmail || effectiveActor.email,
          extraConsumables: selectedConsumables,
          prescription: prescriptionMeds.length > 0 ? { medications: prescriptionMeds } : undefined,
        },
        tenantId,
        effectiveActor
      );

      if (res.success) {
        toast({
          variant: 'success',
          title: 'Evolución Registrada',
          description: 'La nota clínica fue guardada y los insumos fueron descontados del inventario.',
        });
        setEvolutionText('');
        setSelectedConsumables([]);
        setShowPrescriptionForm(false);
        loadPatientChartAndEvolutions(selectedPatient.id);
      } else {
        toast({
          variant: 'error',
          title: 'Error al registrar',
          description: res.error || 'No se pudo guardar la evolución.',
        });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error', description: (err as Error).message });
    } finally {
      setIsSavingEvolution(false);
    }
  };

  // AGREGAR CONSUMIBLE A LA EVOLUCIÓN
  const handleAddConsumable = () => {
    if (!selectedConsumableId) return;
    const item = inventoryItems.find((i) => i.id === selectedConsumableId);
    if (!item) return;

    setSelectedConsumables((prev) => {
      const existing = prev.find((c) => c.itemId === selectedConsumableId);
      if (existing) {
        return prev.map((c) =>
          c.itemId === selectedConsumableId ? { ...c, quantity: c.quantity + consumableQty } : c
        );
      }
      return [
        ...prev,
        {
          itemId: item.id,
          name: item.name,
          quantity: consumableQty,
          cost: item.cost || 0,
        },
      ];
    });

    setSelectedConsumableId('');
    setConsumableQty(1);
  };

  // AGREGAR MEDICAMENTO AL RÉCIPE
  const handleAddPrescriptionMed = () => {
    if (!newMedDrug.trim()) return;
    setPrescriptionMeds((prev) => [
      ...prev,
      {
        drug: newMedDrug.trim(),
        dosage: newMedDosage.trim() || '1 tableta',
        frequency: newMedFreq.trim() || 'Cada 8 horas',
        duration: newMedDuration.trim() || 'Por 5 días',
      },
    ]);
    setNewMedDrug('');
    setNewMedDosage('');
    setNewMedFreq('');
    setNewMedDuration('');
  };

  // ENVIAR RÉCIPE MÉDICO POR WHATSAPP
  const handleSendPrescriptionWhatsApp = () => {
    if (!selectedPatient?.phone) {
      toast({ variant: 'warning', title: 'Sin teléfono', description: 'El paciente no tiene número registrado.' });
      return;
    }
    const cleanPhone = selectedPatient.phone.replace(/[^0-9]/g, '');
    let msg = `*RÉCIPE E INDICACIONES ODONTOLÓGICAS*\n`;
    msg += `Paciente: *${selectedPatient.name}*\n`;
    msg += `Fecha: ${new Date().toLocaleDateString('es-VE')}\n\n`;
    msg += `*Tratamiento Farmacológico:*\n`;
    prescriptionMeds.forEach((m, idx) => {
      msg += `${idx + 1}. *${m.drug}* — ${m.dosage}\n   Tomar: ${m.frequency} (${m.duration})\n`;
    });
    msg += `\n*Recomendaciones Generales:*\n- No escupir ni usar pitillos las primeras 24 horas.\n- Mantener higiene suave en la zona intervenida.\n- En caso de dolor agudo o inflamación, comunicarse de inmediato con la clínica.`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ACTUALIZAR ALERTA MÉDICA (ALERGIAS / ANTECEDENTES)
  const handleSaveAllergies = async () => {
    if (!tenantId || !effectiveActor || !selectedPatient) return;
    try {
      const updatedMeta = {
        ...(selectedPatient.metadata || {}),
        allergies: allergyInput.trim(),
      };
      const res = await updateEntityAction(
        selectedPatient.id,
        { metadata: updatedMeta },
        tenantId,
        effectiveActor
      );

      if (res.success) {
        toast({ variant: 'success', title: 'Alerta Médica Actualizada', description: 'Se guardó en el expediente del paciente.' });
        setSelectedPatient({ ...selectedPatient, metadata: updatedMeta });
        setIsEditingAllergies(false);
      } else {
        toast({ variant: 'error', title: 'Error', description: res.error });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error', description: (err as Error).message });
    }
  };

  // SINCRONIZAR CATÁLOGO MAESTRO CON INVENTARIO
  const handleSyncMasterCatalog = async () => {
    if (!tenantId || !effectiveActor || isSyncingCatalog) return;
    try {
      setIsSyncingCatalog(true);
      const res = await syncDentalCatalogToInventoryAction(tenantId, effectiveActor);
      if (res.success) {
        toast({
          variant: 'success',
          title: 'Catálogo Sincronizado',
          description: `Se sembraron ${res.seededCount} nuevos procedimientos dentales en el Inventario.`,
        });
        loadClinicalData();
      } else {
        toast({ variant: 'error', title: 'Error de sincronización', description: res.error });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error', description: (err as Error).message });
    } finally {
      setIsSyncingCatalog(false);
    }
  };

  // CREAR NUEVO PACIENTE DESDE MODAL
  const handleCreatePatientSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!tenantId || !effectiveActor) return;
    setIsSubmittingPatient(true);
    const form = new FormData(e.currentTarget);
    const name = (form.get('name') as string)?.trim();

    if (!name) {
      toast({ variant: 'warning', title: 'Nombre requerido', description: 'Ingresa el nombre del paciente.' });
      setIsSubmittingPatient(false);
      return;
    }

    try {
      const res = await createEntityAction(
        {
          type: 'customer',
          name,
          phone: (form.get('phone') as string)?.trim() || null,
          email: (form.get('email') as string)?.trim() || null,
          tax_id: (form.get('tax_id') as string)?.trim() || null,
          metadata: {
            birth_date: (form.get('birth_date') as string) || null,
            allergies: (form.get('allergies') as string)?.trim() || '',
            has_history: true,
          },
        },
        tenantId,
        effectiveActor
      );

      if (res.success && res.entity) {
        toast({
          variant: 'success',
          title: 'Paciente Registrado',
          description: `Se abrió el expediente clínico de ${name}.`,
        });
        setCustomers((prev) => [res.entity as Entity, ...prev]);
        setSelectedPatient(res.entity as Entity);
        setIsNewPatientModalOpen(false);
      } else {
        toast({ variant: 'error', title: 'Error al registrar', description: res.error });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error', description: (err as Error).message });
    } finally {
      setIsSubmittingPatient(false);
    }
  };

  // ENVIAR A TABLERO KANBAN
  const handleCreateKanban = async (plan: DentalTreatmentPlan) => {
    if (!tenantId || !effectiveActor || !selectedPatient) return;
    try {
      const res = await createTreatmentKanbanFromChartAction(
        selectedPatient.id,
        selectedPatient.name,
        plan,
        tenantId,
        effectiveActor
      );
      if (res.success) {
        toast({
          variant: 'success',
          title: 'Enviado a Kanban',
          description: `Orden de tratamiento creada con éxito en el tablero de trabajo.`,
        });
      } else {
        toast({ variant: 'error', title: 'Error', description: res.error });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error', description: (err as Error).message });
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-28 space-y-5 animate-in fade-in duration-300">
      {/* 1. CABECERA & CONTROLES DE LA ESTACIÓN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <Stethoscope size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                Estación Odontológica
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold border border-teal-500/20">
                  Suite 360°
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Atención clínica integral en sillón · Conexión directa con Caja POS, Inventario y Agenda
              </p>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas del Módulo & Estado del Sillón */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {selectedPatient ? (
            <div className="flex items-center gap-1.5 p-1 bg-teal-500/10 border border-teal-500/30 rounded-2xl">
              <span className="text-xs font-black text-teal-600 dark:text-teal-400 px-2 py-1 flex items-center gap-1">
                Sillón: <strong className="text-foreground">{selectedPatient.name.split(' ')[0]}</strong>
              </span>
              <button
                type="button"
                onClick={() => setIsSelectPatientModalOpen(true)}
                className="px-2.5 py-1 bg-card hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground border border-border rounded-xl text-xs font-bold transition-all shadow-2xs btn-haptic flex items-center gap-1"
                title="Cambiar paciente en sillón"
              >
                <ArrowRightLeft size={13} className="text-teal-500" />
                <span>Cambiar</span>
              </button>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs btn-haptic flex items-center gap-1"
                title="Ver/Editar Ficha Médica"
              >
                <UserCheck size={13} />
                <span>Ficha</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(true)}
                disabled={plannedTreatments.length === 0}
                className="px-2.5 py-1 bg-slate-900 hover:bg-black dark:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1 btn-haptic"
                title="Cobrar Tratamientos Planificados"
              >
                <CreditCard size={13} />
                <span>Cobrar (${totalBudgetUSD.toFixed(0)})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="p-1 text-slate-400 hover:text-foreground rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                title="Desocupar sillón"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSelectPatientModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black transition-all shadow-sm shadow-teal-600/20 btn-haptic"
              >
                <Users size={14} />
                <span>Seleccionar Paciente</span>
              </button>
              <div className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-border flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Sillón Desocupado</span>
              </div>
            </div>
          )}

          {selectedPatient && (
            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-blue-500/50 hover:text-blue-600 transition-all shadow-xs btn-haptic"
            >
              <Clock size={13} />
              <span>+ Cita</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSyncMasterCatalog}
            disabled={isSyncingCatalog}
            title="Sincronizar procedimientos con la tabla de inventario general"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-teal-500/50 hover:text-teal-600 transition-all shadow-xs btn-haptic"
          >
            <RefreshCw size={13} className={isSyncingCatalog ? 'animate-spin text-teal-500' : ''} />
            <span className="hidden sm:inline">Sincronizar</span> Catálogo
          </button>

          <button
            type="button"
            onClick={() => router.push('/inventario')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-primary/50 hover:text-primary transition-all shadow-xs btn-haptic"
          >
            <Package size={13} />
            <span>Inventario</span>
          </button>

          <button
            type="button"
            onClick={() => router.push('/caja')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-emerald-500/50 hover:text-emerald-600 transition-all shadow-xs btn-haptic"
          >
            <DollarSign size={13} />
            <span>Caja POS</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewPatientModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 btn-haptic"
          >
            <Plus size={15} />
            <span>+ Paciente</span>
          </button>
        </div>
      </div>

      {/* SUBNAVEGACIÓN DE MÓDULO */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setMainTab('sillon')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            mainTab === 'sillon'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
              : 'bg-card border border-border text-slate-500 hover:text-foreground'
          }`}
        >
          <Stethoscope size={15} />
          <span>Sillón & Consulta Clínica</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('staff')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            mainTab === 'staff'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
              : 'bg-card border border-border text-slate-500 hover:text-foreground'
          }`}
        >
          <Users size={15} />
          <span>Especialistas & Honorarios ({dentalStaff.filter((s) => s.isActive).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('pricing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            mainTab === 'pricing'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
              : 'bg-card border border-border text-slate-500 hover:text-foreground'
          }`}
        >
          <ClipboardList size={15} />
          <span>Aranceles & Procedimientos ({unifiedDentalCatalog.length})</span>
        </button>
      </div>

      {/* PESTAÑA: ESPECIALISTAS Y HONORARIOS */}
      {mainTab === 'staff' && (
        <div className="pt-2 animate-in fade-in duration-200">
          <DentalStaffTab
            staff={dentalStaff}
            onRefresh={loadClinicalData}
            tenantId={tenantId}
            actor={effectiveActor}
          />
        </div>
      )}

      {/* PESTAÑA: ARANCELES Y PROCEDIMIENTOS */}
      {mainTab === 'pricing' && (
        <div className="pt-2 animate-in fade-in duration-200">
          <DentalPricingTab
            procedures={unifiedDentalCatalog}
            pricingConfig={dentalPricingConfig}
            onRefresh={loadClinicalData}
            tenantId={tenantId}
            actor={effectiveActor}
          />
        </div>
      )}

      {/* PESTAÑA: SILLÓN DENTAL Y CONSULTA CLÍNICA */}
      {mainTab === 'sillon' && (
        <>
          {/* 2. BARRA DE CITAS DEL DÍA & BUSCADOR OMNICANAL */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
        {/* Tira de Citas de Hoy (7 columnas en desktop) */}
        <div className="lg:col-span-8 bg-card border border-border rounded-2xl p-2.5 shadow-xs overflow-hidden">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 pl-1">
              <Clock size={13} className="text-teal-500" />
              Citas Hoy:
            </span>

            {todayAppointments.length === 0 ? (
              <span className="text-xs text-slate-400 italic pl-2">
                Sin citas agendadas para hoy · Utiliza el buscador para iniciar consulta
              </span>
            ) : (
              todayAppointments.map((appt) => {
                const isSelected = selectedPatient?.id === (appt.client_id || appt.entity_id);
                const apptPatient = customers.find((c) => c.id === (appt.client_id || appt.entity_id));
                const apptTime = appt.start_time ? appt.start_time.slice(11, 16) : '09:00';

                return (
                  <button
                    key={appt.id}
                    type="button"
                    onClick={() => {
                      if (apptPatient) setSelectedPatient(apptPatient);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                      isSelected
                        ? 'bg-teal-500 text-white border-teal-600 shadow-sm'
                        : 'bg-background hover:bg-slate-50 dark:hover:bg-slate-800 text-foreground border-border'
                    }`}
                  >
                    <span className="font-mono text-[11px] opacity-80">{apptTime}</span>
                    <span>{appt.client_name || apptPatient?.name || 'Paciente'}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-black/10 dark:bg-white/10 uppercase">
                      {appt.service_title || 'Consulta'}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Buscador de Pacientes (4 columnas en desktop) */}
        <div className="lg:col-span-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Buscar por nombre, cédula o teléfono..."
              className="w-full bg-card border border-border rounded-2xl pl-9 pr-4 py-2.5 text-xs font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}

            {/* Menú Flotante de Resultados de Búsqueda */}
            {isSearchOpen && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-border">
                {searchResults.map((cust) => (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => {
                      setSelectedPatient(cust);
                      setSearchQuery('');
                      setIsSearchOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-xs font-bold text-foreground group-hover:text-teal-600 transition-colors">
                        {cust.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {cust.tax_id ? `ID: ${cust.tax_id} · ` : ''}
                        {cust.phone || 'Sin teléfono'}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsSelectPatientModalOpen(true)}
            className="p-2.5 bg-card hover:bg-slate-100 dark:hover:bg-slate-800 border border-border rounded-2xl text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1.5 shrink-0 btn-haptic shadow-xs"
            title="Abrir directorio completo de pacientes"
          >
            <Users size={15} />
            <span className="hidden sm:inline">Directorio</span>
          </button>
        </div>
      </div>

      {/* 3. FICHA DEL PACIENTE ACTIVO & ALERTA CLÍNICA */}
      {selectedPatient ? (
        <div className="bg-card border border-border rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-teal-500/20 to-cyan-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-black text-lg border border-teal-500/30 shrink-0">
                {selectedPatient.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black text-foreground">{selectedPatient.name}</h2>
                  {patientAge !== null && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {patientAge} años
                    </span>
                  )}
                  {patientDebt > 0 ? (
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                      Saldo Deudor: ${patientDebt.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Cuenta al día
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-0.5 flex-wrap">
                  {selectedPatient.tax_id && <span>C.I: <strong className="font-mono text-foreground">{selectedPatient.tax_id}</strong></span>}
                  {selectedPatient.phone && <span>Tel: <strong className="font-mono text-foreground">{selectedPatient.phone}</strong></span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setIsSelectPatientModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all shadow-2xs btn-haptic"
                title="Cambiar paciente en sillón"
              >
                <ArrowRightLeft size={14} className="text-teal-500" />
                <span>Cambiar Paciente</span>
              </button>

              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20 text-xs font-bold transition-all border border-teal-500/30 btn-haptic shadow-2xs"
                title="Ver y editar ficha completa, antecedentes e historia médica del paciente"
              >
                <UserCheck size={14} />
                <span>Ver / Editar Ficha</span>
              </button>

              {selectedPatient.phone && (
                <a
                  href={`https://wa.me/${selectedPatient.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${selectedPatient.name}, te escribimos de la clínica dental.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-all border border-emerald-500/20"
                >
                  <MessageSquare size={14} />
                  <span>WhatsApp</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Cerrar consulta actual"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Píldora de Alerta Médica / Antecedentes */}
          <div className="pt-2 border-t border-border/60">
            {isEditingAllergies ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  placeholder="Ej. Alergia a Penicilina, Hipertensión, Diabético, Toma anticoagulantes..."
                  className="flex-1 bg-background border border-input rounded-xl px-3 py-1.5 text-xs font-semibold text-foreground focus:ring-2 focus:ring-rose-500/30"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveAllergies}
                  className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingAllergies(false)}
                  className="px-3 py-1.5 border border-border text-slate-500 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={14} className="text-rose-500 shrink-0" />
                  <span className="text-xs font-black text-rose-500 uppercase tracking-wider">
                    Alerta Médica:
                  </span>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {patientMeta.allergies || patientMeta.notes || 'Sin antecedentes patológicos declarados.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="text-[11px] font-bold text-teal-600 hover:underline"
                >
                  {patientMeta.allergies ? 'Editar Alerta' : '+ Agregar Alerta'}
                </button>
              </div>
            )}
          </div>

          {/* Selector de Especialista Tratante para la Consulta */}
          <div className="pt-2.5 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 shrink-0">
                Especialista a Cargo:
              </span>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="bg-background border border-border rounded-xl px-2.5 py-1 text-xs font-bold text-foreground focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="">Seleccionar odontólogo tratante...</option>
                {dentalStaff.filter((d) => d.isActive).map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.avatar || '🦷'} {doc.name} — {doc.role || 'Especialista'} ({doc.commissionPercent || 45}% honorarios)
                  </option>
                ))}
              </select>
            </div>
            {selectedDoctor && (
              <div className="flex items-center gap-2 text-xs font-bold text-teal-600 dark:text-teal-400">
                <span>Honorario pactado: {selectedDoctor.commissionPercent || 45}%</span>
                {selectedDoctor.licenseNumber && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span className="text-slate-500 font-medium">MPPS/Col: {selectedDoctor.licenseNumber}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Estado Vacío de Sillón Dental - HUB DE RECEPCIÓN Y ENTRADA AL SILLÓN */
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Stethoscope size={28} />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground">Sillón Dental Desocupado</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Elige un paciente del directorio, atiende una cita del día o registra un nuevo paciente para comenzar su diagnóstico en el odontograma.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setIsSelectPatientModalOpen(true)}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-teal-600/20 flex items-center gap-2 btn-haptic"
              >
                <Users size={16} />
                <span>Abrir Directorio ({customers.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setIsNewPatientModalOpen(true)}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-black hover:bg-primary/90 transition-all flex items-center gap-1.5 btn-haptic shadow-sm shadow-primary/20"
              >
                <UserPlus size={16} />
                <span>+ Registrar Paciente</span>
              </button>
            </div>
          </div>

          {/* Citas de Hoy Esperando Pasar al Sillón */}
          {todayAppointments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={14} className="text-teal-500" />
                  Citas Agendadas para Hoy ({todayAppointments.length})
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  Listas para pasar a sillón
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {todayAppointments.slice(0, 6).map((appt) => {
                  const apptPatient = customers.find((c) => c.id === (appt.client_id || appt.entity_id));
                  const apptTime = appt.start_time ? appt.start_time.slice(11, 16) : '09:00';
                  return (
                    <div
                      key={appt.id}
                      className="p-3.5 rounded-2xl border border-border bg-background hover:border-teal-500/40 transition-all flex items-center justify-between gap-3 shadow-2xs group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400">
                            {apptTime}
                          </span>
                          <span className="text-xs font-bold text-foreground truncate">
                            {appt.client_name || apptPatient?.name || 'Paciente'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 truncate">
                          {appt.service_title || 'Consulta Odontológica'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (apptPatient) {
                            setSelectedPatient(apptPatient);
                          } else if (appt.client_id || appt.entity_id) {
                            const pId = appt.client_id || appt.entity_id;
                            const found = customers.find((c) => c.id === pId);
                            if (found) setSelectedPatient(found);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-teal-500/10 text-teal-600 hover:bg-teal-600 hover:text-white dark:text-teal-400 dark:hover:text-white text-xs font-bold transition-all shrink-0 btn-haptic"
                      >
                        Pasar a Sillón
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Directorio de Pacientes Recientes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users size={14} className="text-teal-500" />
                Pacientes en Directorio
              </span>
              <button
                type="button"
                onClick={() => setIsSelectPatientModalOpen(true)}
                className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1"
              >
                <span>Ver todos los {customers.length} pacientes</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {customers.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-2xl">
                <p className="text-xs font-bold text-slate-500">No hay pacientes registrados aún</p>
                <button
                  type="button"
                  onClick={() => setIsNewPatientModalOpen(true)}
                  className="mt-2 text-xs font-bold text-teal-600 hover:underline"
                >
                  Registrar el primer paciente
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {customers.slice(0, 6).map((cust) => {
                  const meta = (cust.metadata as Record<string, any>) || {};
                  const allergies = meta.allergies || '';
                  const debt = Number(meta.total_debt || meta.pending_debt || 0);

                  return (
                    <div
                      key={cust.id}
                      onClick={() => setSelectedPatient(cust)}
                      className="p-3.5 rounded-2xl border border-border bg-background hover:border-teal-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs group btn-haptic"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center font-black text-sm shrink-0 group-hover:scale-105 transition-transform">
                          {cust.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate group-hover:text-teal-600 transition-colors">
                            {cust.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                            {cust.tax_id && <span>ID: {cust.tax_id}</span>}
                            {debt > 0 ? (
                              <span className="text-red-500 font-bold font-sans">Deuda: ${debt.toFixed(0)}</span>
                            ) : (
                              <span className="text-emerald-500 font-sans">Al día</span>
                            )}
                          </div>
                          {allergies && (
                            <span className="text-[9px] font-bold text-rose-500 truncate block mt-0.5" title={allergies}>
                              ⚠️ {allergies}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-400 group-hover:text-teal-600 transition-colors shrink-0">
                        Atender →
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. WORKSPACE CLÍNICO (MODO SILLÓN EXPRESS VS MODO INTEGRAL PRO) */}
      {selectedPatient && (
        viewMode === 'express' ? (
          <div className="animate-in fade-in duration-200">
            <DentalSillonExpress
              patient={selectedPatient}
              chart={currentChart}
              onSaveChart={handleSaveChart}
              dentalCatalog={unifiedDentalCatalog}
              onSendToCashier={handleExpressSendToCashier}
              onOpenCheckout={() => setIsCheckoutModalOpen(true)}
              isSaving={isSavingChart}
              doctors={dentalStaff.filter((d) => d.isActive)}
              selectedDoctorId={selectedDoctorId}
              onSelectDoctorId={setSelectedDoctorId}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* STEPPER DE ESTACIONES CLÍNICAS (FLUJO PANORÁMICO PASO A PASO) */}
            <div className="bg-card border border-border rounded-3xl p-2 sm:p-2.5 shadow-xs">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setClinicalStation('diagnostico')}
                  className={`py-3 px-3.5 rounded-2xl text-left transition-all flex items-center gap-3 border ${
                    clinicalStation === 'diagnostico'
                      ? 'bg-teal-500/10 border-teal-500/30 text-teal-600 dark:text-teal-400 shadow-xs'
                      : 'border-transparent text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                    clinicalStation === 'diagnostico' ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    1
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-black uppercase tracking-wide truncate block">Diagnóstico & Plan</span>
                      {plannedTreatments.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-teal-600 text-white shrink-0">
                          {plannedTreatments.length}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 truncate block">Odontograma 360° + Presupuesto</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setClinicalStation('especialidades')}
                  className={`py-3 px-3.5 rounded-2xl text-left transition-all flex items-center gap-3 border ${
                    clinicalStation === 'especialidades'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-xs'
                      : 'border-transparent text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                    clinicalStation === 'especialidades' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    2
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-black uppercase tracking-wide truncate block">Especialidades</span>
                    <span className="text-[10px] text-slate-400 truncate block">Brackets, Endo & Perio</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setClinicalStation('evolucion')}
                  className={`py-3 px-3.5 rounded-2xl text-left transition-all flex items-center gap-3 border ${
                    clinicalStation === 'evolucion'
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400 shadow-xs'
                      : 'border-transparent text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                    clinicalStation === 'evolucion' ? 'bg-cyan-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    3
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-black uppercase tracking-wide truncate block">Evolución & Insumos</span>
                    <span className="text-[10px] text-slate-400 truncate block">Nota SOAP + Fármacos</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setClinicalStation('expediente')}
                  className={`py-3 px-3.5 rounded-2xl text-left transition-all flex items-center gap-3 border ${
                    clinicalStation === 'expediente'
                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400 shadow-xs'
                      : 'border-transparent text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                    clinicalStation === 'expediente' ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    4
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-black uppercase tracking-wide truncate block">Expediente & Citas</span>
                    <span className="text-[10px] text-slate-400 truncate block">Rx, Documentos & Turnos</span>
                  </div>
                </button>
              </div>
            </div>

            {/* ESTACIÓN 1: DIAGNÓSTICO & ODONTOGRAMA 360° */}
            {clinicalStation === 'diagnostico' && (
              <div className="space-y-6">
                {/* 1.1 ODONTOGRAMA INTERACTIVO FDI */}
                <div className="bg-card border border-border rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <h3 className="text-sm font-black text-foreground uppercase tracking-wide">
                        Odontograma Interactivo FDI (Arco Dental Panorámico)
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-400">
                      Última mod: {currentChart?.lastUpdated ? new Date(currentChart.lastUpdated).toLocaleTimeString('es-VE') : 'Hoy'}
                    </span>
                  </div>

                  {isLoadingChart ? (
                    <div className="py-24 text-center space-y-3">
                      <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs text-slate-500 font-bold">Cargando arco dental del paciente...</p>
                    </div>
                  ) : (
                    <Odontogram
                      entityId={selectedPatient.id}
                      entityName={selectedPatient.name}
                      initialChart={currentChart}
                      onSave={handleSaveChart}
                      onCreateKanban={handleCreateKanban}
                      isSaving={isSavingChart}
                      dentalCatalog={unifiedDentalCatalog}
                      onOpenCheckout={() => setIsCheckoutModalOpen(true)}
                      onOpenSchedule={(hint) => setIsScheduleModalOpen(true)}
                    />
                  )}
                </div>

                {/* 1.2 PRESUPUESTO & PROCEDIMIENTOS PLANIFICADOS */}
                <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
                    <div>
                      <h3 className="text-sm font-black text-foreground uppercase tracking-wide flex items-center gap-2">
                        <ClipboardList size={16} className="text-teal-500" />
                        <span>Plan de Tratamiento & Presupuesto Panorámico</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Costes calculados a partir de los hallazgos del odontograma y procedimientos asignados manualmente.
                      </p>
                    </div>

                    {/* Resumen Financiero Multimoneda */}
                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/40 px-4 py-2.5 rounded-2xl border border-border">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total USD</span>
                        <span className="text-lg font-black text-foreground font-mono leading-none">${totalBudgetUSD.toFixed(2)}</span>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Oficial BCV</span>
                        <span className="text-lg font-black text-teal-600 dark:text-teal-400 font-mono leading-none">
                          Bs. {totalBudgetVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Selector Rápido para Añadir Procedimiento General del Catálogo al Plan */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-border flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex items-center gap-2 shrink-0">
                      <Plus size={15} className="text-teal-500" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Agregar al Plan:
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <select
                        value={selectedCatalogToAdd}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            handleAddProcedureToPlan(val);
                            setSelectedCatalogToAdd('');
                          }
                        }}
                        className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden font-medium"
                      >
                        <option value="">Seleccionar del catálogo (Limpieza, Blanqueamiento, Exodoncia, Resina, Corona...)</option>
                        {unifiedDentalCatalog.map((proc) => (
                          <option key={proc.id} value={proc.id}>
                            {proc.name} — ${proc.defaultPriceUSD} USD ({proc.categoryLabel})
                          </option>
                        ))}
                      </select>
                    </div>

                    <span className="text-[11px] text-slate-400 shrink-0 self-center">
                      {unifiedDentalCatalog.length} disponibles
                    </span>
                  </div>

                  {/* Grilla de Procedimientos Derivados del Odontograma y Plan */}
                  <div className="space-y-2.5">
                    {plannedTreatments.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 border border-dashed border-border rounded-2xl p-6">
                        <p className="text-sm font-bold">Sin tratamientos activos planificados</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                          Marca caries, coronas o tratamientos en el odontograma superior o agrégalos desde el selector para sumarlos al presupuesto y enviarlos a caja.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {plannedTreatments.map((t) => (
                          <div
                            key={t.id}
                            className="p-3.5 rounded-2xl border border-border bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-3 hover:border-teal-500/40 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-black text-xs shrink-0">
                                #{t.toothNum}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground leading-tight truncate">{t.procedureName}</p>
                                <p className="text-[10px] text-slate-400 truncate">{t.category} {t.notes ? `· ${t.notes}` : ''}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0">
                              {editingTreatmentId === t.id ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-bold text-slate-400">$</span>
                                  <input
                                    type="number"
                                    step="0.5"
                                    value={tempPriceInput}
                                    onChange={(e) => setTempPriceInput(e.target.value)}
                                    className="w-16 bg-background border border-teal-500 rounded-lg px-1.5 py-0.5 text-xs font-bold font-mono text-foreground text-right"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const num = parseFloat(tempPriceInput);
                                      if (!isNaN(num) && num >= 0) {
                                        handleUpdateTreatmentCost(t, num);
                                      }
                                      setEditingTreatmentId(null);
                                    }}
                                    className="p-1 rounded-md bg-teal-600 text-white hover:bg-teal-700"
                                    title="Guardar precio"
                                  >
                                    <Check size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingTreatmentId(null)}
                                    className="p-1 rounded-md text-slate-400 hover:text-foreground"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div
                                  className="text-right cursor-pointer group/price"
                                  onClick={() => {
                                    setEditingTreatmentId(t.id);
                                    setTempPriceInput(String(t.cost));
                                  }}
                                  title="Clic para editar precio del procedimiento"
                                >
                                  <span className="text-xs font-black font-mono text-foreground block group-hover/price:text-teal-600 transition-colors">
                                    ${t.cost.toFixed(2)} ✏️
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    Bs. {(t.cost * currentExchangeRate).toFixed(0)}
                                  </span>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => handleRemovePlannedTreatment(t)}
                                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                title="Quitar procedimiento del plan"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Acciones del Presupuesto: Despacho a Caja POS, Cobro en Sillón y Kanban */}
                  {plannedTreatments.length > 0 && (
                    <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="text-xs text-slate-500">
                        <span className="font-bold text-foreground">{plannedTreatments.length}</span> tratamientos presupuestados por un total de{' '}
                        <span className="font-bold text-teal-600 dark:text-teal-400 font-mono">${totalBudgetUSD.toFixed(2)} USD</span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            const plan = {
                              id: `plan-${Date.now()}`,
                              title: `Plan Odontológico — ${selectedPatient.name}`,
                              teeth: Array.from(new Set(plannedTreatments.map((t) => t.toothNum))),
                              procedures: plannedTreatments.map((p) => ({
                                toothNumber: p.toothNum,
                                conditionCode: p.code,
                                procedure: p.procedureName,
                                category: p.category,
                                estimatedCost: p.cost,
                                completed: p.completed,
                                stages: p.stages,
                                notes: p.notes,
                              })),
                              totalCost: totalBudgetUSD,
                              createdAt: new Date().toISOString(),
                            };
                            handleCreateKanban(plan);
                          }}
                          className="py-2.5 px-3.5 rounded-xl border border-teal-500/30 bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-bold hover:bg-teal-500/20 transition-all flex items-center gap-1.5"
                        >
                          <KanbanSquare size={14} />
                          <span>Enviar a Kanban</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsCheckoutModalOpen(true)}
                          className="py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 btn-haptic shadow-xs"
                        >
                          <CreditCard size={14} />
                          <span>Cobrar en Sillón</span>
                        </button>

                        <button
                          type="button"
                          disabled={isSendingToCashier}
                          onClick={handleSendOrderToCashier}
                          className="py-2.5 px-5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 text-white text-xs font-black hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 btn-haptic disabled:opacity-50"
                        >
                          <Send size={15} className={isSendingToCashier ? 'animate-bounce' : ''} />
                          <span>
                            {isSendingToCashier
                              ? 'Despachando a Caja...'
                              : `Despachar a Caja POS ($${totalBudgetUSD.toFixed(0)} USD)`}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ESTACIÓN 2: ESPECIALIDADES CLÍNICAS (ORTODONCIA, ENDODONCIA, PERIODONCIA) */}
            {clinicalStation === 'especialidades' && (
              <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xs space-y-6">
                {/* Sub-selector de Especialidad */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl border border-border max-w-lg">
                  <button
                    type="button"
                    onClick={() => setSpecialtySubTab('ortodoncia')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      specialtySubTab === 'ortodoncia'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-slate-500 hover:text-foreground'
                    }`}
                  >
                    <Sparkles size={14} className="text-amber-500" />
                    <span>Ortodoncia / Brackets</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSpecialtySubTab('endodoncia')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      specialtySubTab === 'endodoncia'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-slate-500 hover:text-foreground'
                    }`}
                  >
                    <Activity size={14} className="text-emerald-500" />
                    <span>Endodoncia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSpecialtySubTab('periodoncia')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      specialtySubTab === 'periodoncia'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-slate-500 hover:text-foreground'
                    }`}
                  >
                    <Layers size={14} className="text-teal-500" />
                    <span>Periodoncia</span>
                  </button>
                </div>

                {specialtySubTab === 'ortodoncia' && (
                  <div className="animate-in fade-in duration-200">
                    <OrthodonticsTracker patientId={selectedPatient.id} patientName={selectedPatient.name} />
                  </div>
                )}

                {specialtySubTab === 'endodoncia' && (
                  <div className="animate-in fade-in duration-200">
                    <EndodonticsSheet patientId={selectedPatient.id} patientName={selectedPatient.name} />
                  </div>
                )}

                {specialtySubTab === 'periodoncia' && (
                  <div className="animate-in fade-in duration-200">
                    <PeriodonticsMiniChart patientId={selectedPatient.id} patientName={selectedPatient.name} />
                  </div>
                )}
              </div>
            )}

            {/* ESTACIÓN 3: EVOLUCIÓN, CONSUMIBLES & RÉCIPE */}
            {clinicalStation === 'evolucion' && (
              <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xs space-y-6">
                <div className="border-b border-border pb-4">
                  <h3 className="text-sm font-black text-foreground uppercase tracking-wide flex items-center gap-2">
                    <FileText size={16} className="text-cyan-500" />
                    <span>Evolución Médica, Consumo de Insumos & Prescripción</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Registra el acto clínico del día, descuenta del inventario físico los consumibles descartables y prescribe el tratamiento farmacológico.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Columna Izquierda: Nota Clínica + Frases Rápidas (7 cols) */}
                  <div className="lg:col-span-7 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-black text-foreground uppercase tracking-wider">
                          Nota Clínica de la Consulta
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Dr: {session?.userEmail || effectiveActor.email}
                        </span>
                      </div>
                      <textarea
                        rows={5}
                        value={evolutionText}
                        onChange={(e) => setEvolutionText(e.target.value)}
                        placeholder="Describe el acto médico realizado hoy, anestesia, materiales, hallazgos y respuesta del paciente..."
                        className="w-full bg-background border border-input rounded-2xl p-3.5 text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 resize-none shadow-xs"
                      />
                    </div>

                    {/* Frases Rápidas Sugeridas */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Textos rápidos frecuentes (clic para insertar):
                      </span>
                      <div className="flex gap-2 flex-wrap">
                        {QUICK_CLINICAL_NOTES.map((phrase, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setEvolutionText((prev) => (prev ? `${prev} ${phrase}` : phrase))}
                            className="text-[11px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-teal-500/10 hover:text-teal-600 font-medium transition-colors text-left"
                          >
                            + {phrase.slice(0, 42)}...
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Historial Cronológico de Evoluciones Pasadas */}
                    {patientEvolutions.length > 0 && (
                      <div className="space-y-2.5 pt-4 border-t border-border">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                          Evoluciones Anteriores ({patientEvolutions.length}):
                        </span>
                        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                          {patientEvolutions.map((evo) => (
                            <div key={evo.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/30 border border-border text-xs space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                                <span className="font-bold text-foreground">{new Date(evo.createdAt).toLocaleDateString('es-VE')}</span>
                                <span>{evo.doctorName}</span>
                              </div>
                              <p className="text-foreground leading-relaxed">{evo.note}</p>
                              {evo.extraConsumables && evo.extraConsumables.length > 0 && (
                                <p className="text-[10px] text-teal-600 font-medium">
                                  Insumos: {evo.extraConsumables.map((c) => `${c.name} (x${c.quantity})`).join(', ')}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Columna Derecha: Insumos + Récipe + Botón Guardar (5 cols) */}
                  <div className="lg:col-span-5 space-y-5">
                    {/* Insumos Especiales Consumidos */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Package size={14} className="text-teal-500" />
                          Insumos Especiales Gastados
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsNewConsumableModalOpen(true)}
                          className="text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                        >
                          <Plus size={12} />
                          <span>+ Nuevo Insumo</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={selectedConsumableId}
                          onChange={(e) => setSelectedConsumableId(e.target.value)}
                          className="flex-1 bg-background border border-input rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden"
                        >
                          <option value="">Seleccionar insumo...</option>
                          {availableConsumables.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} (Stock: {item.stock_quantity ?? item.stock ?? 0})
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          min={1}
                          value={consumableQty}
                          onChange={(e) => setConsumableQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="w-14 bg-background border border-input rounded-xl px-2 py-1.5 text-xs font-bold text-center text-foreground"
                        />

                        <button
                          type="button"
                          onClick={handleAddConsumable}
                          className="px-3 py-1.5 bg-teal-500 text-white text-xs font-bold rounded-xl hover:bg-teal-600 transition-colors shrink-0"
                        >
                          + Añadir
                        </button>
                      </div>

                      {selectedConsumables.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {selectedConsumables.map((c, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs bg-background p-2 rounded-xl border border-border">
                              <span className="font-semibold text-foreground truncate pr-2">{c.name}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-mono text-teal-600 font-bold">x{c.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedConsumables((prev) => prev.filter((_, i) => i !== idx))}
                                  className="text-slate-400 hover:text-red-500"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Récipe Farmacológico */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Pill size={14} className="text-cyan-500" />
                          Prescripción Farmacológica
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowPrescriptionForm(!showPrescriptionForm)}
                          className="text-[11px] font-bold text-teal-600 hover:underline"
                        >
                          {showPrescriptionForm ? 'Ocultar' : '+ Recetar Fármaco'}
                        </button>
                      </div>

                      {showPrescriptionForm && (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={newMedDrug}
                              onChange={(e) => setNewMedDrug(e.target.value)}
                              placeholder="Fármaco (Ej. Amoxicilina 500mg)"
                              className="bg-background border border-input rounded-xl px-2.5 py-1.5 text-xs text-foreground"
                            />
                            <input
                              type="text"
                              value={newMedDosage}
                              onChange={(e) => setNewMedDosage(e.target.value)}
                              placeholder="Dosis (Ej. 1 cápsula)"
                              className="bg-background border border-input rounded-xl px-2.5 py-1.5 text-xs text-foreground"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={newMedFreq}
                              onChange={(e) => setNewMedFreq(e.target.value)}
                              placeholder="Frecuencia (Ej. Cada 8 horas)"
                              className="bg-background border border-input rounded-xl px-2.5 py-1.5 text-xs text-foreground"
                            />
                            <input
                              type="text"
                              value={newMedDuration}
                              onChange={(e) => setNewMedDuration(e.target.value)}
                              placeholder="Duración (Ej. Por 7 días)"
                              className="bg-background border border-input rounded-xl px-2.5 py-1.5 text-xs text-foreground"
                            />
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={handleAddPrescriptionMed}
                              className="px-3 py-1 bg-cyan-600 text-white rounded-xl text-xs font-bold hover:bg-cyan-700"
                            >
                              + Agregar al Récipe
                            </button>
                          </div>
                        </div>
                      )}

                      {prescriptionMeds.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {prescriptionMeds.map((m, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs bg-background p-2 rounded-xl border border-border">
                              <div className="min-w-0 pr-2">
                                <p className="font-bold text-foreground truncate">{m.drug}</p>
                                <p className="text-[10px] text-slate-400 truncate">{m.dosage} · {m.frequency} ({m.duration})</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setPrescriptionMeds((prev) => prev.filter((_, i) => i !== idx))}
                                className="text-slate-400 hover:text-red-500 shrink-0"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={handleSendPrescriptionWhatsApp}
                            className="w-full py-2 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 mt-2 border border-emerald-500/20"
                          >
                            <MessageSquare size={14} />
                            <span>Enviar Récipe al WhatsApp del Paciente</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Botón Principal Guardar Evolución */}
                    <button
                      type="button"
                      onClick={handleSaveEvolution}
                      disabled={isSavingEvolution}
                      className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 btn-haptic disabled:opacity-50"
                    >
                      <Save size={16} />
                      <span>{isSavingEvolution ? 'Guardando...' : 'Guardar Evolución & Descontar Insumos'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ESTACIÓN 4: EXPEDIENTE, ARCHIVOS & RADIOGRAFÍAS */}
            {clinicalStation === 'expediente' && (
              <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 border border-border rounded-2xl">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Ficha del Paciente & Antecedentes Clínicos</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {patientMeta.allergies ? `⚠️ Alertas: ${patientMeta.allergies}` : 'Sin antecedentes de riesgo reportados'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsScheduleModalOpen(true)}
                      className="px-3.5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-all btn-haptic flex items-center gap-1.5"
                    >
                      <CalendarDays size={14} />
                      <span>+ Agendar Cita</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsProfileModalOpen(true)}
                      className="px-3.5 py-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20 rounded-xl text-xs font-bold transition-all border border-teal-500/20 flex items-center gap-1.5 btn-haptic"
                    >
                      <UserCheck size={14} />
                      <span>Editar Ficha</span>
                    </button>
                  </div>
                </div>

                {/* Citas de Hoy y Próximos Turnos */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-border space-y-3">
                  <span className="text-xs font-black text-foreground uppercase tracking-wider block">
                    Turnos y Citas del Paciente
                  </span>
                  <div className="space-y-2">
                    {todayAppointments.filter(
                      (a) => a.client_id === selectedPatient.id || a.entity_id === selectedPatient.id
                    ).length === 0 ? (
                      <div className="text-center py-6 text-slate-400 border border-dashed border-border rounded-xl p-3">
                        <p className="text-xs font-bold">Sin cita registrada para hoy</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Puedes agendar el control de cicatrización o próxima fase del tratamiento dental.
                        </p>
                      </div>
                    ) : (
                      todayAppointments
                        .filter((a) => a.client_id === selectedPatient.id || a.entity_id === selectedPatient.id)
                        .map((a) => (
                          <div key={a.id} className="p-3 rounded-xl border border-teal-500/30 bg-teal-500/5 flex items-center justify-between gap-3">
                            <div>
                              <span className="text-xs font-bold text-foreground block">{a.service_title || 'Consulta Odontológica'}</span>
                              <span className="text-[10px] text-slate-400 font-mono">Turno de Hoy: {a.start_time?.slice(11, 16)}</span>
                            </div>
                            <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-600 uppercase">
                              {a.status || 'Confirmada'}
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                <ClientRecordsTab
                  entityId={selectedPatient.id}
                  tenantId={tenantId}
                  actor={effectiveActor}
                  clientName={selectedPatient.name}
                />
              </div>
            )}
          </div>
      ))}

      {/* 5. DOCK INFERIOR FIJO: ACCIONES DE COBRO Y CIERRE DE CONSULTA (SOLO EN MODO PRO) */}
      {selectedPatient && viewMode === 'pro' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border shadow-2xl py-3 px-4 sm:px-8 animate-in slide-in-from-bottom duration-300">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Resumen Clínico */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-black shrink-0">
                🦷
              </div>
              <div>
                <p className="text-xs font-black text-foreground truncate max-w-[200px] sm:max-w-xs">
                  {selectedPatient.name}
                </p>
                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="text-slate-500">Plan: ${totalBudgetUSD.toFixed(2)}</span>
                  <span className="text-teal-600 font-bold">
                    Hoy: ${todaySuggestedUSD.toFixed(2)} (Bs. {todaySuggestedVES.toFixed(0)})
                  </span>
                </div>
              </div>
            </div>

            {/* Botones de Acción Inmediata */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              {/* Botón para enviar orden a recepción (Libera el sillón de inmediato) */}
              <button
                type="button"
                onClick={handleSendOrderToCashier}
                disabled={isSendingToCashier || plannedTreatments.length === 0}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black transition-all shadow-md shadow-teal-500/20 flex items-center justify-center gap-2 btn-haptic disabled:opacity-50"
              >
                <Send size={15} />
                <span>{isSendingToCashier ? 'Despachando...' : '📨 Enviar Orden a Caja (Recepción)'}</span>
              </button>

              {/* Botón para cobro en sillón (Odontólogo independiente) */}
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(true)}
                disabled={plannedTreatments.length === 0}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-black transition-all shadow-sm flex items-center justify-center gap-1.5 btn-haptic disabled:opacity-50"
              >
                <CreditCard size={15} />
                <span>💵 Cobrar en Sillón</span>
              </button>

              {/* Botón para agendar próximo turno */}
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(true)}
                className="p-2.5 rounded-2xl border border-border bg-card text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors btn-haptic"
                title="Agendar próxima sesión médica"
              >
                <CalendarDays size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* 6. MODALES COMPLEMENTARIOS */}

      {/* MODAL PARA CREAR NUEVO PACIENTE */}
      {isNewPatientModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setIsNewPatientModalOpen(false)} />
          <div className="relative w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <Users size={18} className="text-teal-600" />
                <span>Registrar Nuevo Paciente</span>
              </h3>
              <button onClick={() => setIsNewPatientModalOpen(false)} className="text-slate-400 hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePatientSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Ej. María Elena Pérez"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:ring-2 focus:ring-teal-500/20"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Cédula / DNI</label>
                  <input
                    type="text"
                    name="tax_id"
                    placeholder="Ej. V-18.456.789"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="Ej. +58 412 1234567"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    name="birth_date"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="paciente@correo.com"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Alergias / Antecedentes Médicos</label>
                <textarea
                  name="allergies"
                  rows={2}
                  placeholder="Ej. Alérgica a penicilina, hipertensión arterial, prótesis..."
                  className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground resize-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsNewPatientModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPatient}
                  className="px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-black hover:bg-teal-700 disabled:opacity-50 btn-haptic shadow-md"
                >
                  {isSubmittingPatient ? 'Registrando...' : 'Registrar y Comenzar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE COBRO EN SILLÓN */}
      {selectedPatient && (
        <DentalCheckoutModal
          isOpen={isCheckoutModalOpen}
          onClose={() => setIsCheckoutModalOpen(false)}
          patient={{
            id: selectedPatient.id,
            name: selectedPatient.name,
            phone: selectedPatient.phone,
            email: selectedPatient.email,
            tax_id: selectedPatient.tax_id,
          }}
          plannedTreatments={plannedTreatments.map((t) => ({
            id: t.id,
            toothNum: t.toothNum,
            procedureName: t.procedureName,
            cost: t.cost,
            category: t.category,
            notes: t.notes,
          }))}
          tenantId={tenantId}
          actor={effectiveActor}
          exchangeRate={currentExchangeRate}
          onSuccess={() => {
            loadClinicalData();
            if (selectedPatient) {
              loadPatientChartAndEvolutions(selectedPatient.id);
            }
          }}
        />
      )}

      {/* MODAL DE AGENDAMIENTO DE PRÓXIMA CITA */}
      {selectedPatient && (
        <DentalScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          patient={{
            id: selectedPatient.id,
            name: selectedPatient.name,
            phone: selectedPatient.phone,
          }}
          tenantId={tenantId}
          actor={effectiveActor}
          procedureHint="Control y Tratamiento Odontológico"
          onSuccess={() => {
            loadClinicalData();
          }}
        />
      )}

      {/* MODAL DE FICHA Y ANTECEDENTES DEL PACIENTE */}
      {selectedPatient && (
        <PatientProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          patient={selectedPatient}
          tenantId={tenantId}
          actor={effectiveActor}
          onSuccess={(updated) => {
            setSelectedPatient(updated);
            setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          }}
        />
      )}

      {/* MODAL DE REGISTRO RÁPIDO DE INSUMO EN INVENTARIO */}
      <NewConsumableModal
        isOpen={isNewConsumableModalOpen}
        onClose={() => setIsNewConsumableModalOpen(false)}
        tenantId={tenantId}
        actor={effectiveActor}
        onSuccess={(newItem) => {
          setInventoryItems((prev) => [newItem, ...prev]);
          setSelectedConsumableId(newItem.id);
        }}
      />

      {/* MODAL DE SELECCIÓN Y BÚSQUEDA FLUIDA DE PACIENTES */}
      <PatientSelectModal
        isOpen={isSelectPatientModalOpen}
        onClose={() => setIsSelectPatientModalOpen(false)}
        patients={customers}
        onSelectPatient={(p) => {
          setSelectedPatient(p);
          setIsSelectPatientModalOpen(false);
        }}
        onOpenNewPatientModal={() => {
          setIsSelectPatientModalOpen(false);
          setIsNewPatientModalOpen(true);
        }}
        currentPatientId={selectedPatient?.id}
      />
    </div>
  );
}
