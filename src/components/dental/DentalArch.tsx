'use client';

import React, { useState } from 'react';
import { ToothData, ToothCondition } from '@/app/actions/dental';
import { CONDITIONS } from './Odontogram';
import { Sparkles, Eye, X, ZoomIn, Info } from 'lucide-react';

interface DentalArchProps {
  teeth: Record<string, ToothData>;
  selectedTooth: string | null;
  onSelectTooth: (toothNum: string) => void;
  mode: 'adult' | 'child' | 'mixed';
  onExfoliateAndErupt?: (childNum: string, adultNum: string) => void;
}

// Relación anatómica de sustitución de dientes de leche por permanentes
export const CHILD_TO_ADULT_MAP: Record<string, string> = {
  '55': '15', '54': '14', '53': '13', '52': '12', '51': '11',
  '61': '21', '62': '22', '63': '23', '64': '24', '65': '25',
  '85': '45', '84': '44', '83': '43', '82': '42', '81': '41',
  '71': '31', '72': '32', '73': '33', '74': '34', '75': '35',
};

// Nombres anatómicos en español para tooltips clínicos
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

interface ToothPosition {
  number: string;
  x: number;
  y: number;
  angle: number;
  type: 'molar' | 'premolar' | 'canine' | 'incisor';
  isChild?: boolean;
}

// Posiciones anatómicas de los dientes permanentes superiores (Herradura Maxilar)
const UPPER_ADULT_POSITIONS: ToothPosition[] = [
  { number: '18', x: 80,  y: 270, angle: -16, type: 'molar' },
  { number: '17', x: 108, y: 220, angle: -22, type: 'molar' },
  { number: '16', x: 142, y: 172, angle: -28, type: 'molar' },
  { number: '15', x: 182, y: 130, angle: -36, type: 'premolar' },
  { number: '14', x: 228, y: 96,  angle: -45, type: 'premolar' },
  { number: '13', x: 278, y: 72,  angle: -58, type: 'canine' },
  { number: '12', x: 326, y: 58,  angle: -72, type: 'incisor' },
  { number: '11', x: 370, y: 52,  angle: -85, type: 'incisor' },

  { number: '21', x: 410, y: 52,  angle: 85,  type: 'incisor' },
  { number: '22', x: 454, y: 58,  angle: 72,  type: 'incisor' },
  { number: '23', x: 502, y: 72,  angle: 58,  type: 'canine' },
  { number: '24', x: 552, y: 96,  angle: 45,  type: 'premolar' },
  { number: '25', x: 598, y: 130, angle: 36,  type: 'premolar' },
  { number: '26', x: 638, y: 172, angle: 28,  type: 'molar' },
  { number: '27', x: 672, y: 220, angle: 22,  type: 'molar' },
  { number: '28', x: 700, y: 270, angle: 16,  type: 'molar' },
];

// Posiciones anatómicas de los dientes permanentes inferiores (Herradura Mandibular)
const LOWER_ADULT_POSITIONS: ToothPosition[] = [
  { number: '48', x: 90,  y: 400, angle: 16,  type: 'molar' },
  { number: '47', x: 118, y: 450, angle: 22,  type: 'molar' },
  { number: '46', x: 152, y: 498, angle: 28,  type: 'molar' },
  { number: '45', x: 192, y: 540, angle: 36,  type: 'premolar' },
  { number: '44', x: 238, y: 574, angle: 45,  type: 'premolar' },
  { number: '43', x: 288, y: 598, angle: 58,  type: 'canine' },
  { number: '42', x: 334, y: 612, angle: 72,  type: 'incisor' },
  { number: '41', x: 372, y: 618, angle: 85,  type: 'incisor' },

  { number: '31', x: 408, y: 618, angle: -85, type: 'incisor' },
  { number: '32', x: 446, y: 612, angle: -72, type: 'incisor' },
  { number: '33', x: 492, y: 598, angle: -58, type: 'canine' },
  { number: '34', x: 542, y: 574, angle: -45, type: 'premolar' },
  { number: '35', x: 588, y: 540, angle: -36, type: 'premolar' },
  { number: '36', x: 628, y: 498, angle: -28, type: 'molar' },
  { number: '37', x: 662, y: 450, angle: -22, type: 'molar' },
  { number: '38', x: 690, y: 400, angle: -16, type: 'molar' },
];

