'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Scissors, 
  Users, 
  Clock, 
  Sparkles, 
  Plus, 
  Search, 
  Trash2, 
  Check, 
  Send, 
  DollarSign, 
  UserCheck, 
  RefreshCw,
  Flame,
  Award,
  ChevronRight,
  ShoppingBag,
  Layers,
  ArrowRight,
  Smile
} from 'lucide-react';
import { 
  BarberServiceDefinition, 
  BARBER_SERVICES_MASTER, 
  mergeTenantBarberServices 
} from '@/lib/barberia/barberCatalog';
import { 
  BarberQueueItem, 
  getBarberQueueAction, 
  addWalkInToQueueAction, 
  updateQueueStatusAction, 
  sendBarberOrderToCashierAction 
} from '@/app/actions/barberia';
import { getItemsAction } from '@/app/actions/items';
import { getEntitiesAction, ActionActor } from '@/app/actions/entities';
import { ModuleStaffMember, getModuleStaffAction } from '@/app/actions/moduleStaff';
import { getModulePricingConfigAction } from '@/app/actions/modulePricing';
import type { BarberPricingConfig } from '@/lib/modulePricingDefaults';
import { BarberStaffTab } from '@/components/barberia/BarberStaffTab';
import { BarberPricingTab } from '@/components/barberia/BarberPricingTab';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useActionActor } from '@/hooks/useActionActor';
import { useToast } from '@/components/core/ToastProvider';
import { useViewModeStore } from '@/store/useViewModeStore';

