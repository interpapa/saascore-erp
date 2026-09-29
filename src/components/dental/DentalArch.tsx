'use client';

import React, { useState } from 'react';
import { ToothData } from '@/app/actions/dental';
import { CONDITIONS } from './Odontogram';
import { Sparkles, Eye, Layers, ZoomIn } from 'lucide-react';

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

// Posiciones de los dientes en arco anatómico (Herradura clínica)
const UPPER_ADULT_POSITIONS: ToothPosition[] = [
  // Cuadrante 1 (Superior Derecho del paciente - izquierda visual)
  { number: '18', x: 80,  y: 270, angle: -16, type: 'molar' },
  { number: '17', x: 108, y: 220, angle: -22, type: 'molar' },
  { number: '16', x: 142, y: 172, angle: -28, type: 'molar' },
  { number: '15', x: 182, y: 130, angle: -36, type: 'premolar' },
  { number: '14', x: 228, y: 96,  angle: -45, type: 'premolar' },
  { number: '13', x: 278, y: 72,  angle: -58, type: 'canine' },
  { number: '12', x: 326, y: 58,  angle: -72, type: 'incisor' },
  { number: '11', x: 370, y: 52,  angle: -85, type: 'incisor' },

  // Cuadrante 2 (Superior Izquierdo del paciente - derecha visual)
  { number: '21', x: 410, y: 52,  angle: 85,  type: 'incisor' },
  { number: '22', x: 454, y: 58,  angle: 72,  type: 'incisor' },
  { number: '23', x: 502, y: 72,  angle: 58,  type: 'canine' },
  { number: '24', x: 552, y: 96,  angle: 45,  type: 'premolar' },
  { number: '25', x: 598, y: 130, angle: 36,  type: 'premolar' },
  { number: '26', x: 638, y: 172, angle: 28,  type: 'molar' },
  { number: '27', x: 672, y: 220, angle: 22,  type: 'molar' },
  { number: '28', x: 700, y: 270, angle: 16,  type: 'molar' },
];

const LOWER_ADULT_POSITIONS: ToothPosition[] = [
  // Cuadrante 4 (Inferior Derecho del paciente - izquierda visual)
  { number: '48', x: 90,  y: 400, angle: 16,  type: 'molar' },
  { number: '47', x: 118, y: 450, angle: 22,  type: 'molar' },
  { number: '46', x: 152, y: 498, angle: 28,  type: 'molar' },
  { number: '45', x: 192, y: 540, angle: 36,  type: 'premolar' },
  { number: '44', x: 238, y: 574, angle: 45,  type: 'premolar' },
  { number: '43', x: 288, y: 598, angle: 58,  type: 'canine' },
  { number: '42', x: 334, y: 612, angle: 72,  type: 'incisor' },
  { number: '41', x: 372, y: 618, angle: 85,  type: 'incisor' },

  // Cuadrante 3 (Inferior Izquierdo del paciente - derecha visual)
  { number: '31', x: 408, y: 618, angle: -85, type: 'incisor' },
  { number: '32', x: 446, y: 612, angle: -72, type: 'incisor' },
  { number: '33', x: 492, y: 598, angle: -58, type: 'canine' },
  { number: '34', x: 542, y: 574, angle: -45, type: 'premolar' },
  { number: '35', x: 588, y: 540, angle: -36, type: 'premolar' },
  { number: '36', x: 628, y: 498, angle: -28, type: 'molar' },
  { number: '37', x: 662, y: 450, angle: -22, type: 'molar' },
  { number: '38', x: 690, y: 400, angle: -16, type: 'molar' },
];