// Posiciones dentición infantil (dientes de leche)
const UPPER_CHILD_POSITIONS: ToothPosition[] = [
  { number: '55', x: 200, y: 195, angle: -30, type: 'molar', isChild: true },
  { number: '54', x: 242, y: 154, angle: -40, type: 'molar', isChild: true },
  { number: '53', x: 290, y: 126, angle: -54, type: 'canine', isChild: true },
  { number: '52', x: 336, y: 108, angle: -70, type: 'incisor', isChild: true },
  { number: '51', x: 374, y: 104, angle: -85, type: 'incisor', isChild: true },

  { number: '61', x: 406, y: 104, angle: 85,  type: 'incisor', isChild: true },
  { number: '62', x: 444, y: 108, angle: 70,  type: 'incisor', isChild: true },
  { number: '63', x: 490, y: 126, angle: 54,  type: 'canine', isChild: true },
  { number: '64', x: 538, y: 154, angle: 40,  type: 'molar', isChild: true },
  { number: '65', x: 580, y: 195, angle: 30,  type: 'molar', isChild: true },
];

const LOWER_CHILD_POSITIONS: ToothPosition[] = [
  { number: '85', x: 204, y: 475, angle: 30,  type: 'molar', isChild: true },
  { number: '84', x: 246, y: 516, angle: 40,  type: 'molar', isChild: true },
  { number: '83', x: 294, y: 544, angle: 54,  type: 'canine', isChild: true },
  { number: '82', x: 340, y: 562, angle: 70,  type: 'incisor', isChild: true },
  { number: '81', x: 376, y: 566, angle: 85,  type: 'incisor', isChild: true },

  { number: '71', x: 404, y: 566, angle: -85, type: 'incisor', isChild: true },
  { number: '72', x: 440, y: 562, angle: -70, type: 'incisor', isChild: true },
  { number: '73', x: 486, y: 544, angle: -54, type: 'canine', isChild: true },
  { number: '74', x: 534, y: 516, angle: -40, type: 'molar', isChild: true },
  { number: '75', x: 576, y: 475, angle: -30, type: 'molar', isChild: true },
];

