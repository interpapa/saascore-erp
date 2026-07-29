'use client';

import { LegoModuleDNA } from '@/types/lego';
import { LegoEngine } from '@/components/lego/LegoEngine';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const whatsappDNA: LegoModuleDNA = {
  moduleId: 'whatsapp-module-v1',
  name: 'Integración WhatsApp',
  layout: [
    {
      id: 'wa-stats',
      type: 'stat-grid',
      span: 'full',
      dataSource: 'wa-stats-mock',
      config: {
        metrics: [
          { label: 'Mensajes Hoy', value: '342', icon: 'MessageCircle', colorClass: 'bg-emerald-100 text-emerald-600' },
          { label: 'En Cola', value: '5', icon: 'Activity', colorClass: 'bg-amber-100 text-amber-600' },
          { label: 'Errores', value: '0', icon: 'ShieldAlert', colorClass: 'bg-red-100 text-red-600' }
        ]
      }
    },
    {
      id: 'wa-list',
      type: 'list-feed',
      span: 'full',
      dataSource: 'wa-queue-mock', 
      config: {
        title: 'Historial de Envios',
        columns: [
          { field: 'client', label: 'Destinatario' },
          { field: 'phone', label: 'Número' },
          { field: 'type', label: 'Tipo de Mensaje' },
          { field: 'status', label: 'Estado' }
        ]
      }
    }
  ]
};

export default function WhatsAppPage() {
  return (
    <div className="absolute inset-0 bg-background overflow-y-auto">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-4 h-14 flex items-center shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 font-semibold text-sm transition-colors btn-haptic px-2 py-1.5 rounded-lg">
          <ArrowLeft size={18} />
          Volver al Launcher
        </Link>
      </div>
      <LegoEngine dna={whatsappDNA} />
    </div>
  );
}
