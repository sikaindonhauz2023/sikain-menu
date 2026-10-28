-- SIKAIN database setup for Supabase
-- Run this entire file in Supabase Dashboard > SQL Editor > New query.
create extension if not exists pgcrypto;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_sikain_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.admins where user_id = auth.uid()); $$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  category text not null default 'Others',
  description text not null default '',
  image_url text not null default '',
  available boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  customer_name text not null,
  phone text not null,
  order_type text not null check (order_type in ('pickup','delivery')),
  address text not null default '',
  payment_method text not null default 'Cash on delivery / pickup',
  notes text not null default '',
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(10,2) not null check (subtotal >= 0),
  delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0),
  total numeric(10,2) not null check (total >= 0),
  distance_km numeric(8,2),
  status text not null default 'Pending' check (status in ('Pending','Preparing','Ready','Completed','Cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.admins enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.store_settings enable row level security;

-- Products: everyone can read only available items; only admin can change them.
drop policy if exists "Public can read available products" on public.products;
create policy "Public can read available products" on public.products for select to anon, authenticated using (available or public.is_sikain_admin());
drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products" on public.products for all to authenticated using (public.is_sikain_admin()) with check (public.is_sikain_admin());

-- Customers can submit orders without accounts. They cannot read the orders table.
drop policy if exists "Public can place orders" on public.orders;
create policy "Public can place orders" on public.orders for insert to anon, authenticated with check (status = 'Pending' and length(trim(customer_name)) between 1 and 100 and length(trim(phone)) between 5 and 30 and jsonb_typeof(items) = 'array');
drop policy if exists "Admins read orders" on public.orders;
create policy "Admins read orders" on public.orders for select to authenticated using (public.is_sikain_admin());
drop policy if exists "Admins update orders" on public.orders;
create policy "Admins update orders" on public.orders for update to authenticated using (public.is_sikain_admin()) with check (public.is_sikain_admin());

-- Public website can read store appearance settings; only admin can change them.
drop policy if exists "Public can read settings" on public.store_settings;
create policy "Public can read settings" on public.store_settings for select to anon, authenticated using (true);
drop policy if exists "Admins manage settings" on public.store_settings;
create policy "Admins manage settings" on public.store_settings for all to authenticated using (public.is_sikain_admin()) with check (public.is_sikain_admin());

-- Secure order tracking: returns only limited fields for the exact order code.
create or replace function public.track_sikain_order(code_input text)
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'order_code', o.order_code,
    'status', o.status,
    'created_at', o.created_at,
    'order_type', o.order_type,
    'total', o.total,
    'items', o.items,
    'customer_name', o.customer_name
  ) from public.orders o where o.order_code = upper(trim(code_input)) limit 1;
$$;
revoke all on function public.track_sikain_order(text) from public;
grant execute on function public.track_sikain_order(text) to anon, authenticated;

-- Public image bucket for food photos, logos and banners.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('food-photos', 'food-photos', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true;

drop policy if exists "Public can view SIKAIN images" on storage.objects;
create policy "Public can view SIKAIN images" on storage.objects for select to anon, authenticated using (bucket_id = 'food-photos');
drop policy if exists "Admins upload SIKAIN images" on storage.objects;
create policy "Admins upload SIKAIN images" on storage.objects for insert to authenticated with check (bucket_id = 'food-photos' and public.is_sikain_admin());
drop policy if exists "Admins update SIKAIN images" on storage.objects;
create policy "Admins update SIKAIN images" on storage.objects for update to authenticated using (bucket_id = 'food-photos' and public.is_sikain_admin()) with check (bucket_id = 'food-photos' and public.is_sikain_admin());
drop policy if exists "Admins delete SIKAIN images" on storage.objects;
create policy "Admins delete SIKAIN images" on storage.objects for delete to authenticated using (bucket_id = 'food-photos' and public.is_sikain_admin());

-- Add the first menu items here if desired. You can also add them from Admin > Menu editor.
insert into public.products (name, price, category, description, available)
select v.name, v.price, v.category, v.description, true from (values
 ('DonTapa',69,'Rice Meals','Malinamnam na tapa na may kanin.'),
 ('DonSisig',69,'Rice Meals','Sizzling-style sisig, lutong bahay.'),
 ('DonHungarian',69,'Rice Meals','Hungarian sausage meal.'),
 ('DonPorkchop',69,'Rice Meals','Paboritong pork chop meal.'),
 ('DonBurger',59,'Snacks','Burger na swak sa budget.'),
 ('DonFries',49,'Snacks','Crispy fries, perfect pang-meryenda.')
) as v(name,price,category,description)
where not exists (select 1 from public.products p where p.name = v.name);
