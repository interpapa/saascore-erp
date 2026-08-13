'use client';

import { useState } from 'react';
import { X, FileText, Building2, DollarSign, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createDocumentAction } from '@/app/actions/documents';
import { Entity } from '@/lib/api/entities';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  suppliers: Entity[];
}

export function PurchaseOrderModal({ isOpen, onClose, onSuccess, suppliers }: PurchaseOrderModalProps) {
  const currentTenant = useTenantResolver();
  const { session } = useERPStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const actor = {
    email: session?.userEmail || 'admin@saascore.com',
    role: session?.role || ('owner' as const),
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentTenant) return;

    setIsLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const supplierId = form.get('supplier_id') as string;
    const concept = form.get('concept') as string;
    const totalAmount = parseFloat(form.get('total') as string) || 0;
    const status = form.get('status') as any;

    if (!supplierId || !concept || totalAmount <= 0) {
      setError('Por favor complete todos los campos obligatorios correctamente.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await createDocumentAction(
        {
          entity_id: supplierId,
          type: 'purchase_order',
          document_number: `OC-${Date.now().toString().slice(-6)}`,
          status,
          issue_date: new Date().toISOString(),
          notes: concept,
          metadata: { concept },
          lines: [
            {
              description: concept,
              quantity: 1,
              unit_price: totalAmount,
              tax_amount: 0,
            },
          ],
        },
        currentTenant.id,
        actor
      );

      if (!res.success) throw new Error(res.error);
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la orden de compra');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
        <div className="sticky top-0 bg-card z-10 flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
              <FileText size={18} />
            </div>
            Nueva Orden de Compra
          </h2>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Proveedor *</label>
            <div className="relative">
              <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <select 
                name="supplier_id" 
                required
                className="w-full bg-background border border-input rounded-xl px-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
              >
                <option value="">Selecciona un proveedor...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <Input
            name="concept"
            label="Concepto de Compra *"
            placeholder="Ej: Lote de pastillas de freno Toyota"
            icon={<FileText size={18} />}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              name="total"
              type="number"
              step="0.01"
              min="0.01"
              label="Monto Total *"
              placeholder="0.00"
              icon={<DollarSign size={18} />}
              required
            />
            
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Estado</label>
              <select 
                name="status" 
                className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="in_progress">En Tránsito (Pendiente)</option>
                <option value="invoiced">Recibido (Pagado)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex gap-3 sticky bottom-0 bg-card mt-auto">
            <Button type="button" variant="outline" className="w-full" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="w-full" isLoading={isLoading}>Crear Orden</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
