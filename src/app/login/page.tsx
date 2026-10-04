'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ShieldCheck, UserPlus, LogIn, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { registerUserAction, getUserTenant } from '@/app/actions/tenant';
import { isSuperAdminEmail } from '@/lib/core/tenantSecurity';
import { useERPStore } from '@/store/useERPStore';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
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
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!email || !password) {
      setError('Por favor, ingresa tu correo y contraseña.');
      setIsLoading(false);
      return;
    }

    try {
      if (isLogin) {
        // --- MODO INICIAR SESIÓN ---
        setStatusMessage('Verificando credenciales...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        setStatusMessage('Acceso concedido. Preparando entorno...');

        // Determinar destino directamente
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
          router.push('/admin');
        } else {
          // Nueva cuenta sin empresa configurada: llevar a onboarding
          setSession({
            userEmail: cleanEmail,
            role: 'owner',
            tenantId: '',
            token: signInData?.session?.access_token,
          });
          setCurrentTenant(null);
          router.push('/onboarding');
        }
      } else {
        // --- MODO REGISTRO / CREAR CUENTA ---
        if (password.length < 6) {
          setError('La contraseña debe contener al menos 6 caracteres.');
          setIsLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden. Por favor, verifícalas.');
          setIsLoading(false);
          return;
        }

        setStatusMessage('Creando cuenta segura...');
        const regResult = await registerUserAction(email, password);

        if (!regResult.success) {
          setError(regResult.error || 'Error al crear la cuenta.');
          setIsLoading(false);
          return;
        }

        setStatusMessage('Iniciando sesión automáticamente...');
        const { data: signInData, error: autoSignInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (autoSignInError) throw autoSignInError;

        setStatusMessage('Cuenta lista. Configurando tu empresa...');
        setSession({
          userEmail: email,
          role: 'owner',
          tenantId: '',
          token: signInData?.session?.access_token,
        });
        setCurrentTenant(null);
        router.push('/onboarding');
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
        setError(
          'El correo o la contraseña son incorrectos. Si aún no tienes una cuenta registrada en Rendo, haz clic en la pestaña "Crear Cuenta" para registrarte.'
        );
      } else if (rawMessage.toLowerCase().includes('email not confirmed')) {
        setError('Debes confirmar tu correo electrónico antes de ingresar. Revisa tu bandeja de entrada.');
      } else if (rawMessage.toLowerCase().includes('user already registered') || rawMessage.toLowerCase().includes('already registered')) {
        setError('Este correo ya está registrado en Rendo. Por favor, cambia a la pestaña "Iniciar Sesión".');
      } else {
        setError(rawMessage);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 selection:bg-primary/30">
      <div className="w-full max-w-[440px] bg-card rounded-[24px] shadow-2xl border border-border overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Cabecera del Formulario con selector de pestaña */}
        <div className="pt-8 px-8 pb-4 text-center">
          <div className="w-12 h-12 bg-primary rounded-xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-primary/20">
            <ShieldCheck className="text-primary-foreground w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            {isLogin ? 'Accede a tu cuenta de Rendo ERP' : 'Regístrate y configura tu empresa en segundos'}
          </p>

          {/* Selector de Modo (Tabs) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl mt-6 border border-border">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError(null);
                setStatusMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                isLogin
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-slate-500 hover:text-foreground'
              }`}
            >
              <LogIn size={14} />
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setError(null);
                setStatusMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                !isLogin
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-slate-500 hover:text-foreground'
              }`}
            >
              <UserPlus size={14} />
              Crear Cuenta
            </button>
          </div>
        </div>

        {/* Formulario */}
        <div className="px-8 pb-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm p-3.5 rounded-xl font-medium leading-relaxed animate-in slide-in-from-top-2">
                {countdown !== null && countdown > 0
                  ? `Límite de intentos excedido. Espera ${countdown} segundos.`
                  : error}
              </div>
            )}

            {statusMessage && (
              <div className="bg-primary/10 border border-primary/20 text-primary text-sm p-3 rounded-xl font-medium flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 size={16} className="animate-spin" />
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
                placeholder={isLogin ? '••••••••' : 'Mínimo 6 caracteres'}
                icon={<Lock size={18} />}
                required
              />
            </div>

            {!isLogin && (
              <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                <Input
                  name="confirmPassword"
                  label="Confirmar Contraseña"
                  type="password"
                  placeholder="Repite tu contraseña"
                  icon={<Lock size={18} />}
                  required
                />
              </div>
            )}

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
                ? (statusMessage || 'Procesando...')
                : isLogin
                ? 'Ingresar al Sistema'
                : 'Registrar y Empezar'}
            </Button>
          </form>

          {/* Alternar modo */}
          <div className="mt-6 pt-5 border-t border-border text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {isLogin ? '¿Aún no tienes cuenta? ' : '¿Ya tienes una cuenta registrada? '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setStatusMessage(null);
                }}
                className="text-primary font-bold hover:underline ml-1"
              >
                {isLogin ? 'Regístrate aquí' : 'Inicia Sesión aquí'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Marca de agua */}
      <div className="fixed bottom-6 text-center w-full pointer-events-none">
        <p className="text-xs font-medium text-slate-400">Rendo · Secure Enterprise Authentication</p>
      </div>
    </div>
  );
}
