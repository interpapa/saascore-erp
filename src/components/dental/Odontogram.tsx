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
  ArrowRight,
  Clock,
  Receipt,
  Sparkles,
  Eye,
  Activity,
  Info
} from 'lucide-react';
import { 
  DentalChart, 
  ToothData, 
  ToothCondition, 
  DentalTreatmentPlan, 
  DentalTreatmentProcedure 
} from '@/app/actions/dental';
import { DentalArch, CHILD_TO_ADULT_MAP, TOOTH_NAMES } from './DentalArch';
import { DentalProcedureDefinition, DENTAL_PROCEDURES_MASTER } from '@/lib/dental/proceduresCatalog';

interface OdontogramProps {
  entityId: string;
  entityName: string;
  initialChart?: DentalChart;
  onSave: (chart: DentalChart) => Promise<void>;
  onCreateKanban?: (plan: DentalTreatmentPlan) => Promise<void>;
  isSaving?: boolean;
  isCreatingKanban?: boolean;
  dentalCatalog?: DentalProcedureDefinition[];
  onOpenCheckout?: () => void;
  onOpenSchedule?: (hint?: string) => void;
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

// Simbología clínica FDI con color de alto contraste y soporte oscuro/claro
export const CONDITIONS: Record<string, { label: string; color: string; bg: string; symbol: string; desc: string }> = {
  select:     { label: 'Inspeccionar', color: '#64748b', bg: 'bg-slate-500',   symbol: '🔍', desc: 'Seleccionar pieza sin modificar patología' },
  caries:     { label: 'Caries',       color: '#ef4444', bg: 'bg-red-500',      symbol: 'C',  desc: 'Lesión activa en esmalte o dentina' },
  obturacion: { label: 'Obturación',   color: '#3b82f6', bg: 'bg-blue-500',     symbol: 'O',  desc: 'Restauración en resina o amalgama' },
  endodoncia: { label: 'Endodoncia',   color: '#8b5cf6', bg: 'bg-violet-500',   symbol: 'E',  desc: 'Tratamiento de conducto pulpar' },
  corona:     { label: 'Corona',       color: '#f59e0b', bg: 'bg-amber-400',    symbol: 'K',  desc: 'Prótesis fija de porcelana o zirconio' },
  implante:   { label: 'Implante',     color: '#06b6d4', bg: 'bg-cyan-500',     symbol: '🔩', desc: 'Fijación de titanio osteointegrada' },
  ausente:    { label: 'Ausente',      color: '#94a3b8', bg: 'bg-slate-600',    symbol: '✕',  desc: 'Pieza extraída o ausente congénita' },
  fractura:   { label: 'Fractura',     color: '#e11d48', bg: 'bg-rose-600',     symbol: '⚡', desc: 'Pérdida de tejido por traumatismo' },
  custom:     { label: 'Personalizado',color: '#14b8a6', bg: 'bg-teal-500',     symbol: '?',  desc: 'Condición clínica personalizada' },
};

// Ubicaciones comunes para dientes supernumerarios con descripciones anatómicas claras
const SUPERNUMERARY_SPACES = [
  { id: 'mesiodens', label: 'Mesiodens — Línea Media Superior (Entre 11 y 21)', number: '11+', desc: 'El supernumerario más frecuente, entre incisivos centrales' },
  { id: 'distomolar_18', label: 'Distomolar Sup. Derecho (Detrás de 18)', number: '18+', desc: 'Cuarto molar maxilar derecho' },
  { id: 'distomolar_28', label: 'Distomolar Sup. Izquierdo (Detrás de 28)', number: '28+', desc: 'Cuarto molar maxilar izquierdo' },
  { id: 'distomolar_48', label: 'Distomolar Inf. Derecho (Detrás de 48)', number: '48+', desc: 'Cuarto molar mandibular derecho' },
  { id: 'distomolar_38', label: 'Distomolar Inf. Izquierdo (Detrás de 38)', number: '38+', desc: 'Cuarto molar mandibular izquierdo' },
  { id: 'paramolar_upper', label: 'Paramolar — Premolares / Molares', number: 'PM+', desc: 'Supernumerario en cara vestibular o palatina' },
  { id: 'custom_pos', label: 'Código o Posición Libre...', number: 'SN+', desc: 'Escribe una identificación manual para la pieza' },
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
  const isImplant = conditions.some(c => c.code === 'implante');
  const isCrown = conditions.some(c => c.code === 'corona');
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
      className={`w-12 h-12 rounded-2xl border-2 text-[11px] font-black transition-all relative flex flex-col items-center justify-center overflow-hidden shadow-xs ${
        isSelected
          ? 'border-teal-500 bg-teal-500/15 ring-2 ring-teal-500 ring-offset-2 scale-110 z-10 shadow-lg'
          : hasConditions
          ? 'border-slate-400 dark:border-slate-500 hover:scale-105'
          : 'border-slate-200 dark:border-slate-700 bg-linear-to-b from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 hover:border-teal-500/50 hover:scale-102'
      } ${
        isAbsent ? 'bg-slate-900/90 border-slate-600' : ''
      }`}
      style={
        hasMultiple && cond1 && cond2 && !isSelected
          ? {
              background: `linear-gradient(135deg, ${cond1.color}33 50%, ${cond2.color}33 50%)`,
              borderColor: cond1.color,
            }
          : isCrown && !isSelected
          ? { borderColor: '#f59e0b', backgroundColor: '#f59e0b22' }
          : isImplant && !isSelected
          ? { borderColor: '#06b6d4', backgroundColor: '#06b6d422' }
          : cond1 && !isSelected && !isAbsent
          ? { borderColor: cond1.color, backgroundColor: cond1.color + '22' }
          : {}
      }
    >
      {isAbsent ? (
        <span className="text-slate-300 font-black text-sm drop-shadow-xs">✕</span>
      ) : hasMultiple ? (
        <div className="flex items-center gap-0.5">
          <span style={{ color: cond1?.color }} className="text-[10px] font-black">{cond1?.symbol}</span>
          <span className="text-slate-400 text-[8px]">·</span>
          <span style={{ color: cond2?.color }} className="text-[10px] font-black">{cond2?.symbol}</span>
        </div>
      ) : isImplant ? (
        <span className="text-cyan-400 text-xs">🔩</span>
      ) : cond1 ? (
        <span style={{ color: cond1.color }} className="text-xs font-black">{cond1.symbol}</span>
      ) : (
        <span className="text-slate-400 font-mono text-[11px]">{toothNum.slice(-1)}</span>
      )}

      {/* Badge contador de tratamientos */}
      {conditions.length > 1 && (
        <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-teal-500 text-white rounded-full text-[8px] font-black flex items-center justify-center">
          {conditions.length}
        </span>
      )}
    </button>
  );
}

