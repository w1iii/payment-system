alter table jersey_orders
  add column if not exists facebook_url text;

create table if not exists settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
