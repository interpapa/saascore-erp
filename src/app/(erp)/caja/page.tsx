'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useERPStore } from '@/store/useERPStore';
import { processSecureCheckout } from '@/app/actions/checkout';
import { getItemsAction } from '@/app/actions/items';
import { getEntitiesAction, createEntityAction } from '@/app/actions/entities';
import { createDocumentAction, getDocumentsAction, updateDocumentStatusAction } from '@/app/actions/documents';
import { getCashSessionStatusAction, CashSession } from '@/app/actions/cashRegister';
import { getBankAccountsAction, createBankAccountAction, BankAccount } from '@/app/actions/bankAccounts';
import { getExchangeRateAction, updateExchangeRateAction, syncLiveBCVRateAction } from '@/app/actions/currency';
import { CashRegisterModal } from '@/components/caja/CashRegisterModal';
import { CustomerHistoryModal } from '@/components/caja/CustomerHistoryModal';
import { ReceiptModal, SaleReceiptData } from '@/components/caja/ReceiptModal';
import { CashMovementModal } from '@/components/caja/CashMovementModal';
import { HeldTicketsModal } from '@/components/caja/HeldTicketsModal';
import { PendingDentalOrdersModal } from '@/components/caja/PendingDentalOrdersModal';
import { QuickStockModal } from '@/components/ui/QuickStockModal';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useViewModeStore } from '@/store/useViewModeStore';
import { FastTenderBottomSheet } from '@/components/caja/FastTenderBottomSheet';
import { 
  Search, 
  ShoppingCart, 
  ShoppingBag, 
  User, 
  Plus, 
  Minus, 
  Trash2, 
  Wallet, 
  FileText, 
  CheckCircle2, 
  PackagePlus, 
  Landmark, 
  Copy, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight, 
  Truck, 
  LayoutGrid, 
  List, 
  Receipt, 
  ShieldCheck, 
  Coins,
  History,
  Edit3,
  Smartphone,
  CreditCard,
  RefreshCw,
  Pause,
  Play,
  ArrowDownUp,
  Clock,
  CalendarDays
} from 'lucide-react';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useActionActor } from '@/hooks/useActionActor';
import { useToast } from '@/components/core/ToastProvider';
import { EmptyState } from '@/components/core/EmptyState';
import { isModuleActive } from '@/lib/core/kernel/moduleRegistry';

interface HeldTicket {
  id: string;
  timestamp: string;
  customer: string;
  customerName: string;
  lines: { item: any; quantity: number }[];
  docType: 'delivery_order' | 'fiscal_invoice';
  paymentMethod: 'cash_usd' | 'cash_ves' | 'pago_movil' | 'card' | 'transfer' | 'zelle' | 'mixed' | 'credit';
  totalUSD: number;
  totalVES: number;
}

