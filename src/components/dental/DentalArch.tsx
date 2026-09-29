'use client';

import React, { useState } from 'react';
import { ToothData, ToothCondition } from '@/app/actions/dental';
import { CONDITIONS } from './Odontogram';
import { Sparkles, Layers, ArrowUpCircle, Plus, Eye, Check, X, ShieldAlert, Info } from 'lucide-react';

export interface DentalArchProps {
  teeth: Record<string, ToothData>;
  selectedTooth: string | null;
  onSelectTooth: (toothNum: string) => void;
  mode: 'adult' | 'child' | 'mixed';
  clinicalStatus?: 'existente' | 'planificado' | 'realizado';
  onExfoliateAndErupt?: (childNum: string, adultNum: string) => void;
  onToggleFace?: (toothNum: string, face: string, status?: 'existente' | 'planificado' | 'realizado') => void;
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

// Nombres anatómicos en español
export const TOOTH_NAMES: Record<string, string> = {
  // Cuadrante 1
  '18': 'Tercer Molar (Cordal)', '17': 'Segundo Molar', '16': 'Primer Molar',
  '15': 'Segundo Premolar', '14': 'Primer Premolar', '13': 'Canino',
  '12': 'Incisivo Lateral', '11': 'Incisivo Central',
  // Cuadrante 2
  '21': 'Incisivo Central', '22': 'Incisivo Lateral', '23': 'Canino',
  '24': 'Primer Premolar', '25': 'Segundo Premolar', '26': 'Primer Molar',
  '27': 'Segundo Molar', '28': 'Tercer Molar (Cordal)',
  // Cuadrante 3
  '31': 'Incisivo Central', '32': 'Incisivo Lateral', '33': 'Canino',
  '34': 'Primer Premolar', '35': 'Segundo Premolar', '36': 'Primer Molar',
  '37': 'Segundo Molar', '38': 'Tercer Molar (Cordal)',
  // Cuadrante 4
  '41': 'Incisivo Central', '42': 'Incisivo Lateral', '43': 'Canino',
  '44': 'Primer Premolar', '45': 'Segundo Premolar', '46': 'Primer Molar',
  '47': 'Segundo Molar', '48': 'Tercer Molar (Cordal)',
  // Temporales
  '51': 'Incisivo Central Sup. Der. (Temp)', '52': 'Incisivo Lat. Sup. Der. (Temp)', '53': 'Canino Sup. Der. (Temp)', '54': 'Primer Molar Sup. Der. (Temp)', '55': 'Segundo Molar Sup. Der. (Temp)',
  '61': 'Incisivo Central Sup. Izq. (Temp)', '62': 'Incisivo Lat. Sup. Izq. (Temp)', '63': 'Canino Sup. Izq. (Temp)', '64': 'Primer Molar Sup. Izq. (Temp)', '65': 'Segundo Molar Sup. Izq. (Temp)',
  '71': 'Incisivo Central Inf. Izq. (Temp)', '72': 'Incisivo Lat. Inf. Izq. (Temp)', '73': 'Canino Inf. Izq. (Temp)', '74': 'Primer Molar Inf. Izq. (Temp)', '75': 'Segundo Molar Inf. Izq. (Temp)',
  '81': 'Incisivo Central Inf. Der. (Temp)', '82': 'Incisivo Lat. Inf. Der. (Temp)', '83': 'Canino Inf. Der. (Temp)', '84': 'Primer Molar Inf. Der. (Temp)', '85': 'Segundo Molar Inf. Der. (Temp)',
};

export type ToothMorphType = 'molar' | 'premolar' | 'canine' | 'incisor';

export interface ToothDef {
  number: string;
  name: string;
  type: ToothMorphType;
  arch: 'upper' | 'lower';
  quadrant: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  isChild?: boolean;
  // Coordenadas parabólicas relativas para el arco en herradura
  curveX: number;
  curveY: number;
  angle: number;
}

// Coordenadas parabólicas exactas en herradura para adultos (800 x 600)
export const ADULT_TEETH_CURVED: ToothDef[] = [
  // Cuadrante 1: 18 al 11
  { number: '18', name: 'Tercer Molar Sup. Der.', type: 'molar', arch: 'upper', quadrant: 1, curveX: 130, curveY: 260, angle: -85 },
  { number: '17', name: 'Segundo Molar Sup. Der.', type: 'molar', arch: 'upper', quadrant: 1, curveX: 145, curveY: 205, angle: -78 },
  { number: '16', name: 'Primer Molar Sup. Der.', type: 'molar', arch: 'upper', quadrant: 1, curveX: 170, curveY: 155, angle: -68 },
  { number: '15', name: 'Segundo Premolar Sup. Der.', type: 'premolar', arch: 'upper', quadrant: 1, curveX: 205, curveY: 115, angle: -52 },
  { number: '14', name: 'Primer Premolar Sup. Der.', type: 'premolar', arch: 'upper', quadrant: 1, curveX: 250, curveY: 85, angle: -36 },
  { number: '13', name: 'Canino Sup. Der.', type: 'canine', arch: 'upper', quadrant: 1, curveX: 300, curveY: 65, angle: -22 },
  { number: '12', name: 'Incisivo Lateral Sup. Der.', type: 'incisor', arch: 'upper', quadrant: 1, curveX: 345, curveY: 55, angle: -10 },
  { number: '11', name: 'Incisivo Central Sup. Der.', type: 'incisor', arch: 'upper', quadrant: 1, curveX: 385, curveY: 52, angle: -3 },

  // Cuadrante 2: 21 al 28
  { number: '21', name: 'Incisivo Central Sup. Izq.', type: 'incisor', arch: 'upper', quadrant: 2, curveX: 435, curveY: 52, angle: 3 },
  { number: '22', name: 'Incisivo Lateral Sup. Izq.', type: 'incisor', arch: 'upper', quadrant: 2, curveX: 475, curveY: 55, angle: 10 },
  { number: '23', name: 'Canino Sup. Izq.', type: 'canine', arch: 'upper', quadrant: 2, curveX: 520, curveY: 65, angle: 22 },
  { number: '24', name: 'Primer Premolar Sup. Izq.', type: 'premolar', arch: 'upper', quadrant: 2, curveX: 570, curveY: 85, angle: 36 },
  { number: '25', name: 'Segundo Premolar Sup. Izq.', type: 'premolar', arch: 'upper', quadrant: 2, curveX: 615, curveY: 115, angle: 52 },
  { number: '26', name: 'Primer Molar Sup. Izq.', type: 'molar', arch: 'upper', quadrant: 2, curveX: 650, curveY: 155, angle: 68 },
  { number: '27', name: 'Segundo Molar Sup. Izq.', type: 'molar', arch: 'upper', quadrant: 2, curveX: 675, curveY: 205, angle: 78 },
  { number: '28', name: 'Tercer Molar Sup. Izq.', type: 'molar', arch: 'upper', quadrant: 2, curveX: 690, curveY: 260, angle: 85 },

  // Cuadrante 4: 48 al 41 (Mandíbula)
  { number: '48', name: 'Tercer Molar Inf. Der.', type: 'molar', arch: 'lower', quadrant: 4, curveX: 135, curveY: 340, angle: -85 },
  { number: '47', name: 'Segundo Molar Inf. Der.', type: 'molar', arch: 'lower', quadrant: 4, curveX: 150, curveY: 395, angle: -78 },
  { number: '46', name: 'Primer Molar Inf. Der.', type: 'molar', arch: 'lower', quadrant: 4, curveX: 175, curveY: 445, angle: -68 },
  { number: '45', name: 'Segundo Premolar Inf. Der.', type: 'premolar', arch: 'lower', quadrant: 4, curveX: 210, curveY: 485, angle: -52 },
  { number: '44', name: 'Primer Premolar Inf. Der.', type: 'premolar', arch: 'lower', quadrant: 4, curveX: 255, curveY: 515, angle: -36 },
  { number: '43', name: 'Canino Inf. Der.', type: 'canine', arch: 'lower', quadrant: 4, curveX: 305, curveY: 535, angle: -22 },
  { number: '42', name: 'Incisivo Lateral Inf. Der.', type: 'incisor', arch: 'lower', quadrant: 4, curveX: 350, curveY: 545, angle: -10 },
  { number: '41', name: 'Incisivo Central Inf. Der.', type: 'incisor', arch: 'lower', quadrant: 4, curveX: 390, curveY: 548, angle: -3 },

  // Cuadrante 3: 31 al 38 (Mandíbula)
  { number: '31', name: 'Incisivo Central Inf. Izq.', type: 'incisor', arch: 'lower', quadrant: 3, curveX: 430, curveY: 548, angle: 3 },
  { number: '32', name: 'Incisivo Lateral Inf. Izq.', type: 'incisor', arch: 'lower', quadrant: 3, curveX: 470, curveY: 545, angle: 10 },
  { number: '33', name: 'Canino Inf. Izq.', type: 'canine', arch: 'lower', quadrant: 3, curveX: 515, curveY: 535, angle: 22 },
  { number: '34', name: 'Primer Premolar Inf. Izq.', type: 'premolar', arch: 'lower', quadrant: 3, curveX: 565, curveY: 515, angle: 36 },
  { number: '35', name: 'Segundo Premolar Inf. Izq.', type: 'premolar', arch: 'lower', quadrant: 3, curveX: 610, curveY: 485, angle: 52 },
  { number: '36', name: 'Primer Molar Inf. Izq.', type: 'molar', arch: 'lower', quadrant: 3, curveX: 645, curveY: 445, angle: 68 },
  { number: '37', name: 'Segundo Molar Inf. Izq.', type: 'molar', arch: 'lower', quadrant: 3, curveX: 670, curveY: 395, angle: 78 },
  { number: '38', name: 'Tercer Molar Inf. Izq.', type: 'molar', arch: 'lower', quadrant: 3, curveX: 685, curveY: 340, angle: 85 },
];

// Coordenadas para niños (20 piezas)
export const CHILD_TEETH_CURVED: ToothDef[] = [
  // Cuadrante 5: 55 al 51
  { number: '55', name: 'Segundo Molar Sup. Der. (Temp)', type: 'molar', arch: 'upper', quadrant: 5, curveX: 200, curveY: 190, angle: -65, isChild: true },
  { number: '54', name: 'Primer Molar Sup. Der. (Temp)', type: 'molar', arch: 'upper', quadrant: 5, curveX: 240, curveY: 140, angle: -48, isChild: true },
  { number: '53', name: 'Canino Sup. Der. (Temp)', type: 'canine', arch: 'upper', quadrant: 5, curveX: 290, curveY: 105, angle: -30, isChild: true },
  { number: '52', name: 'Incisivo Lat. Sup. Der. (Temp)', type: 'incisor', arch: 'upper', quadrant: 5, curveX: 340, curveY: 85, angle: -14, isChild: true },
  { number: '51', name: 'Incisivo Central Sup. Der. (Temp)', type: 'incisor', arch: 'upper', quadrant: 5, curveX: 385, curveY: 80, angle: -4, isChild: true },

  // Cuadrante 6: 61 al 65
  { number: '61', name: 'Incisivo Central Sup. Izq. (Temp)', type: 'incisor', arch: 'upper', quadrant: 6, curveX: 435, curveY: 80, angle: 4, isChild: true },
  { number: '62', name: 'Incisivo Lat. Sup. Izq. (Temp)', type: 'incisor', arch: 'upper', quadrant: 6, curveX: 480, curveY: 85, angle: 14, isChild: true },
  { number: '63', name: 'Canino Sup. Izq. (Temp)', type: 'canine', arch: 'upper', quadrant: 6, curveX: 530, curveY: 105, angle: 30, isChild: true },
  { number: '64', name: 'Primer Molar Sup. Izq. (Temp)', type: 'molar', arch: 'upper', quadrant: 6, curveX: 580, curveY: 140, angle: 48, isChild: true },
  { number: '65', name: 'Segundo Molar Sup. Izq. (Temp)', type: 'molar', arch: 'upper', quadrant: 6, curveX: 620, curveY: 190, angle: 65, isChild: true },

  // Cuadrante 8: 85 al 81
  { number: '85', name: 'Segundo Molar Inf. Der. (Temp)', type: 'molar', arch: 'lower', quadrant: 8, curveX: 200, curveY: 410, angle: -65, isChild: true },
  { number: '84', name: 'Primer Molar Inf. Der. (Temp)', type: 'molar', arch: 'lower', quadrant: 8, curveX: 240, curveY: 460, angle: -48, isChild: true },
  { number: '83', name: 'Canino Inf. Der. (Temp)', type: 'canine', arch: 'lower', quadrant: 8, curveX: 290, curveY: 495, angle: -30, isChild: true },
  { number: '82', name: 'Incisivo Lat. Inf. Der. (Temp)', type: 'incisor', arch: 'lower', quadrant: 8, curveX: 340, curveY: 515, angle: -14, isChild: true },
  { number: '81', name: 'Incisivo Central Inf. Der. (Temp)', type: 'incisor', arch: 'lower', quadrant: 8, curveX: 385, curveY: 520, angle: -4, isChild: true },

  // Cuadrante 7: 71 al 75
  { number: '71', name: 'Incisivo Central Inf. Izq. (Temp)', type: 'incisor', arch: 'lower', quadrant: 7, curveX: 435, curveY: 520, angle: 4, isChild: true },
  { number: '72', name: 'Incisivo Lat. Inf. Izq. (Temp)', type: 'incisor', arch: 'lower', quadrant: 7, curveX: 480, curveY: 515, angle: 14, isChild: true },
  { number: '73', name: 'Canino Inf. Izq. (Temp)', type: 'canine', arch: 'lower', quadrant: 7, curveX: 530, curveY: 495, angle: 30, isChild: true },
  { number: '74', name: 'Primer Molar Inf. Izq. (Temp)', type: 'molar', arch: 'lower', quadrant: 7, curveX: 580, curveY: 460, angle: 48, isChild: true },
  { number: '75', name: 'Segundo Molar Inf. Izq. (Temp)', type: 'molar', arch: 'lower', quadrant: 7, curveX: 620, curveY: 410, angle: 65, isChild: true },
];

/**
 * Componente individual de un diente clínico en la herradura anatómica.
 */
function HorseshoeToothWidget({
  tooth,
  data,
  isSelected,
  activeCondition,
  clinicalStatus = 'planificado',
  onSelectTooth,
  onToggleFace,
  onErupt,
  mode,
}: {
  tooth: ToothDef;
  data?: ToothData;
  isSelected: boolean;
  activeCondition?: string;
  clinicalStatus?: 'existente' | 'planificado' | 'realizado';
  onSelectTooth: (num: string) => void;
  onToggleFace?: (num: string, face: string, status?: 'existente' | 'planificado' | 'realizado') => void;
  onErupt?: () => void;
  mode: 'adult' | 'child' | 'mixed';
}) {
  const conditions = data?.conditions || [];
  const isAbsent = conditions.some(c => c.code === 'ausente');
  const isImplant = conditions.some(c => c.code === 'implante');
  const isCrown = conditions.some(c => c.code === 'corona');
  const isEndo = conditions.some(c => c.code === 'endodoncia');

  // Mapear caras afectadas y sus colores según su estado clínico
  const faceFills: Record<string, string> = {};
  conditions.forEach(cond => {
    const def = CONDITIONS[cond.code];
    let fill = def?.color || '#ef4444';

    // Diferenciación de los 3 estados clínicos:
    if (cond.status === 'existente') {
      fill = '#64748b'; // Gris acero (tratado por otro odontólogo)
    } else if (cond.status === 'realizado') {
      fill = '#10b981'; // Verde esmeralda (tratado por nosotros)
    } else {
      fill = cond.color || def?.color || '#ef4444'; // Rojo coral (diagnosticado hoy / planificado)
    }

    (cond.faces || []).forEach(f => {
      faceFills[f] = fill;
    });
  });

  // Orientación anatómica: Mesial apunta a la línea media
  const isRightSide = [1, 4, 5, 8].includes(tooth.quadrant);
  const leftFace = isRightSide ? 'distal' : 'mesial';
  const rightFace = isRightSide ? 'mesial' : 'distal';
  const topFace = tooth.arch === 'upper' ? 'vestibular' : 'lingual';
  const bottomFace = tooth.arch === 'upper' ? 'lingual' : 'vestibular';

  const handleFaceClick = (face: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeCondition === 'select') {
      onSelectTooth(tooth.number);
      return;
    }
    if (onToggleFace) {
      onToggleFace(tooth.number, face, clinicalStatus);
    } else {
      onSelectTooth(tooth.number);
    }
  };

