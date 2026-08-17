create table public.daycares (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.daycares enable row level security;

-- New public-schema tables need an explicit Data API read grant.
grant select on table public.daycares to anon, authenticated;

create policy "daycares_read"
on public.daycares
for select
to anon, authenticated
using (true);

create policy "daycares_insert"
on public.daycares
for insert
to anon, authenticated
with check (false);

create policy "daycares_update"
on public.daycares
for update
to anon, authenticated
using (false)
with check (false);

create policy "daycares_delete"
on public.daycares
for delete
to anon, authenticated
using (false);

-- Avoid duplicating the seed rows if this data statement is re-run.
insert into public.daycares (name, address)
select seed.name, seed.address
from (
  values
    ('Guardería Sala Soles', 'Av. Principal 123, Centro'),
    ('Guardería Arcoíris', 'Calle Luna 456, Zona Norte'),
    ('Guardería Semillitas', 'Blvd. del Sol 789, Col. Jardines'),
    ('Guardería Estrellitas', 'Paseo de los Niños 321, Residencial')
) as seed(name, address)
where not exists (
  select 1
  from public.daycares as existing_daycare
  where existing_daycare.name = seed.name
);
