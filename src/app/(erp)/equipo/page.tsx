'use client';

import { useState, useEffect, useCallback } from 'react';
import { getEntitiesAction } from '@/app/actions/entities';
import { getAuditLogsAction } from '@/app/actions/audit';
import { Entity } from '@/lib/api/entities';
import { Users, CreditCard, RefreshCw, Activity } from 'lucide-react';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useActionActor } from '@/hooks/useActionActor';
import { useERPStore } from '@/store/useERPStore';
import { useToast } from '@/components/core/ToastProvider';
import { EmployeeDirectoryTab } from '@/components/equipo/EmployeeDirectoryTab';
import { PayrollTab } from '@/components/equipo/PayrollTab';
import { SkeletonCardGrid } from '@/components/ui/SkeletonCard';
import { SkeletonTable } from '@/components/ui/SkeletonTable';
import { UnderlineTabs } from '@/components/ui/Tabs';
import { AuditTrailSection } from '@/components/ui/AuditTrailSection';
import { supabase } from '@/lib/supabase';

type TabType = 'directorio' | 'nomina' | 'audit';

interface EmployeeDiagnostic {
  timestamp: string;
  tenantId: string;
  tenantName: string;
  actorEmail?: string;
  actorRole?: string;
  error: string;
  errorCode?: string;
  dbDiagnostic?: any;
  trace?: Array<{ step: string; label: string; status: string; details?: string; timestamp: string }>;
  rawResponse?: any;
}

