alter table jersey_orders
  add column if not exists category text not null default 'nonplayer';

create index if not exists jersey_orders_category_idx
  on jersey_orders (category);

-- clean scratch values that leaked into note from CSV side columns
update jersey_orders
  set note = null
  where note is not null
    and note !~ '^[a-z\s]+$';
