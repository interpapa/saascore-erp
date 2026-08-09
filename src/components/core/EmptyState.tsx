import React from 'react';

interface EmptyStateProps {
  /** Lucide React icon component to display (pass as element, e.g. <Users size={48} />) */
  icon: React.ReactNode;
  /** Short heading that names what is missing */
  title: string;
  /** Optional sentence that explains why it is empty or what to do */
  description?: string;
  /** Optional primary CTA button rendered below the description */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Extra Tailwind classes for the root wrapper */
  className?: string;
}

/**
 * EmptyState
 * A premium empty-state component that acts as an invitation to act.
 * Follows SaaSCore design tokens: glassmorphism surface, primary color for the CTA.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center
        text-center
        px-8 py-16 gap-5
        ${className}
      `}
    >
      {/* Icon wrapper with subtle glow ring */}
      <div className="relative flex items-center justify-center">
        {/* Glow behind icon */}
        <div className="absolute inset-0 rounded-full bg-slate-200 dark:bg-slate-700/60 blur-2xl scale-150 opacity-60 pointer-events-none" />
        <div className="relative w-20 h-20 rounded-[22px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-inner">
          {icon}
        </div>
      </div>

      {/* Text content */}
      <div className="space-y-2 max-w-xs">
        <h3 className="text-lg font-bold text-foreground tracking-tight">{title}</h3>
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* CTA button */}
      {action && (
        <button
          onClick={action.onClick}
          className="
            mt-2
            inline-flex items-center gap-2
            bg-primary text-primary-foreground
            px-5 py-2.5 rounded-xl
            text-sm font-bold
            shadow-[0_0_20px_rgba(79,70,229,0.25)]
            hover:shadow-[0_0_28px_rgba(79,70,229,0.45)]
            hover:bg-primary/90
            transition-all duration-200
            btn-haptic
          "
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
