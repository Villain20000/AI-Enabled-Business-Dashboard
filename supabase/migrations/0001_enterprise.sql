-- ============================================================================
-- 0001_enterprise.sql
--
-- Multi-tenant enterprise schema migration for Supabase.
--
-- This migration introduces the core organizational/multi-tenancy primitives:
--   - organizations
--   - organization_members
--   - organization_invitations
--   - audit_logs
--   - api_keys
--   - usage_events
--   - feature_flags
--
-- It also retro-fits org_id tenancy onto the existing application tables
-- (sales_data, inventory_data, kpis, alert_rules) and enables Row Level
-- Security (RLS) across every table, with policies driven by a helper
-- function `is_org_member(org_id uuid)` that checks membership against the
-- authenticated user (auth.uid()).
--
-- All statements are idempotent (IF NOT EXISTS) so the migration can be
-- re-applied safely.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
-- pgcrypto provides gen_random_uuid(); it is enabled by default on Supabase
-- but we ensure it is present for portability.
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Tables: core enterprise primitives
-- ----------------------------------------------------------------------------

create table if not exists organizations (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  slug               text unique not null,
  stripe_customer_id text,
  subscription_plan  text default 'free',
  created_at         timestamptz default now()
);

create table if not exists organization_members (
  org_id     uuid references organizations(id) on delete cascade,
  user_id    uuid not null,
  role       text not null check (role in ('owner','admin','member','viewer')),
  created_at timestamptz default now(),
  primary key (org_id, user_id)
);

create table if not exists organization_invitations (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references organizations(id) on delete cascade,
  email      text not null,
  role       text not null check (role in ('owner','admin','member','viewer')),
  token      text unique not null,
  expires_at timestamptz not null,
  status     text default 'pending',
  created_at timestamptz default now()
);

create table if not exists audit_logs (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references organizations(id) on delete cascade,
  user_id    uuid,
  action     text not null,
  resource   text not null,
  metadata   jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists api_keys (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references organizations(id) on delete cascade,
  name         text not null,
  hashed_key   text not null,
  prefix       text not null,
  last_used_at timestamptz,
  created_at   timestamptz default now(),
  revoked_at   timestamptz
);

create table if not exists usage_events (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references organizations(id) on delete cascade,
  event_type text not null,
  created_at timestamptz default now()
);

create table if not exists feature_flags (
  org_id  uuid references organizations(id) on delete cascade,
  flag    text not null,
  enabled boolean not null,
  primary key (org_id, flag)
);

-- ----------------------------------------------------------------------------
-- Alter existing application tables to add org_id tenancy
-- ----------------------------------------------------------------------------

alter table sales_data
  add column if not exists org_id uuid references organizations(id) on delete cascade;
create index if not exists sales_data_org_id_idx on sales_data (org_id);

alter table inventory_data
  add column if not exists org_id uuid references organizations(id) on delete cascade;
create index if not exists inventory_data_org_id_idx on inventory_data (org_id);

alter table kpis
  add column if not exists org_id uuid references organizations(id) on delete cascade;
create index if not exists kpis_org_id_idx on kpis (org_id);

alter table alert_rules
  add column if not exists org_id uuid references organizations(id) on delete cascade;
create index if not exists alert_rules_org_id_idx on alert_rules (org_id);

-- ----------------------------------------------------------------------------
-- Helper indexes
-- ----------------------------------------------------------------------------

create index if not exists organization_members_user_id_idx
  on organization_members (user_id);

create index if not exists audit_logs_org_id_created_at_idx
  on audit_logs (org_id, created_at desc);

create index if not exists usage_events_org_id_event_type_created_at_idx
  on usage_events (org_id, event_type, created_at);

create index if not exists api_keys_hashed_key_idx
  on api_keys (hashed_key);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

-- Helper function: returns true if the authenticated user is a member of the
-- given organization. Uses auth.uid() to identify the acting user.
create or replace function is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from organization_members
    where organization_members.org_id = is_org_member.org_id
      and organization_members.user_id = auth.uid()
  );
$$;

-- Enable RLS on every table.
alter table organizations            enable row level security;
alter table organization_members     enable row level security;
alter table organization_invitations enable row level security;
alter table audit_logs               enable row level security;
alter table api_keys                 enable row level security;
alter table usage_events             enable row level security;
alter table feature_flags            enable row level security;
alter table sales_data               enable row level security;
alter table inventory_data           enable row level security;
alter table kpis                     enable row level security;
alter table alert_rules              enable row level security;

-- ----------------------------------------------------------------------------
-- RLS Policies
-- ----------------------------------------------------------------------------