// Posiciones para dentición infantil / temporal (arco más cerrado)
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
  // Selector de estilo de visualización: Escáner 3D Fotorrealista vs Esquema Porcelana CAD
  const [visualStyle, setVisualStyle] = useState<'3d_scanner' | 'cad_porcelain'>('3d_scanner');
  const [hoveredTooth, setHoveredTooth] = useState<string | null>(null);

  // Render anatómico de cada diente con silueta real y detalles oclusales
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

    // Dimensiones proporcionales y escala
    const scale = pos.isChild ? 0.78 : 1;
    const toothName = TOOTH_NAMES[pos.number] || `Pieza ${pos.number}`;

    // Estilos de color para la superficie dental según material o patología
    let toothFill = 'url(#porcelain-ceramic-gradient)';
    let toothStroke = '#cbd5e1';
    let strokeWidth = isSelected ? 3 : 1.4;

    if (isAbsent) {
      toothFill = 'url(#absent-translucent-pattern)';
      toothStroke = '#94a3b8';
    } else if (isCrown) {
      toothFill = 'url(#gold-crown-gradient)';
      toothStroke = '#f59e0b';
    } else if (isImplant) {
      toothFill = 'url(#titanium-implant-gradient)';
      toothStroke = '#06b6d4';
    } else if (hasMultiple && cond1 && cond2) {
      toothStroke = cond1.color;
      toothFill = 'url(#porcelain-ceramic-gradient)';
    } else if (cond1) {
      toothStroke = cond1.color;
      toothFill = cond1.color + '2c'; // Tinte translúcido sobre el esmalte
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

        {/* Halo de selección clínica / Holographic Glow */}
        {isSelected && (
          <g>
            <ellipse
              cx={0}
              cy={0}
              rx={pos.type === 'molar' ? 26 : pos.type === 'premolar' ? 22 : 20}
              ry={pos.type === 'molar' ? 24 : pos.type === 'premolar' ? 20 : 18}
              className="fill-teal-400/20 stroke-teal-400 animate-pulse"
              strokeWidth={3}
              filter="url(#glow-filter)"
            />
            {/* Anillo de enfoque quirúrgico */}
            <circle cx={0} cy={0} r={2} fill="#14b8a6" />
          </g>
        )}

        {/* Halo al hacer hover si no está seleccionado */}
        {!isSelected && isHovered && (
          <ellipse
            cx={0}
            cy={0}
            rx={pos.type === 'molar' ? 24 : pos.type === 'premolar' ? 20 : 18}
            ry={pos.type === 'molar' ? 22 : pos.type === 'premolar' ? 18 : 16}
            className="fill-cyan-400/15 stroke-cyan-400/80"
            strokeWidth={2}
          />
        )}

        {/* SILUETA ANATÓMICA ESCULPIDA SEGÚN TIPO DE DIENTE */}

        {/* 1. MOLAR: Corona con 4 cúspides redondeadas, relieve oclusal y brillo cerámico */}
        {pos.type === 'molar' && (
          <g className="transition-transform group-hover:scale-108 duration-150">
            {/* Sombra proyectada */}
            <ellipse cx={0} cy={2} rx={18} ry={14} fill="rgba(0,0,0,0.18)" filter="blur(3px)" />

            {/* Contorno corona molar cerámico */}
            <path
              d="M -18 -14 C -12 -18, 12 -18, 18 -14 C 22 -10, 22 10, 18 14 C 12 18, -12 18, -18 14 C -22 10, -22 -10, -18 -14 Z"
              fill={toothFill}
              stroke={isSelected ? '#0ea5e9' : toothStroke}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              className={isAbsent ? 'stroke-dashed opacity-50' : ''}
              filter="drop-shadow(0 3px 5px rgba(0,0,0,0.25))"
            />

            {/* Reflejo especular de esmalte cerámico pulido */}
            {!isAbsent && (
              <ellipse cx={-4} cy={-7} rx={7} ry={3.5} fill="#ffffff" opacity={0.65} transform="rotate(-15 -4 -7)" />
            )}

            {/* Surcos y fosas oclusales anatómicas */}
            {!isAbsent && (
              <>
                {/* Surco central mesiodistal */}
                <path
                  d="M -13 0 Q 0 -1.5 13 0"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.9"
                />
                {/* Surco vestibulolingual */}
                <path
                  d="M 0 -11 Q -1 0 0 11"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.9"
                />
                {/* Fosa central anatómica con sombra */}
                <circle cx={0} cy={0} r={2.5} fill="#475569" opacity="0.75" />
                <circle cx={-0.5} cy={-0.5} r={1} fill="#1e293b" opacity="0.9" />

                {/* Micro fisuras marginales */}
                <path d="M -10 -4 L -13 0 L -10 4" fill="none" stroke="#cbd5e1" strokeWidth="0.9" />
                <path d="M 10 -4 L 13 0 L 10 4" fill="none" stroke="#cbd5e1" strokeWidth="0.9" />
              </>
            )}

            {/* Rosca de Implante Biomecánico si aplica */}
            {isImplant && (
              <g>
                <circle cx={0} cy={0} r={7} fill="#0284c7" opacity={0.8} />
                <text x={0} y={3} textAnchor="middle" className="fill-white font-black text-[9px] pointer-events-none">🔩</text>
              </g>
            )}
          </g>
        )}

        {/* 2. PREMOLAR: Corona ovoide con 2 cúspides y surco transversal */}
        {pos.type === 'premolar' && (
          <g className="transition-transform group-hover:scale-108 duration-150">
            <ellipse cx={0} cy={2} rx={14} ry={12} fill="rgba(0,0,0,0.18)" filter="blur(2.5px)" />
            <path
              d="M -14 -12 C -8 -16, 8 -16, 14 -12 C 18 -8, 18 8, 14 12 C 8 16, -8 16, -14 12 C -18 8, -18 -8, -14 -12 Z"
              fill={toothFill}
              stroke={isSelected ? '#0ea5e9' : toothStroke}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              className={isAbsent ? 'stroke-dashed opacity-50' : ''}
              filter="drop-shadow(0 3px 5px rgba(0,0,0,0.22))"
            />
            {!isAbsent && (
              <>
                {/* Reflejo especular */}
                <ellipse cx={-3} cy={-6} rx={5} ry={2.5} fill="#ffffff" opacity={0.65} transform="rotate(-15 -3 -6)" />
                <path
                  d="M -10 0 Q 0 -0.8 10 0"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.9"
                />
                <circle cx={-5} cy={0} r={1.5} fill="#475569" opacity="0.8" />
                <circle cx={5} cy={0} r={1.5} fill="#475569" opacity="0.8" />
              </>
            )}
            {isImplant && (
              <g>
                <circle cx={0} cy={0} r={6} fill="#0284c7" opacity={0.8} />
                <text x={0} y={2.5} textAnchor="middle" className="fill-white font-black text-[8px] pointer-events-none">🔩</text>
              </g>
            )}
          </g>
        )}

        {/* 3. CANINO: Silueta en punta diamantada con cresta labial y vertientes */}
        {pos.type === 'canine' && (
          <g className="transition-transform group-hover:scale-108 duration-150">
            <ellipse cx={0} cy={2} rx={13} ry={13} fill="rgba(0,0,0,0.18)" filter="blur(2.5px)" />
            <path
              d="M 0 -16 C 9 -12, 15 -4, 14 6 C 11 13, -11 13, -14 6 C -15 -4, -9 -12, 0 -16 Z"
              fill={toothFill}
              stroke={isSelected ? '#0ea5e9' : toothStroke}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              className={isAbsent ? 'stroke-dashed opacity-50' : ''}
              filter="drop-shadow(0 3px 5px rgba(0,0,0,0.22))"
            />
            {!isAbsent && (
              <>
                <ellipse cx={-3} cy={-7} rx={4.5} ry={2} fill="#ffffff" opacity={0.65} transform="rotate(-20 -3 -7)" />
                <path
                  d="M 0 -13 L 0 6"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.85"
                />
              </>
            )}
            {isImplant && (
              <g>
                <circle cx={0} cy={0} r={6} fill="#0284c7" opacity={0.8} />
                <text x={0} y={2.5} textAnchor="middle" className="fill-white font-black text-[8px] pointer-events-none">🔩</text>
              </g>
            )}
          </g>
        )}

        {/* 4. INCISIVO: Corona alargada en arco con borde incisal liso y brillo de porcelana */}
        {pos.type === 'incisor' && (
          <g className="transition-transform group-hover:scale-108 duration-150">
            <ellipse cx={0} cy={2} rx={13} ry={11} fill="rgba(0,0,0,0.18)" filter="blur(2px)" />
            <path
              d="M -13 -10 C -8 -14, 8 -14, 13 -10 C 16 -4, 15 6, 12 11 C 6 14, -6 14, -12 11 C -15 6, -16 -4, -13 -10 Z"
              fill={toothFill}
              stroke={isSelected ? '#0ea5e9' : toothStroke}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              className={isAbsent ? 'stroke-dashed opacity-50' : ''}
              filter="drop-shadow(0 3px 5px rgba(0,0,0,0.22))"
            />
            {!isAbsent && (
              <>
                <ellipse cx={-3} cy={-5} rx={5} ry={2} fill="#ffffff" opacity={0.7} transform="rotate(-10 -3 -5)" />
                <path
                  d="M -9 8 Q 0 9.5 9 8"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.85"
                />
              </>
            )}
            {isImplant && (
              <g>
                <circle cx={0} cy={0} r={6} fill="#0284c7" opacity={0.8} />
                <text x={0} y={2.5} textAnchor="middle" className="fill-white font-black text-[8px] pointer-events-none">🔩</text>
              </g>
            )}
          </g>
        )}

        {/* RENDERIZADO VISUAL DE TRATAMIENTO(S) */}
        {isAbsent ? (
          // Símbolo de pieza ausente de alto contraste
          <g>
            <circle cx={0} cy={0} r={10} fill="rgba(15, 23, 42, 0.75)" stroke="#e2e8f0" strokeWidth={1} />
            <line x1={-6} y1={-6} x2={6} y2={6} stroke="#f87171" strokeWidth={2.5} strokeLinecap="round" />
            <line x1={6} y1={-6} x2={-6} y2={6} stroke="#f87171" strokeWidth={2.5} strokeLinecap="round" />
          </g>
        ) : hasMultiple && cond1 && cond2 ? (
          // Múltiples condiciones: indicador visual dual con badge holográfico
          <g>
            <circle cx={0} cy={0} r={8} fill="#0f172a" stroke="#38bdf8" strokeWidth={1.5} filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))" />
            <text
              x={0}
              y={3}
              textAnchor="middle"
              className="fill-cyan-300 font-black text-[9px] select-none pointer-events-none"
            >
              {conditions.length}
            </text>
          </g>
        ) : cond1 && !isCrown && !isImplant ? (
          // Tratamiento único con su color y símbolo clínico en relieve
          <g>
            <circle cx={0} cy={0} r={7.5} fill={cond1.color} filter="drop-shadow(0 2px 4px rgba(0,0,0,0.35))" />
            <circle cx={0} cy={0} r={7.5} fill="none" stroke="#ffffff" strokeWidth={1} opacity={0.6} />
            <text
              x={0}
              y={3}
              textAnchor="middle"
              className="fill-white font-black text-[8.5px] select-none pointer-events-none"
            >
              {cond1.symbol}
            </text>
          </g>
        ) : null}

        {/* ETIQUETA NUMÉRICA FDI DESROTADA (SIEMPRE HORIZONTAL) */}
        <g transform={`rotate(${-pos.angle})`}>
          {/* Pill de fondo para máxima legibilidad sobre cualquier superficie */}
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
                : 'fill-slate-900/80 dark:fill-slate-900/90'
            }`}
            stroke={isSelected ? '#14b8a6' : 'rgba(255,255,255,0.15)'}
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

        {/* BOTÓN RÁPIDO DE ERUPCIÓN INFANTIL (SI ES DIENTE DE LECHE EN MODO MIXTO) */}
        {mode === 'mixed' && pos.isChild && onExfoliateAndErupt && (
          <g
            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            transform={`rotate(${-pos.angle}) translate(0, -36)`}
            onClick={(e) => {
              e.stopPropagation();
              const adultNum = CHILD_TO_ADULT_MAP[pos.number];
              if (adultNum) onExfoliateAndErupt(pos.number, adultNum);
            }}
          >
            <title>{`Mudar y Erupcionar a pieza permanente (${CHILD_TO_ADULT_MAP[pos.number]})`}</title>
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

  return (
    <div className="w-full bg-linear-to-b from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
      {/* Barra de Herramientas de la Arcada */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-4 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <span>Visor Anatómico Bucal</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold uppercase tracking-wider">
                FDI 3D
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Arcada anatómica interactiva con texturas de esmalte cerámico y mapeo oclusal
            </p>
          </div>
        </div>

        {/* Selector de Estilo de Vista */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
          <button
            type="button"
            onClick={() => setVisualStyle('3d_scanner')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              visualStyle === '3d_scanner'
                ? 'bg-linear-to-r from-teal-500 to-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye size={13} />
            <span>Escáner 3D Realista</span>
          </button>
          <button
            type="button"
            onClick={() => setVisualStyle('cad_porcelain')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              visualStyle === 'cad_porcelain'
                ? 'bg-linear-to-r from-teal-500 to-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers size={13} />
            <span>Esquema Porcelana CAD</span>
          </button>
        </div>
      </div>

      {/* Guías clínicas de orientación anatómica superior */}
      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest px-8 mb-2">
        <span className="flex items-center gap-1">◀ Cuadrante 1 (Sup. Der.)</span>
        <span className="text-teal-400 font-black flex items-center gap-1.5 bg-teal-500/10 px-3.5 py-1 rounded-full border border-teal-500/30 shadow-xs">
          🦷 Arcada Superior (Maxilar)
        </span>
        <span className="flex items-center gap-1">Cuadrante 2 (Sup. Izq.) ▶</span>
      </div>

      {/* Lienzo Anatómico con Modo Fotorrealista o Porcelana */}
      <div className="min-w-[780px] flex justify-center py-2 relative">
        <svg
          viewBox="0 0 780 670"
          className="w-full max-w-3xl h-auto select-none drop-shadow-2xl"
        >
          <defs>
            {/* Filtro de resplandor para selección quirúrgica */}
            <filter id="glow-filter" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Gradiente de Esmalte Dental de Porcelana Multicapa con Brillo de Estudio */}
            <radialGradient id="porcelain-ceramic-gradient" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#fdfdfc" />
              <stop offset="70%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </radialGradient>

            {/* Gradiente Metálico de Corona de Oro / Zirconia */}
            <radialGradient id="gold-crown-gradient" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="85%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </radialGradient>

            {/* Gradiente Titanio para Implantes Biomecánicos */}
            <radialGradient id="titanium-implant-gradient" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="40%" stopColor="#0284c7" />
              <stop offset="85%" stopColor="#0369a1" />
              <stop offset="100%" stopColor="#0c4a6e" />
            </radialGradient>

            {/* Gradiente Realista de Encía Superior con Profundidad Volumétrica */}
            <linearGradient id="upper-gum-grad-3d" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fb7185" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#e11d48" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#9f1239" stopOpacity="0.5" />
            </linearGradient>

            {/* Gradiente Realista de Encía Inferior */}
            <linearGradient id="lower-gum-grad-3d" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#fb7185" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#e11d48" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#9f1239" stopOpacity="0.5" />
            </linearGradient>

            {/* Paladar Superior con Sombra Cóncava */}
            <radialGradient id="palate-gradient-3d" cx="50%" cy="30%" r="55%">
              <stop offset="0%" stopColor="#fda4af" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#f43f5e" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#881337" stopOpacity="0.05" />
            </radialGradient>

            {/* Anatomía de la Lengua en Arcada Inferior */}
            <radialGradient id="tongue-gradient-3d" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fb7185" stopOpacity="0.45" />
              <stop offset="65%" stopColor="#e11d48" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#881337" stopOpacity="0.8" />
            </radialGradient>

            {/* Patrón rayado translúcido para Dientes Ausentes */}
            <pattern id="absent-translucent-pattern" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#475569" strokeWidth="2" opacity="0.6" />
            </pattern>
          </defs>

          {/* CAPA DE FONDO 3D FOTORREALISTA (SI ESTÁ ACTIVO EL ESCÁNER 3D) */}
          {visualStyle === '3d_scanner' ? (
            <g>
              {/* Imagen 3D Oclusal Fotorrealista de Alta Resolución con mezcla clínica */}
              <image
                href="/dental/arch_horseshoe.jpg"
                x="60"
                y="15"
                width="660"
                height="640"
                preserveAspectRatio="xMidYMid meet"
                className="opacity-40 mix-blend-screen rounded-3xl"
              />
              {/* Viñeta oscura periférica para destacar los dientes */}
              <radialGradient id="scanner-vignette" cx="50%" cy="50%" r="50%">
                <stop offset="60%" stopColor="#020617" stopOpacity="0" />
                <stop offset="100%" stopColor="#020617" stopOpacity="0.85" />
              </radialGradient>
              <rect x="0" y="0" width="780" height="670" fill="url(#scanner-vignette)" pointerEvents="none" />
            </g>
          ) : (
            /* CAPA DE PALADAR Y LENGUA EN MODO CAD */
            <g>
              {/* Paladar Superior */}
              <path
                d="M 170 170 C 230 40, 550 40, 610 170 C 530 250, 250 250, 170 170 Z"
                fill="url(#palate-gradient-3d)"
              />
              {/* Rugosidades palatinas anatómicas */}
              <path d="M 330 90 Q 390 100 450 90" fill="none" stroke="#fb7185" strokeWidth="1.5" opacity="0.25" />
              <path d="M 340 120 Q 390 132 440 120" fill="none" stroke="#fb7185" strokeWidth="1.5" opacity="0.2" />
              <path d="M 350 150 Q 390 160 430 150" fill="none" stroke="#fb7185" strokeWidth="1.5" opacity="0.15" />

              {/* Lengua en Arcada Inferior */}
              <path
                d="M 230 500 C 240 400, 540 400, 550 500 C 530 570, 250 570, 230 500 Z"
                fill="url(#tongue-gradient-3d)"
                filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))"
              />
              <line x1="390" y1="435" x2="390" y2="525" stroke="#9f1239" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
            </g>
          )}

          {/* ARCOS GINGIVALES ANATÓMICOS (HERRADURAS MAXILAR Y MANDIBULAR) */}
          <path
            d="M 60 285 C 80 40, 700 40, 720 285"
            fill="none"
            stroke="url(#upper-gum-grad-3d)"
            strokeWidth="50"
            strokeLinecap="round"
            filter="drop-shadow(0 4px 8px rgba(0,0,0,0.4))"
          />

          <path
            d="M 70 385 C 90 635, 690 635, 710 385"
            fill="none"
            stroke="url(#lower-gum-grad-3d)"
            strokeWidth="50"
            strokeLinecap="round"
            filter="drop-shadow(0 4px 8px rgba(0,0,0,0.4))"
          />

          {/* LÍNEA MEDIA FACIAL / INTERINCISIVA QUIRÚRGICA */}
          <line
            x1="390"
            y1="25"
            x2="390"
            y2="645"
            stroke="#14b8a6"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.45"
          />
          <text
            x="390"
            y="340"
            textAnchor="middle"
            className="fill-teal-400 text-[10px] font-black tracking-widest uppercase select-none"
          >
            Línea Media Facial
          </text>

          {/* PIEZAS DENTALES SUPERIORES (ADULTAS) */}
          {showAdult && UPPER_ADULT_POSITIONS.map(renderTooth)}

          {/* PIEZAS DENTALES SUPERIORES (INFANTILES / TEMPORALES) */}
          {showChild && UPPER_CHILD_POSITIONS.map(renderTooth)}

          {/* PIEZAS DENTALES INFERIORES (INFANTILES / TEMPORALES) */}
          {showChild && LOWER_CHILD_POSITIONS.map(renderTooth)}

          {/* PIEZAS DENTALES INFERIORES (ADULTAS) */}
          {showAdult && LOWER_ADULT_POSITIONS.map(renderTooth)}
        </svg>
      </div>

      {/* Guías clínicas de orientación mandibular inferior */}
      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest px-8 mt-2">
        <span className="flex items-center gap-1">◀ Cuadrante 4 (Inf. Der.)</span>
        <span className="text-teal-400 font-black flex items-center gap-1.5 bg-teal-500/10 px-3.5 py-1 rounded-full border border-teal-500/30 shadow-xs">
          🦷 Arcada Inferior (Mandíbula)
        </span>
        <span className="flex items-center gap-1">Cuadrante 3 (Inf. Izq.) ▶</span>
      </div>

      {/* Banner flotante de diente bajo el cursor */}
      {hoveredTooth && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-teal-500/30 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in duration-150 z-20">
          <span className="text-xs font-mono font-black text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-lg border border-teal-500/20">
            #{hoveredTooth}
          </span>
          <span className="text-xs font-bold text-white">
            {TOOTH_NAMES[hoveredTooth] || `Pieza ${hoveredTooth}`}
          </span>
          {teeth[hoveredTooth]?.conditions && teeth[hoveredTooth].conditions.length > 0 && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700">
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
    </div>
  );
}
