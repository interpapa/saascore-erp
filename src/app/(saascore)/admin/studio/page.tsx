'use client';

import { useERPStore } from '@/store/useERPStore';
import { ArrowLeft, Code2, Database, Power, ShieldCheck, Layers, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { MODULE_CATALOG, ModuleId, ModuleDefinition } from '@/lib/core/kernel/moduleRegistry';
import { useToast } from '@/components/core/ToastProvider';

export default function StudioAdminPage() {
  const { session } = useERPStore();
  const { toast } = useToast();
  
  // Lista de Módulos Lego disponibles en el Engine (excluyendo el alias legado 'catalogo')
  const initialModules = Object.values(MODULE_CATALOG)
    .filter(m => m.id !== 'catalogo')
    .map(m => ({
      ...m,
      active: true,
    }));

  const [modules, setModules] = useState<(ModuleDefinition & { active: boolean })[]>(initialModules);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isDeploying, setIsDeploying] = useState(false);

  if (session?.role !== 'superadmin') {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center text-red-500 font-bold">
        Acceso Denegado
      </div>
    );
  }

  const toggleModule = (id: ModuleId) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, active: !m.active } : m));
  };

  const handleDeploy = () => {
    setIsDeploying(true);
    setTimeout(() => {
      setIsDeploying(false);
      toast({
        variant: 'success',
        title: 'Arquitectura Actualizada',
        description: 'Las definiciones de módulos base han sido sincronizadas en el registro del Kernel.',
      });
    }, 600);
  };

  const categories = [
    { id: 'all', label: 'Todos los Módulos' },
    { id: 'comercial', label: 'Comercial & POS' },
    { id: 'operaciones', label: 'Operaciones & Logística' },
    { id: 'finanzas', label: 'Finanzas & Contabilidad' },
    { id: 'administracion', label: 'Administración & Sistema' },
  ];

  const filteredModules = selectedCategory === 'all'
    ? modules
    : modules.filter(m => m.category === selectedCategory);

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'comercial':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'operaciones':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'finanzas':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    }
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
            <p className="text-slate-500 font-medium">Entorno de arquitectura modular y catálogo de componentes base del Kernel</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-500/20">
          <Code2 size={14} /> Kernel Engine v2.0
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              selectedCategory === cat.id
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card text-muted-foreground hover:text-foreground border-border'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">ADN Modular del Sistema</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Módulos Lego registrados en el Kernel. Activar o desactivar un módulo define su disponibilidad global para suscripciones.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Layers size={14} /> {filteredModules.length} módulos listados
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredModules.map(m => (
            <div key={m.id} className="flex items-start justify-between p-4 rounded-2xl border border-border bg-background hover:border-border/80 transition-all">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${m.active ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                  <Database size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground text-sm">{m.name}</h3>
                    {m.isCore && (
                      <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                        Core
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{m.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-mono text-slate-400 bg-muted px-2 py-0.5 rounded">
                      ID: {m.id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${getCategoryBadge(m.category)}`}>
                      {m.category}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => toggleModule(m.id)}
                disabled={m.isCore}
                title={m.isCore ? 'Los módulos Core no se pueden apagar' : undefined}
                className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ml-3 ${
                  m.isCore 
                    ? 'bg-slate-400/50 cursor-not-allowed opacity-60' 
                    : m.active ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${m.active ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Los módulos marcados como <span className="font-bold text-foreground">Core</span> son requeridos para la integridad básica del sistema.
          </p>
          <button 
            onClick={handleDeploy}
            disabled={isDeploying}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 btn-haptic transition-all shadow-sm disabled:opacity-50"
          >
            <Power size={16} /> {isDeploying ? 'Sincronizando...' : 'Desplegar Cambios al Kernel'}
          </button>
        </div>
      </div>
    </div>
  );
}
