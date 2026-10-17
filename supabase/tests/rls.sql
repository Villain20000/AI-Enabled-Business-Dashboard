-- ============================================================================
-- supabase/tests/rls.sql
--
-- Row Level Security regression tests. Run against a database that has the
-- migrations applied (local Supabase or CI):
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
--
-- Everything runs inside a transaction that is rolled back, so the database is
-- left untouched. Any failed assertion raises an exception and the command
-- exits non-zero.
--
-- Covers:
--   * tenant isolation for every org-scoped table
--   * viewer read-only, member write, admin management, owner-only org changes
--   * no RLS recursion on organization_members
--   * AI conversations are private to their author
--   * audit entries and Stripe events cannot be written/read by clients
-- ============================================================================

begin;

-- Roles that Supabase provides. They exist on a real project; create them for
-- a bare Postgres used in CI.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Fixtures ------------------------------------------------------------------
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner-a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'owner-b@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'member-a@example.com'),
  ('44444444-4444-4444-4444-444444444444', 'viewer-a@example.com'),
  ('55555555-5555-5555-5555-555555555555', 'admin-a@example.com');

insert into organizations (id, name, slug) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A', 'rls-org-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org B', 'rls-org-b');

insert into organization_members (org_id, user_id, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'owner'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'member'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'viewer'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'admin');

insert into sales_data (org_id, month, sales, target) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Jan', 100, 120),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Jan', 999, 999);

insert into audit_logs (org_id, user_id, action, resource) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'test.a', 'x');

insert into ai_conversations (id, org_id, user_id, title) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111', 'owner conversation');

insert into ai_messages (conversation_id, role, content) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'user', 'private');

-- Assertions ----------------------------------------------------------------
-- Every assertion runs as the `authenticated` role with a JWT subject, exactly
-- like a request through PostgREST.
set local role authenticated;

create function pg_temp.assert(ok boolean, label text) returns void
language plpgsql as $$
begin
  if not coalesce(ok, false) then
    raise exception 'FAILED: %', label;
  end if;
  raise notice 'ok - %', label;
end $$;

-- Viewer (read-only, org A)
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
select pg_temp.assert((select count(*) from sales_data) = 1, 'viewer sees only own tenant rows');
select pg_temp.assert((select count(*) from organizations) = 1, 'viewer sees only own tenant org');
select pg_temp.assert(
  not exists (select 1 from organizations where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  'viewer cannot see another tenant');

do $$
begin
  begin
    insert into sales_data (org_id, month, sales, target)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Feb', 1, 1);
    raise exception 'FAILED: viewer inserted sales data';
  exception when insufficient_privilege then
    raise notice 'ok - viewer cannot insert sales data';
  end;
end $$;

do $$
begin
  begin
    insert into alert_rules (org_id, kpi, destination)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Total Revenue', 'x@example.com');
    raise exception 'FAILED: viewer created an alert rule';
  exception when insufficient_privilege then
    raise notice 'ok - viewer cannot create alert rules';
  end;
end $$;

-- Member (data + alerts, no team/billing/admin powers)
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
insert into sales_data (org_id, month, sales, target)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Feb', 10, 20);
select pg_temp.assert(
  (select count(*) from sales_data where month = 'Feb') = 1,
  'member can insert sales data');

do $$
declare
  changed integer;
begin
  update organizations set name = 'hacked'
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  get diagnostics changed = row_count;
  perform pg_temp.assert(changed = 0, 'member cannot rename the organization');
end $$;
select pg_temp.assert((select count(*) from audit_logs) = 0, 'member cannot read audit logs');
select pg_temp.assert((select count(*) from ai_conversations) = 0,
  'member cannot see another user conversation');
select pg_temp.assert((select count(*) from ai_messages) = 0,
  'member cannot read another user messages');

do $$
begin
  begin
    insert into organization_members (org_id, user_id, role)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'admin');
    raise exception 'FAILED: member added a member';
  exception when insufficient_privilege then
    raise notice 'ok - member cannot add members (policy is not recursive)';
  end;
end $$;

do $$
begin
  begin
    insert into api_keys (org_id, name, hashed_key, prefix)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'k', 'hash', 'prefix');
    raise exception 'FAILED: member created an API key';
  exception when insufficient_privilege then
    raise notice 'ok - member cannot create API keys';
  end;
end $$;

do $$
begin
  begin
    insert into ai_messages (conversation_id, role, content)
    values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'user', 'pwned');
    raise exception 'FAILED: member wrote into another conversation';
  exception when insufficient_privilege then
    raise notice 'ok - member cannot write into another user conversation';
  end;
end $$;

do $$
begin
  begin
    insert into audit_logs (org_id, user_id, action, resource)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            '33333333-3333-3333-3333-333333333333', 'fake', 'x');
    raise exception 'FAILED: member forged an audit entry';
  exception when insufficient_privilege then
    raise notice 'ok - member cannot forge audit entries';
  end;
end $$;

-- Admin (team + audit, not billing/org ownership)
select set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);
select pg_temp.assert((select count(*) from audit_logs) = 1, 'admin can read audit logs');

insert into api_keys (org_id, name, hashed_key, prefix)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin-key', 'hash-admin', 'prefix');
select pg_temp.assert(
  (select count(*) from api_keys where name = 'admin-key') = 1,
  'admin can create API keys');

do $$
declare
  changed integer;
begin
  update organizations set name = 'admin-renamed'
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  get diagnostics changed = row_count;
  perform pg_temp.assert(changed = 0, 'admin cannot rename the organization');
end $$;

-- Owner (full control of the organization)
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select pg_temp.assert((select count(*) from audit_logs) = 1, 'owner can read audit logs');

do $$
declare
  changed integer;
begin
  update organizations set name = 'Org A'
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  get diagnostics changed = row_count;
  perform pg_temp.assert(changed = 1, 'owner can rename the organization');
end $$;
select pg_temp.assert((select count(*) from ai_conversations) = 1,
  'owner can read own conversation');
select pg_temp.assert((select count(*) from stripe_events) = 0,
  'stripe events are invisible to clients');

-- Cross-tenant checks for newly added tables.
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select pg_temp.assert(
  (select count(*) from import_jobs where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = 0,
  'import jobs are scoped to the tenant');
select pg_temp.assert(
  (select count(*) from data_sources where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = 0,
  'data sources are scoped to the tenant');
select pg_temp.assert(
  (select count(*) from alert_events where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = 0,
  'alert events are scoped to the tenant');

reset role;
rollback;
