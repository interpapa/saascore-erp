'use client';

import { useState, useEffect, useMemo } from 'react';
import { Entity } from '@/lib/api/entities';
import { useToast } from '@/components/core/ToastProvider';
import { Clock, UserCheck, Play, Square, Search, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useActionActor } from '@/hooks/useActionActor';
import { getAttendanceLogsAction, registerAttendanceAction } from '@/app/actions/attendance';

interface AttendanceLog {
  id: string;
  entityId: string;
  employeeName: string;
  timestamp: string;
  rawDate: Date;
  type: 'entrada' | 'salida';
}

interface AttendanceTabProps {
  employees: Entity[];
  tenantId: string;
}

export function AttendanceTab({ employees, tenantId }: AttendanceTabProps) {
  const actor = useActionActor();
  const { toast } = useToast();
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent'>('all');
  const [loadingEmpId, setLoadingEmpId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Reloj digital en vivo
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Cargar historial de asistencia
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

  // Filtrar solo colaboradores humanos (excluir canchas / recursos)
  const humanEmployees = useMemo(() => {
    return employees.filter(
      (emp) =>
        !(emp as any).is_resource &&
        !emp.metadata?.is_resource &&
        emp.metadata?.resource_type !== 'space' &&
        emp.metadata?.resource_type !== 'asset'
    );
  }, [employees]);

  // Determinar estado actual de cada empleado para hoy
  const employeeStatusMap = useMemo(() => {
    const map = new Map<string, { isPresent: boolean; lastPunchTime?: string; lastType?: 'entrada' | 'salida' }>();
    const todayStr = new Date().toDateString();

    humanEmployees.forEach((emp) => {
      // Buscar el último log de hoy de este empleado
      const empLogsToday = attendanceLogs.filter(
        (l) => l.entityId === emp.id && l.rawDate.toDateString() === todayStr
      );

      if (empLogsToday.length > 0) {
        // Como están ordenados desc, el primero es el más reciente
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

  // Registrar marcaje en 1-click
  const handleQuickPunch = async (emp: Entity, type: 'entrada' | 'salida') => {
    if (!actor) {
      toast({ variant: 'error', title: 'Error', description: 'Sesión expirada. Recarga la página.' });
      return;
    }

    setLoadingEmpId(emp.id);

    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Actualización optimista
    const tempId = `temp-${Date.now()}`;
    const optimisticLog: AttendanceLog = {
      id: tempId,
      entityId: emp.id,
      employeeName: emp.name,
      timestamp: formattedTime,
      rawDate: now,
      type,
    };

    setAttendanceLogs((prev) => [optimisticLog, ...prev]);

    try {
      const logType = type === 'entrada' ? 'check_in' : 'check_out';
      const res = await registerAttendanceAction(
        {
          entity_id: emp.id,
          entity_type: 'employee',
          log_type: logType,
        },
        tenantId,
        actor
      );

      if (res.success) {
        toast({
          variant: 'success',
          title: type === 'entrada' ? '🟢 Entrada Registrada' : '⚪ Salida Registrada',
          description: `${emp.name} marcó ${type} exitosamente a las ${formattedTime}.`,
        });
        if (res.log?.id) {
          setAttendanceLogs((prev) =>
            prev.map((l) => (l.id === tempId ? { ...l, id: res.log.id } : l))
          );
        }
      } else {
        // Rollback
        setAttendanceLogs((prev) => prev.filter((l) => l.id !== tempId));
        toast({
          variant: 'error',
          title: 'Error al registrar',
          description: res.error || 'No se pudo guardar el marcaje.',
        });
      }
    } catch (err: unknown) {
      setAttendanceLogs((prev) => prev.filter((l) => l.id !== tempId));
      toast({
        variant: 'error',
        title: 'Error de conexión',
        description: (err as Error).message,
      });
    } finally {
      setLoadingEmpId(null);
    }
  };

  // Filtrado de empleados para la lista
  const filteredEmployees = useMemo(() => {
    return humanEmployees.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ((emp.metadata?.role_title as string) || '').toLowerCase().includes(searchTerm.toLowerCase());

      const status = employeeStatusMap.get(emp.id);
      const isPresent = status?.isPresent ?? false;

      if (filterStatus === 'present') return matchesSearch && isPresent;
      if (filterStatus === 'absent') return matchesSearch && !isPresent;
      return matchesSearch;
    });
  }, [humanEmployees, searchTerm, filterStatus, employeeStatusMap]);

  return (
    <div className="space-y-6">
      {/* Sub-header & Live Clock */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <Clock size={20} className="text-indigo-500" />
            Control de Marcaje & Asistencia en Vivo
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Registro con 1 solo clic. Monitorea quién está en turno y quién ya se retiró hoy.
          </p>
        </div>

        {/* Reloj Digital en Vivo */}
        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 border border-border px-4 py-2.5 rounded-2xl">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <div className="text-right">
            <span className="block font-mono text-base sm:text-lg font-black text-foreground tracking-tight">
              {currentTime ? currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
            </span>
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              {currentTime
                ? currentTime.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })
                : ''}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/20">
            <UserCheck size={20} />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Plantilla Total</span>
            <span className="text-xl font-black text-foreground">{humanEmployees.length} colaboradores</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold border border-emerald-500/20">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Presentes en Turno</span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {presentCount} trabajando
            </span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-bold border border-border">
            <Clock size={20} />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fuera / Sin Ingreso</span>
            <span className="text-xl font-black text-slate-600 dark:text-slate-300">{absentCount} ausentes</span>
          </div>
        </div>
      </div>

      {/* Panel Principal: Roster de Marcaje Rápido & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Columna Izquierda (2 cols): Lista de Personal con Marcaje 1-Click */}
        <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h3 className="font-black text-foreground text-sm flex items-center gap-2">
                <span>Marcaje Directo de Personal</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                  1 Clic
                </span>
              </h3>
              <p className="text-xs text-slate-400">Toca el botón correspondiente al colaborador para registrar entrada o salida</p>
            </div>

            {/* Filtros rápidos */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-border text-xs">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  filterStatus === 'all' ? 'bg-card text-foreground shadow-xs' : 'text-slate-500 hover:text-foreground'
                }`}
              >
                Todos ({humanEmployees.length})
              </button>
              <button
                onClick={() => setFilterStatus('present')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  filterStatus === 'present' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-500 hover:text-foreground'
                }`}
              >
                Presentes ({presentCount})
              </button>
              <button
                onClick={() => setFilterStatus('absent')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  filterStatus === 'absent' ? 'bg-slate-800 text-white dark:bg-slate-700 shadow-xs' : 'text-slate-500 hover:text-foreground'
                }`}
              >
                Fuera ({absentCount})
              </button>
            </div>
          </div>

          {/* Buscador de Colaborador */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar colaborador por nombre o puesto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-xs font-medium outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Lista de Colaboradores con Botones de 1-Clic */}
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-2xl text-slate-400 space-y-2">
              <Clock size={32} className="mx-auto opacity-30" />
              <p className="text-xs font-bold text-foreground">No se encontraron colaboradores</p>
              <p className="text-[11px]">Intenta cambiando el filtro o agregando personal en el directorio.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredEmployees.map((emp) => {
                const status = employeeStatusMap.get(emp.id);
                const isPresent = status?.isPresent ?? false;
                const isLoading = loadingEmpId === emp.id;

                return (
                  <div
                    key={emp.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isPresent
                        ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
                        : 'bg-card border-border hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Info Empleado */}
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-sm border border-border text-foreground overflow-hidden">
                          {emp.metadata?.avatar_url ? (
                            <img src={emp.metadata.avatar_url as string} alt={emp.name} className="w-full h-full object-cover" />
                          ) : (
                            emp.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        {/* Estado indicator dot */}
                        <span
                          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-card ${
                            isPresent ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-foreground text-xs">{emp.name}</h4>
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              isPresent
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                            }`}
                          >
                            {isPresent ? '🟢 En Turno' : '⚪ Fuera'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{(emp.metadata?.role_title as string) || 'Colaborador'}</span>
                          {status?.lastPunchTime && (
                            <>
                              <span>•</span>
                              <span>
                                {status.lastType === 'entrada' ? 'Entrada' : 'Salida'}: {status.lastPunchTime}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Botones de Acción Directa */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isPresent ? (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleQuickPunch(emp, 'salida')}
                          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 btn-haptic disabled:opacity-50"
                        >
                          <Square size={12} className="fill-current" />
                          {isLoading ? 'Registrando...' : 'Marcar Salida'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleQuickPunch(emp, 'entrada')}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 btn-haptic disabled:opacity-50"
                        >
                          <Play size={12} className="fill-current" />
                          {isLoading ? 'Registrando...' : 'Marcar Entrada'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Columna Derecha (1 col): Historial del Día */}
        <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col max-h-[600px]">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-bold text-foreground text-sm">Marcajes del Día</h3>
              <p className="text-[11px] text-slate-400">Bitácora en tiempo real</p>
            </div>
            <button
              type="button"
              onClick={fetchLogs}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refrescar accesos"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {attendanceLogs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-2 flex-1 flex flex-col items-center justify-center">
              <Clock size={32} className="opacity-30" />
              <p className="text-xs font-bold">Sin marcajes registrados hoy</p>
              <p className="text-[11px] text-slate-500 max-w-[200px]">
                Cuando un colaborador marque entrada o salida aparecerá aquí al instante.
              </p>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto pr-1 flex-1">
              {attendanceLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-border flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        log.type === 'entrada' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    <span className="font-bold text-foreground truncate max-w-[120px]">{log.employeeName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`capitalize font-bold text-[9px] px-2 py-0.5 rounded-full ${
                        log.type === 'entrada'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-amber-500/10 text-amber-600'
                      }`}
                    >
                      {log.type}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">{log.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
