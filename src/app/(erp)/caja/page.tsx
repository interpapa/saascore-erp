'use client';

import { useState, useEffect } from 'react';
import { getItems, Item } from '@/lib/api/items';
import { getEntities, Entity } from '@/lib/api/entities';
import { createDocumentWithLines } from '@/lib/api/documents';
import { processSecureCheckout } from '@/app/actions/checkout';
import { Search, ShoppingCart, User, Plus, Minus, Trash2, DollarSign, Wallet, FileText, CheckCircle2 } from 'lucide-react';

export default function CajaPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [customers, setCustomers] = useState<Entity[]>([]);
  
  const [searchItem, setSearchItem] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  
  // Ticket State
  const [ticketLines, setTicketLines] = useState<{item: Item, quantity: number}[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'bolivares' | 'divisas'>('bolivares');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getItems().then(setItems);
    getEntities('customer').then(setCustomers);
  }, []);

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchItem.toLowerCase()) || i.sku?.toLowerCase().includes(searchItem.toLowerCase()));

  const addLine = (item: Item) => {
    const existing = ticketLines.find(l => l.item.id === item.id);
    if (existing) {
      setTicketLines(ticketLines.map(l => l.item.id === item.id ? { ...l, quantity: l.quantity + 1 } : l));
    } else {
      setTicketLines([...ticketLines, { item, quantity: 1 }]);
    }
  };

  const removeLine = (itemId: string) => {
    setTicketLines(ticketLines.filter(l => l.item.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setTicketLines(ticketLines.map(l => {
      if (l.item.id === itemId) {
        const newQ = Math.max(1, l.quantity + delta);
        return { ...l, quantity: newQ };
      }
      return l;
    }));
  };

  // Cálculos Financieros
  const subtotal = ticketLines.reduce((acc, l) => acc + (l.item.base_price * l.quantity), 0);
  const iva = subtotal * 0.16;
  const igtf = paymentMethod === 'divisas' ? (subtotal + iva) * 0.03 : 0;
  const total = subtotal + iva + igtf;

  const handleCharge = async (status: 'draft' | 'invoiced') => {
    if (!activeTenant) return alert('Debes seleccionar un tenant');
    if (!selectedCustomer) return alert('Debes seleccionar un cliente');
    if (ticketLines.length === 0) return alert('El ticket está vacío');

    setIsSaving(true);
    try {
      if (status === 'draft') {
        // Los borradores (Presupuestos) no necesitan seguridad estricta, los guarda el front
        await createDocumentWithLines({
          tenant_id: activeTenant.id,
          entity_id: selectedCustomer,
          type: 'quote',
          status: 'draft',
          document_number: null,
          issue_date: new Date().toISOString(),
          due_date: null,
          notes: 'Presupuesto Borrador',
          metadata: {},
          lines: ticketLines.map(l => ({
            item_id: l.item.id,
            description: l.item.name,
            quantity: l.quantity,
            unit_price: l.item.base_price,
            tax_amount: (l.item.base_price * l.quantity) * 0.16
          }))
        });
      } else {
        // LAS FACTURAS VAN POR EL SERVIDOR OBLIGATORIAMENTE
        const cartPayload = ticketLines.map(l => ({ itemId: l.item.id, quantity: l.quantity }));
        const result = await processSecureCheckout(cartPayload, selectedCustomer, paymentMethod, activeTenant.id, 'VE');
        
        if (!result.success) throw new Error(result.error);
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setTicketLines([]);
        setSelectedCustomer('');
      }, 3000);

    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] w-full max-w-7xl mx-auto p-4 gap-4 animate-in fade-in zoom-in-95 duration-500">
      
      {/* PANEL IZQUIERDO: Catálogo */}
      <div className="flex-1 flex flex-col bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[32px] shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-border/50 bg-white/30 dark:bg-slate-800/30">
          <h2 className="text-xl font-black text-foreground flex items-center gap-2 mb-4">
            <Search className="text-primary" />
            Buscador Rápido
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar repuesto, servicio, SKU..." 
              value={searchItem}
              onChange={e => setSearchItem(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                onClick={() => addLine(item)}
                className="bg-white/80 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-primary cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group shadow-sm hover:shadow-md"
              >
                <div className="text-xs font-bold text-slate-400 mb-1">{item.sku || 'S/N'}</div>
                <h3 className="font-bold text-foreground leading-tight mb-2 group-hover:text-primary transition-colors">{item.name}</h3>
                <div className="flex justify-between items-center mt-auto pt-2 border-t border-border/50">
                  <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-900 rounded-md text-slate-500">{item.type === 'product' ? '📦' : '🔧'}</span>
                  <span className="font-black text-lg text-primary">${item.base_price.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PANEL DERECHO: El Ticket */}
      <div className="w-[400px] flex flex-col bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-[32px] shadow-2xl overflow-hidden relative">
        {success && (
          <div className="absolute inset-0 z-50 bg-emerald-500 text-white flex flex-col items-center justify-center animate-in slide-in-from-bottom">
            <CheckCircle2 size={64} className="mb-4 animate-bounce" />
            <h2 className="text-2xl font-black">¡Facturado!</h2>
            <p className="opacity-80">Guardado en la base de datos</p>
          </div>
        )}

        {/* Cliente */}
        <div className="p-6 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/50">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
            <User size={14} /> Cliente
          </label>
          <select 
            value={selectedCustomer}
            onChange={e => setSelectedCustomer(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
          >
            <option value="">Seleccionar Cliente...</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} - RIF: {c.tax_id || 'N/A'}</option>
            ))}
          </select>
        </div>

        {/* Líneas */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {ticketLines.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
              <ShoppingCart size={48} className="mb-4" />
              <p className="font-medium text-center">Ticket Vacío<br/>Agrega ítems del catálogo</p>
            </div>
          ) : (
            ticketLines.map(line => (
              <div key={line.item.id} className="flex gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-foreground leading-tight">{line.item.name}</h4>
                  <p className="text-xs text-slate-500 font-medium">${line.item.base_price.toFixed(2)} c/u</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden h-8">
                    <button onClick={() => updateQuantity(line.item.id, -1)} className="w-8 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><Minus size={12} /></button>
                    <span className="w-8 text-center text-sm font-bold">{line.quantity}</span>
                    <button onClick={() => updateQuantity(line.item.id, 1)} className="w-8 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><Plus size={12} /></button>
                  </div>
                  <button onClick={() => removeLine(line.item.id)} className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totales y Cobro */}
        <div className="p-6 bg-slate-900 dark:bg-slate-900 text-white rounded-t-[32px] mt-auto relative z-10 shadow-[0_-20px_40px_rgba(0,0,0,0.2)]">
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-slate-400 text-sm font-medium">
              <span>Base Imponible</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-sm font-medium">
              <span>IVA (16%)</span>
              <span>${iva.toFixed(2)}</span>
            </div>
            
            {/* Toggle Método de Pago */}
            <div className="flex bg-slate-800 p-1 rounded-xl my-4">
              <button 
                onClick={() => setPaymentMethod('bolivares')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${paymentMethod === 'bolivares' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                Bs (Sin IGTF)
              </button>
              <button 
                onClick={() => setPaymentMethod('divisas')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${paymentMethod === 'divisas' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                Divisas (3% IGTF)
              </button>
            </div>

            {paymentMethod === 'divisas' && (
              <div className="flex justify-between text-indigo-300 text-sm font-bold">
                <span>IGTF (3%)</span>
                <span>${igtf.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between items-end border-t border-slate-700/50 pt-4 mt-4">
              <span className="text-slate-300 font-bold">Total USD</span>
              <span className="text-4xl font-black text-emerald-400">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleCharge('draft')}
              disabled={isSaving || ticketLines.length === 0}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-bold transition-all disabled:opacity-50 btn-haptic"
            >
              <FileText size={18} />
              Borrador
            </button>
            <button 
              onClick={() => handleCharge('invoiced')}
              disabled={isSaving || ticketLines.length === 0}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 py-3 rounded-xl font-black text-lg transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 btn-haptic"
            >
              <Wallet size={20} />
              Cobrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
