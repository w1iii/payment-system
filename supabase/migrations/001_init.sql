create table if not exists jersey_orders (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  jersey_number text,
  size          text,
  jersey_name   text,
  status        text not null default 'unpaid'
                check (status in ('pending', 'unpaid', 'paid')),
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists jersey_orders_status_idx on jersey_orders (status);
create index if not exists jersey_orders_name_idx on jersey_orders (name);

alter table jersey_orders enable row level security;

-- No policies: anon role denied. All access via server-side service_role key.
