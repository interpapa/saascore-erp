'use client';

import { LegoModuleDNA } from '@/types/lego';
import { LegoEngine } from '@/components/lego/LegoEngine';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const calendarDNA: LegoModuleDNA = {
  moduleId: 'calendar-module-v1',
  name: 'Calendario y Citas',
  layout: [
    {
      id: 'cal-stats',
      type: 'stat-grid',
      span: 'full',
      dataSource: 'cal-stats-mock',
      config: {
        metrics: [
          { label: 'Citas Hoy', value: '12', icon: 'CalendarDays', colorClass: 'bg-blue-100 text-blue-600' },
          { label: 'Pendientes', value: '4', icon: 'ShieldAlert', colorClass: 'bg-amber-100 text-amber-600' },
          { label: 'Completadas', value: '8', icon: 'Activity', colorClass: 'bg-emerald-100 text-emerald-600' }
        ]
      }
    },
    {
      id: 'cal-list',
      type: 'list-feed',
      span: 'full',
      dataSource: 'cal-events-mock', 
      config: {
        title: 'Agenda del Día',
        columns: [
          { field: 'title', label: 'Evento' },
          { field: 'time', label: 'Hora' },
          { field: 'client', label: 'Cliente' },
          { field: 'status', label: 'Estado' }
        ]
      }
    }
  ]
};

export default function CalendarioPage() {
  return (
    <div className="absolute inset-0 bg-background overflow-y-auto">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-4 h-14 flex items-center shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 font-semibold text-sm transition-colors btn-haptic px-2 py-1.5 rounded-lg">
          <ArrowLeft size={18} />
          Volver al Launcher
        </Link>
      </div>
      <LegoEngine dna={calendarDNA} />
    </div>
  );
}
