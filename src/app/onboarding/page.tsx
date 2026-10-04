'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createTenant } from '@/app/actions/tenant';
import { supabase } from '@/lib/supabase';
import { useERPStore } from '@/store/useERPStore';

export default function OnboardingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const { setSession, setCurrentTenant } = useERPStore();

  useEffect(() => {
    let isMounted = true;
    const storeSession = useERPStore.getState().session;
    if (storeSession?.userEmail) {
      setUserEmail(storeSession.userEmail);
    }

    async function resolveUser() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user && isMounted) {
          setUserId(sessionData.session.user.id);
          setUserEmail(sessionData.session.user.email || storeSession?.userEmail || '');
          return;
        }

        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user && isMounted) {
          setUserId(userData.user.id);
          setUserEmail(userData.user.email || storeSession?.userEmail || '');
          return;
        }

        if (!storeSession?.userEmail && isMounted) {
          router.push('/login');
        }
      } catch (err) {
        console.warn('[Onboarding] Error resolviendo usuario:', err);
      }
    }

    resolveUser();
    return () => { isMounted = false; };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let activeUserId = userId;
      let activeEmail = userEmail;

      // Respaldo de seguridad: si userId aún no estaba listo en el state, buscarlo en vivo
      if (!activeUserId) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          activeUserId = sessionData.session.user.id;
          activeEmail = sessionData.session.user.email || activeEmail;
        } else {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user) {
            activeUserId = userData.user.id;
            activeEmail = userData.user.email || activeEmail;
          }
        }
      }

      if (!activeUserId) {
        setError('No se pudo identificar tu sesión. Por favor, vuelve a iniciar sesión.');
        setIsLoading(false);
        return;
      }
      
      const formData = new FormData(e.currentTarget);
      const businessName = (formData.get('businessName') as string || '').trim();
      if (!businessName) {
        setError('El nombre de la empresa es obligatorio.');
        setIsLoading(false);
        return;
      }

      let result: any = null;

      try {
        result = await createTenant(activeUserId, activeEmail || 'admin@Rendo.com', businessName);
      } catch (actionErr) {
        console.warn('[Onboarding] createTenant Server Action falló, ejecutando fallback API REST:', actionErr);
      }

      // Si falló la acción de servidor o no devolvió éxito, intentar vía API REST directa
      if (!result?.success || !result?.tenant) {
        try {
          const apiRes = await fetch('/api/tenant/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: activeUserId,
              userEmail: activeEmail,
              businessName,
            }),
          });
          result = await apiRes.json();
        } catch (apiErr: any) {
          console.error('[Onboarding] API REST fallback error:', apiErr);
          throw new Error(result?.error || apiErr?.message || 'Error al conectar con el servidor.');
        }
      }

      if (result?.success && result.tenant) {
        setCurrentTenant({
          id: result.tenant.id,
          name: result.tenant.name,
          blocked: !result.tenant.is_active,
          active_modules: result.tenant.active_modules || (result.tenant.metadata as any)?.active_modules || [],
          metadata: result.tenant.metadata
        });
        
        setSession({
          userEmail: activeEmail || 'user@Rendo.com',
          role: 'owner',
          tenantId: result.tenant.id
        });
        
        router.replace('/dashboard');
      } else {
        setError(result?.error || 'Error al crear la empresa');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('[Onboarding Exception]:', err);
      setError(err?.message || 'Ocurrió un error inesperado al registrar la empresa. Por favor intenta de nuevo.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[480px] bg-card rounded-[24px] shadow-2xl border border-border p-8 animate-in fade-in slide-in-from-bottom-4">
        
        <div className="w-16 h-16 bg-primary/10 rounded-2xl mx-auto mb-6 flex items-center justify-center text-primary">
          <Building2 size={32} />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-1">Configura tu Empresa</h1>
        <p className="text-slate-500 text-center mb-2 text-sm">
          Para empezar a usar Rendo, necesitamos el nombre de tu negocio o taller.
        </p>
        {userEmail && (
          <p className="text-xs text-primary font-semibold text-center mb-6 bg-primary/5 py-1 px-3 rounded-full w-fit mx-auto border border-primary/20">
            Conectado como: {userEmail}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}
          
          <Input 
            name="businessName"
            label="Nombre del Negocio *" 
            placeholder="Ej: Dental Care Center / Rendo Corp"
            icon={<Building2 size={18} />}
            required
            autoFocus
          />
          
          <Button 
            type="submit" 
            className="w-full group" 
            size="lg"
            isLoading={isLoading}
          >
            Comenzar a usar el sistema
            <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/login');
              }}
              className="text-xs text-slate-400 hover:text-foreground transition-colors underline"
            >
              ¿No es tu cuenta? Cerrar sesión
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
