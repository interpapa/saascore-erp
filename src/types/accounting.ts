export interface FiscalPeriodFilter {
  startDate?: string;
  endDate?: string;
  preset?: 'all' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';
  status?: 'posted' | 'draft' | 'all';
}

export interface Account {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  level: number;
  parentCode?: string;
  isHeader: boolean;
  balance?: number;
}

export interface JournalLine {
  id?: string;
  journal_entry_id?: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntry {
  id: string;
  tenant_id: string;
  document_id?: string | null;
  entry_number?: string;
  entry_date: string;
  description: string;
  total_debit: number;
  total_credit: number;
  status: 'posted' | 'draft' | 'annulled';
  lines: JournalLine[];
  created_at?: string;
  source_document_ref?: string;
}

export interface TrialBalanceRow {
  account_code: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  initial_debit: number;
  initial_credit: number;
  period_debit: number;
  period_credit: number;
  final_debit: number;
  final_credit: number;
  isHeader?: boolean;
  level?: number;
}

export interface IncomeStatementReport {
  period: FiscalPeriodFilter;
  revenue: {
    rows: Array<{ code: string; name: string; amount: number }>;
    total: number;
  };
  costOfSales: {
    rows: Array<{ code: string; name: string; amount: number }>;
    total: number;
  };
  grossProfit: number;
  operatingExpenses: {
    rows: Array<{ code: string; name: string; amount: number }>;
    total: number;
  };
  operatingProfit: number;
  otherIncomeExpenses: {
    rows: Array<{ code: string; name: string; amount: number }>;
    total: number;
  };
  netProfit: number;
}

export interface JournalEntriesResult {
  success: boolean;
  data?: JournalEntry[];
  error?: string;
  totalCount?: number;
}

export interface TrialBalanceResult {
  success: boolean;
  data?: TrialBalanceRow[];
  totals?: { debit: number; credit: number };
  error?: string;
}

export interface IncomeStatementResult {
  success: boolean;
  data?: IncomeStatementReport;
  error?: string;
}
