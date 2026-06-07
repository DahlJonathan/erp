create table if not exists public.company_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  business_id text not null default '',
  email text not null default '',
  phone text not null default '',
  street text not null default '',
  city text not null default '',
  iban text not null default '',
  bic text not null default '',
  payment_terms text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.company_settings enable row level security;

create policy "company_settings: own row only"
  on public.company_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