export default function EquipoPage() {
  const currentTenant = useTenantResolver();
  const actor = useActionActor();
  const session = useERPStore(s => s.session);
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Entity[]>([]);
  const [auditLogs, setAuditLogs] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('directorio');
  const [diagnosticInfo, setDiagnosticInfo] = useState<EmployeeDiagnostic | null>(null);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [hasCopiedDiagnostic, setHasCopiedDiagnostic] = useState(false);

  const copyDiagnosticToClipboard = () => {
    if (!diagnosticInfo) return;
    const report = [
      `=== DIAGNÓSTICO DE COLABORADORES RENDO ERP ===`,
      `Fecha/Hora: ${diagnosticInfo.timestamp}`,
      `Error: ${diagnosticInfo.error}`,
      diagnosticInfo.errorCode ? `Código de Error: ${diagnosticInfo.errorCode}` : '',
      `Tenant ID: ${diagnosticInfo.tenantId}`,
      `Organización: ${diagnosticInfo.tenantName}`,
      `Actor: ${diagnosticInfo.actorEmail || 'No identificado'} (${diagnosticInfo.actorRole || 'N/A'})`,
      ``,
      `--- TRAZA DE EJECUCIÓN (PASO A PASO) ---`,
      ...(diagnosticInfo.trace || []).map(t => `[${t.status.toUpperCase()}] ${t.step} - ${t.label}${t.details ? `: ${t.details}` : ''}`),
      ``,
      `--- DIAGNÓSTICO DE BASE DE DATOS (POSTGRESQL) ---`,
      JSON.stringify(diagnosticInfo.dbDiagnostic || {}, null, 2),
      ``,
      `--- RESPUESTA BRUTA ---`,
      JSON.stringify(diagnosticInfo.rawResponse || {}, null, 2),
    ].filter(Boolean).join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(report);
      setHasCopiedDiagnostic(true);
      setTimeout(() => setHasCopiedDiagnostic(false), 3000);
    }
  };

  const fetchEmployees = useCallback(async () => {
    if (!currentTenant?.id) return;
    
    // Obtener actor en caliente evitando closures estancadas
    const currentSession = useERPStore.getState().session;
    const activeActor = actor || (currentSession?.userEmail ? {
      email: currentSession.userEmail,
      role: currentSession.role || 'owner',
      token: currentSession.token,
    } : null);

    setIsLoading(true);
    let trace: any[] = [];
    let dbDiag: any = null;
    let primaryError = '';
    let primaryCode = '';

    try {
      // 1. Intento primario: Server Action
      if (activeActor) {
        try {
          const res = await getEntitiesAction(currentTenant.id, 'employee', 100, activeActor);
          if (res?.success && Array.isArray(res.entities)) {
            const mapped = res.entities.map(e => ({
              ...e,
              is_resource: Boolean((e as any).is_resource || e.metadata?.is_resource),
              metadata: {
                ...e.metadata,
                is_resource: Boolean((e as any).is_resource || e.metadata?.is_resource),
                resource_type: e.metadata?.resource_type || (Boolean((e as any).is_resource || e.metadata?.is_resource) ? 'space' : 'human')
              }
            }));
            setEmployees(mapped);
            setDiagnosticInfo(null);
            setIsLoading(false);
            return;
          } else {
            primaryError = res?.error || 'No se pudieron recuperar los colaboradores vía Server Action.';
            primaryCode = res?.errorCode || 'SERVER_ACTION_FAILED';
            dbDiag = res?.dbDiagnostic;
          }
        } catch (saErr: any) {
          primaryError = saErr?.message || 'Error en Server Action';
        }
      }

      // 2. Intento secundario: Endpoint REST resiliente con diagnóstico paso a paso
      try {
        const qs = new URLSearchParams({
          tenantId: currentTenant.id,
          actorEmail: activeActor?.email || '',
          limit: '100',
        });
        const restResp = await fetch(`/api/employees?${qs.toString()}`, { cache: 'no-store' });
        const restData = await restResp.json().catch(() => ({}));
        
        trace = restData.trace || [];
        if (restResp.ok && restData.success && Array.isArray(restData.employees)) {
          setEmployees(restData.employees);
          setDiagnosticInfo(null);
          setIsLoading(false);
          return;
        }

        // Si el endpoint REST reporta error de base de datos
        const errMessage = restData.error || primaryError || 'Error al obtener colaboradores de la base de datos.';
        const errCode = restData.errorCode || primaryCode || 'DB_FETCH_ERROR';
        dbDiag = restData.dbDiagnostic || dbDiag;

        setDiagnosticInfo({
          timestamp: new Date().toISOString(),
          tenantId: currentTenant.id,
          tenantName: currentTenant.name || 'Empresa actual',
          actorEmail: activeActor?.email,
          actorRole: activeActor?.role,
          error: errMessage,
          errorCode: errCode,
          dbDiagnostic: dbDiag,
          trace,
          rawResponse: restData,
        });

        toast({
          variant: 'error',
          title: 'Error de Base de Datos en Colaboradores',
          description: errMessage,
        });
      } catch (restErr: any) {
        console.error('[Equipo] Fallback REST falló:', restErr);
        setDiagnosticInfo({
          timestamp: new Date().toISOString(),
          tenantId: currentTenant.id,
          tenantName: currentTenant.name || 'Empresa actual',
          actorEmail: activeActor?.email,
          actorRole: activeActor?.role,
          error: restErr?.message || primaryError || 'Error de conexión con la base de datos',
          errorCode: 'CONNECTION_FAILURE',
          dbDiagnostic: dbDiag,
          trace,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant?.id, currentTenant?.name, actor, toast]);

  const loadAuditLogs = useCallback(async () => {
    if (!currentTenant?.id || !actor) return;
    try {
      setIsLoadingAudit(true);
      // Consultar logs de auditoría generales
      const res = await getAuditLogsAction(currentTenant.id, 'entity', 40, actor);
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
  }, [currentTenant?.id, actor]);

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
            Directorio de colaboradores, comisiones y liquidación de sueldos
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchEmployees}
            disabled={isLoading}
            className="btn-base btn-secondary btn-sm flex items-center gap-2"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Actualizar Personal
          </button>
        </div>
      </div>

      {/* Tabs de Navegación Stripe-Style */}
      <UnderlineTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as TabType)}
      />

      {/* Panel de Diagnóstico Forense de Colaboradores */}
      {diagnosticInfo && (
        <div className="p-4 bg-rose-50/90 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-2xl shadow-xs text-left animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 font-bold text-base shadow-2xs">
              ⚠️
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-black text-rose-900 dark:text-rose-200 tracking-tight">
                Aviso de Base de Datos al procesar Colaboradores
              </h4>
              <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
                {diagnosticInfo.error}
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-rose-200/60 dark:border-rose-800/40 flex items-center justify-between flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowDiagnosticModal(prev => !prev)}
              className="text-xs font-bold px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {showDiagnosticModal ? '▲ Ocultar Log Detallado' : '🔍 Ver Log Detallado del Error'}
            </button>

            <button
              type="button"
              onClick={copyDiagnosticToClipboard}
              className="text-xs font-bold px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>{hasCopiedDiagnostic ? '✓ ¡Diagnóstico Copiado!' : '📋 Copiar Diagnóstico Completo'}</span>
            </button>
          </div>

          {showDiagnosticModal && (
            <div className="mt-3.5 p-3.5 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono shadow-inner border border-slate-800 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-300">Diagnóstico de Base de Datos (PostgreSQL / Supabase)</span>
                <span className="text-[10px] text-slate-400">{diagnosticInfo.timestamp}</span>
              </div>

              {diagnosticInfo.errorCode && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Código de Error:</span>
                  <span className="px-1.5 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded font-bold">
                    {diagnosticInfo.errorCode}
                  </span>
                </div>
              )}

              <div>
                <span className="text-slate-400 font-bold block mb-1">Traza de pasos:</span>
                <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 max-h-40 overflow-y-auto">
                  {diagnosticInfo.trace && diagnosticInfo.trace.length > 0 ? (
                    diagnosticInfo.trace.map((t, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[11px] leading-tight">
                        <span className={`shrink-0 font-bold px-1 rounded text-[9px] ${
                          t.status === 'ok' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          t.status === 'error' ? 'bg-red-950 text-red-400 border border-red-800' :
                          'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}>
                          {t.status === 'ok' ? '✓' : t.status === 'error' ? '✗' : '!'}
                        </span>
                        <div className="flex-1">
                          <span className="text-slate-200 font-medium">{t.label}</span>
                          {t.details && <span className="text-slate-400 ml-1">({t.details})</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 italic text-[11px]">No hay traza registrada.</div>
                  )}
                </div>
              </div>

              {diagnosticInfo.dbDiagnostic && (
                <div>
                  <span className="text-slate-400 font-bold block mb-1">Detalle del motor de Base de Datos:</span>
                  <pre className="bg-slate-950/60 p-2 rounded-lg text-[10px] text-slate-300 overflow-x-auto border border-slate-800/80">
                    {JSON.stringify(diagnosticInfo.dbDiagnostic, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
                <p className="text-xs text-slate-500 font-sans mt-0.5">Historial cronológico de registros de empleados, asignaciones y procesamiento de nóminas.</p>
              </div>
              <AuditTrailSection logs={auditLogs as any} isLoading={isLoadingAudit} />
            </div>
          )}
        </>
      )}

    </div>
  );
}

