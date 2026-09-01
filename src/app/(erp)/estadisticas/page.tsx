'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Package, Users, DollarSign,
  AlertTriangle, Calendar, UserCheck, ShoppingCart,
  BarChart3, RefreshCw, ArrowRight, Activity,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { getItemsAction } from '@/app/actions/items';
import { getEntitiesAction } from '@/app/actions/entities';
import { getDocumentsAction } from '@/app/actions/documents';
import { getIncomeStatementAction } from '@/app/actions/accounting';
import { SkeletonCard, SkeletonCardGrid } from '@/components/ui/SkeletonCard';

/* ─────────────────────────────────────────────
   Tipos internos
───────────────────────────────────────────── */
interface KPICardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  icon: React.ReactNode;
  accentColor: string;      // CSS color var, e.g. 'var(--primary)'
  accentBg: string;         // CSS color var, e.g. 'var(--primary-50)'
  onClick?: () => void;
  linkLabel?: string;
}

interface AlertRow {
  id: string;
  name: string;
  stock: number;
  category: string;
}

interface StatsData {
  // Inventario
  totalItems: number;
  totalInventoryValue: number;
  lowStockAlerts: AlertRow[];
  // Clientes
  totalClients: number;
  totalDebt: number;
  activeClients: number;
  // Ventas (facturas)
  totalInvoicesThisMonth: number;
  revenueThisMonth: number;
  pendingInvoices: number;
  // Compras
  totalPOsOpen: number;
  totalPOsValue: number;
  // Equipo
  totalEmployees: number;
  // Contabilidad
  netIncome: number;
}

