'use client';

import { useState, useEffect } from 'react';
import { Shield, Ban, CheckCircle2, MoreVertical, CreditCard, Trash2 } from 'lucide-react';
import { getAllTenants, toggleTenantStatus, deleteTenantAdminAction } from '@/app/actions/tenant';
import { useToast } from '@/components/core/ToastProvider';
import { EmptyState } from '@/components/core/EmptyState';
import { useERPStore } from '@/store/useERPStore';
import Link from 'next/link';

export default function AdminTenantsPage() {
  const { session } = useERPStore();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTenants = async () => {
    if (!session?.userEmail) return;
    setIsLoading(true);
    const result = await getAllTenants(session.userEmail);
    if (result.success && result.tenants) {
      setTenants(result.tenants);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (session?.userEmail) {
      fetchTenants();
    }
  }, [session?.userEmail]);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    if (!session?.userEmail) return;
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    // Actualización optimista
    setTenants(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    
    const result = await toggleTenantStatus(id, newStatus, session.userEmail);
    if (!result.success) {
      toast({ variant: 'error', title: 'Error', description: result.error });
      fetchTenants(); // Revertir
    }
  };

  const handleDelete = async (id: string) => {
    if (!session?.userEmail) return;
    if (!window.confirm('¿Seguro que quieres borrar a esta empresa de Supabase por completo?')) return;

    setTenants(prev => prev.filter(t => t.id !== id));
    const result = await deleteTenantAdminAction(id, session.userEmail);
    if (result.success) {
      toast({ title: 'Eliminado', description: 'Empresa borrada.' });
    } else {
      toast({ variant: 'error', title: 'Error', description: result.error });
      fetchTenants(); // Revertir
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-1">Gestión de Inquilinos</h1>
          <p className="text-slate-400 font-medium">Control maestro de acceso y facturación de tus clientes SaaS.</p>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm btn-haptic">
          <Shield size={18} /> Nuevo Cliente (Tenant)
        </button>
      </div>

      <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-slate-800/50 border-b border-white/10 text-xs uppercase tracking-wider font-bold text-slate-400">
            <tr>
              <th className="p-4 pl-6">Cliente (Tenant)</th>
              <th className="p-4">Estado</th>
              <th className="p-4">Plan & Módulos</th>
              <th className="p-4">Último Pago</th>
              <th className="p-4 text-right pr-6">Acciones (Kill Switch)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  <div className="flex justify-center mb-2">
                    <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                  Cargando inquilinos...
                </td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8">
                  <EmptyState
                    icon={<Shield size={40} />}
                    title="No hay inquilinos registrados"
                    description="Crea un nuevo inquilino para comenzar a gestionar clientes SaaS"
                  />
                </td>
              </tr>
            ) : tenants.map(tenant => (
              <tr key={tenant.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4 pl-6">
                  <div className="font-bold text-white text-base">{tenant.name}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">ID: {tenant.id}</div>
                </td>
                <td className="p-4">
                  {tenant.status === 'active' ? (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      <CheckCircle2 size={14} /> Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      <Ban size={14} /> Suspendido
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <div className="text-sm text-slate-300 mb-1">
                    <span className="uppercase font-bold text-indigo-400 text-xs">{tenant.subscription_plan || 'basic'}</span>
                  </div>
                  <div className="flex gap-1 flex-wrap max-w-[200px]">
                    {(tenant.active_modules || []).map((mod: string) => (
                      <span key={mod} className="bg-white/10 text-slate-300 text-[10px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider border border-white/5">
                        {mod}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <CreditCard size={14} className={tenant.status === 'suspended' ? 'text-rose-500' : 'text-slate-500'} />
                    {new Date(tenant.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="p-4 pr-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleToggleStatus(tenant.id, tenant.status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        tenant.status === 'active' 
                          ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20' 
                          : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                      }`}
                    >
                      {tenant.status === 'active' ? 'Suspender' : 'Reactivar'}
                    </button>
                    <Link href={`/admin/tenant/${tenant.id}`} className="px-4 py-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition-colors">
                      Gestionar
                    </Link>
                    <button 
                      onClick={() => handleDelete(tenant.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-8 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 flex gap-4">
        <Shield className="text-blue-400 shrink-0 mt-1" />
        <div>
          <h4 className="font-bold text-blue-400 mb-1">Seguridad RLS Activa</h4>
          <p className="text-sm text-slate-400 leading-relaxed">
            Al suspender a un cliente aquí, las políticas de Row Level Security (RLS) en Supabase 
            le bloquearán inmediatamente el acceso a <b>TODAS</b> sus tablas (Facturas, Clientes, Inventario). 
            No hay forma de evadirlo desde el Frontend.
          </p>
        </div>
      </div>
    </div>
  );
}
