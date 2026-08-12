'use client';

import { useState } from 'react';
import { Entity } from '@/lib/api/entities';
import { useToast } from '@/components/core/ToastProvider';
import { Clock, UserCheck, Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AttendanceLog {
  id: string;
  employeeName: string;
  timestamp: string;
  type: 'entrada' | 'salida';
}

interface AttendanceTabProps {
  employees: Entity[];
}

export function AttendanceTab({ employees }: AttendanceTabProps) {
  const { toast } = useToast();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employees[0]?.id || '');
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);

  const handleLogAttendance = (type: 'entrada' | 'salida') => {
    const emp = employees.find((e) => e.id === selectedEmployeeId) || employees[0];
    const empName = emp ? emp.name : 'Empleado';

    const newLog: AttendanceLog = {
      id: String(Date.now()),
      employeeName: empName,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
    };

    setAttendanceLogs([newLog, ...attendanceLogs]);
    toast({
      variant: 'success',
      title: type === 'entrada' ? 'Entrada Registrada' : 'Salida Registrada',
      description: `${empName} marcó ${type} a las ${newLog.timestamp}.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Sub-header */}
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Clock size={20} className="text-blue-500" />
          Control de Asistencia & Marcaje
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Simulador de reloj marcador para registro diario de entrada y salida del personal
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel de Marcaje */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-5">
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <UserCheck size={16} className="text-primary" />
            Terminal de Marcaje Digital
          </h3>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 block">Seleccionar Empleado</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            >
              {employees.length === 0 ? (
                <option value="">-- Sin Empleados Registrados --</option>
              ) : (
                employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.metadata?.role_title || 'Personal'})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleLogAttendance('entrada')}
              disabled={employees.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl text-xs transition-all btn-haptic flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              <Play size={14} className="fill-current" />
              Marcar Entrada
            </button>
            <button
              onClick={() => handleLogAttendance('salida')}
              disabled={employees.length === 0}
              className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold py-3 rounded-2xl text-xs transition-all btn-haptic flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              <Clock size={14} />
              Marcar Salida
            </button>
          </div>
        </div>

        {/* Historial del Día */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-foreground text-sm mb-4">Registro de Accesos del Día</h3>

            {attendanceLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Clock size={36} className="mx-auto opacity-30" />
                <p className="text-xs font-semibold">No hay accesos registrados hoy</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {attendanceLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-border flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${log.type === 'entrada' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className="font-bold text-foreground">{log.employeeName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`capitalize font-bold text-[10px] px-2 py-0.5 rounded-full ${
                        log.type === 'entrada' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        {log.type}
                      </span>
                      <span className="font-mono text-slate-400">{log.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
