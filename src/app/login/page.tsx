'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLogin, setIsLogin] = useState(true);

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
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      }
      // Redirección manejada por el AuthProvider
    } catch (err: any) {
      setError(err.message || 'Error en la autenticación');
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
            {isLogin ? 'Accede a tu cuenta de SaaSCore' : 'Únete a SaaSCore y gestiona tu negocio'}
          </p>
        </div>

        {/* Formulario */}
        <div className="px-8 pb-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl font-medium animate-in slide-in-from-top-2">
                {error}
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
            >
              {isLogin ? 'Ingresar al Sistema' : 'Crear Cuenta'}
            </Button>
          </form>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem('bypass_auth', 'true');
                  window.location.href = '/dashboard';
                }
              }}
              className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              ⚡ Saltar inicio de sesión (Modo de Prueba)
            </button>
          </div>

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
        </div>

      </div>

      {/* Marca de agua / Versión */}
      <div className="fixed bottom-6 text-center w-full pointer-events-none">
        <p className="text-xs font-medium text-slate-400">SaaSCore ERP · Secure Authentication</p>
      </div>

    </div>
  );
}
