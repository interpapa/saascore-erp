'use client';

import { useState, useEffect } from 'react';
import { useERPStore } from '@/store/useERPStore';
import { ArrowLeft, Users, DollarSign, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { getAllTenants, toggleTenantStatus } from '@/app/actions/tenant';
import { useToast } from '@/components/core/ToastProvider';
export const dynamic = 'force-dynamic';

export default function BillingAdminPage() {
  const { toast } = useToast();
  const { session } = useERPStore();
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTenants = async () => {
    setIsLoading(true);
    const result = await getAllTenants();
    if (result.success && result.tenants) {
      setTenants(result.tenants);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    setTenants(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    
    const result = await toggleTenantStatus(id, newStatus);
    if (!result.success) {
      toast({ variant: 'error', title: 'Error', description: result.error });
      fetchTenants();
    }
  };

  if (session?.role !== 'superadmin') {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-16 flex items-center justify-center">
        <div className="bg-red-50 text-red-600 p-8 rounded-2xl border border-red-100 flex flex-col items-center gap-4 shadow-sm">
          <ShieldAlert size={48} />
          <h2 className="text-xl font-bold">Acceso Denegado</h2>
          <p className="text-sm">Esta área es exclusiva para Super Administradores.</p>
        </div>
      </div>
    );
  }

  // Simulación de MRR por plan, ya que aún no tenemos Stripe conectado
  const PLAN_PRICES: Record<string, number> = {
    basic: 49,
    pro: 99,
    enterprise: 199
  };

  const totalInstances = tenants.length;
  const activeTenants = tenants.filter(t => t.status === 'active');
  const mrr = activeTenants.reduce((sum, t) => sum + (PLAN_PRICES[t.subscription_plan || 'basic'] || 49), 0);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2.5 rounded-xl bg-card border border-border text-slate-400 hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">Comercial &amp; Facturación</h1>
            <p className="text-slate-500 font-medium">Gestión de suscripciones y facturación del sistema</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
          <ShieldAlert size={14} /> Modo Privacidad: Datos Ocultos
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 mb-2 font-semibold text-sm uppercase tracking-wider">
            <Users size={18} /> Instancias Activas
          </div>
          <p className="text-4xl font-black text-foreground">{activeTenants.length} <span className="text-sm font-medium text-slate-400">/ {totalInstances} total</span></p>
        </div>
        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-3 text-emerald-600 mb-2 font-semibold text-sm uppercase tracking-wider">
            <DollarSign size={18} /> MRR Mensual
          </div>
          <p className="text-4xl font-black text-foreground">${mrr.toFixed(2)}</p>
        </div>
      </div>

      {/* Listado Seguro de Clientes */}
      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Flota de Clientes</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gestione el estado de las suscripciones. No tiene acceso a datos de la empresa.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 text-xs uppercase tracking-wider text-slate-500 font-bold border-b border-border">
                <th className="p-4 pl-6">ID Instancia</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Suscripción</th>
                <th className="p-4">Creado el</th>
                <th className="p-4">Estado</th>
                <th className="p-4 pr-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">Cargando suscripciones...</td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8">
                    <EmptyState
                      icon={<Users size={40} />}
                      title="No hay clientes"
                      description="No se encontraron suscripciones activas registradas"
                    />
                  </td>
                </tr>
              ) : tenants.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 pl-6 font-mono text-xs text-slate-500">{t.id.slice(0, 8)}...</td>
                  <td className="p-4">
                    <div className="font-bold text-foreground">{t.name}</div>
                    <div className="text-slate-500 text-xs uppercase tracking-wider font-semibold">{t.subscription_plan || 'basic'}</div>
                  </td>
                  <td className="p-4 font-medium text-foreground">${PLAN_PRICES[t.subscription_plan || 'basic'] || 49}/mes</td>
                  <td className="p-4 text-slate-500">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${t.status === 'suspended' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                      {t.status === 'suspended' ? 'Suspendido' : 'Al Día'}
                    </span>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    {t.status === 'active' ? (
                      <button 
                        onClick={() => handleToggleStatus(t.id, t.status)}
                        className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-500/20 transition-colors btn-haptic"
                      >
                        Suspender Servicio
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleToggleStatus(t.id, t.status)}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20 transition-colors btn-haptic"
                      >
                        Reactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