  const getFaceFill = (face: string) => {
    if (faceFills[face]) return faceFills[face];
    if (isCrown) return 'url(#crown-gold-grad)';
    return 'url(#tooth-enamel-grad)';
  };

  // Posicionamiento en el canvas de herradura
  const size = tooth.type === 'molar' ? 44 : tooth.type === 'premolar' ? 38 : 34;

  return (
    <g
      transform={`translate(${tooth.curveX - size / 2}, ${tooth.curveY - size / 2})`}
      className="cursor-pointer select-none group"
      onClick={() => onSelectTooth(tooth.number)}
    >
      {/* Halo de selección clínica */}
      {isSelected && (
        <rect
          x="-6"
          y="-6"
          width={size + 12}
          height={size + 24}
          rx="12"
          fill="rgba(20, 184, 166, 0.15)"
          stroke="#14b8a6"
          strokeWidth="2"
          className="animate-pulse"
        />
      )}

      {/* RAÍZ ANATÓMICA SVG (Dientes superiores raíces hacia arriba, inferiores hacia abajo) */}
      <g transform={tooth.arch === 'upper' ? 'translate(0, -14)' : `translate(0, ${size})`}>
        {isImplant ? (
          /* Rosca de Titanio Biomecánica */
          <g>
            <rect x={size / 2 - 4} y={tooth.arch === 'upper' ? -12 : 2} width="8" height="12" rx="2" fill="url(#titanium-screw-grad)" stroke="#0284c7" strokeWidth="0.8" />
            <line x1={size / 2 - 4} y1={tooth.arch === 'upper' ? -9 : 5} x2={size / 2 + 4} y2={tooth.arch === 'upper' ? -9 : 5} stroke="#38bdf8" strokeWidth="1" />
            <line x1={size / 2 - 4} y1={tooth.arch === 'upper' ? -5 : 9} x2={size / 2 + 4} y2={tooth.arch === 'upper' ? -5 : 9} stroke="#38bdf8" strokeWidth="1" />
          </g>
        ) : tooth.type === 'molar' ? (
          /* 3 Raíces de Molar */
          <g>
            <path
              d={tooth.arch === 'upper' ? `M 6 14 C 4 6, 8 0, 12 0 C 14 0, 15 6, 17 14 Z` : `M 6 0 C 4 8, 8 14, 12 14 C 14 14, 15 8, 17 0 Z`}
              fill="url(#root-grad)"
              stroke="#64748b"
              strokeWidth="0.6"
            />
            <path
              d={tooth.arch === 'upper' ? `M ${size - 17} 14 C ${size - 15} 6, ${size - 14} 0, ${size - 12} 0 C ${size - 8} 0, ${size - 4} 6, ${size - 6} 14 Z` : `M ${size - 17} 0 C ${size - 15} 8, ${size - 14} 14, ${size - 12} 14 C ${size - 8} 14, ${size - 4} 8, ${size - 6} 0 Z`}
              fill="url(#root-grad)"
              stroke="#64748b"
              strokeWidth="0.6"
            />
            {isEndo && (
              <line
                x1={size / 2}
                y1={tooth.arch === 'upper' ? 14 : 0}
                x2={size / 2}
                y2={tooth.arch === 'upper' ? 0 : 14}
                stroke="#a855f7"
                strokeWidth="2"
                strokeLinecap="round"
                className="animate-pulse"
              />
            )}
          </g>
        ) : (
          /* Raíz Única de Incisivo / Canino / Premolar */
          <g>
            <path
              d={tooth.arch === 'upper' ? `M ${size / 2 - 5} 14 C ${size / 2 - 4} 4, ${size / 2 - 2} 0, ${size / 2} 0 C ${size / 2 + 2} 0, ${size / 2 + 4} 4, ${size / 2 + 5} 14 Z` : `M ${size / 2 - 5} 0 C ${size / 2 - 4} 10, ${size / 2 - 2} 14, ${size / 2} 14 C ${size / 2 + 2} 14, ${size / 2 + 4} 10, ${size / 2 + 5} 0 Z`}
              fill="url(#root-grad)"
              stroke="#64748b"
              strokeWidth="0.6"
            />
            {isEndo && (
              <line
                x1={size / 2}
                y1={tooth.arch === 'upper' ? 14 : 0}
                x2={size / 2}
                y2={tooth.arch === 'upper' ? 0 : 14}
                stroke="#a855f7"
                strokeWidth="2"
                strokeLinecap="round"
                className="animate-pulse"
              />
            )}
          </g>
        )}
      </g>

      {/* CORONA PENTASECTORIAL (5 CARAS CLÍNICAS: V, L/P, M, D, O) */}
      <g opacity={isAbsent ? 0.35 : 1}>
        {/* Cara Superior */}
        <polygon
          points={`4,4 ${size - 4},4 ${size - 10},10 10,10`}
          fill={getFaceFill(topFace)}
          stroke="#475569"
          strokeWidth="1.2"
          onClick={(e) => handleFaceClick(topFace, e)}
          className="hover:opacity-80 transition-opacity"
        >
          <title>{`${tooth.number} — Cara ${topFace}`}</title>
        </polygon>

        {/* Cara Izquierda */}
        <polygon
          points={`4,4 10,10 10,${size - 10} 4,${size - 4}`}
          fill={getFaceFill(leftFace)}
          stroke="#475569"
          strokeWidth="1.2"
          onClick={(e) => handleFaceClick(leftFace, e)}
          className="hover:opacity-80 transition-opacity"
        >
          <title>{`${tooth.number} — Cara ${leftFace}`}</title>
        </polygon>

        {/* Cara Central (Oclusal / Incisal) */}
        <polygon
          points={`10,10 ${size - 10},10 ${size - 10},${size - 10} 10,${size - 10}`}
          fill={getFaceFill('oclusal')}
          stroke="#475569"
          strokeWidth="1.2"
          onClick={(e) => handleFaceClick('oclusal', e)}
          className="hover:opacity-80 transition-opacity"
        >
          <title>{`${tooth.number} — Cara Oclusal/Incisal`}</title>
        </polygon>

        {/* Cara Derecha */}
        <polygon
          points={`${size - 10},10 ${size - 4},4 ${size - 4},${size - 4} ${size - 10},${size - 10}`}
          fill={getFaceFill(rightFace)}
          stroke="#475569"
          strokeWidth="1.2"
          onClick={(e) => handleFaceClick(rightFace, e)}
          className="hover:opacity-80 transition-opacity"
        >
          <title>{`${tooth.number} — Cara ${rightFace}`}</title>
        </polygon>

        {/* Cara Inferior */}
        <polygon
          points={`10,${size - 10} ${size - 10},${size - 10} ${size - 4},${size - 4} 4,${size - 4}`}
          fill={getFaceFill(bottomFace)}
          stroke="#475569"
          strokeWidth="1.2"
          onClick={(e) => handleFaceClick(bottomFace, e)}
          className="hover:opacity-80 transition-opacity"
        >
          <title>{`${tooth.number} — Cara ${bottomFace}`}</title>
        </polygon>
      </g>

      {/* Marca de diente ausente (cruz roja/gris) */}
      {isAbsent && (
        <g stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round">
          <line x1="6" y1="6" x2={size - 6} y2={size - 6} />
          <line x1={size - 6} y1="6" x2="6" y2={size - 6} />
        </g>
      )}

      {/* Número FDI de la Pieza */}
      <text
        x={size / 2}
        y={tooth.arch === 'upper' ? -18 : size + 24}
        textAnchor="middle"
        fontSize="10"
        fontFamily="monospace"
        fontWeight="bold"
        fill={isSelected ? '#14b8a6' : tooth.isChild ? '#f59e0b' : '#94a3b8'}
        className="transition-colors group-hover:fill-white select-none pointer-events-none"
      >
        {tooth.number}
      </text>

      {/* Botón de erupción rápida en modo mixto para piezas de leche */}
      {mode === 'mixed' && tooth.isChild && onErupt && (
        <circle
          cx={size / 2}
          cy={tooth.arch === 'upper' ? -30 : size + 36}
          r="8"
          fill="#f59e0b"
          className="hover:fill-amber-400 cursor-pointer animate-bounce"
          onClick={(e) => {
            e.stopPropagation();
            onErupt();
          }}
        />
      )}
      {mode === 'mixed' && tooth.isChild && onErupt && (
        <text
          x={size / 2}
          y={tooth.arch === 'upper' ? -27 : size + 39}
          textAnchor="middle"
          fontSize="9"
          fill="#ffffff"
          fontWeight="black"
          className="pointer-events-none select-none"
        >
          ⬆
        </text>
      )}
    </g>
  );
}

