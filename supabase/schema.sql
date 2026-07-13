-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Clients
create table if not exists public.clients (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text,
  email text,
  skin_type text,
  allergies text,
  notes text,
  avatar_url text
);

-- Services
create table if not exists public.services (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  name text not null,
  description text,
  duration_minutes integer not null default 60,
  price numeric(10,2) not null default 0,
  color text not null default '#f9a8d4'
);

-- Appointments
do $$ begin
  create type appointment_status as enum ('scheduled', 'completed', 'cancelled', 'no_show');
exception when duplicate_object then null;
end $$;

create table if not exists public.appointments (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  client_id uuid not null references public.clients(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 60,
  price numeric(10,2) not null default 0,
  status appointment_status not null default 'scheduled',
  notes text
);

-- Products / inventory
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  name text not null,
  brand text,
  category text not null,
  stock integer not null default 0,
  low_stock_threshold integer not null default 5,
  cost numeric(10,2)
);

-- Invoices
do $$ begin
  create type invoice_status as enum ('draft', 'sent', 'paid', 'void');
exception when duplicate_object then null;
end $$;

create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  invoice_number text not null unique,
  client_id uuid not null references public.clients(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete set null,
  status invoice_status not null default 'draft',
  issue_date date not null default current_date,
  due_date date,
  event_date date,
  notes text,
  subtotal numeric(10,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  tax_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  deposit_percentage numeric(5,2),
  deposit_amount numeric(10,2),
  deposit_paid_at timestamptz,
  balance_due_offset_days integer not null default 7,
  sent_at timestamptz,
  paid_at timestamptz
);

create table if not exists public.invoice_items (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(10,2) not null default 0,
  amount numeric(10,2) not null default 0,
  sort_order integer not null default 0
);

create sequence if not exists public.invoice_number_seq start 1;

create or replace function public.next_invoice_number()
returns text
language sql
as $$
  select 'INV-' || lpad(nextval('public.invoice_number_seq')::text, 4, '0');
$$;

grant execute on function public.next_invoice_number() to anon, authenticated;
grant usage on sequence public.invoice_number_seq to anon, authenticated;
grant select, insert, update, delete on public.invoices to anon, authenticated;
grant select, insert, update, delete on public.invoice_items to anon, authenticated;

-- RLS: allow anon read/write for now (single-user app)
alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.products enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

create policy "allow all" on public.clients for all using (true) with check (true);
create policy "allow all" on public.services for all using (true) with check (true);
create policy "allow all" on public.appointments for all using (true) with check (true);
create policy "allow all" on public.products for all using (true) with check (true);
create policy "allow all" on public.invoices for all using (true) with check (true);
create policy "allow all" on public.invoice_items for all using (true) with check (true);

-- Seed services
insert into public.services (name, description, duration_minutes, price, color) values
  ('Full Makeup', 'Complete makeup application for any occasion', 90, 120, '#f9a8d4'),
  ('Bridal Makeup', 'Full bridal look with trial included', 120, 250, '#fda4af'),
  ('Natural Look', 'Light, everyday natural makeup', 60, 80, '#bbf7d0'),
  ('Evening Glam', 'Dramatic evening makeup', 75, 100, '#c4b5fd'),
  ('Brow Shaping', 'Brow mapping, shaping and tinting', 30, 40, '#fcd34d')
on conflict do nothing;