-- organizations: SELECT/UPDATE/DELETE where is_org_member(id)
create policy "organizations_select" on organizations
  for select using (is_org_member(id));

create policy "organizations_update" on organizations
  for update using (is_org_member(id)) with check (is_org_member(id));

create policy "organizations_delete" on organizations
  for delete using (is_org_member(id));

-- organization_members:
--   SELECT where is_org_member(org_id)
--   INSERT/UPDATE/DELETE where is_org_member(org_id) AND the acting user is
--   an admin or owner (determined via a subquery on their own role).
create policy "organization_members_select" on organization_members
  for select using (is_org_member(org_id));

create policy "organization_members_insert" on organization_members
  for insert
  with check (
    is_org_member(org_id)
    and exists (
      select 1
      from organization_members m
      where m.org_id = organization_members.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner','admin')
    )
  );

create policy "organization_members_update" on organization_members
  for update
  using (
    is_org_member(org_id)
    and exists (
      select 1
      from organization_members m
      where m.org_id = organization_members.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner','admin')
    )
  )
  with check (
    is_org_member(org_id)
    and exists (
      select 1
      from organization_members m
      where m.org_id = organization_members.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner','admin')
    )
  );

create policy "organization_members_delete" on organization_members
  for delete
  using (
    is_org_member(org_id)
    and exists (
      select 1
      from organization_members m
      where m.org_id = organization_members.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner','admin')
    )
  );

-- organization_invitations: SELECT/INSERT/UPDATE/DELETE where is_org_member(org_id)
create policy "organization_invitations_select" on organization_invitations
  for select using (is_org_member(org_id));

create policy "organization_invitations_insert" on organization_invitations
  for insert with check (is_org_member(org_id));

create policy "organization_invitations_update" on organization_invitations
  for update using (is_org_member(org_id)) with check (is_org_member(org_id));

create policy "organization_invitations_delete" on organization_invitations
  for delete using (is_org_member(org_id));

-- Application data tables: SELECT/INSERT/UPDATE/DELETE where is_org_member(org_id)
create policy "sales_data_select" on sales_data
  for select using (is_org_member(org_id));
create policy "sales_data_insert" on sales_data
  for insert with check (is_org_member(org_id));
create policy "sales_data_update" on sales_data
  for update using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "sales_data_delete" on sales_data
  for delete using (is_org_member(org_id));

create policy "inventory_data_select" on inventory_data
  for select using (is_org_member(org_id));
create policy "inventory_data_insert" on inventory_data
  for insert with check (is_org_member(org_id));
create policy "inventory_data_update" on inventory_data
  for update using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "inventory_data_delete" on inventory_data
  for delete using (is_org_member(org_id));

create policy "kpis_select" on kpis
  for select using (is_org_member(org_id));
create policy "kpis_insert" on kpis
  for insert with check (is_org_member(org_id));
create policy "kpis_update" on kpis
  for update using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "kpis_delete" on kpis
  for delete using (is_org_member(org_id));

create policy "alert_rules_select" on alert_rules
  for select using (is_org_member(org_id));
create policy "alert_rules_insert" on alert_rules
  for insert with check (is_org_member(org_id));
create policy "alert_rules_update" on alert_rules
  for update using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "alert_rules_delete" on alert_rules
  for delete using (is_org_member(org_id));

-- audit_logs: SELECT where is_org_member(org_id); INSERT open for service role.
create policy "audit_logs_select" on audit_logs
  for select using (is_org_member(org_id));

create policy "audit_logs_insert" on audit_logs
  for insert with check (true);

-- api_keys: SELECT/INSERT/UPDATE/DELETE where is_org_member(org_id)
create policy "api_keys_select" on api_keys
  for select using (is_org_member(org_id));
create policy "api_keys_insert" on api_keys
  for insert with check (is_org_member(org_id));
create policy "api_keys_update" on api_keys
  for update using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "api_keys_delete" on api_keys
  for delete using (is_org_member(org_id));

-- usage_events: SELECT where is_org_member(org_id); INSERT open (service role).
create policy "usage_events_select" on usage_events
  for select using (is_org_member(org_id));

create policy "usage_events_insert" on usage_events
  for insert with check (true);

-- feature_flags: SELECT where is_org_member(org_id); INSERT/UPDATE/DELETE where is_org_member(org_id)
create policy "feature_flags_select" on feature_flags
  for select using (is_org_member(org_id));
create policy "feature_flags_insert" on feature_flags
  for insert with check (is_org_member(org_id));
create policy "feature_flags_update" on feature_flags
  for update using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "feature_flags_delete" on feature_flags
  for delete using (is_org_member(org_id));
