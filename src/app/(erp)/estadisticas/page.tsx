'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  Package,
  Users,
  DollarSign,
  AlertTriangle,
  Calendar,
  UserCheck,
  ShoppingCart,
  BarChart3,
  RefreshCw,
  ArrowRight,
  Activity,
  Download,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Building2,
  ChevronRight,
  Wallet,
  Receipt,
  Layers,
  Award,
  AlertCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useActionActor } from '@/hooks/useActionActor';
import { getItemsAction } from '@/app/actions/items';
import { getEntitiesAction } from '@/app/actions/entities';
import { getDocumentsAction } from '@/app/actions/documents';
import { getIncomeStatementAction } from '@/app/actions/accounting';
import { getAppointmentsAction } from '@/app/actions/appointments';
import { getCashSessionStatusAction, CashSession } from '@/app/actions/cashRegister';
import { getAttendanceLogsAction } from '@/app/actions/attendance';
import { exportToCSV, CSVColumn } from '@/lib/core/exportToCSV';
import { SkeletonCard, SkeletonCardGrid } from '@/components/ui/SkeletonCard';
import { Appointment } from '@/types/calendario';
import { isModuleActive } from '@/lib/core/kernel/moduleRegistry';

/* ─────────────────────────────────────────────
   Tipos del Dominio de BI
───────────────────────────────────────────── */
export type PeriodType = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';
export type TabType = 'overview' | 'sales' | 'inventory' | 'operations';

interface KPICardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  icon: React.ReactNode;
  accentColor: string;
  accentBg: string;
  onClick?: () => void;
  linkLabel?: string;
}

interface AlertRow {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  category: string;
}

interface PaymentMethodStat {
  method: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
}

interface SalesBucket {
  label: string;
  amount: number;
  count: number;
}

interface TopProductStat {
  name: string;
  units: number;
  revenue: number;
  share: number;
}

interface TopClientStat {
  id?: string;
  name: string;
  purchases: number;
  totalSpent: number;
}

interface CategoryStat {
  name: string;
  count: number;
  totalCost: number;
  totalSale: number;
}

interface DayOfWeekStat {
  dayIndex: number;
  dayName: string;
  amount: number;
  count: number;
  percentage: number;
}

interface PeakHourStat {
  hour: number;
  label: string;
  amount: number;
  count: number;
}

interface TopProfitableProductStat {
  name: string;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number;
}

/* ─────────────────────────────────────────────
   Helper: Filtrado por Período
───────────────────────────────────────────── */
function isDateInPeriod(
  dateStr: string | null | undefined,
  period: PeriodType,
  customStart?: string,
  customEnd?: string
): boolean {
  if (!dateStr) return false;
  if (period === 'all') return true;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();

  if (period === 'today') {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }
  if (period === 'week') {
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= oneWeekAgo && d <= now;
  }
  if (period === 'month') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (period === 'year') {
    return d.getFullYear() === now.getFullYear();
  }
  if (period === 'custom') {
    if (!customStart || !customEnd) return true;
    const toYMD = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const itemYMD = toYMD(d);
    return itemYMD >= customStart && itemYMD <= customEnd;
  }
  return true;
}

