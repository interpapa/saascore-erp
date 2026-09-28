'use client';

import { useState, useEffect } from 'react';
import { Entity } from '@/lib/api/entities';
import { 
  createDocumentAction, 
  updateDocumentStatusAction, 
  receivePurchaseOrderAction 
} from '@/app/actions/documents';
import { useActionActor } from '@/hooks/useActionActor';
import { useToast } from '@/components/core/ToastProvider';
import { 
  ShoppingCart, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  PackageCheck, 
  Eye, 
  X, 
  ShieldCheck, 
  FileText, 
  Ban,
  Package,
  Layers,
  ChevronRight,
  Info,
  MessageCircle
} from 'lucide-react';
import { logExternalWhatsAppMessageAction } from '@/app/actions/whatsapp';

interface PurchaseOrderTabProps {
  purchaseOrders: any[];
  suppliers: Entity[];
  catalogItems: any[];
  tenantId: string;
  onRefresh: () => void;
  initialItem?: string | null;
  isInventoryEnabled?: boolean;
  isCRMEnabled?: boolean;
}

export function PurchaseOrderTab({
  purchaseOrders,
  suppliers,
  catalogItems,
  tenantId,
  onRefresh,
  initialItem,
  isInventoryEnabled = true,
  isCRMEnabled = true,
}: PurchaseOrderTabProps) {
  const actor = useActionActor();
  const { toast } = useToast();

  // Estados de modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPoForView, setSelectedPoForView] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Formulario Nueva Orden
  const [supplierMode, setSupplierMode] = useState<'select' | 'manual'>('select');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [manualSupplierName, setManualSupplierName] = useState('');
  const [poNotes, setPoNotes] = useState('');

  // Tipo de línea: 'inventory' o 'custom'
  const [lineType, setLineType] = useState<'inventory' | 'custom'>(isInventoryEnabled && catalogItems.length > 0 ? 'inventory' : 'custom');
  
  // Input para producto de inventario
  const [selectedItemId, setSelectedItemId] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemCost, setItemCost] = useState(0);

  // Input para concepto libre (anti-fastidio / compras sin inventario)
  const [customConcept, setCustomConcept] = useState('');
  const [customQty, setCustomQty] = useState(1);
  const [customCost, setCustomCost] = useState(0);

  // Líneas agregadas a la orden
  const [poLines, setPoLines] = useState<Array<{
    item_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
  }>>([]);

  // Si se pasa un ítem inicial por URL (ej: /compras?item=123)
  useEffect(() => {
    if (initialItem && catalogItems.length > 0 && !isModalOpen) {
      const item = catalogItems.find((i: any) => i.id === initialItem);
      if (item) {
        setIsModalOpen(true);
        setLineType('inventory');
        setSelectedItemId(initialItem);
        setItemCost(item.cost || item.base_price || 0);
      }
    }
  }, [initialItem, catalogItems, isModalOpen]);

  // Si cambia la disponibilidad de inventario
  useEffect(() => {
    if (!isInventoryEnabled || catalogItems.length === 0) {
      setLineType('custom');
    }
  }, [isInventoryEnabled, catalogItems.length]);

  // Si no hay proveedores registrados o CRM está inactivo, cambiar automáticamente a manual
  useEffect(() => {
    if (!isCRMEnabled || suppliers.length === 0) {
      setSupplierMode('manual');
    }
  }, [isCRMEnabled, suppliers.length]);

  const handleAddInventoryLine = () => {
    if (!selectedItemId) return;
    const itemObj = catalogItems.find(i => i.id === selectedItemId);
    if (!itemObj) return;

    const uom = itemObj.metadata?.unit_of_measure || itemObj.metadata?.unit || 'Unidad';

    setPoLines([
      ...poLines,
      {
        item_id: itemObj.id,
        description: `${itemObj.name} (${uom})`,
        quantity: Math.max(1, Number(itemQty)),
        unit_price: Math.max(0, Number(itemCost || itemObj.cost || itemObj.base_price || 0)),
      },
    ]);

    setSelectedItemId('');
    setItemQty(1);
    setItemCost(0);
  };

  const handleAddCustomLine = () => {
    if (!customConcept.trim()) return;

    setPoLines([
      ...poLines,
      {
        item_id: `custom-${Date.now()}`,
        description: customConcept.trim(),
        quantity: Math.max(1, Number(customQty)),
        unit_price: Math.max(0, Number(customCost)),
      },
    ]);

    setCustomConcept('');
    setCustomQty(1);
    setCustomCost(0);
  };

  const handleRemoveLine = (idx: number) => {
    setPoLines(poLines.filter((_, i) => i !== idx));
  };

  const calculateTotal = () => {
    return poLines.reduce((acc, line) => acc + (line.quantity * line.unit_price), 0);
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) return;

    const activeLines = [...poLines];

    // Si el usuario llenó los inputs pero olvidó presionar "Agregar línea", agregarla al vuelo
    if (lineType === 'inventory' && selectedItemId) {
      const itemObj = catalogItems.find(i => i.id === selectedItemId);
      if (itemObj) {
        const uom = itemObj.metadata?.unit_of_measure || itemObj.metadata?.unit || 'Unidad';
        activeLines.push({
          item_id: itemObj.id,
          description: `${itemObj.name} (${uom})`,
          quantity: Math.max(1, Number(itemQty)),
          unit_price: Math.max(0, Number(itemCost || itemObj.cost || itemObj.base_price || 0)),
        });
      }
    } else if (lineType === 'custom' && customConcept.trim()) {
      activeLines.push({
        item_id: `custom-${Date.now()}`,
        description: customConcept.trim(),
        quantity: Math.max(1, Number(customQty)),
        unit_price: Math.max(0, Number(customCost)),
      });
    }

    if (activeLines.length === 0) {
      toast({ 
        variant: 'error', 
        title: 'Sin Productos ni Conceptos', 
        description: 'Agrega al menos un artículo o concepto de compra.' 
      });
      return;
    }

    const supplierName = supplierMode === 'manual' 
      ? (manualSupplierName.trim() || 'Proveedor Ocasional')
      : (suppliers.find(s => s.id === selectedSupplierId)?.name || 'Proveedor General');

    try {
      setIsSubmitting(true);
      const res = await createDocumentAction(
        {
          type: 'purchase_order',
          status: 'in_progress',
          entity_id: supplierMode === 'select' ? (selectedSupplierId || null) : null,
          notes: poNotes || null,
          metadata: {
            supplier_name: supplierName,
            is_manual_supplier: supplierMode === 'manual',
          },
          lines: activeLines.map(l => ({
            item_id: l.item_id,
            description: l.description,
            quantity: l.quantity,
            unit_price: l.unit_price,
            tax_amount: 0,
          })),
        },
        tenantId,
        actor
      );

      if (res.success) {
        toast({ 
          variant: 'success', 
          title: 'Orden de Compra Emitida', 
          description: `Orden ${res.document?.document_number || ''} registrada a nombre de ${supplierName}.` 
        });
        setPoLines([]);
        setPoNotes('');
        setSelectedSupplierId('');
        setManualSupplierName('');
        setSelectedItemId('');
        setCustomConcept('');
        setIsModalOpen(false);
        onRefresh();
      } else {
        toast({ variant: 'error', title: 'Error', description: res.error || 'No se pudo crear la orden de compra.' });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error de servidor', description: (err as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Acción: Recibir Mercancía (Incrementa stock atómicamente)
  const handleReceiveOrder = async (po: any) => {
    if (!actor || !po?.id) return;
    try {
      setIsProcessingAction(true);
      const res = await receivePurchaseOrderAction(po.id, tenantId, actor);
      if (res.success) {
        toast({
          variant: 'success',
          title: 'Mercancía Recibida',
          description: `Se confirmó la recepción de ${po.document_number}. Las existencias en inventario fueron actualizadas.`,
        });
        setSelectedPoForView(null);
        onRefresh();
      } else {
        toast({ variant: 'error', title: 'Error', description: res.error || 'No se pudo recibir la mercancía.' });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error', description: (err as Error).message });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Acción: Marcar como Pagada
  const handleMarkAsPaid = async (po: any) => {
    if (!actor || !po?.id) return;
    try {
      setIsProcessingAction(true);
      const res = await updateDocumentStatusAction(po.id, 'paid', tenantId, actor);
      if (res.success) {
        toast({
          variant: 'success',
          title: 'Orden Pagada',
          description: `La orden ${po.document_number} ha sido marcada como pagada.`,
        });
        setSelectedPoForView(null);
        onRefresh();
      } else {
        toast({ variant: 'error', title: 'Error', description: res.error || 'No se pudo actualizar el pago.' });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error', description: (err as Error).message });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Acción: Anular Orden
  const handleAnnulOrder = async (po: any) => {
    if (!actor || !po?.id) return;
    try {
      setIsProcessingAction(true);
      const res = await updateDocumentStatusAction(po.id, 'annulled', tenantId, actor);
      if (res.success) {
        toast({
          variant: 'success',
          title: 'Orden Anulada',
          description: `La orden ${po.document_number} ha sido cancelada.`,
        });
        setSelectedPoForView(null);
        onRefresh();
      } else {
        toast({ variant: 'error', title: 'Error', description: res.error || 'No se pudo anular la orden.' });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error', description: (err as Error).message });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Acción: Compartir Orden de Compra por WhatsApp
  const handleSendPoWhatsApp = (po: any) => {
    const supplierPhone = po.entity?.phone || po.metadata?.supplier_phone || '';
    const cleanPhone = supplierPhone.replace(/[^0-9]/g, '');
    const supplierName = po.entity?.name || po.metadata?.supplier_name || 'Proveedor';

    const linesText = (po.lines || [])
      .map((l: any) => `- ${l.description}: ${l.quantity}x a $${Number(l.unit_price || 0).toFixed(2)} ($${(Number(l.quantity || 1) * Number(l.unit_price || 0)).toFixed(2)})`)
      .join('\n');

    const message = `*ORDEN DE COMPRA: ${po.document_number}*\n` +
      `Estimado/a ${supplierName},\n` +
      `Le compartimos la orden de compra emitida:\n\n` +
      `${linesText || '- Total global acordado'}\n\n` +
      `*TOTAL: $${Number(po.total_amount || 0).toFixed(2)} USD*\n` +
      (po.notes ? `*Observaciones:* ${po.notes}\n\n` : '\n') +
      `Por favor confirme recepción y tiempo estimado de entrega. ¡Muchas gracias!`;

    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }

    if (actor && tenantId) {
      logExternalWhatsAppMessageAction(
        {
          phone: cleanPhone || '580000000000',
          client_name: supplierName,
          client_id: po.entity_id || undefined,
          text: message,
          module_source: 'compras',
          metadata: {
            po_id: po.id,
            document_number: po.document_number,
            total_amount: po.total_amount,
          },
        },
        tenantId,
        actor
      ).catch((err) => console.warn('[WhatsApp Compras Log Warning]:', err));
    }

    toast({ variant: 'success', title: 'WhatsApp Preparado', description: 'Abriendo WhatsApp con la orden de compra.' });
  };

  return (
    <div className="space-y-6">
      {/* Sub-header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <ShoppingCart size={20} className="text-orange-500" />
            Órdenes de Compra (PO)
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Registro de compromisos de compra, recepción de existencias y egresos operativos
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 btn-haptic shadow-xs cursor-pointer"
        >
          <Plus size={16} />
          Nueva Orden de Compra
        </button>
      </div>

      {/* Grid / Feed de Órdenes Interactivo */}
      {purchaseOrders.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-3xl space-y-3">
          <ShoppingCart size={36} className="mx-auto text-slate-400 opacity-50" />
          <p className="text-sm font-bold text-foreground">No hay órdenes de compra registradas</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Emite órdenes a tus proveedores o registra compras de insumos para reabastecer inventario o registrar gastos.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-base btn-secondary btn-sm inline-flex items-center gap-2 mt-2"
          >
            <Plus size={14} /> Registrar Primera Compra
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {purchaseOrders.map((po) => {
            const supplierDisplayName = po.entity?.name || po.metadata?.supplier_name || 'Proveedor General';
            const linesCount = Array.isArray(po.lines) ? po.lines.length : 0;
            const isReceived = po.status === 'received' || po.status === 'completed';
            const isPaid = po.status === 'paid';
            const isAnnulled = po.status === 'annulled';

            return (
              <div
                key={po.id}
                onClick={() => setSelectedPoForView(po)}
                className="bg-card hover:bg-slate-50 dark:hover:bg-slate-900/60 border border-border hover:border-orange-500/40 rounded-2xl p-5 shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-transform group-hover:scale-105 ${
                    isReceived 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : isPaid
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                      : isAnnulled
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                      : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                  }`}>
                    {isReceived ? <PackageCheck size={20} /> : <ShoppingCart size={20} />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-foreground text-sm tracking-tight">{po.document_number}</span>
                      
                      {/* Estado */}
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        isReceived
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : isPaid
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                          : isAnnulled
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      }`}>
                        {isReceived ? 'Mercancía Recibida' : isPaid ? 'Pagado' : isAnnulled ? 'Anulado' : po.status === 'in_progress' ? 'Emitida / En Tránsito' : po.status}
                      </span>

                      {/* Badge 3-Way Match */}
                      {po.metadata?.three_way_match && (
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <ShieldCheck size={11} /> 3-Way Conciliado
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mt-1">
                      Proveedor: <span className="font-bold text-foreground">{supplierDisplayName}</span>
                      {linesCount > 0 && (
                        <span className="ml-2 text-slate-400">· {linesCount} {linesCount === 1 ? 'artículo' : 'artículos'}</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/50">
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-black text-foreground">${Number(po.total_amount || 0).toFixed(2)}</p>
                    <span className="text-[11px] text-slate-400 block font-mono">
                      {new Date(po.issue_date || po.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="text-slate-400 group-hover:text-primary transition-colors">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Asistente Anti-Fastidio de Creación de Orden */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <ShoppingCart size={18} className="text-orange-500" />
                  Emitir Orden de Compra (PO)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Registra compras de inventario o gastos operativos con proveedor opcional
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-foreground p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-5">
              {/* Sección Proveedor Anti-Fricción */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    🏢 Proveedor
                  </label>
                  {isCRMEnabled && suppliers.length > 0 && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSupplierMode('select')}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                          supplierMode === 'select'
                            ? 'bg-primary text-primary-foreground'
                            : 'text-slate-400 hover:text-foreground'
                        }`}
                      >
                        Registrado ({suppliers.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSupplierMode('manual')}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                          supplierMode === 'manual'
                            ? 'bg-primary text-primary-foreground'
                            : 'text-slate-400 hover:text-foreground'
                        }`}
                      >
                        Rápido / Ocasional
                      </button>
                    </div>
                  )}
                </div>

                {supplierMode === 'select' && suppliers.length > 0 ? (
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">-- Seleccionar Proveedor de la lista --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.tax_id || 'Sin RIF'})</option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={manualSupplierName}
                      onChange={(e) => setManualSupplierName(e.target.value)}
                      placeholder="Nombre del proveedor o tienda (ej: Don Pedro, Ferretería Central...)"
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Si lo dejas en blanco, se registrará automáticamente como &quot;Proveedor General&quot;.
                    </p>
                  </div>
                )}
              </div>

              {/* Selector de Modo de Línea: Inventario vs Concepto Libre */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground">Artículos o Conceptos a Comprar</h4>
                  {isInventoryEnabled && catalogItems.length > 0 && (
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setLineType('inventory')}
                        className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                          lineType === 'inventory'
                            ? 'bg-background text-foreground shadow-xs'
                            : 'text-slate-400 hover:text-foreground'
                        }`}
                      >
                        <Package size={12} /> Del Inventario
                      </button>
                      <button
                        type="button"
                        onClick={() => setLineType('custom')}
                        className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                          lineType === 'custom'
                            ? 'bg-background text-foreground shadow-xs'
                            : 'text-slate-400 hover:text-foreground'
                        }`}
                      >
                        <Layers size={12} /> Concepto Libre / Gasto
                      </button>
                    </div>
                  )}
                </div>

                {/* Formulario de Línea según el tipo */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-border space-y-3">
                  {lineType === 'inventory' && isInventoryEnabled && catalogItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-500 block mb-1 uppercase tracking-wider">Producto *</label>
                        <select
                          value={selectedItemId}
                          onChange={(e) => {
                            setSelectedItemId(e.target.value);
                            const item = catalogItems.find(i => i.id === e.target.value);
                            if (item) setItemCost(item.cost || item.base_price || 0);
                          }}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                        >
                          <option value="">-- Seleccionar --</option>
                          {catalogItems.map(i => (
                            <option key={i.id} value={i.id}>{i.name} (Stock: {i.stock ?? 0})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold text-slate-500 block mb-1 uppercase tracking-wider">Cantidad</label>
                        <input
                          type="number"
                          min="1"
                          value={itemQty}
                          onChange={(e) => setItemQty(Number(e.target.value))}
                          placeholder="Cant."
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold text-slate-500 block mb-1 uppercase tracking-wider">Costo U. (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={itemCost}
                          onChange={(e) => setItemCost(Number(e.target.value))}
                          placeholder="Costo U."
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary font-mono"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-1">
                        <label className="text-[10px] font-extrabold text-slate-500 block mb-1 uppercase tracking-wider">Concepto o Insumo *</label>
                        <input
                          type="text"
                          value={customConcept}
                          onChange={(e) => setCustomConcept(e.target.value)}
                          placeholder="Ej: Resmas de papel, Tóner, Café..."
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold text-slate-500 block mb-1 uppercase tracking-wider">Cantidad</label>
                        <input
                          type="number"
                          min="1"
                          value={customQty}
                          onChange={(e) => setCustomQty(Number(e.target.value))}
                          placeholder="Cant."
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold text-slate-500 block mb-1 uppercase tracking-wider">Costo Total U. (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={customCost}
                          onChange={(e) => setCustomCost(Number(e.target.value))}
                          placeholder="Monto"
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={lineType === 'inventory' ? handleAddInventoryLine : handleAddCustomLine}
                    className="w-full bg-slate-200 dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-700 dark:text-slate-300 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    + Agregar a la Orden
                  </button>
                </div>
              </div>

              {/* Tabla de Líneas Agregadas */}
              {poLines.length > 0 && (
                <div className="border border-border rounded-2xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                      <tr>
                        <th className="p-3">Descripción</th>
                        <th className="p-3 text-center">Cant.</th>
                        <th className="p-3 text-right">Costo U.</th>
                        <th className="p-3 text-right">Total</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {poLines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-semibold text-foreground">{line.description}</td>
                          <td className="p-3 text-center font-mono">{line.quantity}</td>
                          <td className="p-3 text-right font-mono">${line.unit_price.toFixed(2)}</td>
                          <td className="p-3 text-right font-bold font-mono">${(line.quantity * line.unit_price).toFixed(2)}</td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(idx)}
                              className="text-red-500 hover:text-red-700 font-bold p-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 text-right font-black text-sm border-t border-border">
                    Total Orden: ${calculateTotal().toFixed(2)} USD
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Notas / Observaciones (Opcional)</label>
                <textarea
                  rows={2}
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="Condiciones de pago, observaciones, plazo de entrega..."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (poLines.length === 0 && !selectedItemId && !customConcept.trim())}
                  className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-xs font-bold btn-haptic disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Emitiendo...' : 'Emitir Orden de Compra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Inspección y Detalle de la Orden de Compra */}
      {selectedPoForView && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <span className="font-mono text-xs font-bold text-slate-400">Orden de Compra</span>
                <h3 className="text-xl font-black text-foreground">{selectedPoForView.document_number}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPoForView(null)}
                className="text-slate-400 hover:text-foreground p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cabecera de Datos */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-border text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Proveedor</span>
                <span className="font-bold text-foreground text-sm">
                  {selectedPoForView.entity?.name || selectedPoForView.metadata?.supplier_name || 'Proveedor General'}
                </span>
                {selectedPoForView.entity?.tax_id && (
                  <span className="text-slate-500 block text-[11px] font-mono mt-0.5">
                    RIF: {selectedPoForView.entity.tax_id}
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Estado</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    selectedPoForView.status === 'received' || selectedPoForView.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : selectedPoForView.status === 'paid'
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      : selectedPoForView.status === 'annulled'
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  }`}>
                    {selectedPoForView.status === 'received' || selectedPoForView.status === 'completed' 
                      ? 'Recibida en Almacén' 
                      : selectedPoForView.status === 'paid' 
                      ? 'Pagada' 
                      : selectedPoForView.status === 'annulled' 
                      ? 'Anulada' 
                      : 'Emitida / En Tránsito'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Fecha de Emisión</span>
                <span className="font-mono text-slate-600 dark:text-slate-300">
                  {new Date(selectedPoForView.issue_date || selectedPoForView.created_at).toLocaleDateString()}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Monto Total</span>
                <span className="font-black text-foreground text-base">
                  ${Number(selectedPoForView.total_amount || 0).toFixed(2)} USD
                </span>
              </div>
            </div>

            {/* Banner 3-Way Match si existe */}
            {selectedPoForView.metadata?.three_way_match && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-xs text-emerald-700 dark:text-emerald-300">
                <ShieldCheck size={20} className="shrink-0" />
                <div>
                  <p className="font-bold">Conciliada con Éxito (3-Way Match)</p>
                  <p className="text-[11px] opacity-90">
                    Factura N° {selectedPoForView.metadata.three_way_match.supplier_bill_number} · Recibido: ${selectedPoForView.metadata.three_way_match.goods_receipt_amount}
                  </p>
                </div>
              </div>
            )}

            {/* Tabla de Artículos de la Orden */}
            <div>
              <h4 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                <FileText size={14} className="text-slate-400" />
                Desglose de Líneas de la Orden
              </h4>

              {Array.isArray(selectedPoForView.lines) && selectedPoForView.lines.length > 0 ? (
                <div className="border border-border rounded-2xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                      <tr>
                        <th className="p-3">Descripción</th>
                        <th className="p-3 text-center">Cant.</th>
                        <th className="p-3 text-right">Costo U.</th>
                        <th className="p-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedPoForView.lines.map((l: any, i: number) => (
                        <tr key={i}>
                          <td className="p-3 font-semibold text-foreground">{l.description}</td>
                          <td className="p-3 text-center font-mono">{l.quantity}</td>
                          <td className="p-3 text-right font-mono">${Number(l.unit_price || 0).toFixed(2)}</td>
                          <td className="p-3 text-right font-bold font-mono">
                            ${(Number(l.quantity || 1) * Number(l.unit_price || 0)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-border text-center text-xs text-slate-400">
                  Total global registrado: ${Number(selectedPoForView.total_amount || 0).toFixed(2)} USD
                </div>
              )}
            </div>

            {/* Notas si existen */}
            {selectedPoForView.notes && (
              <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-border">
                <span className="font-bold block text-foreground mb-0.5">Observaciones:</span>
                {selectedPoForView.notes}
              </div>
            )}

            {/* Barra de Acciones de Ciclo de Vida */}
            <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedPoForView(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-foreground cursor-pointer"
              >
                Cerrar
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Botón WhatsApp a Proveedor */}
                <button
                  type="button"
                  onClick={() => handleSendPoWhatsApp(selectedPoForView)}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Enviar orden al proveedor por WhatsApp"
                >
                  <MessageCircle size={15} />
                  <span>WhatsApp</span>
                </button>

                {/* Botón Recibir Mercancía (si no fue recibida aún) */}
                {selectedPoForView.status !== 'received' && selectedPoForView.status !== 'completed' && selectedPoForView.status !== 'annulled' && (
                  <button
                    type="button"
                    disabled={isProcessingAction}
                    onClick={() => handleReceiveOrder(selectedPoForView)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <PackageCheck size={15} />
                    {isProcessingAction ? 'Recibiendo...' : 'Recibir Mercancía'}
                  </button>
                )}

                {/* Botón Marcar como Pagada */}
                {selectedPoForView.status !== 'paid' && selectedPoForView.status !== 'annulled' && (
                  <button
                    type="button"
                    disabled={isProcessingAction}
                    onClick={() => handleMarkAsPaid(selectedPoForView)}
                    className="btn-base btn-secondary btn-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} className="text-blue-500" />
                    Marcar como Pagada
                  </button>
                )}

                {/* Botón Anular */}
                {selectedPoForView.status !== 'annulled' && selectedPoForView.status !== 'paid' && (
                  <button
                    type="button"
                    disabled={isProcessingAction}
                    onClick={() => handleAnnulOrder(selectedPoForView)}
                    className="text-red-500 hover:bg-red-500/10 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Anular
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
