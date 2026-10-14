'use client';

import React, { useMemo } from 'react';
import { Calendar, Baby, Activity, AlertCircle, Clock, Heart, Sparkles } from 'lucide-react';
import { calculateObstetricWheel } from '@/lib/medical/clinicalCalculators';

interface GestationalWheelWidgetProps {
  fum: string;
  onFumChange: (newFum: string) => void;
  uterineHeightCm?: number;
  fetalHeartRateBpm?: number;
}

export function GestationalWheelWidget({
  fum,
  onFumChange,
  uterineHeightCm,
  fetalHeartRateBpm,
}: GestationalWheelWidgetProps) {
  const wheel = useMemo(() => {
    return calculateObstetricWheel(fum);
  }, [fum]);

  // Alertas clínicas por edad gestacional
  const milestones = useMemo(() => {
    const list: Array<{ label: string; period: string; status: 'done' | 'active' | 'upcoming'; desc: string }> = [
      {
        label: 'Eco I Trimestre / Marcadores',
        period: '11 - 13.6 sem',
        status: wheel.gestationalWeeks > 13 ? 'done' : wheel.gestationalWeeks >= 11 ? 'active' : 'upcoming',
        desc: 'Translucencia nucal, hueso nasal y screening de cromosomopatías.',
      },
      {
        label: 'Eco Morfológica Fetal',
        period: '20 - 24 sem',
        status: wheel.gestationalWeeks > 24 ? 'done' : wheel.gestationalWeeks >= 20 ? 'active' : 'upcoming',
        desc: 'Anatomía detallada, screening cardíaco de 4 cámaras y longitud cervical.',
      },
      {
        label: 'Test de O\'Sullivan (Glucosa 75g)',
        period: '24 - 28 sem',
        status: wheel.gestationalWeeks > 28 ? 'done' : wheel.gestationalWeeks >= 24 ? 'active' : 'upcoming',
        desc: 'Tamizaje universal de Diabetes Gestacional.',
      },
      {
        label: 'Profilaxis Anti-D (si Rh -)',
        period: '28 sem',
        status: wheel.gestationalWeeks > 28 ? 'done' : wheel.gestationalWeeks === 28 ? 'active' : 'upcoming',
        desc: 'Inmunoglobulina anti-D en gestantes Rh (-) no sensibilizadas.',
      },
      {
        label: 'Cultivo Estreptococo Grupo B',
        period: '35 - 37 sem',
        status: wheel.gestationalWeeks > 37 ? 'done' : wheel.gestationalWeeks >= 35 ? 'active' : 'upcoming',
        desc: 'Frotis rectovaginal para prevención de sepsis neonatal por SGB.',
      },
    ];
    return list;
  }, [wheel.gestationalWeeks]);

  // Altura uterina esperada (McDonald: AU = EG semanas +- 2cm entre 20 y 34 sem)
  const auAlert = useMemo(() => {
    if (!uterineHeightCm || wheel.gestationalWeeks < 20) return null;
    const diff = uterineHeightCm - wheel.gestationalWeeks;
    if (diff > 3) {
      return { type: 'high', msg: 'AU aumentada para la EG (sospecha: polihidramnios, macrosomía o embarazo múltiple)' };
    }
    if (diff < -3) {
      return { type: 'low', msg: 'AU disminuida para la EG (sospecha: RCIU, oligohidramnios o error de FUR)' };
    }
    return { type: 'normal', msg: 'AU acorde con la edad gestacional (Regla de McDonald)' };
  }, [uterineHeightCm, wheel.gestationalWeeks]);

  // FCF fetal alerta (normal: 120-160 lpm)
  const fcfAlert = useMemo(() => {
    if (!fetalHeartRateBpm) return null;
    if (fetalHeartRateBpm < 110) {
      return { type: 'brady', msg: 'Bradicardia Fetal (< 110 lpm) — Evaluación urgente con Doppler' };
    }
    if (fetalHeartRateBpm > 160) {
      return { type: 'tachy', msg: 'Taquicardia Fetal (> 160 lpm) — Descartar fiebre materna, deshidratación o hipoxia' };
    }
    return { type: 'normal', msg: 'Frecuencia Cardíaca Fetal normal (120 - 160 lpm)' };
  }, [fetalHeartRateBpm]);

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-5 shadow-sm space-y-5">
      {/* Cabecera y Selector de FUM */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center font-black shrink-0">
            <Baby size={22} />
          </div>
          <div>
            <h4 className="text-base font-black text-foreground flex items-center gap-2">
              Gestograma & Rueda Obstétrica
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20">
                Regla de Naegele
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cálculo en vivo de semanas gestacionales, trimestre y fecha probable de parto
            </p>
          </div>
        </div>

        {/* Input FUM */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-black text-slate-500 dark:text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
            <Calendar size={14} className="text-pink-500" />
            <span>FUM:</span>
          </label>
          <input
            type="date"
            value={fum || ''}
            onChange={(e) => onFumChange(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Resultados de la Rueda Gestacional */}
      {fum ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Semanas + Días */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-pink-500/10 to-rose-500/5 border border-pink-500/20">
              <span className="text-[11px] font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider block">
                Edad Gestacional
              </span>
              <p className="text-xl sm:text-2xl font-black text-foreground mt-0.5">
                {wheel.gestationalWeeks}{' '}
                <span className="text-sm font-semibold text-slate-500">sem</span> + {wheel.gestationalDays}{' '}
                <span className="text-sm font-semibold text-slate-500">d</span>
              </p>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 block">
                {wheel.formattedGA}
              </span>
            </div>

            {/* Fecha Probable de Parto */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/20">
              <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                Fecha Probable de Parto (FPP)
              </span>
              <p className="text-base sm:text-lg font-black text-foreground mt-1">
                {wheel.fppDateStr ? new Date(`${wheel.fppDateStr}T12:00:00Z`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </p>
              <span className="text-[10px] font-bold text-purple-500 dark:text-purple-400 mt-1 block">
                {wheel.daysRemaining} días restantes (40 sem)
              </span>
            </div>

            {/* Trimestre Actual */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                Trimestre Actual
              </span>
              <p className="text-xl sm:text-2xl font-black text-foreground mt-0.5">
                {wheel.trimester}º Trimestre
              </p>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 block">
                {wheel.trimester === 1 ? 'Semanas 1 a 13' : wheel.trimester === 2 ? 'Semanas 14 a 27' : 'Semana 28 a término'}
              </span>
            </div>

            {/* Progreso del Embarazo */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                Progreso Fetal
              </span>
              <p className="text-xl sm:text-2xl font-black text-foreground mt-0.5">
                {wheel.progressPercent}%
              </p>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-1.5">
                <div
                  className="bg-gradient-to-r from-pink-500 to-rose-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${wheel.progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Semáforos de Biometría: Altura Uterina y Doppler FCF */}
          {(auAlert || fcfAlert) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {auAlert && (
                <div
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-start gap-2.5 ${
                    auAlert.type === 'normal'
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  <Activity size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black block">Altura Uterina: {uterineHeightCm} cm</span>
                    <span className="text-[11px] font-medium opacity-90">{auAlert.msg}</span>
                  </div>
                </div>
              )}

              {fcfAlert && (
                <div
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-start gap-2.5 ${
                    fcfAlert.type === 'normal'
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  <Heart size={16} className="shrink-0 mt-0.5 text-rose-500" />
                  <div>
                    <span className="font-black block">FCF Fetal: {fetalHeartRateBpm} lpm</span>
                    <span className="text-[11px] font-medium opacity-90">{fcfAlert.msg}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Línea de Tiempo de Hitos Obstétricos Recomendados */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={13} className="text-pink-500" />
              Controles y Protocolos Clave de la Gestación
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {milestones.map((m) => (
                <div
                  key={m.label}
                  className={`p-2.5 rounded-2xl border text-[11px] transition-all space-y-1 ${
                    m.status === 'active'
                      ? 'bg-pink-500/10 border-pink-500/40 text-pink-700 dark:text-pink-300 ring-2 ring-pink-500/20'
                      : m.status === 'done'
                      ? 'bg-slate-100 dark:bg-slate-800/60 border-border/60 text-slate-500 opacity-80'
                      : 'bg-card border-border/60 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black truncate">{m.period}</span>
                    {m.status === 'active' && (
                      <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
                    )}
                  </div>
                  <p className="font-bold text-foreground truncate">{m.label}</p>
                  <p className="text-[10px] text-slate-500 line-clamp-2">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 px-4 border border-dashed border-border rounded-2xl text-slate-400 space-y-1">
          <Calendar size={24} className="mx-auto text-pink-400/60" />
          <p className="text-xs font-bold text-foreground">
            Ingresa la Fecha de Última Menstruación (FUM)
          </p>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            El sistema calculará automáticamente la edad gestacional en semanas y días, fecha probable de parto y alertas obstétricas.
          </p>
        </div>
      )}
    </div>
  );
}
