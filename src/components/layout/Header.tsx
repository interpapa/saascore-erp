import { Bell, Search, UserCircle, Settings2 } from 'lucide-react';

export function Header() {
  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/50 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-[400px] hidden md:block group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Buscar tickets, clientes o repuestos..."
            className="w-full pl-12 pr-10 py-2.5 bg-slate-100/50 hover:bg-slate-100 border border-transparent focus:border-indigo-100 rounded-full text-[14px] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground transition-colors">
            <Settings2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <button className="relative p-2.5 text-slate-400 hover:text-foreground hover:bg-slate-100/80 rounded-full transition-all">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm"></span>
        </button>
        
        <div className="h-8 w-px bg-slate-200/60 mx-1"></div>
        
        <button className="flex items-center gap-3 hover:bg-background p-2 rounded-xl transition-all border border-transparent hover:border-slate-200/60">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-100 to-indigo-50 flex items-center justify-center border border-indigo-100 shadow-inner">
            <UserCircle size={24} className="text-indigo-500" />
          </div>
          <div className="text-left hidden sm:block pr-2">
            <p className="text-[14px] font-semibold text-slate-700 leading-tight">Admin Usuario</p>
            <p className="text-[12px] text-slate-600 dark:text-slate-400 font-medium mt-0.5">Gerente General</p>
          </div>
        </button>
      </div>
    </header>
  );
}
