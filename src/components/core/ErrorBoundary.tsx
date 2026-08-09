'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /**
   * Optional display name shown in the error card title.
   * E.g. "Módulo de Contabilidad"
   */
  moduleName?: string;
  /**
   * If true, the error card fills the full height of its container instead of
   * showing a compact inline card. Useful for full-page boundaries.
   */
  fullPage?: boolean;
}

/**
 * ErrorBoundary
 * A React class-component "parachute" that catches render errors in its
 * subtree. Shows a friendly, on-brand error card instead of a blank screen.
 * The rest of the ERP (Launcher, AI Copilot) continues working normally.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production this should pipe to a real monitoring service (e.g. Sentry)
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { moduleName = 'este módulo', fullPage = false } = this.props;

    return (
      <div
        className={`
          flex flex-col items-center justify-center text-center gap-5
          px-8 py-14
          bg-rose-50/60 dark:bg-rose-950/20
          backdrop-blur-xl
          border border-rose-200 dark:border-rose-500/20
          rounded-[24px]
          shadow-[0_8px_30px_rgb(0,0,0,0.04)]
          ${fullPage ? 'min-h-[50vh]' : ''}
        `}
        role="alert"
        aria-live="assertive"
      >
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-500">
          <AlertTriangle size={32} />
        </div>

        {/* Message */}
        <div className="space-y-2 max-w-sm">
          <h3 className="text-lg font-bold text-foreground tracking-tight">
            Algo salió mal
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Tuvimos un problema al cargar <span className="font-semibold">{moduleName}</span>. El resto del ERP sigue funcionando con normalidad.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.errorMessage && (
            <p className="text-[11px] font-mono text-rose-500 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/20 rounded-lg px-3 py-2 mt-2 text-left break-all">
              {this.state.errorMessage}
            </p>
          )}
        </div>

        {/* Retry CTA */}
        <button
          onClick={this.handleRetry}
          className="
            inline-flex items-center gap-2
            bg-rose-500 text-white
            px-5 py-2.5 rounded-xl
            text-sm font-bold
            hover:bg-rose-600
            transition-colors duration-200
            btn-haptic
          "
        >
          <RefreshCw size={15} />
          Reintentar
        </button>
      </div>
    );
  }
}
