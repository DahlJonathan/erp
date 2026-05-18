-- Add user_id column to tables that need per-user isolation
alter table public.clients
  add column if not exists user_id uuid references auth.users(id) default auth.uid();

alter table public.projects
  add column if not exists user_id uuid references auth.users(id) default auth.uid();

alter table public.invoices
  add column if not exists user_id uuid references auth.users(id) default auth.uid();

alter table public.time_entries
  add column if not exists user_id uuid references auth.users(id) default auth.uid();

-- Enable Row Level Security on all tables
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.time_entries enable row level security;
alter table public.invoices enable row level security;

-- Policies: each user can only see and manage their own rows

-- clients
create policy "clients: own rows only"
  on public.clients for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- projects
create policy "projects: own rows only"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- time_entries
create policy "time_entries: own rows only"
  on public.time_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- invoices
create policy "invoices: own rows only"
  on public.invoices for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
