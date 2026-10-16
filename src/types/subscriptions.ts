export type SubscriptionFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';

export type SubscriptionStatus = 'active' | 'due' | 'paused' | 'cancelled';

export interface SubscriptionPlan {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  frequency: SubscriptionFrequency;
  price_usd: number;
  grace_period_days?: number;
  max_sessions_per_cycle?: number | null;
  is_active: boolean;
  color?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  client_id: string;
  client_name: string;
  client_phone?: string | null;
  client_email?: string | null;
  plan_id: string;
  plan_name: string;
  frequency: SubscriptionFrequency;
  status: SubscriptionStatus;
  start_date: string; // YYYY-MM-DD
  next_billing_date: string; // YYYY-MM-DD
  last_payment_date?: string | null;
  price_usd: number;
  sessions_used?: number;
  max_sessions?: number | null;
  max_sessions_per_cycle?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface SubscriptionPaymentRecord {
  id: string;
  subscription_id: string;
  client_id: string;
  amount_usd: number;
  payment_date: string;
  payment_method: string;
  notes?: string;
  cycle_extended_to: string;
}

export interface CreateSubscriptionInput {
  client_id: string;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  plan_id: string;
  start_date?: string;
  price_usd?: number;
  notes?: string;
}
