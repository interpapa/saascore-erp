'use client';

import React, { useState } from 'react';
import { ToothData, ToothCondition } from '@/app/actions/dental';
import { CONDITIONS } from './Odontogram';
import { Sparkles, Layers, ArrowUpCircle, Plus, Eye, Check, X, ShieldAlert } from 'lucide-react';

export interface DentalArchProps {
  teeth: Record<string, ToothData>;
  selectedTooth: string | null;
  onSelectTooth: (toothNum: string) => void;
  mode: 'adult' | 'child' | 'mixed';
  onExfoliateAndErupt?: (childNum: string, adultNum: string) => void;
  onToggleFace?: (toothNum: string, face: string) => void;
  activeCondition?: string;
  supernumeraryTeeth?: ToothData[];
}

// Relación anatómica de sustitución de dientes de leche por permanentes
export const CHILD_TO_ADULT_MAP: Record<string, string> = {
  '55': '15', '54': '14', '53': '13', '52': '12', '51': '11',
  '61': '21', '62': '22', '63': '23', '64': '24', '65': '25',
  '85': '45', '84': '44', '83': '43', '82': '42', '81': '41',
  '71': '31', '72': '32', '73': '33', '74': '34', '75': '35',
};

// Nombres anatómicos en español para tooltips y fichas clínicas
export const TOOTH_NAMES: Record<string, string> = {
  // Cuadrante 1 - Adulto Superior Derecho
  '18': 'Tercer Molar (Cordal)', '17': 'Segundo Molar', '16': 'Primer Molar',
  '15': 'Segundo Premolar', '14': 'Primer Premolar', '13': 'Canino',
  '12': 'Incisivo Lateral', '11': 'Incisivo Central',
  // Cuadrante 2 - Adulto Superior Izquierdo
  '21': 'Incisivo Central', '22': 'Incisivo Lateral', '23': 'Canino',
  '24': 'Primer Premolar', '25': 'Segundo Premolar', '26': 'Primer Molar',
  '27': 'Segundo Molar', '28': 'Tercer Molar (Cordal)',
  // Cuadrante 3 - Adulto Inferior Izquierdo
  '31': 'Incisivo Central', '32': 'Incisivo Lateral', '33': 'Canino',
  '34': 'Primer Premolar', '35': 'Segundo Premolar', '36': 'Primer Molar',
  '37': 'Segundo Molar', '38': 'Tercer Molar (Cordal)',
  // Cuadrante 4 - Adulto Inferior Derecho
  '41': 'Incisivo Central', '42': 'Incisivo Lateral', '43': 'Canino',
  '44': 'Primer Premolar', '45': 'Segundo Premolar', '46': 'Primer Molar',
  '47': 'Segundo Molar', '48': 'Tercer Molar (Cordal)',
  // Dientes Temporales (Niño)
  '51': 'Incisivo Central Sup. Der. (Temporal)', '52': 'Incisivo Lat. Sup. Der. (Temporal)', '53': 'Canino Sup. Der. (Temporal)', '54': 'Primer Molar Sup. Der. (Temporal)', '55': 'Segundo Molar Sup. Der. (Temporal)',
  '61': 'Incisivo Central Sup. Izq. (Temporal)', '62': 'Incisivo Lat. Sup. Izq. (Temporal)', '63': 'Canino Sup. Izq. (Temporal)', '64': 'Primer Molar Sup. Izq. (Temporal)', '65': 'Segundo Molar Sup. Izq. (Temporal)',
  '71': 'Incisivo Central Inf. Izq. (Temporal)', '72': 'Incisivo Lat. Inf. Izq. (Temporal)', '73': 'Canino Inf. Izq. (Temporal)', '74': 'Primer Molar Inf. Izq. (Temporal)', '75': 'Segundo Molar Inf. Izq. (Temporal)',
  '81': 'Incisivo Central Inf. Der. (Temporal)', '82': 'Incisivo Lat. Inf. Der. (Temporal)', '83': 'Canino Inf. Der. (Temporal)', '84': 'Primer Molar Inf. Der. (Temporal)', '85': 'Segundo Molar Inf. Der. (Temporal)',
};

export type ToothMorphType = 'molar' | 'premolar' | 'canine' | 'incisor';

export interface ToothDef {
  number: string;
  name: string;
  type: ToothMorphType;
  arch: 'upper' | 'lower';
  quadrant: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  isChild?: boolean;
}

