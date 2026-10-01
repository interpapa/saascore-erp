'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Entity } from '@/lib/api/entities';
import { useToast } from '@/components/core/ToastProvider';
import { useActionActor } from '@/hooks/useActionActor';
import { getAttendanceLogsAction, registerAttendanceAction } from '@/app/actions/attendance';
import { 
  Clock, 
  UserCheck, 
  LogIn, 
  LogOut, 
  Search, 
  Sparkles, 
  User, 
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AttendanceLog {
  id: string;
  entityId: string;
  employeeName: string;
  timestamp: string;
  rawDate: Date;
  type: 'entrada' | 'salida';
}

interface EquipoKioskExpressProps {
  employees: Entity[];
  tenantId: string;
  onRefresh?: () => void;
}

export function EquipoKioskExpress({
  employees,
  tenantId,
  onRefresh
}: EquipoKioskExpressProps) {
  const actor = useActionActor();
  const { toast } = useToast();
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'present' | 'absent'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Reloj digital en vivo
  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cargar logs de asistencia
  const fetchLogs = async () => {
    if (!tenantId || !actor) return;
    setIsRefreshing(true);
    try {
      const res = await getAttendanceLogsAction(tenantId, actor);
      if (res.success && res.logs) {
        const mappedLogs = res.logs
          .filter((l: any) => l.entity_type === 'employee')
          .map((l: any) => {
            const emp = employees.find((e) => e.id === l.entity_id);
            const tDate = new Date(l.timestamp);
            return {
              id: l.id || `log-${Math.random()}`,
              entityId: l.entity_id,
              employeeName: emp ? emp.name : 'Colaborador',
              timestamp: tDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              rawDate: tDate,
              type: l.log_type === 'check_in' ? ('entrada' as const) : ('salida' as const),
            };
          });
        setAttendanceLogs(mappedLogs);
      }
    } catch (err) {
      console.error('Error fetching attendance logs:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [tenantId, employees, actor]);

  // Filtrar solo colaboradores humanos
  const humanEmployees = useMemo(() => {
    return employees.filter(
      (emp) =>
        !(emp as any).is_resource &&
        !emp.metadata?.is_resource &&
        emp.metadata?.resource_type !== 'space' &&
        emp.metadata?.resource_type !== 'asset'
    );
  }, [employees]);

  // Mapa de estado de asistencia de hoy
  const employeeStatusMap = useMemo(() => {
    const map = new Map<string, { isPresent: boolean; lastPunchTime?: string; lastType?: 'entrada' | 'salida' }>();
    const todayStr = new Date().toDateString();

    humanEmployees.forEach((emp) => {
      const empLogsToday = attendanceLogs.filter(
        (l) => l.entityId === emp.id && l.rawDate.toDateString() === todayStr
      );

      if (empLogsToday.length > 0) {
        const latest = empLogsToday[0];
        map.set(emp.id, {
          isPresent: latest.type === 'entrada',
          lastPunchTime: latest.timestamp,
          lastType: latest.type,
        });
      } else {
        map.set(emp.id, { isPresent: false });
      }
    });

    return map;
  }, [humanEmployees, attendanceLogs]);

  // Contadores
  const presentCount = useMemo(() => {
    let count = 0;
    employeeStatusMap.forEach((status) => {
      if (status.isPresent) count++;
    });
    return count;
  }, [employeeStatusMap]);

  const absentCount = humanEmployees.length - presentCount;

  // Filtrado de lista
  const filteredEmployees = useMemo(() => {
    return humanEmployees.filter((emp) => {
      const status = employeeStatusMap.get(emp.id);
      const isPresent = !!status?.isPresent;

      if (filterType === 'present' && !isPresent) return false;
      if (filterType === 'absent' && isPresent) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = emp.name.toLowerCase().includes(query);
        const matchesDoc = String((emp.metadata as any)?.document_id || '').toLowerCase().includes(query);
        const matchesRole = String((emp.metadata as any)?.job_title || (emp.metadata as any)?.role || '').toLowerCase().includes(query);
        if (!matchesName && !matchesDoc && !matchesRole) return false;
      }

      return true;
    });
  }, [humanEmployees, employeeStatusMap, filterType, searchTerm]);

  // Marcaje en 1 toque
  const handlePunch = async (emp: Entity, isCurrentlyPresent: boolean) => {
    if (!actor) {
      toast({ variant: 'error', title: 'Error', description: 'Sesión no activa.' });
      return;
    }

    const nextType: 'entrada' | 'salida' = isCurrentlyPresent ? 'salida' : 'entrada';
    setProcessingId(emp.id);

    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Optimista
    const tempLog: AttendanceLog = {
      id: `temp-${Date.now()}`,
      entityId: emp.id,
      employeeName: emp.name,
      timestamp: formattedTime,
      rawDate: now,
      type: nextType,
    };
    setAttendanceLogs((prev) => [tempLog, ...prev]);

    try {
      const logType = nextType === 'entrada' ? 'check_in' : 'check_out';
      const res = await registerAttendanceAction(
        {
          entity_id: emp.id,
          entity_type: 'employee',
          log_type: logType,
          status: 'present',
          metadata: {
            method: 'manual',
            notes: 'Marcaje en 1-tap desde Kiosco Express',
          },
        },
        tenantId,
        actor
      );

      if (res.success) {
        toast({
          variant: 'success',
          title: nextType === 'entrada' ? `¡Bienvenido, ${emp.name.split(' ')[0]}!` : `¡Hasta luego, ${emp.name.split(' ')[0]}!`,
          description: `Turno ${nextType === 'entrada' ? 'iniciado' : 'finalizado'} a las ${formattedTime}`,
        });
        fetchLogs();
      } else {
        toast({ variant: 'error', title: 'Error', description: res.error || 'No se pudo guardar el marcaje' });
        // Rollback
        setAttendanceLogs((prev) => prev.filter((l) => l.id !== tempLog.id));
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error de red', description: err.message });
      setAttendanceLogs((prev) => prev.filter((l) => l.id !== tempLog.id));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="w-full space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Kiosco Reloj Header */}
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-900 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Reloj Digital Gigante */}
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">
              <Clock size={15} />
              <span>Reloj Checador de Personal</span>
              <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-black">Express</span>
            </div>
            <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white drop-shadow-sm">
              {currentTime ? currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
            </div>
            <div className="text-xs font-semibold text-indigo-200 mt-1 capitalize">
              {currentTime ? currentTime.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
            </div>
          </div>

          {/* Tarjetas KPI de Estado */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div 
              onClick={() => setFilterType('present')}
              className={`flex-1 sm:flex-none px-4 py-3 rounded-2xl cursor-pointer transition-all border ${
                filterType === 'present' 
                  ? 'bg-emerald-500 border-emerald-300 text-emerald-950 font-black shadow-lg scale-105' 
                  : 'bg-white/10 hover:bg-white/15 border-white/20 text-white'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">En Turno</div>
              <div className="text-2xl font-black">{presentCount}</div>
            </div>

            <div 
              onClick={() => setFilterType('absent')}
              className={`flex-1 sm:flex-none px-4 py-3 rounded-2xl cursor-pointer transition-all border ${
                filterType === 'absent' 
                  ? 'bg-amber-400 border-amber-300 text-amber-950 font-black shadow-lg scale-105' 
                  : 'bg-white/10 hover:bg-white/15 border-white/20 text-white'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Por Registrar</div>
              <div className="text-2xl font-black">{absentCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Buscador Rápido y Filtros */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar colaborador por nombre, cargo o cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-foreground placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full w-5 h-5 flex items-center justify-center"
            >
              ×
            </button>
          )}
        </div>

        {/* Chips de Filtro */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
              filterType === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-card border border-border text-slate-600 dark:text-slate-300'
            }`}
          >
            Todos ({humanEmployees.length})
          </button>
          <button
            onClick={() => setFilterType('present')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors flex items-center gap-1 ${
              filterType === 'present'
                ? 'bg-emerald-600 text-white font-black shadow-xs'
                : 'bg-card border border-border text-emerald-600 dark:text-emerald-400'
            }`}
          >
            <CheckCircle2 size={13} />
            En Turno ({presentCount})
          </button>
          <button
            onClick={() => setFilterType('absent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors flex items-center gap-1 ${
              filterType === 'absent'
                ? 'bg-slate-700 text-white font-black shadow-xs'
                : 'bg-card border border-border text-slate-500'
            }`}
          >
            <Clock size={13} />
            Por Registrar ({absentCount})
          </button>
        </div>
      </div>

      {/* Lista de Colaboradores con Botón Gigante de Marcaje Táctil */}
      {filteredEmployees.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center space-y-2">
          <User className="w-10 h-10 text-slate-400 mx-auto opacity-50" />
          <p className="text-sm font-bold text-foreground">No se encontraron colaboradores</p>
          <p className="text-xs text-slate-500">Intenta cambiar el término de búsqueda o el filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredEmployees.map((emp) => {
            const status = employeeStatusMap.get(emp.id);
            const isPresent = !!status?.isPresent;
            const isProcessing = processingId === emp.id;

            return (
              <div
                key={emp.id}
                className={`bg-card border rounded-2xl p-4.5 shadow-xs transition-all flex flex-col justify-between gap-4 ${
                  isPresent 
                    ? 'border-emerald-500/40 bg-emerald-50/15 dark:bg-emerald-950/10' 
                    : 'border-border'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  {/* Avatar con Anillo de Estado */}
                  <div className={`w-13 h-13 rounded-2xl flex items-center justify-center font-black text-base shrink-0 border-2 ${
                    isPresent 
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500 shadow-xs' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                  }`}>
                    {emp.name.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Datos del Colaborador */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-black text-foreground truncate tracking-tight">
                      {emp.name}
                    </h3>
                    <p className="text-xs text-slate-500 truncate font-medium">
                      {(emp.metadata as any)?.job_title || (emp.metadata as any)?.role || 'Personal'}
                    </p>

                    {/* Estado de Turno */}
                    <div className="mt-1.5 flex items-center gap-2">
                      {isPresent ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-emerald-700 dark:text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          En turno ({status?.lastPunchTime || 'hoy'})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                          <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                          {status?.lastPunchTime ? `Salió a las ${status.lastPunchTime}` : 'Sin registrar'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botón Gigante de Marcaje Táctil */}
                <button
                  onClick={() => handlePunch(emp, isPresent)}
                  disabled={isProcessing}
                  className={`w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md btn-haptic active:scale-98 transition-all ${
                    isPresent
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                  } disabled:opacity-50`}
                >
                  {isProcessing ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : isPresent ? (
                    <>
                      <LogOut size={18} />
                      <span>MARCAR SALIDA</span>
                    </>
                  ) : (
                    <>
                      <LogIn size={18} />
                      <span>MARCAR ENTRADA</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