/* ─────────────────────────────────────────────
   Formato de Moneda y Números
───────────────────────────────────────────── */
function fmt(n: number): string {
  if (isNaN(n) || n === null || n === undefined) return '$0.00';
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

/* ─────────────────────────────────────────────
   Componente KPI Card
───────────────────────────────────────────── */
function KPICard({
  label,
  value,
  subValue,
  trend,
  trendLabel,
  icon,
  accentColor,
  accentBg,
  onClick,
  linkLabel,
}: KPICardProps) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null;
  const trendColor =
    trend === 'up'
      ? 'var(--success)'
      : trend === 'down'
      ? 'var(--danger)'
      : 'var(--muted-foreground)';

  return (
    <div
      className={`
        relative bg-card border border-border rounded-2xl p-5
        transition-all duration-200 group
        ${onClick ? 'cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5' : ''}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
          style={{ background: accentBg }}
        >
          <span style={{ color: accentColor }}>{icon}</span>
        </div>
        {onClick && linkLabel && (
          <span
            className="flex items-center gap-0.5 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: 'var(--primary)' }}
          >
            {linkLabel}
            <ChevronRight size={14} />
          </span>
        )}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>

      <p className="text-2xl sm:text-3xl font-bold text-foreground leading-tight tracking-tight mb-2">
        {value}
      </p>

      <div className="flex items-center gap-1.5 min-h-4">
        {TrendIcon && <TrendIcon size={14} style={{ color: trendColor }} />}
        {(subValue || trendLabel) && (
          <span className="text-xs font-medium" style={{ color: trendColor }}>
            {subValue || trendLabel}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Página Principal: Centro de Estadísticas & BI
───────────────────────────────────────────── */
export default function EstadisticasPage() {
  const router = useRouter();
  const currentTenant = useTenantResolver();
  const actor = useActionActor();

  const [period, setPeriod] = useState<PeriodType>('month');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Raw Database Records
  const [rawItems, setRawItems] = useState<any[]>([]);
  const [rawClients, setRawClients] = useState<any[]>([]);
  const [rawInvoices, setRawInvoices] = useState<any[]>([]);
  const [rawPOs, setRawPOs] = useState<any[]>([]);
  const [rawEmployees, setRawEmployees] = useState<any[]>([]);
  const [rawAppointments, setRawAppointments] = useState<Appointment[]>([]);
  const [rawAttendanceLogs, setRawAttendanceLogs] = useState<any[]>([]);
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [accountingIncome, setAccountingIncome] = useState<any>(null);

  // Detección de Módulos Habilitados (Arquitectura Desacoplada y Adaptativa)
  const tenantModules = (currentTenant?.active_modules && currentTenant.active_modules.length > 0)
    ? currentTenant.active_modules
    : ((currentTenant?.metadata as any)?.active_modules && Array.isArray((currentTenant?.metadata as any).active_modules) && (currentTenant?.metadata as any).active_modules.length > 0)
      ? (currentTenant?.metadata as any).active_modules
      : null;

  const hasCaja = isModuleActive(tenantModules, 'caja');
  const hasInventario = isModuleActive(tenantModules, 'inventario');
  const hasCalendario = isModuleActive(tenantModules, 'calendario');
  const hasEquipo = isModuleActive(tenantModules, 'equipo');
  const hasCompras = isModuleActive(tenantModules, 'compras');
  const hasCRM = isModuleActive(tenantModules, 'clientes');

  // Si inventario está inactivo y el usuario estaba en esa pestaña, redirigir a overview
  useEffect(() => {
    if (!hasInventario && activeTab === 'inventory') {
      setActiveTab('overview');
    }
  }, [hasInventario, activeTab]);

  /* ─────────────────────────────────────────────
     Carga de Datos Concurrente y 100% Real (Adaptativa)
  ───────────────────────────────────────────── */
  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!currentTenant?.id || !actor) return;
      const tenantId = currentTenant.id;

      const [
        itemsRes,
        clientsRes,
        invoicesRes,
        posRes,
        employeesRes,
        appointmentsRes,
        cashRes,
        attendanceRes,
        incomeRes,
      ] = await Promise.allSettled([
        hasInventario ? getItemsAction(tenantId, undefined, 500, actor) : Promise.resolve({ success: true, items: [] }),
        hasCRM ? getEntitiesAction(tenantId, 'customer', 500, actor) : Promise.resolve({ success: true, entities: [] }),
        getDocumentsAction(tenantId, 'invoice', 500, actor),
        hasCompras ? getDocumentsAction(tenantId, 'purchase_order', 500, actor) : Promise.resolve({ success: true, documents: [] }),
        hasEquipo ? getEntitiesAction(tenantId, 'employee', 100, actor) : Promise.resolve({ success: true, entities: [] }),
        hasCalendario ? getAppointmentsAction(tenantId, undefined, actor) : Promise.resolve({ success: true, appointments: [] }),
        hasCaja ? getCashSessionStatusAction(tenantId, actor) : Promise.resolve({ success: true, session: null }),
        hasEquipo ? getAttendanceLogsAction(tenantId, actor) : Promise.resolve({ success: true, logs: [] }),
        getIncomeStatementAction(tenantId, { preset: 'all' } as any, actor),
      ]);

      if (itemsRes.status === 'fulfilled' && itemsRes.value.success) {
        setRawItems(itemsRes.value.items || []);
      }
      if (clientsRes.status === 'fulfilled' && clientsRes.value.success) {
        setRawClients(clientsRes.value.entities || []);
      }
      if (invoicesRes.status === 'fulfilled' && invoicesRes.value.success) {
        setRawInvoices(invoicesRes.value.documents || []);
      }
      if (posRes.status === 'fulfilled' && posRes.value.success) {
        setRawPOs(posRes.value.documents || []);
      }
      if (employeesRes.status === 'fulfilled' && employeesRes.value.success) {
        setRawEmployees(employeesRes.value.entities || []);
      }
      if (appointmentsRes.status === 'fulfilled' && appointmentsRes.value.success) {
        setRawAppointments(appointmentsRes.value.appointments || []);
      }
      if (cashRes.status === 'fulfilled' && cashRes.value.success) {
        setCashSession(cashRes.value.session ?? null);
      }
      if (attendanceRes.status === 'fulfilled' && attendanceRes.value.success) {
        setRawAttendanceLogs(attendanceRes.value.logs || []);
      }
      if (incomeRes.status === 'fulfilled' && (incomeRes.value as any).success) {
        setAccountingIncome((incomeRes.value as any).data);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('[Estadísticas] Error cargando métricas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant?.id, actor, hasInventario, hasCRM, hasCompras, hasEquipo, hasCalendario, hasCaja]);

  useEffect(() => {
    load();
  }, [load]);

  /* ─────────────────────────────────────────────
     Cálculos Fácticos y Análisis de Negocio (Zero-Fake)
  ───────────────────────────────────────────── */
  const metrics = useMemo(() => {
    // 0. Métricas de HOY (Facturación de Hoy vs Compras/Gastos de Hoy)
    const todayInvoices = rawInvoices.filter((inv) =>
      isDateInPeriod(inv.issue_date || inv.created_at, 'today')
    );
    const validTodayInvoices = todayInvoices.filter(
      (inv) => inv.status === 'invoiced' || inv.status === 'paid'
    );
    const todayRevenue = validTodayInvoices.reduce((sum, inv) => {
      const amt = Number(inv.total_amount ?? inv.subtotal_amount ?? 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
    const todaySalesCount = validTodayInvoices.length;

    const todayPOs = rawPOs.filter((po) =>
      isDateInPeriod(po.issue_date || po.created_at, 'today') && po.status !== 'annulled'
    );
    const todaySpent = todayPOs.reduce((sum, po) => {
      const linesTotal = (po.lines || []).reduce(
        (acc: number, l: any) => acc + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0),
        0
      );
      const amt = linesTotal > 0 ? linesTotal : Number(po.total_amount || 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
    const todayPurchasesCount = todayPOs.length;

    // Compras del período seleccionado
    const periodPOs = rawPOs.filter((po) =>
      isDateInPeriod(po.issue_date || po.created_at, period, customStartDate, customEndDate) && po.status !== 'annulled'
    );
    const periodSpent = periodPOs.reduce((sum, po) => {
      const linesTotal = (po.lines || []).reduce(
        (acc: number, l: any) => acc + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0),
        0
      );
      const amt = linesTotal > 0 ? linesTotal : Number(po.total_amount || 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
    const periodPurchasesCount = periodPOs.length;

    // 1. Facturas y Ventas del período seleccionado
    const periodInvoices = rawInvoices.filter((inv) =>
      isDateInPeriod(inv.issue_date || inv.created_at, period, customStartDate, customEndDate)
    );
    const validInvoices = periodInvoices.filter(
      (inv) => inv.status === 'invoiced' || inv.status === 'paid'
    );
    const pendingInvoices = periodInvoices.filter(
      (inv) => inv.status === 'in_progress' || inv.status === 'draft'
    );

    const totalRevenue = validInvoices.reduce((sum, inv) => {
      const amt = Number(inv.total_amount ?? inv.subtotal_amount ?? 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);

    const pendingRevenue = pendingInvoices.reduce((sum, inv) => {
      const amt = Number(inv.total_amount ?? inv.subtotal_amount ?? 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);

    const averageTicket = validInvoices.length > 0 ? totalRevenue / validInvoices.length : 0;

    // 1.1 Promedio de Ventas Diarias & Días con Actividad Comercial
    const uniqueDaysSet = new Set<string>();
    validInvoices.forEach((inv) => {
      const dStr = (inv.issue_date || inv.created_at || '').slice(0, 10);
      if (dStr) uniqueDaysSet.add(dStr);
    });
    const activeDaysCount = Math.max(1, uniqueDaysSet.size);
    const dailySalesAverage = totalRevenue / activeDaysCount;

    // 1.2 Día Pico de la Semana & Hora Pico de Facturación
    const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayMap: Record<number, { amount: number; count: number }> = {
      0: { amount: 0, count: 0 },
      1: { amount: 0, count: 0 },
      2: { amount: 0, count: 0 },
      3: { amount: 0, count: 0 },
      4: { amount: 0, count: 0 },
      5: { amount: 0, count: 0 },
      6: { amount: 0, count: 0 },
    };
    const hourMap: Record<number, { amount: number; count: number }> = {};

    validInvoices.forEach((inv) => {
      const d = new Date(inv.issue_date || inv.created_at);
      if (!isNaN(d.getTime())) {
        const dayIdx = d.getDay();
        const amt = Number(inv.total_amount ?? inv.subtotal_amount ?? 0);
        dayMap[dayIdx].amount += amt;
        dayMap[dayIdx].count += 1;

        const hr = d.getHours();
        if (!hourMap[hr]) hourMap[hr] = { amount: 0, count: 0 };
        hourMap[hr].amount += amt;
        hourMap[hr].count += 1;
      }
    });

    const dayOfWeekStats: DayOfWeekStat[] = [1, 2, 3, 4, 5, 6, 0].map((idx) => {
      const d = dayMap[idx];
      return {
        dayIndex: idx,
        dayName: DAY_NAMES[idx],
        amount: d.amount,
        count: d.count,
        percentage: totalRevenue > 0 ? Math.round((d.amount / totalRevenue) * 100) : 0,
      };
    });

    const peakDay = [...dayOfWeekStats].sort((a, b) => b.amount - a.amount)[0] || null;

    const hourlyStats: PeakHourStat[] = Object.entries(hourMap).map(([hrStr, data]) => {
      const hr = Number(hrStr);
      const periodStr = hr >= 12 ? 'PM' : 'AM';
      const displayHr = hr % 12 === 0 ? 12 : hr % 12;
      return {
        hour: hr,
        label: `${displayHr}:00 ${periodStr}`,
        amount: data.amount,
        count: data.count,
      };
    });

    const peakHour = [...hourlyStats].sort((a, b) => b.amount - a.amount)[0] || null;

    // 2. Ranking Real de Top 5 Productos y Rentabilidad Neta Aportada
    let realCOGS = 0;
    const productSalesMap: Record<string, { name: string; units: number; revenue: number }> = {};
    const profitabilityMap: Record<string, { name: string; units: number; revenue: number; cost: number; profit: number }> = {};

    validInvoices.forEach((inv) => {
      const lines = inv.metadata?.cart_lines || inv.lines || [];
      if (Array.isArray(lines)) {
        lines.forEach((line: any) => {
          const name = line.description || line.name || 'Ítem Facturado';
          const qty = Number(line.quantity || 1);
          const rev = Number(
            line.total !== undefined ? line.total : qty * Number(line.unit_price || 0)
          );
          const matchedItem = rawItems.find(
            (i) => i.id === (line.item_id || line.itemId) || i.name.toLowerCase().trim() === name.toLowerCase().trim()
          );
          const unitCost = Number(matchedItem?.cost ?? matchedItem?.acquisition_cost ?? 0);
          const lineCost = unitCost * qty;
          realCOGS += lineCost;

          if (!productSalesMap[name]) {
            productSalesMap[name] = { name, units: 0, revenue: 0 };
          }
          productSalesMap[name].units += qty;
          productSalesMap[name].revenue += rev;

          if (!profitabilityMap[name]) {
            profitabilityMap[name] = { name, units: 0, revenue: 0, cost: 0, profit: 0 };
          }
          profitabilityMap[name].units += qty;
          profitabilityMap[name].revenue += rev;
          profitabilityMap[name].cost += lineCost;
          profitabilityMap[name].profit += (rev - lineCost);
        });
      }
    });

    const realGrossProfit = totalRevenue - realCOGS;
    const realGrossMarginPct = totalRevenue > 0 ? (realGrossProfit / totalRevenue) * 100 : 0;

    const topProducts: TopProductStat[] = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((p) => ({
        ...p,
        share: totalRevenue > 0 ? Math.round((p.revenue / totalRevenue) * 100) : 0,
      }));

    const topProfitableProducts: TopProfitableProductStat[] = Object.values(profitabilityMap)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5)
      .map((p) => ({
        ...p,
        marginPct: p.revenue > 0 ? Math.round((p.profit / p.revenue) * 100) : 0,
      }));

    // 3. Ranking Real de Top 5 Clientes por Volumen de Facturación
    const clientSalesMap: Record<string, TopClientStat> = {};
    validInvoices.forEach((inv) => {
      const customerName =
        inv.metadata?.customer_snapshot?.name ||
        inv.customer_name ||
        (rawClients.find((c) => c.id === inv.entity_id)?.name) ||
        'Cliente Mostrador';
      const key = customerName.trim();
      const amt = Number(inv.total_amount ?? inv.subtotal_amount ?? 0);
      if (!clientSalesMap[key]) {
        clientSalesMap[key] = {
          id: inv.entity_id,
          name: key,
          purchases: 0,
          totalSpent: 0,
        };
      }
      clientSalesMap[key].purchases += 1;
      clientSalesMap[key].totalSpent += amt;
    });

    const topClients: TopClientStat[] = Object.values(clientSalesMap)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // 4. Desglose Real de Métodos de Pago (Sin defaults a efectivo)
    const paymentMap: Record<string, { amount: number; count: number }> = {};
    const methodColors: Record<string, string> = {
      cash: '#10b981',
      efectivo: '#10b981',
      card: '#3b82f6',
      tarjeta: '#3b82f6',
      transfer: '#8b5cf6',
      transferencia: '#8b5cf6',
      pago_movil: '#06b6d4',
      zelle: '#6366f1',
      mixed: '#f59e0b',
      no_especificado: '#94a3b8',
    };

    validInvoices.forEach((inv) => {
      const payments = inv.metadata?.payments;
      if (Array.isArray(payments) && payments.length > 0) {
        payments.forEach((p: any) => {
          const m = (p.method || 'no_especificado').toLowerCase();
          const amt = Number(p.amount || 0);
          if (!paymentMap[m]) paymentMap[m] = { amount: 0, count: 0 };
          paymentMap[m].amount += amt;
          paymentMap[m].count += 1;
        });
      } else {
        const rawMethod = inv.metadata?.payment_method;
        const m = rawMethod ? String(rawMethod).toLowerCase().trim() : 'no_especificado';
        const amt = Number(inv.total_amount ?? inv.subtotal_amount ?? 0);
        if (!paymentMap[m]) paymentMap[m] = { amount: 0, count: 0 };
        paymentMap[m].amount += amt;
        paymentMap[m].count += 1;
      }
    });

    const paymentMethods: PaymentMethodStat[] = Object.entries(paymentMap).map(([k, v]) => {
      const cleanLabel =
        k === 'cash' || k === 'efectivo'
          ? 'Efectivo USD/VES'
          : k === 'pago_movil'
          ? 'Pago Móvil'
          : k === 'card' || k === 'tarjeta'
          ? 'Tarjeta Débito/Crédito'
          : k === 'transfer' || k === 'transferencia'
          ? 'Transferencia Bancaria'
          : k === 'zelle'
          ? 'Zelle'
          : k === 'mixed'
          ? 'Cobro Mixto / Combinado'
          : k === 'no_especificado'
          ? 'Sin Método Especificado'
          : k;

      return {
        method: cleanLabel,
        amount: v.amount,
        count: v.count,
        percentage: totalRevenue > 0 ? Math.round((v.amount / totalRevenue) * 100) : 0,
        color: methodColors[k] || '#64748b',
      };
    });

    // 5. Inventario Fáctico: Costo Real vs Venta (CERO estimación al 70%)
    const products = rawItems.filter((i) => i.type === 'product');
    let unassignedCostCount = 0;

    const totalInventoryCost = products.reduce((sum, i) => {
      const rawCost = Number(i.cost ?? i.acquisition_cost ?? i.cost_price ?? 0);
      const stock = Number(i.stock ?? i.stock_quantity ?? 0);
      if (isNaN(rawCost) || rawCost === 0) {
        unassignedCostCount++;
        return sum; // Estrictamente $0.00 si no fue parametrizado
      }
      return sum + rawCost * Math.max(0, stock);
    }, 0);

    const totalInventorySale = products.reduce((sum, i) => {
      const price = Number(i.base_price ?? 0);
      const stock = Number(i.stock ?? i.stock_quantity ?? 0);
      return sum + price * Math.max(0, stock);
    }, 0);

    const potentialGrossProfit = totalInventorySale - totalInventoryCost;
    const potentialGrossMarginPct =
      totalInventorySale > 0 && totalInventoryCost > 0
        ? ((potentialGrossProfit / totalInventorySale) * 100)
        : 0;

    const lowStockAlerts: AlertRow[] = products
      .filter((i) => {
        const stock = Number(i.stock ?? i.stock_quantity ?? 0);
        const min = Number(i.metadata?.min_stock ?? i.min_stock_alert ?? 5);
        return stock <= min;
      })
      .slice(0, 10)
      .map((i) => ({
        id: i.id,
        name: i.name,
        stock: Number(i.stock ?? i.stock_quantity ?? 0),
        minStock: Number(i.metadata?.min_stock ?? i.min_stock_alert ?? 5),
        category: i.category || 'General',
      }));

    // 6. Inventario por Categoría
    const categoryMap: Record<string, CategoryStat> = {};
    products.forEach((p) => {
      const cat = (p.category || 'Sin Categoría').trim();
      const stock = Math.max(0, Number(p.stock ?? p.stock_quantity ?? 0));
      const cost = Number(p.cost ?? p.acquisition_cost ?? p.cost_price ?? 0);
      const price = Number(p.base_price ?? 0);
      if (!categoryMap[cat]) {
        categoryMap[cat] = { name: cat, count: 0, totalCost: 0, totalSale: 0 };
      }
      categoryMap[cat].count += 1;
      categoryMap[cat].totalCost += cost * stock;
      categoryMap[cat].totalSale += price * stock;
    });

    const categoryStats: CategoryStat[] = Object.values(categoryMap).sort(
      (a, b) => b.totalSale - a.totalSale
    );

    // 7. Cartera Real: CxC vs CxP
    const totalCxC =
      rawClients.reduce((sum, c) => sum + Number(c.metadata?.total_debt || 0), 0) +
      pendingRevenue;

    const openPOs = rawPOs.filter((po) => po.status !== 'paid' && po.status !== 'annulled');
    const totalCxP = openPOs.reduce((sum, po) => {
      const linesTotal = (po.lines || []).reduce(
        (acc: number, l: any) => acc + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0),
        0
      );
      return sum + (linesTotal > 0 ? linesTotal : Number(po.total_amount || 0));
    }, 0);

    const totalPortfolio = totalCxC + totalCxP;
    const cxcPercentage = totalPortfolio > 0 ? Math.round((totalCxC / totalPortfolio) * 100) : 0;
    const cxpPercentage = totalPortfolio > 0 ? Math.round((totalCxP / totalPortfolio) * 100) : 0;

    // 8. Citas y Operaciones Reales
    const periodAppointments = rawAppointments.filter((a) =>
      isDateInPeriod(a.created_at || (a as any).date || (a as any).start_time, period, customStartDate, customEndDate)
    );
    const totalAppointments = periodAppointments.length;
    const completedAppointments = periodAppointments.filter((a) => a.status === 'completed').length;
    const cancelledAppointments = periodAppointments.filter(
      (a) => a.status === 'cancelled' || a.status === 'no_show'
    ).length;
    const effectiveAppointments = totalAppointments - cancelledAppointments;
    const attendanceRate =
      totalAppointments === 0
        ? null // Cero fake: reporta null para mostrar "Sin registros"
        : effectiveAppointments > 0
        ? Math.min(100, Math.round((completedAppointments / effectiveAppointments) * 100))
        : 0;

    // 9. Asistencia de Colaboradores en el Período
    const periodAttendanceLogs = rawAttendanceLogs.filter((log) =>
      isDateInPeriod(log.created_at, period, customStartDate, customEndDate)
    );

    // 10. Agrupación Cronológica Real de Ventas para el Gráfico SVG
    const dateSalesMap: Record<string, { label: string; amount: number; count: number; date: Date }> = {};

    validInvoices.forEach((inv) => {
      const d = new Date(inv.issue_date || inv.created_at);
      if (isNaN(d.getTime())) return;
      const amt = Number(inv.total_amount ?? inv.subtotal_amount ?? 0);

      let key = '';
      let label = '';

      if (period === 'today') {
        const hour = d.getHours();
        key = `${hour.toString().padStart(2, '0')}:00`;
        label = key;
      } else if (period === 'week' || period === 'month' || period === 'custom') {
        key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        label = `${d.getDate()} ${d.toLocaleDateString('es', { month: 'short' })}`;
      } else {
        key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        label = d.toLocaleDateString('es', { month: 'short', year: '2-digit' });
      }

      if (!dateSalesMap[key]) {
        dateSalesMap[key] = { label, amount: 0, count: 0, date: d };
      }
      dateSalesMap[key].amount += amt;
      dateSalesMap[key].count += 1;
    });

    const realBuckets: SalesBucket[] = Object.keys(dateSalesMap)
      .sort()
      .map((k) => ({
        label: dateSalesMap[k].label,
        amount: dateSalesMap[k].amount,
        count: dateSalesMap[k].count,
      }));

    // 11. Lista de Últimas 8 Facturas del Período
    const recentInvoices = [...periodInvoices]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);

    return {
      todayRevenue,
      todaySalesCount,
      todaySpent,
      todayPurchasesCount,
      periodSpent,
      periodPurchasesCount,
      periodInvoicesCount: periodInvoices.length,
      validInvoicesCount: validInvoices.length,
      totalRevenue,
      pendingRevenue,
      pendingInvoicesCount: pendingInvoices.length,
      averageTicket,
      dailySalesAverage,
      activeDaysCount,
      peakDay,
      peakHour,
      dayOfWeekStats,
      realCOGS,
      realGrossProfit,
      realGrossMarginPct,
      topProducts,
      topProfitableProducts,
      topClients,
      paymentMethods,
      productsCount: products.length,
      totalInventoryCost,
      totalInventorySale,
      potentialGrossProfit,
      potentialGrossMarginPct,
      unassignedCostCount,
      lowStockAlerts,
      categoryStats,
      clientsCount: rawClients.length,
      activeClientsCount: rawClients.filter((c) => c.status === 'active').length,
      totalCxC,
      totalCxP,
      cxcPercentage,
      cxpPercentage,
      openPOsCount: openPOs.length,
      employeesCount: rawEmployees.length,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      attendanceRate,
      periodAttendanceCount: periodAttendanceLogs.length,
      buckets: realBuckets,
      recentInvoices,
      netProfitAccounting: accountingIncome?.netProfit ?? 0,
    };
  }, [
    rawInvoices,
    rawItems,
    rawClients,
    rawPOs,
    rawEmployees,
    rawAppointments,
    rawAttendanceLogs,
    accountingIncome,
    period,
    customStartDate,
    customEndDate,
  ]);

  /* ─────────────────────────────────────────────
     Exportación Ejecutiva a CSV (Fáctica)
  ───────────────────────────────────────────── */
  const handleExportCSV = () => {
    interface ExportRow {
      categoria: string;
      metrica: string;
      valor: string;
      detalle: string;
    }

    const exportData: ExportRow[] = [
      { categoria: 'General', metrica: 'Período Auditado', valor: period.toUpperCase(), detalle: `Generado el ${new Date().toLocaleString()}` },
      { categoria: 'Ventas', metrica: 'Ingresos Facturados Reales', valor: `$${metrics.totalRevenue.toFixed(2)}`, detalle: `${metrics.validInvoicesCount} facturas cobradas` },
      { categoria: 'Ventas', metrica: 'Promedio de Ventas Diarias', valor: `$${metrics.dailySalesAverage.toFixed(2)}`, detalle: `Calculado sobre ${metrics.activeDaysCount} días con actividad` },
      { categoria: 'Ventas', metrica: 'Ticket Promedio por Venta', valor: `$${metrics.averageTicket.toFixed(2)}`, detalle: 'Ingreso promedio por transacción' },
      { categoria: 'Ventas', metrica: 'Utilidad Bruta Real de Ventas', valor: `$${metrics.realGrossProfit.toFixed(2)}`, detalle: 'Ingresos menos Costo Real de Mercancía Vendida (COGS)' },
      { categoria: 'Ventas', metrica: 'Margen Comercial Real de Ventas', valor: `${metrics.realGrossMarginPct.toFixed(1)}%`, detalle: 'Rentabilidad neta sobre facturación' },
      { categoria: 'Ventas', metrica: 'Día Pico de Venta', valor: metrics.peakDay?.dayName || 'N/A', detalle: metrics.peakDay ? `$${metrics.peakDay.amount.toFixed(2)} (${metrics.peakDay.percentage}% del total)` : 'Sin ventas' },
      { categoria: 'Ventas', metrica: 'Hora Pico de Afluencia', valor: metrics.peakHour?.label || 'N/A', detalle: metrics.peakHour ? `${metrics.peakHour.count} ventas ($${metrics.peakHour.amount.toFixed(2)})` : 'Sin datos' },
      { categoria: 'Ventas', metrica: 'Facturas Pendientes de Cobro', valor: `$${metrics.pendingRevenue.toFixed(2)}`, detalle: `${metrics.pendingInvoicesCount} documentos` },
      { categoria: 'Cartera', metrica: 'Cuentas por Cobrar (CxC)', valor: `$${metrics.totalCxC.toFixed(2)}`, detalle: `${metrics.cxcPercentage}% de cartera exigible` },
      { categoria: 'Compras', metrica: 'Cuentas por Pagar (CxP)', valor: `$${metrics.totalCxP.toFixed(2)}`, detalle: `${metrics.openPOsCount} órdenes de compra abiertas` },
      { categoria: 'Inventario', metrica: 'Valuación al Costo Real en Bodega', valor: `$${metrics.totalInventoryCost.toFixed(2)}`, detalle: `${metrics.unassignedCostCount} ítems con costo $0` },
      { categoria: 'Inventario', metrica: 'Valuación Comercial (PVP)', valor: `$${metrics.totalInventorySale.toFixed(2)}`, detalle: 'Ingreso potencial por liquidación' },
      { categoria: 'Inventario', metrica: 'Margen Bruto Proyectado', valor: `${metrics.potentialGrossMarginPct.toFixed(1)}%`, detalle: `$${metrics.potentialGrossProfit.toFixed(2)} utilidad proyectada` },
      { categoria: 'Inventario', metrica: 'Artículos con Stock Crítico', valor: metrics.lowStockAlerts.length.toString(), detalle: 'Bajo stock mínimo de seguridad' },
      { categoria: 'Operaciones', metrica: 'Citas en Período', valor: metrics.totalAppointments.toString(), detalle: `${metrics.completedAppointments} atendidas` },
      { categoria: 'Operaciones', metrica: 'Tasa de Cumplimiento de Citas', valor: metrics.attendanceRate !== null ? `${metrics.attendanceRate}%` : 'Sin registros', detalle: `${metrics.cancelledAppointments} canceladas` },
      { categoria: 'Personal', metrica: 'Marcajes de Asistencia', valor: metrics.periodAttendanceCount.toString(), detalle: 'Registros de entrada/salida de empleados' },
    ];

    const columns: CSVColumn<ExportRow>[] = [
      { header: 'Categoría', accessor: (r) => r.categoria },
      { header: 'Métrica Ejecutiva', accessor: (r) => r.metrica },
      { header: 'Valor Real', accessor: (r) => r.valor },
      { header: 'Detalle Fáctico', accessor: (r) => r.detalle },
    ];

    const tenantName = (currentTenant?.name || 'empresa').replace(/\s+/g, '_').toLowerCase();
    exportToCSV(`reporte_bi_real_${tenantName}_${period}`, columns, exportData);
  };

  /* ─────────────────────────────────────────────
     Render: Skeletons de Carga
  ───────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="skeleton h-8 w-64 rounded-xl" />
          <div className="skeleton h-10 w-36 rounded-xl" />
        </div>
        <SkeletonCardGrid count={4} columns={4} showKPI />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard lines={6} className="h-72" />
          <SkeletonCard lines={6} className="h-72" />
        </div>
      </div>
    );
  }

  const maxBucketAmount = Math.max(...metrics.buckets.map((b) => b.amount), 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* ── Header Ejecutivo ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl" style={{ background: 'var(--primary-50)' }}>
              <BarChart3 size={22} style={{ color: 'var(--primary)' }} />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Estadísticas & Business Intelligence
            </h1>
          </div>
          <p className="text-sm mt-1 text-muted-foreground flex items-center gap-2">
            <Building2 size={14} />
            <span className="font-medium text-foreground">{currentTenant?.name}</span>
            {lastUpdated && (
              <>
                <span>·</span>
                <span className="text-xs">
                  Datos en vivo de base de datos ({lastUpdated.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })})
                </span>
              </>
            )}
          </p>
        </div>

        {/* Acciones de Cabecera (Solo visibles en PC para mantener móvil limpio) */}
        <div className="hidden md:flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="btn-base btn-secondary btn-haptic flex items-center gap-2 text-xs py-2 px-3"
            title="Exportar métricas fácticas a CSV"
          >
            <Download size={15} />
            Exportar CSV
          </button>
          <button
            onClick={load}
            className="btn-base btn-secondary btn-haptic flex items-center gap-2 text-xs py-2 px-3"
            title="Recargar datos directamente desde Supabase"
          >
            <RefreshCw size={15} />
            Actualizar
          </button>
        </div>
      </div>

      {/* ── Selector de Período y Pestañas de Dominio (Táctiles & Modernas) ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Selector de Período Temporal Segmentado */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-border overflow-x-auto no-scrollbar shadow-2xs">
            {(
              [
                { id: 'today', label: 'Hoy' },
                { id: 'week', label: '7D' },
                { id: 'month', label: 'Mes' },
                { id: 'year', label: 'Año' },
                { id: 'all', label: 'Histórico' },
                { id: 'custom', label: '📅 Rango' },
              ] as const
            ).map((p) => {
              const active = period === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`
                    flex-1 sm:flex-initial px-3.5 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap btn-haptic
                    ${
                      active
                        ? 'bg-card text-foreground shadow-xs border border-border/80'
                        : 'text-slate-500 hover:text-foreground'
                    }
                  `}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2 p-2 bg-card border border-border rounded-2xl text-xs animate-in fade-in duration-150 shadow-xs flex-wrap">
              <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Desde:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-2 py-1 text-xs text-foreground font-mono"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Hasta:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-2 py-1 text-xs text-foreground font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Pestañas de Dominio (Adaptativas, Ergonómicas y Táctiles) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 border border-border rounded-2xl overflow-x-auto no-scrollbar shadow-2xs w-full lg:w-auto">
          {[
            { id: 'overview' as const, label: 'Cockpit', icon: Activity },
            { id: 'sales' as const, label: 'Ventas', icon: DollarSign },
            ...(hasInventario ? [{ id: 'inventory' as const, label: 'Inventario', icon: Package }] : []),
            { id: 'operations' as const, label: 'Operaciones', icon: Calendar },
          ].map((t) => {
            const active = activeTab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`
                  flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap btn-haptic
                  ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-slate-500 hover:text-foreground'
                  }
                `}
              >
                <Icon size={14} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────
         BANNER DE CAJA POS EN VIVO (ARQUEO REAL EN PC)
         Solo visible en PC para no saturar al usuario móvil
      ───────────────────────────────────────────── */}
      {hasCaja && (
        <div className="hidden md:flex bg-card border border-border rounded-2xl p-4 sm:p-5 flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: cashSession?.status === 'open' ? 'var(--success-50)' : 'var(--muted)',
              }}
            >
              <Wallet
                size={20}
                style={{
                  color: cashSession?.status === 'open' ? 'var(--success)' : 'var(--muted-foreground)',
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground">Estado de Caja Mostrador POS</h2>
                <span
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded-md ${
                    cashSession?.status === 'open'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {cashSession?.status === 'open' ? 'Sesión Abierta' : 'Caja Cerrada'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {cashSession?.status === 'open' ? (
                  <>
                    Abierta por <span className="font-medium text-foreground">{cashSession.openedBy}</span> · Fondo Inicial:{' '}
                    <span className="font-medium text-foreground">{fmt(cashSession.initialTotalUSD ?? cashSession.initialAmount)}</span>
                  </>
                ) : (
                  'No hay ninguna sesión de caja abierta actualmente en este punto de venta.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-border/50 justify-between md:justify-end">
            {cashSession?.status === 'open' && (
              <div className="text-left md:text-right">
                <span className="text-[11px] text-muted-foreground block">Efectivo Esperado en Gaveta</span>
                <span className="text-base font-bold text-foreground">
                  {fmt(cashSession.expectedTotalUSD ?? cashSession.expectedCash ?? 0)}
                </span>
              </div>
            )}
            <button
              onClick={() => router.push('/caja')}
              className="btn-base btn-secondary btn-sm text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              {cashSession?.status === 'open' ? 'Arqueo de Caja' : 'Abrir Caja'}
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
         PESTAÑA 1: COCKPIT CENTRAL (RESUMEN FÁCTICO)
      ───────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <section className="space-y-6">
          {/* Fila 1: Rendimiento Comercial según el Período Seleccionado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label={
                period === 'today'
                  ? 'Vendido Hoy'
                  : period === 'week'
                  ? 'Ventas (Últimos 7 Días)'
                  : period === 'month'
                  ? 'Ventas del Mes'
                  : period === 'year'
                  ? 'Ventas del Año'
                  : period === 'custom'
                  ? 'Ventas en Rango'
                  : 'Ventas Totales'
              }
              value={fmt(period === 'today' ? metrics.todayRevenue : metrics.totalRevenue)}
              subValue={`${period === 'today' ? metrics.todaySalesCount : metrics.validInvoicesCount} venta(s) cobradas`}
              trend={metrics.totalRevenue > 0 ? 'up' : 'neutral'}
              icon={<DollarSign size={20} />}
              accentColor="var(--success)"
              accentBg="var(--success-50)"
              onClick={hasCaja ? () => router.push('/caja') : undefined}
              linkLabel={hasCaja ? 'Ver Caja POS' : undefined}
            />
            <KPICard
              label={
                period === 'today'
                  ? 'Gastado Hoy'
                  : period === 'week'
                  ? 'Compras (Últimos 7 Días)'
                  : period === 'month'
                  ? 'Compras del Mes'
                  : period === 'year'
                  ? 'Compras del Año'
                  : period === 'custom'
                  ? 'Gastos en Rango'
                  : 'Compras Totales'
              }
              value={fmt(period === 'today' ? metrics.todaySpent : metrics.periodSpent)}
              subValue={`${period === 'today' ? metrics.todayPurchasesCount : metrics.periodPurchasesCount} compra(s) registradas`}
              trend={metrics.periodSpent > 0 ? 'down' : 'neutral'}
              icon={<ShoppingCart size={20} />}
              accentColor="#ef4444"
              accentBg="rgba(239, 68, 68, 0.1)"
              onClick={hasCompras ? () => router.push('/compras') : undefined}
              linkLabel={hasCompras ? 'Ver Compras' : undefined}
            />
            <KPICard
              label={period === 'custom' ? 'Ingresos en Período' : 'Ingresos Facturados'}
              value={fmt(metrics.totalRevenue)}
              subValue={`${metrics.validInvoicesCount} facturas cobradas`}
              trend={metrics.totalRevenue > 0 ? 'up' : 'neutral'}
              icon={<TrendingUp size={20} />}
              accentColor="var(--primary)"
              accentBg="var(--primary-50)"
              onClick={hasCaja ? () => router.push('/caja') : undefined}
              linkLabel={hasCaja ? 'Ver Caja POS' : undefined}
            />
            <KPICard
              label="Rentabilidad Real de Venta"
              value={`${metrics.realGrossMarginPct.toFixed(1)}%`}
              subValue={`Utilidad: +${fmt(metrics.realGrossProfit)} s/ ventas`}
              trend={metrics.realGrossMarginPct >= 20 ? 'up' : 'neutral'}
              icon={<TrendingUp size={20} />}
              accentColor="var(--success)"
              accentBg="var(--success-50)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Promedio de Ventas Diarias"
              value={`${fmt(metrics.dailySalesAverage)}/día`}
              subValue={metrics.validInvoicesCount > 0 ? `En ${metrics.activeDaysCount} día(s) con actividad` : 'Sin actividad en período'}
              trend={metrics.dailySalesAverage > 0 ? 'up' : 'neutral'}
              icon={<Calendar size={20} />}
              accentColor="var(--primary)"
              accentBg="var(--primary-50)"
            />
            <KPICard
              label="Ticket Promedio"
              value={fmt(metrics.averageTicket)}
              subValue={metrics.validInvoicesCount > 0 ? 'Por cliente / venta completada' : 'Sin ventas en período'}
              trend="neutral"
              icon={<ShoppingCart size={20} />}
              accentColor="var(--primary)"
              accentBg="var(--primary-50)"
            />
            <KPICard
              label="Día Pico de Ventas"
              value={metrics.peakDay?.amount ? metrics.peakDay.dayName : 'N/A'}
              subValue={metrics.peakDay?.amount ? `${fmt(metrics.peakDay.amount)} (${metrics.peakDay.percentage}% del total)` : 'Sin ventas registradas'}
              trend="neutral"
              icon={<Award size={20} />}
              accentColor="var(--warning)"
              accentBg="var(--warning-50)"
            />
            <KPICard
              label="Hora Pico Más Concurrida"
              value={metrics.peakHour?.label || 'N/A'}
              subValue={metrics.peakHour?.count ? `${metrics.peakHour.count} ventas (${fmt(metrics.peakHour.amount)})` : 'Sin datos suficientes'}
              trend="neutral"
              icon={<Clock size={20} />}
              accentColor="var(--info)"
              accentBg="var(--info-50)"
            />
            {hasInventario ? (
              <KPICard
                label="Valuación al Costo Real"
                value={fmt(metrics.totalInventoryCost)}
                subValue={
                  metrics.unassignedCostCount > 0
                    ? `${metrics.unassignedCostCount} ítems sin costo`
                    : '100% de ítems parametrizados'
                }
                trend="neutral"
                icon={<Package size={20} />}
                accentColor="var(--info)"
                accentBg="var(--info-50)"
                onClick={() => router.push('/inventario')}
                linkLabel="Ver Inventario"
              />
            ) : (
              <KPICard
                label="Total Facturas Emitidas"
                value={metrics.periodInvoicesCount.toString()}
                subValue={`${metrics.validInvoicesCount} cobradas • ${metrics.pendingInvoicesCount} pendientes`}
                trend="neutral"
                icon={<Receipt size={20} />}
                accentColor="var(--info)"
                accentBg="var(--info-50)"
              />
            )}
            <KPICard
              label="Cuentas por Cobrar (CxC)"
              value={fmt(metrics.totalCxC)}
              subValue={hasCompras ? `CxP a proveedores: ${fmt(metrics.totalCxP)}` : 'Saldos exigibles'}
              trend={metrics.totalCxC >= metrics.totalCxP ? 'up' : 'down'}
              icon={<Wallet size={20} />}
              accentColor="var(--warning)"
              accentBg="var(--warning-50)"
              onClick={hasCRM ? () => router.push('/clientes') : undefined}
              linkLabel={hasCRM ? 'Ver Clientes' : undefined}
            />
          </div>

          {/* Gráfico de Ventas Reales & Métodos de Pago Reales */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico SVG de Transacciones Reales */}
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <BarChart3 size={16} style={{ color: 'var(--primary)' }} />
                      Cronología de Ventas ({period.toUpperCase()})
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Montos y frecuencia de ventas reales registradas en la base de datos
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-50 text-primary border border-primary/20">
                    Total: {fmt(metrics.totalRevenue)}
                  </span>
                </div>

                {metrics.buckets.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed border-border/70 rounded-xl text-muted-foreground">
                    <Receipt size={32} className="opacity-30 mb-2" />
                    <p className="text-sm font-medium text-foreground">No hay ventas registradas en este período</p>
                    <p className="text-xs mt-0.5">
                      Cambia el período a &quot;Histórico&quot; o emite una factura en Caja POS para ver la gráfica.
                    </p>
                  </div>
                ) : (
                  <div className="relative pt-6 pb-2">
                    <div className="h-48 w-full flex items-end gap-1.5 sm:gap-4 px-2">
                      {metrics.buckets.map((b, idx) => {
                        const heightPercent =
                          maxBucketAmount > 0 ? Math.round((b.amount / maxBucketAmount) * 100) : 0;
                        return (
                          <div
                            key={idx}
                            className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative cursor-pointer"
                          >
                            {/* Monto siempre visible (solución para móvil y pantallas táctiles) */}
                            {b.amount > 0 && (
                              <span className="text-[9px] sm:text-[10px] font-bold text-foreground font-mono truncate w-full text-center">
                                ${Math.round(b.amount)}
                              </span>
                            )}
                            <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-[10px] font-semibold py-1 px-2 rounded-lg shadow-lg pointer-events-none whitespace-nowrap z-20">
                              {b.label}: {fmt(b.amount)} ({b.count} ventas)
                            </div>
                            <div
                              className="w-full rounded-t-md transition-all duration-300 group-hover:brightness-110 min-h-1"
                              style={{
                                height: `${Math.max(heightPercent, b.amount > 0 ? 8 : 4)}%`,
                                background:
                                  b.amount > 0
                                    ? 'linear-gradient(180deg, var(--primary) 0%, rgba(99, 102, 241, 0.4) 100%)'
                                    : 'var(--muted)',
                              }}
                            />
                            <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground truncate w-full text-center">
                              {b.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border/50 pt-3 mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>Transacciones registradas en período: {metrics.validInvoicesCount}</span>
                <button
                  onClick={() => router.push('/caja')}
                  className="font-medium text-primary hover:underline flex items-center gap-1"
                >
                  Ir a Caja POS <ArrowRight size={12} />
                </button>
              </div>
            </div>

            {/* Métodos de Pago Reales */}
            <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <CreditCard size={16} style={{ color: 'var(--success)' }} />
                    Métodos de Pago
                  </h3>
                  <span className="text-xs text-muted-foreground">Desglose Real</span>
                </div>

                {metrics.paymentMethods.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                    <DollarSign size={28} className="opacity-30 mb-2" />
                    <p className="text-xs">No hay cobros registrados en este período.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {metrics.paymentMethods.map((pm, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-foreground flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                              style={{ background: pm.color }}
                            />
                            {pm.method}
                          </span>
                          <span className="text-muted-foreground">
                            {fmt(pm.amount)} ({pm.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pm.percentage}%`,
                              background: pm.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border/50 pt-3 mt-4 text-xs text-muted-foreground">
                Facturas pendientes de cobro:{' '}
                <span className="font-semibold text-foreground">
                  {metrics.pendingInvoicesCount} ({fmt(metrics.pendingRevenue)})
                </span>
              </div>
            </div>
          </div>

          {/* Grilla Secundaria: Top Productos y Cartera Proporcional */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 5 Productos */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Award size={16} style={{ color: 'var(--warning)' }} />
                  Top 5 Productos Más Vendidos
                </h3>
                <span className="text-xs text-muted-foreground">Por recaudación</span>
              </div>

              {metrics.topProducts.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs">
                  No hay ítems facturados en el período seleccionado.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {metrics.topProducts.map((p, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground">{p.units} unidades vendidas</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-foreground">{fmt(p.revenue)}</p>
                        <p className="text-[10px] text-muted-foreground">{p.share}% del total</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Posición Real de Cartera (CxC vs CxP sin 100% hardcodeado) */}
            <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <TrendingUp size={16} style={{ color: 'var(--primary)' }} />
                    Equilibrio de Cartera: CxC vs CxP
                  </h3>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block">Posición Neta</span>
                    <span
                      className={`text-sm font-bold ${
                        metrics.totalCxC >= metrics.totalCxP
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {metrics.totalCxC >= metrics.totalCxP ? '+' : ''}
                      {fmt(metrics.totalCxC - metrics.totalCxP)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 pt-1">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1">
                      <span>Cuentas por Cobrar (Clientes)</span>
                      <span className="text-emerald-600">{fmt(metrics.totalCxC)} ({metrics.cxcPercentage}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${metrics.cxcPercentage}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1">
                      <span>Cuentas por Pagar (Proveedores)</span>
                      <span className="text-rose-600">{fmt(metrics.totalCxP)} ({metrics.cxpPercentage}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all duration-500"
                        style={{ width: `${metrics.cxpPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/50 pt-3 mt-4 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>{metrics.openPOsCount} órdenes de compra abiertas</span>
                <button
                  onClick={() => router.push('/compras')}
                  className="font-medium text-primary hover:underline"
                >
                  Gestionar compras →
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────
         PESTAÑA 2: VENTAS & PRODUCTOS
      ───────────────────────────────────────────── */}
      {activeTab === 'sales' && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Total Facturado
              </p>
              <p className="text-2xl font-bold text-foreground">{fmt(metrics.totalRevenue)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.validInvoicesCount} facturas cobradas efectivamente
              </p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Promedio de Venta Diaria
              </p>
              <p className="text-2xl font-bold text-primary">{fmt(metrics.dailySalesAverage)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Calculado sobre {metrics.activeDaysCount} día(s) con actividad
              </p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Ticket Promedio (AOV)
              </p>
              <p className="text-2xl font-bold text-foreground">{fmt(metrics.averageTicket)}</p>
              <p className="text-xs text-muted-foreground mt-1">Recaudación media por cliente atendido</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Utilidad Real en Ventas
              </p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                +{fmt(metrics.realGrossProfit)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Margen comercial neto: <span className="font-bold text-foreground">{metrics.realGrossMarginPct.toFixed(1)}%</span>
              </p>
            </div>
          </div>

          {/* Grilla de Patrones de Consumo: Días de la Semana y Horas Pico */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Concentración por Día de la Semana */}
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Calendar size={16} style={{ color: 'var(--primary)' }} />
                    Distribución de Ventas por Día de la Semana
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Permite planificar compras, turnos de personal y promociones según la afluencia semanal
                  </p>
                </div>
                {metrics.peakDay?.amount ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Día Estrella: {metrics.peakDay.dayName}
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2">
                {metrics.dayOfWeekStats.map((d) => {
                  const isPeak = metrics.peakDay?.dayIndex === d.dayIndex && d.amount > 0;
                  return (
                    <div
                      key={d.dayIndex}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isPeak
                          ? 'bg-amber-500/10 border-amber-500/40 shadow-xs'
                          : 'bg-muted/30 border-border/60 hover:bg-muted/50'
                      }`}
                    >
                      <span className="text-[11px] font-black uppercase block text-muted-foreground">
                        {d.dayName.slice(0, 3)}
                      </span>
                      <span className="text-sm font-black font-mono block text-foreground mt-1">
                        {fmt(d.amount)}
                      </span>
                      <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isPeak ? 'bg-amber-500' : 'bg-primary'
                          }`}
                          style={{ width: `${Math.max(d.percentage, d.amount > 0 ? 8 : 0)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        {d.count} vtas ({d.percentage}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hora Pico y Facturación Pendiente */}
            <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Clock size={16} style={{ color: 'var(--info)' }} />
                  Horario de Mayor Afluencia
                </h3>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Hora Pico Registrada:</span>
                    <span className="text-xs font-black text-foreground bg-background px-2 py-0.5 rounded border border-border">
                      {metrics.peakHour?.label || 'Sin datos'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Volumen en Hora Pico:</span>
                    <span className="text-sm font-black text-primary font-mono">
                      {fmt(metrics.peakHour?.amount || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Tickets Despachados:</span>
                    <span className="text-xs font-bold text-foreground">
                      {metrics.peakHour?.count || 0} ventas
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/50 pt-3 mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Facturas en Borrador / Presupuestos:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {metrics.pendingInvoicesCount} ({fmt(metrics.pendingRevenue)})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Grilla: Top Clientes, Top Productos y Top Rentables */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Clientes */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <Users size={16} style={{ color: 'var(--primary)' }} />
                Top Clientes de Mayor Consumo
              </h3>
              {metrics.topClients.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  Sin compras registradas en el período.
                </p>
              ) : (
                <div className="divide-y divide-border/60">
                  {metrics.topClients.map((c, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">{c.purchases} compras en total</p>
                      </div>
                      <span className="text-xs font-bold text-foreground">{fmt(c.totalSpent)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Productos por Recaudación */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <Award size={16} style={{ color: 'var(--warning)' }} />
                Top Productos Más Vendidos
              </h3>
              {metrics.topProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  Sin productos facturados en el período.
                </p>
              ) : (
                <div className="divide-y divide-border/60">
                  {metrics.topProducts.map((p, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">{p.units} unidades vendidas</p>
                      </div>
                      <span className="text-xs font-bold text-foreground">{fmt(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Productos por Rentabilidad (Ganancia Real en $) */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp size={16} style={{ color: 'var(--success)' }} />
                Top Productos Más Rentables
              </h3>
              {metrics.topProfitableProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  Sin datos de rentabilidad disponibles.
                </p>
              ) : (
                <div className="divide-y divide-border/60">
                  {metrics.topProfitableProducts.map((p, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {p.units} uds · Margen {p.marginPct}%
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">
                          +{fmt(p.profit)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Utilidad Neta</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tabla de Últimas Facturas Reales */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Receipt size={16} style={{ color: 'var(--primary)' }} />
              Últimas Facturas Registradas en el Período
            </h3>

            {metrics.recentInvoices.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No hay facturas emitidas en este período.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground">
                      <th className="py-2 font-medium">N° Factura</th>
                      <th className="py-2 font-medium">Cliente</th>
                      <th className="py-2 font-medium">Fecha</th>
                      <th className="py-2 font-medium">Método</th>
                      <th className="py-2 font-medium text-right">Monto Total</th>
                      <th className="py-2 font-medium text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {metrics.recentInvoices.map((inv) => {
                      const clientName =
                        inv.metadata?.customer_snapshot?.name ||
                        (rawClients.find((c) => c.id === inv.entity_id)?.name) ||
                        'Cliente Mostrador';
                      const pm = inv.metadata?.payment_method || 'Sin registrar';
                      const d = new Date(inv.issue_date || inv.created_at);

                      return (
                        <tr key={inv.id} className="hover:bg-muted/30">
                          <td className="py-2.5 font-semibold text-foreground">
                            {inv.document_number || `FAC-${inv.id.slice(0, 6)}`}
                          </td>
                          <td className="py-2.5 text-muted-foreground">{clientName}</td>
                          <td className="py-2.5 text-muted-foreground">
                            {!isNaN(d.getTime()) ? d.toLocaleDateString('es', { day: '2-digit', month: 'short' }) : '—'}
                          </td>
                          <td className="py-2.5">
                            <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[10px] font-medium capitalize">
                              {pm}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-bold text-foreground">
                            {fmt(Number(inv.total_amount ?? inv.subtotal_amount ?? 0))}
                          </td>
                          <td className="py-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                inv.status === 'paid' || inv.status === 'invoiced'
                                  ? 'bg-emerald-500/10 text-emerald-600'
                                  : 'bg-amber-500/10 text-amber-600'
                              }`}
                            >
                              {inv.status === 'paid' || inv.status === 'invoiced' ? 'Cobrado' : 'Pendiente'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────
         PESTAÑA 3: INVENTARIO & COSTOS (FACTUAL)
      ───────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Valuación al Costo Real
              </p>
              <p className="text-2xl font-bold text-foreground">{fmt(metrics.totalInventoryCost)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.unassignedCostCount > 0 ? (
                  <span className="text-amber-600 flex items-center gap-1 mt-1">
                    <AlertCircle size={12} />
                    {metrics.unassignedCostCount} ítems con costo $0 (sin parametrizar)
                  </span>
                ) : (
                  'Costo exacto de adquisición en bodega'
                )}
              </p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Valoración Comercial (PVP)
              </p>
              <p className="text-2xl font-bold text-foreground">{fmt(metrics.totalInventorySale)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Recaudación bruta esperada a precio de venta
              </p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Margen Bruto Proyectado
              </p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {metrics.potentialGrossMarginPct > 0 ? `${metrics.potentialGrossMarginPct.toFixed(1)}%` : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Ganancia proyectada: {fmt(metrics.potentialGrossProfit)}
              </p>
            </div>
          </div>

          {/* Desglose por Categoría */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Layers size={16} style={{ color: 'var(--info)' }} />
              Concentración de Inventario por Categoría
            </h3>

            {metrics.categoryStats.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No hay productos registrados en el inventario.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground">
                      <th className="py-2 font-medium">Categoría</th>
                      <th className="py-2 font-medium text-center">Productos</th>
                      <th className="py-2 font-medium text-right">Inversión (Costo)</th>
                      <th className="py-2 font-medium text-right">Valor Venta (PVP)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {metrics.categoryStats.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="py-2.5 font-semibold text-foreground">{cat.name}</td>
                        <td className="py-2.5 text-center text-muted-foreground">{cat.count}</td>
                        <td className="py-2.5 text-right font-medium text-foreground">{fmt(cat.totalCost)}</td>
                        <td className="py-2.5 text-right font-bold text-foreground">{fmt(cat.totalSale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Alertas de Reorden */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
                  Alertas de Stock Crítico
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Artículos que han alcanzado su nivel mínimo de seguridad
                </p>
              </div>
              <span className="badge badge-warning text-xs">
                {metrics.lowStockAlerts.length} en alerta
              </span>
            </div>

            {metrics.lowStockAlerts.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2 opacity-80" />
                <p className="text-sm font-medium text-foreground">Stock en niveles óptimos</p>
                <p className="text-xs mt-1">No hay productos por debajo del punto de reorden.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {metrics.lowStockAlerts.map((item) => {
                  const isExhausted = item.stock <= 0;
                  return (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            background: isExhausted ? 'var(--danger)' : 'var(--warning)',
                          }}
                        />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.category} · Mínimo: {item.minStock} uds
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg"
                          style={{
                            background: isExhausted ? 'var(--danger-50)' : 'var(--warning-50)',
                            color: isExhausted ? 'var(--danger)' : 'var(--warning)',
                          }}
                        >
                          {isExhausted ? 'Agotado (0 uds)' : `${item.stock} uds`}
                        </span>
                        <button
                          onClick={() => router.push(`/compras?item=${encodeURIComponent(item.id)}&reorder=${encodeURIComponent(item.name)}`)}
                          className="btn-base btn-secondary btn-sm text-xs py-1.5 px-3"
                        >
                          Emitir PO
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────
         PESTAÑA 4: OPERACIONES, CITAS & CARTERA
      ───────────────────────────────────────────── */}
      {activeTab === 'operations' && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {hasCalendario ? (
              <>
                <KPICard
                  label="Citas en el Período"
                  value={metrics.totalAppointments.toString()}
                  subValue={`${metrics.completedAppointments} atendidas`}
                  trend="neutral"
                  icon={<Calendar size={20} />}
                  accentColor="var(--primary)"
                  accentBg="var(--primary-50)"
                  onClick={() => router.push('/calendario')}
                  linkLabel="Ver Calendario"
                />
                <KPICard
                  label="Tasa de Asistencia"
                  value={metrics.attendanceRate !== null ? `${metrics.attendanceRate}%` : 'Sin registros'}
                  subValue={
                    metrics.totalAppointments > 0
                      ? `${metrics.cancelledAppointments} canceladas o no-show`
                      : 'No hay citas en este período'
                  }
                  trend={metrics.attendanceRate !== null && metrics.attendanceRate >= 80 ? 'up' : 'neutral'}
                  icon={<Clock size={20} />}
                  accentColor="var(--success)"
                  accentBg="var(--success-50)"
                />
              </>
            ) : (
              <>
                <KPICard
                  label="Cuentas por Cobrar"
                  value={fmt(metrics.totalCxC)}
                  subValue={hasCRM ? `${metrics.activeClientsCount} clientes activos` : 'Cartera de crédito'}
                  trend="neutral"
                  icon={<TrendingUp size={20} />}
                  accentColor="var(--primary)"
                  accentBg="var(--primary-50)"
                  onClick={hasCRM ? () => router.push('/clientes') : undefined}
                  linkLabel={hasCRM ? 'Ver Clientes' : undefined}
                />
                <KPICard
                  label="Ventas por Cobrar"
                  value={fmt(metrics.pendingRevenue)}
                  subValue={`${metrics.pendingInvoicesCount} facturas pendientes`}
                  trend="neutral"
                  icon={<Clock size={20} />}
                  accentColor="var(--warning)"
                  accentBg="var(--warning-50)"
                />
              </>
            )}
            {hasEquipo ? (
              <KPICard
                label="Marcajes de Asistencia"
                value={metrics.periodAttendanceCount.toString()}
                subValue="Entradas / Salidas del equipo"
                trend="neutral"
                icon={<UserCheck size={20} />}
                accentColor="var(--info)"
                accentBg="var(--info-50)"
                onClick={() => router.push('/equipo')}
                linkLabel="Ver Equipo"
              />
            ) : (
              <KPICard
                label="Colaboradores Activos"
                value={metrics.employeesCount.toString()}
                subValue="Usuarios registrados"
                trend="neutral"
                icon={<UserCheck size={20} />}
                accentColor="var(--info)"
                accentBg="var(--info-50)"
              />
            )}
            {hasCompras ? (
              <KPICard
                label="Órdenes de Compra (CxP)"
                value={metrics.openPOsCount.toString()}
                subValue={fmt(metrics.totalCxP) + ' por pagar'}
                trend="neutral"
                icon={<ShoppingCart size={20} />}
                accentColor="var(--danger)"
                accentBg="var(--danger-50)"
                onClick={() => router.push('/compras')}
                linkLabel="Ver Compras"
              />
            ) : (
              <KPICard
                label="Promedio por Factura"
                value={fmt(metrics.averageTicket)}
                subValue={`${metrics.validInvoicesCount} ventas en el período`}
                trend="neutral"
                icon={<ShoppingCart size={20} />}
                accentColor="var(--success)"
                accentBg="var(--success-50)"
              />
            )}
          </div>

          {/* Posición Real de Cartera */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Balance de Cartera Fáctico: Activos Exigibles vs Pasivos Corrientes
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Proporción matemática real entre cuentas por cobrar y compromisos en compras
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground block">Posición Neta</span>
                <span
                  className={`text-lg font-bold ${
                    metrics.totalCxC >= metrics.totalCxP
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {metrics.totalCxC >= metrics.totalCxP ? '+' : ''}
                  {fmt(metrics.totalCxC - metrics.totalCxP)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1">
                  <span>Por Cobrar (CxC)</span>
                  <span className="text-emerald-600">
                    {fmt(metrics.totalCxC)} ({metrics.cxcPercentage}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${metrics.cxcPercentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Suma de saldos deudores de clientes y facturas pendientes.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1">
                  <span>Por Pagar (CxP)</span>
                  <span className="text-rose-600">
                    {fmt(metrics.totalCxP)} ({metrics.cxpPercentage}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${metrics.cxpPercentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Compromisos vigentes en órdenes de compra con proveedores.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
