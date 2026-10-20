'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  CreditCard, 
  UserPlus, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  PauseCircle, 
  XCircle, 
  DollarSign, 
  Calendar, 
  Send, 
  ArrowUpRight, 
  RefreshCw, 
  Layers, 
  Sparkles, 
  Filter, 
  Edit3, 
  Check, 
  X, 
  History, 
  Sliders, 
  User, 
  Phone, 
  AlertTriangle,
  Snowflake 
} from 'lucide-react';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useActionActor } from '@/hooks/useActionActor';
import { useToast } from '@/components/core/ToastProvider';
import { getEntitiesAction, createEntityAction, ActionActor } from '@/app/actions/entities';
import { 
  getSubscriptionPlansAction, 
  saveSubscriptionPlanAction, 
  getSubscriptionsAction, 
  createSubscriptionAction, 
  recordSubscriptionPaymentAction, 
  updateSubscriptionStatusAction, 
  changeSubscriptionPlanAction,
  recordSessionCheckInAction,
  freezeSubscriptionAction
} from '@/app/actions/subscriptions';
import { 
  Subscription, 
  SubscriptionPlan, 
  SubscriptionStatus, 
  SubscriptionFrequency, 
  CreateSubscriptionInput 
} from '@/types/subscriptions';

const FREQUENCY_LABELS: Record<SubscriptionFrequency, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual'
};

