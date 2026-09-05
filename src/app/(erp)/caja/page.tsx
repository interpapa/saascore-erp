'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useERPStore } from '@/store/useERPStore';
import { processSecureCheckout } from '@/app/actions/checkout';
import { getItemsAction } from '@/app/actions/items';
import { getEntitiesAction, createEntityAction } from '@/app/actions/entities';
import { createDocumentAction } from '@/app/actions/documents';
import { getCashSessionStatusAction, CashSession } from '@/app/actions/cashRegister';
import { CashRegisterModal } from '@/components/caja/CashRegisterModal';
// import { InvoicePrintView } from '@/components/core/InvoicePrintView'; // Removed due to custom PDF generation
import { QuickStockModal } from '@/components/ui/QuickStockModal';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Search, ShoppingCart, ShoppingBag, User, Plus, Minus, Trash2, Wallet, FileText, CheckCircle2, PackagePlus } from 'lucide-react';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { getBankAccountsAction } from '@/app/actions/bankAccounts';
import { useToast } from '@/components/core/ToastProvider';
import { EmptyState } from '@/components/core/EmptyState';
import { jsPDF } from 'jspdf';
function CajaPageContent() {
  const currentTenant = useTenantResolver();
  const searchParams = useSearchParams();
  const { session } = useERPStore();
  const { toast } = useToast();

  const clientParam = searchParams.get('client') || searchParams.get('client_id');

  const [items, setItems] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [searchItem, setSearchItem] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>(clientParam || 'generic_counter_customer');
  const [filterType, setFilterType] = useState<'all' | 'product' | 'service'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Customer & Cash Register Modal State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashSessionStatus, setCashSessionStatus] = useState<CashSession | null>(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', tax_id: '' });
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  
  // Ticket State
  const [ticketLines, setTicketLines] = useState<{ item: any; quantity: number }[]>([]);
  
  const amountParam = searchParams.get('amount');
  const descParam = searchParams.get('desc');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('Rendo_pos_cart');
      if (stored) {
        setTicketLines(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading cart', e);
    }
  }, []);

  // Leer cobros pendientes desde el Calendario
  useEffect(() => {
    if (amountParam && descParam) {
      const amt = Number(amountParam);
      if (amt > 0) {
        setTicketLines(prev => {
          const customId = 'custom-' + descParam.replace(/\s+/g, '-').toLowerCase();
          if (prev.some(l => l.item.id === customId)) return prev;
          
          const syntheticItem = {
            id: customId,
            name: descParam,
            base_price: amt,
            type: 'service',
            category: 'Citas',
          };
          return [...prev, { item: syntheticItem, quantity: 1 }];
        });
      }
    }
  }, [amountParam, descParam]);

  useEffect(() => {
    localStorage.setItem('Rendo_pos_cart', JSON.stringify(ticketLines));
  }, [ticketLines]);

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'mixed'>('cash');
  const [mixedPayments, setMixedPayments] = useState({ cash: 0, card: 0, transfer: 0 });
  const [chargeTaxes, setChargeTaxes] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  // New: Bank accounts and delivery details
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [deliveryContact, setDeliveryContact] = useState<string>('');
  const [deliveryPhone, setDeliveryPhone] = useState<string>('');


  useEffect(() => {
    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (isSubscribed) setLoadingData(false);
    }, 2500);

    async function loadData() {
      try {
        setLoadingData(true);
        if (!currentTenant?.id) return;
        const [itemsRes, customersRes, cashRes, bankRes] = await Promise.all([
          getItemsAction(currentTenant.id),
          getEntitiesAction(currentTenant.id, 'customer'),
          getCashSessionStatusAction(currentTenant.id),
          getBankAccountsAction(currentTenant.id),
        ]);

        if (isSubscribed) {
          if (itemsRes?.success) setItems(itemsRes.items || []);
          if (customersRes?.success) setCustomers(customersRes.entities || []);
          if (cashRes?.success) setCashSessionStatus(cashRes.session || null);
          if (bankRes?.success && bankRes.accounts?.length) {
            setBankAccounts(bankRes.accounts);
            setSelectedBankAccountId(bankRes.accounts[0].id);
          }
        }
      } catch (err) {
        console.error('Error cargando POS:', err);
      } finally {
        if (isSubscribed) setLoadingData(false);
      }
    }

    loadData();

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [currentTenant?.id]);

  const dynamicCategories = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      const matchesSearch = i.name.toLowerCase().includes(searchItem.toLowerCase()) ||
        i.sku?.toLowerCase().includes(searchItem.toLowerCase());
      const matchesType = filterType === 'all' ? true : i.type === filterType;
      const matchesCategory = filterCategory === 'all' ? true : i.category === filterCategory;
      return matchesSearch && matchesType && matchesCategory;
    });
  }, [items, searchItem, filterType, filterCategory]);

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
        ticketLines.map((l) =>
          l.item.id === item.id ? { ...l, quantity: l.quantity + 1 } : l
        )
      );
    } else {
      setTicketLines([...ticketLines, { item, quantity: 1 }]);
    }
  };

  const removeLine = (itemId: string) => {
    setTicketLines(ticketLines.filter((l) => l.item.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setTicketLines(
      ticketLines.map((l) => {
        if (l.item.id === itemId) {
          const newQ = Math.max(1, l.quantity + delta);
          if (l.item.type === 'product') {
            const stockVal = l.item.stock ?? l.item.stock_quantity ?? 0;
            if (newQ > stockVal) {
              toast({ variant: 'warning', title: 'Sin Stock', description: `No hay más stock disponible para ${l.item.name}` });
              return l;
            }
          }
          return { ...l, quantity: newQ };
        }
        return l;
      })
    );
  };

  // Cálculos Financieros Estándar (Sin impuestos específicos de un solo país hardcodeados)
  const subtotal = ticketLines.reduce((acc, l) => acc + (l.item.base_price || 0) * l.quantity, 0);
  const taxAmount = chargeTaxes ? subtotal * 0.16 : 0;
  const total = subtotal + taxAmount;
  const remainingToAssign = total - (mixedPayments.cash + mixedPayments.card + mixedPayments.transfer);

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
      const customerId = selectedCustomer === 'generic_counter_customer' 
        ? (customers[0]?.id || currentTenant.id) 
        : selectedCustomer;

      const actor = {
        email: session?.userEmail || 'admin@Rendo.com',
        role: session?.role || ('owner' as const),
      };

      if (paymentMethod === 'mixed' && Math.abs(remainingToAssign) > 0.01) {
        toast({ variant: 'warning', title: 'Pago Incompleto', description: 'El desglose de pago mixto debe sumar el total exacto.' });
        setIsSaving(false);
        return;
      }

      const paymentBreakdown = paymentMethod === 'mixed' ? [
        ...(mixedPayments.cash > 0 ? [{ method: 'cash' as const, amount: mixedPayments.cash }] : []),
        ...(mixedPayments.card > 0 ? [{ method: 'card' as const, amount: mixedPayments.card }] : []),
        ...(mixedPayments.transfer > 0 ? [{ method: 'transfer' as const, amount: mixedPayments.transfer }] : []),
      ] : undefined;

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
            metadata: { payment_method: paymentMethod, charge_taxes: chargeTaxes, payments: paymentBreakdown, depositAccountId: selectedBankAccountId, delivery: { address: deliveryAddress, date: deliveryDate, contact: deliveryContact, phone: deliveryPhone } },
            lines: ticketLines.map((l) => ({
              item_id: l.item.id,
              description: l.item.name,
              quantity: l.quantity,
              unit_price: l.item.base_price || 0,
              tax_amount: chargeTaxes ? (l.item.base_price || 0) * 0.16 : 0,
            })),
          },
          currentTenant.id,
          actor
        );

        if (!res.success) throw new Error(res.error);

        if (res.document) {
          try {
            const doc = new jsPDF();
            const d = res.document;
            const customerObj = customers.find(c => c.id === customerId);
            doc.text(`Presupuesto ${d.document_number ?? ''}`, 10, 10);
            doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 10, 20);
            doc.text(`Cliente: ${customerObj?.name ?? ''}`, 10, 30);
            let y = 40;
            ticketLines.forEach((line: any, idx: number) => {
              const text = `${idx + 1}. ${line.item.name} - ${line.quantity} x ${line.item.base_price}`;
              doc.text(text, 10, y);
              y += 10;
            });
            // Datos de Pago (Bank Account)
            if (selectedBankAccountId && bankAccounts?.length) {
              const acc = bankAccounts.find(a => a.id === selectedBankAccountId);
              if (acc) {
                doc.text('Datos de Pago:', 10, y); y += 10;
                doc.text(`Banco: ${acc.bank_name ?? ''}`, 10, y); y += 10;
                doc.text(`Tipo de Cuenta: ${acc.account_type ?? ''}`, 10, y); y += 10;
                doc.text(`Número: ${acc.account_number ?? ''}`, 10, y); y += 10;
                if (acc.holder_name) { doc.text(`Titular: ${acc.holder_name}`, 10, y); y += 10; }
                if (acc.notes) { doc.text(`Notas: ${acc.notes}`, 10, y); y += 10; }
              }
            }
            // Datos de Entrega (Delivery)
            if (deliveryAddress) {
              doc.text('Datos de Entrega:', 10, y); y += 10;
              doc.text(`Dirección: ${deliveryAddress}`, 10, y); y += 10;
              if (deliveryDate) { doc.text(`Fecha: ${deliveryDate}`, 10, y); y += 10; }
              if (deliveryContact) { doc.text(`Contacto: ${deliveryContact}`, 10, y); y += 10; }
              if (deliveryPhone) { doc.text(`Teléfono: ${deliveryPhone}`, 10, y); y += 10; }
            }
            doc.save(`presupuesto-${d.document_number ?? Date.now()}.pdf`);
          } catch (err) {
            toast({
              variant: 'error',
              title: 'Error PDF',
              description: err instanceof Error ? (err as Error).message : String(err),
            });
          }
        }

        toast({ variant: 'success', title: 'Borrador Guardado', description: 'El presupuesto ha sido registrado y descargado.' });
      } else {
        const cartPayload = ticketLines.map((l) => ({ itemId: l.item.id, quantity: l.quantity }));
        const actor = {
          email: session?.userEmail || 'admin@Rendo.com',
          role: session?.role || ('owner' as const),
        };

        const result = await processSecureCheckout(
          cartPayload,
          customerId,
          paymentMethod,
          currentTenant.id,
          actor,
          'VE',
          undefined,
          chargeTaxes,
          paymentBreakdown
        );

        if (!result.success) throw new Error(result.error);

        if (result.document) {
          // Generate PDF using jsPDF
          try {
            const doc = new jsPDF();
            const d = result.document;
            doc.text(`Factura ${d.document_number ?? ''}`, 10, 10);
            doc.text(`Fecha: ${d.created_at ?? ''}`, 10, 20);
            doc.text(`Cliente: ${d.customer?.name ?? ''}`, 10, 30);
            const lines = d.lines ?? [];
            let y = 40;
            lines.forEach((line: any, idx: number) => {
              const text = `${idx + 1}. ${line.description ?? ''} - ${line.quantity ?? ''} x ${line.unit_price ?? ''}`;
              doc.text(text, 10, y);
              y += 10;
            });
            doc.save(`factura-${d.document_number ?? Date.now()}.pdf`);
          } catch (err) {
            toast({
              variant: 'error',
              title: 'PDF generation failed',
              description: err instanceof Error ? (err as Error).message : String(err),
            });
          }
        }
        toast({ variant: 'success', title: '¡Venta Exitosa!', description: `Factura ${result.document?.document_number || ''} generada.` });
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setTicketLines([]);
      }, 2500);
    } catch (error: unknown) {
      toast({ variant: 'error', title: 'Error en Checkout', description: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 flex flex-col lg:flex-row gap-6 space-y-0 animate-in fade-in duration-300">
      
      {/* PANEL IZQUIERDO: Catálogo de Productos */}
      <div className="flex-1 flex flex-col bg-card/80 backdrop-blur-xl border border-border rounded-[32px] shadow-xl overflow-hidden min-h-[500px]">
        <div className="p-6 border-b border-border/50 bg-card/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <ShoppingCart className="text-primary" size={24} />
              Punto de Venta (POS)
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Catálogo de productos y servicios en tiempo real</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setIsCashModalOpen(true)}
              className={`btn-base text-white text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 btn-haptic shrink-0 ${
                cashSessionStatus ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
              title={cashSessionStatus ? "Cerrar Caja" : "Apertura de Caja"}
            >
              <Wallet size={16} />
              <span className="hidden sm:inline">
                {cashSessionStatus ? `Caja Abierta ($${(cashSessionStatus.expectedCash || cashSessionStatus.initialAmount).toFixed(2)})` : 'Abrir Caja'}
              </span>
            </button>
            <button
              onClick={() => setIsStockModalOpen(true)}
              className="btn-base bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 btn-haptic shrink-0"
              title="Entrada rápida de stock"
            >
              <PackagePlus size={16} />
              <span className="hidden sm:inline">Reponer Stock</span>
            </button>
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por nombre o SKU..."
                value={searchItem}
                onChange={(e) => setSearchItem(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm font-medium text-foreground transition-all"
              />
            </div>
          </div>
        </div>

        {/* Filtros de Categorías y Tipo */}
        <div className="px-6 pb-4 flex flex-wrap gap-2 items-center border-b border-border/30">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-md font-bold transition-all ${filterType === 'all' ? 'bg-background shadow-sm text-foreground' : 'text-slate-500'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('product')}
              className={`px-3 py-1 rounded-md font-bold transition-all ${filterType === 'product' ? 'bg-background shadow-sm text-foreground' : 'text-slate-500'}`}
            >
              Productos
            </button>
            <button
              onClick={() => setFilterType('service')}
              className={`px-3 py-1 rounded-md font-bold transition-all ${filterType === 'service' ? 'bg-background shadow-sm text-foreground' : 'text-slate-500'}`}
            >
              Servicios
            </button>
          </div>

          <div className="h-4 w-px bg-border/50 hidden sm:block"></div>

          <div className="flex flex-wrap gap-1.5 items-center">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                filterCategory === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              Todas las cat.
            </button>
            {dynamicCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                  filterCategory === cat
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loadingData ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart size={48} />}
              title="Sin productos en catálogo"
              description="No se encontraron productos registrados en esta empresa. Ve a Catálogo para crear el primero."
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const stockVal = item.stock ?? item.stock_quantity ?? 0;
                const isOutOfStock = item.type === 'product' && stockVal <= 0;
                return (
                  <button
                    key={item.id}
                    disabled={isOutOfStock}
                    onClick={() => addLine(item)}
                    className={`bg-card p-4 rounded-2xl border border-border hover:border-primary cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group shadow-sm flex flex-col justify-between h-36 btn-haptic text-left w-full ${
                      isOutOfStock ? 'opacity-50 cursor-not-allowed hover:border-border hover:scale-100 active:scale-100' : ''
                    }`}
                  >
                    <div className="w-full">
                      <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1 flex justify-between items-center w-full">
                        <span>{item.sku || 'S/N'}</span>
                        {item.type === 'product' && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            stockVal > 10
                              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                              : stockVal > 0
                              ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                              : 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                          }`}>
                            {stockVal > 0 ? `${stockVal} disp.` : 'Agotado'}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {item.name}
                      </h3>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-border w-full">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-500">
                        {item.type === 'product' ? '📦 SKU' : '🔧 Serv'}
                      </span>
                      <span className="font-black text-lg text-primary">
                        ${Number(item.base_price || 0).toFixed(2)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* PANEL DERECHO: Ticket y Checkout */}
      <div className="w-full lg:w-[420px] flex flex-col bg-card border border-border rounded-[32px] shadow-2xl overflow-hidden relative">
        {success && (
          <div className="absolute inset-0 z-60 bg-emerald-500/95 backdrop-blur-md text-white flex flex-col items-center justify-center animate-in zoom-in-95 duration-200">
            <CheckCircle2 size={64} className="mb-4 animate-bounce" />
            <h2 className="text-2xl font-black">¡Venta Registrada!</h2>
            <p className="text-sm opacity-90">Factura procesada con éxito</p>
          </div>
        )}

        {/* Cliente Selector */}
        <div className="p-5 border-b border-border bg-slate-50/50 dark:bg-slate-900/50">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><User size={14} /> Cliente</span>
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="text-primary hover:text-primary/80 flex items-center gap-0.5 text-xs font-black transition-colors"
            >
              <Plus size={14} /> Nuevo
            </button>
          </label>
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="generic_counter_customer">👤 Venta al Mostrador (Cliente General)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.tax_id ? `(${c.tax_id})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Líneas del Ticket */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-[280px]">
          {ticketLines.length === 0 ? (
            <EmptyState
              title="Carrito vacío"
              description="Agrega productos desde el catálogo para iniciar una venta."
              icon={<ShoppingBag size={40} />}
            />
          ) : (
            ticketLines.map((line) => (
              <div
                key={line.item.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-background border border-border"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="font-bold text-sm text-foreground truncate">{line.item.name}</h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    ${Number(line.item.base_price || 0).toFixed(2)} c/u
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                    <button
                      onClick={() => updateQuantity(line.item.id, -1)}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-card text-foreground transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-7 text-center text-xs font-bold">{line.quantity}</span>
                    <button
                      onClick={() => updateQuantity(line.item.id, 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-card text-foreground transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeLine(line.item.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totales y Botones de Cobro */}
        <div className="p-5 border-t border-border bg-slate-900 text-white rounded-t-[28px] mt-auto">
          {/* Método de Pago */}
          <div className="flex bg-slate-800 p-1 rounded-xl mb-4">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                paymentMethod === 'cash' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              💵 Efectivo
            </button>
            <button
              onClick={() => setPaymentMethod('card')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                paymentMethod === 'card' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              💳 Tarjeta
            </button>
            <button
              onClick={() => setPaymentMethod('transfer')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                paymentMethod === 'transfer' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              🏦 Transferencia
            </button>
            <button
              onClick={() => setPaymentMethod('mixed')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                paymentMethod === 'mixed' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              🔄 Mixto
            </button>
          </div>

          {paymentMethod === 'mixed' && (
            <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5 mb-4 space-y-2">
              <div className="text-xs text-slate-300 font-bold mb-2">
                Desglose (Falta: <span className={remainingToAssign > 0.01 ? 'text-rose-400' : remainingToAssign < -0.01 ? 'text-rose-400' : 'text-emerald-400'}>${remainingToAssign.toFixed(2)}</span>)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-20">💵 Efectivo:</span>
                <input type="number" min="0" step="0.01" value={mixedPayments.cash || ''} onChange={e => setMixedPayments({...mixedPayments, cash: Number(e.target.value)})} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-20">💳 Tarjeta:</span>
                <input type="number" min="0" step="0.01" value={mixedPayments.card || ''} onChange={e => setMixedPayments({...mixedPayments, card: Number(e.target.value)})} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-20">🏦 Transf.:</span>
                <input type="number" min="0" step="0.01" value={mixedPayments.transfer || ''} onChange={e => setMixedPayments({...mixedPayments, transfer: Number(e.target.value)})} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none" />
              </div>
            </div>
          )}

          {/* Datos de Pago (Cuenta) */}
          <div className="mb-4">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Cuenta para depósito</label>
            <select
              value={selectedBankAccountId}
              onChange={e => setSelectedBankAccountId(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {bankAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.bank_name} - {acc.account_number?.slice(-4)}
                </option>
              ))}
            </select>
          </div>
          {/* Datos de Entrega */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Dirección de entrega</label>
            <input
              type="text"
              placeholder="Calle, número, ciudad"
              value={deliveryAddress}
              onChange={e => setDeliveryAddress(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Fecha de entrega</label>
            <input
              type="date"
              value={deliveryDate}
              onChange={e => setDeliveryDate(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Contacto</label>
            <input
              type="text"
              placeholder="Nombre del contacto"
              value={deliveryContact}
              onChange={e => setDeliveryContact(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Teléfono</label>
            <PhoneInput
              label=""
              value={deliveryPhone}
              onChange={val => setDeliveryPhone(val)}
              placeholder="444 1234567"
            />
          </div>


          <div className="space-y-1 mb-4 border-b border-white/5 pb-4">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Subtotal:</span>
              <span className="font-semibold text-white">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>IVA (16%):</span>
              <span className="font-semibold text-white">${taxAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between items-end mb-5">
            <div>
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Total a Pagar</span>
              <span className="text-xs text-slate-400">{ticketLines.length} ítems en ticket</span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-emerald-400">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleCharge('draft')}
              disabled={isSaving || ticketLines.length === 0}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 btn-haptic"
            >
              <FileText size={16} />
              Borrador
            </button>
            <button
              onClick={() => handleCharge('invoiced')}
              disabled={isSaving || ticketLines.length === 0}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-black text-base transition-colors shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50 btn-haptic"
            >
              <Wallet size={18} />
              Cobrar
            </button>
          </div>
        </div>

      </div>

      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-[28px] max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-xl font-black text-foreground">Crear Cliente Rápido</h3>
              <p className="text-xs text-slate-500 mt-1">Ingresa los datos para registrar al cliente en el sistema.</p>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email</label>
                <input
                  type="email"
                  placeholder="juan@ejemplo.com"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <PhoneInput
                    label="Teléfono"
                    value={newCustomer.phone}
                    onChange={(val) => setNewCustomer({ ...newCustomer, phone: val })}
                    placeholder="412 1234567"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Identificación Fiscal</label>
                  <input
                    type="text"
                    placeholder="RUT/NIF/RFC"
                    value={newCustomer.tax_id}
                    onChange={(e) => setNewCustomer({ ...newCustomer, tax_id: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsCustomerModalOpen(false);
                  setNewCustomer({ name: '', email: '', phone: '', tax_id: '' });
                }}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSavingCustomer || !newCustomer.name}
                onClick={async () => {
                  if (!newCustomer.name || !currentTenant) return;
                  setIsSavingCustomer(true);
                  try {
                    const res = await createEntityAction(
                      {
                        type: 'customer',
                        name: newCustomer.name,
                        email: newCustomer.email,
                        phone: newCustomer.phone,
                        tax_id: newCustomer.tax_id,
                        status: 'active',
                      },
                      currentTenant.id,
                      { email: session?.userEmail || 'admin', role: session?.role || 'owner' }
                    );
                    if (res.success && res.entity) {
                      toast({ variant: 'success', title: 'Cliente Creado', description: 'Seleccionado automáticamente.' });
                      setCustomers([...customers, res.entity]);
                      setSelectedCustomer(res.entity.id);
                      setIsCustomerModalOpen(false);
                      setNewCustomer({ name: '', email: '', phone: '', tax_id: '' });
                    } else {
                      toast({ variant: 'error', title: 'Error', description: res.error || 'No se pudo crear.' });
                    }
                  } catch (e: unknown) {
                    toast({ variant: 'error', title: 'Error', description: (e as Error).message });
                  } finally {
                    setIsSavingCustomer(false);
                  }
                }}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-xl text-sm font-bold btn-haptic disabled:opacity-50"
              >
                {isSavingCustomer ? 'Guardando...' : 'Guardar y Usar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isStockModalOpen && currentTenant && (
        <QuickStockModal
          isOpen={isStockModalOpen}
          onClose={() => setIsStockModalOpen(false)}
          items={items.filter(i => i.type === 'product')}
          tenantId={currentTenant.id}
          onSuccess={() => {
            getItemsAction(currentTenant.id).then(res => {
              if (res.success) setItems(res.items || []);
            });
          }}
        />
      )}

      {isCashModalOpen && currentTenant && (
        <CashRegisterModal
          isOpen={isCashModalOpen}
          onClose={() => setIsCashModalOpen(false)}
          tenantId={currentTenant.id}
          currentSession={cashSessionStatus || undefined}
          onSuccess={() => {
            getCashSessionStatusAction(currentTenant.id).then(res => {
              if (res.success) setCashSessionStatus(res.session || null);
            });
          }}
        />
      )}
    </div>
  );
}

import { Suspense } from 'react';

export default function CajaPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <CajaPageContent />
    </Suspense>
  );
}
