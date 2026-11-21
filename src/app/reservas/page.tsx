import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Calendar, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export default async function ReservasRootPage() {
  try {
    // Buscar tenants activos
    const { data: tenants, error } = await supabaseAdmin
      .from('tenants')
      .select('id, name, metadata')
      .limit(10);

    if (error) {
      console.warn('[ReservasRootPage] Warning fetching tenants:', error.message);
    }

    // Si existe Consultorio 25, redirigir automáticamente para máxima inmediatez al cliente
    const c25 = tenants?.find(t => 
      (t.metadata as any)?.slug === 'consultorio-25' || 
      (t.name || '').toLowerCase().includes('consultorio 25')
    );

    if (c25) {
      redirect(`/reservas/${(c25.metadata as any)?.slug || c25.id}`);
    }

    if (tenants && tenants.length === 1) {
      redirect(`/reservas/${(tenants[0].metadata as any)?.slug || tenants[0].id}`);
    }

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-foreground font-sans">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <Calendar size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black">Portal de Reservas Online</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Selecciona el centro de atención o especialista para agendar tu cita:
            </p>
          </div>
          <div className="space-y-2 text-left">
            {(tenants || []).map(t => {
              const slug = (t.metadata as any)?.slug || t.id;
              return (
                <Link
                  key={t.id}
                  href={`/reservas/${slug}`}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-all font-bold text-sm"
                >
                  <span>{t.name}</span>
                  <ArrowRight size={16} className="text-emerald-500" />
                </Link>
              );
            })}
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Rendo ERP &bull; Sistema de Citas Seguro</span>
          </div>
        </div>
      </div>
    );
  } catch (err: any) {
    // Si es una redirección intencional de Next.js, re-lanzarla para que Next.js la complete
    if (err && typeof err === 'object' && ('digest' in err || 'message' in err)) {
      const digest = String(err.digest || err.message || '');
      if (digest.includes('NEXT_REDIRECT')) {
        throw err;
      }
    }

    console.error('[ReservasRootPage Error]:', err?.message || err);
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-foreground font-sans">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <Calendar size={32} />
          </div>
          <h1 className="text-xl font-bold">Portal de Reservas Online</h1>
          <p className="text-sm text-slate-500">
            Estamos conectando con el sistema de turnos. Si tarda más de lo esperado, pulsa para recargar.
          </p>
          <div className="pt-2">
            <a 
              href="/reservas" 
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition"
            >
              <RefreshCw size={14} /> Recargar Portal
            </a>
          </div>
        </div>
      </div>
    );
  }
}