// Catálogo maestro de piezas permanentes FDI (32 dientes)
export const ADULT_TEETH_LIST: ToothDef[] = [
  // Cuadrante 1 (18 al 11)
  { number: '18', name: 'Tercer Molar Sup. Der.', type: 'molar', arch: 'upper', quadrant: 1 },
  { number: '17', name: 'Segundo Molar Sup. Der.', type: 'molar', arch: 'upper', quadrant: 1 },
  { number: '16', name: 'Primer Molar Sup. Der.', type: 'molar', arch: 'upper', quadrant: 1 },
  { number: '15', name: 'Segundo Premolar Sup. Der.', type: 'premolar', arch: 'upper', quadrant: 1 },
  { number: '14', name: 'Primer Premolar Sup. Der.', type: 'premolar', arch: 'upper', quadrant: 1 },
  { number: '13', name: 'Canino Sup. Der.', type: 'canine', arch: 'upper', quadrant: 1 },
  { number: '12', name: 'Incisivo Lateral Sup. Der.', type: 'incisor', arch: 'upper', quadrant: 1 },
  { number: '11', name: 'Incisivo Central Sup. Der.', type: 'incisor', arch: 'upper', quadrant: 1 },
  // Cuadrante 2 (21 al 28)
  { number: '21', name: 'Incisivo Central Sup. Izq.', type: 'incisor', arch: 'upper', quadrant: 2 },
  { number: '22', name: 'Incisivo Lateral Sup. Izq.', type: 'incisor', arch: 'upper', quadrant: 2 },
  { number: '23', name: 'Canino Sup. Izq.', type: 'canine', arch: 'upper', quadrant: 2 },
  { number: '24', name: 'Primer Premolar Sup. Izq.', type: 'premolar', arch: 'upper', quadrant: 2 },
  { number: '25', name: 'Segundo Premolar Sup. Izq.', type: 'premolar', arch: 'upper', quadrant: 2 },
  { number: '26', name: 'Primer Molar Sup. Izq.', type: 'molar', arch: 'upper', quadrant: 2 },
  { number: '27', name: 'Segundo Molar Sup. Izq.', type: 'molar', arch: 'upper', quadrant: 2 },
  { number: '28', name: 'Tercer Molar Sup. Izq.', type: 'molar', arch: 'upper', quadrant: 2 },

  // Cuadrante 4 (48 al 41)
  { number: '48', name: 'Tercer Molar Inf. Der.', type: 'molar', arch: 'lower', quadrant: 4 },
  { number: '47', name: 'Segundo Molar Inf. Der.', type: 'molar', arch: 'lower', quadrant: 4 },
  { number: '46', name: 'Primer Molar Inf. Der.', type: 'molar', arch: 'lower', quadrant: 4 },
  { number: '45', name: 'Segundo Premolar Inf. Der.', type: 'premolar', arch: 'lower', quadrant: 4 },
  { number: '44', name: 'Primer Premolar Inf. Der.', type: 'premolar', arch: 'lower', quadrant: 4 },
  { number: '43', name: 'Canino Inf. Der.', type: 'canine', arch: 'lower', quadrant: 4 },
  { number: '42', name: 'Incisivo Lateral Inf. Der.', type: 'incisor', arch: 'lower', quadrant: 4 },
  { number: '41', name: 'Incisivo Central Inf. Der.', type: 'incisor', arch: 'lower', quadrant: 4 },
  // Cuadrante 3 (31 al 38)
  { number: '31', name: 'Incisivo Central Inf. Izq.', type: 'incisor', arch: 'lower', quadrant: 3 },
  { number: '32', name: 'Incisivo Lateral Inf. Izq.', type: 'incisor', arch: 'lower', quadrant: 3 },
  { number: '33', name: 'Canino Inf. Izq.', type: 'canine', arch: 'lower', quadrant: 3 },
  { number: '34', name: 'Primer Premolar Inf. Izq.', type: 'premolar', arch: 'lower', quadrant: 3 },
  { number: '35', name: 'Segundo Premolar Inf. Izq.', type: 'premolar', arch: 'lower', quadrant: 3 },
  { number: '36', name: 'Primer Molar Inf. Izq.', type: 'molar', arch: 'lower', quadrant: 3 },
  { number: '37', name: 'Segundo Molar Inf. Izq.', type: 'molar', arch: 'lower', quadrant: 3 },
  { number: '38', name: 'Tercer Molar Inf. Izq.', type: 'molar', arch: 'lower', quadrant: 3 },
];

