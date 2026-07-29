import { AICopilot } from '@/components/core/AICopilot';
import { OnboardingWizard } from '@/components/core/OnboardingWizard';
import { FloatingHeader } from '@/components/core/FloatingHeader';
import { AmbientBackground } from '@/components/core/AmbientBackground';

export default function ERPLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen text-foreground overflow-x-hidden selection:bg-primary/30 relative">
      <AmbientBackground />
      
      {/* Contenido Superior (z-10 para flotar sobre el fondo) */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Isla Flotante (Apple Vision Style) */}
        <FloatingHeader />

        {/* Contenedor Principal (100% Pantalla) */}
        <main className="flex-1 w-full pt-20">
          {children}
        </main>
      </div>

      {/* Orbe de Inteligencia Artificial */}
      <AICopilot />
      
      {/* Asistente de Configuración Inicial */}
      <OnboardingWizard />
    </div>
  );
}
