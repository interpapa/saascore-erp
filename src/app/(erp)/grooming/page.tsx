'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Dog, 
  Plus, 
  Search, 
  Check, 
  Trash2, 
  Send, 
  DollarSign, 
  Sparkles, 
  Calendar, 
  RefreshCw, 
  Phone, 
  MessageCircle,
  AlertTriangle,
  ShieldAlert,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Heart,
  Droplets,
  Wind,
  Scissors as ScissorsIcon,
  Smile
} from 'lucide-react';
import { 
  PetSize, 
  PetCoat, 
  PetTemperament, 
  PET_SIZES_CONFIG, 
  GROOMING_SERVICES_MASTER, 
  mergeTenantGroomingServices,
  GroomingServiceDefinition
} from '@/lib/grooming/groomingCatalog';
import { 
  GroomingOrder, 
  getGroomingOrdersAction, 
  createGroomingOrderAction, 
  updateGroomingStageAction, 
  sendGroomingOrderToCashierAction 
} from '@/app/actions/grooming';
import { getItemsAction } from '@/app/actions/items';
import { ActionActor } from '@/app/actions/entities';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useActionActor } from '@/hooks/useActionActor';
import { useToast } from '@/components/core/ToastProvider';
import { useViewModeStore } from '@/store/useViewModeStore';

const PIPELINE_STAGES: Array<{ id: GroomingOrder['stage']; label: string; icon: any; color: string }> = [
  { id: 'reception', label: 'Recepción', icon: Dog, color: 'text-amber-500' },
  { id: 'bathing', label: 'Bañera', icon: Droplets, color: 'text-cyan-500' },
  { id: 'drying', label: 'Secado & Deslanado', icon: Wind, color: 'text-blue-500' },
  { id: 'haircut', label: 'Corte & Spa', icon: ScissorsIcon, color: 'text-purple-500' },
  { id: 'ready_for_pickup', label: '¡Listo para Retiro!', icon: Sparkles, color: 'text-emerald-500' }
];

