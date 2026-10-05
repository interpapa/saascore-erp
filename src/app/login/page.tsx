'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { getUserTenant } from '@/app/actions/tenant';
import { isSuperAdminEmail } from '@/lib/core/tenantSecurity';
import { DEFAULT_ENABLED_MODULES } from '@/lib/core/kernel/moduleRegistry';
import { useERPStore } from '@/store/useERPStore';

const PRIMARY_DEFAULT_TENANT_ID = '31ec279c-4216-48e1-905c-fbf4ea398e04';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const activeSession = useERPStore((s) => s.session);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      setError(null);
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setStatusMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const rawPassword = password;
    const trimmedPassword = password.trim();

    if (!cleanEmail || !rawPassword) {
      setError('Por favor, ingresa tu correo y contraseña.');
      setIsLoading(false);
      return;
    }

    try {
      setStatusMessage('Verificando credenciales...');
      let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: rawPassword,
      });

      // Si falla y la contraseña tenía espacios adicionales al copiar/pegar, reintentar con trimmedPassword
      if (signInError && rawPassword !== trimmedPassword) {
        const retry = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: trimmedPassword,
        });
        if (!retry.error) {
          signInData = retry.data;
          signInError = null;
        }
      }

      if (signInError) throw signInError;

      setStatusMessage('Acceso concedido. Entrando al sistema...');

      const isSuper = isSuperAdminEmail(cleanEmail);

      let tenantId: string | null = null;
      let tenantName: string | null = null;
      let tenantModules = DEFAULT_ENABLED_MODULES;
      let tenantMetadata: any = {};
      let userRole: any = isSuper ? 'superadmin' : 'owner';

      try {
        const result = await getUserTenant(cleanEmail, signInData.user?.id);
        if (result?.success && result.tenant) {
          tenantId = result.tenant.id;
          tenantName = result.tenant.name;
          tenantModules = result.tenant.active_modules || DEFAULT_ENABLED_MODULES;
          tenantMetadata = result.tenant.metadata || {};
          if (result.role) userRole = result.role;
        }
      } catch (tErr) {
        console.warn('[LoginPage] Error consultando empresa del usuario:', tErr);
      }

      if (tenantId && tenantName) {
        // Usuario con empresa existente vinculada -> Directo al panel principal (Dashboard)
        useERPStore.getState().setCurrentTenant({
          id: tenantId,
          name: tenantName,
          blocked: false,
          active_modules: tenantModules,
          metadata: tenantMetadata,
        });

        useERPStore.getState().setSession({
          userEmail: cleanEmail,
          role: isSuper ? 'superadmin' : userRole,
          tenantId: tenantId,
          token: signInData.session?.access_token,
        });

        router.replace('/dashboard');
        return;
      }

      if (isSuper || userRole === 'superadmin') {
        // Superadmin global sin empresa vinculada -> Consola maestra
        useERPStore.getState().setSession({
          userEmail: cleanEmail,
          role: 'superadmin',
          tenantId: 'global-admin',
          token: signInData.session?.access_token,
        });
        useERPStore.getState().setCurrentTenant({
          id: 'global-admin',
          name: 'Superadmin Console',
          blocked: false,
          active_modules: ['admin', 'config', 'estadisticas'],
        });
        router.replace('/admin');
        return;
      }

      // Usuario nuevo sin empresa asociada -> Configurar su empresa (Onboarding)
      useERPStore.getState().setCurrentTenant(null);
      useERPStore.getState().setSession({
        userEmail: cleanEmail,
        role: 'owner',
        tenantId: null as any,
        token: signInData.session?.access_token,
      });

      router.replace('/onboarding');
      return;
    } catch (err: unknown) {
      setIsLoading(false);
      setStatusMessage(null);
      const rawMessage = (err as Error).message || 'Error en la autenticación';

      if (rawMessage.toLowerCase().includes('rate limit') || rawMessage.toLowerCase().includes('too many requests')) {
        const secondsMatch = rawMessage.match(/\d+/);
        const seconds = secondsMatch ? parseInt(secondsMatch[0], 10) : 30;
        setCountdown(seconds);
        setError(`Límite de intentos alcanzado. Espera ${seconds} segundos antes de reintentar.`);
        return;
      }

      if (rawMessage.includes('Invalid login credentials')) {
        setError('El correo o la contraseña no coinciden con los registrados en Supabase. Verifica que el correo esté dado de alta y la contraseña sea exacta.');
      } else if (rawMessage.toLowerCase().includes('email not confirmed')) {
        setError('Debes confirmar tu correo electrónico antes de ingresar. Revisa tu bandeja de entrada en Supabase.');
      } else {
        setError(rawMessage);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 selection:bg-primary/30">
      <div className="w-full max-w-[420px] bg-card rounded-[24px] shadow-2xl border border-border overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Cabecera del Formulario */}
        <div className="pt-10 px-8 pb-6 text-center">
          <div className="w-12 h-12 bg-primary rounded-xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-primary/20">
            <ShieldCheck className="text-primary-foreground w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">
            Iniciar Sesión
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            Accede a tu cuenta de Rendo
          </p>
        </div>

        {/* Formulario */}
        <div className="px-8 pb-10">
          {activeSession?.userEmail && (
            <div className="mb-5 p-3.5 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between text-xs animate-in fade-in">
              <div className="min-w-0 pr-2">
                <span className="font-bold text-foreground block">Sesión activa:</span>
                <span className="text-slate-500 font-medium truncate block">{activeSession.userEmail}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => router.push(activeSession.tenantId && activeSession.tenantId !== 'global-admin' ? '/dashboard' : '/admin')}
                  className="px-2.5 py-1.5 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors text-[11px]"
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    useERPStore.getState().setSession(null);
                    useERPStore.getState().setCurrentTenant(null);
                    setEmail('');
                    setPassword('');
                  }}
                  className="px-2 py-1.5 bg-slate-200 dark:bg-slate-800 text-foreground font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-[11px]"
                >
                  Salir
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm p-3.5 rounded-xl font-medium leading-relaxed animate-in slide-in-from-top-2">
                {countdown !== null && countdown > 0
                  ? `Límite de intentos excedido. Espera ${countdown} segundos.`
                  : error}
              </div>
            )}

            {statusMessage && (
              <div className="bg-primary/10 border border-primary/20 text-primary text-sm p-3 rounded-xl font-medium flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 size={16} className="animate-spin shrink-0" />
                {statusMessage}
              </div>
            )}

            <Input
              name="email"
              type="text"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              label="Correo Electrónico"
              placeholder="tu@negocio.com"
              icon={<Mail size={18} />}
              value={email}
              onChange={(e) => setEmail(e.target.value.replace(/\s+/g, '').toLowerCase())}
              required
              autoFocus
              disabled={isLoading || countdown !== null}
            />

            <Input
              name="password"
              type="password"
              label="Contraseña"
              placeholder="••••••••"
              icon={<Lock size={18} />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading || countdown !== null}
            />

            <Button
              type="submit"
              className="w-full mt-2 font-bold py-2.5 rounded-xl shadow-md transition-all active:scale-[0.98]"
              size="lg"
              isLoading={isLoading}
              disabled={isLoading || countdown !== null}
            >
              Ingresar al Sistema
            </Button>
          </form>
        </div>

        {/* Footer Informativo */}
        <div className="py-4 bg-muted/40 border-t border-border/50 text-center text-xs text-muted-foreground">
          Gestión de accesos centralizada vía Supabase
        </div>

      </div>
    </div>
  );
}
