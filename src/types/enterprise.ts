export interface TenantBranch {
  id: string;
  tenant_id: string | null;
  name: string;
  code?: string;
  address: string | null;
  phone: string | null;
  tax_id: string | null;
  manager_name: string | null;
  manager_email?: string | null;
  status: 'active' | 'inactive' | 'pending';
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BranchSalesMetrics {
  branch_id: string;
  branch_name: string;
  total_revenue: number;
  total_invoices: number;
  average_ticket: number;
  pending_receivables: number;
  active_customers: number;
  period?: string;
}

export interface BranchPerformance {
  branch: TenantBranch;
  metrics: BranchSalesMetrics;
  growth_rate_pct: number;
  status_label: 'Excelente' | 'Normal' | 'Atención';
}

export interface TenantBranchesResult {
  success: boolean;
  data?: TenantBranch[];
  error?: string;
}

export interface BranchPerformanceResult {
  success: boolean;
  data?: BranchPerformance[];
  globalMetrics?: {
    totalRevenue: number;
    activeBranches: number;
    topBranchName: string;
  };
  error?: string;
}