// Catálogo maestro de piezas infantiles temporales (20 dientes)
export const CHILD_TEETH_LIST: ToothDef[] = [
  // Cuadrante 5 (55 al 51)
  { number: '55', name: 'Segundo Molar Sup. Der. (Temp)', type: 'molar', arch: 'upper', quadrant: 5, isChild: true },
  { number: '54', name: 'Primer Molar Sup. Der. (Temp)', type: 'molar', arch: 'upper', quadrant: 5, isChild: true },
  { number: '53', name: 'Canino Sup. Der. (Temp)', type: 'canine', arch: 'upper', quadrant: 5, isChild: true },
  { number: '52', name: 'Incisivo Lat. Sup. Der. (Temp)', type: 'incisor', arch: 'upper', quadrant: 5, isChild: true },
  { number: '51', name: 'Incisivo Central Sup. Der. (Temp)', type: 'incisor', arch: 'upper', quadrant: 5, isChild: true },
  // Cuadrante 6 (61 al 65)
  { number: '61', name: 'Incisivo Central Sup. Izq. (Temp)', type: 'incisor', arch: 'upper', quadrant: 6, isChild: true },
  { number: '62', name: 'Incisivo Lat. Sup. Izq. (Temp)', type: 'incisor', arch: 'upper', quadrant: 6, isChild: true },
  { number: '63', name: 'Canino Sup. Izq. (Temp)', type: 'canine', arch: 'upper', quadrant: 6, isChild: true },
  { number: '64', name: 'Primer Molar Sup. Izq. (Temp)', type: 'molar', arch: 'upper', quadrant: 6, isChild: true },
  { number: '65', name: 'Segundo Molar Sup. Izq. (Temp)', type: 'molar', arch: 'upper', quadrant: 6, isChild: true },

  // Cuadrante 8 (85 al 81)
  { number: '85', name: 'Segundo Molar Inf. Der. (Temp)', type: 'molar', arch: 'lower', quadrant: 8, isChild: true },
  { number: '84', name: 'Primer Molar Inf. Der. (Temp)', type: 'molar', arch: 'lower', quadrant: 8, isChild: true },
  { number: '83', name: 'Canino Inf. Der. (Temp)', type: 'canine', arch: 'lower', quadrant: 8, isChild: true },
  { number: '82', name: 'Incisivo Lat. Inf. Der. (Temp)', type: 'incisor', arch: 'lower', quadrant: 8, isChild: true },
  { number: '81', name: 'Incisivo Central Inf. Der. (Temp)', type: 'incisor', arch: 'lower', quadrant: 8, isChild: true },
  // Cuadrante 7 (71 al 75)
  { number: '71', name: 'Incisivo Central Inf. Izq. (Temp)', type: 'incisor', arch: 'lower', quadrant: 7, isChild: true },
  { number: '72', name: 'Incisivo Lat. Inf. Izq. (Temp)', type: 'incisor', arch: 'lower', quadrant: 7, isChild: true },
  { number: '73', name: 'Canino Inf. Izq. (Temp)', type: 'canine', arch: 'lower', quadrant: 7, isChild: true },
  { number: '74', name: 'Primer Molar Inf. Izq. (Temp)', type: 'molar', arch: 'lower', quadrant: 7, isChild: true },
  { number: '75', name: 'Segundo Molar Inf. Izq. (Temp)', type: 'molar', arch: 'lower', quadrant: 7, isChild: true },
];

/**
 * COMPONENTE ANATÓMICO INDIVIDUAL DE DIENTE CLÍNICO (MOTOR 5 CARAS)
 * Cada cara es un polígono interactivo directo (Vestibular, Lingual, Oclusal, Mesial, Distal).
 * El odontólogo hace clic DIRECTO sobre la cara deseada y se marca de inmediato.
 */
