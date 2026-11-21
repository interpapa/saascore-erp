import { supabaseAdmin } from '@/lib/supabaseAdmin';
import BookingClient from '@/components/reservas/BookingClient';
import { normalizeHexColor } from '@/lib/theme/colorUtils';
import { Calendar, RefreshCw, ArrowLeft, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ReservasPublicPage({ 
  params 
}: { 
  params: Promise<{ tenantId: string }> | { tenantId: string } 
}) {
  try {
    // 1. Resuelve params de manera compatible con Next.js 15+
    const resolvedParams = await params;
    const tenantId = resolvedParams?.tenantId ? String(resolvedParams.tenantId).trim() : '';

    if (!tenantId) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-foreground">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-4">
            <ShieldAlert size={40} className="mx-auto text-amber-500" />
            <h1 className="text-xl font-bold">Identificador de reserva faltante</h1>
            <p className="text-sm text-slate-500">Por favor accede utilizando el enlace provisto por el consultorio o especialista.</p>
            <Link href="/reservas" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition">
              <ArrowLeft size={14} /> Ir al Directorio
            </Link>
          </div>
        </div>
      );
    }

    // 2. Fetch Tenant (Búsqueda ultra-resiliente por UUID, Slug o Nombre)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId);
    let tenant: any = null;

    if (isUuid) {
      const { data } = await supabaseAdmin
        .from('tenants')
        .select('id, name, metadata')
        .eq('id', tenantId)
        .maybeSingle();
      tenant = data;
    }

    if (!tenant) {
      const decodedSlug = decodeURIComponent(tenantId).trim().toLowerCase();
      // Búsqueda en catálogo de tenants
      const { data: allTenants } = await supabaseAdmin
        .from('tenants')
        .select('id, name, metadata')
        .limit(50);

      if (allTenants && allTenants.length > 0) {
        tenant = allTenants.find(t => {
          const metaSlug = String((t.metadata as any)?.slug || '').trim().toLowerCase();
          const nameNorm = String(t.name || '').trim().toLowerCase();
          const idNorm = String(t.id || '').trim().toLowerCase();
          
          return (
            metaSlug === decodedSlug ||
            idNorm === decodedSlug ||
            nameNorm.includes(decodedSlug) ||
            decodedSlug.includes(nameNorm) ||
            (decodedSlug.includes('consultorio-25') && (nameNorm.includes('consultorio 25') || metaSlug.includes('consultorio-25')))
          );
        });
      }
    }

    if (!tenant) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-foreground">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <Calendar size={32} />
            </div>
            <h1 className="text-xl font-bold">Empresa o Especialista no encontrado</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No localizamos una agenda activa con el identificador <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{tenantId}</code>.
            </p>
            <div className="pt-2">
              <Link href="/reservas" className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition">
                <ArrowLeft size={14} /> Ver todas las empresas
              </Link>
            </div>
          </div>
        </div>
      );
    }

    // 3. Fetch Employees usando el ID real del tenant
    let employees: any[] = [];
    try {
      const { data: employeesData } = await supabaseAdmin
        .from('entities')
        .select('id, name, metadata, status')
        .eq('tenant_id', tenant.id)
        .in('type', ['employee', 'doctor', 'staff'])
        .is('deleted_at', null);

      employees = (employeesData || [])
        .filter(e => {
          if (e.status === 'inactive' || e.status === 'deleted') return false;
          if (e.metadata?.bookable === false) return false;
          const name = (e.name || '').trim();
          if (/^(Colaborador|Especialista|Usuario|Doctor)\s+QA\b/i.test(name)) return false;
          const isPhysicalResource = e.metadata?.is_resource === true || e.metadata?.role_title === 'Espacio / Recurso';
          const svcs = Array.isArray(e.metadata?.services) ? e.metadata.services : [];
          if (isPhysicalResource && svcs.length === 0) return false;
          return true;
        })
        .map(e => ({
          id: e.id,
          name: e.name,
          role: e.metadata?.role_title || e.metadata?.doctor_config?.specialty || e.metadata?.doctor_config?.role || e.metadata?.specialty || e.metadata?.dentist_config?.role || e.metadata?.role || (e as any).role || e.metadata?.cargo || 'Especialista',
          is_active: e.status !== 'inactive',
          metadata: e.metadata || {}
        }));
    } catch (empErr) {
      console.warn('[Reservas] Error fetching employees (non-blocking):', empErr);
    }

    // 4. Fetch Catalog Services
    let catalogServices: any[] = [];
    try {
      const { data: catalogItems } = await supabaseAdmin
        .from('items')
        .select('id, name, description, category, base_price, metadata')
        .eq('tenant_id', tenant.id)
        .eq('type', 'service')
        .neq('is_active', false)
        .is('deleted_at', null);
      if (catalogItems) catalogServices = catalogItems;
    } catch (itemErr) {
      console.warn('[Reservas] Error fetching catalog items (non-blocking):', itemErr);
    }

    // 5. Normalizar Theme y sanitizar props
    const publicTheme = tenant.metadata?.public_theme || {};
    const theme = {
      bgColor: normalizeHexColor(publicTheme.bgColor, "#f8fafc"),
      btnColor: normalizeHexColor(publicTheme.btnColor, "#0B3B24"),
    };

    // Serialización limpia para prevenir cualquier error de RSC entre Server y Client Components
    const safeTenant = JSON.parse(JSON.stringify(tenant));
    const safeEmployees = JSON.parse(JSON.stringify(employees));
    const safeCatalogServices = JSON.parse(JSON.stringify(catalogServices));
    const safeTheme = JSON.parse(JSON.stringify(theme));

    return (
      <BookingClient 
        tenant={safeTenant} 
        employees={safeEmployees} 
        catalogServices={safeCatalogServices} 
        theme={safeTheme} 
      />
    );

  } catch (fatalErr: any) {
    console.error('[ReservasPublicPage Fatal Render Error]:', fatalErr?.message || fatalErr);
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-foreground">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <Calendar size={32} />
          </div>
          <h1 className="text-xl font-bold">Portal de Reservas Online</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Estamos actualizando los horarios y servicios en tiempo real. Por favor reintenta en unos instantes.
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
