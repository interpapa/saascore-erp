'use client';

import React, { useState } from 'react';
import { ToothData, ToothCondition } from '@/app/actions/dental';
import { CONDITIONS } from './Odontogram';
import { Sparkles, Eye, Layers, ZoomIn, Info } from 'lucide-react';

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

// Coordenadas exactas en porcentaje (%) sobre el render 3D real de estudio (arch_occlusal.jpg 1376x768)
interface Tooth3DHotspot {
  number: string;
  x: number; // Porcentaje horizontal (0 - 100%)
  y: number; // Porcentaje vertical (0 - 100%)
  arch: 'upper' | 'lower';
  type: 'molar' | 'premolar' | 'canine' | 'incisor';
  isChild?: boolean;
}

const REAL_3D_TEETH_HOTSPOTS: Tooth3DHotspot[] = [
  // ==========================================
  // ARCADA SUPERIOR (MAXILAR - Cuadrantes 1 y 2)
  // ==========================================
  { number: '18', x: 15.5, y: 37.0, arch: 'upper', type: 'molar' },
  { number: '17', x: 19.5, y: 36.0, arch: 'upper', type: 'molar' },
  { number: '16', x: 24.0, y: 34.5, arch: 'upper', type: 'molar' },
  { number: '15', x: 29.0, y: 33.5, arch: 'upper', type: 'premolar' },
  { number: '14', x: 34.0, y: 33.0, arch: 'upper', type: 'premolar' },
  { number: '13', x: 39.0, y: 33.0, arch: 'upper', type: 'canine' },
  { number: '12', x: 44.0, y: 34.5, arch: 'upper', type: 'incisor' },
  { number: '11', x: 48.0, y: 36.0, arch: 'upper', type: 'incisor' },

  { number: '21', x: 52.0, y: 36.0, arch: 'upper', type: 'incisor' },
  { number: '22', x: 56.0, y: 34.5, arch: 'upper', type: 'incisor' },
  { number: '23', x: 61.0, y: 33.0, arch: 'upper', type: 'canine' },
  { number: '24', x: 66.0, y: 33.0, arch: 'upper', type: 'premolar' },
  { number: '25', x: 71.0, y: 33.5, arch: 'upper', type: 'premolar' },
  { number: '26', x: 76.0, y: 34.5, arch: 'upper', type: 'molar' },
  { number: '27', x: 80.5, y: 36.0, arch: 'upper', type: 'molar' },
  { number: '28', x: 84.5, y: 37.0, arch: 'upper', type: 'molar' },

  // ==========================================
  // ARCADA INFERIOR (MANDÍBULA - Cuadrantes 4 y 3)
  // ==========================================
  { number: '48', x: 15.0, y: 59.0, arch: 'lower', type: 'molar' },
  { number: '47', x: 19.0, y: 61.0, arch: 'lower', type: 'molar' },
  { number: '46', x: 23.5, y: 63.0, arch: 'lower', type: 'molar' },
  { number: '45', x: 28.5, y: 65.0, arch: 'lower', type: 'premolar' },
  { number: '44', x: 33.5, y: 66.5, arch: 'lower', type: 'premolar' },
  { number: '43', x: 38.8, y: 68.0, arch: 'lower', type: 'canine' },
  { number: '42', x: 43.5, y: 69.0, arch: 'lower', type: 'incisor' },
  { number: '41', x: 47.8, y: 69.5, arch: 'lower', type: 'incisor' },

  { number: '31', x: 52.2, y: 69.5, arch: 'lower', type: 'incisor' },
  { number: '32', x: 56.5, y: 69.0, arch: 'lower', type: 'incisor' },
  { number: '33', x: 61.2, y: 68.0, arch: 'lower', type: 'canine' },
  { number: '34', x: 66.5, y: 66.5, arch: 'lower', type: 'premolar' },
  { number: '35', x: 71.5, y: 65.0, arch: 'lower', type: 'premolar' },
  { number: '36', x: 76.5, y: 63.0, arch: 'lower', type: 'molar' },
  { number: '37', x: 81.0, y: 61.0, arch: 'lower', type: 'molar' },
  { number: '38', x: 85.0, y: 59.0, arch: 'lower', type: 'molar' },
];

