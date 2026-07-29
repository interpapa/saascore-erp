'use client';

import { LegoModuleDNA } from '@/types/lego';
import { LegoEngine } from '@/components/lego/LegoEngine';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const ticketsDNA: LegoModuleDNA = {
  moduleId: 'tickets-module-v1',
  name: 'Gestión de Tickets / Órdenes',
  layout: [
    {
      id: 'tickets-stats',
      type: 'stat-grid',
      span: 'full',
      dataSource: 'tickets-stats-mock',
      config: {
        metrics: [
          { label: 'Tickets Abiertos', value: '24', icon: 'ListChecks', colorClass: 'bg-indigo-100 text-indigo-600' },
          { label: 'Urgentes', value: '3', icon: 'ShieldAlert', colorClass: 'bg-red-100 text-red-600' },
          { label: 'Completados Hoy', value: '8', icon: 'Activity', colorClass: 'bg-emerald-100 text-emerald-600' }
        ]
      }
    },
    {
      id: 'tickets-list',
      type: 'list-feed',
      span: 'full',
      dataSource: 'tickets-data', 
      config: {
        title: 'Órdenes en Curso',
        columns: [
          { field: 'title', label: 'Asunto' },
          { field: 'client', label: 'Cliente' },
          { field: 'amount', label: 'Cotización', format: 'currency' },
          { field: 'status', label: 'Estado' }
        ]
      }
    }
  ]
};

export default function TicketsPage() {
  return (
    <div className="absolute inset-0 bg-background overflow-y-auto">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-4 h-14 flex items-center shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 font-semibold text-sm transition-colors btn-haptic px-2 py-1.5 rounded-lg">
          <ArrowLeft size={18} />
          Volver al Launcher
        </Link>
      </div>
      <LegoEngine dna={ticketsDNA} />
    </div>
  );
}
