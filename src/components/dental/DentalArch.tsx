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

// Coordenadas calculadas en arco anatómico (parábola en herradura)
// Ancho de lienzo: 640px, Alto: 380px por arcada
interface ToothPosition {
  number: string;
  x: number;
  y: number;
  angle: number; // Grados de rotación siguiendo el arco mandibular
  type: 'molar' | 'premolar' | 'canine' | 'incisor';
  isChild?: boolean;
}

// Generador de posiciones en forma de herradura anatómica
const UPPER_ADULT_POSITIONS: ToothPosition[] = [
  // Cuadrante 1 (Superior Derecho del paciente - izquierda visual)
  { number: '18', x: 65,  y: 280, angle: -18, type: 'molar' },
  { number: '17', x: 95,  y: 225, angle: -24, type: 'molar' },
  { number: '16', x: 130, y: 175, angle: -30, type: 'molar' },
  { number: '15', x: 170, y: 130, angle: -38, type: 'premolar' },
  { number: '14', x: 215, y: 95,  angle: -46, type: 'premolar' },
  { number: '13', x: 265, y: 70,  angle: -58, type: 'canine' },
  { number: '12', x: 315, y: 55,  angle: -72, type: 'incisor' },
  { number: '11', x: 365, y: 50,  angle: -85, type: 'incisor' },

  // Cuadrante 2 (Superior Izquierdo del paciente - derecha visual)
  { number: '21', x: 415, y: 50,  angle: 85,  type: 'incisor' },
  { number: '22', x: 465, y: 55,  angle: 72,  type: 'incisor' },
  { number: '23', x: 515, y: 70,  angle: 58,  type: 'canine' },
  { number: '24', x: 565, y: 95,  angle: 46,  type: 'premolar' },
  { number: '25', x: 610, y: 130, angle: 38,  type: 'premolar' },
  { number: '26', x: 650, y: 175, angle: 30,  type: 'molar' },
  { number: '27', x: 685, y: 225, angle: 24,  type: 'molar' },
  { number: '28', x: 715, y: 280, angle: 18,  type: 'molar' },
];

const LOWER_ADULT_POSITIONS: ToothPosition[] = [
  // Cuadrante 4 (Inferior Derecho del paciente - izquierda visual)
  { number: '48', x: 75,  y: 60,  angle: 18,  type: 'molar' },
  { number: '47', x: 105, y: 115, angle: 24,  type: 'molar' },
  { number: '46', x: 140, y: 165, angle: 30,  type: 'molar' },
  { number: '45', x: 180, y: 210, angle: 38,  type: 'premolar' },
  { number: '44', x: 225, y: 245, angle: 46,  type: 'premolar' },
  { number: '43', x: 275, y: 270, angle: 58,  type: 'canine' },
  { number: '42', x: 325, y: 285, angle: 72,  type: 'incisor' },
  { number: '41', x: 375, y: 290, angle: 85,  type: 'incisor' },

  // Cuadrante 3 (Inferior Izquierdo del paciente - derecha visual)
  { number: '31', x: 425, y: 290, angle: -85, type: 'incisor' },
  { number: '32', x: 475, y: 285, angle: -72, type: 'incisor' },
  { number: '33', x: 525, y: 270, angle: -58, type: 'canine' },
  { number: '34', x: 575, y: 245, angle: -46, type: 'premolar' },
  { number: '35', x: 620, y: 210, angle: -38, type: 'premolar' },
  { number: '36', x: 660, y: 165, angle: -30, type: 'molar' },
  { number: '37', x: 695, y: 115, angle: -24, type: 'molar' },
  { number: '38', x: 725, y: 60,  angle: -18, type: 'molar' },
];