export default function BarberiaPage() {
  const currentTenant = useTenantResolver();
  const session = useERPStore((s) => s.session);
  const actor = useActionActor();
  const effectiveActor: ActionActor = actor || { 
    email: session?.userEmail || 'barber@rendorp.com', 
    role: (session?.role as any) || 'technician',
    token: session?.token
  };
  const { toast } = useToast();
  const viewMode = useViewModeStore((s) => s.viewMode);
  const tenantId = currentTenant?.id || '';

  // Pestaña activa
  const [currentTab, setCurrentTab] = useState<'sillon' | 'equipo' | 'tarifas'>('sillon');

  // Estado general
  const [isLoading, setIsLoading] = useState(true);
  const [queue, setQueue] = useState<BarberQueueItem[]>([]);
  const [barberServices, setBarberServices] = useState<BarberServiceDefinition[]>(BARBER_SERVICES_MASTER);
  const [barberStaff, setBarberStaff] = useState<ModuleStaffMember[]>([]);
  const [pricingConfig, setPricingConfig] = useState<BarberPricingConfig>({
    defaultCommissionPercent: 50,
    defaultDurationMin: 30,
    tipSplitWithShop: false
  });

  const [selectedBarber, setSelectedBarber] = useState<ModuleStaffMember>({
    id: 'barb-1',
    name: 'Carlos "Master" Fade',
    role: 'Master Barber',
    specialty: 'Degradados & Barba',
    avatar: '✂️',
    commissionPercent: 50,
    module: 'barberia',
    isActive: true
  });

  // Turno actual en Silla
  const [activeSession, setActiveSession] = useState<BarberQueueItem | null>(null);
  const [sessionServices, setSessionServices] = useState<Array<{ name: string; priceUSD: number; category?: string }>>([]);
  const [tipInput, setTipInput] = useState<string>('0');
  const [isSendingCashier, setIsSendingCashier] = useState(false);

  // Filtros de servicios en silla
  const [serviceSearch, setServiceSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Modal para agregar Walk-In a la cola
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientBarberId, setNewClientBarberId] = useState('');

  // Concepto libre
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  // Carga de datos
  const loadData = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const [queueRes, itemsRes, staffRes, configRes] = await Promise.all([
        getBarberQueueAction(tenantId, effectiveActor),
        getItemsAction(tenantId, undefined, 200, effectiveActor),
        getModuleStaffAction(tenantId, 'barberia', effectiveActor),
        getModulePricingConfigAction<BarberPricingConfig>(tenantId, 'barberia', effectiveActor)
      ]);

      if (queueRes.success && queueRes.queue) {
        setQueue(queueRes.queue);
        // Si hay alguien en la silla, seleccionarlo
        const inChair = queueRes.queue.find(q => q.status === 'in_chair');
        if (inChair && !activeSession) {
          setActiveSession(inChair);
          setSessionServices(inChair.services || []);
        }
      }

      if (itemsRes.success && itemsRes.items) {
        const merged = mergeTenantBarberServices(itemsRes.items as any);
        setBarberServices(merged);
      }

      if (staffRes.success && staffRes.staff && staffRes.staff.length > 0) {
        setBarberStaff(staffRes.staff);
        // Si no hay seleccionado o el seleccionado ya no existe, tomar el primero activo
        const firstActive = staffRes.staff.find(s => s.isActive) || staffRes.staff[0];
        setSelectedBarber((prev) => {
          const match = staffRes.staff?.find(s => s.id === prev.id);
          return match || firstActive;
        });
        setNewClientBarberId((prev) => prev || firstActive.id);
      }

      if (configRes.success && configRes.config) {
        setPricingConfig(configRes.config);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  // Agregar Walk-in
  const handleAddWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    const assignedBarber = barberStaff.find(b => b.id === newClientBarberId) || selectedBarber;

    try {
      const res = await addWalkInToQueueAction(
        {
          clientName: newClientName.trim(),
          phone: newClientPhone.trim() || undefined,
          barberId: assignedBarber.id,
          barberName: assignedBarber.name,
          services: [],
          barberCommissionPercent: assignedBarber.commissionPercent
        },
        tenantId,
        effectiveActor
      );

      if (res.success && res.queueItem) {
        setQueue([...queue, res.queueItem]);
        setNewClientName('');
        setNewClientPhone('');
        setIsWalkInModalOpen(false);
        toast({
          variant: 'success',
          title: 'Cliente en espera',
          description: `${res.queueItem.clientName} ha sido agregado al turnero de la barbería.`,
        });
      }
    } catch {
      toast({
        variant: 'error',
        title: 'Error',
        description: 'No se pudo agregar el cliente al turnero.',
      });
    }
  };

  // Sentar cliente en la silla
  const handleSeatClient = async (item: BarberQueueItem) => {
    try {
      await updateQueueStatusAction(item.id, 'in_chair', {}, tenantId, effectiveActor);
      setActiveSession(item);
      setSessionServices(item.services || []);
      setQueue(queue.map(q => q.id === item.id ? { ...q, status: 'in_chair' } : q));
      toast({
        variant: 'info',
        title: 'Cliente en Silla',
        description: `${item.clientName} está siendo atendido por ${item.barberName}.`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Agregar servicio al cliente en la silla
  const handleAddServiceToSession = (serv: { name: string; defaultPriceUSD: number; categoryLabel?: string }) => {
    setSessionServices([
      ...sessionServices,
      { name: serv.name, priceUSD: serv.defaultPriceUSD, category: serv.categoryLabel }
    ]);
  };

  const handleRemoveService = (index: number) => {
    setSessionServices(sessionServices.filter((_, i) => i !== index));
  };

  const handleAddCustomConcept = () => {
    const p = parseFloat(customPrice);
    if (!customName.trim() || isNaN(p) || p < 0) return;
    setSessionServices([
      ...sessionServices,
      { name: customName.trim(), priceUSD: p, category: 'Personalizado' }
    ]);
    setCustomName('');
    setCustomPrice('');
    setIsCustomOpen(false);
  };

  // Cálculos de la sesión
  const servicesSubtotal = useMemo(() => {
    return sessionServices.reduce((sum, s) => sum + s.priceUSD, 0);
  }, [sessionServices]);

  const tipUSD = parseFloat(tipInput) || 0;
  const totalUSD = servicesSubtotal + tipUSD;
  const barberPercent = selectedBarber.commissionPercent;
  const barberCommissionUSD = (servicesSubtotal * barberPercent) / 100;
  const shopCutUSD = servicesSubtotal - barberCommissionUSD;

  // Despachar a Caja POS
  const handleSendToCashier = async () => {
    if (!activeSession || sessionServices.length === 0) return;
    setIsSendingCashier(true);
    try {
      const res = await sendBarberOrderToCashierAction(
        {
          clientName: activeSession.clientName,
          clientId: activeSession.clientId,
          barberId: selectedBarber.id,
          barberName: selectedBarber.name,
          services: sessionServices,
          tipUSD,
          barberCommissionPercent: barberPercent
        },
        tenantId,
        effectiveActor
      );

      if (res.success) {
        await updateQueueStatusAction(activeSession.id, 'completed', {}, tenantId, effectiveActor);
        toast({
          variant: 'success',
          title: 'Ticket enviado a Caja POS',
          description: `Orden #${res.documentNumber} enviada por $${totalUSD.toFixed(2)} USD. Lista para cobrar en mostrador.`,
        });
        setActiveSession(null);
        setSessionServices([]);
        setTipInput('0');
        loadData();
      } else {
        toast({
          variant: 'error',
          title: 'Error al enviar a caja',
          description: res.error || 'No se pudo generar la orden.',
        });
      }
    } catch {
      toast({
        variant: 'error',
        title: 'Error de red',
        description: 'No se pudo contactar a la caja.',
      });
    } finally {
      setIsSendingCashier(false);
    }
  };

  // Filtrado de servicios
  const filteredServices = useMemo(() => {
    return barberServices.filter(s => {
      const matchesCat = activeCategory === 'all' || s.category === activeCategory;
      const matchesSearch = !serviceSearch.trim() || s.name.toLowerCase().includes(serviceSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [barberServices, activeCategory, serviceSearch]);

  const categories = [
    { id: 'all', label: 'Todos' },
    { id: 'corte', label: 'Cortes Fade' },
    { id: 'barba', label: 'Ritual Barba' },
    { id: 'facial_spa', label: 'Facial & Spa' },
    { id: 'color', label: 'Color' },
    { id: 'producto', label: 'Venta Silla' }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-linear-to-r from-amber-600/10 via-stone-900/10 to-transparent p-5 rounded-3xl border border-amber-600/20">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Scissors size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">Barbería & Men&apos;s Grooming</h1>
              <p className="text-xs text-slate-500 font-medium">Estación de silla, turnero walk-in, rituales y comisiones</p>
            </div>
          </div>
        </div>

        {/* Selector de Barbero de Turno */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-background border border-border p-1.5 rounded-2xl shadow-2xs">
            <span className="text-xs font-bold text-slate-400 pl-2">Estilista:</span>
            <div className="flex items-center gap-1">
              {barberStaff.map((barber) => (
                <button
                  key={barber.id}
                  type="button"
                  onClick={() => setSelectedBarber(barber)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 btn-haptic ${
                    selectedBarber.id === barber.id
                      ? 'bg-amber-600 text-white shadow-xs font-extrabold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{barber.avatar}</span>
                  <span>{barber.name.split(' ')[0]}</span>
                  <span className="text-[10px] opacity-75">({barber.commissionPercent}%)</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsWalkInModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black transition-all flex items-center gap-2 btn-haptic shadow-xs"
          >
            <Plus size={16} />
            <span>+ Nuevo Turno (Walk-in)</span>
          </button>
        </div>
      </div>

      {/* Sub-Navegación de Módulo */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
        <button
          onClick={() => setCurrentTab('sillon')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
            currentTab === 'sillon'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span>💈</span>
          <span>Sillón & Turnero</span>
        </button>

        <button
          onClick={() => setCurrentTab('equipo')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
            currentTab === 'equipo'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>Barberos & Comisiones</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10 dark:bg-white/10">
            {barberStaff.length}
          </span>
        </button>

        <button
          onClick={() => setCurrentTab('tarifas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
            currentTab === 'tarifas'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Precios & Servicios</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10 dark:bg-white/10">
            {barberServices.length}
          </span>
        </button>
      </div>

      {currentTab === 'equipo' && (
        <BarberStaffTab
          staff={barberStaff}
          onRefresh={loadData}
          tenantId={tenantId}
          actor={effectiveActor}
        />
      )}

      {currentTab === 'tarifas' && (
        <BarberPricingTab
          services={barberServices}
          pricingConfig={pricingConfig}
          onRefresh={loadData}
          tenantId={tenantId}
          actor={effectiveActor}
        />
      )}

      {currentTab === 'sillon' && (
        <>
          {/* Grid Principal: Cola de Espera (Izquierda) + Estación de Silla (Derecha) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMNA 1: TURNERO / COLA DE ESPERA DIGITAL */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-card border border-border rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users size={15} className="text-amber-500" />
                <span>Sala de Espera ({queue.filter(q => q.status === 'waiting').length})</span>
              </span>
              <button
                type="button"
                onClick={loadData}
                className="text-slate-400 hover:text-foreground text-xs p-1"
                title="Actualizar turnero"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {queue.filter(q => q.status === 'waiting').length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No hay clientes en sala de espera. Presiona &quot;+ Nuevo Turno&quot; al llegar alguien.
              </div>
            ) : (
              <div className="space-y-2.5">
                {queue.filter(q => q.status === 'waiting').map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl border border-border bg-background hover:border-amber-500/30 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 font-mono text-xs font-black flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="text-xs font-black text-foreground">{item.clientName}</h4>
                          <span className="text-[10px] text-slate-400 font-medium">Barbero: {item.barberName}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSeatClient(item)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition-all btn-haptic flex items-center gap-1 shadow-2xs"
                      >
                        <Scissors size={12} />
                        <span>A la Silla</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-border/40">
                      <span>Llegada: {new Date(item.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {item.phone && <span>Tel: {item.phone}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA 2: ESTACIÓN / SILLA DE BARBERO ACTIVA */}
        <div className="lg:col-span-8 space-y-4">
          {/* Tarjeta del Cliente en Silla */}
          <div className="bg-card border-2 border-amber-500/30 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center text-xl font-bold">
                  💈
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                    Cliente en la Silla de Barbero
                  </span>
                  <h3 className="text-lg font-black text-foreground">
                    {activeSession ? activeSession.clientName : 'Silla Disponible'}
                  </h3>
                </div>
              </div>

              {activeSession && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">
                    Atendido por: <strong className="text-foreground">{selectedBarber.name}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Si no hay nadie en la silla, botón rápido para sentar cliente express */}
            {!activeSession && (
              <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-border rounded-2xl space-y-3">
                <p>No hay ningún cliente sentado en la silla en este momento.</p>
                <button
                  type="button"
                  onClick={() => {
                    const walkInMock: BarberQueueItem = {
                      id: `temp-${Date.now()}`,
                      clientName: 'Cliente Rápido en Silla',
                      barberId: selectedBarber.id,
                      barberName: selectedBarber.name,
                      services: [],
                      status: 'in_chair',
                      arrivalTime: new Date().toISOString(),
                      tipUSD: 0,
                      barberCommissionPercent: selectedBarber.commissionPercent
                    };
                    setActiveSession(walkInMock);
                    setSessionServices([]);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all btn-haptic shadow-xs inline-flex items-center gap-2"
                >
                  <Scissors size={14} />
                  <span>Iniciar Atención Inmediata en Silla</span>
                </button>
              </div>
            )}

            {/* Si hay cliente en la silla: Catálogo Táctil + Comanda */}
            {activeSession && (
              <div className="space-y-4">
                {/* Selector de Servicios Rápidos */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-black text-foreground uppercase tracking-wider">
                      Agregar Servicios & Productos de Styling
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCustomOpen(!isCustomOpen)}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-500/10 px-2.5 py-1 rounded-lg"
                    >
                      + Concepto Libre
                    </button>
                  </div>

                  {isCustomOpen && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-border flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Nombre del servicio o producto..."
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-medium"
                      />
                      <input
                        type="number"
                        placeholder="Precio USD"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        className="w-24 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono font-bold"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomConcept}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs"
                      >
                        Agregar
                      </button>
                    </div>
                  )}

                  {/* Buscador y Filtro por Categorías */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[160px]">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                      <input
                        type="text"
                        placeholder="Buscar fade, barba, pomada..."
                        value={serviceSearch}
                        onChange={(e) => setServiceSearch(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground font-medium"
                      />
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setActiveCategory(cat.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                            activeCategory === cat.id
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-foreground'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grilla de Servicios 1-Tap */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                    {filteredServices.map((serv) => (
                      <button
                        key={serv.id}
                        type="button"
                        onClick={() => handleAddServiceToSession(serv)}
                        className="p-2.5 rounded-xl border border-border bg-background hover:border-amber-500/40 hover:bg-amber-500/5 text-left transition-all btn-haptic flex flex-col justify-between"
                      >
                        <span className="text-xs font-bold text-foreground leading-tight line-clamp-2">
                          {serv.name}
                        </span>
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/40">
                          <span className="text-[10px] text-slate-400">{serv.categoryLabel}</span>
                          <span className="text-xs font-black text-amber-600 font-mono">
                            ${serv.defaultPriceUSD.toFixed(2)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comanda Actual del Cliente en Silla */}
                <div className="bg-background border border-border rounded-2xl p-4 space-y-3">
                  <span className="text-xs font-black text-foreground uppercase tracking-wider block">
                    Comanda de Servicios & Consumos ({sessionServices.length})
                  </span>

                  {sessionServices.length === 0 ? (
                    <div className="text-center py-4 text-slate-400 text-xs italic">
                      Selecciona arriba los cortes o productos para agregarlos a la cuenta.
                    </div>
                  ) : (
                    <div className="space-y-1.5 divide-y divide-border/40">
                      {sessionServices.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between pt-1.5 first:pt-0">
                          <span className="text-xs font-semibold text-foreground">{item.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-foreground">
                              ${item.priceUSD.toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveService(idx)}
                              className="text-slate-400 hover:text-rose-500 p-1"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Resumen Financiero: Subtotal, Comisión y Propina */}
                  <div className="pt-3 border-t border-border space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-border">
                        <span className="text-[10px] text-slate-400 block font-bold">Subtotal Servicios</span>
                        <span className="font-mono font-black text-foreground text-sm">${servicesSubtotal.toFixed(2)}</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600">
                        <span className="text-[10px] block font-bold">Comisión ({barberPercent}%)</span>
                        <span className="font-mono font-black text-sm">${barberCommissionUSD.toFixed(2)}</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-border">
                        <span className="text-[10px] text-slate-400 block font-bold">Propina Barbero</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-slate-400 font-bold">$</span>
                          <input
                            type="number"
                            min="0"
                            value={tipInput}
                            onChange={(e) => setTipInput(e.target.value)}
                            className="w-16 bg-background border border-border rounded px-1.5 py-0.5 font-mono text-xs font-bold text-foreground"
                          />
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                        <span className="text-[10px] block font-bold">Total a Cobrar</span>
                        <span className="font-mono font-black text-sm">${totalUSD.toFixed(2)} USD</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSession(null);
                          setSessionServices([]);
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                      >
                        Liberar Silla
                      </button>

                      <button
                        type="button"
                        disabled={sessionServices.length === 0 || isSendingCashier}
                        onClick={handleSendToCashier}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black transition-all btn-haptic shadow-xs flex items-center gap-2"
                      >
                        <Send size={14} />
                        <span>Despachar a Caja POS (${totalUSD.toFixed(2)} USD)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )}

      {/* Modal: Agregar Walk-in a la cola */}
      {isWalkInModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-extrabold text-foreground text-base tracking-tight flex items-center gap-2">
              <Users size={18} className="text-amber-500" />
              <span>Registrar Cliente en Sala (Walk-in)</span>
            </h3>

            <form onSubmit={handleAddWalkIn} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Nombre del Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Marcos Delgado"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Teléfono WhatsApp (Opcional)</label>
                <input
                  type="text"
                  placeholder="ej. 0412-1234567"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Barbero Preferido</label>
                <select
                  value={newClientBarberId}
                  onChange={(e) => setNewClientBarberId(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground font-bold"
                >
                  {barberStaff.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.commissionPercent}%)</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWalkInModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs btn-haptic shadow-xs"
                >
                  Agregar a la Sala
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
