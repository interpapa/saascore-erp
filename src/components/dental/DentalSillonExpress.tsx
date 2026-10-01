'use client';

import React, { useState, useMemo } from 'react';
import { 
  Stethoscope, 
  Send, 
  Plus, 
  Check, 
  Trash2, 
  Sparkles, 
  FileText, 
  AlertTriangle, 
  ChevronRight, 
  DollarSign,
  Info,
  Layers,
  Smile,
  ShieldCheck
} from 'lucide-react';
import { Entity } from '@/lib/api/entities';
import { DentalChart, ToothCondition, ToothData } from '@/app/actions/dental';
import { DentalProcedureDefinition, DENTAL_PROCEDURES_MASTER } from '@/lib/dental/proceduresCatalog';
import { MobileBottomSheet } from '@/components/ui/mobile/MobileBottomSheet';
import { QuickActionChip } from '@/components/ui/mobile/QuickActionChip';

interface DentalSillonExpressProps {
  patient: Entity;
  chart?: DentalChart;
  onSaveChart: (chart: DentalChart) => Promise<void>;
  dentalCatalog?: DentalProcedureDefinition[];
  onSendToCashier: (
    items: Array<{ toothNum: string; procedureName: string; cost: number; category?: string; notes?: string }>,
    notes?: string
  ) => Promise<void>;
  onOpenCheckout?: () => void;
  isSaving?: boolean;
}

// Mapeo anatómico de cuadrantes FDI adultos
const QUADRANTS = [
  { id: 'Q1', label: 'Q1 Sup. Der', range: ['18', '17', '16', '15', '14', '13', '12', '11'] },
  { id: 'Q2', label: 'Q2 Sup. Izq', range: ['21', '22', '23', '24', '25', '26', '27', '28'] },
  { id: 'Q4', label: 'Q4 Inf. Der', range: ['48', '47', '46', '45', '44', '43', '42', '41'] },
  { id: 'Q3', label: 'Q3 Inf. Izq', range: ['31', '32', '33', '34', '35', '36', '37', '38'] },
];

const TOOTH_SHORT_NAMES: Record<string, string> = {
  '18': '3er Molar', '17': '2do Molar', '16': '1er Molar', '15': '2do Pre', '14': '1er Pre', '13': 'Canino', '12': 'Inc. Lat', '11': 'Inc. Cent',
  '21': 'Inc. Cent', '22': 'Inc. Lat', '23': 'Canino', '24': '1er Pre', '25': '2do Pre', '26': '1er Molar', '27': '2do Molar', '28': '3er Molar',
  '48': '3er Molar', '47': '2do Molar', '46': '1er Molar', '45': '2do Pre', '44': '1er Pre', '43': 'Canino', '42': 'Inc. Lat', '41': 'Inc. Cent',
  '31': 'Inc. Cent', '32': 'Inc. Lat', '33': 'Canino', '34': '1er Pre', '35': '2do Pre', '36': '1er Molar', '37': '2do Molar', '38': '3er Molar',
};

const FAST_PROCEDURES = [
  { name: 'Limpieza con Ultrasonido', cost: 30, category: 'Prevención' },
  { name: 'Resina Nanohíbrida 1 Cara', cost: 45, category: 'Operatoria' },
  { name: 'Resina Nanohíbrida 2+ Caras', cost: 60, category: 'Operatoria' },
  { name: 'Exodoncia Simple', cost: 50, category: 'Cirugía' },
  { name: 'Consulta & Diagnóstico', cost: 20, category: 'Diagnóstico' },
  { name: 'Tratamiento de Conducto (Endo)', cost: 90, category: 'Endodoncia' },
  { name: 'Blanqueamiento Dental', cost: 120, category: 'Estética' },
  { name: 'Corona de Porcelana', cost: 160, category: 'Prótesis' },
];

const QUICK_EVOLUTION_CHIPS = [
  'Aislamiento absoluto y restauración con resina fotocurada. Pulido oclusal favorable.',
  'Tartrectomía ultrasónica en ambas arcadas y aplicación de flúor tópico.',
  'Exodoncia simple bajo anestesia local al 2% sin complicaciones. Indicaciones dadas.',
  'Apertura e instrumentación biomecánica rotatoria. Irrigación profusa con NaOCl.',
  'Control post-operatorio: cicatrización normal, asintomático.',
];

