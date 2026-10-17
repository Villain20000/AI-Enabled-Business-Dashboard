-- ============================================================================
-- 0002_security_and_features.sql
--
-- * Hardens RLS so database permissions match the application RBAC model.
-- * Adds subscription state needed by the billing lifecycle.
-- * Adds data import, alert event, AI conversation, and Stripe idempotency
--   tables used by the completed feature set.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Billing state
-- ----------------------------------------------------------------------------
alter table organizations add column if not exists stripe_subscription_id text;
alter table organizations add column if not exists subscription_status text default 'inactive';
alter table organizations add column if not exists current_period_end timestamptz;
alter table organizations add column if not exists cancel_at_period_end boolean default false;
alter table organizations add column if not exists updated_at timestamptz default now();

alter table audit_logs add column if not exists actor_label text;

-- ----------------------------------------------------------------------------
-- Alert rule fields
-- ----------------------------------------------------------------------------
alter table alert_rules add column if not exists enabled boolean not null default true;
alter table alert_rules add column if not exists last_checked_at timestamptz;
alter table alert_rules add column if not exists last_triggered_at timestamptz;
alter table alert_rules add column if not exists cooldown_seconds integer not null default 3600;
alter table alert_rules add column if not exists created_by uuid;
alter table alert_rules add column if not exists updated_at timestamptz default now();

-- ----------------------------------------------------------------------------
-- Data ingestion
-- ----------------------------------------------------------------------------
create table if not exists data_sources (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  name          text not null,
  kind          text not null default 'csv',
  status        text not null default 'active',
  last_synced_at timestamptz,
  created_by    uuid,
  created_at    timestamptz not null default now()
);

create table if not exists import_jobs (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations(id) on delete cascade,
  data_source_id uuid references data_sources(id) on delete set null,
  kind           text not null,
  status         text not null default 'processing',
  row_count      integer not null default 0,
  error_count    integer not null default 0,
  errors         jsonb not null default '[]'::jsonb,
  created_by     uuid,
  created_at     timestamptz not null default now(),
  completed_at   timestamptz
);

-- ----------------------------------------------------------------------------
-- Alert execution
-- ----------------------------------------------------------------------------
create table if not exists alert_events (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  rule_id         uuid not null references alert_rules(id) on delete cascade,
  triggered_value numeric,
  status          text not null default 'triggered',
  channel         text not null,
  destination     text not null,
  payload         jsonb not null default '{}'::jsonb,
  error           text,
  created_at      timestamptz not null default now(),
  delivered_at    timestamptz
);

