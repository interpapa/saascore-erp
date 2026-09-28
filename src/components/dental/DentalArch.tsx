'use client';

import React from 'react';
import { ToothData } from '@/app/actions/dental';
import { CONDITIONS } from './Odontogram';

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
  // Render anatómico de cada diente con silueta real y detalles oclusales
  const renderTooth = (pos: ToothPosition) => {
    const data = teeth[pos.number];
    const isSelected = selectedTooth === pos.number;
    const conditions = data?.conditions || [];
    const isAbsent = conditions.some((c) => c.code === 'ausente');

    const cond1 = conditions[0] ? CONDITIONS[conditions[0].code] : null;
    const cond2 = conditions[1] ? CONDITIONS[conditions[1].code] : null;
    const hasMultiple = conditions.length > 1;

    // Dimensiones proporcionales y escala
    const scale = pos.isChild ? 0.78 : 1;
    const toothName = TOOTH_NAMES[pos.number] || `Pieza ${pos.number}`;

    // Estilos de color para la superficie dental
    let toothFill = 'url(#enamel-gradient)';
    let toothStroke = '#cbd5e1';
    let strokeWidth = isSelected ? 2.5 : 1.2;

    if (isAbsent) {
      toothFill = 'url(#absent-pattern)';
      toothStroke = '#94a3b8';
    } else if (hasMultiple && cond1 && cond2) {
      toothStroke = cond1.color;
    } else if (cond1) {
      toothStroke = cond1.color;
      toothFill = cond1.color + '26'; // 15% opacity tint
    }

    return (
      <g
        key={pos.number}
        transform={`translate(${pos.x}, ${pos.y}) rotate(${pos.angle}) scale(${scale})`}
        className="cursor-pointer group transition-all"
        onClick={() => onSelectTooth(pos.number)}
      >
        <title>{`Pieza ${pos.number} — ${toothName}${conditions.length > 0 ? ` (${conditions.map(c => CONDITIONS[c.code]?.label || c.code).join(', ')})` : ''}`}</title>

        {/* Halo de selección clínica / Focus Glow */}
        {isSelected && (
          <ellipse
            cx={0}
            cy={0}
            rx={pos.type === 'molar' ? 24 : pos.type === 'premolar' ? 20 : 18}
            ry={pos.type === 'molar' ? 22 : pos.type === 'premolar' ? 18 : 16}
            className="fill-teal-400/20 stroke-teal-500 animate-pulse"
            strokeWidth={3}
            filter="drop-shadow(0 0 6px rgba(20, 184, 166, 0.6))"
          />
        )}

        {/* SILUETA ANATÓMICA SEGÚN TIPO DE DIENTE */}

        {/* 1. MOLAR: Corona con 4 cúspides redondeadas y surcos en cruz */}
        {pos.type === 'molar' && (
          <g className="transition-transform group-hover:scale-105 duration-150">
            {/* Contorno corona molar */}
            <path
              d="M -18 -14 C -12 -17, 12 -17, 18 -14 C 21 -10, 21 10, 18 14 C 12 17, -12 17, -18 14 C -21 10, -21 -10, -18 -14 Z"
              fill={toothFill}
              stroke={isSelected ? '#0ea5e9' : toothStroke}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              className={isAbsent ? 'stroke-dashed' : ''}
              filter="drop-shadow(0 2px 3px rgba(0,0,0,0.15))"
            />
            {/* Surcos y fosas oclusales de desarrollo (anatomía del molar) */}
            {!isAbsent && (
              <>
                {/* Surco central mesiodistal */}
                <path
                  d="M -13 0 Q 0 -1 13 0"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeLinecap="round"
                  opacity="0.85"
                />
                {/* Surco vestibulolingual con fosa central */}
                <path
                  d="M 0 -11 Q -1 0 0 11"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeLinecap="round"
                  opacity="0.85"
                />
                {/* Fosa central / fovea */}
                <circle cx={0} cy={0} r={2} fill="#64748b" opacity="0.6" />
                {/* Micro fisuras triangulares marginales */}
                <path d="M -10 -4 L -13 0 L -10 4" fill="none" stroke="#cbd5e1" strokeWidth="0.8" />
                <path d="M 10 -4 L 13 0 L 10 4" fill="none" stroke="#cbd5e1" strokeWidth="0.8" />
              </>
            )}
          </g>
        )}

        {/* 2. PREMOLAR: Corona ovoide con 2 cúspides y surco transversal */}
        {pos.type === 'premolar' && (
          <g className="transition-transform group-hover:scale-105 duration-150">
            <path
              d="M -14 -12 C -8 -15, 8 -15, 14 -12 C 17 -8, 17 8, 14 12 C 8 15, -8 15, -14 12 C -17 8, -17 -8, -14 -12 Z"
              fill={toothFill}
              stroke={isSelected ? '#0ea5e9' : toothStroke}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              filter="drop-shadow(0 2px 3px rgba(0,0,0,0.15))"
            />
            {!isAbsent && (
              <>
                <path
                  d="M -10 0 Q 0 -0.5 10 0"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeLinecap="round"
                  opacity="0.85"
                />
                <circle cx={-5} cy={0} r={1.2} fill="#64748b" opacity="0.7" />
                <circle cx={5} cy={0} r={1.2} fill="#64748b" opacity="0.7" />
              </>
            )}
          </g>
        )}

        {/* 3. CANINO: Silueta en punta de diamante redondeada (cúspide y vertientes) */}
        {pos.type === 'canine' && (
          <g className="transition-transform group-hover:scale-105 duration-150">
            <path
              d="M 0 -15 C 8 -11, 14 -4, 13 6 C 11 12, -11 12, -13 6 C -14 -4, -8 -11, 0 -15 Z"
              fill={toothFill}
              stroke={isSelected ? '#0ea5e9' : toothStroke}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              filter="drop-shadow(0 2px 3px rgba(0,0,0,0.15))"
            />
            {!isAbsent && (
              <path
                d="M 0 -12 L 0 5"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="1"
                strokeLinecap="round"
                opacity="0.8"
              />
            )}
          </g>
        )}

        {/* 4. INCISIVO: Corona alargada en arco con borde incisal liso */}
        {pos.type === 'incisor' && (
          <g className="transition-transform group-hover:scale-105 duration-150">
            <path
              d="M -13 -10 C -8 -13, 8 -13, 13 -10 C 15 -4, 14 6, 12 11 C 6 13, -6 13, -12 11 C -14 6, -15 -4, -13 -10 Z"
              fill={toothFill}
              stroke={isSelected ? '#0ea5e9' : toothStroke}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              filter="drop-shadow(0 2px 3px rgba(0,0,0,0.15))"
            />
            {!isAbsent && (
              <path
                d="M -9 8 Q 0 9 9 8"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="1"
                strokeLinecap="round"
                opacity="0.8"
              />
            )}
          </g>
        )}

        {/* RENDERIZADO VISUAL DE TRATAMIENTO(S) */}
        {isAbsent ? (
          // Símbolo de pieza ausente
          <g>
            <line x1={-9} y1={-9} x2={9} y2={9} stroke="#64748b" strokeWidth={2.5} strokeLinecap="round" />
            <line x1={9} y1={-9} x2={-9} y2={9} stroke="#64748b" strokeWidth={2.5} strokeLinecap="round" />
          </g>
        ) : hasMultiple && cond1 && cond2 ? (
          // Múltiples condiciones: indicador visual dual
          <g>
            {/* Círculo central con badge numérico de tratamientos */}
            <circle cx={0} cy={0} r={6.5} fill="#0f172a" stroke="#ffffff" strokeWidth={1} />
            <text
              x={0}
              y={2.5}
              textAnchor="middle"
              className="fill-white font-black text-[8px] select-none pointer-events-none"
            >
              {conditions.length}
            </text>
          </g>
        ) : cond1 ? (
          // Tratamiento único con su color y símbolo clínico
          <g>
            <circle cx={0} cy={0} r={6} fill={cond1.color} opacity={0.9} />
            <text
              x={0}
              y={2.5}
              textAnchor="middle"
              className="fill-white font-black text-[7.5px] select-none pointer-events-none"
            >
              {cond1.symbol}
            </text>
          </g>
        ) : null}

        {/* ETIQUETA NUMÉRICA FDI */}
        {/* Desrotar el texto para que el número siempre esté perfectamente horizontal */}
        <g transform={`rotate(${-pos.angle})`}>
          <text
            x={0}
            y={pos.y > 340 ? 25 : -20}
            textAnchor="middle"
            className={`font-mono font-bold select-none text-[10px] ${
              pos.isChild ? 'fill-amber-500 font-black' : isSelected ? 'fill-primary font-black' : 'fill-slate-600 dark:fill-slate-300'
            }`}
          >
            {pos.number}
          </text>
        </g>

        {/* BOTÓN RÁPIDO DE ERUPCIÓN INFANTIL (SI ES DIENTE DE LECHE EN MODO MIXTO) */}
        {mode === 'mixed' && pos.isChild && onExfoliateAndErupt && (
          <g
            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            transform={`rotate(${-pos.angle}) translate(0, -28)`}
            onClick={(e) => {
              e.stopPropagation();
              const adultNum = CHILD_TO_ADULT_MAP[pos.number];
              if (adultNum) onExfoliateAndErupt(pos.number, adultNum);
            }}
          >
            <title>{`Mudar y Erupcionar a pieza permanente (${CHILD_TO_ADULT_MAP[pos.number]})`}</title>
            <circle cx={0} cy={0} r={8} className="fill-amber-500 hover:fill-amber-600 shadow-md" />
            <text x={0} y={3} textAnchor="middle" className="fill-white font-black text-[9px] pointer-events-none">
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
    <div className="w-full bg-linear-to-b from-slate-50 to-slate-100 dark:from-slate-900/60 dark:to-slate-950/80 border border-border rounded-3xl p-6 relative overflow-x-auto shadow-inner">
      {/* Guías clínicas de orientación anatómica */}
      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest px-8 mb-2">
        <span>◀ Cuadrante Derecho (1 & 4)</span>
        <span className="text-teal-600 dark:text-teal-400 font-black flex items-center gap-1.5 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
          🦷 Arcada Superior (Maxilar)
        </span>
        <span>Cuadrante Izquierdo (2 & 3) ▶</span>
      </div>

      {/* Lienzo SVG Anatómico Ultra Realista */}
      <div className="min-w-[780px] flex justify-center py-2">
        <svg
          viewBox="0 0 780 670"
          className="w-full max-w-3xl h-auto select-none drop-shadow-md"
        >
          <defs>
            {/* Gradiente de Esmalte Dental Perlado con Iluminación Superior */}
            <radialGradient id="enamel-gradient" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="65%" stopColor="#fdfdfc" />
              <stop offset="100%" stopColor="#f1f5f9" />
            </radialGradient>

            {/* Gradiente Realista de Encía Superior (Rosa / Salmón gingival) */}
            <linearGradient id="upper-gum-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fb7185" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#f43f5e" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#fda4af" stopOpacity="0.35" />
            </linearGradient>

            {/* Gradiente Realista de Encía Inferior */}
            <linearGradient id="lower-gum-grad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#fb7185" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#f43f5e" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#fda4af" stopOpacity="0.35" />
            </linearGradient>

            {/* Sombra suave y anatomía del Paladar */}
            <radialGradient id="palate-gradient" cx="50%" cy="30%" r="50%">
              <stop offset="0%" stopColor="#fda4af" stopOpacity="0.3" />
              <stop offset="80%" stopColor="#f43f5e" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0" />
            </radialGradient>

            {/* Anatomía de la Lengua en Arcada Inferior */}
            <radialGradient id="tongue-gradient" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.55" />
              <stop offset="70%" stopColor="#e11d48" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#be123c" stopOpacity="0.9" />
            </radialGradient>

            {/* Patrón rayado para Dientes Ausentes */}
            <pattern id="absent-pattern" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#cbd5e1" strokeWidth="2" />
            </pattern>
          </defs>

          {/* FONDO ANATÓMICO: PALADAR SUPERIOR */}
          <path
            d="M 170 170 C 230 40, 550 40, 610 170 C 530 250, 250 250, 170 170 Z"
            fill="url(#palate-gradient)"
          />
          {/* Rugosidades palatinas sutiles */}
          <path d="M 330 90 Q 390 100 450 90" fill="none" stroke="#fb7185" strokeWidth="1.5" opacity="0.3" />
          <path d="M 340 120 Q 390 132 440 120" fill="none" stroke="#fb7185" strokeWidth="1.5" opacity="0.25" />
          <path d="M 350 150 Q 390 160 430 150" fill="none" stroke="#fb7185" strokeWidth="1.5" opacity="0.2" />

          {/* ARCO DE ENCÍA SUPERIOR (Herradura Gingival Maxilar) */}
          <path
            d="M 60 285 C 80 40, 700 40, 720 285"
            fill="none"
            stroke="url(#upper-gum-grad)"
            strokeWidth="48"
            strokeLinecap="round"
            filter="drop-shadow(0 2px 4px rgba(244,63,94,0.15))"
          />

          {/* FONDO ANATÓMICO: LENGUA EN LA ARCADA INFERIOR */}
          <g>
            {/* Silueta de la Lengua */}
            <path
              d="M 230 500 C 240 400, 540 400, 550 500 C 530 570, 250 570, 230 500 Z"
              fill="url(#tongue-gradient)"
              filter="drop-shadow(0 4px 6px rgba(0,0,0,0.2))"
            />
            {/* Surco medio lingual */}
            <line
              x1="390"
              y1="435"
              x2="390"
              y2="525"
              stroke="#9f1239"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.4"
            />
          </g>

          {/* ARCO DE ENCÍA INFERIOR (Herradura Gingival Mandibular) */}
          <path
            d="M 70 385 C 90 635, 690 635, 710 385"
            fill="none"
            stroke="url(#lower-gum-grad)"
            strokeWidth="48"
            strokeLinecap="round"
            filter="drop-shadow(0 2px 4px rgba(244,63,94,0.15))"
          />

          {/* LÍNEA MEDIA FACIAL / INTERINCISIVA */}
          <line
            x1="390"
            y1="25"
            x2="390"
            y2="645"
            stroke="#14b8a6"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.5"
          />
          <text
            x="390"
            y="340"
            textAnchor="middle"
            className="fill-slate-400 dark:fill-slate-500 text-[10px] font-black tracking-widest uppercase select-none"
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

      {/* Guías clínicas de orientación mandibular */}
      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest px-8 mt-2">
        <span>◀ Cuadrante Derecho</span>
        <span className="text-teal-600 dark:text-teal-400 font-black flex items-center gap-1.5 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
          🦷 Arcada Inferior (Mandíbula)
        </span>
        <span>Cuadrante Izquierdo ▶</span>
      </div>
    </div>
  );
}
