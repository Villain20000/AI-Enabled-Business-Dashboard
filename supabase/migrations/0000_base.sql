-- ============================================================================
-- 0000_base.sql
--
-- Base business tables.
--
-- 0001_enterprise.sql retrofits org_id onto these tables, so they must exist
-- first on a fresh Supabase project. Columns mirror what the dashboard
-- components consume today; normalized data models can be added later.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists sales_data (
  id         uuid primary key default gen_random_uuid(),
  month      text not null,
  sales      numeric not null default 0,
  target     numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table sales_data add column if not exists month text;
alter table sales_data add column if not exists sales numeric default 0;
alter table sales_data add column if not exists target numeric default 0;
alter table sales_data add column if not exists created_at timestamptz default now();

create table if not exists inventory_data (
  id         uuid primary key default gen_random_uuid(),
  product    text not null,
  stock      integer not null default 0,
  status     text not null default 'Healthy',
  created_at timestamptz not null default now()
);

alter table inventory_data add column if not exists product text;
alter table inventory_data add column if not exists stock integer default 0;
alter table inventory_data add column if not exists status text default 'Healthy';
alter table inventory_data add column if not exists created_at timestamptz default now();

create table if not exists kpis (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  value      text not null default '0',
  change     text not null default '0%',
  trend      text not null default 'up',
  created_at timestamptz not null default now()
);

alter table kpis add column if not exists title text;
alter table kpis add column if not exists value text default '0';
alter table kpis add column if not exists change text default '0%';
alter table kpis add column if not exists trend text default 'up';
alter table kpis add column if not exists created_at timestamptz default now();

create table if not exists alert_rules (
  id          uuid primary key default gen_random_uuid(),
  kpi         text not null,
  condition   text not null default '>',
  threshold   numeric not null default 0,
  method      text not null default 'email',
  destination text not null,
  created_at  timestamptz not null default now()
);

alter table alert_rules add column if not exists kpi text;
alter table alert_rules add column if not exists condition text default '>';
alter table alert_rules add column if not exists threshold numeric default 0;
alter table alert_rules add column if not exists method text default 'email';
alter table alert_rules add column if not exists destination text;
alter table alert_rules add column if not exists created_at timestamptz default now();
