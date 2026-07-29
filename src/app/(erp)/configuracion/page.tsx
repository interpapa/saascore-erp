'use client';

import { LegoModuleDNA } from '@/types/lego';
import { LegoEngine } from '@/components/lego/LegoEngine';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const configDNA: LegoModuleDNA = {
  moduleId: 'config-module-v1',
  name: 'Ajustes del Sistema',
  layout: [
    {
      id: 'cfg-list',
      type: 'list-feed',
      span: 'full',
      dataSource: 'cfg-options-mock', 
      config: {
        title: 'Opciones de Instancia',
        columns: [
          { field: 'setting', label: 'Ajuste' },
          { field: 'desc', label: 'Descripción' },
          { field: 'value', label: 'Valor Actual' },
          { field: 'status', label: 'Estado' }
        ]
      }
    }
  ]
};

export default function ConfiguracionPage() {
  return (
    <div className="absolute inset-0 bg-background overflow-y-auto">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-4 h-14 flex items-center shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 font-semibold text-sm transition-colors btn-haptic px-2 py-1.5 rounded-lg">
          <ArrowLeft size={18} />
          Volver al Launcher
        </Link>
      </div>
      <LegoEngine dna={configDNA} />
    </div>
  );
}