// Posiciones para dientes de leche (arco más cerrado)
const UPPER_CHILD_POSITIONS: ToothPosition[] = [
  { number: '55', x: 190, y: 190, angle: -32, type: 'molar', isChild: true },
  { number: '54', x: 235, y: 145, angle: -42, type: 'molar', isChild: true },
  { number: '53', x: 285, y: 115, angle: -56, type: 'canine', isChild: true },
  { number: '52', x: 335, y: 95,  angle: -72, type: 'incisor', isChild: true },
  { number: '51', x: 375, y: 90,  angle: -85, type: 'incisor', isChild: true },

  { number: '61', x: 425, y: 90,  angle: 85,  type: 'incisor', isChild: true },
  { number: '62', x: 465, y: 95,  angle: 72,  type: 'incisor', isChild: true },
  { number: '63', x: 515, y: 115, angle: 56,  type: 'canine', isChild: true },
  { number: '64', x: 565, y: 145, angle: 42,  type: 'molar', isChild: true },
  { number: '65', x: 610, y: 190, angle: 32,  type: 'molar', isChild: true },
];

const LOWER_CHILD_POSITIONS: ToothPosition[] = [
  { number: '85', x: 195, y: 150, angle: 32,  type: 'molar', isChild: true },
  { number: '84', x: 240, y: 195, angle: 42,  type: 'molar', isChild: true },
  { number: '83', x: 290, y: 225, angle: 56,  type: 'canine', isChild: true },
  { number: '82', x: 340, y: 245, angle: 72,  type: 'incisor', isChild: true },
  { number: '81', x: 380, y: 250, angle: 85,  type: 'incisor', isChild: true },

  { number: '71', x: 430, y: 250, angle: -85, type: 'incisor', isChild: true },
  { number: '72', x: 470, y: 245, angle: -72, type: 'incisor', isChild: true },
  { number: '73', x: 520, y: 225, angle: -56, type: 'canine', isChild: true },
  { number: '74', x: 570, y: 195, angle: -42, type: 'molar', isChild: true },
  { number: '75', x: 615, y: 150, angle: -32, type: 'molar', isChild: true },
];