export default function GroomingPage() {
  const currentTenant = useTenantResolver();
  const session = useERPStore((s) => s.session);
  const actor = useActionActor();
  const effectiveActor: ActionActor = actor || { email: session?.userEmail || 'groomer@rendorp.com', role: (session?.role as any) || 'technician' };
  const { toast } = useToast();
  const viewMode = useViewModeStore((s) => s.viewMode);
  const tenantId = currentTenant?.id || '';

  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<GroomingOrder[]>([]);
  const [servicesCatalog, setServicesCatalog] = useState<GroomingServiceDefinition[]>(GROOMING_SERVICES_MASTER);

  // Modal Check-In de Entrada
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [petName, setPetName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [breed, setBreed] = useState('Poodle / Caniche');
  const [selectedSize, setSelectedSize] = useState<PetSize>('small');
  const [coatType, setCoatType] = useState<PetCoat>('curly');
  const [temperament, setTemperament] = useState<PetTemperament>('docile');

  // Inspección inicial
  const [mattingLevel, setMattingLevel] = useState<'none' | 'mild' | 'severe'>('none');
  const [parasitesDetected, setParasitesDetected] = useState(false);
  const [analGlands, setAnalGlands] = useState(true);
  const [earsCleaned, setEarsCleaned] = useState(true);
  const [nailsClipped, setNailsClipped] = useState(true);
  const [teethBrushed, setTeethBrushed] = useState(false);
  const [skinNotes, setSkinNotes] = useState('');
  const [serviceType, setServiceType] = useState<'full_groom' | 'bath_only' | 'hygiene_only'>('full_groom');

  // Carga de datos
  const loadData = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const [ordersRes, itemsRes] = await Promise.all([
        getGroomingOrdersAction(tenantId, effectiveActor),
        getItemsAction(tenantId, undefined, 200, effectiveActor)
      ]);

      if (ordersRes.success && ordersRes.orders) {
        setOrders(ordersRes.orders);
      }
      if (itemsRes.success && itemsRes.items) {
        setServicesCatalog(mergeTenantGroomingServices(itemsRes.items as any));
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

  // Registro de Check-In
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petName.trim() || !ownerName.trim()) return;

    const sizeConfig = PET_SIZES_CONFIG[selectedSize];
    const selectedServices: Array<{ name: string; priceUSD: number }> = [];

    // Servicio Base según tipo y tamaño
    if (serviceType === 'full_groom') {
      selectedServices.push({
        name: `Baño, Corte de Raza & Spa (${sizeConfig.label})`,
        priceUSD: sizeConfig.baseFullGroomPriceUSD
      });
    } else if (serviceType === 'bath_only') {
      selectedServices.push({
        name: `Baño Tradicional & Mascarilla (${sizeConfig.label})`,
        priceUSD: sizeConfig.baseBathPriceUSD
      });
    } else {
      selectedServices.push({
        name: 'Higiene & Rapado Sanitario Express',
        priceUSD: 10.0
      });
    }

    // Suplementos automáticos por inspección
    if (mattingLevel === 'severe') {
      selectedServices.push({ name: 'Suplemento: Desanudado Manto Apelmazado', priceUSD: 10.0 });
    }
    if (parasitesDetected) {
      selectedServices.push({ name: 'Tratamiento: Baño Medicado Antipulgas/Garrapatas', priceUSD: 8.0 });
    }
    if (teethBrushed) {
      selectedServices.push({ name: 'Spa Adicional: Cepillado Dental Enzimático', priceUSD: 5.0 });
    }
    if (temperament === 'reactive_bites') {
      selectedServices.push({ name: 'Suplemento: Manejo Especial / Reactivo', priceUSD: 8.0 });
    }

    try {
      const res = await createGroomingOrderAction(
        {
          petName: petName.trim(),
          species: 'dog',
          breed,
          size: selectedSize,
          coatType,
          temperament,
          ownerName: ownerName.trim(),
          ownerPhone: ownerPhone.trim() || undefined,
          inspection: {
            mattingLevel,
            parasitesDetected,
            analGlandsExpressed: analGlands,
            earsCleaned,
            nailsClipped,
            teethBrushed,
            skinWartsNotes: skinNotes
          },
          services: selectedServices,
          notes: skinNotes
        },
        tenantId,
        effectiveActor
      );

      if (res.success && res.order) {
        setOrders([...orders, res.order]);
        setIsCheckInOpen(false);
        setPetName('');
        setOwnerName('');
        setOwnerPhone('');
        setSkinNotes('');
        toast({
          variant: 'success',
          title: 'Mascota Registrada',
          description: `${res.order.petName} ingresó a recepción de peluquería.`,
        });
      }
    } catch {
      toast({
        variant: 'error',
        title: 'Error',
        description: 'No se pudo crear la orden de estética canina.',
      });
    }
  };

  // Mover de etapa en el pipeline
  const handleAdvanceStage = async (order: GroomingOrder, nextStage: GroomingOrder['stage']) => {
    try {
      await updateGroomingStageAction(order.id, nextStage, {}, tenantId, effectiveActor);
      setOrders(orders.map(o => o.id === order.id ? { ...o, stage: nextStage } : o));
      toast({
        variant: 'info',
        title: 'Etapa Actualizada',
        description: `${order.petName} avanzó a ${PIPELINE_STAGES.find(s => s.id === nextStage)?.label}.`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Enviar mensaje de retiro por WhatsApp
  const handleSendWhatsAppPickup = (order: GroomingOrder) => {
    if (!order.ownerPhone) {
      toast({
        variant: 'warning',
        title: 'Sin teléfono',
        description: 'La orden no tiene número de teléfono registrado.',
      });
      return;
    }

    const cleanPhone = order.ownerPhone.replace(/\D/g, '');
    const businessName = currentTenant?.name || 'la peluquería';
    const message = encodeURIComponent(
      `¡Hola ${order.ownerName}! 🐾 Te avisamos de ${businessName} que tu peludo ${order.petName} ya terminó su sesión de peluquería y spa canino. ¡Quedó impecable y oliendo delicioso! ✨🐶 Ya puedes pasar a retirarlo. ¡Te esperamos!`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  // Despachar a Caja POS
  const handleSendToCashier = async (order: GroomingOrder) => {
    try {
      const res = await sendGroomingOrderToCashierAction(order, tenantId, effectiveActor);
      if (res.success) {
        await updateGroomingStageAction(order.id, 'completed', {}, tenantId, effectiveActor);
        toast({
          variant: 'success',
          title: 'Orden enviada a Caja POS',
          description: `Orden #${res.documentNumber} despachada por $${order.totalUSD.toFixed(2)} USD para ${order.petName}.`,
        });
        loadData();
      } else {
        toast({
          variant: 'error',
          title: 'Error al enviar a caja',
          description: res.error || 'No se pudo procesar la orden en caja.',
        });
      }
    } catch {
      toast({
        variant: 'error',
        title: 'Error de red',
        description: 'Fallo al comunicarse con la caja registradora.',
      });
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-linear-to-r from-emerald-600/10 via-teal-900/10 to-transparent p-5 rounded-3xl border border-emerald-600/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Dog size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Peluquería & Spa Canino</h1>
            <p className="text-xs text-slate-500 font-medium">Pipeline de estética por tamaño de raza, baño, deslanado y aviso de retiro</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-2xl bg-card border border-border text-slate-500 hover:text-foreground"
            title="Refrescar órdenes"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={() => setIsCheckInOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-2 btn-haptic shadow-xs"
          >
            <Plus size={16} />
            <span>+ Check-in de Mascota</span>
          </button>
        </div>
      </div>

      {/* Pipeline Visual / Columnas Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {PIPELINE_STAGES.map((stage) => {
          const StageIcon = stage.icon;
          const stageOrders = orders.filter(o => o.stage === stage.id);

          return (
            <div key={stage.id} className="bg-card border border-border rounded-3xl p-4 space-y-3 flex flex-col h-[650px] shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                  <StageIcon size={14} className={stage.color} />
                  <span>{stage.label}</span>
                </span>
                <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs font-bold flex items-center justify-center">
                  {stageOrders.length}
                </span>
              </div>

              {/* Lista de mascotas en esta etapa */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {stageOrders.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs italic">
                    Sin mascotas
                  </div>
                ) : (
                  stageOrders.map((order) => (
                    <div
                      key={order.id}
                      className="p-3.5 rounded-2xl border border-border bg-background hover:border-emerald-500/40 transition-all space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                            <span>{order.petName}</span>
                            <span className="text-[10px] text-slate-400 font-normal">({order.breed})</span>
                          </h4>
                          <span className="text-[10px] text-slate-500">Tutor: {order.ownerName}</span>
                        </div>

                        {/* Badge de Temperamento */}
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          order.temperament === 'docile' ? 'bg-emerald-500/10 text-emerald-600' :
                          order.temperament === 'nervous' ? 'bg-amber-500/10 text-amber-600' :
                          order.temperament === 'reactive_bites' ? 'bg-rose-500/10 text-rose-600' :
                          'bg-purple-500/10 text-purple-600'
                        }`}>
                          {order.temperament === 'docile' ? '🟢 Dócil' :
                           order.temperament === 'nervous' ? '🟡 Nervioso' :
                           order.temperament === 'reactive_bites' ? '🔴 Muerde' : '🟣 Senior'}
                        </span>
                      </div>

                      {/* Desglose de servicios & tamaño */}
                      <div className="text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl space-y-1">
                        <div className="flex justify-between font-bold">
                          <span>Tamaño: {PET_SIZES_CONFIG[order.size]?.label}</span>
                          <span className="text-emerald-600 font-mono font-black">${order.totalUSD.toFixed(2)} USD</span>
                        </div>
                        {order.inspection?.parasitesDetected && (
                          <span className="text-rose-500 font-bold block">⚠️ Alerta Pulgas</span>
                        )}
                        {order.inspection?.mattingLevel === 'severe' && (
                          <span className="text-amber-500 font-bold block">⚠️ Manto Apelmazado</span>
                        )}
                      </div>

                      {/* Botones de Acción según la etapa */}
                      <div className="pt-1 flex items-center gap-1.5">
                        {order.stage === 'reception' && (
                          <button
                            type="button"
                            onClick={() => handleAdvanceStage(order, 'bathing')}
                            className="w-full py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1"
                          >
                            <Droplets size={12} />
                            <span>A la Bañera</span>
                          </button>
                        )}

                        {order.stage === 'bathing' && (
                          <button
                            type="button"
                            onClick={() => handleAdvanceStage(order, 'drying')}
                            className="w-full py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1"
                          >
                            <Wind size={12} />
                            <span>Al Secado</span>
                          </button>
                        )}

                        {order.stage === 'drying' && (
                          <button
                            type="button"
                            onClick={() => handleAdvanceStage(order, 'haircut')}
                            className="w-full py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1"
                          >
                            <ScissorsIcon size={12} />
                            <span>A la Mesa</span>
                          </button>
                        )}

                        {order.stage === 'haircut' && (
                          <button
                            type="button"
                            onClick={() => handleAdvanceStage(order, 'ready_for_pickup')}
                            className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1"
                          >
                            <Sparkles size={12} />
                            <span>¡Listo para Retiro!</span>
                          </button>
                        )}

                        {order.stage === 'ready_for_pickup' && (
                          <div className="w-full space-y-1.5">
                            {order.ownerPhone && (
                              <button
                                type="button"
                                onClick={() => handleSendWhatsAppPickup(order)}
                                className="w-full py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                              >
                                <MessageCircle size={13} />
                                <span>Avisar por WhatsApp</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleSendToCashier(order)}
                              className="w-full py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-black text-xs transition-all flex items-center justify-center gap-1"
                            >
                              <Send size={12} />
                              <span>Cobrar (${order.totalUSD})</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Check-In de Mascota & Inspección Inicial */}
      {isCheckInOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-extrabold text-foreground text-base tracking-tight flex items-center gap-2">
                <Dog size={20} className="text-emerald-500" />
                <span>Check-in de Estética & Inspección Inicial</span>
              </h3>
              <button type="button" onClick={() => setIsCheckInOpen(false)} className="text-slate-400 hover:text-foreground">×</button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Nombre de la Mascota *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Firulais, Max, Luna"
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-2.5 font-bold text-foreground"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Raza *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Poodle, Schnauzer, Golden"
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-2.5 font-medium text-foreground"
                  />
                </div>
              </div>

              {/* Selector de Tamaño & Precios */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Tamaño / Rango de Peso *</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(['toy', 'small', 'medium', 'large', 'giant'] as PetSize[]).map((sz) => {
                    const cfg = PET_SIZES_CONFIG[sz];
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedSize(sz)}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          selectedSize === sz
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 font-extrabold'
                            : 'border-border text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <span className="block text-xs font-black">{cfg.label}</span>
                        <span className="block text-[10px] text-slate-400">{cfg.weightRange}</span>
                        <span className="block text-[10px] font-mono font-bold mt-1 text-emerald-600">
                          ${cfg.baseFullGroomPriceUSD}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Datos del Tutor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Nombre del Tutor/Dueño *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Mariana Rodríguez"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-2.5 font-bold text-foreground"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">WhatsApp del Tutor (Aviso de Retiro)</label>
                  <input
                    type="text"
                    placeholder="ej. 584121234567"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-2.5 font-mono text-foreground"
                  />
                </div>
              </div>

              {/* Semáforo de Temperamento */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Semáforo de Temperamento</label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setTemperament('docile')}
                    className={`py-2 rounded-xl border text-center font-bold text-xs ${temperament === 'docile' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600' : 'border-border text-slate-500'}`}
                  >
                    🟢 Dócil
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemperament('nervous')}
                    className={`py-2 rounded-xl border text-center font-bold text-xs ${temperament === 'nervous' ? 'bg-amber-500/20 border-amber-500 text-amber-600' : 'border-border text-slate-500'}`}
                  >
                    🟡 Nervioso
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemperament('reactive_bites')}
                    className={`py-2 rounded-xl border text-center font-bold text-xs ${temperament === 'reactive_bites' ? 'bg-rose-500/20 border-rose-500 text-rose-600' : 'border-border text-slate-500'}`}
                  >
                    🔴 Muerde
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemperament('senior')}
                    className={`py-2 rounded-xl border text-center font-bold text-xs ${temperament === 'senior' ? 'bg-purple-500/20 border-purple-500 text-purple-600' : 'border-border text-slate-500'}`}
                  >
                    🟣 Senior
                  </button>
                </div>
              </div>

              {/* Inspección de Entrada */}
              <div className="bg-background border border-border rounded-2xl p-3.5 space-y-2.5">
                <span className="text-xs font-black text-foreground uppercase tracking-wider block">Inspección de Piel & Manto</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={parasitesDetected}
                      onChange={(e) => setParasitesDetected(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Pulgas / Garrapatas (+ $8 Baño medicado)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mattingLevel === 'severe'}
                      onChange={(e) => setMattingLevel(e.target.checked ? 'severe' : 'none')}
                      className="rounded text-emerald-600"
                    />
                    <span>Nudos Severos / Apelmazado (+ $10)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={teethBrushed}
                      onChange={(e) => setTeethBrushed(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Cepillado Dental Enzimático (+ $5)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={analGlands}
                      onChange={(e) => setAnalGlands(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Vaciado de Glándulas Perianales (Incluido)</span>
                  </label>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Notas de piel (ej. 'Verruga en lomo derecho no raspar, dermatitis en patas')."
                    value={skinNotes}
                    onChange={(e) => setSkinNotes(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl p-2 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCheckInOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs btn-haptic shadow-xs"
                >
                  Ingresar a Recepción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