export function DentalSillonExpress({
  patient,
  chart,
  onSaveChart,
  dentalCatalog = DENTAL_PROCEDURES_MASTER,
  onSendToCashier,
  onOpenCheckout,
  isSaving = false,
}: DentalSillonExpressProps) {
  // Cuadrante Activo
  const [activeQuadrant, setActiveQuadrant] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q1');
  
  // Diente seleccionado para edición modal
  const [selectedToothNum, setSelectedToothNum] = useState<string | null>(null);

  // Orden de procedimientos a cobrar hoy (Carrito de Sillón)
  const [sessionItems, setSessionItems] = useState<Array<{
    id: string;
    toothNum: string;
    procedureName: string;
    cost: number;
    category?: string;
    notes?: string;
  }>>([]);

  // Nota de evolución clínica rápida
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [isSendingToCashier, setIsSendingToCashier] = useState(false);

  // Obtener condición activa del diente
  const getToothData = (num: string): ToothData | undefined => {
    return chart?.teeth?.[num];
  };

  const getToothPrimaryCondition = (num: string): string => {
    const t = getToothData(num);
    if (!t || !t.conditions || t.conditions.length === 0) return 'sano';
    return t.conditions[0].code;
  };

  // Guardar condición del diente
  const handleSetToothCondition = async (toothNum: string, conditionCode: string) => {
    const updatedTeeth: Record<string, ToothData> = { ...(chart?.teeth || {}) };
    
    if (conditionCode === 'sano') {
      delete updatedTeeth[toothNum];
    } else {
      updatedTeeth[toothNum] = {
        number: toothNum,
        conditions: [
          {
            code: conditionCode,
            status: 'planificado',
            date: new Date().toISOString(),
          },
        ],
      };
    }

    const updatedChart: DentalChart = {
      mode: chart?.mode || 'adult',
      teeth: updatedTeeth,
      supernumeraryTeeth: chart?.supernumeraryTeeth || [],
      treatmentPlan: chart?.treatmentPlan,
      generalNotes: chart?.generalNotes,
      lastUpdated: new Date().toISOString(),
    };

    await onSaveChart(updatedChart);
    setSelectedToothNum(null);
  };

  // Agregar procedimiento rápido a la orden de cobro
  const handleAddProcedure = (proc: { name: string; cost: number; category?: string }, toothNum: string = 'General') => {
    const newItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      toothNum,
      procedureName: proc.name,
      cost: proc.cost,
      category: proc.category,
    };
    setSessionItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setSessionItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Total de la sesión
  const totalSessionUSD = useMemo(() => {
    return sessionItems.reduce((acc, curr) => acc + curr.cost, 0);
  }, [sessionItems]);

  // Despachar a Caja
  const handleConfirmSendToCashier = async () => {
    if (sessionItems.length === 0) return;
    setIsSendingToCashier(true);
    try {
      await onSendToCashier(sessionItems, clinicalNotes);
      setSessionItems([]);
      setClinicalNotes('');
    } finally {
      setIsSendingToCashier(false);
    }
  };

  const currentQuadTeeth = QUADRANTS.find((q) => q.id === activeQuadrant)?.range || [];

  return (
    <div className="space-y-5 pb-24">
      {/* 1. SELECCIÓN DE CUADRANTE TÁCTIL */}
      <div className="bg-card border border-border rounded-2xl p-3 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Layers size={13} className="text-teal-500" />
            Cuadrantes Anatómicos FDI
          </span>
          <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
            Dientes Adultos
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {QUADRANTS.map((quad) => {
            const isActive = activeQuadrant === quad.id;
            return (
              <button
                key={quad.id}
                type="button"
                onClick={() => setActiveQuadrant(quad.id as any)}
                className={`py-3 px-2 rounded-xl text-center border font-bold text-xs transition-all btn-haptic ${
                  isActive
                    ? 'bg-teal-500 text-white border-teal-600 shadow-md scale-[1.02]'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-foreground border-border hover:bg-slate-100'
                }`}
              >
                <div className="text-sm font-black tracking-tight">{quad.id}</div>
                <div className="text-[10px] opacity-85 mt-0.5 truncate">{quad.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. REJILLA TÁCTIL DE DIENTES (4 x 2) */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Piezas del Cuadrante {activeQuadrant} (Toca para diagnosticar)
          </h4>
          <span className="text-[11px] text-slate-400">
            Toque grande apto para guantes
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
          {currentQuadTeeth.map((toothNum) => {
            const condition = getToothPrimaryCondition(toothNum);
            const isSick = condition !== 'sano';

            const conditionBadge = {
              sano: { label: 'Sano', color: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300' },
              caries: { label: 'Caries', color: 'bg-red-500/15 text-red-600 border-red-500/30' },
              obturacion: { label: 'Obturado', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
              endodoncia: { label: 'Endodoncia', color: 'bg-purple-500/15 text-purple-600 border-purple-500/30' },
              corona: { label: 'Corona', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
              ausente: { label: 'Ausente', color: 'bg-slate-400/20 text-slate-400 line-through border-slate-300' },
              implante: { label: 'Implante', color: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30' },
              fractura: { label: 'Fractura', color: 'bg-rose-500/15 text-rose-600 border-rose-500/30' },
            }[condition] || { label: condition, color: 'bg-slate-100 text-slate-600' };

            return (
              <button
                key={toothNum}
                type="button"
                onClick={() => setSelectedToothNum(toothNum)}
                className={`flex flex-col items-center justify-between p-2.5 rounded-2xl border transition-all text-center min-h-[76px] btn-haptic active:scale-95 ${
                  isSick
                    ? 'border-red-500/40 bg-red-500/5 shadow-xs'
                    : 'border-border bg-slate-50/50 dark:bg-slate-900/50 hover:border-teal-500/40 hover:bg-teal-500/5'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-base font-black text-foreground font-mono">
                    {toothNum}
                  </span>
                  {isSick && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                </div>

                <div className="text-[10px] text-slate-400 font-medium truncate w-full">
                  {TOOTH_SHORT_NAMES[toothNum] || 'Diente'}
                </div>

                <div className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border w-full truncate mt-1 ${conditionBadge.color}`}>
                  {conditionBadge.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. PROCEDIMIENTOS RÁPIDOS 1-TOQUE */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-amber-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Agregar Tratamientos a Cobrar Hoy
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">1-Toque para añadir</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FAST_PROCEDURES.map((proc, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAddProcedure(proc)}
              className="flex flex-col justify-between p-2.5 rounded-xl border border-border bg-slate-50/80 dark:bg-slate-800/50 hover:border-teal-500/40 hover:bg-teal-500/10 text-left transition-all btn-haptic"
            >
              <span className="text-xs font-bold text-foreground leading-tight line-clamp-2">
                {proc.name}
              </span>
              <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/40">
                <span className="text-[10px] text-slate-400">{proc.category}</span>
                <span className="text-xs font-black text-teal-600 dark:text-teal-400 font-mono">
                  ${proc.cost}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Lista de Procedimientos en la Orden de Hoy */}
        {sessionItems.length > 0 && (
          <div className="pt-2 border-t border-border space-y-2">
            <span className="text-[11px] font-bold text-slate-500 block">
              Tratamientos seleccionados para esta consulta ({sessionItems.length}):
            </span>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {sessionItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-teal-500/30 text-teal-600">
                      {item.toothNum}
                    </span>
                    <span className="font-bold text-foreground">{item.procedureName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-foreground font-mono">${item.cost}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-slate-400 hover:text-red-500 p-1"
                      title="Quitar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. EVOLUCIÓN CLÍNICA RÁPIDA (CHIPS 1-TOQUE) */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-blue-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Evolución Clínica Rápida
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">Toca un chip para autocompletar</span>
        </div>

        {/* Chips predefinidos */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_EVOLUTION_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setClinicalNotes((prev) => (prev ? `${prev}\n\n${chip}` : chip));
              }}
              className="text-[11px] px-2.5 py-1.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-left transition-all text-slate-600 dark:text-slate-300 font-medium btn-haptic"
            >
              + {chip.slice(0, 48)}...
            </button>
          ))}
        </div>

        {/* Campo de Texto para Ajuste */}
        <textarea
          value={clinicalNotes}
          onChange={(e) => setClinicalNotes(e.target.value)}
          placeholder="Evolución clínica de la consulta de hoy..."
          rows={3}
          className="w-full bg-background border border-input rounded-xl p-3 text-xs text-foreground focus:ring-2 focus:ring-teal-500/30"
        />
      </div>

      {/* 5. MODAL BOTTOM SHEET: DIAGNÓSTICO DEL DIENTE SELECCIONADO */}
      <MobileBottomSheet
        isOpen={!!selectedToothNum}
        onClose={() => setSelectedToothNum(null)}
        title={selectedToothNum ? `Pieza Dental FDI: ${selectedToothNum}` : ''}
        subtitle={selectedToothNum ? `${TOOTH_SHORT_NAMES[selectedToothNum] || 'Diente'} · Cuadrante ${activeQuadrant}` : ''}
      >
        {selectedToothNum && (
          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Seleccionar Estado de la Pieza:
            </div>

            <div className="grid grid-cols-2 gap-2">
              <QuickActionChip
                label="Pieza Sana"
                sublabel="Sin patología"
                variant="emerald"
                size="md"
                selected={getToothPrimaryCondition(selectedToothNum) === 'sano'}
                onClick={() => handleSetToothCondition(selectedToothNum, 'sano')}
              />
              <QuickActionChip
                label="Caries Activa"
                sublabel="Lesión de tejido"
                variant="rose"
                size="md"
                selected={getToothPrimaryCondition(selectedToothNum) === 'caries'}
                onClick={() => handleSetToothCondition(selectedToothNum, 'caries')}
              />
              <QuickActionChip
                label="Obturación"
                sublabel="Resina previa"
                variant="primary"
                size="md"
                selected={getToothPrimaryCondition(selectedToothNum) === 'obturacion'}
                onClick={() => handleSetToothCondition(selectedToothNum, 'obturacion')}
              />
              <QuickActionChip
                label="Endodoncia"
                sublabel="Conducto tratado"
                variant="amber"
                size="md"
                selected={getToothPrimaryCondition(selectedToothNum) === 'endodoncia'}
                onClick={() => handleSetToothCondition(selectedToothNum, 'endodoncia')}
              />
              <QuickActionChip
                label="Corona / Prótesis"
                sublabel="Fija"
                variant="amber"
                size="md"
                selected={getToothPrimaryCondition(selectedToothNum) === 'corona'}
                onClick={() => handleSetToothCondition(selectedToothNum, 'corona')}
              />
              <QuickActionChip
                label="Pieza Ausente"
                sublabel="Extraída / Faltante"
                variant="secondary"
                size="md"
                selected={getToothPrimaryCondition(selectedToothNum) === 'ausente'}
                onClick={() => handleSetToothCondition(selectedToothNum, 'ausente')}
              />
            </div>

            <div className="pt-3 border-t border-border space-y-2">
              <span className="text-xs font-bold text-slate-500 block">
                Tratar directamente esta pieza:
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleAddProcedure({ name: `Resina en Pieza ${selectedToothNum}`, cost: 45, category: 'Operatoria' }, selectedToothNum);
                    setSelectedToothNum(null);
                  }}
                  className="flex-1 py-2.5 px-3 bg-teal-500 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-teal-600 transition-all text-center"
                >
                  + Resina ($45)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleAddProcedure({ name: `Exodoncia Pieza ${selectedToothNum}`, cost: 50, category: 'Cirugía' }, selectedToothNum);
                    setSelectedToothNum(null);
                  }}
                  className="flex-1 py-2.5 px-3 bg-rose-500 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-rose-600 transition-all text-center"
                >
                  + Extracción ($50)
                </button>
              </div>
            </div>
          </div>
        )}
      </MobileBottomSheet>

      {/* 6. BARRA INFERIOR FIJA: ACCIÓN INMEDIATA A CAJA POS */}
      <div className="fixed bottom-16 md:bottom-4 left-0 right-0 z-30 px-4 max-w-lg mx-auto pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/95 dark:bg-black/95 text-white p-3 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-4 duration-200">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {sessionItems.length === 0 ? 'Sin tratamientos hoy' : `${sessionItems.length} tratamiento(s)`}
            </div>
            <div className="text-lg font-black text-teal-400 font-mono">
              ${totalSessionUSD.toFixed(2)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirmSendToCashier}
              disabled={sessionItems.length === 0 || isSendingToCashier}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white text-xs font-black transition-all shadow-md btn-haptic"
            >
              {isSendingToCashier ? (
                <span>Enviando...</span>
              ) : (
                <>
                  <Send size={14} />
                  <span>ENVIAR A CAJA ➔</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
