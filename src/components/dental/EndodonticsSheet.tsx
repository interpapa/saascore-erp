'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  FileText,
  AlertTriangle 
} from 'lucide-react';
import { EndodonticRecord, EndodonticCanal } from '@/types/dentalSpecialties';
import { saveEndodonticRecordAction, getEndodonticRecordsAction } from '@/app/actions/dental';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useActionActor } from '@/hooks/useActionActor';
import { useToast } from '@/components/core/ToastProvider';

interface EndodonticsSheetProps {
  patientId: string;
  patientName: string;
}

export function EndodonticsSheet({ patientId, patientName }: EndodonticsSheetProps) {
  const currentTenant = useTenantResolver();
  const actor = useActionActor();
  const effectiveActor = actor || { email: 'doctor@saascore.local', role: 'technician' as const };
  const { toast } = useToast();
  const tenantId = currentTenant?.id || '';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [records, setRecords] = useState<EndodonticRecord[]>([]);

  // Formulario nuevo conducto
  const [isCreating, setIsCreating] = useState(false);
  const [toothNumber, setToothNumber] = useState('16');
  const [diagnosisPulpar, setDiagnosisPulpar] = useState<'pulpitis_reversible' | 'pulpitis_irreversible' | 'necrosis' | 'previo_iniciado'>('pulpitis_irreversible');
  const [diagnosisPeriapical, setDiagnosisPeriapical] = useState<'normal' | 'periodontitis_apical' | 'absceso_agudo' | 'absceso_cronico'>('normal');
  const [instrumentation, setInstrumentation] = useState<'rotary' | 'reciprocating' | 'manual'>('rotary');
  const [irrigant, setIrrigant] = useState<'NaOCl_2.5' | 'NaOCl_5.25' | 'Chlorhexidine_2' | 'EDTA_17'>('NaOCl_2.5');
  const [notes, setNotes] = useState('');

  const [canals, setCanals] = useState<EndodonticCanal[]>([
    { id: 'c1', name: 'Mesio-Vestibular (MV)', referenceCusp: 'Cúspide MV', workLengthMM: 21.5, mafSize: '#30 .04', coneSize: '#30 .04', sealerCement: 'AH Plus' },
    { id: 'c2', name: 'Disto-Vestibular (DV)', referenceCusp: 'Cúspide DV', workLengthMM: 20.0, mafSize: '#25 .06', coneSize: '#25 .06', sealerCement: 'AH Plus' },
    { id: 'c3', name: 'Palatino (P)', referenceCusp: 'Cúspide Palatina', workLengthMM: 22.0, mafSize: '#35 .04', coneSize: '#35 .04', sealerCement: 'AH Plus' }
  ]);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await getEndodonticRecordsAction(patientId, tenantId, effectiveActor);
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

  const handleAddCanal = () => {
    const newCanal: EndodonticCanal = {
      id: `canal-${Date.now()}`,
      name: 'Conducto Adicional',
      referenceCusp: 'Borde Incisal / Cúspide',
      workLengthMM: 20.0,
      mafSize: '#25 .04',
      coneSize: '#25 .04',
      sealerCement: 'AH Plus'
    };
    setCanals([...canals, newCanal]);
  };

  const handleUpdateCanal = (index: number, field: keyof EndodonticCanal, value: any) => {
    const updated = [...canals];
    updated[index] = { ...updated[index], [field]: value };
    setCanals(updated);
  };

  const handleRemoveCanal = (index: number) => {
    setCanals(canals.filter((_, i) => i !== index));
  };

  const handleSaveRecord = async () => {
    if (!toothNumber) return;
    setIsSaving(true);
    try {
      const newRecord: EndodonticRecord = {
        id: `endo-${Date.now()}`,
        toothNumber,
        date: new Date().toISOString(),
        diagnosisPulpar,
        diagnosisPeriapical,
        instrumentation,
        irrigant,
        canals,
        completed: true,
        notes
      };

      const res = await saveEndodonticRecordAction(patientId, newRecord, tenantId, effectiveActor);
      if (res.success) {
        setRecords([newRecord, ...records]);
        setIsCreating(false);
        setNotes('');
        toast({
          variant: 'success',
          title: 'Conductometría guardada',
          description: `Registro de endodoncia para la pieza #${toothNumber} guardado exitosamente.`,
        });
      } else {
        toast({
          variant: 'error',
          title: 'Error al guardar',
          description: res.error || 'No se pudo guardar la endodoncia.',
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
            <Activity className="text-teal-500" size={18} />
            <span>Ficha de Endodoncia & Conductometría</span>
          </h3>
          <p className="text-xs text-slate-500">Registro anatómico de conductos, longitudes de trabajo y obturación</p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 btn-haptic shadow-xs"
        >
          <Plus size={14} />
          <span>Nueva Endodoncia</span>
        </button>
      </div>

      {isCreating && (
        <div className="bg-card border-2 border-teal-500/30 rounded-2xl p-5 space-y-4 shadow-xs animate-in fade-in-50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Diente Tratado (FDI)</label>
              <input
                type="text"
                value={toothNumber}
                onChange={(e) => setToothNumber(e.target.value)}
                placeholder="ej. 16, 21, 36"
                className="w-full bg-background border border-border rounded-lg p-2 font-mono font-bold text-foreground"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Diagnóstico Pulpar</label>
              <select
                value={diagnosisPulpar}
                onChange={(e) => setDiagnosisPulpar(e.target.value as any)}
                className="w-full bg-background border border-border rounded-lg p-2 text-foreground font-medium"
              >
                <option value="pulpitis_reversible">Pulpitis Reversible</option>
                <option value="pulpitis_irreversible">Pulpitis Irreversible Sintomática</option>
                <option value="necrosis">Necrosis Pulpar</option>
                <option value="previo_iniciado">Tratamiento Previo Iniciado</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Biomecánica</label>
              <select
                value={instrumentation}
                onChange={(e) => setInstrumentation(e.target.value as any)}
                className="w-full bg-background border border-border rounded-lg p-2 text-foreground font-medium"
              >
                <option value="rotary">Rotatoria Continua</option>
                <option value="reciprocating">Reciprocante</option>
                <option value="manual">Manual (Limas K / Hedström)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Irrigante Protocolo</label>
              <select
                value={irrigant}
                onChange={(e) => setIrrigant(e.target.value as any)}
                className="w-full bg-background border border-border rounded-lg p-2 text-foreground font-medium"
              >
                <option value="NaOCl_2.5">Hipoclorito de Sodio (NaOCl 2.5%)</option>
                <option value="NaOCl_5.25">Hipoclorito de Sodio (NaOCl 5.25%)</option>
                <option value="Chlorhexidine_2">Clorhexidina al 2%</option>
                <option value="EDTA_17">EDTA al 17% (Smear layer)</option>
              </select>
            </div>
          </div>

          {/* Tabla de Conductometría */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-foreground uppercase tracking-wider">Tabla de Conductometría & Obturación</span>
              <button
                type="button"
                onClick={handleAddCanal}
                className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
              >
                <Plus size={12} />
                Agregar Conducto
              </button>
            </div>

            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-border text-[11px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="p-2.5">Conducto</th>
                    <th className="p-2.5">Referencia</th>
                    <th className="p-2.5">LT (mm)</th>
                    <th className="p-2.5">MAF (Calibre Apical)</th>
                    <th className="p-2.5">Cono Gutapercha</th>
                    <th className="p-2.5">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {canals.map((c, i) => (
                    <tr key={c.id}>
                      <td className="p-2">
                        <input
                          type="text"
                          value={c.name}
                          onChange={(e) => handleUpdateCanal(i, 'name', e.target.value)}
                          className="w-full bg-transparent border border-border/60 rounded px-2 py-1 text-xs font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={c.referenceCusp}
                          onChange={(e) => handleUpdateCanal(i, 'referenceCusp', e.target.value)}
                          className="w-full bg-transparent border border-border/60 rounded px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.5"
                          value={c.workLengthMM}
                          onChange={(e) => handleUpdateCanal(i, 'workLengthMM', parseFloat(e.target.value) || 0)}
                          className="w-20 bg-transparent border border-border/60 rounded px-2 py-1 text-xs font-mono font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={c.mafSize}
                          onChange={(e) => handleUpdateCanal(i, 'mafSize', e.target.value)}
                          className="w-24 bg-transparent border border-border/60 rounded px-2 py-1 text-xs font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={c.coneSize}
                          onChange={(e) => handleUpdateCanal(i, 'coneSize', e.target.value)}
                          className="w-24 bg-transparent border border-border/60 rounded px-2 py-1 text-xs font-mono"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveCanal(i)}
                          className="p-1 text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <textarea
              placeholder="Notas clínicas de conductometría (ej. 'Comprobación de LT con localizador apical Woodpex. Obturación por condensación lateral y sellado con ionómero de vidrio')."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground focus:ring-2 focus:ring-teal-500/20 resize-none font-medium"
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
              onClick={handleSaveRecord}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs transition-all btn-haptic flex items-center gap-1.5 shadow-xs"
            >
              <Save size={14} />
              <span>Guardar Endodoncia</span>
            </button>
          </div>
        </div>
      )}

      {/* Lista de Registros Anteriores */}
      <div className="space-y-3">
        {records.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-border rounded-2xl">
            No hay registros de conductometría o endodoncia para este paciente.
          </div>
        ) : (
          records.map((rec) => (
            <div key={rec.id} className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-2">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-600 font-mono font-black text-xs">
                    Pieza #{rec.toothNumber}
                  </span>
                  <span className="text-xs font-bold text-foreground capitalize">
                    {rec.diagnosisPulpar.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(rec.date).toLocaleDateString('es-ES')}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {rec.canals?.map((c) => (
                  <div key={c.id} className="bg-background border border-border/60 p-2 rounded-lg">
                    <span className="font-bold text-primary block">{c.name}</span>
                    <span className="text-slate-500 text-[11px] block">LT: <strong className="text-foreground">{c.workLengthMM} mm</strong></span>
                    <span className="text-slate-500 text-[11px] block">MAF: {c.mafSize}</span>
                  </div>
                ))}
              </div>

              {rec.notes && (
                <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-900/50 p-2 rounded">
                  &quot;{rec.notes}&quot;
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
