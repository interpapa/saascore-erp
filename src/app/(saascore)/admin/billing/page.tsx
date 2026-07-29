'use client';

import { useERPStore } from '@/store/useERPStore';
import { ArrowLeft, Users, DollarSign, Database, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function BillingAdminPage() {
  const { session } = useERPStore();

  if (session?.role !== 'superadmin') {
    return <div className="p-8 text-red-500 font-bold">Acceso Denegado</div>;
  }

  const mockTenants = [
    { id: 'TALLER-001', name: 'Taller Central S.A.', email: 'admin@tallercentral.com', status: 'active', mrr: 49, lastPayment: '2026-06-01' },
    { id: 'TALLER-002', name: 'Mecánica Los Hermanos', email: 'contacto@hermanos.com', status: 'blocked', mrr: 0, lastPayment: '2026-04-15' },
    { id: 'CLINICA-001', name: 'Centro Odontológico Sonrisas', email: 'hola@sonrisas.com', status: 'active', mrr: 99, lastPayment: '2026-06-05' },
  ];

  return (
    <div className="min-h-screen bg-background">
      
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-slate-400 hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-slate-800">Comercial &amp; Facturación</h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
          <ShieldAlert size={14} /> Modo Privacidad: Datos Ocultos
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        
        {/* KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 mb-2 font-semibold text-sm uppercase tracking-wider">
              <Users size={18} /> Instancias
            </div>
            <p className="text-4xl font-black text-slate-800">3</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500">
            <div className="flex items-center gap-3 text-emerald-600 mb-2 font-semibold text-sm uppercase tracking-wider">
              <DollarSign size={18} /> MRR Mensual
            </div>
            <p className="text-4xl font-black text-slate-800">$148.00</p>
          </div>
        </div>

        {/* Listado Seguro de Clientes */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">Flota de Clientes</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">Gestione el estado de las suscripciones. No tiene acceso a datos de la empresa.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background/50 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold border-b border-slate-100">
                  <th className="p-4 pl-6">ID Instancia</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Suscripción</th>
                  <th className="p-4">Último Pago</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 pr-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {mockTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-background transition-colors">
                    <td className="p-4 pl-6 font-mono text-xs text-slate-600 dark:text-slate-400">{t.id}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{t.name}</div>
                      <div className="text-slate-600 dark:text-slate-400 text-xs">{t.email}</div>
                    </td>
                    <td className="p-4 font-medium text-slate-700">${t.mrr}/mes</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{t.lastPayment}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${t.status === 'blocked' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {t.status === 'blocked' ? 'Bloqueado' : 'Al Día'}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      {t.status === 'active' ? (
                        <button className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition-colors">
                          Suspender Servicio
                        </button>
                      ) : (
                        <button className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 transition-colors">
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
    </div>
  );
}
