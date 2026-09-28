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
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        setUserEmail(data.user.email || '');
      } else {
        router.push('/login');
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userId) return;

    setIsLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const businessName = formData.get('businessName') as string;

    const result = await createTenant(userId, userEmail || 'admin@Rendo.com', businessName);

    if (result.success && result.tenant) {
      setCurrentTenant({
        id: result.tenant.id,
        name: result.tenant.name,
        blocked: !result.tenant.is_active
      });
      
      setSession({
        userEmail: userEmail || 'user@Rendo.com',
        role: 'owner',
        tenantId: result.tenant.id
      });
      
      window.location.href = '/dashboard';
    } else {
      setError(result.error || 'Error al crear la empresa');
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
