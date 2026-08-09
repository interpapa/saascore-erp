'use client';

import { useState, useEffect } from 'react';
import { getEntitiesAction, createEntityAction } from '@/app/actions/entities';
import { processPayrollDisbursementAction } from '@/app/actions/hrms';
import { Entity } from '@/lib/api/entities';
import { Users, Plus, Award, Briefcase, Mail, Clock, CreditCard, Sparkles, UserCheck, Play, ArrowRight } from 'lucide-react';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useToast } from '@/components/core/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type TabType = 'directorio' | 'asistencia' | 'nomina';

interface AttendanceLog {
  id: string;
  employeeName: string;
  timestamp: string;
  type: 'entrada' | 'salida';
}

export default function EquipoPage() {
  const currentTenant = useTenantResolver();
  const { session } = useERPStore();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('directorio');

  // Asistencia state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);

  // Nómina state
  const [period, setPeriod] = useState('Agosto 2026');
  const [bonuses, setBonuses] = useState<Record<string, number>>({});
  const [deductions, setDeductions] = useState<Record<string, number>>({});
  const [isProcessingPayroll, setIsProcessingPayroll] = useState(false);

  const actor = {
    email: session?.userEmail || 'admin@saascore.com',
    role: session?.role || ('owner' as const),
  };

  const fetchEmployees = async () => {
    if (!currentTenant) return;
    try {
      setIsLoading(true);
      const res = await getEntitiesAction(currentTenant.id, 'employee');
      if (res.success) {
        setEmployees(res.entities as any);
        if (res.entities && res.entities.length > 0) {
          setSelectedEmployeeId(res.entities[0].id);
        }
      }
    } catch (err) {
      console.error('Error cargando empleados:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [currentTenant]);

  const handleCreateEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentTenant) return;
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const role = formData.get('role') as string;
    const salary = Number(formData.get('salary') as string);

    try {
      const res = await createEntityAction(
        {
          type: 'employee',
          name,
          email,
          phone,
          status: 'active',
          metadata: { role, base_salary: salary },
        },
        currentTenant.id,
        actor
      );
      if (!res.success) throw new Error(res.error);
      setIsModalOpen(false);
      toast({ variant: 'success', title: 'Empleado creado', description: `Se ha registrado a ${name} exitosamente.` });
      await fetchEmployees();
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message || 'Error al guardar empleado' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegisterAttendance = (type: 'entrada' | 'salida') => {
    const emp = employees.find(e => e.id === selectedEmployeeId);
    if (!emp) {
      toast({ variant: 'warning', title: 'Atención', description: 'Por favor, selecciona un empleado válido.' });
      return;
    }
    const log: AttendanceLog = {
      id: crypto.randomUUID(),
      employeeName: emp.name,
      timestamp: new Date().toLocaleTimeString(),
      type
    };
    setAttendanceLogs(prev => [log, ...prev]);
    toast({
      variant: 'success',
      title: type === 'entrada' ? 'Entrada Registrada' : 'Salida Registrada',
      description: `${emp.name} marcó ${type} a las ${log.timestamp}`
    });
  };

  const handleProcessPayroll = async () => {
    if (!currentTenant) return;
    if (employees.length === 0) {
      toast({ variant: 'error', title: 'Error', description: 'No hay empleados para procesar en la nómina.' });
      return;
    }
    setIsProcessingPayroll(true);
    try {
      const salaryItems = employees.map(emp => ({
        employeeId: emp.id,
        employeeName: emp.name,
        baseSalary: Number(emp.metadata?.base_salary || 0),
        bonuses: bonuses[emp.id] || 0,
        deductions: deductions[emp.id] || 0
      }));

      const res = await processPayrollDisbursementAction(
        period,
        salaryItems,
        currentTenant.id,
        actor
      );

      if (res.success) {
        toast({
          variant: 'success',
          title: 'Nómina Procesada con Éxito',
          description: `Se ha generado el desembolso y el asiento contable para ${(res as any).summary?.employeeCount || salaryItems.length} empleados en el periodo ${period}.`
        });
      } else {
        throw new Error(res.error || 'Error al procesar la nómina');
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error de Nómina', description: err.message });
    } finally {
      setIsProcessingPayroll(false);
    }
  };

  const totalPayrollEstimate = employees.reduce((acc, e) => {
    const base = Number(e.metadata?.base_salary || 0);
    const bonus = bonuses[e.id] || 0;
    const ded = deductions[e.id] || 0;
    return acc + base + bonus - ded;
  }, 0);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            Recursos Humanos (HRMS) <Sparkles className="text-amber-500 w-6 h-6 animate-pulse" />
          </h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium mt-0.5">Control completo de personal, asistencia diaria y nómina corporativa</p>
        </div>
        {activeTab === 'directorio' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] flex items-center gap-2 btn-haptic"
          >
            <Plus size={18} />
            Nuevo Empleado
          </button>
        )}
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('directorio')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-colors ${
            activeTab === 'directorio'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-foreground'
          }`}
        >
          <Users size={16} />
          Directorio de Personal
        </button>
        <button
          onClick={() => setActiveTab('asistencia')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-colors ${
            activeTab === 'asistencia'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-foreground'
          }`}
        >
          <Clock size={16} />
          Asistencia
        </button>
        <button
          onClick={() => setActiveTab('nomina')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-colors ${
            activeTab === 'nomina'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-foreground'
          }`}
        >
          <CreditCard size={16} />
          Procesamiento de Nómina
        </button>
      </div>

      {/* Tab Contents */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB: DIRECTORIO */}
          {activeTab === 'directorio' && (
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border bg-slate-50/50 dark:bg-slate-900/50">
                <h2 className="text-lg font-bold text-foreground">Directorio Activo</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total de {employees.length} colaboradores registrados en el sistema.</p>
              </div>
              <div className="divide-y divide-border">
                {employees.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                    No hay empleados registrados. Añade uno para comenzar.
                  </div>
                ) : (
                  employees.map((emp) => (
                    <div key={emp.id} className="p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-extrabold text-sm shrink-0">
                          {emp.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground">{emp.name}</h4>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <span className="flex items-center gap-1"><Briefcase size={13} /> {emp.metadata?.role || 'Empleado'}</span>
                            {emp.email && <span className="flex items-center gap-1"><Mail size={13} /> {emp.email}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-border/60">
                        <div className="text-right">
                          <p className="text-xs text-slate-400 dark:text-slate-500">Salario Base</p>
                          <p className="font-bold text-foreground">${Number(emp.metadata?.base_salary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          emp.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {emp.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: ASISTENCIA */}
          {activeTab === 'asistencia' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form panel */}
              <div className="lg:col-span-1 bg-card border border-border rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <UserCheck className="text-primary w-5 h-5" /> Marcaje Diario
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Simulador de entradas y salidas en tiempo real.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Seleccionar Colaborador</label>
                    <select
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    >
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.metadata?.role || 'Empleado'})</option>
                      ))}
                      {employees.length === 0 && <option value="">No hay empleados disponibles</option>}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => handleRegisterAttendance('entrada')}
                      disabled={employees.length === 0}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      Entrada
                    </Button>
                    <Button
                      onClick={() => handleRegisterAttendance('salida')}
                      disabled={employees.length === 0}
                      variant="outline"
                      className="w-full border-rose-600 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold"
                    >
                      Salida
                    </Button>
                  </div>
                </div>
              </div>

              {/* Logs panel */}
              <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-border bg-slate-50/50 dark:bg-slate-900/50">
                  <h3 className="text-lg font-bold text-foreground">Historial de Accesos del Día</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Registros de asistencia del personal.</p>
                </div>
                <div className="p-4 flex-1 min-h-[300px] max-h-[400px] overflow-y-auto divide-y divide-border">
                  {attendanceLogs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">
                      Ningún marcaje registrado hoy.
                    </div>
                  ) : (
                    attendanceLogs.map((log) => (
                      <div key={log.id} className="py-3 flex justify-between items-center text-sm">
                        <div className="flex items-center gap-3">
                          <span className={`w-2.5 h-2.5 rounded-full ${log.type === 'entrada' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span className="font-bold text-foreground">{log.employeeName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                            {log.type}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">{log.timestamp}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: NÓMINA */}
          {activeTab === 'nomina' && (
            <div className="space-y-6">
              {/* Top Controls & Estimate */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card border border-border rounded-2xl p-6">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Periodo Contable de Nómina</label>
                  <Input
                    label=""
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="mt-2 text-sm font-semibold"
                    placeholder="Ej. Agosto 2026"
                  />
                </div>
                <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Monto Estimado Neto</span>
                  <span className="text-2xl font-black text-foreground mt-2">${totalPayrollEstimate.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span>
                </div>
                <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-end">
                  <Button
                    onClick={handleProcessPayroll}
                    disabled={isProcessingPayroll || employees.length === 0}
                    className="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
                  >
                    {isProcessingPayroll ? 'Procesando...' : (
                      <>
                        Procesar Nómina <Play size={15} fill="currentColor" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Payroll Spreadsheet */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border bg-slate-50/50 dark:bg-slate-900/50">
                  <h3 className="text-lg font-bold text-foreground">Detalle de Salarios y Modificadores</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Edita bonificaciones y deducciones antes de ejecutar la nómina.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-slate-500 font-bold bg-slate-50/30 dark:bg-slate-900/10">
                        <th className="p-4">Colaborador</th>
                        <th className="p-4">Sueldo Base</th>
                        <th className="p-4">Bonos (USD)</th>
                        <th className="p-4">Deducciones (USD)</th>
                        <th className="p-4 text-right">Neto a Pagar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {employees.map(emp => {
                        const base = Number(emp.metadata?.base_salary || 0);
                        const bonus = bonuses[emp.id] || 0;
                        const ded = deductions[emp.id] || 0;
                        const net = base + bonus - ded;
                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-900/5 transition-colors">
                            <td className="p-4 font-bold text-foreground">
                              {emp.name}
                              <span className="block text-xs font-normal text-slate-500 mt-0.5">{emp.metadata?.role || 'Empleado'}</span>
                            </td>
                            <td className="p-4 font-semibold text-foreground">${base.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td className="p-4">
                              <input
                                type="number"
                                step="0.01"
                                value={bonuses[emp.id] ?? ''}
                                onChange={(e) => setBonuses({ ...bonuses, [emp.id]: Number(e.target.value) })}
                                className="w-24 px-2 py-1 rounded border border-border bg-card text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="p-4">
                              <input
                                type="number"
                                step="0.01"
                                value={deductions[emp.id] ?? ''}
                                onChange={(e) => setDeductions({ ...deductions, [emp.id]: Number(e.target.value) })}
                                className="w-24 px-2 py-1 rounded border border-border bg-card text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="p-4 text-right font-black text-foreground">
                              ${net.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                      {employees.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400">
                            Registra empleados para habilitar la nómina.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Nuevo Empleado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-4 text-foreground flex items-center gap-2">
              <Users size={20} className="text-primary" />
              Nuevo Empleado
            </h3>
            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <Input
                name="name"
                label="Nombre Completo"
                placeholder="Ej. Carlos Mendoza"
                required
              />

              <Input
                name="email"
                type="email"
                label="Correo Corporativo"
                placeholder="carlos@empresa.com"
              />

              <Input
                name="phone"
                label="Teléfono"
                placeholder="+52 555 123 4567"
              />

              <Input
                name="role"
                label="Cargo / Puesto"
                placeholder="Ej. Gerente de Almacén"
                required
              />

              <Input
                name="salary"
                type="number"
                step="0.01"
                label="Sueldo Base Mensual (USD)"
                placeholder="Ej. 1200.00"
                required
              />

              <div className="flex gap-3 pt-3">
                <Button type="button" variant="outline" className="w-full" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? 'Guardando...' : 'Guardar Empleado'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

