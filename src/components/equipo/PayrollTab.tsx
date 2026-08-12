'use client';

import { useState } from 'react';
import { Entity } from '@/lib/api/entities';
import { processPayrollDisbursementAction } from '@/app/actions/hrms';
import { useActionActor } from '@/hooks/useActionActor';
import { useToast } from '@/components/core/ToastProvider';
import { CreditCard, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PayrollTabProps {
  employees: Entity[];
  tenantId: string;
}

export function PayrollTab({ employees, tenantId }: PayrollTabProps) {
  const actor = useActionActor();
  const { toast } = useToast();
  const [period, setPeriod] = useState('Agosto 2026');
  const [bonuses, setBonuses] = useState<Record<string, number>>({});
  const [deductions, setDeductions] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const calculateNetSalary = (emp: Entity) => {
    const base = Number(emp.metadata?.base_salary || 450);
    const bonus = Number(bonuses[emp.id] || 0);
    const ded = Number(deductions[emp.id] || 0);
    return Math.max(0, base + bonus - ded);
  };

  const calculatePayrollTotal = () => {
    return employees.reduce((sum, emp) => sum + calculateNetSalary(emp), 0);
  };

  const handleProcessPayroll = async () => {
    if (employees.length === 0) {
      toast({ variant: 'error', title: 'Atención', description: 'No hay empleados en nómina.' });
      return;
    }

    try {
      setIsProcessing(true);
      const itemsPayload = employees.map((emp) => ({
        employeeId: emp.id,
        employeeName: emp.name,
        baseSalary: Number(emp.metadata?.base_salary || 450),
        bonuses: Number(bonuses[emp.id] || 0),
        deductions: Number(deductions[emp.id] || 0),
      }));

      const res = await processPayrollDisbursementAction(
        period,
        itemsPayload,
        tenantId,
        actor
      );

      if (res.success) {
        toast({
          variant: 'success',
          title: 'Nómina Procesada',
          description: `Dispersión de sueldos para ${(res as any).summary?.processedCount || employees.length} empleados completada exitosamente.`,
        });
      } else {
        toast({ variant: 'error', title: 'Error al procesar nómina', description: (res as any).error || 'Error desconocido' });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error de servidor', description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <CreditCard size={20} className="text-indigo-500" />
            Procesamiento de Nómina & Sueldos
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Cálculo de haberes, asignación de bonos y liquidación periódica del personal
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-card border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-foreground w-36"
          />
          <Button onClick={handleProcessPayroll} disabled={isProcessing || employees.length === 0}>
            {isProcessing ? 'Procesando...' : 'Procesar Nómina'}
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>

      {/* Tabla de Nómina */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold border-b border-border">
            <tr>
              <th className="p-4">Empleado / Puesto</th>
              <th className="p-4 text-right">Sueldo Base</th>
              <th className="p-4 text-right">Bonos ($)</th>
              <th className="p-4 text-right">Deducciones ($)</th>
              <th className="p-4 text-right">Neto a Cobrar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  No hay empleados registrados para liquidar nómina.
                </td>
              </tr>
            ) : (
              employees.map((emp) => {
                const base = Number(emp.metadata?.base_salary || 450);
                const net = calculateNetSalary(emp);
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    <td className="p-4 font-bold text-foreground">
                      {emp.name}
                      <span className="block text-[11px] font-normal text-slate-400">
                        {emp.metadata?.role_title || 'Empleado'}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono">${base.toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <input
                        type="number"
                        min="0"
                        value={bonuses[emp.id] || 0}
                        onChange={(e) => setBonuses({ ...bonuses, [emp.id]: Number(e.target.value) })}
                        className="w-20 bg-background border border-border rounded-lg px-2 py-1 text-right text-xs font-mono"
                      />
                    </td>
                    <td className="p-4 text-right">
                      <input
                        type="number"
                        min="0"
                        value={deductions[emp.id] || 0}
                        onChange={(e) => setDeductions({ ...deductions, [emp.id]: Number(e.target.value) })}
                        className="w-20 bg-background border border-border rounded-lg px-2 py-1 text-right text-xs font-mono"
                      />
                    </td>
                    <td className="p-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                      ${net.toFixed(2)} USD
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {employees.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t border-border flex items-center justify-between text-xs">
            <span className="text-slate-500 font-bold">Total Dispersión Período {period}:</span>
            <span className="text-base font-black text-foreground font-mono">
              ${calculatePayrollTotal().toFixed(2)} USD
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