export function Odontogram({ 
  entityId, 
  entityName, 
  initialChart, 
  onSave, 
  onCreateKanban, 
  isSaving, 
  isCreatingKanban = false,
  dentalCatalog,
  onOpenCheckout,
  onOpenSchedule
}: OdontogramProps) {
  const [chart, setChart] = useState<DentalChart>(() => initialChart || {
    mode: 'adult',
    teeth: {},
    supernumeraryTeeth: [],
    lastUpdated: new Date().toISOString(),
  });

  const catalog = dentalCatalog && dentalCatalog.length > 0 ? dentalCatalog : DENTAL_PROCEDURES_MASTER;

  const [viewMode, setViewMode] = useState<'arch' | 'grid'>('arch');
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [activeCondition, setActiveCondition] = useState<string>('select');
  const [clinicalStatus, setClinicalStatus] = useState<'existente' | 'planificado' | 'realizado'>('planificado');
  const [customConditionLabel, setCustomConditionLabel] = useState('');
  const [customConditionColor, setCustomConditionColor] = useState('#14b8a6');
  const [showSupernumeraryModal, setShowSupernumeraryModal] = useState(false);
  const [showGeneralProcModal, setShowGeneralProcModal] = useState(false);
  const [selectedSuperSpace, setSelectedSuperSpace] = useState('mesiodens');
  const [customToothCode, setCustomToothCode] = useState('');
  const [showTreatmentPanel, setShowTreatmentPanel] = useState(false);
  const [treatmentProcedures, setTreatmentProcedures] = useState<Array<{
    id?: string;
    toothNumber: string;
    procedure: string;
    cost: string;
    category?: string;
    completed?: boolean;
    stages?: any[];
    notes?: string;
  }>>([]);
  const [treatmentTitle, setTreatmentTitle] = useState('');

  // Sincronizar initialChart y su plan de tratamiento si existe
  useEffect(() => {
    if (initialChart) {
      setChart(initialChart);
      if (initialChart.treatmentPlan?.procedures && initialChart.treatmentPlan.procedures.length > 0) {
        setTreatmentProcedures(
          initialChart.treatmentPlan.procedures.map((p) => ({
            id: p.id,
            toothNumber: p.toothNumber,
            procedure: p.procedure,
            cost: String(p.estimatedCost ?? 0),
            category: p.category,
            completed: p.completed,
            stages: p.stages,
            notes: p.notes,
          }))
        );
        if (initialChart.treatmentPlan.title) {
          setTreatmentTitle(initialChart.treatmentPlan.title);
        }
        setShowTreatmentPanel(true);
      }
    }
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
          ? { code: 'custom', label: customConditionLabel || 'Personalizado', color: customConditionColor, faces: [], status: clinicalStatus }
          : { code: condCode, faces: [], status: clinicalStatus };
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
  }, [customConditionLabel, customConditionColor, clinicalStatus]);

  // Alternar cara específica (Vestibular, Lingual, Mesial, Distal, Oclusal) en la patología activa
  const toggleFaceOnCondition = (toothNum: string, faceName: string, statusOverride?: 'existente' | 'planificado' | 'realizado') => {
    setSelectedTooth(toothNum);
    const targetCondition = activeCondition === 'select' ? 'caries' : activeCondition;
    if (activeCondition === 'select') {
      setActiveCondition('caries');
    }
    const finalStatus = statusOverride || clinicalStatus;
    setChart(prev => {
      const existing = prev.teeth[toothNum] || { number: toothNum, conditions: [] };
      const currentConditions = [...(existing.conditions || [])];

      // Buscar si el diente ya tiene la condición activa
      const condIndex = currentConditions.findIndex(c => c.code === targetCondition);
      if (condIndex === -1) {
        // Si no la tiene, agregar la condición con esta cara seleccionada
        const newCond: ToothCondition = targetCondition === 'custom'
          ? { code: 'custom', label: customConditionLabel || 'Personalizado', color: customConditionColor, faces: [faceName], status: finalStatus }
          : { code: targetCondition, faces: [faceName], status: finalStatus };
        currentConditions.push(newCond);
      } else {
        // Si ya existe, alternar la cara
        const cond = { ...currentConditions[condIndex], status: finalStatus };
        const faces = Array.isArray(cond.faces) ? [...cond.faces] : [];
        if (faces.includes(faceName)) {
          cond.faces = faces.filter(f => f !== faceName);
        } else {
          cond.faces = [...faces, faceName];
        }

        // Si se desmarcan todas las caras de caries u obturación, remover la condición
        if (cond.faces.length === 0 && (targetCondition === 'caries' || targetCondition === 'obturacion')) {
          currentConditions.splice(condIndex, 1);
        } else {
          currentConditions[condIndex] = cond;
        }
      }

      const updatedTeeth = { ...prev.teeth };
      if (currentConditions.length === 0) {
        delete updatedTeeth[toothNum];
      } else {
        updatedTeeth[toothNum] = { ...existing, conditions: currentConditions };
      }

      return {
        ...prev,
        teeth: updatedTeeth,
      };
    });
  };

  const handleToothClick = (toothNum: string) => {
    setSelectedTooth(toothNum);
    if (activeCondition !== 'select') {
      toggleConditionOnTooth(toothNum, activeCondition);
    }
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
    setTreatmentProcedures(prev => prev.filter(p => p.toothNumber !== number));
    if (selectedTooth === number) {
      setSelectedTooth(null);
    }
  };

  // Transición evolutiva niño a adulto (Erupcionar diente definitivo)
  const handleExfoliateAndErupt = (childNum: string, adultNum: string) => {
    setChart(prev => {
      const updatedTeeth = { ...prev.teeth };
      updatedTeeth[childNum] = {
        number: childNum,
        conditions: [{ code: 'ausente', notes: 'Pieza de leche exfoliada (mudada)' }],
      };

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
    id: chart.treatmentPlan?.id || `plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: treatmentTitle || `Plan de Tratamiento — ${entityName}`,
    teeth: Array.from(new Set(treatmentProcedures.map(p => p.toothNumber).filter(Boolean))),
    procedures: treatmentProcedures.map(p => ({
      id: p.id || `proc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      toothNumber: p.toothNumber,
      conditionCode: '',
      procedure: p.procedure,
      category: p.category || 'General',
      estimatedCost: parseFloat(p.cost) || 0,
      completed: p.completed || false,
      stages: p.stages,
      notes: p.notes,
    })),
    totalCost: treatmentProcedures.reduce((sum, p) => sum + (parseFloat(p.cost) || 0), 0),
    createdAt: chart.treatmentPlan?.createdAt || new Date().toISOString(),
  });

  const handleSaveWithPlan = () => {
    if (onSave) {
      onSave(chart);
    }
  };

  const handleAddProcedureFromCatalog = (proc: DentalProcedureDefinition, toothNum: string) => {
    if (proc.conditionCode) {
      setChart(prev => {
        const existing = prev.teeth[toothNum] || { number: toothNum, conditions: [] };
        const conditions = existing.conditions || [];
        const alreadyHas = conditions.some(c => c.code === proc.conditionCode);
        const newConditions = alreadyHas ? conditions : [...conditions, { code: proc.conditionCode!, label: proc.name, color: proc.color }];
        return {
          ...prev,
          teeth: {
            ...prev.teeth,
            [toothNum]: { ...existing, conditions: newConditions },
          }
        };
      });
    }

    const newProc = {
      id: `proc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      toothNumber: toothNum,
      procedure: proc.name,
      cost: proc.defaultPriceUSD.toFixed(2),
      category: proc.categoryLabel,
      completed: false,
      stages: proc.stages,
      notes: `${proc.sessionsRequired > 1 ? `${proc.sessionsRequired} sesiones` : '1 cita'} (${proc.estimatedDurationMin} min)`,
    };

    setTreatmentProcedures(prev => [...prev, newProc]);
    setShowTreatmentPanel(true);
  };

  const dentalRows = chart.mode === 'child' ? CHILD_TEETH : ADULT_TEETH;
  const [upperRow, lowerRow] = dentalRows;
  const selectedToothData = selectedTooth ? chart.teeth[selectedTooth] : null;

  // Obtener render 3D individual para la ficha microscópica de la pieza seleccionada
  const getTooth3DAsset = (toothNum: string, conditions: ToothCondition[]) => {
    if (conditions.some(c => c.code === 'implante')) {
      return {
        src: '/dental/implant_3d.jpg',
        badge: 'Implante Biomecánico',
        type: 'Fijación de Titanio',
        desc: 'Tornillo oseointegrado con pilar transepitelial y corona de cerámica pura.',
      };
    }
    const num = parseInt(toothNum, 10);
    const isAnterior = [11,12,13,21,22,23,31,32,33,41,42,43,51,52,53,61,62,63,71,72,73,81,82,83].includes(num);
    if (isAnterior) {
      return {
        src: '/dental/incisor_3d.jpg',
        badge: 'Sector Anterior Estético',
        type: 'Incisivo / Canino',
        desc: 'Corona esbelta con borde incisal translúcido y raíz cónica unirradicular.',
      };
    }
    return {
      src: '/dental/molar_3d.jpg',
      badge: 'Sector Posterior Oclusal',
      type: 'Molar / Premolar',
      desc: 'Mesa oclusal con 4 cúspides, fosas de masticación y raíces múltiples con furca.',
    };
  };

  const specimen3D = selectedTooth ? getTooth3DAsset(selectedTooth, selectedToothData?.conditions || []) : null;

  // Caras anatómicas clínicas FDI para el inspector interactivo
  const CLINICAL_FACES = [
    { id: 'vestibular', short: 'V', name: 'Vestibular', desc: 'Cara exterior hacia el labio/mejilla' },
    { id: 'oclusal', short: 'O', name: 'Oclusal / Incisal', desc: 'Cara de mordida o corte' },
    { id: 'lingual', short: 'L', name: 'Lingual / Palatino', desc: 'Cara interna hacia la lengua o paladar' },
    { id: 'mesial', short: 'M', name: 'Mesial', desc: 'Cara lateral hacia la línea media' },
    { id: 'distal', short: 'D', name: 'Distal', desc: 'Cara lateral posterior' },
  ];

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
            Boca Anatómica 3D
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
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowGeneralProcModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 rounded-xl text-xs font-bold hover:bg-cyan-500/20 transition-all btn-haptic"
            title="Agregar tratamiento a toda la boca o cuadrante (Limpieza, Blanqueamiento, Ortodoncia, etc.)"
          >
            <Sparkles size={14} /> + Tratamiento General
          </button>
          <button
            type="button"
            onClick={() => setShowSupernumeraryModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400 rounded-xl text-xs font-bold hover:bg-teal-500/20 transition-all btn-haptic"
          >
            <Plus size={14} /> + Diente Extra
          </button>
          <button
            type="button"
            onClick={handleSaveWithPlan}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-50 btn-haptic shadow-xs"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar Odontograma
          </button>
        </div>
      </div>

      {/* Paleta de Patologías y Tratamientos con Selector de Estado Clínico */}
      <div className="p-4 bg-card border border-border rounded-2xl space-y-3 shadow-xs">
        {/* Selector de Estado Clínico de la Condición */}
        <div className="flex items-center justify-between pb-2.5 border-b border-border flex-wrap gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Estado de la Patología / Procedimiento:
          </span>
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setClinicalStatus('existente')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                clinicalStatus === 'existente'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-500 hover:text-foreground'
              }`}
              title="Lo que el paciente ya traía hecho de antes por otro odontólogo (Informativo, no suma al presupuesto)"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>⚪ Existente Previo (No cobra)</span>
            </button>
            <button
              type="button"
              onClick={() => setClinicalStatus('planificado')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                clinicalStatus === 'planificado'
                  ? 'bg-rose-500 text-white shadow-xs font-black'
                  : 'text-slate-500 hover:text-foreground'
              }`}
              title="Diagnóstico activo o procedimiento propuesto hoy para realizar (Suma al presupuesto y a cobrar)"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-white" />
              <span>🔴 Planificado Hoy (Presupuesta)</span>
            </button>
            <button
              type="button"
              onClick={() => setClinicalStatus('realizado')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                clinicalStatus === 'realizado'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'text-slate-500 hover:text-foreground'
              }`}
              title="Procedimiento concluido con éxito por nuestro equipo en clínica"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-white" />
              <span>🟢 Realizado en Clínica</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <span>Herramienta:</span>
            {activeCondition === 'select' ? (
              <span className="text-[10px] text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold">
                🔍 Modo Inspección — Haz clic en un diente para examinarlo sin alterarlo
              </span>
            ) : (
              <span className="text-[10px] text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full font-bold">
                Haz clic en cualquier cara o diente para marcar {CONDITIONS[activeCondition]?.label}
              </span>
            )}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">
            {CONDITIONS[activeCondition]?.label} {activeCondition !== 'select' ? `(${clinicalStatus})` : ''}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(CONDITIONS).map(([code, def]) => (
            <button
              key={code}
              type="button"
              onClick={() => setActiveCondition(code)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                activeCondition === code
                  ? 'ring-2 ring-teal-500 ring-offset-2 scale-105 shadow-md font-black'
                  : 'opacity-75 hover:opacity-100 hover:scale-102 bg-background'
              }`}
              style={{
                backgroundColor: activeCondition === code ? def.color + '25' : undefined,
                borderColor: def.color,
                color: def.color,
              }}
            >
              <span className="w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-black shrink-0" style={{ backgroundColor: def.color, color: '#ffffff' }}>
                {def.symbol}
              </span>
              <span>{def.label}</span>
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

      {/* Render Principal: Vista de Arcada Anatómica en Herradura o Cuadrícula FDI */}
      {viewMode === 'arch' ? (
        <DentalArch
          teeth={chart.teeth}
          selectedTooth={selectedTooth}
          onSelectTooth={handleToothClick}
          mode={chart.mode}
          clinicalStatus={clinicalStatus}
          onExfoliateAndErupt={handleExfoliateAndErupt}
          onToggleFace={(toothNum, face, status) => toggleFaceOnCondition(toothNum, face, status)}
          activeCondition={activeCondition}
          supernumeraryTeeth={chart.supernumeraryTeeth}
        />
      ) : (
        /* Vista de Cuadrícula FDI Cerámica */
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
            <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-widest">
              Línea Media Facial
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

      {/* INSPECTOR COMPACTO DEL DIENTE SELECCIONADO */}
      {selectedTooth && (
        <div className="p-4 bg-slate-900 border border-teal-500/40 rounded-3xl shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-150 text-white">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <span className="text-base font-black font-mono text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2.5 py-0.5 rounded-lg">
                #{selectedTooth}
              </span>
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <span>{TOOTH_NAMES[selectedTooth] || `Pieza ${selectedTooth}`}</span>
                  {specimen3D && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
                      {specimen3D.badge}
                    </span>
                  )}
                </h4>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTooth(null)}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors font-bold"
            >
              ✕ Cerrar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* Roseta de 5 Caras Clínicas */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-teal-400 flex items-center gap-1">
                <Activity size={13} /> Marcar Cara:
              </span>
              <div className="flex flex-col items-center justify-center space-y-1">
                {/* Vestibular */}
                {(() => {
                  const activeFaces = selectedToothData?.conditions.flatMap(c => c.faces || []) || [];
                  const isVActive = activeFaces.includes('vestibular');
                  return (
                    <button
                      type="button"
                      onClick={() => toggleFaceOnCondition(selectedTooth, 'vestibular')}
                      className={`w-32 py-1.5 px-2 rounded-lg text-xs font-bold transition-all border ${
                        isVActive
                          ? 'bg-teal-500 text-white border-teal-400 shadow-xs font-black'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-teal-500/50'
                      }`}
                    >
                      Vestibular (V)
                    </button>
                  );
                })()}

                {/* Mesial / Oclusal / Distal */}
                <div className="flex items-center gap-1">
                  {(() => {
                    const activeFaces = selectedToothData?.conditions.flatMap(c => c.faces || []) || [];
                    const isMActive = activeFaces.includes('mesial');
                    const isOActive = activeFaces.includes('oclusal');
                    const isDActive = activeFaces.includes('distal');
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleFaceOnCondition(selectedTooth, 'mesial')}
                          className={`w-20 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            isMActive
                              ? 'bg-teal-500 text-white border-teal-400 shadow-xs font-black'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-teal-500/50'
                          }`}
                        >
                          Mesial
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleFaceOnCondition(selectedTooth, 'oclusal')}
                          className={`w-24 py-2 rounded-lg text-xs font-black transition-all border ${
                            isOActive
                              ? 'bg-cyan-500 text-white border-cyan-400 shadow-md scale-102 font-black'
                              : 'bg-slate-700 border-slate-600 text-white hover:border-cyan-500/50'
                          }`}
                        >
                          Oclusal
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleFaceOnCondition(selectedTooth, 'distal')}
                          className={`w-20 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            isDActive
                              ? 'bg-teal-500 text-white border-teal-400 shadow-xs font-black'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-teal-500/50'
                          }`}
                        >
                          Distal
                        </button>
                      </>
                    );
                  })()}
                </div>

                {/* Lingual / Palatino */}
                {(() => {
                  const activeFaces = selectedToothData?.conditions.flatMap(c => c.faces || []) || [];
                  const isLActive = activeFaces.includes('lingual');
                  return (
                    <button
                      type="button"
                      onClick={() => toggleFaceOnCondition(selectedTooth, 'lingual')}
                      className={`w-32 py-1.5 px-2 rounded-lg text-xs font-bold transition-all border ${
                        isLActive
                          ? 'bg-teal-500 text-white border-teal-400 shadow-xs font-black'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-teal-500/50'
                      }`}
                    >
                      Lingual (L)
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* Condiciones Registradas y Tratamientos */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400">Patologías en pieza #{selectedTooth}:</span>
              {(selectedToothData?.conditions || []).length === 0 ? (
                <p className="text-xs text-slate-500 italic">Pieza sana (sin lesiones registradas).</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedToothData?.conditions.map((cond, idx) => {
                    const def = CONDITIONS[cond.code];
                    const facesText = (cond.faces && cond.faces.length > 0)
                      ? ` (${cond.faces.map(f => f.slice(0, 1).toUpperCase()).join(',')})`
                      : '';
                    const statusText = cond.status === 'existente' ? '⚪ Previo' : cond.status === 'realizado' ? '🟢 Hecho' : '🔴 Plan';
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border"
                        style={{
                          backgroundColor: (cond.color || def?.color || '#3b82f6') + '22',
                          borderColor: cond.color || def?.color || '#3b82f6',
                          color: cond.color || def?.color || '#38bdf8',
                        }}
                      >
                        <span>{statusText}</span>
                        <span>{(cond.label || def?.label || cond.code) + facesText}</span>
                        <button
                          type="button"
                          onClick={() => toggleConditionOnTooth(selectedTooth, cond.code)}
                          className="hover:scale-125 transition-transform ml-1 text-slate-400 hover:text-red-400"
                          title="Remover patología"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Botón rápido para agregar procedimiento sugerido al plan */}
              <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const match = catalog.find(p => p.conditionCode === activeCondition);
                    if (match) {
                      handleAddProcedureFromCatalog(match, selectedTooth);
                    }
                  }}
                  className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Plus size={14} /> + Agregar {CONDITIONS[activeCondition]?.label} al Plan
                </button>
              </div>

              {/* Observación de la Pieza */}
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
                placeholder={`Notas clínicas sobre pieza #${selectedTooth}...`}
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 mt-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal / Selector para Añadir Diente Supernumerario con Posición */}
      {showSupernumeraryModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <span>🦷 Insertar Diente Extra / Supernumerario</span>
            </h3>
            <p className="text-xs text-slate-500">
              Selecciona el espacio interdental o cuadrante donde se ubica la pieza adicional:
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {SUPERNUMERARY_SPACES.map(space => (
                <label
                  key={space.id}
                  className={`flex items-start justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                    selectedSuperSpace === space.id
                      ? 'border-primary bg-primary/5 text-primary shadow-xs'
                      : 'border-border text-foreground hover:border-primary/40 bg-background'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="superSpace"
                      value={space.id}
                      checked={selectedSuperSpace === space.id}
                      onChange={() => setSelectedSuperSpace(space.id)}
                      className="accent-primary mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-bold block">{space.label}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{space.desc}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md shrink-0">
                    {space.number}
                  </span>
                </label>
              ))}
            </div>

            {selectedSuperSpace === 'custom_pos' && (
              <div className="pt-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Identificador de la Pieza Extra:
                </label>
                <input
                  type="text"
                  value={customToothCode}
                  onChange={e => setCustomToothCode(e.target.value)}
                  placeholder="Ej: SN1, 19, SUP-1..."
                  className="w-full text-xs bg-background border border-input rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
              </div>
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

      {/* Modal / Selector para Tratamientos Generales (Boca Completa / Arcada) */}
      {showGeneralProcModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles size={18} className="text-teal-500" />
                <span>Agregar Tratamiento General</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowGeneralProcModal(false)}
                className="p-1.5 text-slate-400 hover:text-foreground rounded-lg"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Selecciona un procedimiento aplicable a toda la boca, arcada o sesión clínica con su precio oficial:
            </p>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1 max-h-72">
              {catalog.map(proc => (
                <button
                  key={proc.id}
                  type="button"
                  onClick={() => {
                    handleAddProcedureFromCatalog(proc, proc.applicableTo === 'mouth' ? 'Boca Completa' : 'Arcada General');
                    setShowGeneralProcModal(false);
                  }}
                  className="w-full p-3 rounded-2xl border border-border bg-background hover:border-teal-500/50 hover:bg-teal-50/40 dark:hover:bg-teal-950/20 text-left transition-all flex items-center justify-between group shadow-2xs btn-haptic"
                >
                  <div className="pr-2">
                    <p className="text-xs font-bold text-foreground group-hover:text-teal-600 transition-colors">
                      {proc.name}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {proc.categoryLabel} · {proc.sessionsRequired > 1 ? `${proc.sessionsRequired} sesiones` : '1 sesión'} ({proc.estimatedDurationMin} min)
                    </span>
                  </div>
                  <span className="text-xs font-mono font-black text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-xl shrink-0">
                    ${proc.defaultPriceUSD.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowGeneralProcModal(false)}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
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
