'use client';

import { useState, useEffect } from 'react';
import { Search, X, Users, Box, ShoppingCart, Scale, Settings, ArrowRight, BarChart3, CalendarDays, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CommandItem {
  id: string;
  title: string;
  category: 'módulo' | 'acción' | 'cliente' | 'producto';
  href: string;
  icon: any;
}

const COMMAND_ITEMS: CommandItem[] = [
  { id: '1',  title: 'Caja — POS Bimoneda',           category: 'módulo', href: '/caja',          icon: ShoppingCart },
  { id: '2',  title: 'Clientes — CRM Directorio',     category: 'módulo', href: '/clientes',     icon: Users },
  { id: '3',  title: 'Catálogo — Productos y Servicios', category: 'módulo', href: '/catalogo',    icon: Box },
  { id: '4',  title: 'Estadísticas — Panel Ejecutivo',  category: 'módulo', href: '/estadisticas', icon: BarChart3 },
  { id: '5',  title: 'Compras — Proveedores y POs',   category: 'módulo', href: '/compras',      icon: ShoppingCart },
  { id: '6',  title: 'Contabilidad — Libro Mayor',    category: 'módulo', href: '/contabilidad', icon: Scale },
  { id: '7',  title: 'Equipo — Personal y Nómina',   category: 'módulo', href: '/equipo',       icon: Users },
  { id: '8',  title: 'Calendario — Citas y Turnos',   category: 'módulo', href: '/calendario',  icon: CalendarDays },
  { id: '9',  title: 'WhatsApp — CRM Omnicanal',     category: 'módulo', href: '/whatsapp',    icon: MessageCircle },
  { id: '10', title: 'Ajustes — Configuración General', category: 'módulo', href: '/configuracion', icon: Settings },
];

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setQuery('');
        if (isOpen) onClose();
        else onClose(); // Controlled by parent state
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = COMMAND_ITEMS.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-70 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        
        {/* Input Bar */}
        <div className="flex items-center px-4 border-b border-border bg-white/50 dark:bg-slate-900/50">
          <Search size={20} className="text-slate-400 shrink-0 mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar módulo, cliente, factura o comando... (Esc para salir)"
            className="w-full py-4 text-base bg-transparent text-foreground placeholder:text-slate-400 focus:outline-none"
            autoFocus
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-foreground rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              No se encontraron resultados para &quot;{query}&quot;
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item.href)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors group btn-haptic"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-primary group-hover:text-white transition-colors">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{item.title}</p>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.category}</span>
                    </div>
                  </div>
                  <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 border-t border-border bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center text-xs text-slate-400 font-medium">
          <span>Navegar con teclado</span>
          <span className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px]">Ctrl + K</span>
        </div>

      </div>
    </div>
  );
}
