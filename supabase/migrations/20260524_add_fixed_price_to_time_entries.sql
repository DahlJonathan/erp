alter table public.time_entries
add column if not exists fixed_price numeric null;
