'use client';

import { useState, useEffect, useCallback } from 'react';
import { getEntitiesAction } from '@/app/actions/entities';
import { Entity } from '@/lib/api/entities';
import { Users, Clock, CreditCard, RefreshCw } from 'lucide-react';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { EmployeeDirectoryTab } from '@/components/equipo/EmployeeDirectoryTab';
import { AttendanceTab } from '@/components/equipo/AttendanceTab';
import { PayrollTab } from '@/components/equipo/PayrollTab';

type TabType = 'directorio' | 'asistencia' | 'nomina';

export default function EquipoPage() {
  const currentTenant = useTenantResolver();
  const [employees, setEmployees] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('directorio');

  const fetchEmployees = useCallback(async () => {
    if (!currentTenant?.id) return;
    try {
      setIsLoading(true);
      const res = await getEntitiesAction(currentTenant.id, 'employee', 50);
      if (res?.success) {
        setEmployees((res.entities as any) || []);
      }
    } catch (err) {
      console.error('Error cargando empleados:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (isSubscribed) setIsLoading(false);
    }, 2500);

    fetchEmployees();

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [fetchEmployees]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Users size={22} />
            </div>
            Gestión de Personal & Nómina
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Directorio de empleados, control de asistencia diario y procesamiento de sueldos
          </p>
        </div>

        <button
          onClick={fetchEmployees}
          disabled={isLoading}
          className="bg-card border border-border hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 btn-haptic self-start sm:self-auto"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Actualizar Personal
        </button>
      </div>

      {/* Tabs de Navegación */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto scrollbar-none">
        {[
          { id: 'directorio', label: 'Directorio de Personal', icon: Users, count: employees.length },
          { id: 'asistencia', label: 'Marcaje & Asistencia', icon: Clock },
          { id: 'nomina', label: 'Procesamiento de Nómina', icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap btn-haptic ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-card border border-border text-slate-600 dark:text-slate-400 hover:text-foreground'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Contenido Modular */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-xs font-medium flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Cargando personal...
        </div>
      ) : (
        <>
          {activeTab === 'directorio' && (
            <EmployeeDirectoryTab
              employees={employees}
              tenantId={currentTenant.id}
              onRefresh={fetchEmployees}
            />
          )}

          {activeTab === 'asistencia' && (
            <AttendanceTab employees={employees} />
          )}

          {activeTab === 'nomina' && (
            <PayrollTab
              employees={employees}
              tenantId={currentTenant.id}
            />
          )}
        </>
      )}

    </div>
  );
}
