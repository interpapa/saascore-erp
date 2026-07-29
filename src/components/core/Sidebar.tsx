'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Wrench, Wallet, CalendarDays, Settings, Bell } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/clientes', label: 'Clientes', icon: Users },
    { href: '/catalogo', label: 'Catálogo', icon: Wrench },
    { href: '/caja', label: 'Caja & Finanzas', icon: Wallet },
    { href: '/calendario', label: 'Citas', icon: CalendarDays },
    { href: '/configuracion', label: 'Ajustes', icon: Settings },
  ];

  return (
    <aside className="w-64 h-screen hidden md:flex flex-col bg-card border-r border-border shadow-2xl z-50 transition-colors duration-300 relative">
      {/* Brand Header */}
      <div className="h-20 flex items-center px-8 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg flex items-center justify-center">
            <span className="text-white font-black text-sm">S</span>
          </div>
          <div>
            <h1 className="font-black text-foreground tracking-tight leading-none text-xl">SaaSCore</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">OS Workspace</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all group ${
                isActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon 
                size={20} 
                className={`${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-foreground transition-colors'}`} 
              />
              {link.label}
              
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions (Theme, Notifications, Profile) */}
      <div className="p-4 border-t border-border/50 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between mb-4">
          <ThemeToggle />
          <button className="relative w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-foreground transition-all btn-haptic flex items-center justify-center group">
            <Bell size={18} className="group-hover:animate-swing" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-100 dark:border-slate-800"></span>
          </button>
        </div>
        
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs border border-indigo-200">
            AD
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-foreground truncate">Administrador</p>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate">Taller Principal</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
