'use client';

import { useState, useEffect, useCallback } from 'react';
import { getEntitiesAction } from '@/app/actions/entities';
import { getAuditLogsAction } from '@/app/actions/audit';
import { Entity } from '@/lib/api/entities';
import { Users, Clock, CreditCard, RefreshCw, Activity } from 'lucide-react';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { EmployeeDirectoryTab } from '@/components/equipo/EmployeeDirectoryTab';
import { AttendanceTab } from '@/components/equipo/AttendanceTab';
import { PayrollTab } from '@/components/equipo/PayrollTab';
import { SkeletonCardGrid, SkeletonCard } from '@/components/ui/SkeletonCard';
import { SkeletonTable } from '@/components/ui/SkeletonTable';
import { UnderlineTabs } from '@/components/ui/Tabs';
import { AuditTrailSection } from '@/components/ui/AuditTrailSection';

type TabType = 'directorio' | 'asistencia' | 'nomina' | 'audit';

export default function EquipoPage() {
  const currentTenant = useTenantResolver();
  const [employees, setEmployees] = useState<Entity[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
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

  const loadAuditLogs = useCallback(async () => {
    if (!currentTenant?.id) return;
    try {
      setIsLoadingAudit(true);
      // Consultar logs de auditoría generales
      const res = await getAuditLogsAction(currentTenant.id, 'entity', 40);
      if (res.success) {
        // Filtrar del lado del cliente por acciones de equipo (employee, payroll)
        const teamLogs = res.logs.filter(
          (l: any) => l.action.includes('payroll') || l.action.includes('entity') || l.action.includes('employee')
        );
        setAuditLogs(teamLogs.length > 0 ? teamLogs : res.logs);
      }
    } catch (err) {
      console.error('Error cargando auditoría de personal:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Cargar logs al cambiar a la pestaña de auditoría
  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab, loadAuditLogs]);

  const tabs = [
    { id: 'directorio', label: 'Directorio de Personal', icon: Users, count: employees.length },
    { id: 'asistencia', label: 'Marcaje & Asistencia', icon: Clock },
    { id: 'nomina', label: 'Procesamiento de Nómina', icon: CreditCard },
    { id: 'audit', label: 'Auditoría de Personal', icon: Activity },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-300 relative z-10">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3 font-sans">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
              <Users size={22} />
            </div>
            Gestión de Personal & Nómina
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1 font-sans">
            Directorio de empleados, control de asistencia diario y procesamiento de sueldos
          </p>
        </div>

        <button
          onClick={fetchEmployees}
          disabled={isLoading}
          className="btn-base btn-secondary btn-sm flex items-center gap-2"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Actualizar Personal
        </button>
      </div>

      {/* Tabs de Navegación Stripe-Style */}
      <UnderlineTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as TabType)}
      />

      {/* Contenido Modular */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-2xl p-6">
          {activeTab === 'directorio' ? (
            <SkeletonCardGrid count={4} columns={2} showAvatar />
          ) : (
            <SkeletonTable rows={5} columns={4} />
          )}
        </div>
      ) : (
        <>
          {activeTab === 'directorio' && (
            <EmployeeDirectoryTab
              employees={employees}
              tenantId={currentTenant?.id || ''}
              onRefresh={fetchEmployees}
            />
          )}

          {activeTab === 'asistencia' && (
            <AttendanceTab employees={employees} tenantId={currentTenant?.id || ''} />
          )}

          {activeTab === 'nomina' && (
            <PayrollTab
              employees={employees}
              tenantId={currentTenant?.id || ''}
            />
          )}

          {activeTab === 'audit' && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="mb-4">
                <h3 className="text-h3 font-bold text-foreground font-sans">Bitácora de Recursos Humanos</h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">Historial cronológico de registros de empleados, asistencia y procesamiento de nóminas.</p>
              </div>
              <AuditTrailSection logs={auditLogs} isLoading={isLoadingAudit} />
            </div>
          )}
        </>
      )}

    </div>
  );
}