function ClinicalToothWidget({
  tooth,
  data,
  isSelected,
  activeCondition,
  onSelectTooth,
  onToggleFace,
  onErupt,
  mode,
}: {
  tooth: ToothDef;
  data?: ToothData;
  isSelected: boolean;
  activeCondition?: string;
  onSelectTooth: (num: string) => void;
  onToggleFace?: (num: string, face: string) => void;
  onErupt?: () => void;
  mode: 'adult' | 'child' | 'mixed';
}) {
  const conditions = data?.conditions || [];
  const isAbsent = conditions.some(c => c.code === 'ausente');
  const isCrown = conditions.some(c => c.code === 'corona');
  const isImplant = conditions.some(c => c.code === 'implante');
  const isEndo = conditions.some(c => c.code === 'endodoncia');

  // Mapear caras afectadas y colores
  const faceColors: Record<string, string> = {};
  conditions.forEach(cond => {
    const def = CONDITIONS[cond.code];
    const color = cond.color || def?.color || '#ef4444';
    (cond.faces || []).forEach(f => {
      faceColors[f] = color;
    });
  });

  // Determinación de orientación anatómica Mesial / Distal según cuadrante:
  // Línea media está entre 11-21 y 41-31. Mesial siempre apunta hacia la línea media.
  const isRightSide = [1, 4, 5, 8].includes(tooth.quadrant);
  const leftFace = isRightSide ? 'distal' : 'mesial';
  const rightFace = isRightSide ? 'mesial' : 'distal';
  const topFace = tooth.arch === 'upper' ? 'vestibular' : 'lingual';
  const bottomFace = tooth.arch === 'upper' ? 'lingual' : 'vestibular';

  const handleFaceClick = (face: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFace) {
      onToggleFace(tooth.number, face);
    } else {
      onSelectTooth(tooth.number);
    }
  };

  // Color de fondo por cara si está marcada
  const getFaceFill = (face: string) => {
    if (faceColors[face]) return faceColors[face];
    return 'url(#tooth-enamel-grad)';
  };

  return (
    <div
      onClick={() => onSelectTooth(tooth.number)}
      className={`relative flex flex-col items-center p-1 rounded-2xl transition-all select-none cursor-pointer group ${
        isSelected
          ? 'bg-teal-500/15 ring-2 ring-teal-400 ring-offset-2 ring-offset-slate-950 scale-105 z-20 shadow-xl'
          : 'hover:bg-slate-900/80 hover:scale-102 z-10'
      } ${isAbsent ? 'opacity-40' : ''}`}
      style={{ minWidth: tooth.type === 'molar' ? '46px' : tooth.type === 'premolar' ? '42px' : '38px' }}
    >
      {/* Botón rápido de mudar diente de leche en modo mixto */}
      {mode === 'mixed' && tooth.isChild && onErupt && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onErupt(); }}
          className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 hover:bg-amber-400 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black shadow-md z-30 animate-bounce"
          title={`Erupcionar a pieza definitiva (${CHILD_TO_ADULT_MAP[tooth.number]})`}
        >
          ⬆
        </button>
      )}

      {/* Pill Número FDI superior (para dientes superiores) */}
      {tooth.arch === 'upper' && (
        <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md mb-1 transition-colors ${
          isSelected
            ? 'bg-teal-500 text-white font-black shadow-xs'
            : tooth.isChild
            ? 'text-amber-400 bg-amber-500/10'
            : 'text-slate-400 group-hover:text-white'
        }`}>
          {tooth.number}
        </span>
      )}

      {/* RAÍZ ANATÓMICA SVG (SUPERIOR) */}
      {tooth.arch === 'upper' && (
        <svg viewBox="0 0 60 30" className="w-10 h-5 mb-0.5 overflow-visible">
          {isImplant ? (
            /* Implante de titanio */
            <g>
              <rect x="24" y="2" width="12" height="26" rx="2" fill="url(#titanium-screw-grad)" stroke="#0284c7" strokeWidth="1" />
              <line x1="24" y1="8" x2="36" y2="8" stroke="#38bdf8" strokeWidth="1.2" />
              <line x1="24" y1="14" x2="36" y2="14" stroke="#38bdf8" strokeWidth="1.2" />
              <line x1="24" y1="20" x2="36" y2="20" stroke="#38bdf8" strokeWidth="1.2" />
            </g>
          ) : tooth.type === 'molar' ? (
            /* 3 Raíces de Molar Superior */
            <g>
              <path d="M 12 30 C 12 15, 16 4, 20 4 C 23 4, 24 15, 24 30 Z" fill="url(#root-grad)" stroke="#64748b" strokeWidth="0.8" />
              <path d="M 36 30 C 36 15, 37 4, 40 4 C 44 4, 48 15, 48 30 Z" fill="url(#root-grad)" stroke="#64748b" strokeWidth="0.8" />
              <path d="M 26 30 C 26 12, 28 2, 30 2 C 32 2, 34 12, 34 30 Z" fill="url(#root-grad)" stroke="#64748b" strokeWidth="0.8" />
              {isEndo && <path d="M 30 2 L 30 30" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />}
            </g>
          ) : (
            /* Raíz única cónica de Incisivo / Canino / Premolar */
            <g>
              <path d="M 22 30 C 22 12, 27 2, 30 2 C 33 2, 38 12, 38 30 Z" fill="url(#root-grad)" stroke="#64748b" strokeWidth="0.8" />
              {isEndo && <line x1="30" y1="3" x2="30" y2="30" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />}
            </g>
          )}
        </svg>
      )}

      {/* CORONA PENTASECTORIAL (5 CARAS CLÍNICAS INTERACTIVAS) */}
      <div className="relative w-10 h-10 sm:w-11 sm:h-11">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
          {/* Cara Superior (Vestibular en superior / Lingual en inferior) */}
          <polygon
            points="10,10 90,10 70,30 30,30"
            fill={getFaceFill(topFace)}
            stroke="#475569"
            strokeWidth="1.5"
            onClick={(e) => handleFaceClick(topFace, e)}
            className="hover:opacity-80 transition-opacity cursor-pointer"
          >
            <title>{`${tooth.number} — Cara ${topFace}`}</title>
          </polygon>

          {/* Cara Izquierda (Mesial o Distal según cuadrante) */}
          <polygon
            points="10,10 30,30 30,70 10,90"
            fill={getFaceFill(leftFace)}
            stroke="#475569"
            strokeWidth="1.5"
            onClick={(e) => handleFaceClick(leftFace, e)}
            className="hover:opacity-80 transition-opacity cursor-pointer"
          >
            <title>{`${tooth.number} — Cara ${leftFace}`}</title>
          </polygon>

          {/* Cara Central (Oclusal en molares / Incisal en anteriores) */}
          <polygon
            points="30,30 70,30 70,70 30,70"
            fill={getFaceFill('oclusal')}
            stroke="#475569"
            strokeWidth="1.5"
            onClick={(e) => handleFaceClick('oclusal', e)}
            className="hover:opacity-80 transition-opacity cursor-pointer"
          >
            <title>{`${tooth.number} — Cara Oclusal/Incisal`}</title>
          </polygon>

          {/* Cara Derecha (Distal o Mesial según cuadrante) */}
          <polygon
            points="70,30 90,10 90,90 70,70"
            fill={getFaceFill(rightFace)}
            stroke="#475569"
            strokeWidth="1.5"
            onClick={(e) => handleFaceClick(rightFace, e)}
            className="hover:opacity-80 transition-opacity cursor-pointer"
          >
            <title>{`${tooth.number} — Cara ${rightFace}`}</title>
          </polygon>

          {/* Cara Inferior (Lingual en superior / Vestibular en inferior) */}
          <polygon
            points="30,70 70,70 90,90 10,90"
            fill={getFaceFill(bottomFace)}
            stroke="#475569"
            strokeWidth="1.5"
            onClick={(e) => handleFaceClick(bottomFace, e)}
            className="hover:opacity-80 transition-opacity cursor-pointer"
          >
            <title>{`${tooth.number} — Cara ${bottomFace}`}</title>
          </polygon>

          {/* Corona Protésica de Oro / Zirconia si aplica */}
          {isCrown && (
            <rect
              x="8"
              y="8"
              width="84"
              height="84"
              rx="12"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="4"
              strokeDasharray="4 2"
              className="animate-pulse"
            />
          )}

          {/* Símbolo de Diente Ausente (Extracción) */}
          {isAbsent && (
            <g>
              <line x1="12" y1="12" x2="88" y2="88" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />
              <line x1="88" y1="12" x2="12" y2="88" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />
            </g>
          )}
        </svg>

        {/* Badge de Implante Biomecánico */}
        {isImplant && (
          <span className="absolute -top-1 -right-1 bg-cyan-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] shadow-sm">
            🔩
          </span>
        )}
      </div>

      {/* RAÍZ ANATÓMICA SVG (INFERIOR) */}
      {tooth.arch === 'lower' && (
        <svg viewBox="0 0 60 30" className="w-10 h-5 mt-0.5 overflow-visible">
          {isImplant ? (
            <g>
              <rect x="24" y="2" width="12" height="26" rx="2" fill="url(#titanium-screw-grad)" stroke="#0284c7" strokeWidth="1" />
              <line x1="24" y1="8" x2="36" y2="8" stroke="#38bdf8" strokeWidth="1.2" />
              <line x1="24" y1="14" x2="36" y2="14" stroke="#38bdf8" strokeWidth="1.2" />
              <line x1="24" y1="20" x2="36" y2="20" stroke="#38bdf8" strokeWidth="1.2" />
            </g>
          ) : tooth.type === 'molar' ? (
            /* 2 Raíces de Molar Inferior */
            <g>
              <path d="M 16 0 C 16 15, 20 28, 24 28 C 28 28, 28 15, 28 0 Z" fill="url(#root-grad)" stroke="#64748b" strokeWidth="0.8" />
              <path d="M 32 0 C 32 15, 32 28, 36 28 C 40 28, 44 15, 44 0 Z" fill="url(#root-grad)" stroke="#64748b" strokeWidth="0.8" />
              {isEndo && <line x1="24" y1="2" x2="24" y2="28" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />}
            </g>
          ) : (
            /* Raíz única de premolar / canino / incisivo inferior */
            <g>
              <path d="M 22 0 C 22 18, 27 28, 30 28 C 33 28, 38 18, 38 0 Z" fill="url(#root-grad)" stroke="#64748b" strokeWidth="0.8" />
              {isEndo && <line x1="30" y1="0" x2="30" y2="28" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />}
            </g>
          )}
        </svg>
      )}

      {/* Pill Número FDI inferior (para dientes inferiores) */}
      {tooth.arch === 'lower' && (
        <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-1 transition-colors ${
          isSelected
            ? 'bg-teal-500 text-white font-black shadow-xs'
            : tooth.isChild
            ? 'text-amber-400 bg-amber-500/10'
            : 'text-slate-400 group-hover:text-white'
        }`}>
          {tooth.number}
        </span>
      )}
    </div>
  );
}

