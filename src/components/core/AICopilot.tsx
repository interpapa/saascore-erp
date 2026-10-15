'use client';

import { Sparkles, X, Send } from 'lucide-react';
import { useState, useEffect } from 'react';

export const AICopilot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([
    {
      sender: 'ai',
      text: 'Hola, soy tu copiloto de Inteligencia Artificial. Puedo analizar facturas, detectar fugas de inventario y predecir la demanda del próximo mes. ¿En qué te ayudo hoy?',
    },
  ]);

  const handleSend = () => {
    const q = input.trim();
    if (!q) return;
    setChatMessages((prev) => [
      ...prev,
      { sender: 'user', text: q },
      {
        sender: 'ai',
        text: `He recibido tu consulta: "${q}". Estoy analizando los indicadores y sincronizando los módulos activos de tu empresa para asistirte.`,
      },
    ]);
    setInput('');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

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
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background">
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed max-w-[88%] ${
                msg.sender === 'user'
                  ? 'ml-auto bg-indigo-600 text-white rounded-tr-sm'
                  : 'bg-card border border-border text-foreground rounded-tl-sm'
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>

        {/* Input Area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="border-t border-border bg-card flex items-center px-4 h-16 shrink-0"
        >
          <div className="relative w-full">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregúntale a tus datos..."
              className="w-full bg-background border border-border rounded-full py-2.5 pl-4 pr-12 text-sm text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="absolute right-1 top-1 w-8 h-8 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-colors"
            >
              <Send size={14} className="-ml-0.5" />
            </button>
          </div>
        </form>

      </div>

      {/* Overlay Oscuro Global */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 animate-in fade-in"
        />
      )}
    </>
  );
};
