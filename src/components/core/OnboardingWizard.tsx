'use client';

import { useState } from 'react';
import { Rocket, Upload, CheckCircle2 } from 'lucide-react';

export default function OnboardingWizard() {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('saascore_onboarding_completed');
    }
    return false;
  });
  const [step, setStep] = useState(1);
  const handleComplete = () => {
    localStorage.setItem('saascore_onboarding_completed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 border border-slate-200 dark:border-slate-800">
        
        {/* Header Decorativo */}
        <div className="h-32 bg-gradient-to-br from-indigo-600 to-blue-700 relative flex items-center justify-center">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }}></div>
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-lg text-white">
            <Rocket size={32} />
          </div>
        </div>

        {/* Contenido del Wizard */}
        <div className="p-8">
          
          {step === 1 && (
            <div className="text-center animate-in fade-in slide-in-from-right-4">
              <h2 className="text-2xl font-black text-slate-800 mb-2">Bienvenido a SaaSCore</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">Estás a punto de modernizar tu negocio. Personalicemos tu instancia antes de comenzar.</p>
              
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 mb-8 hover:bg-background transition-colors cursor-pointer group">
                <Upload size={32} className="text-indigo-400 mx-auto mb-3 group-hover:-translate-y-1 transition-transform" />
                <p className="font-bold text-slate-700">Sube tu Logotipo</p>
                <p className="text-xs text-slate-400 mt-1">PNG o JPG (Max 2MB)</p>
              </div>

              <button 
                onClick={() => setStep(2)}
                className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold py-3.5 rounded-xl transition-colors btn-haptic"
              >
                Siguiente Paso
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="text-center animate-in fade-in slide-in-from-right-4">
              <h2 className="text-2xl font-black text-slate-800 mb-2">Configuración Final</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">Elige tu moneda local. Podrás cambiar esto luego en los Ajustes.</p>
              
              <select className="w-full bg-background border border-slate-200 text-slate-800 font-semibold rounded-xl p-4 mb-8 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none">
                <option value="USD">Dólares Americanos (USD $)</option>
                <option value="EUR">Euros (EUR €)</option>
                <option value="MXN">Pesos Mexicanos (MXN $)</option>
                <option value="COP">Pesos Colombianos (COP $)</option>
              </select>

              <button 
                onClick={handleComplete}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 btn-haptic"
              >
                <CheckCircle2 size={20} /> Empezar a Usar el Sistema
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
