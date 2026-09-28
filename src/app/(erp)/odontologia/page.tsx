'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Sparkles
} from 'lucide-react';
import { Odontogram } from '@/components/dental/Odontogram';
import { 
  DentalChart, 
  DentalTreatmentPlan, 
  getDentalOverviewAction, 
  saveDentalChartAction, 
  getDentalChartAction, 
  createTreatmentKanbanFromChartAction 
} from '@/app/actions/dental';
import { getEntitiesAction } from '@/app/actions/entities';
import { Entity } from '@/lib/api/entities';
import { useERPStore } from '@/store/useERPStore';
import { useActionActor } from '@/hooks/useActionActor';
import { useToast } from '@/components/core/ToastProvider';
import Link from 'next/link';

export default function OdontologiaPage() {
  const currentTenant = useERPStore((s) => s.currentTenant);
  const actor = useActionActor();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'odontograma' | 'tratamientos' | 'pacientes'>('odontograma');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingChart, setIsSavingChart] = useState(false);

  // Datos del overview
  const [stats, setStats] = useState({
    totalPatientsWithChart: 0,
    activeTreatments: 0,
    completedTreatments: 0,
    totalBudgeted: 0,
  });
  const [patientsWithCharts, setPatientsWithCharts] = useState<any[]>([]);
  const [dentalOrders, setDentalOrders] = useState<any[]>([]);

  // Directorio de clientes para selección
  const [customers, setCustomers] = useState<Entity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Paciente seleccionado para el odontograma
  const [selectedPatient, setSelectedPatient] = useState<Entity | null>(null);
  const [currentChart, setCurrentChart] = useState<DentalChart | undefined>(undefined);
  const [isLoadingChart, setIsLoadingChart] = useState(false);

  const loadOverview = useCallback(async () => {
    if (!currentTenant?.id || !actor) return;
    try {
      setIsLoading(true);
      const [overviewRes, custRes] = await Promise.all([
        getDentalOverviewAction(currentTenant.id, actor),
        getEntitiesAction(currentTenant.id, 'customer', 100, actor),
      ]);

      if (overviewRes.success) {
        if (overviewRes.stats) setStats(overviewRes.stats);
        if (overviewRes.charts) setPatientsWithCharts(overviewRes.charts);
        if (overviewRes.dentalOrders) setDentalOrders(overviewRes.dentalOrders);
      }

      if (custRes.success && custRes.entities) {
        setCustomers(custRes.entities);
        // Si no hay paciente seleccionado y hay clientes, preseleccionar el primero con odontograma o el primer cliente
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
  }, [currentTenant?.id, actor]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // Cargar odontograma del paciente seleccionado
  const loadPatientChart = useCallback(
    async (patientId: string) => {
      if (!currentTenant?.id || !actor) return;
      try {
        setIsLoadingChart(true);
        const res = await getDentalChartAction(patientId, currentTenant.id, actor);
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
    [currentTenant?.id, actor]
  );

  useEffect(() => {
    if (selectedPatient?.id) {
      loadPatientChart(selectedPatient.id);
    }
  }, [selectedPatient?.id, loadPatientChart]);

  // Guardar Odontograma
  const handleSaveChart = async (chart: DentalChart) => {
    if (!currentTenant?.id || !actor || !selectedPatient) return;
    try {
      setIsSavingChart(true);
      const res = await saveDentalChartAction(selectedPatient.id, chart, currentTenant.id, actor);
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
    if (!currentTenant?.id || !actor || !selectedPatient) return;
    try {
      const res = await createTreatmentKanbanFromChartAction(
        selectedPatient.id,
        selectedPatient.name,
        plan,
        currentTenant.id,
        actor
      );
      if (res.success) {
        toast({
          variant: 'success',
          title: 'Tratamiento en Kanban',
          description: `Se generó la orden de trabajo dental para ${selectedPatient.name}.`,
        });
        loadOverview();
        setActiveTab('tratamientos');
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

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery))
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
              <Stethoscope size={26} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
                Odontología & Salud Dental
                <span className="text-xs bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 px-2.5 py-0.5 rounded-full font-bold">
                  FDI Interactivo
                </span>
              </h1>
              <p className="text-slate-500 text-sm font-medium mt-0.5">
                Odontograma digital, piezas supernumerarias, planes de tratamiento y seguimiento clínico
              </p>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/kanban"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-card border border-border text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all shadow-xs btn-haptic"
          >
            <KanbanSquare size={16} className="text-teal-500" />
            Pipeline Kanban
          </Link>

          <Link
            href="/calendario"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-card border border-border text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all shadow-xs btn-haptic"
          >
            <CalendarDays size={16} className="text-blue-500" />
            Citas Dentales
          </Link>

          <button
            onClick={() => loadOverview()}
            className="p-2 bg-card border border-border text-slate-500 hover:text-foreground rounded-xl transition-all btn-haptic"
            title="Refrescar datos"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4.5 flex items-center gap-3.5 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Con Odontograma</p>
            <p className="text-2xl font-black text-foreground mt-0.5">{stats.totalPatientsWithChart}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4.5 flex items-center gap-3.5 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Activity size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">En Tratamiento</p>
            <p className="text-2xl font-black text-foreground mt-0.5">{stats.activeTreatments}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4.5 flex items-center gap-3.5 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Altas Médicas</p>
            <p className="text-2xl font-black text-foreground mt-0.5">{stats.completedTreatments}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4.5 flex items-center gap-3.5 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Presupuestado</p>
            <p className="text-2xl font-black text-foreground mt-0.5">
              ${stats.totalBudgeted.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('odontograma')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all btn-haptic ${
            activeTab === 'odontograma'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-card border border-border text-slate-600 dark:text-slate-400 hover:text-foreground'
          }`}
        >
          <Stethoscope size={16} />
          Odontograma del Paciente
        </button>

        <button
          onClick={() => setActiveTab('tratamientos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all btn-haptic ${
            activeTab === 'tratamientos'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-card border border-border text-slate-600 dark:text-slate-400 hover:text-foreground'
          }`}
        >
          <KanbanSquare size={16} />
          Tratamientos Activos ({dentalOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('pacientes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all btn-haptic ${
            activeTab === 'pacientes'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-card border border-border text-slate-600 dark:text-slate-400 hover:text-foreground'
          }`}
        >
          <Users size={16} />
          Directorio de Pacientes ({customers.length})
        </button>
      </div>

      {/* TAB 1: ODONTOGRAMA */}
      {activeTab === 'odontograma' && (
        <div className="space-y-6">
          {/* Barra de Selección de Paciente */}
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <UserCheck size={20} />
              </div>
              <div className="flex-1 max-w-md">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Paciente en Consulta
                </label>
                <select
                  value={selectedPatient?.id || ''}
                  onChange={(e) => {
                    const found = customers.find((c) => c.id === e.target.value);
                    if (found) setSelectedPatient(found);
                  }}
                  className="w-full bg-background border border-input rounded-xl px-3 py-1.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Seleccionar paciente...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedPatient && (
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs font-bold text-foreground">{selectedPatient.name}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{selectedPatient.phone || 'Sin teléfono'}</p>
                </div>
                <Link
                  href="/clientes"
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  Ver Ficha CRM
                </Link>
              </div>
            )}
          </div>

          {/* Odontograma render */}
          {selectedPatient ? (
            isLoadingChart ? (
              <div className="flex items-center justify-center p-16 bg-card border border-border rounded-2xl">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
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
            <div className="text-center py-16 bg-card border border-dashed border-border rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
                <Stethoscope size={24} />
              </div>
              <h3 className="text-base font-bold text-foreground">Selecciona un Paciente</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Elige un paciente en la barra superior para abrir su odontograma FDI, registrar diagnósticos y generar planes de tratamiento.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TRATAMIENTOS ACTIVOS */}
      {activeTab === 'tratamientos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Órdenes de Trabajo Odontológicas
            </h2>
            <Link
              href="/kanban"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              Abrir Tablero Kanban Dental <ArrowRight size={14} />
            </Link>
          </div>

          {dentalOrders.length === 0 ? (
            <div className="text-center py-16 bg-card border border-dashed border-border rounded-3xl space-y-2">
              <FolderOpen size={32} className="text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-foreground">No hay tratamientos dentales en curso</p>
              <p className="text-xs text-slate-400">
                Guarda un odontograma con hallazgos y presiona &quot;Plan de Tx → Kanban&quot; para crear la primera orden.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dentalOrders.map((order) => {
                const progressPct =
                  order.totalSteps > 0 ? Math.round((order.completedSteps / order.totalSteps) * 100) : 0;

                return (
                  <div
                    key={order.id}
                    className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3 hover:border-teal-500/40 transition-all"
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
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                          <span>Progreso del Tratamiento</span>
                          <span className="text-teal-600 font-bold">
                            {order.completedSteps}/{order.totalSteps} ({progressPct}%)
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-400">Presupuesto</span>
                      <span className="font-black text-foreground">
                        ${order.totalAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DIRECTORIO DE PACIENTES */}
      {activeTab === 'pacientes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar paciente por nombre o teléfono..."
                className="w-full bg-card border border-input rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <Link
              href="/clientes"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-all btn-haptic shrink-0"
            >
              <Plus size={16} />
              Nuevo Paciente en CRM
            </Link>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-border text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5 pl-5">Paciente</th>
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
                          {hasChart ? 'Ver Odontograma' : '+ Crear Odontograma'}
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
    </div>
  );
}
