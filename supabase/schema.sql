-- FoodOG database schema
-- Run this once in the Supabase SQL Editor for the project used by the site.

create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^FOG-[A-F0-9]{8}$'),
  customer_name text not null check (char_length(customer_name) between 1 and 100),
  phone text not null check (phone ~ '^[0-9]{10}$'),
  address text not null check (char_length(address) between 1 and 500),
  meal_id text not null,
  meal_name text not null,
  unit_price_paisa integer not null check (unit_price_paisa > 0),
  quantity smallint not null check (quantity between 1 and 10),
  frequency text not null check (frequency in ('one-time', 'weekly', 'monthly')),
  frequency_label text not null,
  meal_count smallint not null check (meal_count in (1, 6, 26)),
  delivery_window text not null check (delivery_window in ('lunch', 'dinner')),
  delivery_window_label text not null,
  amount_paisa integer not null check (amount_paisa > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  payment_method text not null check (payment_method in ('cod', 'razorpay')),
  payment_status text not null check (payment_status in ('pending', 'cod_pending', 'authorized', 'paid', 'failed', 'refunded')),
  order_status text not null check (order_status in ('payment_pending', 'payment_failed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancellation_requested', 'cancelled')),
  razorpay_order_id text unique,
  razorpay_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_phone_idx on public.orders (phone);
create index if not exists orders_status_idx on public.orders (order_status);

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role = 'admin'),
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;
alter table public.admin_profiles enable row level security;

-- No public table policies are created intentionally. The browser cannot query
-- customer data directly; the serverless API uses the service-role key.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

revoke all on public.orders from anon, authenticated;
revoke all on public.admin_profiles from anon, authenticated;
