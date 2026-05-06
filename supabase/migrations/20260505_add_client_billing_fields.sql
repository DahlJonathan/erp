alter table public.clients
add column if not exists billing_email text,
add column if not exists contact_person text,
add column if not exists billing_address text,
add column if not exists postal_code text,
add column if not exists city text;

update public.clients
set billing_email = coalesce(billing_email, email)
where billing_email is null;