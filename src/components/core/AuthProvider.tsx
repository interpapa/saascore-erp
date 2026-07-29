'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useERPStore } from '@/store/useERPStore';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  isLoading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Rutas que NO requieren autenticación
const PUBLIC_ROUTES = ['/login'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { session } = useERPStore();
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Simula un tick de inicialización para que el store hidrate
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const isPublic = PUBLIC_ROUTES.includes(pathname);

    if (!session && !isPublic) {
      router.push('/login');
    } else if (session && isPublic) {
      router.push('/dashboard');
    }
  }, [session, isLoading, pathname, router]);

  const signOut = () => {
    // En producción: await supabase.auth.signOut()
    // Por ahora limpiamos el store y redirigimos
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
