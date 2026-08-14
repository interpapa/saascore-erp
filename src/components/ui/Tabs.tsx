'use client';

import React from 'react';

/* ──────────────────────────────────────────────────────────
   1. UNDERLINE TABS (Stripe / GitHub Style)
   Ideal for top-level navigation inside a module page.
────────────────────────────────────────────────────────── */
interface UnderlineTabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ size: number; className?: string }>;
  count?: number;
}

interface UnderlineTabsProps {
  tabs: UnderlineTabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function UnderlineTabs({ tabs, activeTab, onChange, className = '' }: UnderlineTabsProps) {
  return (
    <div className={`flex items-center gap-6 border-b border-border/60 pb-1 overflow-x-auto scrollbar-none ${className}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              relative pb-3 text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap btn-haptic
              ${isActive 
                ? 'text-primary' 
                : 'text-slate-500 dark:text-slate-400 hover:text-foreground'
              }
            `}
          >
            {Icon && <Icon size={16} />}
            {tab.label}
            {tab.count !== undefined && (
              <span 
                className={`
                  text-[10px] font-extrabold px-1.5 py-0.5 rounded-md
                  ${isActive 
                    ? 'bg-primary-50 text-primary' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }
                `}
              >
                {tab.count}
              </span>
            )}
            
            {/* active line indicator */}
            {isActive && (
              <span 
                className="absolute bottom-0 inset-x-0 h-0.5 rounded-full"
                style={{ background: 'var(--primary)' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   2. SEGMENTED PILL (Apple Style)
   Ideal for settings toggles, binary views, or filter controls.
────────────────────────────────────────────────────────── */
interface SegmentedControlProps {
  options: { id: string; label: string; icon?: React.ComponentType<{ size: number }> }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export function SegmentedControl({ options, value, onChange, className = '' }: SegmentedControlProps) {
  return (
    <div className={`inline-flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-border/40 ${className}`}>
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`
              flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all btn-haptic
              ${isActive
                ? 'bg-card text-foreground shadow-sm border border-border/20'
                : 'text-slate-500 hover:text-foreground'
              }
            `}
          >
            {Icon && <Icon size={14} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   3. INDEX CARD TABS (Fichas Carpeta Style)
   Ideal for detailed sheets, side inspectors or nested tabs inside forms.
────────────────────────────────────────────────────────── */
interface IndexCardTabsProps {
  tabs: { id: string; label: string; icon?: React.ComponentType<{ size: number }> }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function IndexCardTabs({ tabs, activeTab, onChange, className = '' }: IndexCardTabsProps) {
  return (
    <div className={`flex items-end border-b border-border/60 ${className}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5 border-t border-x rounded-t-xl -mb-[1px] btn-haptic
              ${isActive
                ? 'bg-card border-border text-foreground relative z-10'
                : 'bg-slate-50/50 dark:bg-slate-900/30 border-transparent text-slate-500 hover:text-foreground hover:bg-slate-100/50 dark:hover:bg-slate-800/30'
              }
            `}
          >
            {Icon && <Icon size={14} />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
