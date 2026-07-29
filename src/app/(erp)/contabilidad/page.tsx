'use client';

import { LegoModuleDNA } from '@/types/lego';
import { LegoEngine } from '@/components/lego/LegoEngine';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const accountantDNA: LegoModuleDNA = {
  moduleId: 'accountant-module-v1',
  name: 'Contabilidad (Partida Doble)',
  layout: [
    {
      id: 'acc-stats',
      type: 'stat-grid',
      span: 'full',
      dataSource: 'acc-stats-mock',
      config: {
        metrics: [
          { label: 'Ingresos Totales', value: '12400.00', format: 'currency', icon: 'DollarSign', colorClass: 'bg-emerald-100 text-emerald-600' },
          { label: 'Cuentas x Pagar', value: '3200.00', format: 'currency', icon: 'DollarSign', colorClass: 'bg-red-100 text-red-600' },
          { label: 'Asientos Hoy', value: '45', icon: 'Activity', colorClass: 'bg-indigo-100 text-indigo-600' }
        ]
      }
    },
    {
      id: 'acc-list',
      type: 'list-feed',
      span: 'full',
      dataSource: 'acc-journal-mock', 
      config: {
        title: 'Libro Diario',
        columns: [
          { field: 'account', label: 'Cuenta' },
          { field: 'ref', label: 'Referencia' },
          { field: 'amount', label: 'Monto', format: 'currency' },
          { field: 'type', label: 'Tipo' }
        ]
      }
    }
  ]
};

export default function ContabilidadPage() {
  return (
    <div className="absolute inset-0 bg-background overflow-y-auto">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-4 h-14 flex items-center shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 font-semibold text-sm transition-colors btn-haptic px-2 py-1.5 rounded-lg">
          <ArrowLeft size={18} />
          Volver al Launcher
        </Link>
      </div>
      <LegoEngine dna={accountantDNA} />
    </div>
  );
}
