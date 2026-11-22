'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useERPStore } from '@/store/useERPStore';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserTenant } from '@/app/actions/tenant';
import { isSuperAdminEmail } from '@/lib/core/tenantSecurity';
import { DEFAULT_ENABLED_MODULES } from '@/lib/core/kernel/moduleRegistry';

const PRIMARY_DEFAULT_TENANT_ID = '45b6404f-3469-4c42-99c1-85416a411f4f';

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
      let result: any = null;
      try {
        const preferredTenantId = useERPStore.getState().impersonatedTenant?.id || useERPStore.getState().currentTenant?.id;
        result = await getUserTenant(cleanEmail, user.id, preferredTenantId);
      } catch (saErr) {
        console.warn('[AuthProvider] Server Action getUserTenant falló, evaluando fallback:', saErr);
      }

      // Fallback directo por cliente Supabase si Server Action no devolvió tenant
      if (!result?.success || !result?.tenant) {
        try {
          const { data: utRows } = await supabase
            .from('user_tenants')
            .select('tenant_id, role')
            .ilike('user_email', cleanEmail)
            .limit(1);

          if (utRows && utRows.length > 0) {
            const { data: tRow } = await supabase
              .from('tenants')
              .select('*')
              .eq('id', utRows[0].tenant_id)
              .maybeSingle();

            if (tRow) {
              result = {
                success: true,
                tenant: tRow,
                role: utRows[0].role || 'owner',
              };
            }
          }
        } catch (clientErr) {
          console.warn('[AuthProvider] Error en fallback de cliente Supabase:', clientErr);
        }
      }

      if (result?.success && result.tenant) {
        if (!isSuper && useERPStore.getState().impersonatedTenant) {
          useERPStore.getState().stopImpersonation();
        }

        // Blindaje Superadmin: Si está en Modo Soporte (impersonando un negocio ajeno), PRESERVARLO y no revertir
        const activeImpersonation = useERPStore.getState().impersonatedTenant;
        // Si la impersonación apunta al mismo tenant que es su empresa base, o a rendo corp residual, liberar
        if (activeImpersonation?.id === result.tenant.id || (activeImpersonation?.id === PRIMARY_DEFAULT_TENANT_ID && result.tenant.id !== PRIMARY_DEFAULT_TENANT_ID)) {
          useERPStore.getState().stopImpersonation();
        } else if (isSuper && activeImpersonation?.id) {
          setCurrentTenant({
            ...activeImpersonation,
            active_modules: activeImpersonation.active_modules || (activeImpersonation.metadata as any)?.active_modules || DEFAULT_ENABLED_MODULES,
          });
          setSession({
            userEmail: cleanEmail,
            role: 'superadmin',
            tenantId: activeImpersonation.id,
            token: accessToken,
            allowed_modules: undefined,
            operational_permissions: undefined,
          });
          return;
        }

        setCurrentTenant({
          id: result.tenant.id,
          name: result.tenant.name,
          blocked: !result.tenant.is_active,
          active_modules: result.tenant.active_modules || (result.tenant.metadata as any)?.active_modules || DEFAULT_ENABLED_MODULES,
          metadata: result.tenant.metadata
        });
        setSession({
          userEmail: cleanEmail,
          role: isSuper ? 'superadmin' : (result.role === 'superadmin' ? 'owner' : ((result.role as any) || 'owner')),
          tenantId: result.tenant.id,
          token: accessToken,
          allowed_modules: result.allowedModules || undefined,
          operational_permissions: result.operationalPermissions || undefined,
        });
        return;
      }

      // Si getUserTenant falló por error de conexión o base de datos, NO BORRAR la sesión
      if (!result?.success) {
        console.warn('[AuthProvider] Error temporal consultando tenant:', result?.error);
        const existingTenant = useERPStore.getState().currentTenant;
        const existingSession = useERPStore.getState().session;
        if (existingTenant?.id && existingSession?.userEmail === cleanEmail) {
          // Mantener la sesión activa localmente mientras se reestablece la conexión
          // CRÍTICO: actualizar el token con el nuevo accessToken para que Server Actions funcionen
          if (accessToken && existingSession.token !== accessToken) {
            setSession({ ...existingSession, token: accessToken });
          }
          return;
        }
        return;
      }

      // Si getUserTenant no devolvió tenant pero es Superadmin verificado en whitelist, conectarlo a la empresa operativa o impersonada
      if (isSuper) {
        const activeImpersonation = useERPStore.getState().impersonatedTenant;
        const existingTenant = useERPStore.getState().currentTenant;
        const targetId = activeImpersonation?.id || existingTenant?.id || PRIMARY_DEFAULT_TENANT_ID;
        const targetName = activeImpersonation?.name || existingTenant?.name || 'Rendo Corp';
        setSession({
          userEmail: cleanEmail,
          role: 'superadmin',
          tenantId: targetId,
          token: accessToken
        });
        setCurrentTenant({
          id: targetId,
          name: targetName,
          blocked: false,
          active_modules: activeImpersonation?.active_modules || existingTenant?.active_modules || DEFAULT_ENABLED_MODULES,
          metadata: activeImpersonation?.metadata || existingTenant?.metadata || {}
        });
        return;
      }

      // Si getUserTenant no devolvió tenant, verificar si el store ya tiene un tenant y sesión activos válidos
      const existingSession = useERPStore.getState().session;
      const existingTenant = useERPStore.getState().currentTenant;

      const isDummyOrStaleTenant = !existingTenant?.id 
        || existingTenant.id === 'global-admin' 
        || existingTenant.id === '8636dbc1-ca83-4b92-a56b-52992959c289' 
        || existingTenant.id === '757c19e1-67bf-474b-88b3-4063b617dc10';

      if (!isDummyOrStaleTenant && existingSession?.tenantId && existingTenant?.id && existingSession.userEmail === cleanEmail) {
        setSession({
          ...existingSession,
          userEmail: cleanEmail,
          token: accessToken || existingSession.token
        });
        return;
      }

      // Solo si la base de datos respondió exitosamente confirmando que no tiene empresa:
      setCurrentTenant(null);
      setSession({
        userEmail: cleanEmail,
        role: 'owner',
        tenantId: null as any,
        token: accessToken
      });
    } catch (err) {
      console.error('[AuthProvider] Error sincronizando sesión:', err);
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

          // Si Supabase Auth no tiene sesión válida en este navegador para el proyecto actual:
          // Purgar la sesión zombie para que el usuario pueda autenticarse limpiamente en /login
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
    // Si el usuario ya está autenticado y está en la pantalla de /login -> Directo al sistema
    else if (session && pathname === '/login') {
      if (session.tenantId && session.tenantId !== 'global-admin') {
        router.replace('/dashboard');
      } else if (session.role === 'superadmin') {
        router.replace('/admin');
      } else {
        router.replace('/onboarding');
      }
    }
    // Usuario autenticado con empresa activa que quedó en /onboarding -> Directo a su Dashboard
    else if (session && session.tenantId && session.tenantId !== 'global-admin' && pathname === '/onboarding') {
      router.push('/dashboard');
    }
    // Superadmin global sin empresa que visita /onboarding -> Directo a consola /admin
    else if (session && session.role === 'superadmin' && (!session.tenantId || session.tenantId === 'global-admin') && pathname === '/onboarding') {
      router.push('/admin');
    }
    // Usuario autenticado SIN empresa asignada intentando acceder a rutas privadas -> Configurar empresa (excepto si va a /admin)
    else if (session && (!session.tenantId || session.tenantId === 'global-admin') && session.role !== 'superadmin' && pathname !== '/onboarding' && !pathname.startsWith('/admin') && !isPublic) {
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
