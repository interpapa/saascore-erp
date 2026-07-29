'use client';

import { useERPStore } from '@/store/useERPStore';
import { ArrowLeft, Code2, Database, Power } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function StudioAdminPage() {
  const { session } = useERPStore();
  
  // Lista de Módulos Lego disponibles en el Engine
  const [modules, setModules] = useState([
    { id: 'inventory-module-v1', name: 'Catálogo de Inventario', active: true },
    { id: 'pos-module-v1', name: 'Punto de Venta (Caja)', active: true },
    { id: 'accountant-module-v1', name: 'Motor Contable', active: true },
    { id: 'whatsapp-module-v1', name: 'Integración WhatsApp', active: false },
    { id: 'clinic-module-v1', name: 'Historial Médico (Clínicas)', active: false },
  ]);

  if (session?.role !== 'superadmin') {
    return <div className="p-8 text-red-500 font-bold">Acceso Denegado</div>;
  }

  const toggleModule = (id: string) => {
    setModules(modules.map(m => m.id === id ? { ...m, active: !m.active } : m));
  };

  return (
    <div className="min-h-screen bg-background">
      
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-slate-400 hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-slate-800">Lego Studio</h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
          <Code2 size={14} /> Entorno de Arquitectura
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto space-y-8">

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-2">ADN Base del Sistema</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Active o desactive los módulos base que estarán disponibles para su flota de clientes. Esto modifica el JSON estructural de la app sin recompilar.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modules.map(m => (
              <div key={m.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-background">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.active ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                    <Database size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{m.name}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-mono mt-0.5">{m.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleModule(m.id)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${m.active ? 'bg-indigo-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${m.active ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
            <button className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-800 transition-colors">
              <Power size={16} /> Desplegar Cambios a la Flota
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
