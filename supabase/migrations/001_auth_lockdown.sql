-- Lock the database down to the two app accounts.
-- Run in the Supabase SQL editor AFTER the auth code is deployed and both
-- users exist under Authentication > Users. Safe to re-run.
-- Keep the email list in sync with src/lib/auth.ts.

create or replace function public.is_app_user()
returns boolean
language sql
stable
as $$
  select coalesce(lower(auth.jwt() ->> 'email'), '') in ('aleks.renje@gmail.com', 'sairaobeauty@gmail.com');
$$;

do $$
declare t text;
begin
  foreach t in array array['clients','services','appointments','products','invoices','invoice_items'] loop
    execute format('drop policy if exists "allow all" on public.%I', t);
    execute format('drop policy if exists "app users only" on public.%I', t);
    execute format('create policy "app users only" on public.%I for all to authenticated using (public.is_app_user()) with check (public.is_app_user())', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- Logged-in users need explicit table grants; RLS above still limits them to the two app accounts.
grant select, insert, update, delete on public.clients, public.services, public.appointments, public.products to authenticated;

-- Server-side code without a login (client invoice view, PDF, cron) uses service_role.
grant select, insert, update, delete on public.clients, public.services, public.appointments, public.products, public.invoices, public.invoice_items to service_role;

revoke execute on function public.next_invoice_number() from anon;
revoke usage on sequence public.invoice_number_seq from anon;
