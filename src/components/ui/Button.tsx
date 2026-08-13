import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Jerarquía visual del botón. Default: 'primary' */
  variant?: ButtonVariant;
  /** Tamaño táctil. 'md' = 44px (iOS HIG). Default: 'md' */
  size?: ButtonSize;
  /** Muestra spinner y bloquea interacción */
  isLoading?: boolean;
  /** Icono a la izquierda del texto */
  icon?: React.ReactNode;
}

/**
 * Button — SaaSCore Design System v2
 *
 * Jerarquía clara con sombras semánticas (sombra con color del botón).
 * Touch targets: sm=32px, md=44px (iOS HIG), lg=48px.
 * Border-radius: 12px (elegido por el usuario — versátil).
 *
 * Variants:
 *   primary  — Acción principal de la pantalla. Gradiente azul corporativo + sombra azul.
 *   secondary — Acción alternativa. Borde primario, fondo transparente.
 *   ghost    — Acción terciaria / navegación. Sin borde, hover sutil.
 *   danger   — Acciones destructivas. Gradiente rojo + sombra roja.
 *   outline  — Alias de secondary (compatibilidad con código existente).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant    = 'primary',
      size       = 'md',
      isLoading  = false,
      icon,
      className  = '',
      disabled,
      ...props
    },
    ref,
  ) => {
    /* ── Clase CSS base ── */
    const base = 'btn-base btn-haptic inline-flex items-center justify-center gap-2 disabled:opacity-45 disabled:pointer-events-none';

    /* ── Variante → clase semántica del design system ── */
    const variantClass: Record<ButtonVariant, string> = {
      primary:   'btn-primary',
      secondary: 'btn-secondary',
      outline:   'btn-secondary',   // alias para retrocompatibilidad
      ghost:     'btn-ghost',
      danger:    'btn-danger',
    };

    /* ── Tamaño → override de altura cuando el design system no lo cubre ── */
    const sizeClass: Record<ButtonSize, string> = {
      sm: 'btn-sm',
      md: '',        // ya viene en las clases btn-primary / btn-secondary
      lg: 'btn-lg',
    };

    const classes = [
      base,
      variantClass[variant],
      sizeClass[size],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={classes}
        {...props}
      >
        {isLoading && (
          <Loader2
            className="animate-spin shrink-0"
            size={size === 'sm' ? 14 : 16}
            aria-hidden="true"
          />
        )}
        {!isLoading && icon && (
          <span className="shrink-0 flex items-center" aria-hidden="true">
            {icon}
          </span>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
