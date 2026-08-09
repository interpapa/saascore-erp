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
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center text-red-500 font-bold">
        Acceso Denegado
      </div>
    );
  }

  const toggleModule = (id: string) => {
    setModules(modules.map(m => m.id === id ? { ...m, active: !m.active } : m));
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2.5 rounded-xl bg-card border border-border text-slate-400 hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">Lego Studio</h1>
            <p className="text-slate-500 font-medium">Entorno de arquitectura y gestión de componentes base</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-500/20">
          <Code2 size={14} /> Entorno de Arquitectura
        </div>
      </div>

      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden p-6">
        <h2 className="text-lg font-bold text-foreground mb-2">ADN Base del Sistema</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Active o desactive los módulos base que estarán disponibles para su flota de clientes. Esto modifica el JSON estructural de la app sin recompilar.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map(m => (
            <div key={m.id} className="flex items-center justify-between p-4 rounded-2xl border border-border bg-background">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.active ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                  <Database size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">{m.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{m.id}</p>
                </div>
              </div>
              <button 
                onClick={() => toggleModule(m.id)}
                className={`w-12 h-6 rounded-full relative transition-colors ${m.active ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${m.active ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-border flex justify-end">
          <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 btn-haptic transition-all shadow-sm">
            <Power size={16} /> Desplegar Cambios a la Flota
          </button>
        </div>
      </div>
    </div>
  );
}
