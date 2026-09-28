'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Save, Zap, RefreshCw } from 'lucide-react';
import { DentalChart, ToothData, ToothCondition, DentalTreatmentPlan } from '@/app/actions/dental';

interface OdontogramProps {
  entityId: string;
  entityName: string;
  initialChart?: DentalChart;
  onSave: (chart: DentalChart) => Promise<void>;
  onCreateKanban?: (plan: DentalTreatmentPlan) => Promise<void>;
  isSaving?: boolean;
}

// Numeración FDI: cuadrantes 1-4 adultos (11-48), cuadrantes 5-8 infantiles (51-85)
const ADULT_TEETH = [
  // Superior Derecho → Superior Izquierdo
  ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'],
  // Inferior Derecho → Inferior Izquierdo
  ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'],
];

const CHILD_TEETH = [
  ['55','54','53','52','51','61','62','63','64','65'],
  ['85','84','83','82','81','71','72','73','74','75'],
];

export const CONDITIONS: Record<string, { label: string; color: string; bg: string; symbol: string }> = {
  caries:     { label: 'Caries',       color: '#ef4444', bg: 'bg-red-500',     symbol: 'C' },
  obturacion: { label: 'Obturación',   color: '#3b82f6', bg: 'bg-blue-500',    symbol: 'O' },
  endodoncia: { label: 'Endodoncia',   color: '#8b5cf6', bg: 'bg-violet-500',  symbol: 'E' },
  corona:     { label: 'Corona',       color: '#f59e0b', bg: 'bg-amber-400',   symbol: 'K' },
  implante:   { label: 'Implante',     color: '#6366f1', bg: 'bg-indigo-500',  symbol: '🔩' },
  ausente:    { label: 'Ausente',      color: '#000000', bg: 'bg-black',       symbol: '✕' },
  fractura:   { label: 'Fractura',     color: '#6b7280', bg: 'bg-gray-500',    symbol: '⚡' },
  custom:     { label: 'Personalizado',color: '#14b8a6', bg: 'bg-teal-500',    symbol: '?' },
};

