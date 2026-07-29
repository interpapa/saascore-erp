import Link from 'next/link';
import { LayoutDashboard, Ticket, Users, Settings, Wrench, Package } from 'lucide-react';

export function Sidebar() {
  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Tickets', icon: Ticket, href: '/tickets' },
    { name: 'Caja', icon: Wrench, href: '/caja' },
    { name: 'Inventario', icon: Package, href: '/inventario' },
    { name: 'Equipo', icon: Users, href: '/equipo' },
    { name: 'Configuración', icon: Settings, href: '/configuracion' },
  ];

  return (
    <aside className="w-64 bg-[#0a0f1c] border-r border-slate-800/50 text-slate-300 flex flex-col h-screen fixed left-0 top-0 shadow-xl shadow-slate-900/20">
      <div className="h-20 flex items-center px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Wrench size={20} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-wide">SaaSCore</span>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
        <p className="px-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-4">Plataforma</p>
        {menuItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 hover:text-white transition-all duration-200 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <item.icon size={20} className="text-slate-400 group-hover:text-indigo-400 transition-colors relative z-10" />
            <span className="font-medium text-[15px] relative z-10">{item.name}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4">
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-2xl p-4 shadow-inner">
          <p className="text-slate-400 text-xs font-medium mb-1">Empresa Actual</p>
          <div className="flex items-center justify-between">
            <p className="text-white font-semibold truncate text-sm">Taller Central S.A.</p>
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
          </div>
        </div>
      </div>
    </aside>
  );
}
