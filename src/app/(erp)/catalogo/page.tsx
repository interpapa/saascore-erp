'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CatalogoRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/inventario');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex items-center gap-3 text-slate-500 text-sm font-bold">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Redirigiendo al nuevo módulo de Inventario...
      </div>
    </div>
  );
}
