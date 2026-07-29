import React, { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 tracking-tight">
          {label}
        </label>
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600 dark:text-slate-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full bg-card dark:bg-black/20 border border-slate-300 dark:border-border text-foreground text-sm rounded-lg
              focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none
              transition-all duration-200 shadow-sm
              ${icon ? 'pl-10 pr-4' : 'px-4'} py-2.5
              ${error ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <span className="text-xs font-medium text-red-500">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
