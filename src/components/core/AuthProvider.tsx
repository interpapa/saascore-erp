'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useERPStore } from '@/store/useERPStore';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserTenant } from '@/app/actions/tenant';
import { isSuperAdminEmail } from '@/lib/core/tenantSecurity';
import { DEFAULT_ENABLED_MODULES } from '@/lib/core/kernel/moduleRegistry';

const PRIMARY_DEFAULT_TENANT_ID = '31ec279c-4216-48e1-905c-fbf4ea398e04';

interface AuthContextType {
  isLoading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Rutas que NO requieren autenticación
const PUBLIC_ROUTES = ['/login', '/reservar-demo', '/reservas', '/c'];

// Comprueba si la ruta es pública o es una de las rutas base permitidas sin sesión
const isPublicRoute = (path: string) => {
  if (PUBLIC_ROUTES.includes(path)) return true;
  if (path.startsWith('/reservas/')) return true;
  if (path.startsWith('/c/')) return true;
  return false;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { session, setSession, setCurrentTenant, hasHydrated } = useERPStore();
  const [isLoading, setIsLoading] = useState(!session);
  const router = useRouter();
  const pathname = usePathname();

  const handleSessionSync = useCallback(async (user: { email?: string; id?: string } | null | undefined, accessToken?: string) => {
    if (!user || !user.email) return;

    const cleanEmail = user.email.trim().toLowerCase();
    const isSuper = isSuperAdminEmail(cleanEmail);

    try {
      // Buscar si el usuario tiene un tenant asignado mediante Server Action segura
      const result = await getUserTenant(cleanEmail, user.id);

      if (result.success && result.tenant) {
        setCurrentTenant({
          id: result.tenant.id,
          name: result.tenant.name,
          blocked: !result.tenant.is_active,
          active_modules: result.tenant.active_modules || (result.tenant.metadata as any)?.active_modules || DEFAULT_ENABLED_MODULES,
          metadata: result.tenant.metadata
        });
        setSession({
          userEmail: cleanEmail,
          role: isSuper ? 'superadmin' : ((result.role as any) || 'owner'),
          tenantId: result.tenant.id,
          token: accessToken
        });
        return;
      }

      // Si getUserTenant no devolvió tenant pero es Superadmin, darle acceso global
      if (isSuper || result.role === 'superadmin') {
        setSession({
          userEmail: cleanEmail,
          role: 'superadmin',
          tenantId: 'global-admin',
          token: accessToken
        });
        setCurrentTenant({
          id: 'global-admin',
          name: 'Superadmin Console',
          blocked: false,
          active_modules: ['admin', 'config', 'estadisticas']
        });
        return;
      }

      // Si getUserTenant no devolvió tenant, verificar si el store ya tiene un tenant y sesión activos
      const existingSession = useERPStore.getState().session;
      const existingTenant = useERPStore.getState().currentTenant;

      if (existingSession?.tenantId && existingTenant?.id && existingSession.userEmail === cleanEmail) {
        setSession({
          ...existingSession,
          userEmail: cleanEmail,
          token: accessToken || existingSession.token
        });
        return;
      }

      // Si no tiene empresa asignada, es un usuario nuevo pendiente de Onboarding
      setCurrentTenant(null);
      setSession({
        userEmail: cleanEmail,
        role: 'owner',
        tenantId: null as any,
        token: accessToken
      });
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
          await handleSessionSync(supabaseSession.user, supabaseSession.access_token);
        } else {
          try {
            const { data: refreshData } = await supabase.auth.refreshSession();
            if (refreshData?.session) {
              await handleSessionSync(refreshData.session.user, refreshData.session.access_token);
              return;
            }
          } catch (rErr) {
            console.warn('[AuthProvider] No se pudo refrescar sesión:', rErr);
          }

          const existingSession = useERPStore.getState().session;
          if (!existingSession?.userEmail) {
            setSession(null);
            setCurrentTenant(null);
          }
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
        } else if ((event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && supabaseSession) {
          const currentSession = useERPStore.getState().session;
          if (currentSession) {
            setSession({
              ...currentSession,
              token: supabaseSession.access_token,
            });
          }
        } else if (supabaseSession) {
          await handleSessionSync(supabaseSession.user, supabaseSession.access_token);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleSessionSync, router, setCurrentTenant, setSession]);

  useEffect(() => {
    // Si aún está resolviendo sesión o el localStorage no ha hidratado, NO redirigir
    if (isLoading || !hasHydrated) return;

    const isPublic = isPublicRoute(pathname);

    // Solo redirigir si el usuario NO está autenticado y está en ruta privada
    if (!session && !isPublic) {
      router.push('/login');
    } 
    // Superadmin sin tenant va directo a /admin
    else if (session && session.role === 'superadmin' && (pathname === '/login' || pathname === '/onboarding')) {
      router.push('/admin');
    }
    // Usuario normal con tenant no debe estar en /login ni en /onboarding
    else if (session && session.tenantId && (pathname === '/login' || pathname === '/onboarding')) {
      router.push('/dashboard');
    }
    // Usuario autenticado SIN empresa asignada intentando acceder a rutas privadas -> Configurar empresa
    else if (session && !session.tenantId && session.role !== 'superadmin' && pathname !== '/onboarding' && !isPublic) {
      router.push('/onboarding');
    }
  }, [session, isLoading, hasHydrated, pathname, router]);

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
          <p className="text-sm font-medium text-slate-500 animate-pulse">
            Iniciando sesión...
          </p>
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