/* ─────────────────────────────────────────────
   Componente KPI Card
───────────────────────────────────────────── */
function KPICard({
  label, value, subValue, trend, trendLabel,
  icon, accentColor, accentBg, onClick, linkLabel,
}: KPICardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;
  const trendColor = trend === 'up' ? 'var(--success)' : trend === 'down' ? 'var(--danger)' : 'var(--muted-foreground)';

  return (
    <div
      className={`
        relative bg-card border border-border rounded-2xl p-5
        transition-all duration-200 group
        ${onClick ? 'cursor-pointer hover:border-primary/40 hover:shadow-md hover:shadow-black/5' : ''}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* Ícono */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: accentBg }}
      >
        <span style={{ color: accentColor }}>{icon}</span>
      </div>

      {/* Label */}
      <p className="text-label mb-1">{label}</p>

      {/* Valor principal */}
      <p className="text-h1 font-bold text-foreground leading-none mb-1">{value}</p>

      {/* Sub-valor / tendencia */}
      <div className="flex items-center gap-1.5 mt-2">
        {TrendIcon && (
          <TrendIcon size={13} style={{ color: trendColor }} />
        )}
        {(subValue || trendLabel) && (
          <span className="text-xs" style={{ color: trendColor }}>
            {subValue || trendLabel}
          </span>
        )}
      </div>

      {/* Link de navegación */}
      {onClick && linkLabel && (
        <div
          className="
            absolute bottom-4 right-4 flex items-center gap-1
            text-xs font-medium opacity-0 group-hover:opacity-100
            transition-opacity duration-200
          "
          style={{ color: 'var(--primary)' }}
        >
          {linkLabel}
          <ArrowRight size={12} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Componente de Alerta de Stock
───────────────────────────────────────────── */
function StockAlertRow({ item, onOrder }: { item: AlertRow; onOrder: () => void }) {
  const isEmpty = item.stock <= 0;
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: isEmpty ? 'var(--danger)' : 'var(--warning)' }}
        />
        <div>
          <p className="text-sm font-medium text-foreground">{item.name}</p>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{item.category}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span
          className="badge"
          style={{
            background: isEmpty ? 'var(--danger-50)' : 'var(--warning-50)',
            color: isEmpty ? 'var(--danger)' : 'var(--warning)',
          }}
        >
          {isEmpty ? 'Agotado' : `${item.stock} uds`}
        </span>
        <button
          onClick={onOrder}
          className="btn-base btn-ghost btn-sm"
          title="Emitir orden de compra"
        >
          Reponer
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Formato de moneda
───────────────────────────────────────────── */
function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

/* ─────────────────────────────────────────────
   Página principal
───────────────────────────────────────────── */
export default function EstadisticasPage() {
  const router = useRouter();
  const currentTenant = useTenantResolver();
  const [data, setData] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!currentTenant?.id) return;
      const tenantId = currentTenant.id;

      // Cargar en paralelo para máxima velocidad
      const [
        itemsRes,
        clientsRes,
        invoicesRes,
        posRes,
        employeesRes,
        incomeRes,
      ] = await Promise.allSettled([
        getItemsAction(tenantId, undefined, 200),
        getEntitiesAction(tenantId, 'customer', 200),
        getDocumentsAction(tenantId, 'invoice', 100),
        getDocumentsAction(tenantId, 'purchase_order', 100),
        getEntitiesAction(tenantId, 'employee', 100),
        getIncomeStatementAction(tenantId),
      ]);

      // ── Items / Inventario ──
      const items = itemsRes.status === 'fulfilled' && itemsRes.value.success
        ? itemsRes.value.items : [];
      const products = items.filter((i: unknown) => i.type === 'product');
      const totalItems = products.length;
      const totalInventoryValue = products.reduce(
        (sum: number, i: unknown) => sum + (i.base_price || 0) * (i.stock_quantity || 0), 0
      );
      const lowStockAlerts: AlertRow[] = products
        .filter((i: unknown) => (i.stock_quantity || 0) <= 5)
        .slice(0, 8)
        .map((i: unknown) => ({
          id: i.id,
          name: i.name,
          stock: i.stock_quantity || 0,
          category: i.category || 'General',
        }));

      // ── Clientes ──
      const clients = clientsRes.status === 'fulfilled' && clientsRes.value.success
        ? clientsRes.value.entities : [];
      const totalClients = clients.length;
      const totalDebt = clients.reduce(
        (sum: number, c: unknown) => sum + (c.metadata?.total_debt || 0), 0
      );
      const activeClients = clients.filter((c: unknown) => c.status === 'active').length;

      // ── Facturas (ventas) ──
      const invoices = invoicesRes.status === 'fulfilled' && invoicesRes.value.success
        ? invoicesRes.value.documents : [];
      const now = new Date();
      const thisMonth = invoices.filter((d: unknown) => {
        const issued = new Date(d.issue_date || d.created_at);
        return issued.getMonth() === now.getMonth() && issued.getFullYear() === now.getFullYear();
      });
      const pendingInvoices = invoices.filter(
        (d: unknown) => d.status === 'in_progress' || d.status === 'draft'
      ).length;

      // ── Órdenes de Compra ──
      const pos = posRes.status === 'fulfilled' && posRes.value.success
        ? posRes.value.documents : [];
      const openPOs = pos.filter((d: unknown) => d.status !== 'paid' && d.status !== 'annulled');
      const totalPOsValue = openPOs.reduce(
        (sum: number, d: unknown) =>
          sum + (d.lines || []).reduce((s: number, l: unknown) => s + l.quantity * l.unit_price, 0), 0
      );

      // ── Empleados ──
      const employees = employeesRes.status === 'fulfilled' && employeesRes.value.success
        ? employeesRes.value.entities : [];

      // ── Utilidad Neta (Contabilidad) ──
      const income = incomeRes.status === 'fulfilled' && (incomeRes.value as any).success
        ? (incomeRes.value as any) : null;
      const netIncome = income?.data?.netProfit ?? 0;
      const revenueThisMonth = income?.data?.totalRevenue ?? 0;

      setData({
        totalItems,
        totalInventoryValue,
        lowStockAlerts,
        totalClients,
        totalDebt,
        activeClients,
        totalInvoicesThisMonth: thisMonth.length,
        revenueThisMonth,
        pendingInvoices,
        totalPOsOpen: openPOs.length,
        totalPOsValue,
        totalEmployees: employees.length,
        netIncome,
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[Estadísticas] Error cargando datos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant?.id]);

  useEffect(() => { load(); }, [load]);

  /* ── Render: Loading ── */
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton h-7 w-48 rounded" />
            <div className="skeleton h-3 w-72 rounded" />
          </div>
          <div className="skeleton h-10 w-28 rounded-xl" />
        </div>
        {/* KPI grid skeleton */}
        <SkeletonCardGrid count={6} columns={3} showKPI />
        {/* Alerts skeleton */}
        <SkeletonCard lines={5} className="h-64" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 text-foreground flex items-center gap-2">
            <BarChart3 size={24} style={{ color: 'var(--primary)' }} />
            Estadísticas
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Vista ejecutiva de{' '}
            <span className="font-medium text-foreground">{currentTenant?.name}</span>
            {lastUpdated && (
              <> · Actualizado a las {lastUpdated.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</>
            )}
          </p>
        </div>
        <button
          onClick={load}
          className="btn-base btn-secondary btn-haptic flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw size={15} />
          Actualizar
        </button>
      </div>

      {/* ── Sección 1: Ventas del Período ── */}
      <section>
        <p className="text-label mb-3 flex items-center gap-2">
          <Activity size={12} />
          Ventas del Mes
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KPICard
            label="Ingresos del Mes"
            value={fmt(data.revenueThisMonth)}
            subValue={`${data.totalInvoicesThisMonth} facturas emitidas`}
            trend={data.revenueThisMonth > 0 ? 'up' : 'neutral'}
            icon={<TrendingUp size={20} />}
            accentColor="var(--success)"
            accentBg="var(--success-50)"
            onClick={() => router.push('/contabilidad')}
            linkLabel="Ver contabilidad"
          />
          <KPICard
            label="Facturas Pendientes"
            value={data.pendingInvoices.toString()}
            subValue="Por cobrar"
            trend={data.pendingInvoices > 5 ? 'down' : 'neutral'}
            icon={<DollarSign size={20} />}
            accentColor="var(--warning)"
            accentBg="var(--warning-50)"
            onClick={() => router.push('/caja')}
            linkLabel="Ir a Caja"
          />
          <KPICard
            label="Utilidad Neta"
            value={fmt(data.netIncome)}
            subValue="Período actual"
            trend={data.netIncome > 0 ? 'up' : data.netIncome < 0 ? 'down' : 'neutral'}
            icon={<BarChart3 size={20} />}
            accentColor="var(--primary)"
            accentBg="var(--primary-50)"
            onClick={() => router.push('/contabilidad')}
            linkLabel="Ver libro mayor"
          />
        </div>
      </section>

      {/* ── Sección 2: Inventario ── */}
      <section>
        <p className="text-label mb-3 flex items-center gap-2">
          <Package size={12} />
          Inventario
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KPICard
            label="Total Productos"
            value={data.totalItems.toLocaleString()}
            subValue="en catálogo"
            trend="neutral"
            icon={<Package size={20} />}
            accentColor="var(--info)"
            accentBg="var(--info-50)"
            onClick={() => router.push('/catalogo')}
            linkLabel="Ver catálogo"
          />
          <KPICard
            label="Valor del Inventario"
            value={fmt(data.totalInventoryValue)}
            subValue="costo × stock"
            trend="neutral"
            icon={<DollarSign size={20} />}
            accentColor="var(--success)"
            accentBg="var(--success-50)"
            onClick={() => router.push('/catalogo')}
            linkLabel="Ver catálogo"
          />
          <KPICard
            label="Alertas de Stock"
            value={data.lowStockAlerts.length.toString()}
            subValue={data.lowStockAlerts.length > 0 ? 'productos bajo mínimo' : 'Todo en orden'}
            trend={data.lowStockAlerts.length > 0 ? 'down' : 'up'}
            icon={<AlertTriangle size={20} />}
            accentColor={data.lowStockAlerts.length > 0 ? 'var(--warning)' : 'var(--success)'}
            accentBg={data.lowStockAlerts.length > 0 ? 'var(--warning-50)' : 'var(--success-50)'}
            onClick={() => router.push('/compras')}
            linkLabel="Ir a Compras"
          />
        </div>

        {/* Lista de alertas de stock */}
        {data.lowStockAlerts.length > 0 && (
          <div className="mt-4 bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h3 text-foreground">Productos con Stock Bajo</h3>
              <button
                onClick={() => router.push('/compras')}
                className="btn-base btn-ghost btn-sm"
              >
                Emitir PO <ArrowRight size={13} className="ml-1" />
              </button>
            </div>
            <div>
              {data.lowStockAlerts.map((item) => (
                <StockAlertRow
                  key={item.id}
                  item={item}
                  onOrder={() => router.push(`/compras?item=${item.id}`)}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Sección 3: Clientes & CxC ── */}
      <section>
        <p className="text-label mb-3 flex items-center gap-2">
          <Users size={12} />
          Clientes
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPICard
            label="Total Clientes"
            value={data.totalClients.toLocaleString()}
            subValue={`${data.activeClients} activos`}
            trend="neutral"
            icon={<Users size={20} />}
            accentColor="var(--primary)"
            accentBg="var(--primary-50)"
            onClick={() => router.push('/clientes')}
            linkLabel="Ver clientes"
          />
          <KPICard
            label="Cuentas por Cobrar"
            value={fmt(data.totalDebt)}
            subValue="deuda total de clientes"
            trend={data.totalDebt > 0 ? 'down' : 'up'}
            icon={<DollarSign size={20} />}
            accentColor="var(--danger)"
            accentBg="var(--danger-50)"
            onClick={() => router.push('/clientes')}
            linkLabel="Ver clientes"
          />
          <KPICard
            label="Órdenes de Compra Abiertas"
            value={data.totalPOsOpen.toString()}
            subValue={fmt(data.totalPOsValue) + ' en POs'}
            trend={data.totalPOsOpen > 10 ? 'down' : 'neutral'}
            icon={<ShoppingCart size={20} />}
            accentColor="var(--warning)"
            accentBg="var(--warning-50)"
            onClick={() => router.push('/compras')}
            linkLabel="Ver compras"
          />
        </div>
      </section>

      {/* ── Sección 4: Equipo ── */}
      <section>
        <p className="text-label mb-3 flex items-center gap-2">
          <UserCheck size={12} />
          Equipo
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KPICard
            label="Total Empleados"
            value={data.totalEmployees.toString()}
            subValue="registrados en el sistema"
            trend="neutral"
            icon={<UserCheck size={20} />}
            accentColor="var(--info)"
            accentBg="var(--info-50)"
            onClick={() => router.push('/equipo')}
            linkLabel="Ver equipo"
          />
          <KPICard
            label="Citas Agendadas"
            value="—"
            subValue="Ver calendario para detalle"
            trend="neutral"
            icon={<Calendar size={20} />}
            accentColor="var(--success)"
            accentBg="var(--success-50)"
            onClick={() => router.push('/calendario')}
            linkLabel="Ver calendario"
          />
        </div>
      </section>

    </div>
  );
}
