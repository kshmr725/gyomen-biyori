-- 魚麵日和 MVP schema
create extension if not exists pgcrypto;

create type public.user_role as enum ('user','admin');
create type public.queue_level as enum ('none','under30','over30','unknown');
create type public.queue_period as enum ('weekday_lunch','weekday_dinner','holiday_lunch','holiday_dinner','off_peak');
create type public.sync_status as enum ('pending','approved','rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now()
);

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  name text not null,
  slug text not null unique,
  area text not null,
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  base_price integer not null check (base_price > 0),
  external_rating numeric(2,1) check (external_rating between 0 and 5),
  description text,
  osm_id text,
  osm_opening_hours text,
  manual_opening_hours jsonb,
  manual_opening_hours_updated_at timestamptz,
  recommendation_ready boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shop_photos (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false
);

create table public.queue_estimates (
  shop_id uuid not null references public.shops(id) on delete cascade,
  period public.queue_period not null,
  level public.queue_level not null default 'unknown',
  updated_at timestamptz not null default now(),
  primary key (shop_id, period)
);

create table public.admin_scores (
  shop_id uuid primary key references public.shops(id) on delete cascade,
  soup numeric(2,1) not null check (soup between 1 and 5),
  noodles numeric(2,1) not null check (noodles between 1 and 5),
  toppings numeric(2,1) not null check (toppings between 1 and 5),
  completeness numeric(2,1) not null check (completeness between 1 and 5),
  updated_at timestamptz not null default now()
);

create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, shop_id)
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  visited_at timestamptz not null default now(),
  rating integer check (rating between 1 and 5),
  would_revisit boolean,
  created_at timestamptz not null default now()
);

create table public.special_dates (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops(id) on delete cascade,
  date date not null,
  is_closed boolean,
  opening_intervals jsonb,
  note text,
  unique (shop_id, date)
);

create table public.osm_sync_changes (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  field_name text not null,
  old_value jsonb,
  new_value jsonb,
  status public.sync_status not null default 'pending',
  detected_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz
);

create table public.route_cache (
  cache_key text primary key,
  shop_id text not null,
  origin_lat double precision not null,
  origin_lng double precision not null,
  duration_minutes integer not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.shop_photos enable row level security;
alter table public.queue_estimates enable row level security;
alter table public.admin_scores enable row level security;
alter table public.favorites enable row level security;
alter table public.visits enable row level security;
alter table public.special_dates enable row level security;
alter table public.osm_sync_changes enable row level security;
alter table public.route_cache enable row level security;

create policy "public read active shops" on public.shops for select using (is_active = true);
create policy "public read shop photos" on public.shop_photos for select using (true);
create policy "public read queue estimates" on public.queue_estimates for select using (true);
create policy "public read admin scores" on public.admin_scores for select using (true);
create policy "users read own profile" on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "users manage own favorites" on public.favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own visits" on public.visits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "admins manage shops" on public.shops for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage photos" on public.shop_photos for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage queues" on public.queue_estimates for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage scores" on public.admin_scores for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage dates" on public.special_dates for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage sync changes" on public.osm_sync_changes for all using (public.is_admin()) with check (public.is_admin());
-- route_cache is server-service-only; no anon/authenticated policy is intentionally provided.