export function DentalArch({
  teeth,
  selectedTooth,
  onSelectTooth,
  mode,
  onExfoliateAndErupt,
}: DentalArchProps) {
  // Selector de arco / zoom para pantallas móviles
  const [archFocus, setArchFocus] = useState<'both' | 'upper' | 'lower'>('both');
  const [hoveredTooth, setHoveredTooth] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'3d_scanner' | 'clinical_chart'>('3d_scanner');

  // Filtrado de dientes visibles según el enfoque
  const visibleTeeth = REAL_3D_TEETH_HOTSPOTS.filter(t => {
    if (archFocus === 'upper') return t.arch === 'upper';
    if (archFocus === 'lower') return t.arch === 'lower';
    return true;
  });

  // Transformación de zoom para móvil según el arco seleccionado
  const zoomStyle = archFocus === 'upper'
    ? 'scale-[1.8] translate-y-[18%]'
    : archFocus === 'lower'
    ? 'scale-[1.8] -translate-y-[18%]'
    : 'scale-100 translate-y-0';

  return (
    <div className="w-full bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-2xl space-y-4">
      {/* Barra de Controles y Selector de Zoom (Responsive para Móviles y Escritorio) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <span>Escáner Dental 3D</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold uppercase tracking-wider">
                FDI
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Toca directamente cualquier diente en el modelo 3D para diagnosticarlo
            </p>
          </div>
        </div>

        {/* Acciones de Vista: Selector de Arco Móvil & Alternador 3D / Clínico */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          {/* Selector de Arco / Zoom para Móvil */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
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

          {/* Toggle entre Escáner 3D y Esquema Clínico */}
          <button
            type="button"
            onClick={() => setDisplayMode(m => m === '3d_scanner' ? 'clinical_chart' : '3d_scanner')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              displayMode === '3d_scanner'
                ? 'bg-slate-800 text-teal-300 border-teal-500/40'
                : 'bg-slate-900 text-slate-300 border-slate-700'
            }`}
          >
            {displayMode === '3d_scanner' ? (
              <>
                <Eye size={13} className="text-teal-400" />
                <span>Vista 3D Real</span>
              </>
            ) : (
              <>
                <Layers size={13} className="text-cyan-400" />
                <span>Esquema Clínico</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* VISTA 1: ESCÁNER 3D REAL (INTERACCIÓN DIRECTA SOBRE EL RENDER) */}
      {/* ============================================================== */}
      {displayMode === '3d_scanner' ? (
        <div className="relative w-full aspect-video max-h-[520px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex items-center justify-center select-none">
          {/* Contenedor con zoom móvil fluido */}
          <div className={`relative w-full h-full transition-transform duration-500 ease-out origin-center ${zoomStyle}`}>
            {/* Render 3D Dental Real en Alta Definición */}
            <img
              src="/dental/arch_occlusal.jpg"
              alt="Modelo Dental 3D Real"
              className="w-full h-full object-cover pointer-events-none"
            />

            {/* Viñeta sutil de contraste para destacar los dientes */}
            <div className="absolute inset-0 bg-radial from-transparent via-transparent to-black/60 pointer-events-none" />

            {/* HOTSPOTS INTERACTIVOS CALIBRADOS DIRECTAMENTE SOBRE CADA DIENTE */}
            {visibleTeeth.map(pos => {
              const data = teeth[pos.number];
              const isSelected = selectedTooth === pos.number;
              const isHovered = hoveredTooth === pos.number;
              const conditions = data?.conditions || [];
              const isAbsent = conditions.some(c => c.code === 'ausente');
              const isCrown = conditions.some(c => c.code === 'corona');
              const isImplant = conditions.some(c => c.code === 'implante');
              const cond1 = conditions[0] ? CONDITIONS[conditions[0].code] : null;

              return (
                <div
                  key={pos.number}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  onClick={() => onSelectTooth(pos.number)}
                  onMouseEnter={() => setHoveredTooth(pos.number)}
                  onMouseLeave={() => setHoveredTooth(null)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 group"
                >
                  {/* Hit-target ampliado para toque con el pulgar en teléfonos */}
                  <div className="w-8 h-8 sm:w-10 sm:h-10 -m-1 sm:-m-1.5 flex items-center justify-center relative">
                    {/* Anillo de selección quirúrgica holográfico */}
                    {isSelected && (
                      <div className="absolute inset-0 rounded-full border-2 border-teal-400 bg-teal-400/25 animate-pulse shadow-[0_0_20px_rgba(20,184,166,0.9)]" />
                    )}

                    {/* Resplandor al pasar el cursor */}
                    {!isSelected && isHovered && (
                      <div className="absolute inset-0.5 rounded-full border border-cyan-400/80 bg-cyan-400/20 shadow-[0_0_12px_rgba(6,182,212,0.6)]" />
                    )}

                    {/* Badge de Tratamiento sobre el Diente */}
                    {isAbsent ? (
                      <div className="w-5 h-5 rounded-full bg-slate-900/90 border border-red-500/80 flex items-center justify-center shadow-lg">
                        <span className="text-red-400 font-black text-[11px] leading-none">✕</span>
                      </div>
                    ) : isCrown ? (
                      <div className="w-5 h-5 rounded-full bg-amber-500/90 border border-amber-300 flex items-center justify-center shadow-lg text-[10px]">
                        👑
                      </div>
                    ) : isImplant ? (
                      <div className="w-5 h-5 rounded-full bg-cyan-500/90 border border-cyan-200 flex items-center justify-center shadow-lg text-[10px]">
                        🔩
                      </div>
                    ) : cond1 ? (
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center shadow-lg animate-pulse"
                        style={{ backgroundColor: cond1.color }}
                      >
                        <span className="text-white font-black text-[8px] leading-none">{cond1.symbol}</span>
                      </div>
                    ) : (
                      /* Diente sano: punto de referencia sutil */
                      <div className={`w-2 h-2 rounded-full transition-all ${
                        isSelected
                          ? 'bg-teal-300 scale-125'
                          : 'bg-white/40 group-hover:bg-cyan-300 group-hover:scale-150'
                      }`} />
                    )}

                    {/* Pill con el Número FDI de la Pieza */}
                    <div className={`absolute left-1/2 -translate-x-1/2 pointer-events-none transition-all ${
                      pos.arch === 'upper' ? '-top-5 sm:-top-6' : '-bottom-5 sm:-bottom-6'
                    }`}>
                      <span className={`px-1.5 py-0.5 rounded-md font-mono text-[9px] sm:text-[10px] font-black transition-colors ${
                        isSelected
                          ? 'bg-teal-500 text-white shadow-md'
                          : isHovered
                          ? 'bg-slate-900 text-teal-300 border border-teal-500/40'
                          : 'bg-slate-900/80 text-slate-300 border border-slate-700/60'
                      }`}>
                        {pos.number}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Guías clínicas sutiles sobre el modelo 3D */}
          <div className="absolute top-2 left-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest pointer-events-none">
            {archFocus === 'upper' ? '🦷 Maxilar Superior (11-28)' : archFocus === 'lower' ? '🦷 Mandíbula Inferior (31-48)' : '👄 Vista Dual 3D'}
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* VISTA 2: ESQUEMA CLÍNICO PROFESIONAL LIMPIO (SIN MANCHAS ROJAS) */
        /* ============================================================== */
        <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl space-y-6">
          {/* Maxilar Superior */}
          {(archFocus === 'both' || archFocus === 'upper') && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                <span>◀ Cuadrante 1 (Sup. Der.)</span>
                <span className="text-teal-400 font-black">Maxilar Superior</span>
                <span>Cuadrante 2 (Sup. Izq.) ▶</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
                {REAL_3D_TEETH_HOTSPOTS.filter(t => t.arch === 'upper').map(t => {
                  const data = teeth[t.number];
                  const isSelected = selectedTooth === t.number;
                  const conditions = data?.conditions || [];
                  const isAbsent = conditions.some(c => c.code === 'ausente');
                  const cond1 = conditions[0] ? CONDITIONS[conditions[0].code] : null;

                  return (
                    <button
                      key={t.number}
                      type="button"
                      onClick={() => onSelectTooth(t.number)}
                      className={`w-10 h-14 sm:w-11 sm:h-16 rounded-xl border-2 flex flex-col items-center justify-between p-1 transition-all ${
                        isSelected
                          ? 'border-teal-400 bg-teal-500/20 ring-2 ring-teal-400 scale-105 shadow-lg'
                          : conditions.length > 0
                          ? 'border-slate-500 bg-slate-900 hover:border-teal-500/60'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-[10px] font-mono font-bold text-slate-400">{t.number}</span>
                      <div className="w-6 h-6 rounded-lg bg-linear-to-b from-slate-100 to-slate-300 dark:from-slate-200 dark:to-slate-400 flex items-center justify-center shadow-inner">
                        {isAbsent ? (
                          <span className="text-red-600 font-black text-xs">✕</span>
                        ) : cond1 ? (
                          <span style={{ color: cond1.color }} className="font-black text-xs">{cond1.symbol}</span>
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        )}
                      </div>
                      <span className="text-[9px] text-slate-500 capitalize">{t.type.slice(0, 3)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Línea Divisoria */}
          {archFocus === 'both' && (
            <div className="relative py-1">
              <div className="border-t border-dashed border-slate-800" />
              <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-950 px-3 text-[10px] text-teal-400 font-bold uppercase tracking-widest">
                Línea Media Oclusal
              </span>
            </div>
          )}

          {/* Mandíbula Inferior */}
          {(archFocus === 'both' || archFocus === 'lower') && (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
                {REAL_3D_TEETH_HOTSPOTS.filter(t => t.arch === 'lower').map(t => {
                  const data = teeth[t.number];
                  const isSelected = selectedTooth === t.number;
                  const conditions = data?.conditions || [];
                  const isAbsent = conditions.some(c => c.code === 'ausente');
                  const cond1 = conditions[0] ? CONDITIONS[conditions[0].code] : null;

                  return (
                    <button
                      key={t.number}
                      type="button"
                      onClick={() => onSelectTooth(t.number)}
                      className={`w-10 h-14 sm:w-11 sm:h-16 rounded-xl border-2 flex flex-col items-center justify-between p-1 transition-all ${
                        isSelected
                          ? 'border-teal-400 bg-teal-500/20 ring-2 ring-teal-400 scale-105 shadow-lg'
                          : conditions.length > 0
                          ? 'border-slate-500 bg-slate-900 hover:border-teal-500/60'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-[9px] text-slate-500 capitalize">{t.type.slice(0, 3)}</span>
                      <div className="w-6 h-6 rounded-lg bg-linear-to-b from-slate-100 to-slate-300 dark:from-slate-200 dark:to-slate-400 flex items-center justify-center shadow-inner">
                        {isAbsent ? (
                          <span className="text-red-600 font-black text-xs">✕</span>
                        ) : cond1 ? (
                          <span style={{ color: cond1.color }} className="font-black text-xs">{cond1.symbol}</span>
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        )}
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-400">{t.number}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                <span>◀ Cuadrante 4 (Inf. Der.)</span>
                <span className="text-teal-400 font-black">Mandíbula Inferior</span>
                <span>Cuadrante 3 (Inf. Izq.) ▶</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Banner flotante de información de pieza al tocar o pasar el ratón */}
      {hoveredTooth && (
        <div className="bg-slate-900/95 border border-teal-500/40 backdrop-blur-md px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in fade-in duration-150 z-20 flex-wrap justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-black text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-lg border border-teal-500/20">
              #{hoveredTooth}
            </span>
            <span className="text-xs font-bold text-white">
              {TOOTH_NAMES[hoveredTooth] || `Pieza ${hoveredTooth}`}
            </span>
          </div>
          {teeth[hoveredTooth]?.conditions && teeth[hoveredTooth].conditions.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
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