export function DentalArch({
  teeth,
  selectedTooth,
  onSelectTooth,
  mode,
  onExfoliateAndErupt,
}: DentalArchProps) {
  // Selector de arco para teléfonos y pantallas móviles: Maxilar Superior, Mandíbula Inferior o Boca Completa
  const [archFocus, setArchFocus] = useState<'both' | 'upper' | 'lower'>('both');
  const [hoveredTooth, setHoveredTooth] = useState<string | null>(null);
  const [show3DReferenceModal, setShow3DReferenceModal] = useState(false);
  const [activeReferenceTab, setActiveReferenceTab] = useState<'occlusal' | 'horseshoe' | 'specimens'>('occlusal');

  // ViewBox dinámico según el enfoque: en móviles hace zoom al arco seleccionado permitiendo tocar dientes grandes
  const currentViewBox = archFocus === 'upper'
    ? '60 30 660 270'
    : archFocus === 'lower'
    ? '70 370 640 280'
    : '50 20 680 640';

  // Render individual de cada diente con esmalte cerámico 3D, relieves oclusales y tratamientos
  const renderTooth = (pos: ToothPosition) => {
    const data = teeth[pos.number];
    const isSelected = selectedTooth === pos.number;
    const isHovered = hoveredTooth === pos.number;
    const conditions = data?.conditions || [];
    const isAbsent = conditions.some((c) => c.code === 'ausente');
    const isImplant = conditions.some((c) => c.code === 'implante');
    const isCrown = conditions.some((c) => c.code === 'corona');

    const cond1 = conditions[0] ? CONDITIONS[conditions[0].code] : null;
    const cond2 = conditions[1] ? CONDITIONS[conditions[1].code] : null;
    const hasMultiple = conditions.length > 1;

    // Caras afectadas marcadas en este diente
    const activeFaces = conditions.flatMap(c => c.faces || []);
    const hasOclusal = activeFaces.includes('oclusal');
    const hasVestibular = activeFaces.includes('vestibular');
    const hasLingual = activeFaces.includes('lingual');
    const hasMesial = activeFaces.includes('mesial');
    const hasDistal = activeFaces.includes('distal');

    // Escala infantil vs permanente
    const scale = pos.isChild ? 0.8 : 1;
    const toothName = TOOTH_NAMES[pos.number] || `Pieza ${pos.number}`;

    // Estilos de esmalte cerámico multicapa
    let toothFill = 'url(#porcelain-3d-enamel)';
    let toothStroke = isSelected ? '#14b8a6' : '#94a3b8';
    let strokeWidth = isSelected ? 3 : 1.4;

    if (isAbsent) {
      toothFill = 'url(#absent-socket-pattern)';
      toothStroke = '#64748b';
    } else if (isCrown) {
      toothFill = 'url(#zirconia-gold-crown-grad)';
      toothStroke = '#f59e0b';
    } else if (isImplant) {
      toothFill = 'url(#titanium-implant-grad)';
      toothStroke = '#06b6d4';
    } else if (hasMultiple && cond1 && cond2) {
      toothStroke = cond1.color;
      toothFill = 'url(#porcelain-3d-enamel)';
    } else if (cond1) {
      toothStroke = cond1.color;
      toothFill = cond1.color + '2c';
    }

    return (
      <g
        key={pos.number}
        transform={`translate(${pos.x}, ${pos.y}) rotate(${pos.angle}) scale(${scale})`}
        className="cursor-pointer group transition-all"
        onClick={() => onSelectTooth(pos.number)}
        onMouseEnter={() => setHoveredTooth(pos.number)}
        onMouseLeave={() => setHoveredTooth(null)}
      >
        <title>{`Pieza ${pos.number} — ${toothName}${conditions.length > 0 ? ` (${conditions.map(c => CONDITIONS[c.code]?.label || c.code).join(', ')})` : ''}`}</title>

        {/* Zona de impacto táctil ampliada (Hit-target invisible para dedos en teléfonos) */}
        <circle cx={0} cy={0} r={28} fill="transparent" />

        {/* Anillo de Selección Quirúrgica Pulsante */}
        {isSelected && (
          <g>
            <ellipse
              cx={0}
              cy={0}
              rx={pos.type === 'molar' ? 26 : pos.type === 'premolar' ? 22 : 20}
              ry={pos.type === 'molar' ? 24 : pos.type === 'premolar' ? 20 : 18}
              className="fill-teal-500/20 stroke-teal-400 animate-pulse"
              strokeWidth={3.5}
              filter="url(#glow-filter)"
            />
            <circle cx={0} cy={0} r={2.5} fill="#14b8a6" />
          </g>
        )}

        {/* Resplandor al pasar el cursor (Hover) */}
        {!isSelected && isHovered && (
          <ellipse
            cx={0}
            cy={0}
            rx={pos.type === 'molar' ? 24 : pos.type === 'premolar' ? 21 : 19}
            ry={pos.type === 'molar' ? 22 : pos.type === 'premolar' ? 19 : 17}
            className="fill-cyan-400/15 stroke-cyan-400/80"
            strokeWidth={2}
          />
        )}

        {/* ========================================================= */}
        {/* SILUETAS ANATÓMICAS 3D ESCULPIDAS CON RELIEVES Y ESMALTE */}
        {/* ========================================================= */}

        {/* 1. MOLAR: Corona de 4 cúspides redondeadas, surcos anatómicos y fosas */}
        {pos.type === 'molar' && (
          <g className="transition-transform group-hover:scale-108 duration-150">
            {/* Sombra de contacto oclusal */}
            <ellipse cx={0} cy={3} rx={18} ry={14} fill="rgba(0,0,0,0.25)" filter="blur(3px)" />

            {/* Corona Molar con Esmalte Porcelánico */}
            <path
              d="M -18 -14 C -12 -18, 12 -18, 18 -14 C 22 -10, 22 10, 18 14 C 12 18, -12 18, -18 14 C -22 10, -22 -10, -18 -14 Z"
              fill={toothFill}
              stroke={isSelected ? '#0ea5e9' : toothStroke}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              className={isAbsent ? 'stroke-dashed opacity-40' : ''}
              filter="drop-shadow(0 3px 5px rgba(0,0,0,0.3))"
            />

            {/* Brillo especular de esmalte de consultorio dental */}
            {!isAbsent && (
              <ellipse cx={-4} cy={-7} rx={7} ry={3.5} fill="#ffffff" opacity={0.7} transform="rotate(-15 -4 -7)" />
            )}

            {/* Resalte visual de caras afectadas si existen */}
            {!isAbsent && (
              <>
                {hasOclusal && (
                  <circle cx={0} cy={0} r={5} fill={cond1?.color || '#ef4444'} opacity={0.75} />
                )}
                {hasVestibular && (
                  <path d="M -12 -14 Q 0 -17 12 -14" stroke={cond1?.color || '#ef4444'} strokeWidth={3} strokeLinecap="round" />
                )}
                {hasLingual && (
                  <path d="M -12 14 Q 0 17 12 14" stroke={cond1?.color || '#ef4444'} strokeWidth={3} strokeLinecap="round" />
                )}
                {hasMesial && (
                  <path d="M 17 -8 Q 19 0 17 8" stroke={cond1?.color || '#ef4444'} strokeWidth={3} strokeLinecap="round" />
                )}
                {hasDistal && (
                  <path d="M -17 -8 Q -19 0 -17 8" stroke={cond1?.color || '#ef4444'} strokeWidth={3} strokeLinecap="round" />
                )}
              </>
            )}

            {/* Fisuras y fosas anatómicas */}
            {!isAbsent && (
              <>
                {/* Surco central mesiodistal */}
                <path d="M -13 0 Q 0 -1.5 13 0" fill="none" stroke="#64748b" strokeWidth={1.2} strokeLinecap="round" opacity={0.8} />
                {/* Surco vestibulolingual */}
                <path d="M 0 -11 Q -1 0 0 11" fill="none" stroke="#64748b" strokeWidth={1.2} strokeLinecap="round" opacity={0.8} />
                {/* Fosa central anatómica con profundidad */}
                <circle cx={0} cy={0} r={2.5} fill="#334155" opacity={0.8} />
                <circle cx={-0.5} cy={-0.5} r={1} fill="#0f172a" opacity={0.9} />

                {/* Fisuras marginales triangulares */}
                <path d="M -10 -4 L -13 0 L -10 4" fill="none" stroke="#94a3b8" strokeWidth={0.9} />
                <path d="M 10 -4 L 13 0 L 10 4" fill="none" stroke="#94a3b8" strokeWidth={0.9} />
              </>
            )}

            {/* Rosca de Implante si aplica */}
            {isImplant && (
              <g>
                <circle cx={0} cy={0} r={7} fill="#0284c7" opacity={0.9} />
                <text x={0} y={3} textAnchor="middle" className="fill-white font-black text-[9px] pointer-events-none">🔩</text>
              </g>
            )}
          </g>
        )}

        {/* 2. PREMOLAR: Corona ovoide con 2 cúspides y surco transversal */}
        {pos.type === 'premolar' && (
          <g className="transition-transform group-hover:scale-108 duration-150">
            <ellipse cx={0} cy={3} rx={14} ry={12} fill="rgba(0,0,0,0.25)" filter="blur(2.5px)" />
            <path
              d="M -14 -12 C -8 -16, 8 -16, 14 -12 C 18 -8, 18 8, 14 12 C 8 16, -8 16, -14 12 C -18 8, -18 -8, -14 -12 Z"
              fill={toothFill}
              stroke={isSelected ? '#0ea5e9' : toothStroke}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              className={isAbsent ? 'stroke-dashed opacity-40' : ''}
              filter="drop-shadow(0 3px 5px rgba(0,0,0,0.25))"
            />
            {!isAbsent && (
              <>
                <ellipse cx={-3} cy={-6} rx={5} ry={2.5} fill="#ffffff" opacity={0.7} transform="rotate(-15 -3 -6)" />
                {hasOclusal && (
                  <circle cx={0} cy={0} r={4.5} fill={cond1?.color || '#ef4444'} opacity={0.75} />
                )}
                {hasVestibular && (
                  <path d="M -9 -12 Q 0 -15 9 -12" stroke={cond1?.color || '#ef4444'} strokeWidth={3} strokeLinecap="round" />
                )}
                {hasLingual && (
                  <path d="M -9 12 Q 0 15 9 12" stroke={cond1?.color || '#ef4444'} strokeWidth={3} strokeLinecap="round" />
                )}
                <path d="M -10 0 Q 0 -0.8 10 0" fill="none" stroke="#64748b" strokeWidth={1.2} strokeLinecap="round" opacity={0.8} />
                <circle cx={-5} cy={0} r={1.5} fill="#334155" opacity={0.8} />
                <circle cx={5} cy={0} r={1.5} fill="#334155" opacity={0.8} />
              </>
            )}
            {isImplant && (
              <g>
                <circle cx={0} cy={0} r={6} fill="#0284c7" opacity={0.9} />
                <text x={0} y={2.5} textAnchor="middle" className="fill-white font-black text-[8px] pointer-events-none">🔩</text>
              </g>
            )}
          </g>
        )}

        {/* 3. CANINO: Silueta en punta diamantada con cresta labial */}
        {pos.type === 'canine' && (
          <g className="transition-transform group-hover:scale-108 duration-150">
            <ellipse cx={0} cy={3} rx={13} ry={13} fill="rgba(0,0,0,0.25)" filter="blur(2.5px)" />
            <path
              d="M 0 -16 C 9 -12, 15 -4, 14 6 C 11 13, -11 13, -14 6 C -15 -4, -9 -12, 0 -16 Z"
              fill={toothFill}
              stroke={isSelected ? '#0ea5e9' : toothStroke}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              className={isAbsent ? 'stroke-dashed opacity-40' : ''}
              filter="drop-shadow(0 3px 5px rgba(0,0,0,0.25))"
            />
            {!isAbsent && (
              <>
                <ellipse cx={-3} cy={-7} rx={4.5} ry={2} fill="#ffffff" opacity={0.7} transform="rotate(-20 -3 -7)" />
                {hasOclusal && (
                  <circle cx={0} cy={-2} r={4} fill={cond1?.color || '#ef4444'} opacity={0.75} />
                )}
                {hasVestibular && (
                  <path d="M -7 -12 Q 0 -15 7 -12" stroke={cond1?.color || '#ef4444'} strokeWidth={3} strokeLinecap="round" />
                )}
                <path d="M 0 -13 L 0 6" fill="none" stroke="#94a3b8" strokeWidth={1.2} strokeLinecap="round" opacity={0.85} />
              </>
            )}
            {isImplant && (
              <g>
                <circle cx={0} cy={0} r={6} fill="#0284c7" opacity={0.9} />
                <text x={0} y={2.5} textAnchor="middle" className="fill-white font-black text-[8px] pointer-events-none">🔩</text>
              </g>
            )}
          </g>
        )}

        {/* 4. INCISIVO: Corona alargada en arco con borde incisal liso */}
        {pos.type === 'incisor' && (
          <g className="transition-transform group-hover:scale-108 duration-150">
            <ellipse cx={0} cy={3} rx={13} ry={11} fill="rgba(0,0,0,0.25)" filter="blur(2px)" />
            <path
              d="M -13 -10 C -8 -14, 8 -14, 13 -10 C 16 -4, 15 6, 12 11 C 6 14, -6 14, -12 11 C -15 6, -16 -4, -13 -10 Z"
              fill={toothFill}
              stroke={isSelected ? '#0ea5e9' : toothStroke}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              className={isAbsent ? 'stroke-dashed opacity-40' : ''}
              filter="drop-shadow(0 3px 5px rgba(0,0,0,0.25))"
            />
            {!isAbsent && (
              <>
                <ellipse cx={-3} cy={-5} rx={5} ry={2} fill="#ffffff" opacity={0.75} transform="rotate(-10 -3 -5)" />
                {hasOclusal && (
                  <path d="M -7 8 Q 0 9 7 8" stroke={cond1?.color || '#ef4444'} strokeWidth={3.5} strokeLinecap="round" />
                )}
                {hasVestibular && (
                  <path d="M -8 -11 Q 0 -13 8 -11" stroke={cond1?.color || '#ef4444'} strokeWidth={3} strokeLinecap="round" />
                )}
                <path d="M -9 8 Q 0 9.5 9 8" fill="none" stroke="#94a3b8" strokeWidth={1.2} strokeLinecap="round" opacity={0.85} />
              </>
            )}
            {isImplant && (
              <g>
                <circle cx={0} cy={0} r={6} fill="#0284c7" opacity={0.9} />
                <text x={0} y={2.5} textAnchor="middle" className="fill-white font-black text-[8px] pointer-events-none">🔩</text>
              </g>
            )}
          </g>
        )}

        {/* SÍMBOLOS CLÍNICOS DE TRATAMIENTO SOBRE EL DIENTE */}
        {isAbsent ? (
          // Diente ausente: marca de extracción clínica en cruz
          <g>
            <circle cx={0} cy={0} r={10} fill="rgba(15, 23, 42, 0.85)" stroke="#e2e8f0" strokeWidth={1} />
            <line x1={-6} y1={-6} x2={6} y2={6} stroke="#f87171" strokeWidth={2.5} strokeLinecap="round" />
            <line x1={6} y1={-6} x2={-6} y2={6} stroke="#f87171" strokeWidth={2.5} strokeLinecap="round" />
          </g>
        ) : hasMultiple && cond1 && cond2 ? (
          // Múltiples tratamientos: badge numérico holográfico
          <g>
            <circle cx={0} cy={0} r={8} fill="#0f172a" stroke="#38bdf8" strokeWidth={1.5} filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))" />
            <text x={0} y={3} textAnchor="middle" className="fill-cyan-300 font-black text-[9px] select-none pointer-events-none">
              {conditions.length}
            </text>
          </g>
        ) : cond1 && !isCrown && !isImplant ? (
          // Tratamiento único con símbolo y color FDI
          <g>
            <circle cx={0} cy={0} r={7.5} fill={cond1.color} filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))" />
            <circle cx={0} cy={0} r={7.5} fill="none" stroke="#ffffff" strokeWidth={1} opacity={0.6} />
            <text x={0} y={3} textAnchor="middle" className="fill-white font-black text-[8.5px] select-none pointer-events-none">
              {cond1.symbol}
            </text>
          </g>
        ) : null}

        {/* ETIQUETA NUMÉRICA FDI HORIZONTAL */}
        <g transform={`rotate(${-pos.angle})`}>
          <rect
            x={-12}
            y={pos.y > 340 ? 17 : -30}
            width={24}
            height={15}
            rx={5}
            className={`transition-colors ${
              isSelected
                ? 'fill-teal-500'
                : isHovered
                ? 'fill-slate-800'
                : 'fill-slate-900/90'
            }`}
            stroke={isSelected ? '#14b8a6' : 'rgba(255,255,255,0.2)'}
            strokeWidth={1}
          />
          <text
            x={0}
            y={pos.y > 340 ? 28 : -19}
            textAnchor="middle"
            className={`font-mono font-bold select-none text-[9.5px] ${
              isSelected ? 'fill-white font-black' : pos.isChild ? 'fill-amber-300 font-black' : 'fill-slate-200'
            }`}
          >
            {pos.number}
          </text>
        </g>

        {/* BOTÓN RÁPIDO DE ERUPCIÓN / MUDAR DIENTE DE LECHE EN MODO MIXTO */}
        {mode === 'mixed' && pos.isChild && onExfoliateAndErupt && (
          <g
            className="cursor-pointer"
            transform={`rotate(${-pos.angle}) translate(0, -38)`}
            onClick={(e) => {
              e.stopPropagation();
              const adultNum = CHILD_TO_ADULT_MAP[pos.number];
              if (adultNum) onExfoliateAndErupt(pos.number, adultNum);
            }}
          >
            <title>{`Mudar a pieza definitiva (${CHILD_TO_ADULT_MAP[pos.number]})`}</title>
            <circle cx={0} cy={0} r={9} className="fill-amber-500 hover:fill-amber-600 shadow-md" />
            <text x={0} y={3.5} textAnchor="middle" className="fill-white font-black text-[10px] pointer-events-none">
              ⬆
            </text>
          </g>
        )}
      </g>
    );
  };

  const showAdult = mode === 'adult' || mode === 'mixed';
  const showChild = mode === 'child' || mode === 'mixed';

  // Mostrar filas según el enfoque activo
  const showUpper = archFocus === 'both' || archFocus === 'upper';
  const showLower = archFocus === 'both' || archFocus === 'lower';

  return (
    <div className="w-full bg-linear-to-b from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-2xl">
      {/* Barra de Controles y Selector de Arco (Responsive para Móviles y Escritorio) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-4 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <span>Odontograma Bucal Anatómico</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold uppercase tracking-wider">
                FDI
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Toca o haz clic en cualquier diente para inspeccionar, diagnosticar o registrar tratamientos
            </p>
          </div>
        </div>

        {/* Acciones de Vista: Selector de Arco Móvil & Galería 3D */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          {/* Selector de Arco / Zoom para Móvil */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => setArchFocus('upper')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                archFocus === 'upper'
                  ? 'bg-linear-to-r from-teal-500 to-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🦷 Superior
            </button>
            <button
              type="button"
              onClick={() => setArchFocus('lower')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                archFocus === 'lower'
                  ? 'bg-linear-to-r from-teal-500 to-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🦷 Inferior
            </button>
            <button
              type="button"
              onClick={() => setArchFocus('both')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                archFocus === 'both'
                  ? 'bg-linear-to-r from-teal-500 to-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              👄 Ambas
            </button>
          </div>

          {/* Botón de Referencia 3D Real */}
          <button
            type="button"
            onClick={() => setShow3DReferenceModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-750 text-teal-400 border border-teal-500/30 transition-all btn-haptic shadow-xs"
            title="Abrir galería de modelos 3D fotorrealistas de referencia anatómica"
          >
            <Eye size={13} />
            <span className="hidden sm:inline">Referencia</span> 3D
          </button>
        </div>
      </div>

      {/* Indicadores de Cuadrante Superior */}
      {showUpper && (
        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 sm:px-8 mb-2">
          <span>◀ Cuadrante 1 (Sup. Der.)</span>
          <span className="text-teal-400 font-black flex items-center gap-1.5 bg-teal-500/10 px-3 py-0.5 rounded-full border border-teal-500/30">
            🦷 Maxilar Superior
          </span>
          <span>Cuadrante 2 (Sup. Izq.) ▶</span>
        </div>
      )}

      {/* Lienzo SVG Anatómico 100% Responsive */}
      <div className="w-full flex justify-center py-2 relative">
        <svg
          viewBox={currentViewBox}
          className="w-full max-w-2xl h-auto select-none drop-shadow-2xl transition-all duration-300"
        >
          <defs>
            {/* Filtro de resplandor para selección quirúrgica */}
            <filter id="glow-filter" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Gradiente de Esmalte Cerámico 3D con Brillo de Estudio */}
            <radialGradient id="porcelain-3d-enamel" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#fafafa" />
              <stop offset="70%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </radialGradient>

            {/* Gradiente Corona Zirconia / Oro */}
            <radialGradient id="zirconia-gold-crown-grad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="85%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </radialGradient>

            {/* Gradiente Titanio para Implantes Biomecánicos */}
            <radialGradient id="titanium-implant-grad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="40%" stopColor="#0284c7" />
              <stop offset="85%" stopColor="#0369a1" />
              <stop offset="100%" stopColor="#0c4a6e" />
            </radialGradient>

            {/* Gradiente Anatómico de Encía Superior con Festoneado Gingival */}
            <linearGradient id="upper-gingiva-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fb7185" stopOpacity="0.55" />
              <stop offset="40%" stopColor="#e11d48" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#9f1239" stopOpacity="0.6" />
            </linearGradient>

            {/* Gradiente Anatómico de Encía Inferior */}
            <linearGradient id="lower-gingiva-grad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#fb7185" stopOpacity="0.55" />
              <stop offset="40%" stopColor="#e11d48" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#9f1239" stopOpacity="0.6" />
            </linearGradient>

            {/* Paladar Superior con Sombra Cóncava */}
            <radialGradient id="palate-gradient" cx="50%" cy="30%" r="55%">
              <stop offset="0%" stopColor="#fda4af" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#f43f5e" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#881337" stopOpacity="0.05" />
            </radialGradient>

            {/* Lengua en Arcada Inferior */}
            <radialGradient id="tongue-gradient" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fb7185" stopOpacity="0.45" />
              <stop offset="65%" stopColor="#e11d48" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#881337" stopOpacity="0.8" />
            </radialGradient>

            {/* Patrón de Alvéolo / Diente Ausente */}
            <pattern id="absent-socket-pattern" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#475569" strokeWidth="2" opacity="0.5" />
            </pattern>
          </defs>

          {/* PALADAR SUPERIOR */}
          {showUpper && (
            <g>
              <path
                d="M 170 170 C 230 40, 550 40, 610 170 C 530 250, 250 250, 170 170 Z"
                fill="url(#palate-gradient)"
              />
              <path d="M 330 90 Q 390 100 450 90" fill="none" stroke="#fb7185" strokeWidth="1.5" opacity="0.25" />
              <path d="M 340 120 Q 390 132 440 120" fill="none" stroke="#fb7185" strokeWidth="1.5" opacity="0.2" />
              <path d="M 350 150 Q 390 160 430 150" fill="none" stroke="#fb7185" strokeWidth="1.5" opacity="0.15" />
            </g>
          )}

          {/* LENGUA MANDIBULAR */}
          {showLower && (
            <g>
              <path
                d="M 230 500 C 240 400, 540 400, 550 500 C 530 570, 250 570, 230 500 Z"
                fill="url(#tongue-gradient)"
                filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))"
              />
              <line x1="390" y1="435" x2="390" y2="525" stroke="#9f1239" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
            </g>
          )}

          {/* HERRADURAS GINGIVALES FESTONEADAS */}
          {showUpper && (
            <path
              d="M 60 285 C 80 40, 700 40, 720 285"
              fill="none"
              stroke="url(#upper-gingiva-grad)"
              strokeWidth="50"
              strokeLinecap="round"
              filter="drop-shadow(0 4px 8px rgba(0,0,0,0.4))"
            />
          )}

          {showLower && (
            <path
              d="M 70 385 C 90 635, 690 635, 710 385"
              fill="none"
              stroke="url(#lower-gingiva-grad)"
              strokeWidth="50"
              strokeLinecap="round"
              filter="drop-shadow(0 4px 8px rgba(0,0,0,0.4))"
            />
          )}

          {/* LÍNEA MEDIA FACIAL */}
          <line
            x1="390"
            y1={archFocus === 'lower' ? 370 : 25}
            x2="390"
            y2={archFocus === 'upper' ? 300 : 645}
            stroke="#14b8a6"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.45"
          />
          {archFocus === 'both' && (
            <text
              x="390"
              y="340"
              textAnchor="middle"
              className="fill-teal-400 text-[10px] font-black tracking-widest uppercase select-none"
            >
              Línea Media Facial
            </text>
          )}

          {/* DIENTES SUPERIORES (ADULTOS & NIÑO) */}
          {showUpper && showAdult && UPPER_ADULT_POSITIONS.map(renderTooth)}
          {showUpper && showChild && UPPER_CHILD_POSITIONS.map(renderTooth)}

          {/* DIENTES INFERIORES (NIÑO & ADULTOS) */}
          {showLower && showChild && LOWER_CHILD_POSITIONS.map(renderTooth)}
          {showLower && showAdult && LOWER_ADULT_POSITIONS.map(renderTooth)}
        </svg>
      </div>

      {/* Indicadores de Cuadrante Inferior */}
      {showLower && (
        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 sm:px-8 mt-2">
          <span>◀ Cuadrante 4 (Inf. Der.)</span>
          <span className="text-teal-400 font-black flex items-center gap-1.5 bg-teal-500/10 px-3 py-0.5 rounded-full border border-teal-500/30">
            🦷 Mandíbula Inferior
          </span>
          <span>Cuadrante 3 (Inf. Izq.) ▶</span>
        </div>
      )}

      {/* Banner flotante de información de pieza al tocar o pasar el ratón */}
      {hoveredTooth && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-teal-500/40 backdrop-blur-md px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in fade-in duration-150 z-20 max-w-[90%] flex-wrap justify-center">
          <span className="text-xs font-mono font-black text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-lg border border-teal-500/20">
            #{hoveredTooth}
          </span>
          <span className="text-xs font-bold text-white truncate">
            {TOOTH_NAMES[hoveredTooth] || `Pieza ${hoveredTooth}`}
          </span>
          {teeth[hoveredTooth]?.conditions && teeth[hoveredTooth].conditions.length > 0 && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700 flex-wrap">
              {teeth[hoveredTooth].conditions.map((c, i) => (
                <span
                  key={i}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                  style={{
                    backgroundColor: (CONDITIONS[c.code]?.color || '#0ea5e9') + '25',
                    color: CONDITIONS[c.code]?.color || '#38bdf8',
                  }}
                >
                  {c.label || CONDITIONS[c.code]?.label || c.code}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE REFERENCIA ANATÓMICA 3D REAL (LIGHTBOX MÉDICO) */}
      {show3DReferenceModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 max-w-3xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Sparkles size={20} className="text-teal-400" />
                <h3 className="text-base font-black text-white">
                  Referencia Médica 3D de Alta Resolución
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShow3DReferenceModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Pestañas de Vista 3D */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveReferenceTab('occlusal')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  activeReferenceTab === 'occlusal'
                    ? 'bg-teal-500 text-white border-teal-400'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                👄 Vista Oclusal Dual
              </button>
              <button
                type="button"
                onClick={() => setActiveReferenceTab('horseshoe')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  activeReferenceTab === 'horseshoe'
                    ? 'bg-teal-500 text-white border-teal-400'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                🦷 Arcada Cenital
              </button>
              <button
                type="button"
                onClick={() => setActiveReferenceTab('specimens')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  activeReferenceTab === 'specimens'
                    ? 'bg-teal-500 text-white border-teal-400'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                🔬 Especímenes 3D
              </button>
            </div>

            {/* Contenido Visual en Alta Resolución */}
            <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/50 p-3 flex items-center justify-center min-h-[300px]">
              {activeReferenceTab === 'occlusal' && (
                <div className="space-y-2 text-center">
                  <img
                    src="/dental/arch_occlusal.jpg"
                    alt="Visión Oclusal 3D"
                    className="max-h-[60vh] w-auto mx-auto rounded-xl shadow-2xl object-contain"
                  />
                  <p className="text-xs text-slate-400">
                    Visión clínica oclusal de maxilar superior y mandíbula inferior con iluminación de estudio
                  </p>
                </div>
              )}

              {activeReferenceTab === 'horseshoe' && (
                <div className="space-y-2 text-center">
                  <img
                    src="/dental/arch_horseshoe.jpg"
                    alt="Arcada Cenital 3D"
                    className="max-h-[60vh] w-auto mx-auto rounded-xl shadow-2xl object-contain"
                  />
                  <p className="text-xs text-slate-400">
                    Arcada anatómica en herradura con relieve de cúspides y textura gingival realista
                  </p>
                </div>
              )}

              {activeReferenceTab === 'specimens' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center space-y-2">
                    <img src="/dental/molar_3d.jpg" alt="Molar 3D" className="w-full h-36 object-cover rounded-lg" />
                    <p className="text-xs font-bold text-white">Molar Posterior</p>
                    <p className="text-[10px] text-slate-400">Cúspides oclusales y raíz con furca</p>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center space-y-2">
                    <img src="/dental/incisor_3d.jpg" alt="Incisivo 3D" className="w-full h-36 object-cover rounded-lg" />
                    <p className="text-xs font-bold text-white">Incisivo Anterior</p>
                    <p className="text-[10px] text-slate-400">Corona translúcida y raíz cónica</p>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center space-y-2">
                    <img src="/dental/implant_3d.jpg" alt="Implante 3D" className="w-full h-36 object-cover rounded-lg" />
                    <p className="text-xs font-bold text-white">Implante Titanio</p>
                    <p className="text-[10px] text-slate-400">Fijación en hueso y corona zirconia</p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setShow3DReferenceModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Cerrar Referencia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
