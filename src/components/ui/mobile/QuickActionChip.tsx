'use client';

import React from 'react';

interface QuickActionChipProps {
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  selected?: boolean;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'amber' | 'emerald' | 'rose' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export function QuickActionChip({
  label,
  sublabel,
  icon,
  selected = false,
  onClick,
  variant = 'secondary',
  size = 'md',
  disabled = false,
}: QuickActionChipProps) {
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs gap-1 min-h-[36px]',
    md: 'px-3.5 py-2 text-xs sm:text-sm gap-1.5 min-h-[44px]',
    lg: 'px-4 py-2.5 text-sm sm:text-base gap-2 min-h-[50px]',
  };

  const getVariantClasses = () => {
    if (selected) {
      return 'bg-primary text-primary-foreground border-primary shadow-sm font-black scale-[1.02] ring-2 ring-primary/30';
    }

    switch (variant) {
      case 'primary':
        return 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 font-bold';
      case 'amber':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20 font-bold';
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 font-bold';
      case 'rose':
        return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20 font-bold';
      case 'outline':
        return 'bg-transparent text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium';
      case 'secondary':
      default:
        return 'bg-slate-100 dark:bg-slate-800/80 text-foreground border-border hover:bg-slate-200 dark:hover:bg-slate-700 font-medium';
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-2xl border transition-all text-center select-none btn-haptic active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${sizeClasses[size]} ${getVariantClasses()}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{label}</span>
      {sublabel && (
        <span className="ml-1 opacity-75 text-[10px] font-mono tracking-tight shrink-0">
          {sublabel}
        </span>
      )}
    </button>
  );
}
