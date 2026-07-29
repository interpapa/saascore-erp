'use client';

import { useState } from 'react';
import { Shield, Ban, CheckCircle2, MoreVertical, CreditCard } from 'lucide-react';

// Mock Data (En producción viene de supabase.from('tenants'))
const MOCK_TENANTS = [
  { id: '1', name: 'Taller Central S.A.', status: 'active', plan: 'pro', active_modules: ['caja', 'crm', 'catalogo'], last_payment: 'Hace 2 días' },
  { id: '2', name: 'AutoFrenos El Rápido', status: 'active', plan: 'basic', active_modules: ['caja', 'catalogo'], last_payment: 'Hace 15 días' },
  { id: '3', name: 'Lubricantes y Filtros', status: 'suspended', plan: 'basic', active_modules: ['caja'], last_payment: 'Hace 45 días (Deuda)' },
];

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState(MOCK_TENANTS);

  const toggleStatus = (id: string) => {
    setTenants(tenants.map(t => {
      if (t.id === id) {
        return { ...t, status: t.status === 'active' ? 'suspended' : 'active' };
      }
      return t;
    }));
    // Aquí haríamos supabase.from('tenants').update({ status: 'suspended' }).eq('id', id);
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">Gestión de Inquilinos</h1>
          <p className="text-slate-400">Control maestro de acceso y facturación de tus clientes SaaS.</p>
        </div>
        <button className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-rose-500/20">
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
            {tenants.map(tenant => (
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
                  <div className="text-sm text-slate-300 mb-1"><span className="uppercase font-bold text-indigo-400 text-xs">{tenant.plan}</span></div>
                  <div className="flex gap-1">
                    {tenant.active_modules.map(mod => (
                      <span key={mod} className="bg-white/10 text-slate-300 text-[10px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider border border-white/5">
                        {mod}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <CreditCard size={14} className={tenant.status === 'suspended' ? 'text-rose-500' : 'text-slate-500'} />
                    {tenant.last_payment}
                  </div>
                </td>
                <td className="p-4 pr-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => toggleStatus(tenant.id)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                        tenant.status === 'active' 
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500 hover:text-white' 
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'
                      }`}
                    >
                      {tenant.status === 'active' ? 'Suspender Acceso' : 'Reactivar'}
                    </button>
                    <button className="p-2 text-slate-500 hover:text-white transition-colors">
                      <MoreVertical size={18} />
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
