'use client';

import React, { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { AICopilot } from '@/components/core/AICopilot';
import { FloatingHeader } from '@/components/core/FloatingHeader';
import { AmbientBackground } from '@/components/core/AmbientBackground';
import { ErrorBoundary } from '@/components/core/ErrorBoundary';
import { useKeybindings } from '@/hooks/useKeybindings';

export default function ERPLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useKeybindings();
  const pathname = usePathname();

  return (
    <div className="min-h-screen text-foreground overflow-x-hidden selection:bg-primary/30 relative">
      <AmbientBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        <FloatingHeader />
        <main className="flex-1 w-full pt-20">
          <ErrorBoundary key={pathname} moduleName="este módulo">
            <Suspense 
              fallback={
                <div className="w-full max-w-6xl mx-auto px-6 py-12 flex justify-center items-center">
                  <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Cargando módulo...
                  </div>
                </div>
              }
            >
              {children}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <AICopilot />
    </div>
  );
}
