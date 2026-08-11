'use client';

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

  return (
    <div className="min-h-screen text-foreground overflow-x-hidden selection:bg-primary/30 relative">
      <AmbientBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        <FloatingHeader />
        <main className="flex-1 w-full pt-20">
          <ErrorBoundary moduleName="este módulo">
            {children}
          </ErrorBoundary>
        </main>
      </div>

      <AICopilot />
    </div>
  );
}
