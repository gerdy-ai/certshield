export type CertStatus = 'active' | 'expiring_soon' | 'expired' | 'pending';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  clerk_org_id: string;
  plan: 'starter' | 'growth' | 'agency';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  notification_email: string | null;
  webhook_url: string | null;
  reminder_30d_email: boolean;
  reminder_14d_email: boolean;
  reminder_7d_email: boolean;
  reminder_30d_sms: boolean;
  reminder_14d_sms: boolean;
  reminder_7d_sms: boolean;
  created_at: string;
}

export interface Subcontractor {
  id: string;
  org_id: string;
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  phone?: string;
  upload_token: string;
  deleted_at?: string;
  created_at: string;
}

export interface Certificate {
  id: string;
  subcontractor_id: string;
  org_id: string;
  file_path: string;
  file_name: string;
  uploaded_at: string;
  parsed_at?: string;
  parse_status: 'pending' | 'processing' | 'complete' | 'failed';

  insurer_name?: string;
  policy_number?: string;
  policy_type?: string;
  coverage_amount?: number;
  effective_date?: string;
  expiration_date?: string;
  certificate_holder?: string;
  additional_insured?: boolean;

  status: CertStatus;
}

export interface ReminderLog {
  id: string;
  certificate_id: string;
  subcontractor_id: string;
  org_id: string;
  reminder_type: 'email' | 'sms';
  days_before_expiry: number;
  sent_at: string;
  success: boolean;
  error_message: string | null;
}

export interface ParsedCertFields {
  insurer_name: string | null;
  policy_number: string | null;
  policy_type: string | null;
  coverage_amount: number | null;
  effective_date: string | null;
  expiration_date: string | null;
  certificate_holder: string | null;
  additional_insured: boolean | null;
}
