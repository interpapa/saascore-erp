'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useERPStore } from '@/store/useERPStore';
import { processSecureCheckout } from '@/app/actions/checkout';
import { getItemsAction } from '@/app/actions/items';
import { getEntitiesAction, createEntityAction } from '@/app/actions/entities';
import { createDocumentWithLines } from '@/lib/api/documents';
import { InvoicePrintView } from '@/components/core/InvoicePrintView';
import { Search, ShoppingCart, ShoppingBag, User, Plus, Minus, Trash2, Wallet, FileText, CheckCircle2 } from 'lucide-react';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useToast } from '@/components/core/ToastProvider';
import { EmptyState } from '@/components/core/EmptyState';

export default function CajaPage() {
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

  // Customer Modal State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', tax_id: '' });
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  
  // Ticket State
  const [ticketLines, setTicketLines] = useState<{ item: any; quantity: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [printedDoc, setPrintedDoc] = useState<any>(null);

  useEffect(() => {
    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (isSubscribed) setLoadingData(false);
    }, 2500);

    async function loadData() {
      if (!currentTenant?.id) return;
      try {
        setLoadingData(true);
        const [itemsRes, customersRes] = await Promise.all([
          getItemsAction(currentTenant.id),
          getEntitiesAction(currentTenant.id, 'customer'),
        ]);

        if (isSubscribed) {
          if (itemsRes?.success) setItems(itemsRes.items || []);
          if (customersRes?.success) setCustomers(customersRes.entities || []);
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

  const dynamicCategories = Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[];

  const filteredItems = items.filter(
    (i) => {
      const matchesSearch = i.name.toLowerCase().includes(searchItem.toLowerCase()) ||
        i.sku?.toLowerCase().includes(searchItem.toLowerCase());
      const matchesType = filterType === 'all' ? true : i.type === filterType;
      const matchesCategory = filterCategory === 'all' ? true : i.category === filterCategory;
      return matchesSearch && matchesType && matchesCategory;
    }
  );

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
  const total = subtotal; // Impuestos serán calculados por la localización configurada

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

      if (status === 'draft') {
        await createDocumentWithLines({
          tenant_id: currentTenant.id,
          entity_id: customerId,
          type: 'quote',
          status: 'draft',
          document_number: `PRES-${Date.now().toString().slice(-6)}`,
          issue_date: new Date().toISOString(),
          due_date: null,
          notes: null,
          metadata: { payment_method: paymentMethod },
          lines: ticketLines.map((l) => ({
            item_id: l.item.id,
            description: l.item.name,
            quantity: l.quantity,
            unit_price: l.item.base_price || 0,
            tax_amount: 0,
          })),
        });
        toast({ variant: 'success', title: 'Borrador Guardado', description: 'El presupuesto ha sido registrado.' });
      } else {
        const cartPayload = ticketLines.map((l) => ({ itemId: l.item.id, quantity: l.quantity }));
        const actor = {
          email: session?.userEmail || 'admin@saascore.com',
          role: session?.role || ('owner' as const),
        };

        const result = await processSecureCheckout(
          cartPayload,
          customerId,
          paymentMethod,
          currentTenant.id,
          actor
        );

        if (!result.success) throw new Error(result.error);

        if (result.document) {
          setPrintedDoc(result.document);
        }
        toast({ variant: 'success', title: '¡Venta Exitosa!', description: `Factura ${result.document?.document_number || ''} generada.` });
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setTicketLines([]);
      }, 2500);
    } catch (error: any) {
      toast({ variant: 'error', title: 'Error en Checkout', description: error.message });
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
          <div className="relative w-full sm:w-72">
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
          </div>

          <div className="flex justify-between items-end mb-5">
            <div>
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Total a Pagar</span>
              <span className="text-xs text-slate-400">{ticketLines.length} ítems en ticket</span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-emerald-400">${subtotal.toFixed(2)}</span>
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

      {printedDoc && (
        <InvoicePrintView document={printedDoc} onClose={() => setPrintedDoc(null)} />
      )}

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
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="+56912345678"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
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
                  if (!currentTenant) return;
                  setIsSavingCustomer(true);
                  try {
                    const actor = {
                      email: session?.userEmail || 'admin@saascore.com',
                      role: session?.role || ('owner' as const),
                    };
                    const res = await createEntityAction(
                      {
                        type: 'customer',
                        name: newCustomer.name,
                        email: newCustomer.email || null,
                        phone: newCustomer.phone || null,
                        tax_id: newCustomer.tax_id || null,
                      },
                      currentTenant.id,
                      actor
                    );
                    if (res.success && res.entity) {
                      setCustomers([res.entity, ...customers]);
                      setSelectedCustomer(res.entity.id);
                      setIsCustomerModalOpen(false);
                      setNewCustomer({ name: '', email: '', phone: '', tax_id: '' });
                      toast({ variant: 'success', title: 'Cliente creado', description: `Se registró a ${res.entity.name} con éxito.` });
                    } else {
                      toast({ variant: 'error', title: 'Error al guardar', description: res.error || 'Ocurrió un error inesperado.' });
                    }
                  } catch (err: any) {
                    toast({ variant: 'error', title: 'Error', description: err.message });
                  } finally {
                    setIsSavingCustomer(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-black transition-colors disabled:opacity-50"
              >
                {isSavingCustomer ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
