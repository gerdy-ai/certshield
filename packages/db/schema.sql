create extension if not exists pgcrypto;

CREATE TABLE organizations (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text unique not null,
  name text not null,
  slug text unique not null,
  plan text not null default 'starter' check (plan in ('starter','growth','agency')),
  stripe_customer_id text,
  stripe_subscription_id text,
  notification_email text,
  webhook_url text,
  reminder_30d_email boolean default true,
  reminder_14d_email boolean default true,
  reminder_7d_email boolean default true,
  reminder_30d_sms boolean default false,
  reminder_14d_sms boolean default false,
  reminder_7d_sms boolean default false,
  created_at timestamptz default now()
);

CREATE TABLE subcontractors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  company_name text not null,
  email text not null,
  phone text,
  upload_token uuid unique default gen_random_uuid(),
  deleted_at timestamptz,
  created_at timestamptz default now()
);

CREATE TABLE certificates (
  id uuid primary key default gen_random_uuid(),
  subcontractor_id uuid references subcontractors(id) on delete cascade,
  org_id uuid references organizations(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_size_bytes integer,
  uploaded_at timestamptz default now(),
  parsed_at timestamptz,
  parse_status text default 'pending' check (parse_status in ('pending','processing','complete','failed')),
  parse_error text,
  insurer_name text,
  policy_number text,
  policy_type text,
  coverage_amount numeric,
  effective_date date,
  expiration_date date,
  certificate_holder text,
  additional_insured boolean,
  created_at timestamptz default now()
);

CREATE TABLE reminder_logs (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid references certificates(id) on delete cascade,
  subcontractor_id uuid references subcontractors(id) on delete cascade,
  org_id uuid references organizations(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('email','sms')),
  days_before_expiry integer not null,
  sent_at timestamptz default now(),
  success boolean not null,
  error_message text
);

CREATE TABLE audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  user_id text not null,
  action text not null,
  resource_type text not null,
  resource_id text,
  created_at timestamptz default now()
);
