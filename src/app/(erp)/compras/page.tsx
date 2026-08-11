'use client';

import { useState, useEffect, useCallback } from 'react';
import { getEntitiesAction, createEntityAction } from '@/app/actions/entities';
import { getDocumentsAction, createDocumentAction } from '@/app/actions/documents';
import { getItemsAction } from '@/app/actions/items';
import { verify3WayMatchAction } from '@/app/actions/procurement';
import { Entity } from '@/lib/api/entities';
import {
  ShoppingCart,
  Plus,
  Truck,
  FileText,
  CheckCircle2,
  Users,
  AlertCircle,
  TrendingUp,
  Receipt,
  Eye,
  Trash2
} from 'lucide-react';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useToast } from '@/components/core/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ComprasPage() {
  const currentTenant = useTenantResolver();
  const { session } = useERPStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'suppliers' | 'pos' | 'match'>('suppliers');
  
  // Data State
  const [suppliers, setSuppliers] = useState<Entity[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals / Assistants State
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);

  // New Supplier Form State
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    email: '',
    phone: '',
    tax_id: '',
    address: '',
  });

  // New PO Assistant State
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poLines, setPoLines] = useState<Array<{
    item_id: string;
    description: string;
    quantity: number;
    unit_price: number;
  }>>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemCost, setItemCost] = useState(0);

  // 3-Way Match State
  const [selectedPoId, setSelectedPoId] = useState('');
  const [goodsReceiptAmt, setGoodsReceiptAmt] = useState<number>(0);
  const [billNumber, setBillNumber] = useState('');
  const [billAmt, setBillAmt] = useState<number>(0);
  const [matchResult, setMatchResult] = useState<any>(null);

  const actor = {
    email: session?.userEmail || 'admin@saascore.com',
    role: session?.role || ('owner' as const),
  };

  const loadData = useCallback(async () => {
    if (!currentTenant?.id) return;
    try {
      setIsLoading(true);
      const [suppliersRes, posRes, itemsRes] = await Promise.all([
        getEntitiesAction(currentTenant.id, 'supplier'),
        getDocumentsAction(currentTenant.id, 'purchase_order'),
        getItemsAction(currentTenant.id),
      ]);

      if (suppliersRes?.success) setSuppliers(suppliersRes.entities || []);
      if (posRes?.success) setPurchaseOrders(posRes.documents || []);
      if (itemsRes?.success) setCatalogItems(itemsRes.items || []);
    } catch (err) {
      console.error('Error loading page data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (isSubscribed) setIsLoading(false);
    }, 2500);

    loadData();

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [loadData]);

  // Handle Create Supplier
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;
    try {
      const res = await createEntityAction(
        {
          type: 'supplier',
          name: newSupplier.name,
          email: newSupplier.email || null,
          phone: newSupplier.phone || null,
          tax_id: newSupplier.tax_id || null,
          address: newSupplier.address || null,
          status: 'active',
        },
        currentTenant.id,
        actor
      );

      if (res.success) {
        toast({ variant: 'info', title: 'Éxito', description: 'Proveedor creado correctamente.' });
        setIsSupplierModalOpen(false);
        setNewSupplier({ name: '', email: '', phone: '', tax_id: '', address: '' });
        loadData();
      } else {
        throw new Error(res.error || 'Error al guardar');
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
    }
  };

  // Add line to current PO draft
  const addPoLine = () => {
    if (!selectedItemId) return;
    const selectedItem = catalogItems.find(i => i.id === selectedItemId);
    if (!selectedItem) return;

    const newLine = {
      item_id: selectedItem.id,
      description: selectedItem.name,
      quantity: itemQty,
      unit_price: itemCost,
    };

    setPoLines([...poLines, newLine]);
    setSelectedItemId('');
    setItemQty(1);
    setItemCost(0);
  };

  const removePoLine = (index: number) => {
    setPoLines(poLines.filter((_, i) => i !== index));
  };

  const calculatedTotal = poLines.reduce((sum, line) => sum + (line.quantity * line.unit_price), 0);

  // Handle Save PO
  const handleSavePO = async () => {
    if (!currentTenant) return;
    if (!selectedSupplierId) {
      toast({ variant: 'error', title: 'Error', description: 'Debe seleccionar un proveedor.' });
      return;
    }
    if (poLines.length === 0) {
      toast({ variant: 'error', title: 'Error', description: 'Debe agregar al menos una línea a la orden de compra.' });
      return;
    }

    try {
      const res = await createDocumentAction(
        {
          entity_id: selectedSupplierId,
          type: 'purchase_order',
          status: 'draft',
          notes: poNotes,
          lines: poLines.map(line => ({
            item_id: line.item_id,
            description: line.description,
            quantity: line.quantity,
            unit_price: line.unit_price,
            tax_amount: 0
          })),
        },
        currentTenant.id,
        actor
      );

      if (res.success) {
        toast({ variant: 'info', title: 'Éxito', description: 'Orden de compra creada correctamente.' });
        setIsPoModalOpen(false);
        setSelectedSupplierId('');
        setPoNotes('');
        setPoLines([]);
        loadData();
      } else {
        throw new Error(res.error || 'Error al guardar');
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
    }
  };

  // 3-Way Match Check
  const handleVerifyMatch = async () => {
    if (!currentTenant) return;
    const selectedPo = purchaseOrders.find(p => p.id === selectedPoId);
    if (!selectedPo) {
      toast({ variant: 'error', title: 'Error', description: 'Seleccione una Orden de Compra válida.' });
      return;
    }

    try {
      // Build mock/mapped models for the backend call validation
      const poObj = {
        id: selectedPo.id,
        tenantId: currentTenant.id,
        supplierId: selectedPo.entity_id || '',
        poNumber: selectedPo.document_number || 'PO-GENERIC',
        totalAmount: selectedPo.total_amount || 0,
        status: 'ordered' as const,
      };

      const receiptObj = {
        id: 'mock-gr-id',
        poId: selectedPo.id,
        receivedAmount: Number(goodsReceiptAmt),
        receivedDate: new Date().toISOString(),
      };

      const billObj = {
        id: 'mock-sb-id',
        poId: selectedPo.id,
        billNumber: billNumber || 'FACT-TEMP',
        billedAmount: Number(billAmt),
      };

      const res = await verify3WayMatchAction(poObj, receiptObj, billObj, currentTenant.id, actor);
      if (res.success) {
        setMatchResult(res.matchResult);
        toast({ variant: 'info', title: 'Verificación Completa', description: 'El reporte de 3-Way Match ha sido generado.' });
      } else {
        throw new Error(res.error || 'Error en la verificación');
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
    }
  };

  // Fill quick values for match simulation
  const loadPoMatchQuickData = (poId: string) => {
    setSelectedPoId(poId);
    setMatchResult(null);
    const po = purchaseOrders.find(p => p.id === poId);
    if (po) {
      setGoodsReceiptAmt(po.total_amount);
      setBillAmt(po.total_amount);
      setBillNumber(`F-${po.document_number.split('-')[1] || '123'}`);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Compras y Abastecimiento (SRM)</h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium mt-0.5">Gestión de proveedores, órdenes de compra y 3-Way Matching</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'suppliers' && (
            <Button onClick={() => setIsSupplierModalOpen(true)} className="flex items-center gap-2">
              <Plus size={18} /> Nuevo Proveedor
            </Button>
          )}
          {activeTab === 'pos' && (
            <Button onClick={() => setIsPoModalOpen(true)} className="flex items-center gap-2">
              <Plus size={18} /> Crear Orden de Compra
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'suppliers'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-2">
            <Users size={16} /> Proveedores
          </span>
        </button>
        <button
          onClick={() => setActiveTab('pos')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'pos'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-2">
            <ShoppingCart size={16} /> Órdenes de Compra (PO)
          </span>
        </button>
        <button
          onClick={() => setActiveTab('match')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'match'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} /> Validación 3-Way Match
          </span>
        </button>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: PROVEEDORES */}
          {activeTab === 'suppliers' && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-border">
                <h2 className="text-lg font-bold text-foreground">Directorio de Proveedores</h2>
                <p className="text-xs text-muted-foreground">Listado general de proveedores registrados en la empresa.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 text-[11px] font-bold text-muted-foreground uppercase border-b border-border">
                      <th className="p-4">Nombre</th>
                      <th className="p-4">RFC / Tax ID</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Teléfono</th>
                      <th className="p-4">Dirección</th>
                      <th className="p-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-sm">
                    {suppliers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No hay proveedores registrados. Crea uno nuevo usando el botón superior.
                        </td>
                      </tr>
                    ) : (
                      suppliers.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all">
                          <td className="p-4 font-semibold text-foreground">{s.name}</td>
                          <td className="p-4 text-muted-foreground">{s.tax_id || '-'}</td>
                          <td className="p-4 text-muted-foreground">{s.email || '-'}</td>
                          <td className="p-4 text-muted-foreground">{s.phone || '-'}</td>
                          <td className="p-4 text-muted-foreground">{s.address || '-'}</td>
                          <td className="p-4">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400">
                              {s.status === 'active' ? 'Activo' : s.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: ÓRDENES DE COMPRA */}
          {activeTab === 'pos' && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-border">
                <h2 className="text-lg font-bold text-foreground">Historial de Órdenes de Compra</h2>
                <p className="text-xs text-muted-foreground">Seguimiento e importes de POs generadas para proveedores.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 text-[11px] font-bold text-muted-foreground uppercase border-b border-border">
                      <th className="p-4">Código PO</th>
                      <th className="p-4">Proveedor</th>
                      <th className="p-4">Fecha de Emisión</th>
                      <th className="p-4 text-right">Monto Total</th>
                      <th className="p-4">Notas</th>
                      <th className="p-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-sm">
                    {purchaseOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No hay órdenes de compra registradas. Crea una usando el botón superior.
                        </td>
                      </tr>
                    ) : (
                      purchaseOrders.map((po) => (
                        <tr key={po.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all">
                          <td className="p-4 font-mono font-bold text-primary">{po.document_number}</td>
                          <td className="p-4 font-semibold text-foreground">{po.entity?.name || 'Proveedor Desconocido'}</td>
                          <td className="p-4 text-muted-foreground">{new Date(po.issue_date).toLocaleDateString()}</td>
                          <td className="p-4 text-right font-bold text-foreground">
                            ${po.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-4 text-muted-foreground max-w-[200px] truncate">{po.notes || '-'}</td>
                          <td className="p-4">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                              {po.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: 3-WAY MATCH */}
          {activeTab === 'match' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form & Config Column */}
              <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Configurar Verificación</h2>
                  <p className="text-xs text-muted-foreground">Carga y simula los datos de recepción y facturación de la PO.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Seleccionar Orden de Compra (PO)</label>
                    <select
                      value={selectedPoId}
                      onChange={(e) => loadPoMatchQuickData(e.target.value)}
                      className="w-full mt-1.5 bg-background border border-border rounded-lg p-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">-- Selecciona una PO --</option>
                      {purchaseOrders.map((po) => (
                        <option key={po.id} value={po.id}>
                          {po.document_number} - {po.entity?.name} (${po.total_amount.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Recibo de Almacén - Cantidad Recibida ($)</label>
                    <Input
                      label=""
                      type="number"
                      step="0.01"
                      placeholder="Monto recibido en almacén"
                      value={goodsReceiptAmt}
                      onChange={(e) => {
                        setGoodsReceiptAmt(Number(e.target.value));
                        setMatchResult(null);
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Número de Factura</label>
                      <Input
                        label=""
                        placeholder="Ej. F-98212"
                        value={billNumber}
                        onChange={(e) => {
                          setBillNumber(e.target.value);
                          setMatchResult(null);
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Importe de Factura ($)</label>
                      <Input
                        label=""
                        type="number"
                        step="0.01"
                        placeholder="Importe cobrado"
                        value={billAmt}
                        onChange={(e) => {
                          setBillAmt(Number(e.target.value));
                          setMatchResult(null);
                        }}
                      />
                    </div>
                  </div>

                  <Button onClick={handleVerifyMatch} className="w-full py-2.5 mt-2" disabled={!selectedPoId}>
                    Ejecutar 3-Way Match
                  </Button>
                </div>
              </div>

              {/* Match Report Column */}
              <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground mb-4">Reporte Comparativo Visual</h2>
                  
                  {selectedPoId ? (
                    (() => {
                      const po = purchaseOrders.find(p => p.id === selectedPoId);
                      if (!po) return null;

                      // Check comparisons
                      const diffGR = Number(goodsReceiptAmt) - po.total_amount;
                      const diffBill = Number(billAmt) - po.total_amount;

                      return (
                        <div className="space-y-6">
                          {/* Visual Grid Comparison */}
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-border">
                              <span className="text-[11px] uppercase font-bold text-muted-foreground">1. Orden de Compra</span>
                              <div className="text-lg font-extrabold text-foreground mt-1">${po.total_amount.toFixed(2)}</div>
                              <span className="text-[11px] text-muted-foreground font-mono">{po.document_number}</span>
                            </div>
                            <div className={`p-4 rounded-xl border transition-all ${
                              diffGR === 0 
                                ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400' 
                                : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'
                            }`}>
                              <span className="text-[11px] uppercase font-bold text-muted-foreground">2. Entrada Física (GR)</span>
                              <div className="text-lg font-extrabold mt-1">${Number(goodsReceiptAmt).toFixed(2)}</div>
                              <span className="text-[11px] font-semibold">
                                {diffGR === 0 ? '✓ Coincide' : `Discrepancia: $${diffGR.toFixed(2)}`}
                              </span>
                            </div>
                            <div className={`p-4 rounded-xl border transition-all ${
                              diffBill === 0 
                                ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400' 
                                : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'
                            }`}>
                              <span className="text-[11px] uppercase font-bold text-muted-foreground">3. Factura de Proveedor</span>
                              <div className="text-lg font-extrabold mt-1">${Number(billAmt).toFixed(2)}</div>
                              <span className="text-[11px] font-semibold">
                                {diffBill === 0 ? '✓ Coincide' : `Discrepancia: $${diffBill.toFixed(2)}`}
                              </span>
                            </div>
                          </div>

                          {/* Matching Verification Status Banner */}
                          {matchResult ? (
                            <div className={`p-4 rounded-xl border flex gap-3 items-start ${
                              matchResult.matched 
                                ? 'bg-green-500/10 border-green-500/30 text-green-800 dark:text-green-300' 
                                : 'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300'
                            }`}>
                              {matchResult.matched ? (
                                <CheckCircle2 className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" size={20} />
                              ) : (
                                <AlertCircle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={20} />
                              )}
                              <div>
                                <h4 className="font-bold text-sm">{matchResult.matched ? 'Validación Exitosa' : 'Validación Fallida'}</h4>
                                <p className="text-xs mt-0.5 opacity-90">{matchResult.statusMessage}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 text-yellow-800 dark:text-yellow-300 rounded-xl flex gap-3 text-xs">
                              <AlertCircle size={16} className="shrink-0" />
                              <span>Presiona "Ejecutar 3-Way Match" para obtener el dictamen de verificación y auditoría.</span>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-2 border border-dashed border-border rounded-xl">
                      <Receipt size={32} className="opacity-40" />
                      <p className="text-sm">Selecciona una orden de compra en la columna de la izquierda para simular el matching.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Nuevo Proveedor */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold mb-4 text-foreground flex items-center gap-2">
              <Users size={20} className="text-primary" />
              Registrar Nuevo Proveedor
            </h3>
            <form onSubmit={handleCreateSupplier} className="space-y-4">
              <Input
                label="Nombre del Proveedor *"
                placeholder="Ej. Importaciones Globales S.A."
                required
                value={newSupplier.name}
                onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
              />
              <Input
                label="RFC / ID Fiscal"
                placeholder="Ej. IMPG123456HB8"
                value={newSupplier.tax_id}
                onChange={(e) => setNewSupplier({ ...newSupplier, tax_id: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Email"
                  type="email"
                  placeholder="proveedor@empresa.com"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                />
                <Input
                  label="Teléfono"
                  placeholder="+52 55 1234 5678"
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                />
              </div>
              <Input
                label="Dirección Física"
                placeholder="Av. Juárez 123, Col. Centro"
                value={newSupplier.address}
                onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
              />

              <div className="flex gap-3 pt-3">
                <Button type="button" variant="outline" className="w-full" onClick={() => setIsSupplierModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="w-full">
                  Guardar Proveedor
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Asistente Interactivo de Órdenes de Compra */}
      {isPoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-2xl w-full shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-foreground flex items-center gap-2">
              <ShoppingCart size={20} className="text-primary" />
              Asistente de Órdenes de Compra (PO)
            </h3>

            <div className="space-y-4">
              {/* Supplier Selection */}
              <div>
                <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Seleccionar Proveedor *</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full mt-1.5 bg-background border border-border rounded-lg p-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- Selecciona un proveedor --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Product Adder from Catalog */}
              <div className="border border-border/80 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Agregar Producto de Catálogo</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground">Producto *</label>
                    <select
                      value={selectedItemId}
                      onChange={(e) => {
                        setSelectedItemId(e.target.value);
                        const item = catalogItems.find(i => i.id === e.target.value);
                        if (item) setItemCost(item.cost || 0);
                      }}
                      className="w-full mt-1 bg-background border border-border rounded-lg p-2 text-sm text-foreground"
                    >
                      <option value="">-- Selecciona --</option>
                      {catalogItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} (SKU: {item.sku || 'N/A'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground">Cantidad *</label>
                    <Input
                      label=""
                      type="number"
                      min="1"
                      value={itemQty}
                      onChange={(e) => setItemQty(Math.max(1, Number(e.target.value)))}
                      className="h-9 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground">Costo Pactado ($) *</label>
                    <Input
                      label=""
                      type="number"
                      step="0.01"
                      value={itemCost}
                      onChange={(e) => setItemCost(Math.max(0, Number(e.target.value)))}
                      className="h-9 mt-1"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button type="button" onClick={addPoLine} disabled={!selectedItemId} className="py-1 px-4 text-xs h-8">
                    Agregar a la PO
                  </Button>
                </div>
              </div>

              {/* Added Lines Table */}
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 font-bold border-b border-border">
                      <th className="p-3">Descripción</th>
                      <th className="p-3 text-right">Cantidad</th>
                      <th className="p-3 text-right">Precio Unitario</th>
                      <th className="p-3 text-right">Total</th>
                      <th className="p-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {poLines.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-5 text-center text-muted-foreground italic">
                          No se han agregado productos a esta orden de compra.
                        </td>
                      </tr>
                    ) : (
                      poLines.map((line, index) => (
                        <tr key={index} className="hover:bg-slate-50/30">
                          <td className="p-3 font-semibold">{line.description}</td>
                          <td className="p-3 text-right">{line.quantity}</td>
                          <td className="p-3 text-right">${line.unit_price.toFixed(2)}</td>
                          <td className="p-3 text-right font-bold">${(line.quantity * line.unit_price).toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => removePoLine(index)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Dynamic Total Box */}
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-border">
                <span className="text-sm font-bold text-foreground">Importe Total Dinámico (USD)</span>
                <span className="text-xl font-extrabold text-primary">${calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Notas u Observaciones</label>
                <textarea
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="Términos de pago, plazos de entrega, especificaciones del pedido..."
                  className="w-full mt-1.5 bg-background border border-border rounded-lg p-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 h-20"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3">
                <Button type="button" variant="outline" className="w-full" onClick={() => setIsPoModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={handleSavePO} className="w-full" disabled={poLines.length === 0 || !selectedSupplierId}>
                  Generar Orden de Compra
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