export function DentalArch({
  teeth,
  selectedTooth,
  onSelectTooth,
  mode,
  clinicalStatus = 'planificado',
  onExfoliateAndErupt,
  onToggleFace,
  activeCondition = 'caries',
  supernumeraryTeeth = [],
}: DentalArchProps) {
  const [archFilter, setArchFilter] = useState<'both' | 'upper' | 'lower'>('both');

  const adultTeeth = ADULT_TEETH_CURVED;
  const childTeeth = CHILD_TEETH_CURVED;

  const currentTeethList = mode === 'child' ? childTeeth : adultTeeth;

  const upperTeeth = currentTeethList.filter(t => t.arch === 'upper');
  const lowerTeeth = currentTeethList.filter(t => t.arch === 'lower');

  // Separar piezas supernumerarias
  const upperSuper = supernumeraryTeeth.filter(t => t.number.startsWith('1') || t.number.startsWith('2') || t.number.startsWith('PM'));
  const lowerSuper = supernumeraryTeeth.filter(t => t.number.startsWith('4') || t.number.startsWith('3'));

  return (
    <div className="w-full flex flex-col items-center bg-slate-950 border border-slate-800/80 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden select-none">
      {/* GRADIENTES Y DEFINICIONES SVG */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="tooth-enamel-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <linearGradient id="root-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <linearGradient id="titanium-screw-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
          <linearGradient id="crown-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
      </svg>

      {/* BARRA SUPERIOR DE CONTROLES: FILTRO DE ARCADA & STATUS CLÍNICO */}
      <div className="w-full flex items-center justify-between gap-3 pb-3 border-b border-slate-800/80 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
            <span>👄 Arco Anatómico</span>
          </span>
          <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full font-medium">
            {mode === 'adult' ? 'Adulto (32)' : mode === 'child' ? 'Infantil (20)' : 'Mixto'}
          </span>
        </div>

        {/* Filtro de Arcada Touch */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setArchFilter('upper')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              archFilter === 'upper'
                ? 'bg-teal-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🦷 Maxilar Superior
          </button>
          <button
            type="button"
            onClick={() => setArchFilter('lower')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              archFilter === 'lower'
                ? 'bg-teal-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🦷 Mandíbula Inferior
          </button>
          <button
            type="button"
            onClick={() => setArchFilter('both')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              archFilter === 'both'
                ? 'bg-teal-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            👄 Ambas
          </button>
        </div>
      </div>

      {/* CANVAS SVG INTERACTIVO EN HERRADURA ANATÓMICA */}
      <div className="w-full flex items-center justify-center py-2 overflow-x-auto">
        <svg
          viewBox={archFilter === 'upper' ? '80 10 660 300' : archFilter === 'lower' ? '80 300 660 310' : '80 10 660 600'}
          className="w-full max-w-[620px] h-auto drop-shadow-2xl overflow-visible"
        >
          {/* LÍNEA MEDIA FACIAL CENTRAL */}
          <line
            x1="410"
            y1={archFilter === 'lower' ? "310" : "20"}
            x2="410"
            y2={archFilter === 'upper' ? "300" : "590"}
            stroke="#14b8a6"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            opacity="0.4"
          />

          {/* PLANO DE OCLUSIÓN (SI SE MUESTRAN AMBAS ARCADAS) */}
          {archFilter === 'both' && (
            <g>
              <line x1="100" y1="300" x2="720" y2="300" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
              <text x="410" y="304" textAnchor="middle" fontSize="9" fill="#14b8a6" fontWeight="bold" letterSpacing="2">
                PLANO DE OCLUSIÓN DENTAL
              </text>
            </g>
          )}

          {/* MAXILAR SUPERIOR */}
          {(archFilter === 'both' || archFilter === 'upper') && (
            <g>
              {/* Etiqueta Cuadrantes Superiores */}
              <text x="140" y="30" fontSize="10" fontWeight="bold" fill="#64748b" textAnchor="start">
                ◀ Cuad. {mode === 'child' ? '5' : '1'} (Sup. Der.)
              </text>
              <text x="680" y="30" fontSize="10" fontWeight="bold" fill="#64748b" textAnchor="end">
                Cuad. {mode === 'child' ? '6' : '2'} (Sup. Izq.) ▶
              </text>

              {/* Piezas Superiores */}
              {upperTeeth.map(tooth => (
                <HorseshoeToothWidget
                  key={tooth.number}
                  tooth={tooth}
                  data={teeth[tooth.number]}
                  isSelected={selectedTooth === tooth.number}
                  activeCondition={activeCondition}
                  clinicalStatus={clinicalStatus}
                  onSelectTooth={onSelectTooth}
                  onToggleFace={onToggleFace}
                  onErupt={onExfoliateAndErupt && CHILD_TO_ADULT_MAP[tooth.number] ? () => onExfoliateAndErupt(tooth.number, CHILD_TO_ADULT_MAP[tooth.number]) : undefined}
                  mode={mode}
                />
              ))}
            </g>
          )}

          {/* MANDÍBULA INFERIOR */}
          {(archFilter === 'both' || archFilter === 'lower') && (
            <g>
              {/* Piezas Inferiores */}
              {lowerTeeth.map(tooth => (
                <HorseshoeToothWidget
                  key={tooth.number}
                  tooth={tooth}
                  data={teeth[tooth.number]}
                  isSelected={selectedTooth === tooth.number}
                  activeCondition={activeCondition}
                  clinicalStatus={clinicalStatus}
                  onSelectTooth={onSelectTooth}
                  onToggleFace={onToggleFace}
                  onErupt={onExfoliateAndErupt && CHILD_TO_ADULT_MAP[tooth.number] ? () => onExfoliateAndErupt(tooth.number, CHILD_TO_ADULT_MAP[tooth.number]) : undefined}
                  mode={mode}
                />
              ))}

              {/* Etiqueta Cuadrantes Inferiores */}
              <text x="140" y="585" fontSize="10" fontWeight="bold" fill="#64748b" textAnchor="start">
                ◀ Cuad. {mode === 'child' ? '8' : '4'} (Inf. Der.)
              </text>
              <text x="680" y="585" fontSize="10" fontWeight="bold" fill="#64748b" textAnchor="end">
                Cuad. {mode === 'child' ? '7' : '3'} (Inf. Izq.) ▶
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* PIEZAS SUPERNUMERARIAS (SI EXISTEN) */}
      {supernumeraryTeeth.length > 0 && (
        <div className="w-full pt-3 border-t border-slate-800 flex items-center justify-center gap-2 flex-wrap text-xs">
          <span className="text-[11px] font-bold text-teal-400">Piezas Extra:</span>
          {supernumeraryTeeth.map(sup => (
            <button
              key={sup.number}
              type="button"
              onClick={() => onSelectTooth(sup.number)}
              className={`px-3 py-1 rounded-xl font-mono font-bold border transition-all ${
                selectedTooth === sup.number
                  ? 'bg-teal-500 text-white border-teal-400 shadow-md'
                  : 'bg-slate-900 text-teal-300 border-slate-700 hover:border-teal-500/50'
              }`}
            >
              #{sup.number} {sup.notes ? `(${sup.notes})` : ''}
            </button>
          ))}
        </div>
      )}

      {/* LEYENDA CLÍNICA RÁPIDA DE LOS 3 ESTADOS */}
      <div className="w-full mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            <strong className="text-slate-300">Existente Previo:</strong> Tratado antes (No cobra)
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <strong className="text-rose-400">Planificado Hoy:</strong> Diagnóstico activo (Suma al plan)
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <strong className="text-emerald-400">Realizado:</strong> Concluido por nosotros
          </span>
        </div>
        <span className="text-[10px] text-slate-500">
          Haz clic directo en cualquier cuadrante de la corona para marcar
        </span>
      </div>
    </div>
  );
}
