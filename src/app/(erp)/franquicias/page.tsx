'use client';

import { LegoModuleDNA } from '@/types/lego';
import { LegoEngine } from '@/components/lego/LegoEngine';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const franquiciasDNA: LegoModuleDNA = {
  moduleId: 'franchise-module-v1',
  name: 'Dashboard Multi-Sucursal',
  layout: [
    {
      id: 'fran-stats',
      type: 'stat-grid',
      span: 'full',
      dataSource: 'fran-stats-mock',
      config: {
        metrics: [
          { label: 'Ventas Globales', value: '154,200', format: 'currency', icon: 'DollarSign', colorClass: 'bg-emerald-100 text-emerald-600' },
          { label: 'Sucursales Activas', value: '4', icon: 'Building2', colorClass: 'bg-indigo-100 text-indigo-600' },
          { label: 'Sucursal Top', value: 'Norte', icon: 'Crown', colorClass: 'bg-amber-100 text-amber-600' }
        ]
      }
    },
    {
      id: 'fran-list',
      type: 'list-feed',
      span: 'full',
      dataSource: 'fran-branches-mock', 
      config: {
        title: 'Desempeño por Sucursal',
        columns: [
          { field: 'name', label: 'Sucursal' },
          { field: 'manager', label: 'Gerente' },
          { field: 'revenue', label: 'Ingresos Mes', format: 'currency' },
          { field: 'status', label: 'Estado' }
        ]
      }
    }
  ]
};

export default function FranquiciasPage() {
  return (
    <div className="absolute inset-0 bg-background overflow-y-auto">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-4 h-14 flex items-center shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 font-semibold text-sm transition-colors btn-haptic px-2 py-1.5 rounded-lg">
          <ArrowLeft size={18} />
          Volver al Launcher
        </Link>
      </div>
      <LegoEngine dna={franquiciasDNA} />
    </div>
  );
}
