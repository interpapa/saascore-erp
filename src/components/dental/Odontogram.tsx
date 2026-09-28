'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Save, 
  Zap, 
  RefreshCw, 
  Layers, 
  Smile, 
  LayoutGrid, 
  HelpCircle, 
  Trash2,
  Check,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import { DentalChart, ToothData, ToothCondition, DentalTreatmentPlan } from '@/app/actions/dental';
import { DentalArch, CHILD_TO_ADULT_MAP } from './DentalArch';

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

// FIX: Simbología clínica FDI con color de alto contraste para 'ausente' visible en dark/light mode
export const CONDITIONS: Record<string, { label: string; color: string; bg: string; symbol: string }> = {
  caries:     { label: 'Caries',       color: '#ef4444', bg: 'bg-red-500',      symbol: 'C' },
  obturacion: { label: 'Obturación',   color: '#3b82f6', bg: 'bg-blue-500',     symbol: 'O' },
  endodoncia: { label: 'Endodoncia',   color: '#8b5cf6', bg: 'bg-violet-500',   symbol: 'E' },
  corona:     { label: 'Corona',       color: '#f59e0b', bg: 'bg-amber-400',    symbol: 'K' },
  implante:   { label: 'Implante',     color: '#6366f1', bg: 'bg-indigo-500',   symbol: '🔩' },
  ausente:    { label: 'Ausente',      color: '#94a3b8', bg: 'bg-slate-600',    symbol: '✕' }, // FIX: Slate claro visible en dark mode
  fractura:   { label: 'Fractura',     color: '#e11d48', bg: 'bg-rose-600',     symbol: '⚡' },
  custom:     { label: 'Personalizado',color: '#14b8a6', bg: 'bg-teal-500',     symbol: '?' },
};

// Ubicaciones comunes para dientes supernumerarios
const SUPERNUMERARY_SPACES = [
  { id: 'mesiodens', label: 'Mesiodens (Entre 11 y 21 - Línea Media)', number: '11+' },
  { id: 'distomolar_18', label: 'Distomolar Sup. Derecho (Detrás de 18)', number: '18+' },
  { id: 'distomolar_28', label: 'Distomolar Sup. Izquierdo (Detrás de 28)', number: '28+' },
  { id: 'distomolar_38', label: 'Distomolar Inf. Izquierdo (Detrás de 38)', number: '38+' },
  { id: 'distomolar_48', label: 'Distomolar Inf. Derecho (Detrás de 48)', number: '48+' },
  { id: 'paramolar_upper', label: 'Paramolar Superior (Vestibular)', number: 'PM+' },
  { id: 'custom_pos', label: 'Posición Personalizada...', number: 'X+' },
];

