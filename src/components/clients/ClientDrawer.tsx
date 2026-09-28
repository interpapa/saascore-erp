'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Phone, Mail, MapPin, DollarSign, Edit3, Trash2, Calendar, 
  ShoppingBag, MessageSquare, Stethoscope, Image as ImageIcon, 
  Receipt, User, Sparkles, Tag, FileText, ExternalLink, Printer,
  PlusCircle, CreditCard, ArrowUpRight, CheckCircle2, Maximize2, Minimize2
} from 'lucide-react';
import { Entity } from '@/lib/api/entities';
import { adjustCustomerDebtAction, recordClientPaymentAction, toggleEntityHistoryAction } from '@/app/actions/entities';
import { UISlot } from '@/components/core/UISlot';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/core/ToastProvider';
import { ClientRecordsTab } from './ClientRecordsTab';
import { ClientAttachmentsTab } from './ClientAttachmentsTab';
import { ClientHistoryTab } from './ClientHistoryTab';
import { CustomFieldDefinition } from '@/lib/core/industryTemplates';
import { useERPStore } from '@/store/useERPStore';
import { isModuleActive } from '@/lib/core/kernel/moduleRegistry';
import { getDentalChartAction, saveDentalChartAction, createTreatmentKanbanFromChartAction, DentalChart, DentalTreatmentPlan } from '@/app/actions/dental';
import { Odontogram } from '@/components/dental/Odontogram';

interface ClientDrawerProps {
  client: Entity | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (client: Entity) => void;
  onDelete?: (id: string) => void;
  tenantId?: string;
  actor?: any;
  customSchema?: CustomFieldDefinition[];
  initialTab?: DrawerTab;
}

type DrawerTab = 'perfil' | 'registros' | 'archivos' | 'historial' | 'odontograma';