export default function SuscripcionesPage() {
  const currentTenant = useTenantResolver();
  const actor = useActionActor();
  const { toast } = useToast();

  const showToast = useCallback((title: string, variant: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    toast({ title, variant });
  }, [toast]);

  const [activeTab, setActiveTab] = useState<'subscribers' | 'plans'>('subscribers');
  const [loading, setLoading] = useState<boolean>(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string; phone?: string; email?: string }>>([]);

  // Filtros
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modales
  const [isNewSubModalOpen, setIsNewSubModalOpen] = useState<boolean>(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState<boolean>(false);
  const [isChangePlanModalOpen, setIsChangePlanModalOpen] = useState<boolean>(false);

  // Estados seleccionados
  const [selectedSubForPayment, setSelectedSubForPayment] = useState<Subscription | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Efectivo');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  const [selectedSubForChangePlan, setSelectedSubForChangePlan] = useState<Subscription | null>(null);
  const [targetPlanId, setTargetPlanId] = useState<string>('');

  // Congelamiento de membresía
  const [isFreezeModalOpen, setIsFreezeModalOpen] = useState<boolean>(false);
  const [selectedSubForFreeze, setSelectedSubForFreeze] = useState<Subscription | null>(null);
  const [freezeDays, setFreezeDays] = useState<number>(15);
  const [freezeReason, setFreezeReason] = useState<string>('Vacaciones / Viaje');

  // Formulario nueva suscripción
  const [newSubClientId, setNewSubClientId] = useState<string>('');
  const [newSubPlanId, setNewSubPlanId] = useState<string>('');
  const [newSubStartDate, setNewSubStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [newSubPrice, setNewSubPrice] = useState<string>('');
  const [newSubNotes, setNewSubNotes] = useState<string>('');

  // Creación rápida de cliente/alumno dentro del modal
  const [isQuickClientOpen, setIsQuickClientOpen] = useState<boolean>(false);
  const [quickClientName, setQuickClientName] = useState<string>('');
  const [quickClientPhone, setQuickClientPhone] = useState<string>('');
  const [creatingClient, setCreatingClient] = useState<boolean>(false);

  // Formulario nuevo plan
  const [editingPlan, setEditingPlan] = useState<Partial<SubscriptionPlan>>({
    name: '',
    frequency: 'monthly',
    price_usd: 30,
    grace_period_days: 5,
    max_sessions_per_cycle: null,
    color: '#6366f1',
    is_active: true
  });

  const [processing, setProcessing] = useState<boolean>(false);

  // Cargar datos
  const loadData = useCallback(async () => {
    if (!currentTenant?.id) return;
    const safeActor: ActionActor = actor || { email: 'admin@rendo.com', role: 'owner' };
    setLoading(true);

    try {
      const [subsRes, plansRes, clientsRes] = await Promise.all([
        getSubscriptionsAction(currentTenant.id, undefined, safeActor),
        getSubscriptionPlansAction(currentTenant.id, safeActor),
        getEntitiesAction(currentTenant.id, 'customer', 100, safeActor)
      ]);

      if (subsRes.success) setSubscriptions(subsRes.subscriptions);
      if (plansRes.success) setPlans(plansRes.plans);
      if (clientsRes.success) setClients(clientsRes.entities || []);
    } catch (err) {
      console.error(err);
      showToast('Error cargando datos de suscripciones', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, actor, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cálculos de KPIs
  const stats = useMemo(() => {
    const total = subscriptions.length;
    const active = subscriptions.filter(s => s.status === 'active').length;
    const due = subscriptions.filter(s => s.status === 'due').length;
    const paused = subscriptions.filter(s => s.status === 'paused').length;

    // Calcular MRR aproximado normalizado a mensual
    const mrr = subscriptions
      .filter(s => s.status === 'active' || s.status === 'due')
      .reduce((acc, s) => {
        let monthly = s.price_usd;
        if (s.frequency === 'weekly') monthly = s.price_usd * 4.33;
        else if (s.frequency === 'biweekly') monthly = s.price_usd * 2;
        else if (s.frequency === 'quarterly') monthly = s.price_usd / 3;
        else if (s.frequency === 'semiannual') monthly = s.price_usd / 6;
        else if (s.frequency === 'annual') monthly = s.price_usd / 12;
        return acc + monthly;
      }, 0);

    return { total, active, due, paused, mrr: Math.round(mrr * 100) / 100 };
  }, [subscriptions]);

  // Suscripciones filtradas
  const filteredSubscriptions = useMemo(() => {
    let list = subscriptions;

    if (statusFilter !== 'all') {
      list = list.filter(s => s.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s => 
        s.client_name.toLowerCase().includes(q) ||
        s.plan_name.toLowerCase().includes(q) ||
        (s.client_phone && s.client_phone.includes(q))
      );
    }

    return list;
  }, [subscriptions, statusFilter, searchQuery]);

  // Manejar apertura de modal de cobro
  const handleOpenPayment = (sub: Subscription) => {
    setSelectedSubForPayment(sub);
    setPaymentAmount(sub.price_usd);
    setPaymentMethod('Efectivo');
    setPaymentNotes('');
    setIsPaymentModalOpen(true);
  };

  // Confirmar cobro y renovación
  const handleConfirmPayment = async () => {
    if (!selectedSubForPayment || !currentTenant?.id) return;
    const safeActor: ActionActor = actor || { email: 'admin@rendo.com', role: 'owner' };
    setProcessing(true);

    try {
      const res = await recordSubscriptionPaymentAction(
        selectedSubForPayment.id,
        {
          amount: Number(paymentAmount) || selectedSubForPayment.price_usd,
          paymentMethod,
          notes: paymentNotes
        },
        currentTenant.id,
        safeActor
      );

      if (res.success) {
        showToast(`Pago registrado con éxito. Próximo corte: ${res.nextBillingDate}`, 'success');
        setIsPaymentModalOpen(false);
        loadData();
      } else {
        showToast(res.error || 'Error al registrar el pago', 'error');
      }
    } catch {
      showToast('Ocurrió un error inesperado al procesar el pago', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Manejar cambio de estado (Pausar / Activar / Cancelar)
  const handleChangeStatus = async (sub: Subscription, newStatus: SubscriptionStatus) => {
    if (!currentTenant?.id) return;
    const safeActor: ActionActor = actor || { email: 'admin@rendo.com', role: 'owner' };
    setProcessing(true);

    try {
      const res = await updateSubscriptionStatusAction(sub.id, newStatus, currentTenant.id, safeActor);
      if (res.success) {
        showToast(`Suscripción actualizada a ${newStatus}`, 'success');
        loadData();
      } else {
        showToast(res.error || 'Error al cambiar estado', 'error');
      }
    } catch {
      showToast('Ocurrió un error', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Abrir modal de cambio de plan
  const handleOpenChangePlan = (sub: Subscription) => {
    setSelectedSubForChangePlan(sub);
    setTargetPlanId(sub.plan_id);
    setIsChangePlanModalOpen(true);
  };

  // Confirmar cambio de plan
  const handleConfirmChangePlan = async () => {
    if (!selectedSubForChangePlan || !targetPlanId || !currentTenant?.id) return;
    const safeActor: ActionActor = actor || { email: 'admin@rendo.com', role: 'owner' };
    setProcessing(true);

    try {
      const res = await changeSubscriptionPlanAction(
        selectedSubForChangePlan.id,
        targetPlanId,
        currentTenant.id,
        safeActor
      );

      if (res.success) {
        showToast('Plan de suscripción modificado correctamente', 'success');
        setIsChangePlanModalOpen(false);
        loadData();
      } else {
        showToast(res.error || 'Error al cambiar el plan', 'error');
      }
    } catch {
      showToast('Ocurrió un error', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Check-in rápido de sesión en 1 toque
  const handleSessionCheckIn = async (sub: Subscription) => {
    if (!currentTenant?.id) return;
    const safeActor: ActionActor = actor || { email: 'admin@rendo.com', role: 'owner' };
    setProcessing(true);
    try {
      const res = await recordSessionCheckInAction(sub.id, currentTenant.id, safeActor);
      if (res.success) {
        showToast(`¡Asistencia registrada! (${res.sessions_used} / ${res.max_sessions || '∞'})`, 'success');
        loadData();
      } else {
        showToast(res.error || 'No se pudo registrar la asistencia', 'error');
      }
    } catch {
      showToast('Error de red al registrar asistencia', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Abrir modal de congelamiento
  const handleOpenFreeze = (sub: Subscription) => {
    setSelectedSubForFreeze(sub);
    setFreezeDays(15);
    setFreezeReason('Vacaciones / Viaje');
    setIsFreezeModalOpen(true);
  };

  // Confirmar congelamiento de membresía
  const handleConfirmFreeze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForFreeze || !currentTenant?.id) return;
    const safeActor: ActionActor = actor || { email: 'admin@rendo.com', role: 'owner' };
    setProcessing(true);
    try {
      const res = await freezeSubscriptionAction(
        selectedSubForFreeze.id,
        freezeDays,
        freezeReason,
        currentTenant.id,
        safeActor
      );
      if (res.success) {
        showToast(`Membresía congelada. Nueva fecha de corte: ${res.newBillingDate || 'actualizada'}`, 'success');
        setIsFreezeModalOpen(false);
        setSelectedSubForFreeze(null);
        loadData();
      } else {
        showToast(res.error || 'Error al congelar la membresía', 'error');
      }
    } catch {
      showToast('Ocurrió un error al congelar la membresía', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Crear suscripción
  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubClientId) {
      showToast('Debes seleccionar un cliente del directorio', 'warning');
      return;
    }
    if (!newSubPlanId) {
      showToast('Debes seleccionar un plan de membresía', 'warning');
      return;
    }
    if (!currentTenant?.id) return;

    const safeActor: ActionActor = actor || { email: 'admin@rendo.com', role: 'owner' };
    setProcessing(true);

    try {
      const input: CreateSubscriptionInput = {
        client_id: newSubClientId,
        plan_id: newSubPlanId,
        start_date: newSubStartDate,
        price_usd: newSubPrice ? Number(newSubPrice) : undefined,
        notes: newSubNotes
      };

      const res = await createSubscriptionAction(currentTenant.id, input, safeActor);
      if (res.success) {
        showToast('¡Cliente suscrito con éxito!', 'success');
        setIsNewSubModalOpen(false);
        setNewSubClientId('');
        setNewSubNotes('');
        setNewSubPrice('');
        loadData();
      } else {
        showToast(res.error || 'Error al crear la suscripción', 'error');
      }
    } catch {
      showToast('Ocurrió un error al crear la suscripción', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Creación rápida de cliente/alumno
  const handleQuickCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClientName.trim() || !currentTenant?.id) {
      showToast('Ingresa el nombre del cliente o alumno', 'warning');
      return;
    }
    setCreatingClient(true);
    const safeActor: ActionActor = actor || { email: 'admin@rendo.com', role: 'owner' };
    try {
      const res = await createEntityAction(
        currentTenant.id,
        {
          type: 'customer',
          name: quickClientName.trim(),
          phone: quickClientPhone.trim() || undefined,
          status: 'active'
        },
        safeActor
      );
      if (res.success && res.entity) {
        setClients(prev => [res.entity, ...prev]);
        setNewSubClientId(res.entity.id);
        setIsQuickClientOpen(false);
        setQuickClientName('');
        setQuickClientPhone('');
        showToast('¡Alumno registrado y seleccionado!', 'success');
      } else {
        showToast(res.error || 'Error al crear cliente', 'error');
      }
    } catch {
      showToast('Error de red al crear cliente', 'error');
    } finally {
      setCreatingClient(false);
    }
  };

  // Guardar Plan
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan.name || !editingPlan.price_usd || !currentTenant?.id) {
      showToast('Completa el nombre y precio del plan', 'warning');
      return;
    }

    const safeActor: ActionActor = actor || { email: 'admin@rendo.com', role: 'owner' };
    setProcessing(true);

    try {
      const res = await saveSubscriptionPlanAction(
        currentTenant.id,
        {
          id: editingPlan.id,
          name: editingPlan.name,
          description: editingPlan.description,
          frequency: editingPlan.frequency || 'monthly',
          price_usd: Number(editingPlan.price_usd) || 0,
          grace_period_days: Number(editingPlan.grace_period_days) || 5,
          max_sessions_per_cycle: editingPlan.max_sessions_per_cycle ? Number(editingPlan.max_sessions_per_cycle) : null,
          color: editingPlan.color || '#6366f1',
          is_active: editingPlan.is_active ?? true
        },
        safeActor
      );

      if (res.success) {
        showToast('Plan de membresía guardado con éxito', 'success');
        setIsPlanModalOpen(false);
        setEditingPlan({
          name: '',
          frequency: 'monthly',
          price_usd: 30,
          grace_period_days: 5,
          max_sessions_per_cycle: null,
          color: '#6366f1',
          is_active: true
        });
        loadData();
      } else {
        showToast(res.error || 'Error al guardar el plan', 'error');
      }
    } catch {
      showToast('Ocurrió un error al guardar el plan', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Enviar mensaje WhatsApp de cobro
  const handleSendWhatsApp = (sub: Subscription) => {
    if (!sub.client_phone) {
      showToast('El cliente no tiene número de teléfono registrado', 'warning');
      return;
    }

    let phone = sub.client_phone.replace(/\D/g, '');
    if (!phone.startsWith('58') && phone.length === 10) phone = `58${phone}`;

    const isDue = sub.status === 'due';
    const message = isDue
      ? `Hola *${sub.client_name}*, te saludamos cordialmente. Te recordamos que tu cuota del plan *${sub.plan_name}* ($${sub.price_usd}) venció el día *${sub.next_billing_date}*. Por favor confírmanos tu pago para mantener tu acceso activo. ¡Gracias!`
      : `Hola *${sub.client_name}*, te saludamos cordialmente. Tu suscripción a *${sub.plan_name}* está activa con fecha de próximo corte el *${sub.next_billing_date}*. Quedamos a tu orden para cualquier duda o gestión.`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 md:p-6 lg:p-8">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Suscripciones & Membresías</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Seguimiento de membresías recurrentes, academias, cortes de pago y cobranza ágil
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingPlan({
                name: '',
                frequency: 'monthly',
                price_usd: 35,
                grace_period_days: 5,
                max_sessions_per_cycle: null,
                color: '#6366f1',
                is_active: true
              });
              setIsPlanModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-500 transition shadow-sm"
          >
            <Sliders className="w-4 h-4 text-indigo-500" />
            <span>Configurar Planes</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (plans.length > 0) setNewSubPlanId(plans[0].id);
              setIsNewSubModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nueva Suscripción</span>
          </button>
        </div>
      </div>

      {/* TARJETAS DE KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total Suscriptores</span>
            <UsersIcon className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight">{stats.total}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Contratos en plataforma</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/20 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-1">
            <span>Membresías Activas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{stats.active}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Al día y habilitados</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-500/20 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-medium mb-1">
            <span>Por Vencer / En Mora</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">{stats.due}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Requieren cobro o aviso</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-500/20 shadow-sm">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 text-xs font-medium mb-1">
            <span>MRR Estimado</span>
            <DollarSign className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
            ${stats.mrr.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Ingreso mensual recurrente</p>
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('subscribers')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'subscribers'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Suscriptores ({filteredSubscriptions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('plans')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'plans'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Planes de Membresía ({plans.length})</span>
        </button>
      </div>

      {/* CONTENIDO PESTAÑA 1: SUSCRIPTORES */}
      {activeTab === 'subscribers' && (
        <div className="space-y-4">
          {/* BARRA DE FILTROS Y BÚSQUEDA */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar suscriptor, plan o teléfono..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  statusFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Todos ({subscriptions.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  statusFilter === 'active'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Activos ({subscriptions.filter(s => s.status === 'active').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('due')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  statusFilter === 'due'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Vencidos ({subscriptions.filter(s => s.status === 'due').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('paused')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  statusFilter === 'paused'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Pausados ({subscriptions.filter(s => s.status === 'paused').length})
              </button>
            </div>
          </div>

          {/* TABLA DE SUSCRIPCIONES */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-16 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
                <p className="text-sm">Cargando suscriptores...</p>
              </div>
            ) : filteredSubscriptions.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-40 text-indigo-500" />
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">No hay suscriptores encontrados</h3>
                <p className="text-xs text-slate-400 mt-1">Registra nuevos clientes haciendo clic en "Nueva Suscripción".</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Suscriptor</th>
                      <th className="py-3 px-4">Plan & Frecuencia</th>
                      <th className="py-3 px-4">Sesiones / Asistencia</th>
                      <th className="py-3 px-4">Importe</th>
                      <th className="py-3 px-4">Próximo Corte</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones de Cobro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredSubscriptions.map(sub => {
                      const isDue = sub.status === 'due';
                      const isActive = sub.status === 'active';
                      const isPaused = sub.status === 'paused';

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                                {sub.client_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div>{sub.client_name}</div>
                                {sub.client_phone && (
                                  <div className="text-[11px] text-slate-400 flex items-center gap-1 font-normal">
                                    <Phone className="w-3 h-3" />
                                    <span>{sub.client_phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-700 dark:text-slate-200">{sub.plan_name}</div>
                            <div className="text-[10px] text-slate-400 capitalize">{FREQUENCY_LABELS[sub.frequency] || sub.frequency}</div>
                          </td>

                          {/* Columna de Sesiones y Asistencia en 1 Toque */}
                          <td className="py-3.5 px-4">
                            {sub.max_sessions_per_cycle ? (
                              <div className="space-y-1.5 min-w-[125px]">
                                <div className="flex items-center justify-between text-[11px] font-bold">
                                  <span className="text-slate-700 dark:text-slate-300">
                                    {sub.sessions_used || 0} / {sub.max_sessions_per_cycle}
                                  </span>
                                  {(sub.sessions_used || 0) >= sub.max_sessions_per_cycle ? (
                                    <span className="text-[9px] font-black uppercase text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded">
                                      Agotadas
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-slate-400">
                                      {sub.max_sessions_per_cycle - (sub.sessions_used || 0)} disp.
                                    </span>
                                  )}
                                </div>
                                {/* Barra de Progreso */}
                                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      (sub.sessions_used || 0) >= sub.max_sessions_per_cycle
                                        ? 'bg-rose-500'
                                        : 'bg-indigo-500'
                                    }`}
                                    style={{
                                      width: `${Math.min(100, Math.round(((sub.sessions_used || 0) / sub.max_sessions_per_cycle) * 100))}%`
                                    }}
                                  />
                                </div>
                                {/* Botón Rápido Check-in */}
                                <button
                                  type="button"
                                  onClick={() => handleSessionCheckIn(sub)}
                                  disabled={processing || (sub.sessions_used || 0) >= sub.max_sessions_per_cycle || sub.status === 'paused' || sub.status === 'cancelled'}
                                  className="w-full mt-1 inline-flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
                                  title="Registrar asistencia y descontar sesión en 1 toque"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>+ Check-in</span>
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                                <span>Ilimitado</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 dark:text-white">${sub.price_usd.toFixed(2)}</span>
                            <span className="text-[10px] text-slate-400"> / {FREQUENCY_LABELS[sub.frequency]}</span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className={`font-semibold flex items-center gap-1.5 ${isDue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{sub.next_billing_date}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Último pago: {sub.last_payment_date || 'N/A'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {isActive && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Activo
                              </span>
                            )}
                            {isDue && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                Vencido / Cobrar
                              </span>
                            )}
                            {isPaused && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Pausado
                              </span>
                            )}
                            {sub.status === 'cancelled' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                Cancelado
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botón Cobrar en 1 Clic */}
                              <button
                                type="button"
                                onClick={() => handleOpenPayment(sub)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition"
                                title="Registrar pago y extender ciclo"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Cobrar</span>
                              </button>

                              {/* Botón WhatsApp */}
                              {sub.client_phone && (
                                <button
                                  type="button"
                                  onClick={() => handleSendWhatsApp(sub)}
                                  className="p-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white transition"
                                  title="Enviar recordatorio WhatsApp"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Congelar Membresía (Freeze) */}
                              {isActive && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenFreeze(sub)}
                                  className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white transition"
                                  title="Congelar membresía temporalmente (posterga fecha de cobro)"
                                >
                                  <Snowflake className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Cambiar Plan */}
                              <button
                                type="button"
                                onClick={() => handleOpenChangePlan(sub)}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition"
                                title="Cambiar plan"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>

                              {/* Pausar o Reactivar */}
                              {isActive ? (
                                <button
                                  type="button"
                                  onClick={() => handleChangeStatus(sub, 'paused')}
                                  className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white transition"
                                  title="Pausar suscripción"
                                >
                                  <PauseCircle className="w-3.5 h-3.5" />
                                </button>
                              ) : isPaused ? (
                                <button
                                  type="button"
                                  onClick={() => handleChangeStatus(sub, 'active')}
                                  className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition"
                                  title="Reanudar suscripción"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTENIDO PESTAÑA 2: PLANES DE MEMBRESÍA */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">Catálogo de Planes & Tarifas</h3>
            <button
              type="button"
              onClick={() => {
                setEditingPlan({
                  name: '',
                  frequency: 'monthly',
                  price_usd: 35,
                  grace_period_days: 5,
                  max_sessions_per_cycle: null,
                  color: '#6366f1',
                  is_active: true
                });
                setIsPlanModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Nuevo Plan</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map(p => (
              <div
                key={p.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: p.color || '#6366f1' }}
                />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {FREQUENCY_LABELS[p.frequency]}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPlan(p);
                        setIsPlanModalOpen(true);
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                    >
                      Editar
                    </button>
                  </div>

                  <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">{p.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {p.description || 'Sin descripción adicional.'}
                  </p>

                  <div className="my-4">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">${p.price_usd.toFixed(2)}</span>
                    <span className="text-xs text-slate-400 font-medium"> / {FREQUENCY_LABELS[p.frequency].toLowerCase()}</span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                    <div className="flex items-center justify-between">
                      <span>Días de Gracia:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{p.grace_period_days || 5} días</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Límite de Clases/Sesiones:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {p.max_sessions_per_cycle ? `${p.max_sessions_per_cycle} por ciclo` : 'Ilimitadas'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <span className={`text-[11px] font-semibold ${p.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {p.is_active ? '● Plan Activo' : '○ Inactivo'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewSubPlanId(p.id);
                      setIsNewSubModalOpen(true);
                    }}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>Suscribir</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── MODAL: NUEVA SUSCRIPCIÓN ─────────────────────────────────────── */}
      {isNewSubModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg">Suscribir Cliente</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewSubModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubscription} className="mt-4 space-y-4">
              {/* Cliente */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Cliente / Alumno del Directorio *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsQuickClientOpen(!isQuickClientOpen)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{isQuickClientOpen ? 'Volver a la lista' : '+ Nuevo Alumno'}</span>
                  </button>
                </div>

                {isQuickClientOpen ? (
                  <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900/60 space-y-2 animate-in fade-in">
                    <p className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-200">
                      Crear Alumno Rápido:
                    </p>
                    <input
                      type="text"
                      placeholder="Nombre y Apellido del Alumno *"
                      value={quickClientName}
                      onChange={e => setQuickClientName(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-indigo-500"
                    />
                    <input
                      type="tel"
                      placeholder="Teléfono / WhatsApp (ej: 0414-1234567)"
                      value={quickClientPhone}
                      onChange={e => setQuickClientPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-indigo-500"
                    />
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsQuickClientOpen(false)}
                        className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={creatingClient || !quickClientName.trim()}
                        onClick={handleQuickCreateClient}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        {creatingClient ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        <span>Guardar Alumno</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={newSubClientId}
                    onChange={e => setNewSubClientId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">-- Seleccionar Cliente ({clients.length} disponibles) --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Plan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Plan de Membresía *
                </label>
                <select
                  value={newSubPlanId}
                  onChange={e => {
                    setNewSubPlanId(e.target.value);
                    const selected = plans.find(p => p.id === e.target.value);
                    if (selected) setNewSubPrice(String(selected.price_usd));
                  }}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- Seleccionar Plan --</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} - ${p.price_usd} / {FREQUENCY_LABELS[p.frequency]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha Inicio y Precio */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fecha de Inicio *
                  </label>
                  <input
                    type="date"
                    value={newSubStartDate}
                    onChange={e => setNewSubStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Precio Acordado ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="35.00"
                    value={newSubPrice}
                    onChange={e => setNewSubPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observaciones / Notas
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles del contrato o condiciones especiales..."
                  value={newSubNotes}
                  onChange={e => setNewSubNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewSubModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  {processing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Confirmar Suscripción</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: REGISTRAR PAGO Y RENOVAR CICLO ─────────────────────────── */}
      {isPaymentModalOpen && selectedSubForPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Registrar Pago de Cuota</h3>
                  <p className="text-xs text-slate-400">{selectedSubForPayment.client_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Plan contratado:</span>
                  <span className="font-bold text-indigo-700 dark:text-indigo-300">{selectedSubForPayment.plan_name}</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-600 dark:text-slate-400">Corte actual:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">{selectedSubForPayment.next_billing_date}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Monto Recibido ($ USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Método de Pago
                </label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="Efectivo">Efectivo ($ USD o Bs)</option>
                  <option value="Pago Móvil">Pago Móvil</option>
                  <option value="Zelle">Zelle</option>
                  <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                  <option value="Punto de Venta / Tarjeta">Punto de Venta / Tarjeta</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Referencia o Notas
                </label>
                <input
                  type="text"
                  placeholder="Ej: Ref 482910 o Pago en local"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={handleConfirmPayment}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  {processing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Confirmar y Renovar Ciclo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CAMBIAR PLAN DE SUSCRIPCIÓN ────────────────────────────── */}
      {isChangePlanModalOpen && selectedSubForChangePlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Modificar Plan de Membresía</h3>
                  <p className="text-xs text-slate-400">{selectedSubForChangePlan.client_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChangePlanModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-500">
                Selecciona el nuevo plan para este cliente. El monto se actualizará automáticamente a partir de su próximo ciclo de cobro.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nuevo Plan *
                </label>
                <select
                  value={targetPlanId}
                  onChange={e => setTargetPlanId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} - ${p.price_usd} / {FREQUENCY_LABELS[p.frequency]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsChangePlanModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={handleConfirmChangePlan}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  {processing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Guardar Nuevo Plan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREAR / EDITAR PLAN ────────────────────────────────────── */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base">{editingPlan.id ? 'Editar Plan' : 'Nuevo Plan'}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre del Plan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Membresía General, Pase Libre..."
                  value={editingPlan.name || ''}
                  onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  placeholder="Qué incluye este plan..."
                  value={editingPlan.description || ''}
                  onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Frecuencia *
                  </label>
                  <select
                    value={editingPlan.frequency || 'monthly'}
                    onChange={e => setEditingPlan({ ...editingPlan, frequency: e.target.value as SubscriptionFrequency })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quincenal</option>
                    <option value="monthly">Mensual</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="semiannual">Semestral</option>
                    <option value="annual">Anual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Precio ($ USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingPlan.price_usd ?? ''}
                    onChange={e => setEditingPlan({ ...editingPlan, price_usd: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Días de Gracia
                  </label>
                  <input
                    type="number"
                    value={editingPlan.grace_period_days ?? 5}
                    onChange={e => setEditingPlan({ ...editingPlan, grace_period_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Límite Sesiones / Ciclo
                  </label>
                  <input
                    type="number"
                    placeholder="Ilimitadas si vacío"
                    value={editingPlan.max_sessions_per_cycle ?? ''}
                    onChange={e => setEditingPlan({ ...editingPlan, max_sessions_per_cycle: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  {processing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Guardar Plan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CONGELAR MEMBRESÍA (FREEZE) ────────────────────────────── */}
      {isFreezeModalOpen && selectedSubForFreeze && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Snowflake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Congelar Membresía</h3>
                  <p className="text-xs text-slate-400">Pausa temporal y postergación de cobro</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFreezeModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmFreeze} className="mt-4 space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {selectedSubForFreeze.client_name}
                </div>
                <div className="text-[11px] text-slate-500">
                  Plan: {selectedSubForFreeze.plan_name} • Corte actual: <span className="font-bold text-foreground">{selectedSubForFreeze.next_billing_date}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Días de Congelamiento *
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {[7, 15, 30].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setFreezeDays(days)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                        freezeDays === days
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {days} Días
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="180"
                  required
                  value={freezeDays}
                  onChange={e => setFreezeDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Días personalizados"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo de Congelamiento
                </label>
                <select
                  value={freezeReason}
                  onChange={e => setFreezeReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none mb-2"
                >
                  <option value="Vacaciones / Viaje">Vacaciones / Viaje</option>
                  <option value="Incapacidad Médica / Lesión">Incapacidad Médica / Lesión</option>
                  <option value="Motivos Laborales">Motivos Laborales</option>
                  <option value="Solicitud Especial del Cliente">Solicitud Especial del Cliente</option>
                </select>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-[11px] text-blue-800 dark:text-blue-300">
                💡 La próxima fecha de cobro se postergará automáticamente <strong>+{freezeDays} días</strong> y el estado pasará a congelado/pausado.
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFreezeModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  {processing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Snowflake className="w-3.5 h-3.5" />}
                  <span>Confirmar Congelamiento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
