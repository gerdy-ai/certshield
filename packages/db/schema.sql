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

create index if not exists subcontractors_org_id_idx on subcontractors (org_id);
create index if not exists certificates_org_id_idx on certificates (org_id);
create index if not exists certificates_subcontractor_id_idx on certificates (subcontractor_id);
create index if not exists reminder_logs_org_id_idx on reminder_logs (org_id);
create index if not exists audit_logs_org_id_idx on audit_logs (org_id);

create or replace function public.current_clerk_org_id()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'org_id', ''),
    nullif(auth.jwt() ->> 'orgId', ''),
    nullif(auth.jwt() -> 'app_metadata' ->> 'org_id', ''),
    nullif(auth.jwt() -> 'app_metadata' ->> 'orgId', ''),
    nullif(auth.jwt() -> 'raw_app_meta_data' ->> 'org_id', ''),
    nullif(auth.jwt() -> 'raw_app_meta_data' ->> 'orgId', ''),
    nullif(auth.jwt() -> 'organization' ->> 'id', ''),
    nullif(auth.jwt() -> 'o' ->> 'id', '')
  );
$$;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select organizations.id
  from public.organizations
  where organizations.clerk_org_id = public.current_clerk_org_id()
  limit 1;
$$;

grant execute on function public.current_clerk_org_id() to authenticated;
grant execute on function public.current_organization_id() to authenticated;

alter table organizations enable row level security;
alter table subcontractors enable row level security;
alter table certificates enable row level security;
alter table reminder_logs enable row level security;
alter table audit_logs enable row level security;

drop policy if exists "organizations_select_own" on organizations;
create policy "organizations_select_own"
  on organizations
  for select
  to authenticated
  using (id = public.current_organization_id());

drop policy if exists "organizations_update_own" on organizations;
create policy "organizations_update_own"
  on organizations
  for update
  to authenticated
  using (id = public.current_organization_id())
  with check (id = public.current_organization_id());

drop policy if exists "subcontractors_select_own_org" on subcontractors;
create policy "subcontractors_select_own_org"
  on subcontractors
  for select
  to authenticated
  using (org_id = public.current_organization_id());

drop policy if exists "subcontractors_insert_own_org" on subcontractors;
create policy "subcontractors_insert_own_org"
  on subcontractors
  for insert
  to authenticated
  with check (org_id = public.current_organization_id());

drop policy if exists "subcontractors_update_own_org" on subcontractors;
create policy "subcontractors_update_own_org"
  on subcontractors
  for update
  to authenticated
  using (org_id = public.current_organization_id())
  with check (org_id = public.current_organization_id());

drop policy if exists "subcontractors_delete_own_org" on subcontractors;
create policy "subcontractors_delete_own_org"
  on subcontractors
  for delete
  to authenticated
  using (org_id = public.current_organization_id());

drop policy if exists "certificates_select_own_org" on certificates;
create policy "certificates_select_own_org"
  on certificates
  for select
  to authenticated
  using (org_id = public.current_organization_id());

drop policy if exists "certificates_insert_own_org" on certificates;
create policy "certificates_insert_own_org"
  on certificates
  for insert
  to authenticated
  with check (
    org_id = public.current_organization_id()
    and exists (
      select 1
      from public.subcontractors
      where subcontractors.id = certificates.subcontractor_id
        and subcontractors.org_id = public.current_organization_id()
    )
  );

drop policy if exists "certificates_update_own_org" on certificates;
create policy "certificates_update_own_org"
  on certificates
  for update
  to authenticated
  using (org_id = public.current_organization_id())
  with check (
    org_id = public.current_organization_id()
    and exists (
      select 1
      from public.subcontractors
      where subcontractors.id = certificates.subcontractor_id
        and subcontractors.org_id = public.current_organization_id()
    )
  );

drop policy if exists "certificates_delete_own_org" on certificates;
create policy "certificates_delete_own_org"
  on certificates
  for delete
  to authenticated
  using (org_id = public.current_organization_id());

drop policy if exists "reminder_logs_select_own_org" on reminder_logs;
create policy "reminder_logs_select_own_org"
  on reminder_logs
  for select
  to authenticated
  using (org_id = public.current_organization_id());

drop policy if exists "audit_logs_select_own_org" on audit_logs;
create policy "audit_logs_select_own_org"
  on audit_logs
  for select
  to authenticated
  using (org_id = public.current_organization_id());
