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

    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string || '').trim().toLowerCase();
    const password = formData.get('password') as string;

    if (!email || !password) {
      setError('Por favor, ingresa tu correo y contraseña.');
      setIsLoading(false);
      return;
    }

    try {
      setStatusMessage('Verificando credenciales...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      setStatusMessage('Acceso concedido. Entrando al sistema...');

      const cleanEmail = email.trim().toLowerCase();
      const isSuper = isSuperAdminEmail(cleanEmail);

      let tenantId = PRIMARY_DEFAULT_TENANT_ID;
      let tenantName = 'rendo CORP';
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
        console.warn('[LoginPage] Usando tenant activo principal por defecto:', tErr);
      }

      // 1. Guardar de inmediato en el store de Zustand (persiste en localStorage sincronizadamente)
      useERPStore.getState().setCurrentTenant({
        id: tenantId,
        name: tenantName,
        blocked: false,
        active_modules: tenantModules,
        metadata: tenantMetadata,
      });

      useERPStore.getState().setSession({
        userEmail: cleanEmail,
        role: userRole,
        tenantId: tenantId,
        token: signInData.session?.access_token,
      });

      // 2. Redirigir de inmediato al panel
      const targetUrl = userRole === 'superadmin' ? '/admin' : '/dashboard';
      router.replace(targetUrl);
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
        setError('El correo o la contraseña son incorrectos. Por favor, verifica tus datos de acceso.');
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
          <form onSubmit={handleSubmit} className="space-y-5">
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
              type="email"
              label="Correo Electrónico"
              placeholder="tu@negocio.com"
              icon={<Mail size={18} />}
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
