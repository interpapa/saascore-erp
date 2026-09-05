'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [pendingVerification, setPendingVerification] = useState<{ email: string; pass: string } | null>(null);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCountdown(null);
       
      setError(null);
      return;
    }
    const timer = setTimeout(() => {
      setCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (!pendingVerification) return;

    let active = true;
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: pendingVerification.email,
          password: pendingVerification.pass,
        });

        if (!error && data?.session) {
          clearInterval(interval);
          if (active) {
            setPendingVerification(null);
            // El AuthProvider detectará la sesión activa y redirigirá al dashboard
          }
        }
      } catch (_err) {
        // Ignorar fallos de red durante el polling
      }
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [pendingVerification]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        // Si la cuenta se crea pero requiere confirmación por email
        if (data && !data.session) {
          setPendingVerification({ email, pass: password });
          setIsLoading(false);
          return;
        }
      }
      // Redirección manejada por el AuthProvider
    } catch (err: unknown) {
      const rawMessage = (err as Error).message || 'Error en la autenticación';
      
      // Intentar extraer segundos de rate limit
      if (rawMessage.toLowerCase().includes('rate limit') || rawMessage.toLowerCase().includes('too many requests') || rawMessage.toLowerCase().includes('seconds')) {
        const secondsMatch = rawMessage.match(/\d+/);
        if (secondsMatch) {
          const seconds = parseInt(secondsMatch[0], 10);
          setCountdown(seconds);
          setError(`Límite de intentos excedido. Por favor, espera ${seconds} segundos antes de intentar de nuevo.`);
          setIsLoading(false);
          return;
        }
      }

      // Traducir otros errores conocidos
      if (rawMessage.includes('Invalid login credentials')) {
        setError('El correo o la contraseña son incorrectos. Por favor, verifícalos.');
      } else if (rawMessage.toLowerCase().includes('email not confirmed') || rawMessage.toLowerCase().includes('confirm your email')) {
        setError('Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.');
      } else if (rawMessage.includes('User already registered')) {
        setError('Este correo electrónico ya está registrado. Intenta iniciar sesión.');
      } else if (rawMessage.toLowerCase().includes('invalid api key')) {
        setError('Error de configuración: Clave de API inválida en el servidor. Verifica las credenciales de tu proyecto.');
      } else {
        setError(rawMessage);
      }
    } finally {
      setIsLoading(false);
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
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            {isLogin ? 'Accede a tu cuenta de Rendo' : 'Únete a Rendo y gestiona tu negocio'}
          </p>
        </div>

        {/* Formulario / Pantalla de Espera */}
        <div className="px-8 pb-10">
          {pendingVerification ? (
            <div className="text-center space-y-6 animate-in fade-in duration-300 py-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto flex items-center justify-center text-primary">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-foreground">Confirmación enviada</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Enviamos un enlace a <strong className="text-primary">{pendingVerification.email}</strong>.
                </p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Confirma el correo desde tu teléfono u otro dispositivo. Esta pantalla se desbloqueará de forma automática tan pronto lo hagas.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPendingVerification(null)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-wider"
              >
                Cancelar y Volver al Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl font-medium animate-in slide-in-from-top-2">
                  {countdown !== null && countdown > 0 
                    ? `Límite de intentos excedido. Por favor, espera ${countdown} segundos antes de intentar de nuevo.`
                    : error
                  }
                </div>
              )}
              
              <Input 
                name="email"
                label="Correo Electrónico" 
                type="email" 
                placeholder="tu@empresa.com"
                icon={<Mail size={18} />}
                required
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
                <div className="flex justify-end pt-1">
                  <a href="#" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
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
                  : (isLogin ? 'Ingresar al Sistema' : 'Crear Cuenta')
                }
              </Button>
            </form>
          )}

          {!pendingVerification && (
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                <button 
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  {isLogin ? 'Regístrate aquí' : 'Inicia Sesión'}
                </button>
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Marca de agua / Versión */}
      <div className="fixed bottom-6 text-center w-full pointer-events-none">
        <p className="text-xs font-medium text-slate-400">Rendo · Secure Authentication</p>
      </div>

    </div>
  );
}
