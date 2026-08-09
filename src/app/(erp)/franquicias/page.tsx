'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, MapPin, DollarSign, Crown, Phone, Users, Activity, BarChart3, Search } from 'lucide-react';
import { getEntitiesAction } from '@/app/actions/entities';
import { getDocumentsAction } from '@/app/actions/documents';
import { Entity } from '@/lib/api/entities';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { BranchModal } from '@/components/franquicias/BranchModal';

export default function FranquiciasPage() {
  const currentTenant = useTenantResolver();
  const [branches, setBranches] = useState<Entity[]>([]);
  const [globalRevenue, setGlobalRevenue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    if (!currentTenant) return;
    try {
      setIsLoading(true);
      const [branchesRes, invoicesRes] = await Promise.all([
        getEntitiesAction(currentTenant.id, 'branch'),
        getDocumentsAction(currentTenant.id, 'invoice')
      ]);

      if (branchesRes.success) setBranches(branchesRes.entities as any);

      if (invoicesRes.success) {
        const totalRev = invoicesRes.documents
          .filter((doc: any) => doc.status === 'invoiced' || doc.status === 'paid')
          .reduce((sum: number, doc: any) => sum + (doc.total_amount || 0), 0);
        setGlobalRevenue(totalRev);
      }

    } catch (err) {
      console.error('Error fetching franquicias data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentTenant]);

  // KPIs
  const activeBranches = branches.length;
  // Determinamos topBranch (como mock usando la más reciente por ahora)
  const topBranch = branches.length > 0 ? branches[0].name : '-';

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (b.metadata?.manager || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Red de Sucursales</h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Control unificado de múltiples sedes o franquicias</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 btn-haptic shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
        >
          <Plus size={18} />
          Nueva Sucursal
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Ventas Globales</h3>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-foreground relative z-10">${globalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        
        <div className="bg-card border border-border p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Sedes Activas</h3>
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center">
              <Building2 size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-foreground relative z-10">{activeBranches}</p>
        </div>

        <div className="bg-card border border-border p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Top Sucursal</h3>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center">
              <Crown size={20} />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground truncate relative z-10" title={topBranch}>{topBranch}</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* Toolbar */}
        <div className="border-b border-border p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="text-primary" size={24} />
            Directorio Geográfico
          </h2>
          
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o gerente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium"
            />
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 p-4 sm:p-6 bg-slate-50/30 dark:bg-slate-900/10">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Building2 size={56} className="mb-4 opacity-40" />
              <p className="font-semibold text-lg text-foreground mb-1">Sin Sucursales</p>
              <p className="text-sm text-center max-w-sm">No has agregado ninguna sucursal aún. Expande tu operación creando la primera.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBranches.map(branch => (
                <div key={branch.id} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:border-primary/50 transition-all hover:shadow-lg group flex flex-col">
                  
                  {/* Card Header (Map simulation) */}
                  <div className="h-24 bg-slate-100 dark:bg-slate-800/50 relative overflow-hidden border-b border-border">
                    <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
                         style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                    <div className="absolute -bottom-6 left-6">
                      <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 border-4 border-white dark:border-slate-950 shadow-md flex items-center justify-center">
                        <Building2 className="text-primary" size={28} />
                      </div>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Operativa
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 pt-8 flex-1 flex flex-col">
                    <h3 className="font-bold text-foreground text-xl mb-1 group-hover:text-primary transition-colors line-clamp-1">{branch.name}</h3>
                    <p className="text-sm text-slate-500 mb-6 flex items-start gap-1.5">
                      <MapPin size={14} className="mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{branch.address || 'Ubicación no especificada'}</span>
                    </p>

                    <div className="space-y-3 mt-auto">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <Users size={14} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Gerente</p>
                            <p className="text-sm font-semibold text-foreground">{branch.metadata?.manager || 'No asignado'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 text-sm px-2">
                        <Phone size={14} className="text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-300 font-medium">{branch.phone || 'Sin número'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Card Footer */}
                  <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                    <button className="text-sm font-bold text-slate-500 hover:text-primary transition-colors flex items-center gap-1.5">
                      <BarChart3 size={16} />
                      Métricas
                    </button>
                    <button className="text-sm font-bold text-slate-500 hover:text-primary transition-colors flex items-center gap-1.5">
                      <Activity size={16} />
                      Inventario
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BranchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