/**
 * MOTOR DE ODONTOGRAMA CLÍNICO Y PARAMÉTRICO
 * Maneja dentición adulta (32), infantil (20), mixta, piezas supernumerarias dinámicas
 * y marcado directo cara por cara.
 */
export function DentalArch({
  teeth,
  selectedTooth,
  onSelectTooth,
  mode,
  onExfoliateAndErupt,
  onToggleFace,
  activeCondition,
  supernumeraryTeeth = [],
}: DentalArchProps) {
  const [archFilter, setArchFilter] = useState<'both' | 'upper' | 'lower'>('both');

  // Selección de lista de dientes según la etapa clínica
  const baseList = mode === 'child' ? CHILD_TEETH_LIST : ADULT_TEETH_LIST;

  // Dientes superiores e inferiores
  const upperTeeth = baseList.filter(t => t.arch === 'upper');
  const lowerTeeth = baseList.filter(t => t.arch === 'lower');

  // Separación por cuadrantes para el odontograma clínico universal
  const q1 = upperTeeth.filter(t => [1, 5].includes(t.quadrant));
  const q2 = upperTeeth.filter(t => [2, 6].includes(t.quadrant));
  const q4 = lowerTeeth.filter(t => [4, 8].includes(t.quadrant));
  const q3 = lowerTeeth.filter(t => [3, 7].includes(t.quadrant));

  // Separar supernumerarios por maxilar y mandíbula
  const upperSuper = supernumeraryTeeth.filter(t => t.number.startsWith('1') || t.number.startsWith('2') || t.number.includes('+'));
  const lowerSuper = supernumeraryTeeth.filter(t => t.number.startsWith('3') || t.number.startsWith('4') || t.number.includes('-'));

  return (
    <div className="w-full bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-2xl space-y-4">
      {/* DEFS GLOBALES SVG PARA ESMALTE Y MATERIALES */}
      <svg className="w-0 h-0 absolute">
        <defs>
          {/* Esmalte cerámico pulido con brillo nacarado */}
          <radialGradient id="tooth-enamel-grad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#f8fafc" />
            <stop offset="85%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </radialGradient>

          {/* Gradiente natural para raíz dental */}
          <linearGradient id="root-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="60%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          {/* Rosca de titanio de implante biomecánico */}
          <linearGradient id="titanium-screw-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0c4a6e" />
            <stop offset="35%" stopColor="#0284c7" />
            <stop offset="70%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#075985" />
          </linearGradient>
        </defs>
      </svg>

      {/* Cabecera del Motor Clínico */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <span>Odontograma Anatómico Clínico</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                mode === 'child' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
              }`}>
                {mode === 'child' ? '🍼 Dentición Temporal (20)' : mode === 'mixed' ? '🔀 Dentición Mixta' : '🦷 Permanente FDI (32)'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Toca directamente cualquier cara (V, O, L, M, D) de un diente para registrar patologías
            </p>
          </div>
        </div>

        {/* Selector de Arco / Zoom para Móvil */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto justify-center">
          <button
            type="button"
            onClick={() => setArchFilter('upper')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              archFilter === 'upper'
                ? 'bg-linear-to-r from-teal-500 to-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🦷 Superior
          </button>
          <button
            type="button"
            onClick={() => setArchFilter('lower')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              archFilter === 'lower'
                ? 'bg-linear-to-r from-teal-500 to-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🦷 Inferior
          </button>
          <button
            type="button"
            onClick={() => setArchFilter('both')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              archFilter === 'both'
                ? 'bg-linear-to-r from-teal-500 to-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            👄 Ambas
          </button>
        </div>
      </div>

      {/* LIENZO CLÍNICO DEL MOTOR: CUADRANTES FDI CON CARAS ACTIVAS */}
      <div className="space-y-6 overflow-x-auto py-2">
        {/* ============================================================== */}
        {/* MAXILAR SUPERIOR (CUADRANTES 1 Y 2 / 5 Y 6) */}
        {/* ============================================================== */}
        {(archFilter === 'both' || archFilter === 'upper') && (
          <div className="space-y-2 bg-slate-900/40 p-3 sm:p-4 rounded-2xl border border-slate-800/80">
            {/* Etiquetas de Cuadrante Superior */}
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
              <span>◀ Cuadrante {mode === 'child' ? '5' : '1'} (Sup. Der.)</span>
              <span className="text-teal-400 font-black flex items-center gap-1 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
                🦷 Maxilar Superior
              </span>
              <span>Cuadrante {mode === 'child' ? '6' : '2'} (Sup. Izq.) ▶</span>
            </div>

            {/* Fila de Dientes Superiores (Centrada con Línea Media) */}
            <div className="flex items-center justify-center gap-1 sm:gap-2 flex-nowrap min-w-max px-2">
              {/* Cuadrante 1 / 5 (Derecha del paciente) */}
              <div className="flex items-center gap-1">
                {q1.map(tooth => (
                  <ClinicalToothWidget
                    key={tooth.number}
                    tooth={tooth}
                    data={teeth[tooth.number]}
                    isSelected={selectedTooth === tooth.number}
                    activeCondition={activeCondition}
                    onSelectTooth={onSelectTooth}
                    onToggleFace={onToggleFace}
                    onErupt={onExfoliateAndErupt && CHILD_TO_ADULT_MAP[tooth.number] ? () => onExfoliateAndErupt(tooth.number, CHILD_TO_ADULT_MAP[tooth.number]) : undefined}
                    mode={mode}
                  />
                ))}
              </div>

              {/* LÍNEA MEDIA FACIAL DIVISORIA */}
              <div className="h-20 w-0.5 bg-teal-500/40 mx-1 relative flex items-center justify-center">
                <span className="absolute -top-3 text-[8px] font-black text-teal-400 uppercase tracking-tighter whitespace-nowrap bg-slate-900 px-1 rounded">
                  Línea Media
                </span>
              </div>

              {/* Cuadrante 2 / 6 (Izquierda del paciente) */}
              <div className="flex items-center gap-1">
                {q2.map(tooth => (
                  <ClinicalToothWidget
                    key={tooth.number}
                    tooth={tooth}
                    data={teeth[tooth.number]}
                    isSelected={selectedTooth === tooth.number}
                    activeCondition={activeCondition}
                    onSelectTooth={onSelectTooth}
                    onToggleFace={onToggleFace}
                    onErupt={onExfoliateAndErupt && CHILD_TO_ADULT_MAP[tooth.number] ? () => onExfoliateAndErupt(tooth.number, CHILD_TO_ADULT_MAP[tooth.number]) : undefined}
                    mode={mode}
                  />
                ))}
              </div>
            </div>

            {/* Dientes Supernumerarios Superiores si existen */}
            {upperSuper.length > 0 && (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-teal-400">Piezas Extra Superiores:</span>
                {upperSuper.map(sup => (
                  <button
                    key={sup.number}
                    type="button"
                    onClick={() => onSelectTooth(sup.number)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-black border transition-all ${
                      selectedTooth === sup.number
                        ? 'bg-teal-500 text-white border-teal-400 shadow-md'
                        : 'bg-slate-800 text-teal-300 border-slate-700 hover:border-teal-500/50'
                    }`}
                  >
                    #{sup.number}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Separador Oclusal Central si se muestran ambas arcadas */}
        {archFilter === 'both' && (
          <div className="relative py-1">
            <div className="border-t border-dashed border-slate-800" />
            <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-950 px-3 text-[10px] text-teal-400 font-bold uppercase tracking-widest">
              Plano de Oclusión Dental
            </span>
          </div>
        )}

        {/* ============================================================== */}
        {/* MANDÍBULA INFERIOR (CUADRANTES 4 Y 3 / 8 Y 7) */}
        {/* ============================================================== */}
        {(archFilter === 'both' || archFilter === 'lower') && (
          <div className="space-y-2 bg-slate-900/40 p-3 sm:p-4 rounded-2xl border border-slate-800/80">
            {/* Fila de Dientes Inferiores (Centrada con Línea Media) */}
            <div className="flex items-center justify-center gap-1 sm:gap-2 flex-nowrap min-w-max px-2">
              {/* Cuadrante 4 / 8 (Derecha del paciente) */}
              <div className="flex items-center gap-1">
                {q4.map(tooth => (
                  <ClinicalToothWidget
                    key={tooth.number}
                    tooth={tooth}
                    data={teeth[tooth.number]}
                    isSelected={selectedTooth === tooth.number}
                    activeCondition={activeCondition}
                    onSelectTooth={onSelectTooth}
                    onToggleFace={onToggleFace}
                    onErupt={onExfoliateAndErupt && CHILD_TO_ADULT_MAP[tooth.number] ? () => onExfoliateAndErupt(tooth.number, CHILD_TO_ADULT_MAP[tooth.number]) : undefined}
                    mode={mode}
                  />
                ))}
              </div>

              {/* LÍNEA MEDIA FACIAL DIVISORIA */}
              <div className="h-20 w-0.5 bg-teal-500/40 mx-1 relative flex items-center justify-center">
                <span className="absolute -bottom-3 text-[8px] font-black text-teal-400 uppercase tracking-tighter whitespace-nowrap bg-slate-900 px-1 rounded">
                  Línea Media
                </span>
              </div>

              {/* Cuadrante 3 / 7 (Izquierda del paciente) */}
              <div className="flex items-center gap-1">
                {q3.map(tooth => (
                  <ClinicalToothWidget
                    key={tooth.number}
                    tooth={tooth}
                    data={teeth[tooth.number]}
                    isSelected={selectedTooth === tooth.number}
                    activeCondition={activeCondition}
                    onSelectTooth={onSelectTooth}
                    onToggleFace={onToggleFace}
                    onErupt={onExfoliateAndErupt && CHILD_TO_ADULT_MAP[tooth.number] ? () => onExfoliateAndErupt(tooth.number, CHILD_TO_ADULT_MAP[tooth.number]) : undefined}
                    mode={mode}
                  />
                ))}
              </div>
            </div>

            {/* Dientes Supernumerarios Inferiores si existen */}
            {lowerSuper.length > 0 && (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-teal-400">Piezas Extra Inferiores:</span>
                {lowerSuper.map(sup => (
                  <button
                    key={sup.number}
                    type="button"
                    onClick={() => onSelectTooth(sup.number)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-black border transition-all ${
                      selectedTooth === sup.number
                        ? 'bg-teal-500 text-white border-teal-400 shadow-md'
                        : 'bg-slate-800 text-teal-300 border-slate-700 hover:border-teal-500/50'
                    }`}
                  >
                    #{sup.number}
                  </button>
                ))}
              </div>
            )}

            {/* Etiquetas de Cuadrante Inferior */}
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
              <span>◀ Cuadrante {mode === 'child' ? '8' : '4'} (Inf. Der.)</span>
              <span className="text-teal-400 font-black flex items-center gap-1 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
                🦷 Mandíbula Inferior
              </span>
              <span>Cuadrante {mode === 'child' ? '7' : '3'} (Inf. Izq.) ▶</span>
            </div>
          </div>
        )}
      </div>

      {/* Guía Visual Rápida de Caras para el Odontólogo */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-800 flex-wrap gap-2">
        <span className="flex items-center gap-1.5 font-bold text-teal-400">
          <Eye size={13} />
          <span>Esquema de Caras:</span>
        </span>
        <div className="flex items-center gap-3 text-[10px]">
          <span><strong>V</strong> = Vestibular</span>
          <span><strong>O</strong> = Oclusal / Incisal</span>
          <span><strong>L/P</strong> = Lingual / Palatino</span>
          <span><strong>M</strong> = Mesial</span>
          <span><strong>D</strong> = Distal</span>
        </div>
        <span className="text-[10px] text-slate-500">
          Haz clic directo en cualquier cuadrante de la corona para marcar
        </span>
      </div>
    </div>
  );
}
