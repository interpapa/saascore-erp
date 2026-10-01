'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Save, 
  Plus, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  HeartHandshake,
  Layers
} from 'lucide-react';
import { PeriodonticRecord } from '@/types/dentalSpecialties';
import { savePeriodonticRecordAction, getPeriodonticRecordsAction } from '@/app/actions/dental';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useActionActor } from '@/hooks/useActionActor';
import { useToast } from '@/components/core/ToastProvider';

interface PeriodonticsMiniChartProps {
  patientId: string;
  patientName: string;
}

export function PeriodonticsMiniChart({ patientId, patientName }: PeriodonticsMiniChartProps) {
  const currentTenant = useTenantResolver();
  const actor = useActionActor();
  const effectiveActor = actor || { email: 'doctor@saascore.local', role: 'technician' as const };
  const { toast } = useToast();
  const tenantId = currentTenant?.id || '';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [records, setRecords] = useState<PeriodonticRecord[]>([]);

  // Formulario nuevo control
  const [isCreating, setIsCreating] = useState(false);
  const [bopPercent, setBopPercent] = useState<number>(15);
  const [deepPockets, setDeepPockets] = useState<number>(4);
  const [plaqueIndex, setPlaqueIndex] = useState<number>(20);
  const [mobilityInput, setMobilityInput] = useState('');
  const [mobilityDegree, setMobilityDegree] = useState<'I' | 'II' | 'III'>('I');
  const [mobilityList, setMobilityList] = useState<Array<{ tooth: string; degree: 'I' | 'II' | 'III' }>>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await getPeriodonticRecordsAction(patientId, tenantId, effectiveActor);
        if (res.success && res.records) {
          setRecords(res.records);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    if (patientId && tenantId) {
      load();
    }
  }, [patientId, tenantId]);

  const handleAddMobility = () => {
    const t = mobilityInput.trim();
    if (t && !mobilityList.some(m => m.tooth === t)) {
      setMobilityList([...mobilityList, { tooth: t, degree: mobilityDegree }]);
      setMobilityInput('');
    }
  };

  const handleRemoveMobility = (tooth: string) => {
    setMobilityList(mobilityList.filter(m => m.tooth !== tooth));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newRec: PeriodonticRecord = {
        id: `perio-${Date.now()}`,
        date: new Date().toISOString(),
        bleedingOnProbingPercent: bopPercent,
        deepPocketsCount: deepPockets,
        plaqueIndexPercent: plaqueIndex,
        severeMobilityTeeth: mobilityList,
        furcationInvolvement: [],
        notes
      };

      const res = await savePeriodonticRecordAction(patientId, newRec, tenantId, effectiveActor);
      if (res.success) {
        setRecords([newRec, ...records]);
        setIsCreating(false);
        setNotes('');
        setMobilityList([]);
        toast({
          variant: 'success',
          title: 'Periodoncia guardada',
          description: 'Evaluación de soporte periodontal y sangrado registrada con éxito.',
        });
      } else {
        toast({
          variant: 'error',
          title: 'Error al guardar',
          description: res.error || 'No se pudo guardar la evaluación.',
        });
      }
    } catch {
      toast({
        variant: 'error',
        title: 'Error de red',
        description: 'No se pudo contactar al servidor.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-foreground text-base tracking-tight flex items-center gap-2">
            <ShieldAlert className="text-rose-500" size={18} />
            <span>Control Periodontal & Salud Gingival</span>
          </h3>
          <p className="text-xs text-slate-500">Evaluación de bolsas periodontales, sangrado (BOP), placa y movilidad</p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 btn-haptic shadow-xs"
        >
          <Plus size={14} />
          <span>Nuevo Sondeo</span>
        </button>
      </div>

      {isCreating && (
        <div className="bg-card border-2 border-rose-500/30 rounded-2xl p-5 space-y-4 shadow-xs animate-in fade-in-50">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-background border border-border rounded-xl p-3 space-y-1">
              <label className="text-[11px] font-bold text-slate-500 block">Sangrado al Sondaje (BOP %)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={bopPercent}
                  onChange={(e) => setBopPercent(parseInt(e.target.value) || 0)}
                  className="w-20 bg-card border border-border rounded-lg p-2 font-black text-rose-600 font-mono text-sm"
                />
                <span className="text-slate-400 font-bold">%</span>
                <span className={`text-[11px] font-bold ${bopPercent > 20 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {bopPercent > 20 ? 'Gingivitis Activa' : 'Saludable'}
                </span>
              </div>
            </div>

            <div className="bg-background border border-border rounded-xl p-3 space-y-1">
              <label className="text-[11px] font-bold text-slate-500 block">Bolsas Periodontales ≥ 4mm</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={deepPockets}
                  onChange={(e) => setDeepPockets(parseInt(e.target.value) || 0)}
                  className="w-20 bg-card border border-border rounded-lg p-2 font-black text-amber-600 font-mono text-sm"
                />
                <span className="text-slate-400 font-bold">sitios</span>
                <span className={`text-[11px] font-bold ${deepPockets > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {deepPockets > 0 ? 'Pérdida de Inserción' : 'Sin Sacos'}
                </span>
              </div>
            </div>

            <div className="bg-background border border-border rounded-xl p-3 space-y-1">
              <label className="text-[11px] font-bold text-slate-500 block">Índice de Placa Bacteriana</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={plaqueIndex}
                  onChange={(e) => setPlaqueIndex(parseInt(e.target.value) || 0)}
                  className="w-20 bg-card border border-border rounded-lg p-2 font-black text-blue-600 font-mono text-sm"
                />
                <span className="text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>

          {/* Dientes con Movilidad Patológica */}
          <div className="bg-background border border-border rounded-xl p-3 space-y-2">
            <span className="text-xs font-black text-foreground uppercase tracking-wider block">Movilidad Dental Patológica</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Pieza (ej. 31, 41)"
                value={mobilityInput}
                onChange={(e) => setMobilityInput(e.target.value)}
                className="w-28 bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold"
              />
              <select
                value={mobilityDegree}
                onChange={(e) => setMobilityDegree(e.target.value as any)}
                className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs font-bold"
              >
                <option value="I">Grado I (&lt;1mm horizontal)</option>
                <option value="II">Grado II (&gt;1mm horizontal)</option>
                <option value="III">Grado III (Vertical e intrusiva)</option>
              </select>
              <button
                type="button"
                onClick={handleAddMobility}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-bold"
              >
                Agregar
              </button>
            </div>

            {mobilityList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {mobilityList.map(m => (
                  <span key={m.tooth} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold font-mono">
                    Pieza {m.tooth} (Grado {m.degree})
                    <button type="button" onClick={() => handleRemoveMobility(m.tooth)} className="hover:text-rose-800">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <textarea
              placeholder="Notas periodontales (ej. 'Raspado y alisado radicular por cuadrantes realizado en Q3 y Q4. Prescripción de colutorio con Clorhexidina al 0.12%')."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-all btn-haptic flex items-center gap-1.5 shadow-xs"
            >
              <Save size={14} />
              <span>Guardar Control</span>
            </button>
          </div>
        </div>
      )}

      {/* Historial de Evaluaciones */}
      <div className="space-y-3">
        {records.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-border rounded-2xl">
            No hay registros de control periodontal guardados para este paciente.
          </div>
        ) : (
          records.map((r) => (
            <div key={r.id} className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-2">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-bold text-foreground">
                  Evaluación del {new Date(r.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${r.bleedingOnProbingPercent > 20 ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                  BOP: {r.bleedingOnProbingPercent}%
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-background border border-border/60 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-bold">Bolsas ≥4mm</span>
                  <span className="font-mono font-bold text-foreground">{r.deepPocketsCount} sitios</span>
                </div>
                <div className="bg-background border border-border/60 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-bold">Índice de Placa</span>
                  <span className="font-mono font-bold text-foreground">{r.plaqueIndexPercent}%</span>
                </div>
                <div className="bg-background border border-border/60 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-bold">Movilidad</span>
                  <span className="font-mono font-bold text-foreground">
                    {r.severeMobilityTeeth?.length > 0 ? `${r.severeMobilityTeeth.length} piezas` : 'Ninguna'}
                  </span>
                </div>
              </div>

              {r.notes && (
                <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-900/50 p-2 rounded">
                  &quot;{r.notes}&quot;
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