function ToothCell({ toothNum, toothData, isSelected, onClick }: {
  toothNum: string;
  toothData?: ToothData;
  isSelected: boolean;
  onClick: () => void;
}) {
  const hasConditions = (toothData?.conditions || []).length > 0;
  const primaryCondition = toothData?.conditions?.[0];
  const condDef = primaryCondition ? CONDITIONS[primaryCondition.code] : null;
  const isAbsent = toothData?.conditions?.some(c => c.code === 'ausente');

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Diente ${toothNum}${toothData?.notes ? ' — ' + toothData.notes : ''}`}
      className={`w-10 h-10 rounded-lg border-2 text-[10px] font-black transition-all relative flex items-center justify-center ${
        isSelected
          ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-1 scale-110 z-10'
          : hasConditions
          ? 'border-slate-400 dark:border-slate-500 hover:scale-105'
          : 'border-slate-200 dark:border-slate-700 bg-background hover:border-primary/50 hover:bg-primary/5'
      } ${
        isAbsent ? 'opacity-50 bg-slate-100 dark:bg-slate-800' : ''
      }`}
      style={condDef && !isSelected ? { borderColor: condDef.color, backgroundColor: condDef.color + '22' } : {}}
    >
      {condDef ? (
        <span style={{ color: condDef.color }} className="text-[11px] font-black">{condDef.symbol}</span>
      ) : (
        <span className="text-slate-400">{toothNum.slice(-1)}</span>
      )}
      {(toothData?.conditions || []).length > 1 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white rounded-full text-[8px] font-black flex items-center justify-center">
          {toothData!.conditions.length}
        </span>
      )}
    </button>
  );
}

export function Odontogram({ entityId, entityName, initialChart, onSave, onCreateKanban, isSaving }: OdontogramProps) {
  const [chart, setChart] = useState<DentalChart>(() => initialChart || {
    mode: 'adult',
    teeth: {},
    supernumeraryTeeth: [],
    lastUpdated: new Date().toISOString(),
  });

  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [activeCondition, setActiveCondition] = useState<string>('caries');
  const [customConditionLabel, setCustomConditionLabel] = useState('');
  const [customConditionColor, setCustomConditionColor] = useState('#14b8a6');
  const [showTreatmentPanel, setShowTreatmentPanel] = useState(false);
  const [treatmentProcedures, setTreatmentProcedures] = useState<Array<{ toothNumber: string; procedure: string; cost: string }>>([]);
  const [treatmentTitle, setTreatmentTitle] = useState('');

  // entityId is used to key the component externally; kept for prop-type completeness
  void entityId;

  useEffect(() => {
    if (initialChart) setChart(initialChart);
  }, [initialChart]);

  const toggleCondition = useCallback((toothNum: string) => {
    setChart(prev => {
      const existing = prev.teeth[toothNum];
      const currentConditions = existing?.conditions || [];
      const condCode = activeCondition;

      const alreadyHas = currentConditions.some(c => c.code === condCode);
      let newConditions: ToothCondition[];

      if (alreadyHas) {
        // Quitar condición
        newConditions = currentConditions.filter(c => c.code !== condCode);
      } else {
        // Agregar condición
        const newCond: ToothCondition = condCode === 'custom'
          ? { code: 'custom', label: customConditionLabel || 'Personalizado', color: customConditionColor }
          : { code: condCode };
        newConditions = [...currentConditions, newCond];
      }

      const updatedTeeth = { ...prev.teeth };
      if (newConditions.length === 0) {
        delete updatedTeeth[toothNum];
      } else {
        updatedTeeth[toothNum] = { ...(existing || { number: toothNum, conditions: [] }), conditions: newConditions };
      }

      return { ...prev, teeth: updatedTeeth };
    });
  }, [activeCondition, customConditionLabel, customConditionColor]);

  const handleToothClick = (toothNum: string) => {
    setSelectedTooth(prev => prev === toothNum ? null : toothNum);
    toggleCondition(toothNum);
  };

  const addSupernumerary = () => {
    const newTooth: ToothData = {
      number: `X${Date.now().toString().slice(-3)}`,
      conditions: [],
      isSupernumerary: true,
      notes: 'Diente supernumerario',
    };
    setChart(prev => ({ ...prev, supernumeraryTeeth: [...prev.supernumeraryTeeth, newTooth] }));
  };

  const addTreatmentProcedure = () => {
    setTreatmentProcedures(prev => [...prev, { toothNumber: selectedTooth || '', procedure: '', cost: '0' }]);
  };

  const buildTreatmentPlan = (): DentalTreatmentPlan => ({
    id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: treatmentTitle || `Plan de Tratamiento — ${entityName}`,
    teeth: treatmentProcedures.map(p => p.toothNumber).filter(Boolean),
    procedures: treatmentProcedures.map(p => ({
      toothNumber: p.toothNumber,
      conditionCode: '',
      procedure: p.procedure,
      estimatedCost: parseFloat(p.cost) || 0,
      completed: false,
    })),
    totalCost: treatmentProcedures.reduce((sum, p) => sum + (parseFloat(p.cost) || 0), 0),
    createdAt: new Date().toISOString(),
  });

  const dentalRows = chart.mode === 'child' ? CHILD_TEETH : ADULT_TEETH;
  const [upperRow, lowerRow] = dentalRows;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">Modo:</span>
          {(['adult', 'child', 'mixed'] as const).map(mode => (
            <button
              key={mode}
              type="button"
              onClick={() => setChart(prev => ({ ...prev, mode }))}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                chart.mode === mode
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-foreground hover:border-primary/50'
              }`}
            >
              {mode === 'adult' ? '🦷 Adulto (FDI)' : mode === 'child' ? '🍼 Infantil' : '🔀 Mixto'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addSupernumerary}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-400 rounded-lg text-xs font-bold hover:bg-teal-500/20 transition-colors"
          >
            <Plus size={14} /> Diente Extra
          </button>
          <button
            type="button"
            onClick={() => onSave(chart)}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar
          </button>
        </div>
      </div>

      {/* Condition Palette */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-border">
        <p className="text-xs font-bold text-slate-500 mb-2">Condición Activa (clic en el diente para aplicar):</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CONDITIONS).map(([code, def]) => (
            <button
              key={code}
              type="button"
              onClick={() => setActiveCondition(code)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                activeCondition === code
                  ? 'ring-2 ring-offset-1 ring-primary scale-105'
                  : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: def.color + '22',
                borderColor: def.color,
                color: def.color,
              }}
            >
              {def.symbol} {def.label}
            </button>
          ))}
        </div>
        {activeCondition === 'custom' && (
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={customConditionLabel}
              onChange={e => setCustomConditionLabel(e.target.value)}
              placeholder="Nombre del procedimiento personalizado"
              className="flex-1 text-sm bg-background border border-input rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              type="color"
              value={customConditionColor}
              onChange={e => setCustomConditionColor(e.target.value)}
              className="w-10 h-8 rounded cursor-pointer border border-border"
              title="Color de la condición"
            />
          </div>
        )}
      </div>

      {/* Odontogram Grid */}
      <div className="p-4 bg-card border border-border rounded-xl">
        {/* Upper arch */}
        <div className="flex items-center justify-center gap-1.5 mb-2 flex-wrap">
          {upperRow.map(num => (
            <div key={num} className="flex flex-col items-center gap-0.5">
              <ToothCell
                toothNum={num}
                toothData={chart.teeth[num]}
                isSelected={selectedTooth === num}
                onClick={() => handleToothClick(num)}
              />
              <span className="text-[9px] text-slate-400 font-mono">{num}</span>
            </div>
          ))}
        </div>

        {/* Separator */}
        <div className="my-3 border-t-2 border-dashed border-border relative">
          <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-[10px] text-slate-400 font-bold">LÍNEA MEDIA</span>
        </div>

        {/* Lower arch */}
        <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
          {lowerRow.map(num => (
            <div key={num} className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] text-slate-400 font-mono">{num}</span>
              <ToothCell
                toothNum={num}
                toothData={chart.teeth[num]}
                isSelected={selectedTooth === num}
                onClick={() => handleToothClick(num)}
              />
            </div>
          ))}
        </div>

        {/* Supernumerary teeth */}
        {chart.supernumeraryTeeth.length > 0 && (
          <div className="mt-4 pt-3 border-t border-dashed border-border">
            <p className="text-xs font-bold text-teal-600 mb-2">🦷 Piezas Supernumerarias:</p>
            <div className="flex flex-wrap gap-2">
              {chart.supernumeraryTeeth.map(t => (
                <div key={t.number} className="flex flex-col items-center gap-0.5">
                  <div className="w-10 h-10 rounded-lg border-2 border-teal-400 bg-teal-400/10 flex items-center justify-center text-[10px] font-black text-teal-600">
                    {t.number}
                  </div>
                  <span className="text-[9px] text-teal-500 font-mono">{t.number}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-border">
        <p className="text-xs font-bold text-slate-500 mb-2">Leyenda — Simbología Clínica FDI:</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(CONDITIONS).filter(([k]) => k !== 'custom').map(([code, def]) => (
            <div key={code} className="flex items-center gap-1.5 text-xs">
              <span
                className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black text-white shrink-0"
                style={{ backgroundColor: def.color }}
              >
                {def.symbol}
              </span>
              <span className="text-foreground font-medium">{def.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Treatment Plan Panel */}
      {onCreateKanban && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl">
          <button
            type="button"
            onClick={() => setShowTreatmentPanel(v => !v)}
            className="flex items-center gap-2 text-sm font-bold text-indigo-700 dark:text-indigo-400 w-full"
          >
            <Zap size={16} />
            ⚡ Crear Plan de Tratamiento y Convertir a Orden Kanban
          </button>

          {showTreatmentPanel && (
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={treatmentTitle}
                onChange={e => setTreatmentTitle(e.target.value)}
                placeholder={`Plan de Tratamiento — ${entityName}`}
                className="w-full text-sm bg-background border border-input rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />

              {treatmentProcedures.map((proc, idx) => (
                <div key={idx} className="flex gap-2 flex-wrap">
                  <input
                    type="text"
                    value={proc.toothNumber}
                    onChange={e => setTreatmentProcedures(prev => prev.map((p, i) => i === idx ? { ...p, toothNumber: e.target.value } : p))}
                    placeholder="#Diente"
                    className="w-20 text-xs bg-background border border-input rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    type="text"
                    value={proc.procedure}
                    onChange={e => setTreatmentProcedures(prev => prev.map((p, i) => i === idx ? { ...p, procedure: e.target.value } : p))}
                    placeholder="Procedimiento (ej: Obturación mesial)"
                    className="flex-1 min-w-32 text-xs bg-background border border-input rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    type="number"
                    value={proc.cost}
                    onChange={e => setTreatmentProcedures(prev => prev.map((p, i) => i === idx ? { ...p, cost: e.target.value } : p))}
                    placeholder="Costo"
                    min="0"
                    step="0.01"
                    className="w-24 text-xs bg-background border border-input rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={addTreatmentProcedure}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"
              >
                <Plus size={14} /> Agregar Procedimiento
              </button>

              {treatmentProcedures.length > 0 && (
                <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-800 rounded-lg border border-border">
                  <span className="text-xs font-bold text-slate-500">Total Estimado:</span>
                  <span className="text-sm font-black text-indigo-700">
                    ${treatmentProcedures.reduce((sum, p) => sum + (parseFloat(p.cost) || 0), 0).toFixed(2)}
                  </span>
                </div>
              )}

              <button
                type="button"
                disabled={treatmentProcedures.length === 0}
                onClick={() => onCreateKanban(buildTreatmentPlan())}
                className="w-full py-2 px-4 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Zap size={16} /> Crear Orden Kanban a partir de este Plan
              </button>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-bold text-foreground mb-1.5">Notas Generales del Odontograma</label>
        <textarea
          value={chart.generalNotes || ''}
          onChange={e => setChart(prev => ({ ...prev, generalNotes: e.target.value }))}
          rows={2}
          placeholder="Observaciones generales del paciente, alergias a anestesia, etc."
          className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>
    </div>
  );
}
