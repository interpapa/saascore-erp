'use client';

import { LegoModuleDNA } from '@/types/lego';
import { LegoEngine } from '@/components/lego/LegoEngine';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const teamDNA: LegoModuleDNA = {
  moduleId: 'team-module-v1',
  name: 'Gestión de Equipo',
  layout: [
    {
      id: 'team-stats',
      type: 'stat-grid',
      span: 'full',
      dataSource: 'team-stats-mock',
      config: {
        metrics: [
          { label: 'Empleados Activos', value: '8', icon: 'Users', colorClass: 'bg-blue-100 text-blue-600' },
          { label: 'Nómina Quincenal', value: '4200.00', format: 'currency', icon: 'DollarSign', colorClass: 'bg-emerald-100 text-emerald-600' },
          { label: 'Permisos Pendientes', value: '1', icon: 'ShieldAlert', colorClass: 'bg-amber-100 text-amber-600' }
        ]
      }
    },
    {
      id: 'team-list',
      type: 'list-feed',
      span: 'full',
      dataSource: 'team-list-mock', 
      config: {
        title: 'Nómina Activa',
        columns: [
          { field: 'name', label: 'Empleado' },
          { field: 'role', label: 'Cargo' },
          { field: 'salary', label: 'Salario Base', format: 'currency' },
          { field: 'status', label: 'Estado' }
        ]
      }
    }
  ]
};

export default function EquipoPage() {
  return (
    <div className="absolute inset-0 bg-background overflow-y-auto">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-4 h-14 flex items-center shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 font-semibold text-sm transition-colors btn-haptic px-2 py-1.5 rounded-lg">
          <ArrowLeft size={18} />
          Volver al Launcher
        </Link>
      </div>
      <LegoEngine dna={teamDNA} />
    </div>
  );
}