export function DentalArch({
  teeth,
  selectedTooth,
  onSelectTooth,
  mode,
  onExfoliateAndErupt,
}: DentalArchProps) {
  // Render de un diente anatómico con forma y multi-condición
  const renderTooth = (pos: ToothPosition) => {
    const data = teeth[pos.number];
    const isSelected = selectedTooth === pos.number;
    const conditions = data?.conditions || [];
    const isAbsent = conditions.some((c) => c.code === 'ausente');

    // Múltiples condiciones: si hay 2 o más
    const cond1 = conditions[0] ? CONDITIONS[conditions[0].code] : null;
    const cond2 = conditions[1] ? CONDITIONS[conditions[1].code] : null;
    const hasMultiple = conditions.length > 1;

    // Dimensiones según tipo anatómico
    const size = pos.isChild
      ? { width: 32, height: 34, r: 8 }
      : pos.type === 'molar'
      ? { width: 44, height: 46, r: 12 }
      : pos.type === 'premolar'
      ? { width: 38, height: 40, r: 10 }
      : pos.type === 'canine'
      ? { width: 34, height: 38, r: 9 }
      : { width: 32, height: 38, r: 7 };

    // Estilos de fondo / borde multi-tratamiento
    let fillStyle = 'fill-white dark:fill-slate-800';
    let strokeStyle = 'stroke-slate-300 dark:stroke-slate-600';
    let strokeWidth = isSelected ? '3' : '1.5';

    if (isSelected) {
      strokeStyle = 'stroke-primary';
    } else if (isAbsent) {
      fillStyle = 'fill-slate-200 dark:fill-slate-800/80';
      strokeStyle = 'stroke-slate-400 dark:stroke-slate-500';
    } else if (hasMultiple && cond1 && cond2) {
      strokeStyle = cond1.color;
    } else if (cond1) {
      strokeStyle = cond1.color;
      fillStyle = '';
    }

    return (
      <g
        key={pos.number}
        transform={`translate(${pos.x - size.width / 2}, ${pos.y - size.height / 2})`}
        className="cursor-pointer group transition-all"
        onClick={() => onSelectTooth(pos.number)}
      >
        {/* Sombra de selección */}
        {isSelected && (
          <rect
            x={-4}
            y={-4}
            width={size.width + 8}
            height={size.height + 8}
            rx={size.r + 4}
            className="fill-primary/20 animate-pulse"
          />
        )}

        {/* Silueta Anatómica del Diente (Corona) */}
        {hasMultiple && cond1 && cond2 ? (
          // Split visual bicolor para múltiples tratamientos
          <g>
            <clipPath id={`clip-left-${pos.number}`}>
              <rect x={0} y={0} width={size.width / 2} height={size.height} />
            </clipPath>
            <clipPath id={`clip-right-${pos.number}`}>
              <rect x={size.width / 2} y={0} width={size.width / 2} height={size.height} />
            </clipPath>

            {/* Mitad Izquierda */}
            <rect
              x={0}
              y={0}
              width={size.width}
              height={size.height}
              rx={size.r}
              fill={cond1.color}
              fillOpacity={0.25}
              stroke={cond1.color}
              strokeWidth={strokeWidth}
              clipPath={`url(#clip-left-${pos.number})`}
            />

            {/* Mitad Derecha */}
            <rect
              x={0}
              y={0}
              width={size.width}
              height={size.height}
              rx={size.r}
              fill={cond2.color}
              fillOpacity={0.25}
              stroke={cond2.color}
              strokeWidth={strokeWidth}
              clipPath={`url(#clip-right-${pos.number})`}
            />

            {/* Borde Exterior General */}
            <rect
              x={0}
              y={0}
              width={size.width}
              height={size.height}
              rx={size.r}
              fill="none"
              stroke={isSelected ? '#0ea5e9' : cond1.color}
              strokeWidth={strokeWidth}
            />
          </g>
        ) : (
          <rect
            x={0}
            y={0}
            width={size.width}
            height={size.height}
            rx={size.r}
            className={`${fillStyle} transition-colors group-hover:filter group-hover:brightness-95`}
            style={{
              fill: cond1 && !isAbsent ? cond1.color + '26' : undefined,
              stroke: isSelected ? '#0ea5e9' : cond1 ? cond1.color : undefined,
              strokeWidth: strokeWidth,
              strokeDasharray: isAbsent ? '3 3' : undefined,
            }}
          />
        )}

        {/* Centro / Oclusal cruz anatómica sutil para molares y premolares */}
        {(pos.type === 'molar' || pos.type === 'premolar') && !isAbsent && (
          <circle
            cx={size.width / 2}
            cy={size.height / 2}
            r={pos.type === 'molar' ? 6 : 4}
            className="fill-slate-100 dark:fill-slate-700/60 stroke-slate-300 dark:stroke-slate-600/40"
            strokeWidth="0.8"
          />
        )}

        {/* Borde Incisal para Incisivos y Caninos */}
        {(pos.type === 'incisor' || pos.type === 'canine') && !isAbsent && (
          <line
            x1={size.width * 0.25}
            y1={size.height * 0.5}
            x2={size.width * 0.75}
            y2={size.height * 0.5}
            className="stroke-slate-300 dark:stroke-slate-600/40"
            strokeWidth="1"
          />
        )}

        {/* Simbología en el Diente */}
        {isAbsent ? (
          // Ausente: Gran ✕ Visible en Gris Claro Contrastante
          <g>
            <line
              x1={6}
              y1={6}
              x2={size.width - 6}
              y2={size.height - 6}
              className="stroke-slate-400 dark:stroke-slate-300"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line
              x1={size.width - 6}
              y1={6}
              x2={6}
              y2={size.height - 6}
              className="stroke-slate-400 dark:stroke-slate-300"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        ) : hasMultiple ? (
          // Multi-tratamiento: mostrar micro-badges con símbolos
          <g>
            <text
              x={size.width / 2}
              y={size.height / 2 + 3}
              textAnchor="middle"
              className="font-black text-[9px] fill-foreground select-none"
            >
              {cond1?.symbol}·{cond2?.symbol}
            </text>
            <circle
              cx={size.width - 2}
              cy={2}
              r={5}
              className="fill-primary text-white"
            />
            <text
              x={size.width - 2}
              y={4.5}
              textAnchor="middle"
              className="fill-white font-black text-[7px]"
            >
              {conditions.length}
            </text>
          </g>
        ) : cond1 ? (
          // 1 Tratamiento
          <text
            x={size.width / 2}
            y={size.height / 2 + 4}
            textAnchor="middle"
            style={{ fill: cond1.color }}
            className="font-black text-[12px] select-none"
          >
            {cond1.symbol}
          </text>
        ) : null}

        {/* Número FDI del Diente */}
        <text
          x={size.width / 2}
          y={pos.y > 170 ? size.height + 12 : -5}
          textAnchor="middle"
          className={`font-mono font-bold select-none ${
            pos.isChild ? 'text-[8.5px] fill-amber-500' : 'text-[9.5px] fill-slate-400 dark:fill-slate-500'
          } ${isSelected ? 'fill-primary font-black' : ''}`}
        >
          {pos.number}
        </text>

        {/* Botón rápido de erupción / muda si es diente de leche en modo mixto */}
        {mode === 'mixed' && pos.isChild && onExfoliateAndErupt && (
          <g
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              const adultNum = CHILD_TO_ADULT_MAP[pos.number];
              if (adultNum) onExfoliateAndErupt(pos.number, adultNum);
            }}
          >
            <title>{`Erupcionar a pieza definitiva (${CHILD_TO_ADULT_MAP[pos.number]})`}</title>
            <circle
              cx={size.width / 2}
              cy={-14}
              r={7}
              className="fill-amber-500 hover:fill-amber-600"
            />
            <text
              x={size.width / 2}
              y={-11}
              textAnchor="middle"
              className="fill-white font-black text-[8px]"
            >
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
    <div className="w-full bg-slate-50/60 dark:bg-slate-900/40 border border-border rounded-3xl p-6 relative overflow-x-auto">
      {/* Indicadores Clínicos del Arco */}
      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest px-8 mb-2">
        <span>◀ Cuadrante Derecho (1 & 4)</span>
        <span className="text-primary font-black">Arcada Superior (Maxilar)</span>
        <span>Cuadrante Izquierdo (2 & 3) ▶</span>
      </div>

      {/* Lienzo SVG Anatómico */}
      <div className="min-w-[780px] flex justify-center">
        <svg
          viewBox="0 0 780 660"
          className="w-full max-w-3xl h-auto select-none drop-shadow-xs"
        >
          {/* Líneas guía anatómicas del arco dental */}
          {/* Parábola Maxilar Superior */}
          <path
            d="M 65 280 C 130 50, 650 50, 715 280"
            fill="none"
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth="30"
            strokeLinecap="round"
            opacity="0.4"
          />

          {/* Parábola Mandibular Inferior */}
          <path
            d="M 75 380 C 140 610, 660 610, 725 380"
            fill="none"
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth="30"
            strokeLinecap="round"
            opacity="0.4"
          />

          {/* Línea Media Facial / Interincisiva */}
          <line
            x1="390"
            y1="20"
            x2="390"
            y2="640"
            className="stroke-primary/30"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <text
            x="390"
            y="335"
            textAnchor="middle"
            className="fill-slate-400 dark:fill-slate-600 text-[10px] font-black tracking-widest uppercase"
          >
            Línea Media
          </text>

          {/* Arco Superior Adulto */}
          {showAdult && UPPER_ADULT_POSITIONS.map(renderTooth)}

          {/* Arco Superior Infantil (en modo child o mixto) */}
          {showChild && UPPER_CHILD_POSITIONS.map(renderTooth)}

          {/* Arco Inferior Infantil (en modo child o mixto) */}
          {showChild && LOWER_CHILD_POSITIONS.map((p) => renderTooth({ ...p, y: p.y + 260 }))}

          {/* Arco Inferior Adulto */}
          {showAdult && LOWER_ADULT_POSITIONS.map((p) => renderTooth({ ...p, y: p.y + 280 }))}
        </svg>
      </div>

      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest px-8 mt-2">
        <span>◀ Cuadrante Derecho</span>
        <span className="text-primary font-black">Arcada Inferior (Mandíbula)</span>
        <span>Cuadrante Izquierdo ▶</span>
      </div>
    </div>
  );
}