function CajaPageContent() {
  const currentTenant = useTenantResolver();
  const searchParams = useSearchParams();
  const session = useERPStore((s) => s.session);
  const { toast } = useToast();
  const actor = useActionActor();
  const globalViewMode = useViewModeStore((s) => s.viewMode);
  const [isFastTenderOpen, setIsFastTenderOpen] = useState(false);

  const clientParam = searchParams.get('client') || searchParams.get('client_id');
  const appointmentIdParam = searchParams.get('appointment_id');
  const serviceIdParam = searchParams.get('service_id');
  const priceParam = searchParams.get('price') || searchParams.get('amount');
  const titleParam = searchParams.get('title') || searchParams.get('desc');

  // Estado de Cita Vinculada (si proviene del Calendario)
  const [linkedAppointmentId, setLinkedAppointmentId] = useState<string | null>(appointmentIdParam || null);

  // Módulos habilitados para este tenant (Desacoplamiento Modular Total)
  const tenantModules = (currentTenant?.active_modules && currentTenant.active_modules.length > 0)
    ? currentTenant.active_modules
    : ((currentTenant?.metadata as any)?.active_modules && Array.isArray((currentTenant?.metadata as any).active_modules) && (currentTenant?.metadata as any).active_modules.length > 0)
      ? (currentTenant?.metadata as any).active_modules
      : null;
  const isInventoryEnabled = isModuleActive(tenantModules, 'inventario');
  const isCRMEnabled = isModuleActive(tenantModules, 'clientes');

  // Estado para Cobro Rápido / Concepto Libre (permite a Caja operar 100% sin inventario)
  const [quickConcept, setQuickConcept] = useState('Consumo General');
  const [quickAmountUSD, setQuickAmountUSD] = useState('');

  // Estado de Datos Maestros
  const [items, setItems] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashSessionStatus, setCashSessionStatus] = useState<CashSession | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Tasa de Cambio (BCV / VES)
  const [exchangeRate, setExchangeRate] = useState({
    rate: 36.5,
    symbol: 'Bs.',
    currency: 'VES',
    source: 'BCV'
  });
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [rateInput, setRateInput] = useState('36.50');
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);
  const [isSyncingBCV, setIsSyncingBCV] = useState(false);

  // Filtros y Búsqueda
  const [searchItem, setSearchItem] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'product' | 'service'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Ticket & Checkout
  const [ticketLines, setTicketLines] = useState<{ item: any; quantity: number }[]>([]);
  const [editingPriceItemId, setEditingPriceItemId] = useState<string | null>(null);
  const [tempPriceValue, setTempPriceValue] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>(clientParam || 'generic_counter_customer');
  const [docType, setDocType] = useState<'delivery_order' | 'fiscal_invoice'>('delivery_order');
  const [paymentMethod, setPaymentMethod] = useState<'cash_usd' | 'cash_ves' | 'pago_movil' | 'card' | 'transfer' | 'zelle' | 'mixed' | 'credit'>('cash_usd');
  
  // Calculadoras de Efectivo
  const [cashTenderedUSD, setCashTenderedUSD] = useState<string>('');
  const [cashTenderedVES, setCashTenderedVES] = useState<string>('');
  
  const [mixedPayments, setMixedPayments] = useState({ cash: 0, card: 0, transfer: 0 });
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');

  // Acordeón de Entrega / Despacho Opcional
  const [showDeliveryAccordion, setShowDeliveryAccordion] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryContact, setDeliveryContact] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');

  // Modales
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [saleReceiptData, setSaleReceiptData] = useState<SaleReceiptData | null>(null);
  const [heldTickets, setHeldTickets] = useState<HeldTicket[]>([]);
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);

  // Consultas Odontológicas Pendientes de Cobro (Despachadas desde Sillón)
  const [pendingDentalOrders, setPendingDentalOrders] = useState<any[]>([]);
  const [linkedDentalDocId, setLinkedDentalDocId] = useState<string | null>(null);
  const [isDentalOrdersModalOpen, setIsDentalOrdersModalOpen] = useState(false);

  // Formulario Nuevo Cliente Rápido
  const [docPrefix, setDocPrefix] = useState<'V' | 'J' | 'E' | 'G'>('V');
  const [docNumber, setDocNumber] = useState('');
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', address: '' });
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  // Formulario Nueva Cuenta Bancaria
  const [newAccount, setNewAccount] = useState({
    bank_name: '',
    account_type: 'corriente',
    account_number: '',
    holder_name: '',
    tax_id: '',
    phone: '',
    email: '',
    notes: '',
  });
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  // Carga de Carrito desde LocalStorage
  const isCartLoadedRef = useRef(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('Rendo_pos_cart');
      if (stored) {
        setTicketLines(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading cart', e);
    } finally {
      isCartLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!isCartLoadedRef.current) return;
    localStorage.setItem('Rendo_pos_cart', JSON.stringify(ticketLines));
  }, [ticketLines]);

  // Carga de Tickets en Espera desde LocalStorage
  const isHeldLoadedRef = useRef(false);
  useEffect(() => {
    try {
      const storedHeld = localStorage.getItem('Rendo_pos_held_tickets');
      if (storedHeld) {
        setHeldTickets(JSON.parse(storedHeld));
      }
    } catch (e) {
      console.error('Error loading held tickets', e);
    } finally {
      isHeldLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!isHeldLoadedRef.current) return;
    localStorage.setItem('Rendo_pos_held_tickets', JSON.stringify(heldTickets));
  }, [heldTickets]);

  // Sincronizar cliente si viene por parámetro
  useEffect(() => {
    if (clientParam) {
      setSelectedCustomer(clientParam);
    }
  }, [clientParam]);

  // Inyección de Servicio desde Citas / Calendario
  const hasInjectedAppointmentRef = useRef(false);
  useEffect(() => {
    if (hasInjectedAppointmentRef.current) return;

    if (appointmentIdParam || (priceParam && titleParam)) {
      hasInjectedAppointmentRef.current = true;
      const amt = Number(priceParam) || 0;
      const rawTitle = titleParam || 'Servicio de Cita';
      let title = rawTitle;
      try {
        title = decodeURIComponent(rawTitle);
      } catch {
        title = rawTitle;
      }

      const itemId = serviceIdParam || (appointmentIdParam ? `appt-${appointmentIdParam}` : `custom-${title.replace(/\s+/g, '-').toLowerCase()}`);

      setTicketLines((prev) => {
        if (prev.some((l) => l.item.id === itemId)) return prev;
        const syntheticItem = {
          id: itemId,
          name: title,
          base_price: amt,
          type: 'service',
          category: 'Citas',
        };
        return [...prev, { item: syntheticItem, quantity: 1 }];
      });

      if (appointmentIdParam) {
        setLinkedAppointmentId(appointmentIdParam);
        toast({
          variant: 'success',
          title: 'Cita Vinculada al Ticket',
          description: `"${title}" precargado. Puedes cobrarlo o agregar productos/servicios adicionales.`
        });
      }
    }
  }, [appointmentIdParam, serviceIdParam, priceParam, titleParam, toast]);

  // Cargar Datos del Servidor (Respetando los módulos activos)
  const loadInitialData = async () => {
    if (!currentTenant?.id || !actor) return;
    try {
      setLoadingData(true);
      const [itemsRes, customersRes, cashRes, bankRes, rateRes] = await Promise.all([
        isInventoryEnabled ? getItemsAction(currentTenant.id, undefined, 250, actor) : Promise.resolve({ success: true, items: [] }),
        isCRMEnabled ? getEntitiesAction(currentTenant.id, 'customer', 250, actor) : Promise.resolve({ success: true, entities: [] }),
        getCashSessionStatusAction(currentTenant.id, actor),
        getBankAccountsAction(currentTenant.id, actor),
        getExchangeRateAction(currentTenant.id),
      ]);

      if (itemsRes?.success) setItems(itemsRes.items || []);
      if (customersRes?.success) setCustomers(customersRes.entities || []);
      if (cashRes?.success) setCashSessionStatus(cashRes.session || null);
      if (bankRes?.success && bankRes.accounts?.length) {
        setBankAccounts(bankRes.accounts);
        setSelectedBankAccountId(bankRes.accounts[0].id);
      }
      if (rateRes?.success && rateRes.rateData) {
        setExchangeRate({
          rate: rateRes.rateData.rate || 36.5,
          symbol: rateRes.rateData.symbol || 'Bs.',
          currency: rateRes.rateData.currency || 'VES',
          source: rateRes.rateData.source || 'BCV'
        });
        setRateInput((rateRes.rateData.rate || 36.5).toFixed(2));
      }

      // Cargar órdenes de consulta dental pendientes de cobro
      try {
        const dentalDocsRes = await getDocumentsAction(currentTenant.id, 'quote', 20, actor);
        if (dentalDocsRes?.success && dentalDocsRes.documents) {
          const pending = dentalDocsRes.documents.filter((d: any) =>
            (d.status === 'draft' || d.status === 'pending') &&
            (d.metadata?.payment_status === 'pending_cashier' || d.metadata?.source === 'dental_consultation')
          );
          setPendingDentalOrders(pending);
        }
      } catch (dErr) {
        console.error('Error buscando órdenes dentales:', dErr);
      }
    } catch (err) {
      console.error('Error cargando POS:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadPendingDentalOrders = useCallback(async () => {
    if (!currentTenant?.id || !actor) return;
    try {
      const res = await getDocumentsAction(currentTenant.id, 'quote', 20, actor);
      if (res?.success && res.documents) {
        const pending = res.documents.filter((d: any) =>
          (d.status === 'draft' || d.status === 'pending') &&
          (d.metadata?.payment_status === 'pending_cashier' || d.metadata?.source === 'dental_consultation')
        );
        setPendingDentalOrders(pending);
      }
    } catch (err) {
      console.error('Error cargando órdenes dentales:', err);
    }
  }, [currentTenant?.id, actor]);

  const handleLoadDentalOrder = (order: any) => {
    const meta = order.metadata || {};
    const items = meta.items || [];
    const customerId = order.entity_id || order.entity?.id;

    if (items.length > 0) {
      const lines = items.map((it: any) => ({
        item: {
          id: it.id || `dental-${it.toothNum}-${(it.procedureName || 'tx').replace(/\s+/g, '-').toLowerCase()}`,
          name: `${it.procedureName} (Pieza ${it.toothNum})`,
          base_price: Number(it.cost || 0),
          type: 'service',
          category: 'Odontología',
        },
        quantity: 1,
      }));
      setTicketLines(lines);
    } else if (order.total_amount > 0) {
      setTicketLines([
        {
          item: {
            id: `dental-order-${order.id}`,
            name: meta.title || `Consulta Odontológica #${order.document_number}`,
            base_price: Number(order.total_amount),
            type: 'service',
            category: 'Odontología',
          },
          quantity: 1,
        },
      ]);
    }

    if (customerId) {
      setSelectedCustomer(customerId);
    }

    setLinkedDentalDocId(order.id);
    setIsDentalOrdersModalOpen(false);

    toast({
      variant: 'success',
      title: 'Consulta Dental Cargada',
      description: `Orden #${order.document_number} cargada en caja. Procede a registrar el cobro.`,
    });
  };

  useEffect(() => {
    loadInitialData();
  }, [currentTenant?.id, actor]);

  // Guardar Tasa de Cambio
  const handleUpdateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !actor) return;
    const num = parseFloat(rateInput);
    if (isNaN(num) || num <= 0) {
      toast({ variant: 'warning', title: 'Tasa Inválida', description: 'Ingresa un valor positivo para la tasa.' });
      return;
    }

    setIsUpdatingRate(true);
    try {
      const res = await updateExchangeRateAction(currentTenant.id, num, 'BCV', actor);
      if (res.success && res.rateData) {
        setExchangeRate({
          rate: res.rateData.rate,
          symbol: res.rateData.symbol,
          currency: res.rateData.currency,
          source: res.rateData.source
        });
        setIsRateModalOpen(false);
        toast({ 
          variant: 'success', 
          title: 'Tasa Actualizada', 
          description: `Nueva tasa oficial fijada en Bs. ${res.rateData.rate.toFixed(2)}` 
        });
      } else {
        toast({ variant: 'error', title: 'Error', description: res.error || 'No se pudo actualizar la tasa.' });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
    } finally {
      setIsUpdatingRate(false);
    }
  };

  // Sincronizar Tasa Oficial en Vivo del BCV
  const handleSyncBCV = async () => {
    if (!currentTenant || !actor) return;
    setIsSyncingBCV(true);
    try {
      const res = await syncLiveBCVRateAction(currentTenant.id, actor);
      if (res.success && res.rateData) {
        setExchangeRate({
          rate: res.rateData.rate,
          symbol: res.rateData.symbol,
          currency: res.rateData.currency,
          source: res.rateData.source
        });
        setRateInput(res.rateData.rate.toFixed(2));
        toast({
          variant: 'success',
          title: 'Tasa BCV en Vivo Sincronizada',
          description: `Tasa oficial del día fijada en Bs. ${res.rateData.rate.toFixed(2)}`
        });
      } else {
        toast({ variant: 'error', title: 'Error al Sincronizar', description: res.error || 'No se pudo obtener la tasa oficial.' });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
    } finally {
      setIsSyncingBCV(false);
    }
  };

  // Categorías Dinámicas con Contadores
  const dynamicCategories = useMemo(() => {
    const cats = Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[];
    return cats;
  }, [items]);

  // Ítems Filtrados
  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      const q = searchItem.toLowerCase().trim();
      const matchesSearch = !q ||
        i.name?.toLowerCase().includes(q) ||
        i.sku?.toLowerCase().includes(q) ||
        i.barcode?.toLowerCase().includes(q);

      const matchesType = filterType === 'all' ? true : i.type === filterType;
      const matchesCategory = filterCategory === 'all' ? true : i.category === filterCategory;
      return matchesSearch && matchesType && matchesCategory;
    });
  }, [items, searchItem, filterType, filterCategory]);

  // Soporte Lector de Código de Barras: Si el usuario presiona Enter y hay un match exacto
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchItem.trim()) {
      const exactMatch = items.find(
        (i) =>
          i.sku?.toLowerCase() === searchItem.toLowerCase().trim() ||
          i.barcode?.toLowerCase() === searchItem.toLowerCase().trim() ||
          i.name?.toLowerCase() === searchItem.toLowerCase().trim()
      );
      if (exactMatch) {
        addLine(exactMatch);
        setSearchItem('');
        toast({ variant: 'success', title: 'Producto Agregado', description: `${exactMatch.name} añadido al ticket.` });
      }
    }
  };

  // Operaciones del Carrito
  const addLine = (item: any) => {
    const existing = ticketLines.find((l) => l.item.id === item.id);
    if (item.type === 'product') {
      const stockVal = item.stock ?? item.stock_quantity ?? 0;
      const currentQty = existing ? existing.quantity : 0;
      if (currentQty >= stockVal) {
        toast({ variant: 'warning', title: 'Sin Stock', description: `No hay más stock disponible para ${item.name}` });
        return;
      }
    }
    if (existing) {
      setTicketLines(
        ticketLines.map((l) => (l.item.id === item.id ? { ...l, quantity: l.quantity + 1 } : l))
      );
    } else {
      setTicketLines([...ticketLines, { item, quantity: 1 }]);
    }
  };

  // Cobro Rápido / Concepto Libre (Autonomía total sin inventario)
  const handleAddQuickLine = (concept?: string, amount?: number) => {
    const finalConcept = (concept || quickConcept).trim() || 'Venta Libre';
    const finalAmount = amount !== undefined ? amount : parseFloat(quickAmountUSD);
    if (!finalAmount || isNaN(finalAmount) || finalAmount <= 0) {
      toast({
        variant: 'warning',
        title: 'Monto Requerido',
        description: 'Ingresa un monto válido mayor a 0 para agregar al ticket.',
      });
      return;
    }

    const customId = 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    const customItem = {
      id: customId,
      name: finalConcept,
      base_price: finalAmount,
      type: 'service',
      category: 'Cobro Libre',
    };

    setTicketLines((prev) => [...prev, { item: customItem, quantity: 1 }]);
    setQuickAmountUSD('');
    toast({
      variant: 'success',
      title: 'Línea Agregada',
      description: `"${finalConcept}" ($${finalAmount.toFixed(2)}) añadido al ticket.`,
    });
  };

  const removeLine = (itemId: string) => {
    const updated = ticketLines.filter((l) => l.item.id !== itemId);
    setTicketLines(updated);
    if (updated.length === 0) {
      setLinkedAppointmentId(null);
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setTicketLines(
      ticketLines
        .map((l) => {
          if (l.item.id === itemId) {
            const newQ = l.quantity + delta;
            if (newQ <= 0) return null;
            if (l.item.type === 'product') {
              const stockVal = l.item.stock ?? l.item.stock_quantity ?? 0;
              if (newQ > stockVal) {
                toast({ variant: 'warning', title: 'Sin Stock', description: `Stock máximo disponible: ${stockVal}` });
                return l;
              }
            }
            return { ...l, quantity: newQ };
          }
          return l;
        })
        .filter(Boolean) as { item: any; quantity: number }[]
    );
  };

  const setExactQuantity = (itemId: string, exactQty: number) => {
    if (exactQty <= 0) {
      removeLine(itemId);
      return;
    }
    setTicketLines((prev) =>
      prev.map((l) => {
        if (l.item.id === itemId) {
          if (l.item.type === 'product') {
            const stockVal = l.item.stock ?? l.item.stock_quantity ?? 0;
            if (stockVal > 0 && exactQty > stockVal) {
              toast({ variant: 'warning', title: 'Stock Limitado', description: `Solo hay ${stockVal} unidades disponibles.` });
              return { ...l, quantity: stockVal };
            }
          }
          return { ...l, quantity: exactQty };
        }
        return l;
      })
    );
  };

  const handleSaveLinePrice = (itemId: string) => {
    const numPrice = parseFloat(tempPriceValue);
    if (isNaN(numPrice) || numPrice < 0) {
      toast({ variant: 'warning', title: 'Precio Inválido', description: 'Ingresa un precio mayor o igual a 0.' });
      return;
    }
    setTicketLines((prev) =>
      prev.map((l) => {
        if (l.item.id === itemId) {
          const originalPrice = l.item._originalPrice ?? l.item.base_price ?? 0;
          return {
            ...l,
            item: {
              ...l.item,
              _originalPrice: originalPrice,
              base_price: numPrice,
            },
          };
        }
        return l;
      })
    );
    setEditingPriceItemId(null);
    toast({ variant: 'success', title: 'Precio Actualizado', description: `Precio unitario fijado en $${numPrice.toFixed(2)} USD` });
  };

  const clearCart = () => {
    setTicketLines([]);
    setCashTenderedUSD('');
    setCashTenderedVES('');
    setLinkedAppointmentId(null);
  };

  // Cálculos Financieros Bimoneda (USD y VES)
  const chargeTaxes = docType === 'fiscal_invoice';
  const taxRate = typeof currentTenant?.metadata?.tax_rate === 'number'
    ? currentTenant.metadata.tax_rate / 100
    : 0.16; // 16% por defecto si no está fijado

  const subtotal = useMemo(() => {
    return ticketLines.reduce((acc, l) => acc + (l.item.base_price || 0) * l.quantity, 0);
  }, [ticketLines]);

  const taxAmount = chargeTaxes ? Math.round(subtotal * taxRate * 100) / 100 : 0;
  const total = subtotal + taxAmount;

  // Conversiones a Bolívares
  const currentRate = exchangeRate.rate || 36.5;
  const subtotalVES = subtotal * currentRate;
  const taxAmountVES = taxAmount * currentRate;
  const totalVES = total * currentRate;

  // Calculadora de Vuelto para Efectivo USD ($)
  const numericCashUSD = parseFloat(cashTenderedUSD) || 0;
  const changeDueUSD = numericCashUSD > total ? Math.round((numericCashUSD - total) * 100) / 100 : 0;
  const changeDueUSD_in_VES = changeDueUSD * currentRate;

  // Calculadora de Vuelto para Efectivo Bolívares (Bs)
  const numericCashVES = parseFloat(cashTenderedVES) || 0;
  const changeDueVES = numericCashVES > totalVES ? Math.round((numericCashVES - totalVES) * 100) / 100 : 0;
  const changeDueVES_in_USD = currentRate > 0 ? changeDueVES / currentRate : 0;

  // Validación de Pago Mixto
  const remainingToAssign = total - (mixedPayments.cash + mixedPayments.card + mixedPayments.transfer);

  // Copiar datos bancarios al portapapeles
  const copyBankData = (acc: BankAccount) => {
    const text = `🏦 ${acc.bank_name}\n💳 Cuenta: ${acc.account_number}\n👤 Titular: ${acc.holder_name}${acc.tax_id ? `\n🆔 Cédula/RIF: ${acc.tax_id}` : ''}${acc.phone ? `\n📱 Pago Móvil: ${acc.phone}` : ''}${acc.email ? `\n✉️ Zelle: ${acc.email}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopiedBankId(acc.id);
    setTimeout(() => setCopiedBankId(null), 2000);
    toast({ variant: 'success', title: 'Datos Copiados', description: 'Datos bancarios copiados al portapapeles.' });
  };

  // Guardar nueva cuenta bancaria
  const handleSaveBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !actor) return;
    setIsSavingAccount(true);
    try {
      const res = await createBankAccountAction(newAccount, currentTenant.id, actor);
      if (res.success && res.account) {
        toast({ variant: 'success', title: 'Cuenta Registrada', description: 'La cuenta bancaria está lista para usarse.' });
        setBankAccounts([res.account, ...bankAccounts]);
        setSelectedBankAccountId(res.account.id);
        setIsBankModalOpen(false);
        setNewAccount({
          bank_name: '',
          account_type: 'corriente',
          account_number: '',
          holder_name: '',
          tax_id: '',
          phone: '',
          email: '',
          notes: '',
        });
      } else {
        toast({ variant: 'error', title: 'Error', description: res.error || 'No se pudo guardar la cuenta.' });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error', description: (err as Error).message });
    } finally {
      setIsSavingAccount(false);
    }
  };

  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomer);

  // Gestión de Tickets en Espera (Park / Hold Cart)
  const holdCurrentTicket = () => {
    if (ticketLines.length === 0) {
      toast({ variant: 'warning', title: 'Ticket Vacío', description: 'No hay productos en el ticket para pausar.' });
      return;
    }
    const newHeld: HeldTicket = {
      id: 'held-' + Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customer: selectedCustomer,
      customerName: selectedCustomerObj?.name || 'Cliente de Mostrador',
      lines: [...ticketLines],
      docType,
      paymentMethod,
      totalUSD: total,
      totalVES: totalVES,
    };
    setHeldTickets((prev) => [newHeld, ...prev]);
    clearCart();
    toast({
      variant: 'info',
      title: 'Ticket en Espera',
      description: `Ticket con ${newHeld.lines.reduce((acc, l) => acc + l.quantity, 0)} producto(s) guardado. Mostrador libre.`,
    });
  };

  const resumeHeldTicket = (ticket: HeldTicket) => {
    if (ticketLines.length > 0) {
      const swapTicket: HeldTicket = {
        id: 'held-' + Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        customer: selectedCustomer,
        customerName: selectedCustomerObj?.name || 'Cliente de Mostrador',
        lines: [...ticketLines],
        docType,
        paymentMethod,
        totalUSD: total,
        totalVES: totalVES,
      };
      setHeldTickets((prev) => [swapTicket, ...prev.filter((t) => t.id !== ticket.id)]);
      toast({
        variant: 'info',
        title: 'Ticket Activo Pausado',
        description: 'La venta anterior se envió a espera para recuperar esta.',
      });
    } else {
      setHeldTickets((prev) => prev.filter((t) => t.id !== ticket.id));
    }

    setTicketLines(ticket.lines);
    setSelectedCustomer(ticket.customer);
    setDocType(ticket.docType);
    setPaymentMethod(ticket.paymentMethod);
    setIsHeldModalOpen(false);
    toast({
      variant: 'success',
      title: 'Ticket Recuperado',
      description: `Listo para cobrar a ${ticket.customerName}.`,
    });
  };

  const discardHeldTicket = (ticketId: string) => {
    setHeldTickets((prev) => prev.filter((t) => t.id !== ticketId));
    toast({
      variant: 'info',
      title: 'Ticket Descartado',
      description: 'El ticket en espera ha sido eliminado.',
    });
  };

  // Procesar Checkout (Cobro)
  const handleCharge = async (status: 'draft' | 'invoiced') => {
    if (!currentTenant) {
      toast({ variant: 'error', title: 'Empresa no seleccionada', description: 'Debes seleccionar una empresa activa.' });
      return;
    }
    if (ticketLines.length === 0) {
      toast({ variant: 'warning', title: 'Ticket Vacío', description: 'Agrega al menos un ítem al ticket para cobrar.' });
      return;
    }

    setIsSaving(true);
    try {
      const customerId = (selectedCustomer === 'generic_counter_customer' || selectedCustomer === currentTenant.id) ? undefined : selectedCustomer;
      const effectiveActor = actor || {
        email: session?.userEmail || 'admin@rendo.com',
        role: session?.role || ('owner' as const),
        token: session?.token,
      };

      if (paymentMethod === 'credit' && selectedCustomer === 'generic_counter_customer') {
        toast({
          variant: 'warning',
          title: 'Cliente Requerido para Crédito',
          description: 'Debes seleccionar un cliente registrado en el CRM para registrar la cuenta por cobrar.',
        });
        setIsCustomerModalOpen(true);
        setIsSaving(false);
        return;
      }

      if (paymentMethod === 'mixed' && Math.abs(remainingToAssign) > 0.02) {
        toast({ variant: 'warning', title: 'Pago Incompleto', description: 'El desglose de pago mixto debe sumar el total exacto.' });
        setIsSaving(false);
        return;
      }

      const paymentBreakdown = paymentMethod === 'mixed' ? [
        ...(mixedPayments.cash > 0 ? [{ method: 'cash' as const, amount: mixedPayments.cash }] : []),
        ...(mixedPayments.card > 0 ? [{ method: 'card' as const, amount: mixedPayments.card }] : []),
        ...(mixedPayments.transfer > 0 ? [{ method: 'transfer' as const, amount: mixedPayments.transfer }] : []),
      ] : undefined;

      const deliveryPayload = showDeliveryAccordion && deliveryAddress ? {
        address: deliveryAddress,
        date: deliveryDate,
        contact: deliveryContact,
        phone: deliveryPhone,
      } : null;

      if (status === 'draft') {
        const res = await createDocumentAction(
          {
            entity_id: customerId,
            type: 'quote',
            status: 'draft',
            document_number: `COT-${Date.now().toString().slice(-6)}`,
            issue_date: new Date().toISOString(),
            due_date: null,
            notes: null,
            metadata: {
              doc_subtype: docType,
              charge_taxes: chargeTaxes,
              payment_method: paymentMethod,
              payments: paymentBreakdown,
              deposit_account_id: selectedBankAccountId,
              delivery: deliveryPayload,
              exchange_rate: currentRate,
              total_local: totalVES
            },
            lines: ticketLines.map((l) => ({
              item_id: l.item.id,
              description: l.item.name,
              quantity: l.quantity,
              unit_price: l.item.base_price || 0,
              tax_amount: chargeTaxes ? (l.item.base_price || 0) * taxRate : 0,
            })),
          },
          currentTenant.id,
          effectiveActor
        );

        if (!res.success) throw new Error(res.error);
        toast({ variant: 'success', title: 'Cotización Guardada', description: 'El presupuesto ha sido registrado.' });

        const quoteReceipt: SaleReceiptData = {
          documentNumber: (res as any).document?.document_number || `COT-${Date.now().toString().slice(-6)}`,
          docLabel: 'Presupuesto / Cotización',
          docSubtype: docType,
          createdAt: new Date().toISOString(),
          customerName: selectedCustomerObj?.name || 'Cliente de Mostrador',
          customerTaxId: selectedCustomerObj?.tax_id,
          customerPhone: selectedCustomerObj?.phone,
          companyName: currentTenant.name,
          companyTaxId: (currentTenant.metadata?.tax_id as string) || (currentTenant.metadata?.rif as string) || undefined,
          companyAddress: (currentTenant.metadata?.address as string) || undefined,
          companyPhone: (currentTenant.metadata?.phone as string) || undefined,
          items: ticketLines.map((l) => ({
            description: l.item.name,
            quantity: l.quantity,
            unitPrice: l.item.base_price || 0,
            total: (l.item.base_price || 0) * l.quantity,
          })),
          subtotal: subtotal,
          taxAmount: taxAmount,
          total: total,
          totalVES: totalVES,
          rate: currentRate,
          paymentMethod: paymentMethod,
          cashier: actor?.email?.split('@')[0] || session?.userEmail?.split('@')[0] || 'Cajero',
        };
        setSaleReceiptData(quoteReceipt);
        setIsReceiptModalOpen(true);
      } else {
        // Cobro Firme / Facturación
        const cartPayload = ticketLines.map((l) => ({
          itemId: l.item.id,
          quantity: l.quantity,
          name: l.item.name,
          price: l.item.base_price,
          type: (l.item.type as 'product' | 'service') || 'product',
        }));

        const result = await processSecureCheckout(
          cartPayload,
          customerId,
          paymentMethod,
          currentTenant.id,
          effectiveActor,
          'VE',
          undefined,
          chargeTaxes,
          paymentBreakdown,
          linkedAppointmentId || undefined
        );

        if (!result.success) throw new Error(result.error);

        const docLabel = docType === 'fiscal_invoice' ? 'Factura Fiscal' : 'Orden de Entrega';
        toast({
          variant: 'success',
          title: `¡${docLabel} Generada!`,
          description: `${result.document?.document_number || ''} por $${total.toFixed(2)} USD (Bs. ${totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) procesada correctamente.`,
        });

        // Actualizar el estado de sesión de caja
        if (
          paymentMethod === 'cash_usd' || 
          paymentMethod === 'cash_ves' || 
          (paymentBreakdown && mixedPayments.cash > 0)
        ) {
          getCashSessionStatusAction(currentTenant.id, effectiveActor).then((cRes) => {
            if (cRes.success) setCashSessionStatus(cRes.session || null);
          });
        }

        // Liquidar orden dental vinculada si existía
        if (linkedDentalDocId) {
          updateDocumentStatusAction(linkedDentalDocId, 'invoiced', currentTenant.id, effectiveActor).catch(console.error);
          setLinkedDentalDocId(null);
          loadPendingDentalOrders();
        }

        // Generar datos para Comprobante Térmico y WhatsApp
        const saleReceipt: SaleReceiptData = {
          documentNumber: result.document?.document_number || `DOC-${Date.now().toString().slice(-6)}`,
          docLabel: docLabel,
          docSubtype: docType,
          createdAt: new Date().toISOString(),
          customerName: selectedCustomerObj?.name || 'Cliente de Mostrador',
          customerTaxId: selectedCustomerObj?.tax_id,
          customerPhone: selectedCustomerObj?.phone,
          companyName: currentTenant.name,
          companyTaxId: (currentTenant.metadata?.tax_id as string) || (currentTenant.metadata?.rif as string) || undefined,
          companyAddress: (currentTenant.metadata?.address as string) || undefined,
          companyPhone: (currentTenant.metadata?.phone as string) || undefined,
          items: ticketLines.map((l) => ({
            description: l.item.name,
            quantity: l.quantity,
            unitPrice: l.item.base_price || 0,
            total: (l.item.base_price || 0) * l.quantity,
          })),
          subtotal: subtotal,
          taxAmount: taxAmount,
          total: total,
          totalVES: totalVES,
          rate: currentRate,
          paymentMethod: paymentMethod,
          cashTenderedUSD: numericCashUSD > 0 ? numericCashUSD : undefined,
          cashTenderedVES: numericCashVES > 0 ? numericCashVES : undefined,
          changeDueUSD: changeDueUSD > 0 ? changeDueUSD : undefined,
          changeDueVES: changeDueVES > 0 ? changeDueVES : undefined,
          cashier: actor?.email?.split('@')[0] || session?.userEmail?.split('@')[0] || 'Cajero',
        };
        setSaleReceiptData(saleReceipt);
        setIsReceiptModalOpen(true);
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        clearCart();
      }, 1500);
    } catch (error: unknown) {
      toast({
        variant: 'error',
        title: 'Error en Cobro',
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-36 md:pb-6">
      {/* ─────────────────────────────────────────────────────────────
          1. BARRA SUPERIOR DINÁMICA DE CAJA (TURNO, TASA BCV, ACCIONES)
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white shrink-0 shadow-xs ${
            cashSessionStatus ? 'bg-emerald-600' : 'bg-slate-700'
          }`}>
            <Wallet size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                Punto de Venta (Caja)
              </h2>
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                cashSessionStatus
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
              }`}>
                {cashSessionStatus ? '🟢 Turno Activo' : '🔴 Caja Cerrada'}
              </span>
              {cashSessionStatus?.openedAt && (Date.now() - new Date(cashSessionStatus.openedAt).getTime() > 24 * 60 * 60 * 1000) && (
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  Abierto {new Date(cashSessionStatus.openedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            
            {cashSessionStatus ? (
              <p className="text-xs text-slate-500 font-medium mt-0.5 flex flex-wrap items-center gap-2">
                <span>Fondo: <strong>${(cashSessionStatus.initialTotalUSD ?? cashSessionStatus.initialAmount ?? 0).toFixed(2)} USD</strong> <span className="text-[10px] text-blue-600 font-bold">(Bs. {(cashSessionStatus.initialTotalVES ?? ((cashSessionStatus.initialAmount ?? 0) * currentRate)).toLocaleString('es-VE', { minimumFractionDigits: 2 })})</span></span>
                <span>•</span>
                <span>En Gaveta: <strong className="text-emerald-600 font-mono text-xs">${(cashSessionStatus.expectedTotalUSD ?? cashSessionStatus.expectedCash ?? 0).toFixed(2)} USD</strong> <span className="text-[10px] text-blue-600 font-mono font-bold">(Bs. {(cashSessionStatus.expectedTotalVES ?? ((cashSessionStatus.expectedCash ?? 0) * currentRate)).toLocaleString('es-VE', { minimumFractionDigits: 2 })})</span></span>
              </p>
            ) : (
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Inicia el turno para controlar tu gaveta unificada en USD y Bolívares.
              </p>
            )}
          </div>
        </div>

        {/* Botones de Cabecera */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Tasa Oficial BCV con Sincronización Automática */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-bold shadow-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-blue-600 dark:text-blue-400 font-black">🇻🇪 BCV:</span>
              <span className="font-mono font-black text-foreground">Bs. {currentRate.toFixed(2)}</span>
            </div>

            <button
              type="button"
              disabled={isSyncingBCV}
              onClick={handleSyncBCV}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-600 transition-colors btn-haptic disabled:opacity-50"
              title="Sincronizar en vivo con la tasa oficial del BCV"
            >
              <RefreshCw size={13} className={isSyncingBCV ? 'animate-spin text-blue-600' : ''} />
            </button>

            <button
              type="button"
              onClick={() => {
                setRateInput(currentRate.toFixed(2));
                setIsRateModalOpen(true);
              }}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
              title="Ajustar manualmente"
            >
              <Edit3 size={13} />
            </button>
          </div>

          {/* Cuentas Bancarias */}
          <button
            type="button"
            onClick={() => setIsBankModalOpen(true)}
            className="px-3 py-2 rounded-xl border border-border bg-background hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-bold transition-all flex items-center gap-1.5 btn-haptic"
            title="Ver Cuentas Bancarias y Pago Móvil"
          >
            <Landmark size={15} className="text-indigo-500" />
            <span>Cuentas & Pago Móvil</span>
            {bankAccounts.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-indigo-500/10 text-indigo-600 rounded-md text-[10px] font-extrabold">
                {bankAccounts.length}
              </span>
            )}
          </button>

          {/* Reponer Stock Rápido (Solo si Inventario está habilitado) */}
          {isInventoryEnabled && (
            <button
              type="button"
              onClick={() => setIsStockModalOpen(true)}
              className="px-3 py-2 rounded-xl border border-border bg-background hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-bold transition-all flex items-center gap-1.5 btn-haptic"
              title="Entrada rápida de inventario"
            >
              <PackagePlus size={15} className="text-emerald-500" />
              <span>Reponer Stock</span>
            </button>
          )}

          {/* Gastos Menores / Salidas & Entradas de Caja Chica (Compras & Contabilidad) */}
          {cashSessionStatus && (
            <button
              type="button"
              onClick={() => setIsMovementModalOpen(true)}
              className="px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold transition-all flex items-center gap-1.5 btn-haptic"
              title="Registrar gasto de caja chica (vinculado a Compras) o ingreso de cambio"
            >
              <ArrowDownUp size={15} className="text-amber-600 dark:text-amber-400" />
              <span>Gasto / Entrada</span>
            </button>
          )}

          {/* Abrir / Cerrar Caja (Arqueo Z) */}
          <button
            type="button"
            onClick={() => setIsCashModalOpen(true)}
            className={`px-3.5 py-2 rounded-xl text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-xs btn-haptic ${
              cashSessionStatus
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            <Coins size={15} />
            <span>{cashSessionStatus ? 'Cierre Z / Arqueo' : 'Abrir Turno'}</span>
          </button>
        </div>
      </div>

      {/* BANNER DE CONSULTAS ODONTOLÓGICAS PENDIENTES DE COBRO */}
      {pendingDentalOrders.length > 0 && (
        <div className="bg-linear-to-r from-teal-500/15 via-cyan-500/10 to-transparent border border-teal-500/30 rounded-3xl p-4 flex items-center justify-between gap-3 shadow-xs animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500 text-white flex items-center justify-center font-black text-lg shadow-sm shadow-teal-500/30 shrink-0">
              🦷
            </div>
            <div>
              <p className="text-xs font-black text-foreground flex items-center gap-2">
                <span>{pendingDentalOrders.length} Consulta(s) Odontológica(s) por Cobrar</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-teal-500 text-white font-bold">
                  Sillón Dental
                </span>
              </p>
              <p className="text-[11px] text-slate-500">
                El odontólogo ha enviado la orden de consulta para liquidación en mostrador.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsDentalOrdersModalOpen(true)}
            className="px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black transition-all shadow-md shadow-teal-500/20 flex items-center gap-1.5 shrink-0 btn-haptic"
          >
            <span>Ver y Cargar ({pendingDentalOrders.length})</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. LAYOUT PRINCIPAL EN 2 COLUMNAS (CATÁLOGO + TICKET)
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* PANEL IZQUIERDO: Catálogo de Productos o Terminal de Cobro Libre (7 columnas) */}
        <div className={`${globalViewMode === 'express' ? 'lg:col-span-7 col-span-1' : 'lg:col-span-7'} bg-card border border-border rounded-3xl p-5 shadow-xs space-y-4 flex flex-col min-h-[580px]`}>
          {isInventoryEnabled ? (
            <>
              {/* Buscador de Productos & Escáner */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por producto, servicio, código de barras o SKU... (Enter para agregar)"
                value={searchItem}
                onChange={(e) => setSearchItem(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-background border border-border focus:outline-hidden focus:ring-2 focus:ring-primary/20 text-xs font-bold text-foreground transition-all placeholder:text-slate-400"
              />
              {searchItem && (
                <button
                  type="button"
                  onClick={() => setSearchItem('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Switch de Vista: Grid vs List */}
            <div className="flex bg-slate-100 dark:bg-slate-900 border border-border p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-card text-foreground shadow-xs' : 'text-slate-400 hover:text-foreground'
                }`}
                title="Vista Cuadrícula"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'list' ? 'bg-card text-foreground shadow-xs' : 'text-slate-400 hover:text-foreground'
                }`}
                title="Vista Lista Compacta"
              >
                <List size={15} />
              </button>
            </div>
          </div>

          {/* Filtros de Tipo & Categorías */}
          <div className="space-y-2 border-b border-border pb-3">
            {/* Tipo: Todos / Productos / Servicios */}
            <div className="flex items-center gap-1 text-xs">
              {(['all', 'product', 'service'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1 rounded-xl font-bold transition-all ${
                    filterType === t
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {t === 'all' ? 'Todos' : t === 'product' ? '📦 Productos' : '✂️ Servicios'}
                </button>
              ))}
            </div>

            {/* Píldoras de Categorías Deslizables */}
            {dynamicCategories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                <button
                  type="button"
                  onClick={() => setFilterCategory('all')}
                  className={`px-2.5 py-0.5 rounded-lg whitespace-nowrap font-bold transition-all border ${
                    filterCategory === 'all'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                      : 'border-border text-slate-500 hover:text-foreground'
                  }`}
                >
                  Todas ({items.length})
                </button>
                {dynamicCategories.map((cat) => {
                  const count = items.filter((i) => i.category === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFilterCategory(cat)}
                      className={`px-2.5 py-0.5 rounded-lg whitespace-nowrap font-bold transition-all border ${
                        filterCategory === cat
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                          : 'border-border text-slate-500 hover:text-foreground'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Grilla o Lista de Productos */}
          <div className="flex-1 overflow-y-auto max-h-[500px] pr-1">
            {loadingData ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-medium">Cargando catálogo de venta...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <ShoppingBag size={36} className="mx-auto opacity-30" />
                <p className="text-xs font-bold">No se encontraron productos o servicios</p>
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(true)}
                  className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-xl hover:bg-primary/20"
                >
                  + Crear o reponer producto
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              /* VISTA CUADRÍCULA BIMONEDA */
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredItems.map((item) => {
                  const stockVal = item.stock ?? item.stock_quantity ?? 0;
                  const isOutOfStock = item.type === 'product' && stockVal <= 0;
                  const isLowStock = item.type === 'product' && stockVal > 0 && stockVal <= 3;
                  const priceUSD = Number(item.base_price || 0);
                  const priceVES = priceUSD * currentRate;

                  return (
                    <div
                      key={item.id}
                      onClick={() => !isOutOfStock && addLine(item)}
                      className={`p-3.5 rounded-2xl border flex flex-col justify-between text-left transition-all relative select-none ${
                        isOutOfStock
                          ? 'opacity-40 border-border cursor-not-allowed bg-slate-50 dark:bg-slate-900/30'
                          : 'border-border bg-card hover:border-indigo-500 hover:shadow-md cursor-pointer hover:-translate-y-0.5 active:scale-98'
                      }`}
                    >
                      {/* Stock Badge */}
                      {item.type === 'product' && (
                        <span
                          className={`absolute top-2.5 right-2.5 text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                            isOutOfStock
                              ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                              : isLowStock
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          }`}
                        >
                          {isOutOfStock ? 'Agotado' : `${stockVal} disp.`}
                        </span>
                      )}

                      <div className="pr-12">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block truncate">
                          {item.category || (item.type === 'service' ? 'Servicio' : 'General')}
                        </span>
                        <h4 className="font-bold text-foreground text-xs mt-0.5 line-clamp-2">
                          {item.name}
                        </h4>
                        {item.sku && (
                          <span className="text-[9px] font-mono text-slate-400 mt-0.5 block truncate">
                            {item.sku}
                          </span>
                        )}
                      </div>

                      {/* Precio Dual: USD ($) + Bolívares (Bs) */}
                      <div className="mt-3 pt-2 border-t border-border/40 flex items-baseline justify-between">
                        <div>
                          <span className="text-sm font-black text-foreground font-mono block">
                            ${priceUSD.toFixed(2)}
                          </span>
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 font-mono block">
                            ≈ Bs. {priceVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-black">
                          +
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* VISTA LISTA COMPACTA BIMONEDA */
              <div className="space-y-1.5">
                {filteredItems.map((item) => {
                  const stockVal = item.stock ?? item.stock_quantity ?? 0;
                  const isOutOfStock = item.type === 'product' && stockVal <= 0;
                  const priceUSD = Number(item.base_price || 0);
                  const priceVES = priceUSD * currentRate;

                  return (
                    <div
                      key={item.id}
                      onClick={() => !isOutOfStock && addLine(item)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                        isOutOfStock
                          ? 'opacity-40 border-border cursor-not-allowed bg-slate-50 dark:bg-slate-900/30'
                          : 'border-border bg-card hover:border-indigo-500 cursor-pointer hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-foreground block truncate">{item.name}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span>{item.sku || 'Sin SKU'}</span>
                          <span>•</span>
                          <span>{item.category || 'General'}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {item.type === 'product' && (
                          <span className={`text-[10px] font-bold ${stockVal > 0 ? 'text-slate-500' : 'text-rose-500'}`}>
                            {stockVal} disp.
                          </span>
                        )}
                        <div className="text-right">
                          <span className="font-mono font-black text-xs text-foreground block">
                            ${priceUSD.toFixed(2)}
                          </span>
                          <span className="font-mono text-[9px] text-blue-600 dark:text-blue-400 font-bold block">
                            Bs. {priceVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          className="px-2.5 py-1 bg-primary text-primary-foreground rounded-lg text-[10px] font-black hover:bg-primary/90 transition-all btn-haptic disabled:opacity-40"
                        >
                          + Agregar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
            </>
          ) : (
            /* ─────────────────────────────────────────────────────────────
               TERMINAL DE COBRO RÁPIDO / CONCEPTO LIBRE (MODO AUTÓNOMO)
               Opera al 100% sin depender de ítems en base de datos
               ───────────────────────────────────────────────────────────── */
            <div className="space-y-6 flex-1 flex flex-col justify-between py-2">
              {/* Banner Informativo */}
              <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-foreground">
                    Terminal de Cobro Rápido (Modo Autónomo)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    El módulo de inventario está desactivado. Puedes cobrar cualquier importe libre, servicio o concepto ad-hoc directamente sin necesidad de catálogo de productos.
                  </p>
                </div>
              </div>

              {/* Formulario Principal de Cobro Libre */}
              <div className="bg-background border border-border rounded-2xl p-5 space-y-4 shadow-2xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Concepto / Motivo de Venta
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Servicio de Atención, Mano de Obra, Consumo Libre..."
                    value={quickConcept}
                    onChange={(e) => setQuickConcept(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border text-sm font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Importe ($ USD)
                    </label>
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                      ≈ Bs. {((parseFloat(quickAmountUSD) || 0) * currentRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-black text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={quickAmountUSD}
                      onChange={(e) => setQuickAmountUSD(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddQuickLine();
                        }
                      }}
                      className="w-full pl-8 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border text-xl font-mono font-black text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-300"
                    />
                  </div>
                </div>

                {/* Chips de Montos Rápidos */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Montos Frecuentes
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                    {[1, 2, 5, 10, 20, 50, 100].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setQuickAmountUSD(amt.toString())}
                        className="py-1.5 px-2 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/40 text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 border border-border rounded-lg text-xs font-black transition-all btn-haptic"
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Botón de Agregar al Ticket */}
                <button
                  type="button"
                  onClick={() => handleAddQuickLine()}
                  className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all btn-haptic"
                >
                  <Plus size={16} />
                  <span>Agregar al Ticket</span>
                </button>
              </div>

              {/* Botones de Servicios / Atajos Rápidos de 1-Clic */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Atajos Rápidos de 1 Clic
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: 'Servicio Express', price: 10 },
                    { label: 'Atención General', price: 15 },
                    { label: 'Consulta / Cita', price: 20 },
                    { label: 'Mantenimiento', price: 30 },
                    { label: 'Consumo Variado', price: 5 },
                    { label: 'Tarifa Personalizada', price: 25 },
                  ].map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => handleAddQuickLine(s.label, s.price)}
                      className="p-3 bg-card hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-border hover:border-indigo-500/50 rounded-xl text-left transition-all btn-haptic group flex flex-col justify-between"
                    >
                      <span className="text-xs font-bold text-foreground group-hover:text-indigo-600 transition-colors truncate">
                        {s.label}
                      </span>
                      <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400 mt-1">
                        ${s.price.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PANEL DERECHO: Ticket de Venta & Checkout (5 columnas) */}
        <div id="pos-ticket-panel" className={`lg:col-span-5 bg-card border border-border rounded-3xl p-5 shadow-lg space-y-4 flex flex-col relative overflow-hidden ${globalViewMode === 'express' ? 'max-lg:hidden' : ''}`}>
          
          {/* Overlay de Éxito */}
          {success && (
            <div className="absolute inset-0 z-50 bg-emerald-600/95 backdrop-blur-xs text-white flex flex-col items-center justify-center animate-in zoom-in-95 duration-150 p-6 text-center">
              <CheckCircle2 size={56} className="mb-3 animate-bounce" />
              <h3 className="text-xl font-black">¡Cobro Exitoso!</h3>
              <p className="text-xs opacity-90 mt-1">El comprobante ha sido emitido e ingresado al registro.</p>
            </div>
          )}

          {/* Cabecera del Ticket: Cliente, Historial CRM & Botón Limpiar */}
          <div className="border-b border-border pb-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={13} />
                  <span>Cliente</span>
                </label>
                {heldTickets.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsHeldModalOpen(true)}
                    className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[10px] font-black flex items-center gap-1 hover:bg-amber-500/25 transition-all"
                    title="Ver tickets en espera pausados"
                  >
                    <Pause size={10} />
                    <span>{heldTickets.length} en espera</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {selectedCustomer !== 'generic_counter_customer' && (
                  <button
                    type="button"
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[11px] font-black flex items-center gap-1 hover:bg-indigo-100 transition-colors"
                    title="Ver historial de compras y ficha del cliente"
                  >
                    <History size={12} />
                    <span>Historial</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="text-primary hover:underline text-xs font-bold flex items-center gap-0.5"
                >
                  <Plus size={13} /> Nuevo
                </button>

                {ticketLines.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={holdCurrentTicket}
                      className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[11px] font-black flex items-center gap-1 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors ml-1"
                      title="Pausar venta para atender a otro cliente"
                    >
                      <Pause size={11} />
                      <span>Pausar</span>
                    </button>

                    <button
                      type="button"
                      onClick={clearCart}
                      className="text-slate-400 hover:text-rose-500 text-xs font-bold transition-colors ml-1"
                      title="Vaciar ticket"
                    >
                      Vaciar
                    </button>
                  </>
                )}
              </div>
            </div>

            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            >
              <option value="generic_counter_customer">👤 Venta de Mostrador (Cliente General)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.tax_id ? `(${c.tax_id})` : ''}
                </option>
              ))}
            </select>

            {linkedAppointmentId && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 flex items-center justify-between text-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 min-w-0">
                  <CalendarDays size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="truncate">
                    <span className="font-bold block text-[11px] leading-tight">Cita de Agenda Vinculada</span>
                    <span className="text-[10px] text-emerald-600/90 dark:text-emerald-400/80">Se marcará como pagada al completar la factura</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLinkedAppointmentId(null)}
                  className="p-1 rounded-md text-emerald-600 hover:text-emerald-900 hover:bg-emerald-500/20 transition-colors shrink-0"
                  title="Desvincular de la cita"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────
              SELECTOR DISCRETO DE COMPROBANTE (CUMPLIMIENTO SENIAT)
              Orden de Entrega (sin IVA) vs Factura Fiscal (con IVA 16%)
             ───────────────────────────────────────────────────────────── */}
          <div className="bg-slate-100 dark:bg-slate-900/60 p-1 rounded-2xl border border-border">
            <div className="grid grid-cols-2 gap-1 text-xs">
              <button
                type="button"
                onClick={() => setDocType('delivery_order')}
                className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 btn-haptic ${
                  docType === 'delivery_order'
                    ? 'bg-card text-foreground shadow-xs border border-border/50'
                    : 'text-slate-500 hover:text-foreground'
                }`}
              >
                <FileText size={14} className="text-indigo-500" />
                <span>Orden de Entrega</span>
              </button>
              
              <button
                type="button"
                onClick={() => setDocType('fiscal_invoice')}
                className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 btn-haptic ${
                  docType === 'fiscal_invoice'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-slate-500 hover:text-foreground'
                }`}
              >
                <Receipt size={14} />
                <span>Factura Fiscal</span>
              </button>
            </div>
          </div>

          {/* Líneas de Productos en el Ticket */}
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 flex-1">
            {ticketLines.length === 0 ? (
              <div className="text-center py-10 text-slate-400 space-y-2">
                <ShoppingBag size={32} className="mx-auto opacity-30" />
                <p className="text-xs font-bold">El ticket está vacío</p>
                <p className="text-[11px] text-slate-500">Toca productos del catálogo para agregarlos.</p>
              </div>
            ) : (
              ticketLines.map((line) => {
                const lineTotalUSD = (line.item.base_price || 0) * line.quantity;
                const lineTotalVES = lineTotalUSD * currentRate;
                const isEditingPrice = editingPriceItemId === line.item.id;
                const originalPrice = line.item._originalPrice;
                const hasDiscount = originalPrice !== undefined && originalPrice !== line.item.base_price;

                return (
                  <div
                    key={line.item.id}
                    className="p-3 rounded-2xl border border-border bg-background shadow-2xs space-y-2 text-xs transition-all hover:border-border/80"
                  >
                    <div className="flex items-start justify-between gap-2">
                      {/* Información del Ítem */}
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-foreground block truncate" title={line.item.name}>
                          {line.item.name}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          {/* Precio unitario interactivo con opción a modificar */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPriceItemId(line.item.id);
                              setTempPriceValue(String(line.item.base_price || 0));
                            }}
                            className="text-[11px] text-slate-500 hover:text-primary font-mono flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group/p"
                            title="Haz clic para modificar el precio o aplicar un descuento a esta línea"
                          >
                            <span className="font-bold text-foreground">
                              ${Number(line.item.base_price || 0).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400">c/u</span>
                            <Edit3 size={11} className="text-slate-400 group-hover/p:text-primary transition-colors ml-0.5" />
                          </button>

                          {hasDiscount && (
                            <span className="text-[10px] line-through text-slate-400 font-mono" title="Precio de catálogo original">
                              ${Number(originalPrice).toFixed(2)}
                            </span>
                          )}

                          {line.item.type === 'service' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              Servicio
                            </span>
                          )}
                          {(String(line.item.id).startsWith('appt-') || line.item.category === 'Citas') && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Cita
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Importe Total de la Línea */}
                      <div className="text-right shrink-0">
                        <span className="font-mono font-black text-foreground block text-sm">
                          ${lineTotalUSD.toFixed(2)}
                        </span>
                        <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 block font-semibold">
                          Bs. {lineTotalVES.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Editor Rápido de Precio Unitario / Descuentos */}
                    {isEditingPrice && (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-primary/30 rounded-xl space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                          <span>Modificar Precio Unitario:</span>
                          <span className="text-primary font-mono text-[10px]">
                            Original: ${Number(line.item._originalPrice ?? line.item.base_price ?? 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="relative flex-1">
                            <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              autoFocus
                              value={tempPriceValue}
                              onChange={(e) => setTempPriceValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveLinePrice(line.item.id);
                                else if (e.key === 'Escape') setEditingPriceItemId(null);
                              }}
                              className="w-full bg-background border border-border rounded-lg pl-6 pr-2 py-1 text-xs font-black text-foreground font-mono focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSaveLinePrice(line.item.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold btn-haptic"
                            title="Confirmar precio"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPriceItemId(null)}
                            className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold"
                            title="Cancelar"
                          >
                            ✕
                          </button>
                        </div>
                        {/* Atajos de Descuento Rápido */}
                        <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-bold">Descuentos:</span>
                          {[5, 10, 15, 20].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => {
                                const orig = Number(line.item._originalPrice ?? line.item.base_price ?? 0);
                                const discounted = Math.max(0, orig * (1 - pct / 100));
                                setTempPriceValue(discounted.toFixed(2));
                              }}
                              className="px-2 py-0.5 rounded-md bg-card border border-border text-[10px] font-bold text-foreground hover:border-primary transition-colors"
                            >
                              -{pct}%
                            </button>
                          ))}
                          {originalPrice !== undefined && (
                            <button
                              type="button"
                              onClick={() => setTempPriceValue(Number(originalPrice).toFixed(2))}
                              className="px-2 py-0.5 rounded-md bg-card border border-border text-[10px] font-bold text-slate-400 hover:text-foreground"
                            >
                              Restablecer
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Controles de Cantidad y Botón de Eliminar */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 font-semibold">Cantidad:</span>
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-border">
                          <button
                            type="button"
                            onClick={() => updateQuantity(line.item.id, -1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-card text-foreground transition-all active:scale-90"
                            title="Restar 1 unidad"
                          >
                            <Minus size={13} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={line.item.type === 'product' ? (line.item.stock ?? line.item.stock_quantity ?? 9999) : 9999}
                            value={line.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) setExactQuantity(line.item.id, val);
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-10 text-center text-xs font-black text-foreground bg-transparent border-0 focus:outline-hidden focus:bg-background rounded-lg py-0.5"
                            title="Escribe la cantidad exacta"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(line.item.id, 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-card text-foreground transition-all active:scale-90"
                            title="Sumar 1 unidad"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeLine(line.item.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors btn-haptic font-bold text-[11px]"
                        title="Quitar este producto del ticket"
                      >
                        <Trash2 size={13} />
                        <span>Quitar</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────
              MÉTODOS DE PAGO VENEZOLANOS & INTERNACIONALES
             ───────────────────────────────────────────────────────────── */}
          <div className="space-y-2 border-t border-border pt-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Forma de Pago
            </label>

            <div className="grid grid-cols-4 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash_usd')}
                className={`py-2 rounded-xl font-bold transition-all flex flex-col items-center gap-1 btn-haptic ${
                  paymentMethod === 'cash_usd'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-foreground'
                }`}
              >
                <Coins size={14} />
                <span>Efectivo $</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cash_ves')}
                className={`py-2 rounded-xl font-bold transition-all flex flex-col items-center gap-1 btn-haptic ${
                  paymentMethod === 'cash_ves'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-foreground'
                }`}
              >
                <Coins size={14} />
                <span>Efectivo Bs</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('pago_movil')}
                className={`py-2 rounded-xl font-bold transition-all flex flex-col items-center gap-1 btn-haptic ${
                  paymentMethod === 'pago_movil'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-foreground'
                }`}
              >
                <Smartphone size={14} />
                <span>Pago Móvil</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`py-2 rounded-xl font-bold transition-all flex flex-col items-center gap-1 btn-haptic ${
                  paymentMethod === 'card'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-foreground'
                }`}
              >
                <CreditCard size={14} />
                <span>Tarjeta</span>
              </button>
            </div>

            {/* Fila Secundaria de Métodos */}
            <div className="grid grid-cols-4 gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`py-1.5 rounded-xl font-bold transition-all text-center btn-haptic ${
                  paymentMethod === 'transfer'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-foreground'
                }`}
              >
                <span>🏦 Transf.</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('zelle')}
                className={`py-1.5 rounded-xl font-bold transition-all text-center btn-haptic ${
                  paymentMethod === 'zelle'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-foreground'
                }`}
              >
                <span>📱 Zelle ($)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('mixed')}
                className={`py-1.5 rounded-xl font-bold transition-all text-center btn-haptic ${
                  paymentMethod === 'mixed'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-foreground'
                }`}
              >
                <span>🔄 Mixto</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('credit')}
                className={`py-1.5 rounded-xl font-bold transition-all text-center btn-haptic ${
                  paymentMethod === 'credit'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-foreground'
                }`}
              >
                <span>⏳ Crédito</span>
              </button>
            </div>

            {/* Banner Informativo de Venta a Crédito */}
            {paymentMethod === 'credit' && (
              <div className="p-3 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-500/20 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-rose-600 shrink-0" />
                  <span className="font-bold text-rose-800 dark:text-rose-300">Venta a Crédito (Cuenta por Cobrar)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Esta venta generará una cuenta por cobrar asociada al cliente y actualizará su saldo deudor en el CRM.
                </p>
                {selectedCustomer === 'generic_counter_customer' ? (
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-bold text-[11px] flex items-center justify-between">
                    <span>⚠️ Debes seleccionar un cliente registrado para habilitar el cobro a crédito</span>
                    <button
                      type="button"
                      onClick={() => setIsCustomerModalOpen(true)}
                      className="underline text-primary ml-2 hover:opacity-80"
                    >
                      Registrar
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    <span>Asociado a: {selectedCustomerObj?.name} (Deuda previa: ${(selectedCustomerObj?.metadata as any)?.total_debt || 0})</span>
                  </div>
                )}
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                CALCULADORA DE VUELTO: EFECTIVO USD ($)
               ───────────────────────────────────────────────────────────── */}
            {paymentMethod === 'cash_usd' && (
              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300">Paga con Dólares ($):</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={cashTenderedUSD}
                      onChange={(e) => setCashTenderedUSD(e.target.value)}
                      className="w-24 bg-background border border-border rounded-lg px-2 py-1 text-right font-mono font-black text-foreground outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Atajos de Billetes USD Rápidos */}
                <div className="flex items-center gap-1 justify-end flex-wrap">
                  {[5, 10, 20, 50, 100].map((bill) => (
                    <button
                      key={bill}
                      type="button"
                      onClick={() => setCashTenderedUSD(bill.toString())}
                      className="px-2 py-0.5 rounded-md bg-card border border-border hover:border-emerald-500 text-[10px] font-mono font-bold text-foreground transition-all"
                    >
                      ${bill}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCashTenderedUSD(total.toFixed(2))}
                    className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold"
                  >
                    Exacto
                  </button>
                </div>

                {/* Vuelto en USD y en Bolívares */}
                {numericCashUSD > 0 && (
                  <div className="pt-2 border-t border-emerald-500/20 flex justify-between items-center">
                    <span className="font-bold text-slate-600 dark:text-slate-300">Vuelto a Entregar:</span>
                    <div className="text-right font-mono">
                      <span className={`text-sm font-black block ${changeDueUSD >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                        ${changeDueUSD.toFixed(2)} USD
                      </span>
                      {changeDueUSD > 0 && (
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block">
                          o en Bs: Bs. {changeDueUSD_in_VES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                CALCULADORA DE VUELTO: EFECTIVO BOLÍVARES (Bs)
               ───────────────────────────────────────────────────────────── */}
            {paymentMethod === 'cash_ves' && (
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-500/20 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-blue-800 dark:text-blue-300 block">Paga en Bolívares (Bs):</span>
                    <span className="text-[10px] text-slate-400">Total a pagar: Bs. {totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-400 text-xs">Bs.</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={cashTenderedVES}
                      onChange={(e) => setCashTenderedVES(e.target.value)}
                      className="w-28 bg-background border border-border rounded-lg px-2 py-1 text-right font-mono font-black text-foreground outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1 justify-end flex-wrap">
                  <button
                    type="button"
                    onClick={() => setCashTenderedVES(Math.ceil(totalVES).toString())}
                    className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold"
                  >
                    Exacto (Bs. {Math.ceil(totalVES)})
                  </button>
                </div>

                {numericCashVES > 0 && (
                  <div className="pt-2 border-t border-blue-500/20 flex justify-between items-center">
                    <span className="font-bold text-slate-600 dark:text-slate-300">Vuelto a Entregar:</span>
                    <div className="text-right font-mono">
                      <span className={`text-sm font-black block ${changeDueVES >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-500'}`}>
                        Bs. {changeDueVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {changeDueVES > 0 && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                          o en $: ${changeDueVES_in_USD.toFixed(2)} USD
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                DETALLES PARA PAGO MÓVIL (MONTO EXACTO EN BS)
               ───────────────────────────────────────────────────────────── */}
            {paymentMethod === 'pago_movil' && (
              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-500/20 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-800 dark:text-indigo-300">📲 Monto a Transferir en Pago Móvil:</span>
                  <button
                    type="button"
                    onClick={() => setIsBankModalOpen(true)}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px] font-bold"
                  >
                    Ver Datos
                  </button>
                </div>
                <div className="text-center py-1.5 bg-background rounded-xl border border-border">
                  <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    Bs. {totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {bankAccounts.length > 0 && bankAccounts[0].phone && (
                  <div className="flex justify-between items-center text-[11px] text-slate-500 bg-slate-100/50 dark:bg-slate-800/40 p-2 rounded-xl">
                    <span>{bankAccounts[0].bank_name} • {bankAccounts[0].phone}</span>
                    <button
                      type="button"
                      onClick={() => copyBankData(bankAccounts[0])}
                      className="text-indigo-600 hover:underline font-bold"
                    >
                      Copiar
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Selector de Cuenta para Transferencia */}
            {paymentMethod === 'transfer' && (
              <div className="p-3 bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-500/20 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-800 dark:text-cyan-300">Cuenta Receptora:</span>
                  <button
                    type="button"
                    onClick={() => setIsBankModalOpen(true)}
                    className="text-cyan-600 dark:text-cyan-400 hover:underline text-[11px] font-bold"
                  >
                    Ver Cuentas
                  </button>
                </div>

                {bankAccounts.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    No tienes cuentas registradas. Toca "Ver Cuentas" para agregar tu banco o Pago Móvil.
                  </p>
                ) : (
                  <select
                    value={selectedBankAccountId}
                    onChange={(e) => setSelectedBankAccountId(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-foreground focus:outline-hidden"
                  >
                    {bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bank_name} — {acc.holder_name} ({acc.account_number?.slice(-4) || 'Pago Móvil'})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Desglose para Pago Mixto */}
            {paymentMethod === 'mixed' && (
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-500/20 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-amber-800 dark:text-amber-300">Desglose Mixto</span>
                  <span className={Math.abs(remainingToAssign) < 0.02 ? 'text-emerald-600' : 'text-rose-500'}>
                    Falta: ${remainingToAssign.toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Efectivo ($)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={mixedPayments.cash === 0 ? '' : mixedPayments.cash}
                      onChange={(e) => setMixedPayments({ ...mixedPayments, cash: e.target.value === '' ? 0 : Number(e.target.value) })}
                      className="w-full bg-background border border-border rounded-lg px-2 py-1 text-xs font-mono font-bold text-foreground"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Tarjeta</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={mixedPayments.card === 0 ? '' : mixedPayments.card}
                      onChange={(e) => setMixedPayments({ ...mixedPayments, card: e.target.value === '' ? 0 : Number(e.target.value) })}
                      className="w-full bg-background border border-border rounded-lg px-2 py-1 text-xs font-mono font-bold text-foreground"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Transf.</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={mixedPayments.transfer === 0 ? '' : mixedPayments.transfer}
                      onChange={(e) => setMixedPayments({ ...mixedPayments, transfer: e.target.value === '' ? 0 : Number(e.target.value) })}
                      className="w-full bg-background border border-border rounded-lg px-2 py-1 text-xs font-mono font-bold text-foreground"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Acordeón de Entrega Opcional (Plegado por defecto para no saturar) */}
          <div className="border border-border rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
            <button
              type="button"
              onClick={() => setShowDeliveryAccordion(!showDeliveryAccordion)}
              className="w-full p-2.5 flex items-center justify-between text-xs font-bold text-slate-500 hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Truck size={14} className="text-indigo-500" />
                <span>Datos de Despacho / Delivery (Opcional)</span>
              </div>
              {showDeliveryAccordion ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showDeliveryAccordion && (
              <div className="p-3 border-t border-border space-y-2 text-xs bg-background">
                <input
                  type="text"
                  placeholder="Dirección completa de entrega..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl px-3 py-1.5 text-xs text-foreground"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nombre del receptor"
                    value={deliveryContact}
                    onChange={(e) => setDeliveryContact(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl px-3 py-1.5 text-xs text-foreground"
                  />
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl px-3 py-1.5 text-xs text-foreground"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Totales Bimoneda y Botones de Cobro */}
          <div className="border-t border-border pt-3 space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-mono font-bold text-foreground">
                  ${subtotal.toFixed(2)} (Bs. {subtotalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })})
                </span>
              </div>

              {chargeTaxes ? (
                <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-bold">
                  <span>IVA (16% Fiscal):</span>
                  <span className="font-mono">
                    +${taxAmount.toFixed(2)} (+Bs. {taxAmountVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })})
                  </span>
                </div>
              ) : (
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Modalidad:</span>
                  <span className="font-medium">Orden de Entrega (Sin IVA)</span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-2 border-t border-border">
                <span className="text-sm font-black text-foreground">Total a Cobrar:</span>
                <div className="text-right">
                  <span className="text-2xl font-black text-primary font-mono block">
                    ${total.toFixed(2)} USD
                  </span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono block">
                    ≈ Bs. {totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Botones de Acción: Guardar Cotización vs Cobrar */}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isSaving || ticketLines.length === 0}
                onClick={() => handleCharge('draft')}
                className="flex-1 py-3 rounded-2xl border border-border bg-slate-100 dark:bg-slate-800 text-foreground font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all btn-haptic disabled:opacity-40"
              >
                Cotización
              </button>

              <button
                type="button"
                disabled={isSaving || ticketLines.length === 0 || (paymentMethod === 'credit' && selectedCustomer === 'generic_counter_customer')}
                onClick={() => handleCharge('invoiced')}
                className="flex-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 btn-haptic disabled:opacity-40"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>{paymentMethod === 'credit' ? `Cargar a Crédito $${total.toFixed(2)}` : `Cobrar $${total.toFixed(2)}`}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2.1 BARRA FLOTANTE DE CHECKOUT (MÓVIL & MODO EXPRÉS)
          Posicionada sobre el MobileDock (bottom-22) para que nunca lo tape
         ───────────────────────────────────────────────────────────── */}
      {ticketLines.length > 0 && (
        <>
          {/* Versión Móvil: Flota siempre sobre el MobileDock para acceso inmediato */}
          <div className="fixed bottom-22 left-3 right-3 sm:left-6 sm:right-6 z-40 max-w-lg mx-auto md:hidden pointer-events-none">
            <div className="pointer-events-auto bg-slate-900/95 dark:bg-slate-950/95 text-white p-3 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-4 duration-200">
              <div
                onClick={() => {
                  document.getElementById('pos-ticket-panel')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="cursor-pointer"
                title="Toca para ir al detalle del ticket"
              >
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-black">
                    {ticketLines.reduce((acc, l) => acc + l.quantity, 0)}
                  </span>
                  <span>en Ticket ➔</span>
                </div>
                <div className="text-base font-black text-emerald-400 font-mono leading-tight">
                  ${total.toFixed(2)} USD
                  <span className="text-[10px] text-slate-400 ml-1 font-sans">
                    (Bs. {totalVES.toLocaleString('es-VE', { maximumFractionDigits: 0 })})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('pos-ticket-panel');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
                >
                  Ver Ticket
                </button>
                <button
                  type="button"
                  onClick={() => setIsFastTenderOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black transition-all shadow-md btn-haptic"
                >
                  <CreditCard size={13} />
                  <span>COBRAR</span>
                </button>
              </div>
            </div>
          </div>

          {/* Versión Escritorio en Modo Exprés */}
          {globalViewMode === 'express' && (
            <div className="hidden md:block fixed bottom-4 left-0 right-0 z-30 px-4 max-w-lg mx-auto pointer-events-none">
              <div className="pointer-events-auto bg-slate-900/95 dark:bg-black/95 text-white p-3 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-4 duration-200">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {ticketLines.reduce((acc, l) => acc + l.quantity, 0)} ítem(s) en Ticket
                  </div>
                  <div className="text-lg font-black text-emerald-400 font-mono">
                    ${total.toFixed(2)}
                    <span className="text-xs text-slate-400 ml-1 font-normal font-sans">
                      (Bs. {totalVES.toFixed(0)})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFastTenderOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black transition-all shadow-md btn-haptic"
                  >
                    <CreditCard size={14} />
                    <span>COBRAR ➔</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL BOTTOM SHEET DE COBRO RÁPIDO */}
      <FastTenderBottomSheet
        isOpen={isFastTenderOpen}
        onClose={() => setIsFastTenderOpen(false)}
        totalUSD={total}
        totalVES={totalVES}
        currentRate={currentRate}
        ticketCount={ticketLines.reduce((acc, l) => acc + l.quantity, 0)}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        cashTenderedUSD={cashTenderedUSD}
        setCashTenderedUSD={setCashTenderedUSD}
        cashTenderedVES={cashTenderedVES}
        setCashTenderedVES={setCashTenderedVES}
        changeDueUSD={changeDueUSD}
        changeDueVES={changeDueVES}
        onConfirmCheckout={async () => {
          await handleCharge('invoiced');
          setIsFastTenderOpen(false);
        }}
        isSaving={isSaving}
        customerName={selectedCustomerObj?.name}
      />

      {/* ─────────────────────────────────────────────────────────────
          3. MODAL DE CUENTAS BANCARIAS & PAGO MÓVIL
         ───────────────────────────────────────────────────────────── */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 my-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                  <Landmark size={18} />
                </div>
                <div>
                  <h3 className="font-black text-foreground text-base">Cuentas Bancarias & Pago Móvil</h3>
                  <p className="text-xs text-slate-400">Datos para recibir transferencias de clientes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBankModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-foreground flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* Lista de Cuentas */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {bankAccounts.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No hay cuentas registradas aún. Agrega tu primera cuenta abajo.
                </div>
              ) : (
                bankAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-3.5 rounded-2xl border border-border bg-slate-50/50 dark:bg-slate-900/40 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">{acc.bank_name}</span>
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                          {acc.account_type}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-slate-600 dark:text-slate-300 select-all">
                        {acc.account_number}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Titular: <strong>{acc.holder_name}</strong> {acc.tax_id && `(CI/RIF: ${acc.tax_id})`}
                      </p>
                      {acc.phone && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                          📱 Pago Móvil: {acc.phone}
                        </p>
                      )}
                      {acc.email && (
                        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                          ✉️ Zelle / Correo: {acc.email}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => copyBankData(acc)}
                      className="px-2.5 py-1.5 rounded-xl bg-card border border-border hover:border-indigo-500 text-xs font-bold text-foreground transition-all flex items-center gap-1 shrink-0 btn-haptic"
                      title="Copiar datos"
                    >
                      {copiedBankId === acc.id ? (
                        <>
                          <Check size={13} className="text-emerald-500" />
                          <span className="text-emerald-500">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Formulario para Agregar Nueva Cuenta */}
            <form onSubmit={handleSaveBankAccount} className="pt-3 border-t border-border space-y-2.5">
              <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">
                + Registrar Nueva Cuenta / Pago Móvil
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Banco (ej. Banesco, Mercantil)"
                  value={newAccount.bank_name}
                  onChange={(e) => setNewAccount({ ...newAccount, bank_name: e.target.value })}
                  className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground"
                />

                <select
                  value={newAccount.account_type}
                  onChange={(e) => setNewAccount({ ...newAccount, account_type: e.target.value })}
                  className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground"
                >
                  <option value="corriente">Corriente</option>
                  <option value="ahorro">Ahorro</option>
                  <option value="pago_movil">Pago Móvil</option>
                  <option value="zelle">Zelle / Dólares</option>
                </select>

                <input
                  type="text"
                  required
                  placeholder="N° de Cuenta o Teléfono"
                  value={newAccount.account_number}
                  onChange={(e) => setNewAccount({ ...newAccount, account_number: e.target.value })}
                  className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-mono"
                />

                <input
                  type="text"
                  required
                  placeholder="Nombre del Titular"
                  value={newAccount.holder_name}
                  onChange={(e) => setNewAccount({ ...newAccount, holder_name: e.target.value })}
                  className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground"
                />

                <input
                  type="text"
                  placeholder="Cédula / RIF (opcional)"
                  value={newAccount.tax_id}
                  onChange={(e) => setNewAccount({ ...newAccount, tax_id: e.target.value })}
                  className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground"
                />

                <input
                  type="text"
                  placeholder="Teléfono Pago Móvil (opcional)"
                  value={newAccount.phone}
                  onChange={(e) => setNewAccount({ ...newAccount, phone: e.target.value })}
                  className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSavingAccount || !newAccount.bank_name || !newAccount.holder_name}
                  className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl transition-all btn-haptic disabled:opacity-40"
                >
                  {isSavingAccount ? 'Guardando...' : 'Guardar Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. MODAL CREAR CLIENTE RÁPIDO (CON PREFIJOS V-, J-, E-, G-)
         ───────────────────────────────────────────────────────────── */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-black text-foreground">Registrar Cliente</h3>
                <p className="text-xs text-slate-500">Datos para vincular a compras y facturación.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-foreground flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nombre Completo / Razón Social *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez o Inversiones Los Andes C.A."
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Cédula / RIF</label>
                <div className="flex gap-1.5">
                  <select
                    value={docPrefix}
                    onChange={(e) => setDocPrefix(e.target.value as any)}
                    className="bg-background border border-border rounded-xl px-2 py-2 text-xs font-bold text-foreground w-16"
                  >
                    <option value="V">V-</option>
                    <option value="J">J-</option>
                    <option value="E">E-</option>
                    <option value="G">G-</option>
                  </select>
                  <input
                    type="text"
                    placeholder="12345678"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Teléfono (WhatsApp)</label>
                <PhoneInput
                  label=""
                  value={newCustomer.phone}
                  onChange={(val) => setNewCustomer({ ...newCustomer, phone: val })}
                  placeholder="412 1234567"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email (opcional)</label>
                <input
                  type="email"
                  placeholder="cliente@ejemplo.com"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Dirección Habitual (opcional)</label>
                <input
                  type="text"
                  placeholder="Calle, Edificio o Sector..."
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="flex-1 py-2 rounded-xl border border-border text-slate-500 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSavingCustomer || !newCustomer.name}
                onClick={async () => {
                  if (!newCustomer.name || !currentTenant || !actor) return;
                  setIsSavingCustomer(true);
                  try {
                    const fullTaxId = docNumber.trim() ? `${docPrefix}-${docNumber.trim()}` : null;
                    const res = await createEntityAction(
                      {
                        type: 'customer',
                        name: newCustomer.name,
                        tax_id: fullTaxId,
                        phone: newCustomer.phone || null,
                        email: newCustomer.email || null,
                        address: newCustomer.address || null,
                      },
                      currentTenant.id,
                      actor
                    );

                    if (res?.success && res.entity) {
                      toast({ variant: 'success', title: 'Cliente Registrado', description: `${res.entity.name} guardado correctamente.` });
                      setCustomers([res.entity, ...customers]);
                      setSelectedCustomer(res.entity.id);
                      setIsCustomerModalOpen(false);
                      setDocNumber('');
                      setNewCustomer({ name: '', email: '', phone: '', address: '' });
                    } else {
                      toast({ variant: 'error', title: 'Error', description: res?.error || 'No se pudo guardar el cliente.' });
                    }
                  } catch (err: unknown) {
                    toast({ variant: 'error', title: 'Error', description: (err as Error).message });
                  } finally {
                    setIsSavingCustomer(false);
                  }
                }}
                className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs btn-haptic disabled:opacity-40"
              >
                {isSavingCustomer ? 'Guardando...' : 'Crear Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. MODAL AJUSTE DE TASA BCV
         ───────────────────────────────────────────────────────────── */}
      {isRateModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-black text-foreground flex items-center gap-2">
                  <span>🇻🇪 Ajustar Tasa Oficial</span>
                </h3>
                <p className="text-xs text-slate-500">Tasa de conversión Bolívares / Dólar</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRateModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-foreground flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateRate} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Nueva Tasa (Bs. por 1 USD) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Bs.</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl pl-10 pr-3 py-2 text-base font-black text-foreground font-mono focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                    placeholder="36.50"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Actualizará instantáneamente los precios en Bolívares del catálogo y los totales de cobro.
                </p>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsRateModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-border text-slate-500 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingRate || !rateInput}
                  className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs btn-haptic disabled:opacity-40"
                >
                  {isUpdatingRate ? 'Guardando...' : 'Aplicar Tasa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. MODAL HISTORIAL Y CRM DEL CLIENTE
         ───────────────────────────────────────────────────────────── */}
      {isHistoryModalOpen && currentTenant && actor && (
        <CustomerHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          customerId={selectedCustomer}
          customerName={selectedCustomerObj?.name}
          tenantId={currentTenant.id}
          actor={actor}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. MODAL DE ARQUEO Z / APERTURA DE CAJA
         ───────────────────────────────────────────────────────────── */}
      {isCashModalOpen && currentTenant && actor && (
        <CashRegisterModal
          isOpen={isCashModalOpen}
          onClose={() => setIsCashModalOpen(false)}
          tenantId={currentTenant.id}
          actor={actor}
          currentSession={cashSessionStatus}
          currentRate={currentRate}
          onSuccess={() => {
            getCashSessionStatusAction(currentTenant.id, actor).then((res) => {
              if (res.success) setCashSessionStatus(res.session || null);
            });
          }}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          8. MODAL DE REPONER STOCK RÁPIDO
         ───────────────────────────────────────────────────────────── */}
      {isStockModalOpen && currentTenant && (
        <QuickStockModal
          isOpen={isStockModalOpen}
          onClose={() => setIsStockModalOpen(false)}
          tenantId={currentTenant.id}
          items={items}
          onSuccess={(updatedItem) => {
            if (updatedItem?.id) {
              setItems((prev) =>
                prev.map((i) =>
                  i.id === updatedItem.id
                    ? {
                        ...i,
                        ...updatedItem,
                        stock: updatedItem.stock !== undefined ? updatedItem.stock : updatedItem.stock_quantity,
                        stock_quantity: updatedItem.stock_quantity !== undefined ? updatedItem.stock_quantity : (updatedItem.stock ?? 0),
                      }
                    : i
                )
              );
            }
            if (actor) {
              getItemsAction(currentTenant.id, undefined, 100, actor).then((res) => {
                if (res.success) setItems(res.items || []);
              });
              getCashSessionStatusAction(currentTenant.id, actor).then((res) => {
                if (res.success) setCashSessionStatus(res.session || null);
              });
            }
          }}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          9. MODAL DE GASTO / ENTRADA DE CAJA CHICA (COMPRAS & CONTABILIDAD)
         ───────────────────────────────────────────────────────────── */}
      {isMovementModalOpen && currentTenant && actor && (
        <CashMovementModal
          isOpen={isMovementModalOpen}
          onClose={() => setIsMovementModalOpen(false)}
          tenantId={currentTenant.id}
          actor={actor}
          currentRate={currentRate}
          onSuccess={() => {
            getCashSessionStatusAction(currentTenant.id, actor).then((res) => {
              if (res.success) setCashSessionStatus(res.session || null);
            });
          }}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          10. MODAL DE COMPROBANTE TÉRMICO Y WHATSAPP
         ───────────────────────────────────────────────────────────── */}
      {isReceiptModalOpen && saleReceiptData && (
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setSaleReceiptData(null);
          }}
          saleData={saleReceiptData}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          11. MODAL DE TICKETS EN ESPERA (PARK / HOLD CART)
         ───────────────────────────────────────────────────────────── */}
      <HeldTicketsModal
        isOpen={isHeldModalOpen}
        onClose={() => setIsHeldModalOpen(false)}
        heldTickets={heldTickets}
        onDiscard={discardHeldTicket}
        onResume={resumeHeldTicket}
      />

      {/* ─────────────────────────────────────────────────────────────
          12. MODAL DE CONSULTAS ODONTOLÓGICAS POR COBRAR EN MOSTRADOR
         ───────────────────────────────────────────────────────────── */}
      <PendingDentalOrdersModal
        isOpen={isDentalOrdersModalOpen}
        onClose={() => setIsDentalOrdersModalOpen(false)}
        orders={pendingDentalOrders}
        exchangeRate={exchangeRate.rate}
        onLoadOrder={handleLoadDentalOrder}
      />
    </div>
  );
}

export default function CajaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <CajaPageContent />
    </Suspense>
  );
}
