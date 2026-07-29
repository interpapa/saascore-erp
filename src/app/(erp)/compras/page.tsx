'use client';

import { LegoModuleDNA } from '@/types/lego';
import { LegoEngine } from '@/components/lego/LegoEngine';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const comprasDNA: LegoModuleDNA = {
  moduleId: 'purchases-module-v1',
  name: 'Compras a Proveedores',
  layout: [
    {
      id: 'pur-stats',
      type: 'stat-grid',
      span: 'full',
      dataSource: 'pur-stats-mock',
      config: {
        metrics: [
          { label: 'Cuentas x Pagar', value: '3450.00', format: 'currency', icon: 'DollarSign', colorClass: 'bg-red-100 text-red-600' },
          { label: 'Órdenes en Tránsito', value: '3', icon: 'Box', colorClass: 'bg-amber-100 text-amber-600' },
          { label: 'Proveedores Activos', value: '12', icon: 'Users', colorClass: 'bg-blue-100 text-blue-600' }
        ]
      }
    },
    {
      id: 'pur-list',
      type: 'list-feed',
      span: 'full',
      dataSource: 'pur-orders-mock', 
      config: {
        title: 'Historial de Compras',
        columns: [
          { field: 'supplier', label: 'Proveedor' },
          { field: 'orderId', label: 'ID Orden' },
          { field: 'total', label: 'Monto Total', format: 'currency' },
          { field: 'status', label: 'Estado' }
        ]
      }
    }
  ]
};

export default function ComprasPage() {
  return (
    <div className="absolute inset-0 bg-background overflow-y-auto">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-4 h-14 flex items-center shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 font-semibold text-sm transition-colors btn-haptic px-2 py-1.5 rounded-lg">
          <ArrowLeft size={18} />
          Volver al Launcher
        </Link>
      </div>
      <LegoEngine dna={comprasDNA} />
    </div>
  );
}