-- ----------------------------------------------------------------------------
-- AI persistence
-- ----------------------------------------------------------------------------
create table if not exists ai_conversations (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  user_id    uuid not null,
  title      text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Stripe webhook idempotency
-- ----------------------------------------------------------------------------
create table if not exists stripe_events (
  id           text primary key,
  type         text not null,
  processed_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Indexes and constraints
-- ----------------------------------------------------------------------------
create unique index if not exists api_keys_hashed_key_unique on api_keys (hashed_key);
create index if not exists organizations_stripe_customer_idx on organizations (stripe_customer_id);
create index if not exists organization_invitations_lookup_idx
  on organization_invitations (org_id, email, status);
create unique index if not exists organization_invitations_pending_email_unique
  on organization_invitations (org_id, lower(email))
  where status = 'pending';
create unique index if not exists organization_members_one_owner_idx
  on organization_members (org_id)
  where role = 'owner';
create index if not exists alert_rules_enabled_idx on alert_rules (enabled);
create index if not exists alert_events_org_created_idx on alert_events (org_id, created_at desc);
create index if not exists import_jobs_org_created_idx on import_jobs (org_id, created_at desc);
create index if not exists ai_conversations_org_user_idx on ai_conversations (org_id, user_id);
create index if not exists ai_messages_conversation_idx on ai_messages (conversation_id, created_at);

-- ----------------------------------------------------------------------------
-- Role helper (security definer avoids recursive RLS evaluation)
-- ----------------------------------------------------------------------------
create or replace function has_org_role(target_org_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from organization_members
    where organization_members.org_id = target_org_id
      and organization_members.user_id = auth.uid()
      and organization_members.role = any(allowed_roles)
  );
$$;

create or replace function owns_ai_conversation(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from ai_conversations c
    join organization_members m
      on m.org_id = c.org_id
     and m.user_id = auth.uid()
    where c.id = target_conversation_id
      and c.user_id = auth.uid()
  );
$$;

-- ----------------------------------------------------------------------------
-- Policy replacement
-- ----------------------------------------------------------------------------
drop policy if exists "organizations_select" on organizations;
create policy "organizations_select" on organizations
  for select using (is_org_member(id));

drop policy if exists "organizations_update" on organizations;
create policy "organizations_update" on organizations
  for update
  using (has_org_role(id, array['owner']))
  with check (has_org_role(id, array['owner']));

drop policy if exists "organizations_delete" on organizations;
create policy "organizations_delete" on organizations
  for delete using (has_org_role(id, array['owner']));

drop policy if exists "organization_members_select" on organization_members;
create policy "organization_members_select" on organization_members
  for select using (is_org_member(org_id));

drop policy if exists "organization_members_insert" on organization_members;
create policy "organization_members_insert" on organization_members
  for insert with check (has_org_role(org_id, array['owner', 'admin']));

drop policy if exists "organization_members_update" on organization_members;
create policy "organization_members_update" on organization_members
  for update
  using (has_org_role(org_id, array['owner', 'admin']))
  with check (has_org_role(org_id, array['owner', 'admin']));

drop policy if exists "organization_members_delete" on organization_members;
create policy "organization_members_delete" on organization_members
  for delete using (has_org_role(org_id, array['owner', 'admin']));

drop policy if exists "organization_invitations_select" on organization_invitations;
create policy "organization_invitations_select" on organization_invitations
  for select using (has_org_role(org_id, array['owner', 'admin']));

drop policy if exists "organization_invitations_insert" on organization_invitations;
create policy "organization_invitations_insert" on organization_invitations
  for insert with check (has_org_role(org_id, array['owner', 'admin']));

drop policy if exists "organization_invitations_update" on organization_invitations;
create policy "organization_invitations_update" on organization_invitations
  for update
  using (has_org_role(org_id, array['owner', 'admin']))
  with check (has_org_role(org_id, array['owner', 'admin']));

drop policy if exists "organization_invitations_delete" on organization_invitations;
create policy "organization_invitations_delete" on organization_invitations
  for delete using (has_org_role(org_id, array['owner', 'admin']));

drop policy if exists "api_keys_select" on api_keys;
create policy "api_keys_select" on api_keys
  for select using (has_org_role(org_id, array['owner', 'admin']));

drop policy if exists "api_keys_insert" on api_keys;
create policy "api_keys_insert" on api_keys
  for insert with check (has_org_role(org_id, array['owner', 'admin']));

drop policy if exists "api_keys_update" on api_keys;
create policy "api_keys_update" on api_keys
  for update
  using (has_org_role(org_id, array['owner', 'admin']))
  with check (has_org_role(org_id, array['owner', 'admin']));

drop policy if exists "api_keys_delete" on api_keys;
create policy "api_keys_delete" on api_keys
  for delete using (has_org_role(org_id, array['owner', 'admin']));

drop policy if exists "audit_logs_select" on audit_logs;
create policy "audit_logs_select" on audit_logs
  for select using (has_org_role(org_id, array['owner', 'admin']));

-- Audit inserts must go through the service role or a server route. Normal
-- users must not be able to forge audit entries.
drop policy if exists "audit_logs_insert" on audit_logs;

drop policy if exists "usage_events_select" on usage_events;
create policy "usage_events_select" on usage_events
  for select using (has_org_role(org_id, array['owner', 'admin']));

drop policy if exists "usage_events_insert" on usage_events;

drop policy if exists "feature_flags_select" on feature_flags;
create policy "feature_flags_select" on feature_flags
  for select using (is_org_member(org_id));

drop policy if exists "feature_flags_insert" on feature_flags;
create policy "feature_flags_insert" on feature_flags
  for insert with check (has_org_role(org_id, array['owner']));

drop policy if exists "feature_flags_update" on feature_flags;
create policy "feature_flags_update" on feature_flags
  for update
  using (has_org_role(org_id, array['owner']))
  with check (has_org_role(org_id, array['owner']));

drop policy if exists "feature_flags_delete" on feature_flags;
create policy "feature_flags_delete" on feature_flags
  for delete using (has_org_role(org_id, array['owner']));

-- Alert rules: members and above can manage, viewers can read.
drop policy if exists "alert_rules_select" on alert_rules;
create policy "alert_rules_select" on alert_rules
  for select using (is_org_member(org_id));

drop policy if exists "alert_rules_insert" on alert_rules;
create policy "alert_rules_insert" on alert_rules
  for insert with check (has_org_role(org_id, array['owner', 'admin', 'member']));

drop policy if exists "alert_rules_update" on alert_rules;
create policy "alert_rules_update" on alert_rules
  for update
  using (has_org_role(org_id, array['owner', 'admin', 'member']))
  with check (has_org_role(org_id, array['owner', 'admin', 'member']));

drop policy if exists "alert_rules_delete" on alert_rules;
create policy "alert_rules_delete" on alert_rules
  for delete using (has_org_role(org_id, array['owner', 'admin', 'member']));

-- Business data: every member can read, but only owner/admin/member can write.
-- 0001 granted writes to any org member, which let a viewer mutate dashboard
-- data even though the application's RBAC treats viewers as read-only.
drop policy if exists "sales_data_insert" on sales_data;
create policy "sales_data_insert" on sales_data
  for insert with check (has_org_role(org_id, array['owner', 'admin', 'member']));

drop policy if exists "sales_data_update" on sales_data;
create policy "sales_data_update" on sales_data
  for update
  using (has_org_role(org_id, array['owner', 'admin', 'member']))
  with check (has_org_role(org_id, array['owner', 'admin', 'member']));

drop policy if exists "sales_data_delete" on sales_data;
create policy "sales_data_delete" on sales_data
  for delete using (has_org_role(org_id, array['owner', 'admin', 'member']));

drop policy if exists "inventory_data_insert" on inventory_data;
create policy "inventory_data_insert" on inventory_data
  for insert with check (has_org_role(org_id, array['owner', 'admin', 'member']));

drop policy if exists "inventory_data_update" on inventory_data;
create policy "inventory_data_update" on inventory_data
  for update
  using (has_org_role(org_id, array['owner', 'admin', 'member']))
  with check (has_org_role(org_id, array['owner', 'admin', 'member']));

drop policy if exists "inventory_data_delete" on inventory_data;
create policy "inventory_data_delete" on inventory_data
  for delete using (has_org_role(org_id, array['owner', 'admin', 'member']));

drop policy if exists "kpis_insert" on kpis;
create policy "kpis_insert" on kpis
  for insert with check (has_org_role(org_id, array['owner', 'admin', 'member']));

drop policy if exists "kpis_update" on kpis;
create policy "kpis_update" on kpis
  for update
  using (has_org_role(org_id, array['owner', 'admin', 'member']))
  with check (has_org_role(org_id, array['owner', 'admin', 'member']));

drop policy if exists "kpis_delete" on kpis;
create policy "kpis_delete" on kpis
  for delete using (has_org_role(org_id, array['owner', 'admin', 'member']));

-- ----------------------------------------------------------------------------
-- New table RLS
-- ----------------------------------------------------------------------------
alter table data_sources enable row level security;
alter table import_jobs enable row level security;
alter table alert_events enable row level security;
alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;
alter table stripe_events enable row level security;

drop policy if exists "data_sources_select" on data_sources;
create policy "data_sources_select" on data_sources
  for select using (is_org_member(org_id));

drop policy if exists "data_sources_member_write" on data_sources;
create policy "data_sources_member_write" on data_sources
  for all
  using (has_org_role(org_id, array['owner', 'admin', 'member']))
  with check (has_org_role(org_id, array['owner', 'admin', 'member']));

drop policy if exists "import_jobs_select" on import_jobs;
create policy "import_jobs_select" on import_jobs
  for select using (is_org_member(org_id));

drop policy if exists "import_jobs_member_write" on import_jobs;
create policy "import_jobs_member_write" on import_jobs
  for all
  using (has_org_role(org_id, array['owner', 'admin', 'member']))
  with check (has_org_role(org_id, array['owner', 'admin', 'member']));

drop policy if exists "alert_events_select" on alert_events;
create policy "alert_events_select" on alert_events
  for select using (is_org_member(org_id));

drop policy if exists "alert_events_member_write" on alert_events;
create policy "alert_events_member_write" on alert_events
  for all
  using (has_org_role(org_id, array['owner', 'admin', 'member']))
  with check (has_org_role(org_id, array['owner', 'admin', 'member']));

drop policy if exists "ai_conversations_own" on ai_conversations;
create policy "ai_conversations_own" on ai_conversations
  for all
  using (user_id = auth.uid() and is_org_member(org_id))
  with check (user_id = auth.uid() and is_org_member(org_id));

drop policy if exists "ai_messages_own" on ai_messages;
create policy "ai_messages_own" on ai_messages
  for all
  using (owns_ai_conversation(conversation_id))
  with check (owns_ai_conversation(conversation_id));

-- stripe_events is service-role only. Enable RLS with no permissive policies.
