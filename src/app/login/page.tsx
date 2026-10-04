'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { getUserTenant } from '@/app/actions/tenant';
import { isSuperAdminEmail } from '@/lib/core/tenantSecurity';
import { useERPStore } from '@/store/useERPStore';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const { setSession, setCurrentTenant } = useERPStore();

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

      setStatusMessage('Acceso concedido. Preparando entorno...');

      const cleanEmail = email.trim().toLowerCase();
      const user = signInData?.user;
      const result = await getUserTenant(cleanEmail, user?.id);

      if (result.success && result.tenant) {
        setCurrentTenant({
          id: result.tenant.id,
          name: result.tenant.name,
          blocked: !result.tenant.is_active,
          active_modules: result.tenant.active_modules || (result.tenant.metadata as any)?.active_modules || [],
          metadata: result.tenant.metadata,
        });
        setSession({
          userEmail: cleanEmail,
          role: isSuperAdminEmail(cleanEmail) ? 'superadmin' : ((result.role as any) || 'owner'),
          tenantId: result.tenant.id,
          token: signInData?.session?.access_token,
        });
        router.push('/dashboard');
      } else if (isSuperAdminEmail(cleanEmail) || result.role === 'superadmin') {
        setSession({
          userEmail: cleanEmail,
          role: 'superadmin',
          tenantId: 'global-admin',
          token: signInData?.session?.access_token,
        });
        setCurrentTenant({
          id: 'global-admin',
          name: 'Superadmin Console',
          blocked: false,
          active_modules: ['admin', 'config', 'estadisticas']
        });
        router.push('/admin');
      } else {
        // En caso de que no tenga tenant y falle auto-link
        setSession({
          userEmail: cleanEmail,
          role: 'owner',
          tenantId: '',
          token: signInData?.session?.access_token,
        });
        router.push('/dashboard');
      }
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
              label="Correo Electrónico"
              type="email"
              placeholder="tu@empresa.com"
              icon={<Mail size={18} />}
              required
              autoFocus
            />

            <div className="space-y-1">
              <Input
                name="password"
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                icon={<Lock size={18} />}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              isLoading={isLoading}
              disabled={countdown !== null && countdown > 0}
            >
              {countdown !== null && countdown > 0
                ? `Espera ${countdown}s...`
                : isLoading
                ? (statusMessage || 'Ingresando...')
                : 'Ingresar al Sistema'}
            </Button>
          </form>

          {/* Nota de Acceso Privado - Sin botón de Registro */}
          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              🔒 <strong>Acceso Restringido:</strong> Las cuentas son creadas y gestionadas exclusivamente por la administración de la empresa.
            </p>
          </div>
        </div>
      </div>

      {/* Marca de agua / Versión */}
      <div className="fixed bottom-6 text-center w-full pointer-events-none">
        <p className="text-xs font-medium text-slate-400">Rendo · Secure Enterprise Authentication</p>
      </div>
    </div>
  );
}
