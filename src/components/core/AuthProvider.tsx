'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useERPStore } from '@/store/useERPStore';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserTenant } from '@/app/actions/tenant';

interface AuthContextType {
  isLoading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Rutas que NO requieren autenticación
const PUBLIC_ROUTES = ['/login'];
const isPublicRoute = (path: string) => PUBLIC_ROUTES.includes(path) || path.startsWith('/c/');

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { session, setSession, setCurrentTenant } = useERPStore();
  // Si ya tenemos una sesión en localStorage (vía Zustand persist), no bloquear el renderizado
  const [isLoading, setIsLoading] = useState(!session);
  const router = useRouter();
  const pathname = usePathname();

  const handleSessionSync = useCallback(async (user: { email?: string; id?: string } | null | undefined) => {
    if (!user || !user.email) return;

    try {
      // Buscar si el usuario tiene un tenant asignado mediante Server Action segura
      const result = await getUserTenant(user.email, user.id);

      if (result.success && result.tenant) {
        setCurrentTenant({
          id: result.tenant.id,
          name: result.tenant.name,
          blocked: !result.tenant.is_active,
          metadata: result.tenant.metadata
        });
        setSession({
          userEmail: user.email,
          role: (result.role as 'owner' | 'admin' | 'user') || 'owner',
          tenantId: result.tenant.id
        });
        return;
      }

      // Usuario sin empresa, va al onboarding
      setSession({
        userEmail: user.email,
        role: 'owner',
        tenantId: ''
      });
      setCurrentTenant(null);
    } catch (err) {
      console.error('Error sincronizando sesión:', err);
    }
  }, [setCurrentTenant, setSession]);

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
  }, [handleSessionSync, router, setCurrentTenant, setSession]);



  useEffect(() => {
    if (isLoading) return;

    const isPublic = isPublicRoute(pathname);

    // Solo redirigir si el usuario NO está autenticado y está en ruta privada
    if (!session && !isPublic) {
      router.push('/login');
    } 
    // Solo redirigir a onboarding si falta el tenantId y no está ya en onboarding
    else if (session && !session.tenantId && pathname !== '/onboarding') {
      router.push('/onboarding');
    } 
    // Solo redirigir a dashboard si está en /login o /onboarding teniendo sesión
    else if (session && session.tenantId && (pathname === '/login' || pathname === '/onboarding')) {
      router.push('/dashboard');
    }
  }, [session, isLoading, pathname, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setCurrentTenant(null);
    router.push('/login');
  };

  if (isLoading && !session) {
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
