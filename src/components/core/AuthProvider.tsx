'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useERPStore, SessionData, Tenant } from '@/store/useERPStore';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  isLoading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Rutas que NO requieren autenticación
const PUBLIC_ROUTES = ['/login'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { session, setSession, setCurrentTenant } = useERPStore();
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      try {
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();
        
        if (supabaseSession) {
          await handleSessionSync(supabaseSession.user);
        } else {
          setSession(null);
          setCurrentTenant(null);
        }
      } catch (err) {
        console.error("Error getting session:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, supabaseSession) => {
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setCurrentTenant(null);
          router.push('/login');
        } else if (supabaseSession) {
          await handleSessionSync(supabaseSession.user);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setSession, setCurrentTenant, router]);

  const handleSessionSync = async (user: any) => {
    // Buscar si el usuario tiene un tenant asignado
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (userTenants) {
      // Buscar la información del tenant
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', userTenants.tenant_id)
        .single();

      if (tenantData) {
        setCurrentTenant({
          id: tenantData.id,
          name: tenantData.name,
          blocked: tenantData.status !== 'active',
          metadata: tenantData.metadata
        });
        setSession({
          userEmail: user.email,
          role: userTenants.role as any,
          tenantId: tenantData.id
        });
      }
    } else {
      // Usuario sin empresa, va al onboarding
      setSession({
        userEmail: user.email,
        role: 'technician', // rol temporal
        tenantId: ''
      });
      setCurrentTenant(null);
    }
  };

  useEffect(() => {
    if (isLoading) return;

    const isPublic = PUBLIC_ROUTES.includes(pathname);

    if (!session && !isPublic) {
      router.push('/login');
    } else if (session && !session.tenantId && pathname !== '/onboarding') {
      // Si está logueado pero no tiene tenant, mandarlo al onboarding (a menos que ya esté ahí)
      router.push('/onboarding');
    } else if (session && session.tenantId && (isPublic || pathname === '/onboarding')) {
      // Si está logueado y tiene tenant, mandarlo al dashboard si intenta entrar a login u onboarding
      router.push('/dashboard');
    }
  }, [session, isLoading, pathname, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setCurrentTenant(null);
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse">
            <div className="w-4 h-4 bg-white rounded-full animate-bounce" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium animate-pulse">Iniciando entorno seguro...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