export function ClientDrawer({ 
  client, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete,
  tenantId,
  actor,
  customSchema = [],
  initialTab = 'perfil'
}: ClientDrawerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<DrawerTab>(initialTab);
  const [isExpanded, setIsExpanded] = useState(false);
  const [triggerNewRecord, setTriggerNewRecord] = useState<number>(0);

  const { currentTenant } = useERPStore();
  const isDentalModuleActive = isModuleActive(
    currentTenant?.active_modules || (currentTenant?.metadata as { active_modules?: string[] })?.active_modules,
    'odontologia'
  );
  const [dentalChart, setDentalChart] = useState<DentalChart | undefined>(undefined);
  const [isDentalLoading, setIsDentalLoading] = useState(false);
  const [isDentalSaving, setIsDentalSaving] = useState(false);
  const [isCreatingKanban, setIsCreatingKanban] = useState(false);

  // Historial a demanda: se activa por cliente mediante botón para mantener fichas limpias
  const [isHistoryEnabled, setIsHistoryEnabled] = useState<boolean>(() => {
    return Boolean(
      (client?.metadata as any)?.has_history ||
      (client?.metadata as any)?.has_clinical_history ||
      (client?.metadata as any)?.clinical_history
    );
  });

  useEffect(() => {
    if (client) {
      setIsHistoryEnabled(
        Boolean(
          (client.metadata as any)?.has_history ||
          (client.metadata as any)?.has_clinical_history ||
          (client.metadata as any)?.clinical_history
        )
      );
    }
  }, [client]);

  const handleToggleHistory = async () => {
    const nextVal = !isHistoryEnabled;
    setIsHistoryEnabled(nextVal);
    if (!nextVal && (activeTab === 'registros' || activeTab === 'archivos' || activeTab === 'odontograma')) {
      setActiveTab('perfil');
    }
    if (client?.id && tenantId && actor) {
      try {
        const res = await toggleEntityHistoryAction(client.id, nextVal, tenantId, actor);
        if (res.success) {
          toast({
            variant: 'success',
            title: nextVal ? 'Historial Activado' : 'Historial Oculto',
            description: nextVal 
              ? 'Bitácora y seguimiento activados para este cliente.' 
              : 'Ficha simplificada a datos básicos y ventas.',
          });
        }
      } catch (err: any) {
        toast({ variant: 'error', title: 'Error', description: err.message });
      }
    }
  };

  // Bloquear el scroll de fondo cuando el drawer está abierto para evitar bugs
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
      document.body.style.overflow = 'hidden';

      if (initialTab) {
        setActiveTab(initialTab);
      }

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isOpen, initialTab]);

  // Cargar odontograma cuando se activa la pestaña dental
  useEffect(() => {
    if (activeTab === 'odontograma' && client?.id && tenantId && actor && isDentalModuleActive) {
      setIsDentalLoading(true);
      getDentalChartAction(client.id, tenantId, actor).then((res: { success: boolean; chart?: import('@/app/actions/dental').DentalChart }) => {
        if (res.success) setDentalChart(res.chart);
      }).catch(console.error).finally(() => setIsDentalLoading(false));
    }
  }, [activeTab, client?.id, tenantId, actor, isDentalModuleActive]);

  // Estado de deuda reactivo local
  const [localDebt, setLocalDebt] = useState<number>(0);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtActionType, setDebtActionType] = useState<'charge' | 'payment'>('charge');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [newDebtAmount, setNewDebtAmount] = useState('');
  const [newDebtConcept, setNewDebtConcept] = useState('');
  const [isSubmittingDebt, setIsSubmittingDebt] = useState(false);

  useEffect(() => {
    if (client) {
      setLocalDebt(Number((client.metadata as any)?.total_debt || 0));
    }
  }, [client]);

  useEffect(() => {
    if (!isOpen) {
      setConfirmDelete(false);
      setIsDebtModalOpen(false);
      setNewDebtAmount('');
      setNewDebtConcept('');
    }
  }, [isOpen]);

  if (!client) return null;

  const metadata = (client.metadata as any) || {};
  const hasDebt = localDebt > 0;
  const birthDate = metadata.birth_date;
  const calculatedAge = birthDate ? Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
  const tags: string[] = Array.isArray(metadata.tags) ? metadata.tags : [];
  const customFields: Record<string, any> = metadata.custom_fields || {};

  // Formateo inteligente de WhatsApp (Nacional e Internacional)
  const handleOpenWhatsApp = () => {
    if (!client.phone || client.phone === 'Sin teléfono') {
      toast({ variant: 'warning', title: 'Sin teléfono', description: 'Este cliente no tiene teléfono registrado.' });
      return;
    }
    let cleanNumber = client.phone.replace(/[^0-9]/g, '');
    if (cleanNumber.startsWith('0')) {
      cleanNumber = '58' + cleanNumber.slice(1);
    } else if (cleanNumber.length === 10 && (cleanNumber.startsWith('412') || cleanNumber.startsWith('414') || cleanNumber.startsWith('424') || cleanNumber.startsWith('416') || cleanNumber.startsWith('426'))) {
      cleanNumber = '58' + cleanNumber;
    }
    const text = encodeURIComponent(`Hola ${client.name}, te escribimos de atención al cliente.`);
    window.open(`https://wa.me/${cleanNumber}?text=${text}`, '_blank');
  };

  // Crear o ajustar deuda o registrar abono
  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newDebtAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ variant: 'warning', title: 'Monto inválido', description: 'Por favor ingresa un monto válido mayor a 0.' });
      return;
    }

    if (!tenantId || !actor) return;
    setIsSubmittingDebt(true);

    try {
      if (debtActionType === 'payment') {
        const res = await recordClientPaymentAction(
          tenantId,
          client.id,
          amountNum,
          actor,
          newDebtConcept.trim() || 'Abono manual a cuenta',
          paymentMethod
        );

        if (res.success && res.newDebt !== undefined) {
          setLocalDebt(res.newDebt);
          if (client.metadata) {
            (client.metadata as any).total_debt = res.newDebt;
          }
          toast({
            variant: 'success',
            title: 'Abono Registrado',
            description: `Se abonó $${amountNum.toFixed(2)} a la cuenta de ${client.name}. Nuevo saldo: $${res.newDebt.toFixed(2)}.`
          });
          setIsDebtModalOpen(false);
          setNewDebtAmount('');
          setNewDebtConcept('');
        } else {
          toast({ variant: 'error', title: 'Error', description: res.error || 'No se pudo registrar el abono.' });
        }
      } else {
        const res = await adjustCustomerDebtAction(
          tenantId,
          client.id,
          amountNum,
          newDebtConcept.trim() || 'Cargo a cuenta / servicio a crédito',
          actor
        );

        if (res.success && res.newDebt !== undefined) {
          setLocalDebt(res.newDebt);
          if (client.metadata) {
            (client.metadata as any).total_debt = res.newDebt;
          }
          toast({
            variant: 'success',
            title: 'Deuda Registrada',
            description: `Se cargó $${amountNum.toFixed(2)} a la cuenta de ${client.name}. Nuevo saldo: $${res.newDebt.toFixed(2)}.`
          });
          setIsDebtModalOpen(false);
          setNewDebtAmount('');
          setNewDebtConcept('');
        } else {
          toast({ variant: 'error', title: 'Error', description: res.error || 'No se pudo actualizar la deuda.' });
        }
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
    } finally {
      setIsSubmittingDebt(false);
    }
  };

  const handleSaveDentalChart = async (chart: DentalChart) => {
    if (!client?.id || !tenantId || !actor) return;
    setIsDentalSaving(true);
    try {
      const res = await saveDentalChartAction(client.id, chart, tenantId, actor);
      if (res.success) {
        setDentalChart(chart);
        toast({ variant: 'success', title: 'Odontograma guardado correctamente' });
      } else {
        toast({ variant: 'error', title: 'Error al guardar', description: res.error });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error al guardar', description: err?.message || 'Error inesperado' });
    } finally {
      setIsDentalSaving(false);
    }
  };

  const handleCreateKanbanFromChart = async (plan: DentalTreatmentPlan) => {
    if (!client?.id || !tenantId || !actor || isCreatingKanban) return;
    setIsCreatingKanban(true);
    try {
      const res = await createTreatmentKanbanFromChartAction(client.id, client.name || 'Paciente', plan, tenantId, actor);
      if (res.success) {
        toast({ variant: 'success', title: '🦷 Orden Kanban creada', description: 'El plan de tratamiento fue convertido en una orden de trabajo.' });
      } else {
        toast({ variant: 'error', title: 'Error al crear orden', description: res.error });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error al crear orden', description: err?.message || 'Error inesperado' });
    } finally {
      setIsCreatingKanban(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity duration-300 touch-none ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        onWheel={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />

      {/* Drawer */}
      <div 
        onWheel={(e) => e.stopPropagation()}
        className={`fixed ${
          isExpanded 
            ? 'top-1.5 bottom-1.5 right-1.5 w-[calc(100%-0.75rem)] sm:w-[98vw] max-w-[98vw] rounded-2xl' 
            : 'top-2 bottom-2 right-2 sm:top-3 sm:bottom-3 sm:right-3 w-[calc(100%-1rem)] sm:w-[94vw] md:max-w-4xl lg:max-w-5xl xl:max-w-6xl rounded-3xl'
        } bg-card border border-border shadow-2xl z-50 transition-all duration-300 ease-out flex flex-col overflow-hidden overscroll-contain ${
          isOpen ? 'translate-x-0' : 'translate-x-[120%]'
        }`}
      >
        {/* Botones Flotantes de Cabecera (Maximizar, Imprimir & Cerrar) */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-foreground rounded-full backdrop-blur-md transition-colors btn-haptic hidden sm:flex items-center justify-center"
            title={isExpanded ? 'Restaurar tamaño' : 'Maximizar pantalla completa'}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-foreground rounded-full backdrop-blur-md transition-colors btn-haptic"
            title="Imprimir Ficha / Historia Clínica"
          >
            <Printer size={16} />
          </button>
          <button 
            onClick={onClose}
            className="p-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-foreground rounded-full backdrop-blur-md transition-colors btn-haptic"
            title="Cerrar Ficha"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cabecera / Banner */}
        <div className="relative bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 p-6 pb-4 shrink-0 border-b border-border/50">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md border-2 border-card text-2xl font-black shrink-0">
              {client.name.charAt(0)}
            </div>

            <div className="min-w-0 flex-1 pr-16">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {metadata.entity_subtype === 'juridica' ? '🏢 Empresa' : '👤 Persona Natural'}
                </span>
                {client.tax_id && (
                  <span className="text-[11px] font-mono font-bold text-foreground">
                    {client.tax_id}
                  </span>
                )}
                {calculatedAge !== null && (
                  <span className="text-[10px] font-bold text-indigo-500">
                    {calculatedAge} años
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleToggleHistory}
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-black transition-all flex items-center gap-1 border btn-haptic ${
                    isHistoryEnabled
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-foreground border-transparent'
                  }`}
                  title={isHistoryEnabled ? 'Desactivar historial para este cliente' : 'Habilitar bitácora / historial para este cliente'}
                >
                  <FileText size={11} />
                  <span>{isHistoryEnabled ? 'Historial Activo' : '+ Habilitar Historial'}</span>
                </button>
              </div>

              <h3 className="text-xl font-black text-foreground mt-1 truncate">{client.name}</h3>

              {/* Tags / Etiquetas */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {tags.map((t) => (
                    <span key={t} className="px-2 py-0.2 rounded-md bg-primary/10 text-primary text-[10px] font-bold">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Acciones Rápidas Directas (1 Clic) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            {isHistoryEnabled ? (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('registros');
                  setTriggerNewRecord(Date.now());
                }}
                className="px-2.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xs btn-haptic"
              >
                <FileText size={14} />
                <span>+ Nueva Nota</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleToggleHistory}
                className="px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-border btn-haptic"
              >
                <FileText size={14} />
                <span>+ Historial</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="px-2.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-emerald-500/20 btn-haptic"
            >
              <MessageSquare size={14} />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                router.push(`/calendario?client=${client.id}`);
              }}
              className="px-2.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-indigo-500/20 btn-haptic"
            >
              <Calendar size={14} />
              <span>Agendar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                router.push(`/caja?client=${client.id}`);
              }}
              className="px-2.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-amber-500/20 btn-haptic"
            >
              <ShoppingBag size={14} />
              <span>Cobrar</span>
            </button>
          </div>
        </div>

        {/* Barra de Pestañas del Drawer (Adaptable a la demanda del cliente) */}
        <div className="flex border-b border-border bg-slate-50/50 dark:bg-slate-900/40 px-4 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('perfil')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'perfil'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-slate-400 hover:text-foreground'
            }`}
          >
            <User size={14} />
            <span>Perfil</span>
          </button>

          {isHistoryEnabled && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('registros')}
                className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'registros'
                    ? 'border-primary text-primary font-black'
                    : 'border-transparent text-slate-400 hover:text-foreground'
                }`}
              >
                <FileText size={14} />
                <span>Bitácora & Seguimiento</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('archivos')}
                className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'archivos'
                    ? 'border-primary text-primary font-black'
                    : 'border-transparent text-slate-400 hover:text-foreground'
                }`}
              >
                <ImageIcon size={14} />
                <span>Fotos & Galería</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('historial')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'historial'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-slate-400 hover:text-foreground'
            }`}
          >
            <Receipt size={14} />
            <span>Compras</span>
          </button>

          {isHistoryEnabled && isDentalModuleActive && (
            <button
              type="button"
              onClick={() => setActiveTab('odontograma')}
              className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'odontograma'
                  ? 'border-primary text-primary font-black'
                  : 'border-transparent text-slate-400 hover:text-foreground'
              }`}
            >
              <span>🦷</span>
              <span>Odontograma</span>
            </button>
          )}
        </div>

        {/* Contenido Dinámico por Pestaña */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 print:p-0">
          {activeTab === 'perfil' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {/* Columna Izquierda: Estado de Cuenta & Datos de Contacto */}
              <div className="space-y-4">
                {/* Deuda / Saldo con Botón Crear Deuda y Abonar en Caja */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estado de Cuenta</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <DollarSign size={20} className={hasDebt ? 'text-rose-400' : 'text-emerald-400'} />
                        <span className="text-2xl font-black font-mono">${localDebt.toFixed(2)}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${
                      hasDebt ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {hasDebt ? 'Deuda Pendiente' : 'Al Día'}
                    </span>
                  </div>

                  {/* Acciones de Cuenta por Cobrar */}
                  <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setIsDebtModalOpen(!isDebtModalOpen)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 btn-haptic"
                    >
                      <PlusCircle size={14} />
                      <span>Registrar Cargo / Deuda</span>
                    </button>

                    {hasDebt && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          router.push(`/caja?client=${client.id}&amount=${localDebt}&desc=${encodeURIComponent('Abono a Cuenta - ' + client.name)}`);
                        }}
                        className="py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 btn-haptic shadow-xs"
                      >
                        <CreditCard size={14} />
                        <span>Liquidar en Caja</span>
                      </button>
                    )}
                  </div>

                  {/* Formulario desplegable para Registrar Deuda o Abono */}
                  {isDebtModalOpen && (
                    <form onSubmit={handleCreateDebt} className="p-3 bg-white/5 border border-white/15 rounded-xl space-y-2 animate-in fade-in">
                      <div className="flex items-center gap-1 p-0.5 bg-black/30 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setDebtActionType('charge')}
                          className={`flex-1 py-1 text-[11px] font-bold rounded-md transition-all ${
                            debtActionType === 'charge' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          + Cargo a Deuda
                        </button>
                        <button
                          type="button"
                          onClick={() => setDebtActionType('payment')}
                          className={`flex-1 py-1 text-[11px] font-bold rounded-md transition-all ${
                            debtActionType === 'payment' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          - Registrar Abono
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          placeholder="Monto $ USD"
                          value={newDebtAmount}
                          onChange={(e) => setNewDebtAmount(e.target.value)}
                          className="bg-slate-900 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-hidden"
                        />
                        <input
                          type="text"
                          placeholder={debtActionType === 'charge' ? 'Concepto (ej. Tratamiento)' : 'Concepto (ej. Abono en efectivo)'}
                          value={newDebtConcept}
                          onChange={(e) => setNewDebtConcept(e.target.value)}
                          className="bg-slate-900 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden"
                        />
                      </div>

                      {debtActionType === 'payment' && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-bold">Método:</span>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="bg-slate-900 border border-white/20 rounded-lg px-2 py-1 text-xs text-white focus:outline-hidden flex-1"
                          >
                            <option value="cash">Efectivo (Caja)</option>
                            <option value="transfer">Transferencia Bancaria</option>
                            <option value="pago_movil">Pago Móvil</option>
                            <option value="card">Tarjeta / POS</option>
                            <option value="zelle">Zelle</option>
                          </select>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsDebtModalOpen(false)}
                          className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white text-xs"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingDebt}
                          className={`px-3 py-1 rounded-lg text-white text-xs font-bold disabled:opacity-50 btn-haptic ${
                            debtActionType === 'charge' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'
                          }`}
                        >
                          {isSubmittingDebt ? 'Guardando...' : debtActionType === 'charge' ? 'Cargar Saldo' : 'Registrar Abono'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Información de Contacto */}
                <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 border border-border space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Datos de Contacto</h4>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Phone size={14} className="text-slate-400 shrink-0" />
                      <span className="font-bold text-foreground">{client.phone || 'Sin teléfono registrado'}</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Mail size={14} className="text-slate-400 shrink-0" />
                      <span className="text-foreground">{client.email || 'Sin correo registrado'}</span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-foreground">{client.address || 'Sin dirección registrada'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Notas, Especialidad & Slots */}
              <div className="space-y-4">
                {/* Notas Internas / Alergias */}
                {metadata.notes && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-1">
                    <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider block">
                      ⚠️ Notas Internas / Alergias
                    </span>
                    <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                      {metadata.notes}
                    </p>
                  </div>
                )}

                {/* Campos Personalizados de la Industria */}
                {customSchema.length > 0 && Object.keys(customFields).length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 border border-border space-y-2.5">
                    <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles size={12} />
                      <span>Datos de Especialidad</span>
                    </h4>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {customSchema.map((field) => {
                        const val = customFields[field.field_key];
                        if (val === undefined || val === null || val === '') return null;
                        return (
                          <div key={field.field_key} className="p-2 rounded-xl bg-card border border-border/60">
                            <span className="text-[10px] text-slate-400 font-bold block">{field.field_label}</span>
                            <span className="text-xs font-black text-foreground block truncate">
                              {typeof val === 'boolean' ? (val ? 'Sí' : 'No') : String(val)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <UISlot name="crm.client_drawer.financial_stats" context={{ client }} />
              </div>
            </div>
          )}

          {activeTab === 'registros' && tenantId && actor && (
            <ClientRecordsTab
              entityId={client.id}
              tenantId={tenantId}
              actor={actor}
              clientName={client.name}
              triggerNewRecord={triggerNewRecord}
            />
          )}

          {activeTab === 'archivos' && tenantId && actor && (
            <ClientAttachmentsTab
              entityId={client.id}
              tenantId={tenantId}
              actor={actor}
              clientName={client.name}
            />
          )}

          {activeTab === 'historial' && tenantId && actor && (
            <ClientHistoryTab
              entityId={client.id}
              tenantId={tenantId}
              actor={actor}
              clientName={client.name}
            />
          )}

          {activeTab === 'odontograma' && isDentalModuleActive && (
            <div className="p-4">
              {isDentalLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <Odontogram
                  entityId={client!.id}
                  entityName={client?.name || 'Paciente'}
                  initialChart={dentalChart}
                  onSave={handleSaveDentalChart}
                  onCreateKanban={handleCreateKanbanFromChart}
                  isSaving={isDentalSaving}
                  isCreatingKanban={isCreatingKanban}
                />
              )}
            </div>
          )}
        </div>

        {/* Pie: Editar / Eliminar */}
        <div className="p-4 border-t border-border bg-slate-50 dark:bg-slate-900/40 flex items-center gap-2 shrink-0">
          <button 
            type="button"
            onClick={() => onEdit?.(client)}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 btn-haptic shadow-xs"
          >
            <Edit3 size={15} />
            <span>Editar Datos</span>
          </button>

          {confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onDelete?.(client.id);
                  onClose();
                  setConfirmDelete(false);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-2.5 rounded-xl font-bold text-xs transition-colors btn-haptic"
              >
                Confirmar Borrar
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-2.5 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs btn-haptic"
              >
                ✕
              </button>
            </div>
          ) : (
            <button 
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="p-2.5 rounded-xl border border-rose-500/20 text-rose-600 hover:bg-rose-500/10 transition-colors"
              title="Eliminar contacto"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
