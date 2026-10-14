'use client';

import React, { useState } from 'react';
import { 
  X, 
  Baby, 
  Activity, 
  FileText, 
  DollarSign, 
  Stethoscope, 
  Calendar, 
  CheckCircle2, 
  Sparkles, 
  HelpCircle, 
  BookOpen, 
  ArrowRight,
  ShieldCheck,
  Clock,
  Heart
} from 'lucide-react';

interface GinecoClinicalGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GinecoClinicalGuideModal({ isOpen, onClose }: GinecoClinicalGuideModalProps) {
  const [activeTopic, setActiveTopic] = useState<'flujo' | 'obstetricia' | 'ginecologia' | 'soap' | 'caja' | 'glosario'>('flujo');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* CABECERA */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center font-black shadow-md shadow-pink-500/20">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
                Manual y Flujos Clínicos de Ginecología & Obstetricia
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20">
                  Guía Didáctica
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aprende qué significa cada sección, cómo opera el médico y cómo se sincroniza con el ERP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* NAVEGACIÓN DE TEMAS DIDÁCTICOS */}
        <div className="flex border-b border-border bg-card px-6 py-2 gap-2 overflow-x-auto shrink-0">
          {[
            { id: 'flujo', label: '1. Flujo de la Consulta', icon: ArrowRight },
            { id: 'obstetricia', label: '2. Obstetricia & FUM', icon: Baby },
            { id: 'ginecologia', label: '3. Citología & Colposcopia', icon: Activity },
            { id: 'soap', label: '4. SOAP & Récipe', icon: FileText },
            { id: 'caja', label: '5. Caja POS & OTs', icon: DollarSign },
            { id: 'glosario', label: '6. Glosario Médico', icon: HelpCircle },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTopic(t.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap btn-haptic ${
                activeTopic === t.id
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <t.icon size={14} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* CONTENIDO SCROLLEABLE */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-foreground">

          {/* TEMA 1: FLUJO DE LA CONSULTA */}
          {activeTopic === 'flujo' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/20">
                <h4 className="font-black text-pink-600 dark:text-pink-400 text-sm mb-1">
                  ¿Cómo funciona el flujo completo desde que la paciente llega a la clínica?
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Un ginecólogo atiende dos grandes tipos de pacientes: <strong>Gestantes (Control Prenatal)</strong> y <strong>Ginecológicas (Chequeo, Citología, Infecciones o Patologías)</strong>. El sistema unifica ambas necesidades en 5 pasos lógicos:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
                  <span className="w-7 h-7 rounded-full bg-pink-500 text-white font-black text-xs flex items-center justify-center">1</span>
                  <h5 className="font-bold text-xs">Recepción & Ficha</h5>
                  <p className="text-[11px] text-slate-500">
                    Se busca a la paciente o se registra con su cédula, edad y teléfono. Se revisan sus antecedentes y alergias.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
                  <span className="w-7 h-7 rounded-full bg-pink-500 text-white font-black text-xs flex items-center justify-center">2</span>
                  <h5 className="font-bold text-xs">Triaje y Signos</h5>
                  <p className="text-[11px] text-slate-500">
                    Toma de Tensión Arterial (clave para descartar preeclampsia), pulso, peso, talla y cálculo de IMC OMS automático.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
                  <span className="w-7 h-7 rounded-full bg-pink-500 text-white font-black text-xs flex items-center justify-center">3</span>
                  <h5 className="font-bold text-xs">Examen Clínico</h5>
                  <p className="text-[11px] text-slate-500">
                    Si está embarazada: Gestograma, FCF y Altura Uterina. Si es ginecológica: Especuloscopia, Citología PAP y Colposcopia.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
                  <span className="w-7 h-7 rounded-full bg-pink-500 text-white font-black text-xs flex items-center justify-center">4</span>
                  <h5 className="font-bold text-xs">Evolución & Récipe</h5>
                  <p className="text-[11px] text-slate-500">
                    Diagnóstico CIE-10 en 1 clic, redacción de la nota médica y emisión del récipe con posología clara e indicaciones.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
                  <span className="w-7 h-7 rounded-full bg-pink-500 text-white font-black text-xs flex items-center justify-center">5</span>
                  <h5 className="font-bold text-xs">Caja & Laboratorio</h5>
                  <p className="text-[11px] text-slate-500">
                    Se pulsa "Despachar a Caja POS". La recepcionista cobra en mostrador y las muestras pasan a seguimiento Kanban.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TEMA 2: OBSTETRICIA & GESTOGRAMA */}
          {activeTopic === 'obstetricia' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h4 className="font-black text-base text-foreground">¿Para qué sirve la Estación de Obstetricia?</h4>
              
              <div className="space-y-3">
                <div className="p-4 rounded-2xl border border-border bg-card">
                  <h5 className="font-bold text-sm text-pink-600 dark:text-pink-400 mb-1">
                    🤰 Rueda Obstétrica (Gestograma por Regla de Naegele)
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Todo embarazo se fecha a partir de la <strong>FUM (Fecha de Última Menstruación)</strong>. La Regla de Naegele calcula exactamente cuántas <strong>semanas + días de gestación</strong> tiene la madre hoy, el <strong>Trimestre Actual</strong> y la <strong>Fecha Probable de Parto (FPP)</strong> sumando 280 días (40 semanas).
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-border bg-card">
                  <h5 className="font-bold text-sm text-pink-600 dark:text-pink-400 mb-1">
                    📏 Altura Uterina (Regla de McDonald)
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    El médico mide con cinta métrica desde la sínfisis púbica hasta el fondo uterino. A partir de la semana 20, los centímetros de la altura uterina coinciden aproximadamente con las semanas de embarazo (±2 cm). Si está muy alta, sospecha embarazo múltiple o polihidramnios; si está baja, alerta posible restricción de crecimiento (RCIU).
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-border bg-card">
                  <h5 className="font-bold text-sm text-pink-600 dark:text-pink-400 mb-1">
                    💓 Frecuencia Cardíaca Fetal (FCF Doppler)
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Con el transductor Doppler se escuchan los latidos del feto. Lo normal es entre <strong>120 y 160 latidos por minuto</strong>. El sistema genera una alerta roja si hay bradicardia (&lt;110 lpm) o taquicardia (&gt;160 lpm).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TEMA 3: CITOLOGÍA & COLPOSCOPIA */}
          {activeTopic === 'ginecologia' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h4 className="font-black text-base text-foreground">¿Para qué sirve la Consulta Ginecológica y Citología?</h4>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl border border-border bg-card">
                  <h5 className="font-bold text-sm text-pink-600 dark:text-pink-400 mb-1">
                    🔬 Citología Cervical (Papanicolaou / Sistema Bethesda)
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Es la prueba preventiva para detectar cáncer de cuello uterino y VPH. El médico toma una muestra celular y la clasifica según el <strong>Sistema Bethesda</strong> internacional:
                  </p>
                  <ul className="text-xs text-slate-500 list-disc ml-5 mt-2 space-y-1">
                    <li><strong>NILM:</strong> Negativo para lesión intraepitelial (completamente sano).</li>
                    <li><strong>ASC-US / ASC-H:</strong> Células escamosas atípicas de significado indeterminado.</li>
                    <li><strong>LIEBG:</strong> Lesión Intraepitelial de Bajo Grado (infección transitoria por VPH).</li>
                    <li><strong>LIEAG:</strong> Lesión Intraepitelial de Alto Grado (requiere biopsia y colposcopia).</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl border border-border bg-card">
                  <h5 className="font-bold text-sm text-pink-600 dark:text-pink-400 mb-1">
                    🧪 Pruebas de Colposcopia (Ácido Acético y Schiller / Lugol)
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Al mirar el cuello uterino con el colposcopio (microscopio especial), el doctor aplica:
                  </p>
                  <ul className="text-xs text-slate-500 list-disc ml-5 mt-2 space-y-1">
                    <li><strong>Ácido Acético (Vinagre):</strong> Si las células tienen anomalías, las proteínas se coagulan y se vuelven blancas (epitelio acetoblanco).</li>
                    <li><strong>Solución de Lugol (Test de Schiller):</strong> El tejido sano se tiñe de color marrón caoba por el glucógeno (Schiller Positivo = Sano). Las zonas sospechosas no se tiñen (Schiller Negativo = Sugiere biopsia).</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TEMA 4: SOAP & RÉCIPE */}
          {activeTopic === 'soap' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h4 className="font-black text-base text-foreground">¿Qué es el formato SOAP y cómo funciona el Récipe?</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl border border-border bg-card">
                  <h5 className="font-bold text-xs text-pink-600 uppercase mb-1">S - Subjetivo</h5>
                  <p className="text-xs text-slate-500">
                    Lo que la paciente refiere con sus propias palabras (dolor pélvico, retraso, náuseas, flujo).
                  </p>
                </div>
                <div className="p-4 rounded-2xl border border-border bg-card">
                  <h5 className="font-bold text-xs text-pink-600 uppercase mb-1">O - Objetivo</h5>
                  <p className="text-xs text-slate-500">
                    Los hallazgos medidos por el doctor (signos vitales, especuloscopia, gestograma, ecografía).
                  </p>
                </div>
                <div className="p-4 rounded-2xl border border-border bg-card">
                  <h5 className="font-bold text-xs text-pink-600 uppercase mb-1">A - Apreciación (Diagnóstico)</h5>
                  <p className="text-xs text-slate-500">
                    El juicio clínico respaldado por la codificación internacional <strong>CIE-10</strong> (ej: Z34.0, N76.0).
                  </p>
                </div>
                <div className="p-4 rounded-2xl border border-border bg-card">
                  <h5 className="font-bold text-xs text-pink-600 uppercase mb-1">P - Plan & Conducta</h5>
                  <p className="text-xs text-slate-500">
                    Medicamentos prescritos, vitaminas prenatales, órdenes de laboratorio y fecha del próximo control.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-border">
                <h5 className="font-bold text-xs text-foreground mb-1">🖨️ Récipe Médico Digital Imprimible</h5>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Al pulsar <strong>"Ver / Imprimir Récipe"</strong>, el sistema genera la hoja médica formal con el membrete de la clínica, datos del ginecólogo tratante, matrícula MPPS, dos columnas clásicas (Medicamentos a la izquierda e Indicaciones a la derecha) y botón para imprimir o compartir por WhatsApp con la paciente en PDF.
                </p>
              </div>
            </div>
          )}

          {/* TEMA 5: CAJA POS & KANBAN */}
          {activeTopic === 'caja' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h4 className="font-black text-base text-foreground">Sincronización con Caja POS y Órdenes de Trabajo</h4>

              <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
                <h5 className="font-bold text-sm text-pink-600 dark:text-pink-400">
                  💳 Despacho Inmediato a Recepción (Caja POS)
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  El médico selecciona los procedimientos realizados (Consulta, Citología, Colposcopia, DIU, etc.) con sus aranceles. Al pulsar <strong>"Despachar a Caja POS"</strong>, la orden viaja en milisegundos a la pantalla de recepción como cotización pendiente. La cajera solo pulsa "Cobrar", recibe el pago (Efectivo, Tarjeta o Pago Móvil) y emite la factura sin que el médico toque dinero.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
                <h5 className="font-bold text-sm text-pink-600 dark:text-pink-400">
                  📋 Órdenes de Trabajo Clínicas (Laboratorio & Biopsias)
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Procedimientos complejos como biopsias cervicales o cultivos vaginales tienen etapas técnicas (Toma de muestra ➔ Envío a Patología ➔ Informe Recibido ➔ Entrega a Paciente). El módulo registra estas etapas en el tablero <strong>Kanban</strong> para que ninguna muestra se extravíe.
                </p>
              </div>
            </div>
          )}

          {/* TEMA 6: GLOSARIO MÉDICO */}
          {activeTopic === 'glosario' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <h4 className="font-black text-base text-foreground">Glosario de Siglas Médicas Frecuentes</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl border border-border bg-card">
                  <span className="font-black text-pink-600 block">G - P - C - A</span>
                  <span className="text-slate-500">
                    <strong>G</strong>estas (embarazos totales), <strong>P</strong>artos vaginales, <strong>C</strong>esáreas, <strong>A</strong>bortos.
                  </span>
                </div>

                <div className="p-3 rounded-2xl border border-border bg-card">
                  <span className="font-black text-pink-600 block">FUM / FUR</span>
                  <span className="text-slate-500">
                    Fecha de Última Menstruación (o Regla). Punto cero para fechar la gestación.
                  </span>
                </div>

                <div className="p-3 rounded-2xl border border-border bg-card">
                  <span className="font-black text-pink-600 block">FPP</span>
                  <span className="text-slate-500">
                    Fecha Probable de Parto (día estimado al cumplir las 40 semanas exactas).
                  </span>
                </div>

                <div className="p-3 rounded-2xl border border-border bg-card">
                  <span className="font-black text-pink-600 block">AU</span>
                  <span className="text-slate-500">
                    Altura Uterina medida en centímetros desde el pubis hasta el fondo uterino.
                  </span>
                </div>

                <div className="p-3 rounded-2xl border border-border bg-card">
                  <span className="font-black text-pink-600 block">FCF</span>
                  <span className="text-slate-500">
                    Frecuencia Cardíaca Fetal (latidos del bebé por minuto con Doppler).
                  </span>
                </div>

                <div className="p-3 rounded-2xl border border-border bg-card">
                  <span className="font-black text-pink-600 block">CIE-10</span>
                  <span className="text-slate-500">
                    Clasificación Internacional de Enfermedades de la OMS para diagnósticos.
                  </span>
                </div>

                <div className="p-3 rounded-2xl border border-border bg-card">
                  <span className="font-black text-pink-600 block">PAP / Bethesda</span>
                  <span className="text-slate-500">
                    Estudio citológico cervical para tamizaje y prevención de cáncer de cuello uterino.
                  </span>
                </div>

                <div className="p-3 rounded-2xl border border-border bg-card">
                  <span className="font-black text-pink-600 block">IMC</span>
                  <span className="text-slate-500">
                    Índice de Masa Corporal (Peso / [Talla]²) categorizado con rangos OMS.
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* PIE DE PÁGINA */}
        <div className="px-6 py-3.5 border-t border-border bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400 font-medium">
            Rendo ERP · Estación Clínica Multi-Dispositivo
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-black text-xs transition-all shadow-xs btn-haptic"
          >
            Entendido, volver a consulta
          </button>
        </div>

      </div>
    </div>
  );
}
