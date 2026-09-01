'use client';

import { useState } from 'react';
import { verify3WayMatchAction } from '@/app/actions/procurement';
import { useActionActor } from '@/hooks/useActionActor';
import { useToast } from '@/components/core/ToastProvider';
import { ShieldCheck, CheckCircle2, AlertTriangle, FileCheck, ArrowRight } from 'lucide-react';

interface MatchValidationTabProps {
  purchaseOrders: unknown[];
  tenantId: string;
}

export function MatchValidationTab({ purchaseOrders, tenantId }: MatchValidationTabProps) {
  const actor = useActionActor();
  const { toast } = useToast();

  const [selectedPoId, setSelectedPoId] = useState('');
  const [goodsReceiptAmt, setGoodsReceiptAmt] = useState<number>(0);
  const [billNumber, setBillNumber] = useState('');
  const [billAmt, setBillAmt] = useState<number>(0);
  const [matchResult, setMatchResult] = useState<unknown>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleSelectPo = (poId: string) => {
    setSelectedPoId(poId);
    const po = purchaseOrders.find(p => p.id === poId);
    if (po) {
      const amt = Number(po.total_amount || 0);
      setGoodsReceiptAmt(amt);
      setBillAmt(amt);
      setBillNumber(`FACT-${po.document_number?.slice(-6) || '001'}`);
    }
  };

  const handleValidateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoId) return;

    const poObj = purchaseOrders.find(p => p.id === selectedPoId);
    if (!poObj) return;

    try {
      setIsValidating(true);
      const res = await verify3WayMatchAction(
        {
          id: poObj.id,
          tenantId: tenantId,
          poNumber: poObj.document_number || 'PO-001',
          supplierId: poObj.entity_id || 'SUP-01',
          totalAmount: Number(poObj.total_amount || 0),
          status: 'draft',
        },
        {
          id: `rcpt-${Date.now()}`,
          poId: poObj.id,
          receivedAmount: Number(goodsReceiptAmt),
          receivedDate: new Date().toISOString(),
        },
        {
          id: `bill-${Date.now()}`,
          poId: poObj.id,
          billNumber: billNumber || 'FACT-DEFAULT',
          billedAmount: Number(billAmt),
        },
        tenantId,
        actor
      );

      if (res.success && res.matchResult) {
        setMatchResult(res.matchResult);
        toast({
          variant: res.matchResult.matched ? 'success' : 'error',
          title: res.matchResult.matched ? 'Conciliación Exitosa' : 'Discrepancia Detectada',
          description: res.matchResult.statusMessage || (
            res.matchResult.matched
              ? 'Los montos de la Orden, Entrada e Inspección coinciden al 100%.'
              : 'Se detectó una discrepancia entre la Orden y la Factura del Proveedor.'
          ),
        });
      } else if (res.error) {
        toast({ variant: 'error', title: 'Error', description: res.error });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error de servidor', description: (err as Error).message });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-header */}
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <ShieldCheck size={20} className="text-emerald-500" />
          Validación 3-Way Match (Conciliación Fiscal y Almacén)
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Comprobación tripartita de Orden de Compra, Recepción de Mercancía y Factura del Proveedor
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario de Verificación */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <FileCheck size={16} className="text-primary" />
            Asistente de Conciliación Tripartita
          </h3>

          <form onSubmit={handleValidateMatch} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">1. Seleccionar Orden de Compra (PO)</label>
              <select
                value={selectedPoId}
                onChange={(e) => handleSelectPo(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 font-mono"
              >
                <option value="">-- Seleccionar PO para Conciliar --</option>
                {purchaseOrders.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.document_number} — ${Number(po.total_amount || 0).toFixed(2)} ({po.entity?.name || 'Proveedor'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">2. Monto Recepción Almacén ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={goodsReceiptAmt}
                  onChange={(e) => setGoodsReceiptAmt(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">N° Factura Proveedor</label>
                <input
                  type="text"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  placeholder="Ej. F-99120"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">3. Monto Factura del Proveedor ($)</label>
              <input
                type="number"
                step="0.01"
                value={billAmt}
                onChange={(e) => setBillAmt(Number(e.target.value))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isValidating || !selectedPoId}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all btn-haptic flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isValidating ? 'Verificando...' : 'Ejecutar Validación 3-Way Match'}
              <ArrowRight size={14} />
            </button>
          </form>
        </div>

        {/* Panel de Resultado Visual */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-foreground text-sm mb-4">Resultado del Reporte de Cuadre</h3>

            {!matchResult ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <ShieldCheck size={36} className="mx-auto opacity-30" />
                <p className="text-xs font-semibold">Selecciona una orden de compra y presiona &quot;Ejecutar Validación&quot;</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                  matchResult.matched 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                }`}>
                  {matchResult.matched ? (
                    <CheckCircle2 size={24} className="shrink-0" />
                  ) : (
                    <AlertTriangle size={24} className="shrink-0" />
                  )}
                  <div>
                    <h4 className="font-extrabold text-sm">
                      {matchResult.matched ? 'CONCILIACIÓN APROBADA (MATCH)' : 'DISCREPANCIA ENCONTRADA'}
                    </h4>
                    <p className="text-xs opacity-90 mt-0.5">
                      Diferencia total: <span className="font-mono font-bold">${Number(matchResult.difference || 0).toFixed(2)} USD</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-border text-slate-600 dark:text-slate-300 font-medium">
                    {matchResult.statusMessage}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border text-[11px] text-slate-400">
            * El motor 3-Way Match bloquea automáticamente pagos si la factura del proveedor excede la orden aprobada.
          </div>
        </div>
      </div>
    </div>
  );
}
