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
  ShieldCheck,
  Search,
  Tag,
  X
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

  // Filtros dinámicos de catálogo
  const [procSearch, setProcSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal para agregar procedimiento libre/personalizado
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customProcName, setCustomProcName] = useState('');
  const [customProcPrice, setCustomProcPrice] = useState('');
  const [customProcTooth, setCustomProcTooth] = useState('General');

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

  // PROCEDIMIENTOS 100% DINÁMICOS BASADOS EN EL CATÁLOGO DE LA EMPRESA (0 Hardcoding)
  const dynamicProcedures = useMemo(() => {
    const sourceList = (dentalCatalog && dentalCatalog.length > 0)
      ? dentalCatalog
      : DENTAL_PROCEDURES_MASTER;

    return sourceList.map((p) => ({
      id: p.id,
      name: p.name,
      cost: Number(p.defaultPriceUSD || (p as any).base_price || 0),
      category: p.categoryLabel || p.category || 'General',
    }));
  }, [dentalCatalog]);

  // Categorías presentes en los procedimientos configurados
  const categories = useMemo(() => {
    const catSet = new Set<string>();
    dynamicProcedures.forEach((p) => {
      if (p.category) catSet.add(p.category);
    });
    return Array.from(catSet);
  }, [dynamicProcedures]);

  // Procedimientos filtrados en vivo
  const filteredProcedures = useMemo(() => {
    return dynamicProcedures.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (procSearch.trim()) {
        const query = procSearch.toLowerCase();
        return p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query);
      }
      return true;
    });
  }, [dynamicProcedures, selectedCategory, procSearch]);

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

  // Agregar procedimiento a la orden de cobro
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

  const handleAddCustomProcedure = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customProcName.trim();
    const price = parseFloat(customProcPrice);
    if (!name || isNaN(price) || price < 0) return;

    handleAddProcedure(
      { name, cost: price, category: 'Personalizado' },
      customProcTooth.trim() || 'General'
    );
    setCustomProcName('');
    setCustomProcPrice('');
    setCustomProcTooth('General');
    setIsCustomModalOpen(false);
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

  // Búsqueda de precios reales de la empresa para tratamientos de acción rápida por diente
  const resinaMatch = dynamicProcedures.find(p => p.name.toLowerCase().includes('resina')) || { name: 'Resina', cost: 40 };
  const exodonciaMatch = dynamicProcedures.find(p => p.name.toLowerCase().includes('extrac') || p.name.toLowerCase().includes('exodon')) || { name: 'Extracción Simple', cost: 40 };

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
                className={`py-3 px-3 rounded-xl font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 border btn-haptic ${
                  isActive
                    ? 'bg-teal-500 text-white border-teal-600 shadow-sm scale-102'
                    : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-border hover:bg-slate-200'
                }`}
              >
                <span className="text-sm font-black">{quad.id}</span>
                <span className="text-[10px] opacity-80">{quad.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. MATRIZ DE DIENTES TÁCTILES DEL CUADRANTE SELECCIONADO */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <span>Piezas del Cuadrante {activeQuadrant}</span>
            <span className="text-[10px] font-medium text-slate-400 font-mono">(Toca un diente para registrar)</span>
          </h3>
          <span className="text-xs text-teal-600 font-bold">
            {QUADRANTS.find((q) => q.id === activeQuadrant)?.label}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {currentQuadTeeth.map((toothNum) => {
            const condition = getToothPrimaryCondition(toothNum);
            const isToothTreated = condition !== 'sano';
            const shortName = TOOTH_SHORT_NAMES[toothNum] || '';

            return (
              <button
                key={toothNum}
                type="button"
                onClick={() => setSelectedToothNum(toothNum)}
                className={`p-3.5 rounded-2xl border flex flex-col justify-between text-left transition-all btn-haptic min-h-[92px] ${
                  condition === 'caries'
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300'
                    : condition === 'obturacion'
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300'
                    : condition === 'endodoncia'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300'
                    : condition === 'corona'
                    ? 'bg-purple-500/10 border-purple-500/40 text-purple-700 dark:text-purple-300'
                    : condition === 'ausente'
                    ? 'bg-slate-200/50 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700 text-slate-400 opacity-60'
                    : 'bg-card border-border hover:border-teal-500/50 hover:bg-teal-500/5'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xl font-black font-mono tracking-tight">{toothNum}</span>
                  {isToothTreated ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-current" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-bold block truncate">{shortName}</span>
                  <span className="text-[10px] capitalize opacity-80">
                    {condition === 'sano' ? 'Sano' : condition}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. PROCEDIMIENTOS DINÁMICOS BASADOS EN CATÁLOGO REAL (0 Hardcoding) */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-teal-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Catálogo de Tratamientos
            </h4>
            <span className="text-[10px] font-bold bg-teal-500/10 text-teal-600 px-2 py-0.5 rounded-full">
              Precios Editables de la Empresa
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsCustomModalOpen(true)}
            className="self-start sm:self-auto text-xs font-black text-teal-600 hover:text-teal-700 bg-teal-500/10 hover:bg-teal-500/20 px-2.5 py-1.5 rounded-xl border border-teal-500/20 flex items-center gap-1 transition-colors btn-haptic"
          >
            <Plus size={13} />
            <span>+ Concepto Libre / Precio Editable</span>
          </button>
        </div>

        {/* Buscador & Categorías Dinámicas */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar procedimiento o especialidad..."
              value={procSearch}
              onChange={(e) => setProcSearch(e.target.value)}
              className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-foreground placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/30"
            />
          </div>

          {/* Categorías */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Todos ({dynamicProcedures.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors ${
                    selectedCategory === cat
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grilla de Tratamientos Dinámicos */}
        {filteredProcedures.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-border rounded-xl">
            No se encontraron procedimientos en el catálogo. Usa el botón &quot;+ Concepto Libre&quot; para registrar uno nuevo.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {filteredProcedures.slice(0, 12).map((proc) => (
              <button
                key={proc.id}
                type="button"
                onClick={() => handleAddProcedure(proc)}
                className="flex flex-col justify-between p-2.5 rounded-xl border border-border bg-slate-50/80 dark:bg-slate-800/50 hover:border-teal-500/40 hover:bg-teal-500/10 text-left transition-all btn-haptic"
              >
                <span className="text-xs font-bold text-foreground leading-tight line-clamp-2">
                  {proc.name}
                </span>
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/40">
                  <span className="text-[10px] text-slate-400 truncate max-w-[80px]">{proc.category}</span>
                  <span className="text-xs font-black text-teal-600 dark:text-teal-400 font-mono">
                    ${proc.cost.toFixed(2)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

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
                    <span className="font-black text-foreground font-mono">${item.cost.toFixed(2)}</span>
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

      {/* 4. EVOLUCIÓN CLÍNICA RÁPIDA (CHIPS 1-TOQUE + TEXTO LIBRE) */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-blue-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Evolución Clínica de la Consulta
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
                setClinicalNotes((prev) => (prev ? `${prev} ${chip}` : chip));
              }}
              className="text-[11px] py-1 px-2.5 rounded-lg border border-border bg-slate-100 dark:bg-slate-800 hover:border-blue-500/40 text-slate-700 dark:text-slate-300 font-medium transition-all text-left btn-haptic"
            >
              + {chip.slice(0, 36)}...
            </button>
          ))}
        </div>

        {/* Input de texto libre */}
        <textarea
          value={clinicalNotes}
          onChange={(e) => setClinicalNotes(e.target.value)}
          placeholder="Escribe detalles de la evolución médica, materiales o indicaciones..."
          rows={3}
          className="w-full p-3 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 resize-none"
        />
      </div>

      {/* 5. MODAL DE AJUSTE DENTAL DE 1-TOQUE (BOTTOM SHEET) */}
      <MobileBottomSheet
        isOpen={!!selectedToothNum}
        onClose={() => setSelectedToothNum(null)}
        title={selectedToothNum ? `Pieza Dental FDI #${selectedToothNum} (${TOOTH_SHORT_NAMES[selectedToothNum] || ''})` : ''}
      >
        {selectedToothNum && (
          <div className="space-y-4">
            <span className="text-xs text-slate-400 block">
              Selecciona el estado clínico diagnosticado para esta pieza:
            </span>

            <div className="grid grid-cols-2 gap-2">
              <QuickActionChip
                label="Sano"
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
                Tratar directamente esta pieza (Precios configurados de la clínica):
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleAddProcedure({ name: `${resinaMatch.name} en Pieza ${selectedToothNum}`, cost: resinaMatch.cost, category: 'Operatoria' }, selectedToothNum);
                    setSelectedToothNum(null);
                  }}
                  className="flex-1 py-2.5 px-3 bg-teal-500 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-teal-600 transition-all text-center"
                >
                  + {resinaMatch.name} (${resinaMatch.cost.toFixed(0)})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleAddProcedure({ name: `${exodonciaMatch.name} en Pieza ${selectedToothNum}`, cost: exodonciaMatch.cost, category: 'Cirugía' }, selectedToothNum);
                    setSelectedToothNum(null);
                  }}
                  className="flex-1 py-2.5 px-3 bg-rose-500 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-rose-600 transition-all text-center"
                >
                  + {exodonciaMatch.name} (${exodonciaMatch.cost.toFixed(0)})
                </button>
              </div>
            </div>
          </div>
        )}
      </MobileBottomSheet>

      {/* MODAL PARA AGREGAR TRATAMIENTO CON PRECIO PERSONALIZADO */}
      <MobileBottomSheet
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        title="Agregar Tratamiento con Precio Personalizado"
      >
        <form onSubmit={handleAddCustomProcedure} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
              Nombre del Tratamiento o Procedimiento
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Retenedor Nocturno, Blanqueamiento Especial, Injerto Óseo..."
              value={customProcName}
              onChange={(e) => setCustomProcName(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-teal-500/20"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Precio Sugerido ($ USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={customProcPrice}
                onChange={(e) => setCustomProcPrice(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border bg-background text-xs font-black font-mono text-foreground focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Pieza Dental (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. 16, 21 o General"
                value={customProcTooth}
                onChange={(e) => setCustomProcTooth(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCustomModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-slate-600 dark:text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-md btn-haptic"
            >
              + Agregar a la Orden
            </button>
          </div>
        </form>
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
