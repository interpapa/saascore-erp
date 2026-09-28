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
  FolderOpen,
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
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Odontogram } from '@/components/dental/Odontogram';
import { ClientRecordsTab } from '@/components/clients/ClientRecordsTab';
import { CatalogModal } from '@/components/catalog/CatalogModal';
import { 
  DentalChart, 
  DentalTreatmentPlan, 
  getDentalOverviewAction, 
  saveDentalChartAction, 
  getDentalChartAction, 
  createTreatmentKanbanFromChartAction 
} from '@/app/actions/dental';
import { getEntitiesAction, createEntityAction } from '@/app/actions/entities';
import { getAppointmentsAction } from '@/app/actions/appointments';
import { getItemsAction, createItemAction } from '@/app/actions/items';
import { toggleProcessStepAction } from '@/app/actions/documents';
import { Entity } from '@/lib/api/entities';
import { useERPStore } from '@/store/useERPStore';
import { useActionActor } from '@/hooks/useActionActor';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useToast } from '@/components/core/ToastProvider';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function OdontologiaPage() {
  const router = useRouter();
  const currentTenant = useTenantResolver();
  const session = useERPStore((s) => s.session);
  const actor = useActionActor();
  const { toast } = useToast();

  const tenantId = currentTenant?.id || session?.tenantId || '';

  // Pestañas principales de la Suite Odontológica
  type TabType = 'odontograma' | 'historia' | 'presupuesto' | 'kanban' | 'citas' | 'catalogo' | 'pacientes';
  const [activeTab, setActiveTab] = useState<TabType>('odontograma');

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingChart, setIsSavingChart] = useState(false);

  // Estadísticas del módulo
  const [stats, setStats] = useState({
    totalPatientsWithChart: 0,
    activeTreatments: 0,
    completedTreatments: 0,
    totalBudgeted: 0,
  });

  const [patientsWithCharts, setPatientsWithCharts] = useState<any[]>([]);
  const [dentalOrders, setDentalOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Entity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Paciente seleccionado para la suite clínica
  const [selectedPatient, setSelectedPatient] = useState<Entity | null>(null);
  const [currentChart, setCurrentChart] = useState<DentalChart | undefined>(undefined);
  const [isLoadingChart, setIsLoadingChart] = useState(false);

  // Citas del paciente
  const [patientAppointments, setPatientAppointments] = useState<any[]>([]);
  const [isLoadingAppts, setIsLoadingAppts] = useState(false);

  // Servicios de catálogo odontológico
  const [dentalServices, setDentalServices] = useState<any[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);

  // Modal para registrar nuevo paciente directamente
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isSubmittingPatient, setIsSubmittingPatient] = useState(false);

  // Cargar overview general
  const loadOverview = useCallback(async () => {
    if (!tenantId || !actor) return;
    try {
      setIsLoading(true);
      const [overviewRes, custRes, itemsRes] = await Promise.all([
        getDentalOverviewAction(tenantId, actor),
        getEntitiesAction(tenantId, 'customer', 200, actor),
        getItemsAction(tenantId, undefined, 100, actor),
      ]);

      if (overviewRes.success) {
        if (overviewRes.stats) setStats(overviewRes.stats);
        if (overviewRes.charts) setPatientsWithCharts(overviewRes.charts);
        if (overviewRes.dentalOrders) setDentalOrders(overviewRes.dentalOrders);
      }

      if (custRes.success && custRes.entities) {
        setCustomers(custRes.entities);
        // Preseleccionar paciente si no hay uno activo
        if (!selectedPatient && custRes.entities.length > 0) {
          const firstWithChart = overviewRes.charts?.[0];
          if (firstWithChart) {
            const found = custRes.entities.find((c) => c.id === firstWithChart.entityId);
            if (found) setSelectedPatient(found);
          } else {
            setSelectedPatient(custRes.entities[0]);
          }
        }
      }

      if (itemsRes.success && itemsRes.items) {
        // Filtrar servicios odontológicos o todos los servicios
        setDentalServices(itemsRes.items.filter((i: any) => i.type === 'service' || i.category?.toLowerCase().includes('odon')));
      }
    } catch (err: unknown) {
      console.error('[OdontologiaPage] Error loading data:', err);
      toast({
        variant: 'error',
        title: 'Error de carga',
        description: 'No se pudieron cargar los datos de odontología.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, actor, selectedPatient]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // Cargar odontograma del paciente seleccionado
  const loadPatientChart = useCallback(
    async (patientId: string) => {
      if (!tenantId || !actor) return;
      try {
        setIsLoadingChart(true);
        const res = await getDentalChartAction(patientId, tenantId, actor);
        if (res.success) {
          setCurrentChart(res.chart);
        } else {
          setCurrentChart(undefined);
        }
      } catch (err) {
        console.error('[loadPatientChart]:', err);
        setCurrentChart(undefined);
      } finally {
        setIsLoadingChart(false);
      }
    },
    [tenantId, actor]
  );

  // Cargar citas del paciente seleccionado
  const loadPatientAppointments = useCallback(
    async (patientId: string) => {
      if (!tenantId || !actor) return;
      try {
        setIsLoadingAppts(true);
        const res = await getAppointmentsAction(tenantId, undefined, actor);
        if (res.success && res.appointments) {
          const filtered = res.appointments.filter((a: any) => a.entity_id === patientId || a.customer_id === patientId);
          setPatientAppointments(filtered);
        }
      } catch (err) {
        console.error('[loadPatientAppointments]:', err);
      } finally {
        setIsLoadingAppts(false);
      }
    },
    [tenantId, actor]
  );

  useEffect(() => {
    if (selectedPatient?.id) {
      loadPatientChart(selectedPatient.id);
      loadPatientAppointments(selectedPatient.id);
    }
  }, [selectedPatient?.id, loadPatientChart, loadPatientAppointments]);

  // Guardar Odontograma
  const handleSaveChart = async (chart: DentalChart) => {
    if (!tenantId || !actor || !selectedPatient) return;
    try {
      setIsSavingChart(true);
      const res = await saveDentalChartAction(selectedPatient.id, chart, tenantId, actor);
      if (res.success) {
        setCurrentChart(chart);
        toast({
          variant: 'success',
          title: 'Odontograma Guardado',
          description: `Se actualizó el registro dental de ${selectedPatient.name}.`,
        });
        loadOverview();
      } else {
        toast({
          variant: 'error',
          title: 'Error al guardar',
          description: res.error || 'No se pudo guardar el odontograma.',
        });
      }
    } catch (err: unknown) {
      toast({
        variant: 'error',
        title: 'Error de conexión',
        description: (err as Error).message,
      });
    } finally {
      setIsSavingChart(false);
    }
  };

  // Crear orden Kanban desde el Odontograma
  const handleCreateKanban = async (plan: DentalTreatmentPlan) => {
    if (!tenantId || !actor || !selectedPatient) return;
    try {
      const res = await createTreatmentKanbanFromChartAction(
        selectedPatient.id,
        selectedPatient.name,
        plan,
        tenantId,
        actor
      );
      if (res.success) {
        toast({
          variant: 'success',
          title: 'Tratamiento en Kanban',
          description: `Se generó la orden de trabajo dental para ${selectedPatient.name}.`,
        });
        loadOverview();
        setActiveTab('kanban');
      } else {
        toast({
          variant: 'error',
          title: 'Error al transferir',
          description: res.error,
        });
      }
    } catch (err: unknown) {
      toast({
        variant: 'error',
        title: 'Error',
        description: (err as Error).message,
      });
    }
  };

  // Toggle de paso en orden de tratamiento
  const handleToggleStep = async (orderId: string, stepId: string, currentVal: boolean) => {
    if (!tenantId || !actor) return;
    try {
      const res = await toggleProcessStepAction(orderId, stepId, !currentVal, tenantId, actor);
      if (res.success) {
        toast({
          variant: 'success',
          title: 'Paso Actualizado',
          description: !currentVal ? 'Paso marcado como completado.' : 'Paso reabierto.',
        });
        loadOverview();
      } else {
        toast({ variant: 'error', title: 'Error', description: res.error });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error', description: (err as Error).message });
    }
  };

  // Crear nuevo paciente desde el modal interno
  const handleCreatePatientSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!tenantId || !actor) return;

    setIsSubmittingPatient(true);
    const form = new FormData(e.currentTarget);
    const name = (form.get('name') as string)?.trim();

    if (!name) {
      toast({ variant: 'warning', title: 'Nombre requerido', description: 'Por favor ingresa el nombre del paciente.' });
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
            notes: (form.get('notes') as string)?.trim() || '',
            has_history: true, // Historial clínico habilitado por defecto para pacientes odontológicos
          },
        },
        tenantId,
        actor
      );

      if (res.success && res.entity) {
        toast({
          variant: 'success',
          title: 'Paciente Registrado',
          description: `Se creó la ficha clínica para ${name}.`,
        });
        setCustomers((prev) => [res.entity as Entity, ...prev]);
        setSelectedPatient(res.entity as Entity);
        setIsNewPatientModalOpen(false);
      } else {
        toast({ variant: 'error', title: 'Error', description: res.error || 'No se pudo crear el paciente.' });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error', description: (err as Error).message });
    } finally {
      setIsSubmittingPatient(false);
    }
  };

  // Guardar nuevo servicio en catálogo
  const handleSaveCatalogService = async (serviceData: any) => {
    if (!tenantId || !actor) return;
    const res = await createItemAction(serviceData, tenantId, actor);
    if (res.success) {
      toast({ variant: 'success', title: 'Servicio Creado', description: `"${serviceData.name}" se guardó en el catálogo.` });
      setIsCatalogModalOpen(false);
      loadOverview();
    } else {
      toast({ variant: 'error', title: 'Error al registrar servicio', description: res.error });
      throw new Error(res.error);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.tax_id && c.tax_id.includes(searchQuery))
  );

  // Cálculos del paciente activo
  const patientMeta = (selectedPatient?.metadata as any) || {};
  const patientAge = patientMeta.birth_date
    ? Math.floor((Date.now() - new Date(patientMeta.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;
  const patientDebt = Number(patientMeta.total_debt || 0);

  // Desglose de tratamientos presupuestados del odontograma actual
  const plannedTreatments = useMemo(() => {
    if (!currentChart?.teeth) return [];
    const list: Array<{ toothNum: string; condition: string; code: string; color: string; notes?: string }> = [];
    Object.entries(currentChart.teeth).forEach(([num, data]) => {
      data.conditions?.forEach((c) => {
        if (c.code !== 'ausente') {
          list.push({
            toothNum: num,
            condition: c.label || c.code.toUpperCase(),
            code: c.code,
            color: c.color || '#0ea5e9',
            notes: c.notes || data.notes,
          });
        }
      });
    });
    return list;
  }, [currentChart]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-300">
      {/* CABECERA PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-teal-400 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/20 shrink-0">
            <Stethoscope size={26} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5 flex-wrap">
              <span>Odontología & Salud Dental</span>
              <span className="text-xs bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 px-2.5 py-0.5 rounded-full font-bold">
                Suite Clínica Integral
              </span>
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">
              Odontograma anatómico, historia clínica, presupuestos, seguimiento Kanban y agenda en un solo lugar
            </p>
          </div>
        </div>

        {/* Acciones Globales Rápidas */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsNewPatientModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition-all shadow-xs btn-haptic"
          >
            <Plus size={16} />
            <span>+ Nuevo Paciente</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCatalogModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all shadow-xs btn-haptic"
            title="Crear un servicio o procedimiento en el catálogo"
          >
            <Sparkles size={15} className="text-teal-500" />
            <span>+ Servicio Dental</span>
          </button>

          <button
            onClick={() => loadOverview()}
            className="p-2 bg-card border border-border text-slate-500 hover:text-foreground rounded-xl transition-all btn-haptic"
            title="Refrescar datos clínicos"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Con Odontograma</p>
            <p className="text-xl font-black text-foreground">{stats.totalPatientsWithChart}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tratamientos en Curso</p>
            <p className="text-xl font-black text-foreground">{stats.activeTreatments}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Altas Médicas</p>
            <p className="text-xl font-black text-foreground">{stats.completedTreatments}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Presupuestado</p>
            <p className="text-xl font-black text-foreground">
              ${stats.totalBudgeted.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* BARRA DE SELECCIÓN Y FICHA RÁPIDA DEL PACIENTE ACTIVO */}
      <div className="bg-card border border-border rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Selector de Paciente con Búsqueda */}
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 font-black text-base">
              {selectedPatient ? selectedPatient.name.charAt(0) : <UserCheck size={20} />}
            </div>

            <div className="flex-1 max-w-md">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                Paciente en Consulta Activa
              </label>
              <select
                value={selectedPatient?.id || ''}
                onChange={(e) => {
                  const found = customers.find((c) => c.id === e.target.value);
                  if (found) setSelectedPatient(found);
                }}
                className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Seleccionar paciente de la lista...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.tax_id ? `— ${c.tax_id}` : ''} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsNewPatientModalOpen(true)}
              className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors btn-haptic shrink-0"
              title="Registrar nuevo paciente"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Ficha Resumen del Paciente Seleccionado */}
          {selectedPatient && (
            <div className="flex items-center gap-3 flex-wrap lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-border">
              {patientAge !== null && (
                <span className="text-xs font-bold text-indigo-500 bg-indigo-500/10 px-2.5 py-1 rounded-lg">
                  🎂 {patientAge} años
                </span>
              )}

              {selectedPatient.phone && (
                <a
                  href={`https://wa.me/${selectedPatient.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl transition-colors border border-emerald-500/20"
                >
                  <MessageSquare size={14} />
                  <span>WhatsApp</span>
                </a>
              )}

              {patientDebt > 0 ? (
                <button
                  type="button"
                  onClick={() => router.push(`/caja?client=${selectedPatient.id}&amount=${patientDebt}&desc=${encodeURIComponent('Pago Tratamiento Dental - ' + selectedPatient.name)}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-black rounded-xl transition-colors border border-rose-500/20"
                >
                  <Receipt size={14} />
                  <span>Deuda: ${patientDebt.toFixed(2)} (Cobrar)</span>
                </button>
              ) : (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                  ✓ Al Día
                </span>
              )}

              <button
                type="button"
                onClick={() => router.push(`/clientes?selected=${selectedPatient.id}`)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                Ficha CRM Completa
              </button>
            </div>
          )}
        </div>

        {/* Alerta Médica / Antecedentes si existen */}
        {selectedPatient && patientMeta.notes && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-black uppercase tracking-wider block text-[10px] text-amber-700 dark:text-amber-400">
                Antecedentes Clínicos / Alergias del Paciente:
              </strong>
              <p className="mt-0.5">{patientMeta.notes}</p>
            </div>
          </div>
        )}
      </div>

      {/* BARRA DE PESTAÑAS DE LA SUITE CLÍNICA */}
      <div className="flex items-center gap-1.5 border-b border-border pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('odontograma')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 btn-haptic ${
            activeTab === 'odontograma'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card border border-border text-slate-600 dark:text-slate-400 hover:text-foreground'
          }`}
        >
          <Stethoscope size={16} />
          <span>Odontograma Anatómico</span>
        </button>

        <button
          onClick={() => setActiveTab('historia')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 btn-haptic ${
            activeTab === 'historia'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card border border-border text-slate-600 dark:text-slate-400 hover:text-foreground'
          }`}
        >
          <FileText size={16} />
          <span>Historia Clínica & Bitácora</span>
        </button>

        <button
          onClick={() => setActiveTab('presupuesto')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 btn-haptic ${
            activeTab === 'presupuesto'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card border border-border text-slate-600 dark:text-slate-400 hover:text-foreground'
          }`}
        >
          <Receipt size={16} />
          <span>Plan de Tx & Presupuesto ({plannedTreatments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('kanban')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 btn-haptic ${
            activeTab === 'kanban'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card border border-border text-slate-600 dark:text-slate-400 hover:text-foreground'
          }`}
        >
          <KanbanSquare size={16} />
          <span>Kanban de Tratamientos ({dentalOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('citas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 btn-haptic ${
            activeTab === 'citas'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card border border-border text-slate-600 dark:text-slate-400 hover:text-foreground'
          }`}
        >
          <CalendarDays size={16} />
          <span>Citas del Paciente ({patientAppointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('catalogo')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 btn-haptic ${
            activeTab === 'catalogo'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card border border-border text-slate-600 dark:text-slate-400 hover:text-foreground'
          }`}
        >
          <Sparkles size={16} />
          <span>Servicios Dentales ({dentalServices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pacientes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 btn-haptic ${
            activeTab === 'pacientes'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card border border-border text-slate-600 dark:text-slate-400 hover:text-foreground'
          }`}
        >
          <Users size={16} />
          <span>Directorio ({customers.length})</span>
        </button>
      </div>

      {/* CONTENIDO DE CADA PESTAÑA */}

      {/* 1. ODONTOGRAMA ANATÓMICO */}
      {activeTab === 'odontograma' && (
        <div className="space-y-4">
          {selectedPatient ? (
            isLoadingChart ? (
              <div className="flex items-center justify-center p-20 bg-card border border-border rounded-3xl">
                <div className="w-9 h-9 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="bg-card border border-border rounded-3xl p-6 shadow-xs">
                <Odontogram
                  entityId={selectedPatient.id}
                  entityName={selectedPatient.name}
                  initialChart={currentChart}
                  onSave={handleSaveChart}
                  onCreateKanban={handleCreateKanban}
                  isSaving={isSavingChart}
                />
              </div>
            )
          ) : (
            <div className="text-center py-20 bg-card border border-dashed border-border rounded-3xl space-y-3">
              <Stethoscope size={36} className="text-teal-500 mx-auto opacity-40" />
              <h3 className="text-base font-bold text-foreground">Selecciona un Paciente</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Elige un paciente en la barra superior o haz clic en <strong>+ Nuevo Paciente</strong> para comenzar su odontograma anatómico.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 2. HISTORIA CLÍNICA & BITÁCORA */}
      {activeTab === 'historia' && (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
          {selectedPatient ? (
            <ClientRecordsTab
              entityId={selectedPatient.id}
              tenantId={tenantId}
              actor={actor}
              clientName={selectedPatient.name}
            />
          ) : (
            <div className="text-center py-16 text-slate-400">
              <FileText size={32} className="mx-auto opacity-30 mb-2" />
              <p className="font-bold">Selecciona un paciente para ver o redactar su historia clínica.</p>
            </div>
          )}
        </div>
      )}

      {/* 3. PLAN DE TRATAMIENTO & PRESUPUESTO */}
      {activeTab === 'presupuesto' && (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <Receipt size={18} className="text-teal-500" />
                <span>Plan de Tratamiento y Presupuesto Dental</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Procedimientos detectados en el odontograma y cotizaciones para {selectedPatient?.name || 'el paciente'}
              </p>
            </div>

            {selectedPatient && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-800 text-foreground text-xs font-bold transition-all flex items-center gap-1.5 btn-haptic"
                >
                  <Printer size={14} />
                  <span>Imprimir Presupuesto</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const totalEst = plannedTreatments.length * 40; // Base referencial
                    router.push(`/caja?client=${selectedPatient.id}&amount=${totalEst}&desc=${encodeURIComponent('Tratamiento Odontológico - ' + selectedPatient.name)}`);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black transition-all flex items-center gap-1.5 btn-haptic shadow-xs"
                >
                  <DollarSign size={14} />
                  <span>Cobrar en Caja POS</span>
                </button>
              </div>
            )}
          </div>

          {plannedTreatments.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl p-6 text-slate-400 space-y-2">
              <Sparkles size={32} className="mx-auto opacity-30 text-teal-500" />
              <p className="text-sm font-bold text-foreground">Sin tratamientos pendientes en el odontograma</p>
              <p className="text-xs max-w-sm mx-auto">
                Selecciona dientes en la pestaña de <strong>Odontograma</strong> y aplícales caries, resinas o coronas para ver el presupuesto automático aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto border border-border rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-border text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3 pl-4">Pieza Dental</th>
                      <th className="p-3">Diagnóstico / Procedimiento Requerido</th>
                      <th className="p-3">Notas Clínicas</th>
                      <th className="p-3 text-right pr-4">Costo Estimado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {plannedTreatments.map((pt, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="p-3 pl-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                          🦷 Pieza #{pt.toothNum}
                        </td>
                        <td className="p-3 font-semibold text-foreground flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pt.color }} />
                          <span>{pt.condition}</span>
                        </td>
                        <td className="p-3 text-slate-500">{pt.notes || '—'}</td>
                        <td className="p-3 text-right pr-4 font-mono font-bold text-foreground">$40.00</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-900/70 border-t border-border font-black text-xs">
                    <tr>
                      <td colSpan={3} className="p-3 pl-4 text-right">TOTAL PRESUPUESTADO ESTIMADO:</td>
                      <td className="p-3 pr-4 text-right font-mono text-base text-primary">
                        ${(plannedTreatments.length * 40).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. KANBAN DE TRATAMIENTOS ODONTOLÓGICOS */}
      {activeTab === 'kanban' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Órdenes Clínicas Odontológicas ({dentalOrders.length})
            </h3>
            <button
              onClick={() => router.push('/kanban')}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              Abrir Tablero Kanban General <ArrowRight size={14} />
            </button>
          </div>

          {dentalOrders.length === 0 ? (
            <div className="text-center py-16 bg-card border border-dashed border-border rounded-3xl space-y-2">
              <FolderOpen size={32} className="text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-foreground">No hay órdenes de tratamiento registradas</p>
              <p className="text-xs text-slate-400">
                Guarda un odontograma y presiona &quot;Plan de Tx → Kanban&quot; para enviar las etapas aquí.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dentalOrders.map((order) => {
                const progressPct =
                  order.totalSteps > 0 ? Math.round((order.completedSteps / order.totalSteps) * 100) : 0;
                const rawSteps = Array.isArray(order.steps) ? order.steps : [];

                return (
                  <div
                    key={order.id}
                    className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3.5 hover:border-teal-500/40 transition-all flex flex-col"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-md">
                          #{order.documentNumber}
                        </span>
                        <h4 className="font-bold text-foreground text-sm mt-1">{order.title}</h4>
                        <p className="text-xs text-slate-500">👤 {order.patientName}</p>
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {order.status}
                      </span>
                    </div>

                    {order.totalSteps > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                          <span>Progreso Clínico</span>
                          <span className="text-teal-600 font-bold">
                            {order.completedSteps}/{order.totalSteps} ({progressPct}%)
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-linear-to-r from-teal-500 to-cyan-500 rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Pasos interactivos */}
                    {rawSteps.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-border/50 flex-1">
                        {rawSteps.slice(0, 4).map((s: any) => (
                          <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 p-1 rounded-lg">
                            <input
                              type="checkbox"
                              checked={s.completed === true}
                              onChange={() => handleToggleStep(order.id, s.id, s.completed === true)}
                              className="w-3.5 h-3.5 rounded accent-teal-600 cursor-pointer"
                            />
                            <span className={s.completed ? 'line-through text-slate-400' : 'text-foreground font-medium'}>
                              {s.title}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                    <div className="pt-3 border-t border-border flex items-center justify-between text-xs mt-auto">
                      <span className="font-semibold text-slate-400">Presupuesto</span>
                      <span className="font-black text-foreground">
                        ${order.totalAmount?.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. CITAS & AGENDA ODONTOLÓGICA */}
      {activeTab === 'citas' && (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-border pb-4">
            <div>
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <CalendarDays size={18} className="text-blue-500" />
                <span>Citas y Turnos de Odontología</span>
              </h3>
              <p className="text-xs text-slate-500">
                {selectedPatient ? `Turnos programados para ${selectedPatient.name}` : 'Agenda general'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(selectedPatient ? `/calendario?client=${selectedPatient.id}` : '/calendario')}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 btn-haptic shadow-xs"
              >
                <Plus size={15} />
                <span>+ Agendar en Calendario</span>
              </button>
            </div>
          </div>

          {isLoadingAppts ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Cargando citas...
            </div>
          ) : patientAppointments.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl p-6 text-slate-400 space-y-2">
              <CalendarDays size={32} className="mx-auto opacity-30 text-blue-500" />
              <p className="text-sm font-bold text-foreground">Sin citas odontológicas programadas</p>
              <p className="text-xs max-w-sm mx-auto">
                Haz clic en &quot;+ Agendar en Calendario&quot; para reservar un turno para este paciente.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden">
              {patientAppointments.map((appt) => (
                <div key={appt.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs">
                      <Clock size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{appt.title || 'Consulta Odontológica'}</p>
                      <p className="text-[11px] text-slate-500">
                        {appt.start_time ? new Date(appt.start_time).toLocaleString('es-VE') : 'Fecha pendiente'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {appt.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. CATÁLOGO DE SERVICIOS ODONTOLÓGICOS */}
      {activeTab === 'catalogo' && (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-border pb-4">
            <div>
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <Sparkles size={18} className="text-teal-500" />
                <span>Procedimientos y Aranceles Odontológicos</span>
              </h3>
              <p className="text-xs text-slate-500">
                Lista de servicios disponibles para presupuestos, citas y mostrador
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsCatalogModalOpen(true)}
              className="px-3.5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 btn-haptic shadow-xs"
            >
              <Plus size={15} />
              <span>+ Nuevo Servicio Dental</span>
            </button>
          </div>

          {dentalServices.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl p-6 text-slate-400 space-y-3">
              <Package size={32} className="mx-auto opacity-30 text-teal-500" />
              <p className="text-sm font-bold text-foreground">Sin servicios dentales en catálogo</p>
              <p className="text-xs max-w-sm mx-auto">
                Registra los procedimientos habituales de la clínica (Profilaxis, Resina, Blanqueamiento, Ortodoncia) con sus precios y duración.
              </p>
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(true)}
                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl btn-haptic"
              >
                + Registrar Primer Servicio
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {dentalServices.map((srv) => (
                <div key={srv.id} className="p-4 rounded-2xl border border-border bg-slate-50/50 dark:bg-slate-900/40 space-y-2 hover:border-teal-500/40 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-foreground">{srv.name}</h4>
                    <span className="text-xs font-mono font-black text-primary">
                      ${Number(srv.base_price || 0).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{srv.description || 'Procedimiento dental estándar'}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-border/40 font-medium">
                    <span>⏱️ {srv.metadata?.duration_minutes || 30} min</span>
                    <span>📂 {srv.category || 'Odontología'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. DIRECTORIO DE PACIENTES */}
      {activeTab === 'pacientes' && (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar paciente por nombre, cédula o teléfono..."
                className="w-full bg-background border border-input rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsNewPatientModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-all btn-haptic shrink-0"
            >
              <Plus size={16} />
              <span>+ Nuevo Paciente</span>
            </button>
          </div>

          <div className="border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-border text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5 pl-5">Paciente</th>
                  <th className="p-3.5">Cédula / ID</th>
                  <th className="p-3.5">Teléfono / WhatsApp</th>
                  <th className="p-3.5">Estado Dental</th>
                  <th className="p-3.5 text-right pr-5">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCustomers.map((cust) => {
                  const hasChart = patientsWithCharts.some((c) => c.entityId === cust.id);

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 pl-5 font-bold text-foreground flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-black text-xs">
                          {cust.name.charAt(0)}
                        </div>
                        {cust.name}
                      </td>
                      <td className="p-3.5 font-mono text-slate-500">{cust.tax_id || '—'}</td>
                      <td className="p-3.5 text-slate-500 font-mono">{cust.phone || '—'}</td>
                      <td className="p-3.5">
                        {hasChart ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={12} /> Odontograma Activo
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400">Sin odontograma</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right pr-5">
                        <button
                          onClick={() => {
                            setSelectedPatient(cust);
                            setActiveTab('odontograma');
                          }}
                          className="px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold rounded-xl text-xs transition-colors"
                        >
                          {hasChart ? 'Abrir Consulta' : '+ Iniciar Consulta'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR NUEVO PACIENTE EN ODONTOLOGÍA */}
      {isNewPatientModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setIsNewPatientModalOpen(false)} />
          <div className="relative w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <Users size={18} className="text-primary" />
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
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:ring-2 focus:ring-primary/20"
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
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="Ej. +58 412 1234567"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    name="birth_date"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="paciente@correo.com"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Antecedentes Médicos / Alergias</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Ej. Alérgica a la penicilina, hipertensión, prótesis metálica..."
                  className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground resize-none focus:ring-2 focus:ring-primary/20"
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
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:bg-primary/90 disabled:opacity-50 btn-haptic shadow-md"
                >
                  {isSubmittingPatient ? 'Registrando...' : 'Registrar y Comenzar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CATÁLOGO (PARA SERVICIOS ODONTOLÓGICOS SIN CÓDIGO DE BARRAS) */}
      <CatalogModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        onSave={handleSaveCatalogService}
      />
    </div>
  );
}