function ToothCell({ toothNum, toothData, isSelected, onClick }: {
  toothNum: string;
  toothData?: ToothData;
  isSelected: boolean;
  onClick: () => void;
}) {
  const conditions = toothData?.conditions || [];
  const hasConditions = conditions.length > 0;
  const isAbsent = conditions.some(c => c.code === 'ausente');
  const cond1 = conditions[0] ? CONDITIONS[conditions[0].code] : null;
  const cond2 = conditions[1] ? CONDITIONS[conditions[1].code] : null;
  const hasMultiple = conditions.length > 1;

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Diente ${toothNum}${toothData?.notes ? ' — ' + toothData.notes : ''}${
        conditions.length > 0 ? ` (${conditions.map(c => c.label || CONDITIONS[c.code]?.label || c.code).join(', ')})` : ''
      }`}
      className={`w-11 h-11 rounded-xl border-2 text-[10px] font-black transition-all relative flex flex-col items-center justify-center overflow-hidden ${
        isSelected
          ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-2 scale-110 z-10 shadow-md'
          : hasConditions
          ? 'border-slate-300 dark:border-slate-600 hover:scale-105'
          : 'border-slate-200 dark:border-slate-700 bg-background hover:border-primary/50 hover:bg-primary/5'
      } ${
        isAbsent ? 'bg-slate-800/80 border-slate-500' : ''
      }`}
      style={
        hasMultiple && cond1 && cond2 && !isSelected
          ? {
              background: `linear-gradient(135deg, ${cond1.color}33 50%, ${cond2.color}33 50%)`,
              borderColor: cond1.color,
            }
          : cond1 && !isSelected && !isAbsent
          ? { borderColor: cond1.color, backgroundColor: cond1.color + '22' }
          : {}
      }
    >
      {isAbsent ? (
        <span className="text-slate-200 font-black text-sm drop-shadow-xs">✕</span>
      ) : hasMultiple ? (
        <div className="flex items-center gap-0.5">
          <span style={{ color: cond1?.color }} className="text-[10px] font-black">{cond1?.symbol}</span>
          <span className="text-slate-400 text-[8px]">·</span>
          <span style={{ color: cond2?.color }} className="text-[10px] font-black">{cond2?.symbol}</span>
        </div>
      ) : cond1 ? (
        <span style={{ color: cond1.color }} className="text-xs font-black">{cond1.symbol}</span>
      ) : (
        <span className="text-slate-400 font-mono text-[11px]">{toothNum.slice(-1)}</span>
      )}

      {/* Badge contador de tratamientos */}
      {conditions.length > 1 && (
        <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-primary text-white rounded-full text-[8px] font-black flex items-center justify-center">
          {conditions.length}
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

  const [viewMode, setViewMode] = useState<'arch' | 'grid'>('arch');
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [activeCondition, setActiveCondition] = useState<string>('caries');
  const [customConditionLabel, setCustomConditionLabel] = useState('');
  const [customConditionColor, setCustomConditionColor] = useState('#14b8a6');
  const [showSupernumeraryModal, setShowSupernumeraryModal] = useState(false);
  const [selectedSuperSpace, setSelectedSuperSpace] = useState('mesiodens');
  const [customToothCode, setCustomToothCode] = useState('');
  const [showTreatmentPanel, setShowTreatmentPanel] = useState(false);
  const [treatmentProcedures, setTreatmentProcedures] = useState<Array<{ toothNumber: string; procedure: string; cost: string }>>([]);
  const [treatmentTitle, setTreatmentTitle] = useState('');

  // Sincronizar initialChart
  useEffect(() => {
    if (initialChart) setChart(initialChart);
  }, [initialChart]);

  // Aplicar o remover condición sobre el diente
  const toggleConditionOnTooth = useCallback((toothNum: string, condCode: string) => {
    setChart(prev => {
      const existing = prev.teeth[toothNum];
      const currentConditions = existing?.conditions || [];

      const alreadyHas = currentConditions.some(c => c.code === condCode);
      let newConditions: ToothCondition[];

      if (alreadyHas) {
        newConditions = currentConditions.filter(c => c.code !== condCode);
      } else {
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
  }, [customConditionLabel, customConditionColor]);

  const handleToothClick = (toothNum: string) => {
    setSelectedTooth(toothNum);
    toggleConditionOnTooth(toothNum, activeCondition);
  };

  // Agregar diente supernumerario con espacio específico
  const handleAddSupernumeraryWithSpace = () => {
    const spaceDef = SUPERNUMERARY_SPACES.find(s => s.id === selectedSuperSpace);
    const finalNumber = selectedSuperSpace === 'custom_pos' && customToothCode.trim() 
      ? customToothCode.trim().toUpperCase() 
      : spaceDef?.number || `X${Date.now().toString().slice(-3)}`;

    const newTooth: ToothData = {
      number: finalNumber,
      conditions: [],
      isSupernumerary: true,
      notes: spaceDef?.label || 'Diente supernumerario',
    };

    setChart(prev => ({
      ...prev,
      supernumeraryTeeth: [...prev.supernumeraryTeeth, newTooth],
    }));

    setShowSupernumeraryModal(false);
    setCustomToothCode('');
  };

  // Remover diente supernumerario
  const handleRemoveSupernumerary = (number: string) => {
    setChart(prev => {
      const updatedSuper = prev.supernumeraryTeeth.filter(t => t.number !== number);
      const updatedTeeth = { ...prev.teeth };
      delete updatedTeeth[number];
      return { ...prev, supernumeraryTeeth: updatedSuper, teeth: updatedTeeth };
    });
  };

  // Transición evolutiva niño a adulto (Erupcionar diente definitivo)
  const handleExfoliateAndErupt = (childNum: string, adultNum: string) => {
    setChart(prev => {
      const updatedTeeth = { ...prev.teeth };
      const childData = updatedTeeth[childNum];

      // El diente infantil se marca como ausente / exfoliado
      updatedTeeth[childNum] = {
        number: childNum,
        conditions: [{ code: 'ausente', notes: 'Pieza de leche exfoliada (mudada)' }],
      };

      // Si el diente definitivo no tenía datos, se inicializa como erupcionado sano
      if (!updatedTeeth[adultNum]) {
        updatedTeeth[adultNum] = {
          number: adultNum,
          conditions: [],
          notes: `Erupcionó tras caída de pieza infantil ${childNum}`,
        };
      }

      return { ...prev, teeth: updatedTeeth };
    });
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
  const selectedToothData = selectedTooth ? chart.teeth[selectedTooth] : null;

  return (
    <div className="space-y-6">
      {/* Barra de Controles Superiores */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-card border border-border p-4 rounded-2xl shadow-xs">
        {/* Selector de Dentición (Evolución Niño / Adulto / Mixto) */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Etapa:</span>
          {(['adult', 'child', 'mixed'] as const).map(mode => (
            <button
              key={mode}
              type="button"
              onClick={() => setChart(prev => ({ ...prev, mode }))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                chart.mode === mode
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-background border-border text-foreground hover:border-primary/50'
              }`}
            >
              {mode === 'adult' ? '🦷 Adulto (32 Dientes)' : mode === 'child' ? '🍼 Infantil (20 Dientes)' : '🔀 Mixto / Evolución'}
            </button>
          ))}
        </div>

        {/* Switch de Vista: Arcada de Boca vs Cuadrícula */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setViewMode('arch')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'arch'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-slate-500 hover:text-foreground'
            }`}
          >
            <Smile size={14} />
            Boca Anatómica
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'grid'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-slate-500 hover:text-foreground'
            }`}
          >
            <LayoutGrid size={14} />
            Cuadrícula FDI
          </button>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSupernumeraryModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400 rounded-xl text-xs font-bold hover:bg-teal-500/20 transition-all btn-haptic"
          >
            <Plus size={14} /> + Agregar Diente Extra
          </button>
          <button
            type="button"
            onClick={() => onSave(chart)}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-50 btn-haptic shadow-xs"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar Odontograma
          </button>
        </div>
      </div>

      {/* Paleta de Patologías y Tratamientos */}
      <div className="p-4 bg-card border border-border rounded-2xl space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Patología Activa para Aplicar con Clic:
          </p>
          <span className="text-[11px] text-slate-400">
            {CONDITIONS[activeCondition]?.label} seleccionado
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(CONDITIONS).map(([code, def]) => (
            <button
              key={code}
              type="button"
              onClick={() => setActiveCondition(code)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                activeCondition === code
                  ? 'ring-2 ring-primary ring-offset-2 scale-105 shadow-xs'
                  : 'opacity-70 hover:opacity-100 hover:scale-102'
              }`}
              style={{
                backgroundColor: def.color + '22',
                borderColor: def.color,
                color: def.color,
              }}
            >
              <span className="w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-black" style={{ backgroundColor: def.color, color: '#ffffff' }}>
                {def.symbol}
              </span>
              {def.label}
            </button>
          ))}
        </div>

        {activeCondition === 'custom' && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <input
              type="text"
              value={customConditionLabel}
              onChange={e => setCustomConditionLabel(e.target.value)}
              placeholder="Nombre del procedimiento personalizado (ej: Carilla de porcelana, Cirugía apical)"
              className="flex-1 text-xs bg-background border border-input rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              type="color"
              value={customConditionColor}
              onChange={e => setCustomConditionColor(e.target.value)}
              className="w-10 h-8 rounded-lg cursor-pointer border border-border"
              title="Color de la condición"
            />
          </div>
        )}
      </div>

      {/* Render Principal: Vista de Arcada Anatómica (Boca) o Cuadrícula FDI */}
      {viewMode === 'arch' ? (
        <DentalArch
          teeth={chart.teeth}
          selectedTooth={selectedTooth}
          onSelectTooth={handleToothClick}
          mode={chart.mode}
          onExfoliateAndErupt={handleExfoliateAndErupt}
        />
      ) : (
        /* Vista de Cuadrícula FDI */
        <div className="p-6 bg-card border border-border rounded-3xl space-y-4 shadow-xs">
          {/* Arcada Superior */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-2">
              Arcada Superior Maxilar
            </p>
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {upperRow.map(num => (
                <div key={num} className="flex flex-col items-center gap-1">
                  <ToothCell
                    toothNum={num}
                    toothData={chart.teeth[num]}
                    isSelected={selectedTooth === num}
                    onClick={() => handleToothClick(num)}
                  />
                  <span className="text-[10px] text-slate-400 font-mono font-bold">{num}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Línea media divisoria */}
          <div className="relative py-2">
            <div className="border-t border-dashed border-border" />
            <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Línea Media
            </span>
          </div>

          {/* Arcada Inferior */}
          <div>
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {lowerRow.map(num => (
                <div key={num} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-slate-400 font-mono font-bold">{num}</span>
                  <ToothCell
                    toothNum={num}
                    toothData={chart.teeth[num]}
                    isSelected={selectedTooth === num}
                    onClick={() => handleToothClick(num)}
                  />
                </div>
              ))}
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mt-2">
              Arcada Inferior Mandibular
            </p>
          </div>
        </div>
      )}

      {/* Dientes Supernumerarios Agregados */}
      {chart.supernumeraryTeeth.length > 0 && (
        <div className="p-4 bg-card border border-teal-500/20 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
              <span>🦷 Piezas Supernumerarias Registradas ({chart.supernumeraryTeeth.length}):</span>
            </p>
            <span className="text-[11px] text-slate-400">Haz clic para aplicar o gestionar patologías</span>
          </div>

          <div className="flex flex-wrap gap-3">
            {chart.supernumeraryTeeth.map(t => {
              const toothData = chart.teeth[t.number];
              const conditions = toothData?.conditions || [];

              return (
                <div
                  key={t.number}
                  className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 border border-border rounded-xl"
                >
                  <ToothCell
                    toothNum={t.number}
                    toothData={toothData}
                    isSelected={selectedTooth === t.number}
                    onClick={() => handleToothClick(t.number)}
                  />
                  <div>
                    <p className="text-xs font-bold text-foreground">Pieza {t.number}</p>
                    <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{t.notes || 'Extra'}</p>
                    {conditions.length > 0 && (
                      <p className="text-[9px] text-teal-600 font-bold">
                        {conditions.length} condición(es)
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSupernumerary(t.number)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition-colors ml-1"
                    title="Eliminar pieza supernumeraria"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inspector Detallado del Diente Seleccionado */}
      {selectedTooth && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-foreground">
                Diente #{selectedTooth}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {selectedToothData?.isSupernumerary ? 'Pieza Supernumeraria' : 'FDI Internacional'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTooth(null)}
              className="text-xs text-slate-400 hover:text-foreground font-bold"
            >
              Cerrar Inspector
            </button>
          </div>

          {/* Lista de Condiciones en este Diente */}
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1.5">Tratamientos / Condiciones Aplicadas:</p>
            {(selectedToothData?.conditions || []).length === 0 ? (
              <p className="text-xs text-slate-400 italic">Diente completamente sano (sin condiciones registradas).</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedToothData?.conditions.map((cond, idx) => {
                  const def = CONDITIONS[cond.code];
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border"
                      style={{
                        backgroundColor: (cond.color || def?.color || '#3b82f6') + '22',
                        borderColor: cond.color || def?.color || '#3b82f6',
                        color: cond.color || def?.color || '#3b82f6',
                      }}
                    >
                      <span>{def?.symbol || '•'}</span>
                      <span>{cond.label || def?.label || cond.code}</span>
                      <button
                        type="button"
                        onClick={() => toggleConditionOnTooth(selectedTooth, cond.code)}
                        className="hover:scale-125 transition-transform ml-1 text-slate-400 hover:text-red-500"
                        title="Remover condición"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notas específicas por diente */}
          <div>
            <input
              type="text"
              value={selectedToothData?.notes || ''}
              onChange={e => {
                const noteVal = e.target.value;
                setChart(prev => {
                  const existing = prev.teeth[selectedTooth] || { number: selectedTooth, conditions: [] };
                  return {
                    ...prev,
                    teeth: {
                      ...prev.teeth,
                      [selectedTooth]: { ...existing, notes: noteVal },
                    },
                  };
                });
              }}
              placeholder={`Notas clínicas sobre la pieza #${selectedTooth} (ej: Caries oclusal profunda, prueba de vitalidad pulpar +)`}
              className="w-full text-xs bg-background border border-input rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      )}

      {/* Modal / Selector para Añadir Diente Supernumerario con Posición */}
      {showSupernumeraryModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <span>🦷 Insertar Diente Extra / Supernumerario</span>
            </h3>
            <p className="text-xs text-slate-500">
              Selecciona el espacio interdental o cuadrante donde se ubica la pieza adicional:
            </p>

            <div className="space-y-2">
              {SUPERNUMERARY_SPACES.map(space => (
                <label
                  key={space.id}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedSuperSpace === space.id
                      ? 'border-primary bg-primary/5 text-primary font-bold'
                      : 'border-border text-foreground hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="superSpace"
                      value={space.id}
                      checked={selectedSuperSpace === space.id}
                      onChange={() => setSelectedSuperSpace(space.id)}
                      className="accent-primary"
                    />
                    <span className="text-xs">{space.label}</span>
                  </div>
                  <span className="text-xs font-mono font-black text-slate-400">{space.number}</span>
                </label>
              ))}
            </div>

            {selectedSuperSpace === 'custom_pos' && (
              <input
                type="text"
                value={customToothCode}
                onChange={e => setCustomToothCode(e.target.value)}
                placeholder="Código del diente extra (ej: S1, 14B, SUP-1)"
                className="w-full text-xs bg-background border border-input rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSupernumeraryModal(false)}
                className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddSupernumeraryWithSpace}
                className="w-full py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors"
              >
                Insertar Pieza
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan de Tratamiento y Conversión a Kanban */}
      {onCreateKanban && (
        <div className="p-4 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-500/20 rounded-2xl space-y-3">
          <button
            type="button"
            onClick={() => setShowTreatmentPanel(v => !v)}
            className="flex items-center justify-between text-xs font-bold text-teal-700 dark:text-teal-400 w-full"
          >
            <span className="flex items-center gap-2">
              <Zap size={16} />
              Presupuesto Dental y Plan de Tratamiento → Enviar a Proceso
            </span>
            <ChevronDown size={16} className={`transition-transform ${showTreatmentPanel ? 'rotate-180' : ''}`} />
          </button>

          {showTreatmentPanel && (
            <div className="space-y-3 pt-2 border-t border-teal-500/20">
              <input
                type="text"
                value={treatmentTitle}
                onChange={e => setTreatmentTitle(e.target.value)}
                placeholder={`Plan de Tratamiento Dental — ${entityName}`}
                className="w-full text-xs bg-background border border-input rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />

              {treatmentProcedures.map((proc, idx) => (
                <div key={idx} className="flex gap-2 flex-wrap items-center">
                  <input
                    type="text"
                    value={proc.toothNumber}
                    onChange={e => setTreatmentProcedures(prev => prev.map((p, i) => i === idx ? { ...p, toothNumber: e.target.value } : p))}
                    placeholder="# Diente"
                    className="w-20 text-xs bg-background border border-input rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    type="text"
                    value={proc.procedure}
                    onChange={e => setTreatmentProcedures(prev => prev.map((p, i) => i === idx ? { ...p, procedure: e.target.value } : p))}
                    placeholder="Procedimiento (ej: Obturación con resina compuesta cara oclusal)"
                    className="flex-1 min-w-40 text-xs bg-background border border-input rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    type="number"
                    value={proc.cost}
                    onChange={e => setTreatmentProcedures(prev => prev.map((p, i) => i === idx ? { ...p, cost: e.target.value } : p))}
                    placeholder="Costo"
                    min="0"
                    step="0.01"
                    className="w-24 text-xs bg-background border border-input rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setTreatmentProcedures(prev => prev.filter((_, i) => i !== idx))}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addTreatmentProcedure}
                className="flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:underline"
              >
                <Plus size={14} /> + Agregar Procedimiento / Pieza
              </button>

              {treatmentProcedures.length > 0 && (
                <div className="flex justify-between items-center p-3 bg-card border border-border rounded-xl">
                  <span className="text-xs font-bold text-slate-500">Monto Total Presupuestado:</span>
                  <span className="text-base font-black text-foreground font-mono">
                    ${treatmentProcedures.reduce((sum, p) => sum + (parseFloat(p.cost) || 0), 0).toFixed(2)}
                  </span>
                </div>
              )}

              <button
                type="button"
                disabled={treatmentProcedures.length === 0}
                onClick={() => onCreateKanban(buildTreatmentPlan())}
                className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs btn-haptic"
              >
                <Zap size={16} /> Crear Orden de Seguimiento en el Tablero de Procesos
              </button>
            </div>
          )}
        </div>
      )}

      {/* Notas Generales */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Observaciones Generales del Paciente
        </label>
        <textarea
          value={chart.generalNotes || ''}
          onChange={e => setChart(prev => ({ ...prev, generalNotes: e.target.value }))}
          rows={2}
          placeholder="Alergias a fármacos o anestésicos, sensibilidad dental, mordida cruzada, bruxismo..."
          className="w-full bg-background border border-input rounded-2xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>
    </div>
  );
}
