'use client';

import { Sparkles, X, Send } from 'lucide-react';
import { useState } from 'react';

export const AICopilot = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Botón Flotante (oculto en móviles para no solapar el MobileDock) */}
      <div className={`fixed bottom-6 right-6 z-40 group transition-all duration-300 hidden md:block ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}>
        {/* Glow Backdrop */}
        <div className="absolute inset-0 bg-indigo-500/40 rounded-full blur-xl group-hover:bg-indigo-500/60 transition-colors duration-500 animate-pulse" />

        {/* Orb Button */}
        <button
          onClick={() => setIsOpen(true)}
          className="relative w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 transition-transform duration-300 border border-white/10"
          title="AI Copilot"
        >
          <Sparkles size={24} className="animate-pulse" />
        </button>
      </div>

      {/* Panel Lateral — usa tokens del sistema para respetar el modo oscuro */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full sm:w-[400px]
          bg-card border-l border-border
          shadow-[-10px_0_40px_rgba(0,0,0,0.12)]
          z-50
          transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
          flex flex-col
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >

        {/* Header */}
        <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-gradient-to-r from-indigo-500/10 dark:from-indigo-500/5 to-transparent shrink-0">
          <div className="flex items-center gap-2 font-black text-foreground">
            <Sparkles size={18} className="text-indigo-500" />
            Rendo AI Copilot
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 border border-border transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background">
          <div className="bg-card border border-border p-4 rounded-2xl rounded-tl-sm shadow-sm text-sm text-foreground max-w-[85%] leading-relaxed">
            Hola, soy tu copiloto de Inteligencia Artificial. Puedo analizar facturas, detectar fugas de inventario y predecir la demanda del próximo mes. ¿En qué te ayudo hoy?
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-border bg-card flex items-center px-4 h-16 shrink-0">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Pregúntale a tus datos..."
              className="w-full bg-background border border-border rounded-full py-2.5 pl-4 pr-12 text-sm text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <button className="absolute right-1 top-1 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors">
              <Send size={14} className="-ml-0.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Overlay Oscuro (Móvil) */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 sm:hidden animate-in fade-in"
        />
      )}
    </>
  );
};
