'use client';

import { useState } from 'react';
import { Entity } from '@/lib/api/entities';
import { createEntityAction } from '@/app/actions/entities';
import { useActionActor } from '@/hooks/useActionActor';
import { useToast } from '@/components/core/ToastProvider';
import { Users, Plus, Building2, Mail, Phone, FileText } from 'lucide-react';

interface SupplierTabProps {
  suppliers: Entity[];
  tenantId: string;
  onRefresh: () => void;
}

export function SupplierTab({ suppliers, tenantId, onRefresh }: SupplierTabProps) {
  const actor = useActionActor();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    tax_id: '',
    address: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await createEntityAction(
        {
          type: 'supplier',
          name: form.name,
          email: form.email || null,
          phone: form.phone || null,
          tax_id: form.tax_id || null,
          address: form.address || null,
        },
        tenantId,
        actor
      );

      if (res.success) {
        toast({ variant: 'success', title: 'Proveedor Registrado', description: `Se ha registrado ${form.name} correctamente.` });
        setForm({ name: '', email: '', phone: '', tax_id: '', address: '' });
        setIsModalOpen(false);
        onRefresh();
      } else {
        toast({ variant: 'error', title: 'Error', description: res.error || 'No se pudo guardar el proveedor.' });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error de servidor', description: (err as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Building2 size={20} className="text-amber-500" />
            Directorio de Proveedores
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Gestión de proveedores para órdenes de compra y cuentas por pagar
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 btn-haptic shadow-xs"
        >
          <Plus size={16} />
          Nuevo Proveedor
        </button>
      </div>

      {/* Grid de Proveedores */}
      {suppliers.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-3xl space-y-3">
          <Users size={36} className="mx-auto text-slate-400 opacity-50" />
          <p className="text-sm font-bold text-foreground">No hay proveedores registrados</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Agrega tus proveedores comerciales para emitir órdenes de compra y conciliar inventario.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((sup) => (
            <div key={sup.id} className="bg-card border border-border rounded-2xl p-5 shadow-xs hover:border-amber-500/30 transition-all space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-sm">
                  {sup.name.slice(0, 2).toUpperCase()}
                </div>
                {sup.tax_id && (
                  <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md">
                    RIF: {sup.tax_id}
                  </span>
                )}
              </div>

              <div>
                <h3 className="font-bold text-foreground text-sm tracking-tight">{sup.name}</h3>
                <p className="text-slate-400 text-xs truncate mt-0.5">{sup.address || 'Sin dirección registrada'}</p>
              </div>

              <div className="pt-2 border-t border-border space-y-1 text-xs text-slate-500">
                {sup.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-slate-400" />
                    <span className="truncate">{sup.email}</span>
                  </div>
                )}
                {sup.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-slate-400" />
                    <span>{sup.phone}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nuevo Proveedor */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-foreground mb-4">Registrar Nuevo Proveedor</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Nombre Comercial / Razón Social *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej. Distribuidora Automotriz C.A."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Identificación / RIF</label>
                  <input
                    type="text"
                    value={form.tax_id}
                    onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
                    placeholder="J-12345678-0"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+58 412 1234567"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ventas@proveedor.com"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Dirección Física</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Av. Principal, Edificio Central"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-xs font-bold btn-haptic"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
