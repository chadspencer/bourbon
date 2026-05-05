-- Run this in Supabase Dashboard → SQL Editor

-- Inventory table
create table inventory (
  id          bigint generated always as identity primary key,
  bottle      text not null,
  paid        numeric not null default 0,
  value       numeric not null default 0,
  quantity    integer not null default 0,
  total_paid  numeric generated always as (paid * quantity) stored,
  total_value numeric generated always as (value * quantity) stored,
  profit      numeric generated always as ((value - paid) * quantity) stored,
  created_at  timestamptz default now()
);

-- Sales table
create table sales (
  id        bigint generated always as identity primary key,
  bottles   text[] not null,
  mode      text not null,
  sold_for  numeric not null,
  date      timestamptz default now()
);

-- Enable public read/write (no auth for now)
alter table inventory enable row level security;
alter table sales enable row level security;

create policy "public read inventory"  on inventory for select using (true);
create policy "public write inventory" on inventory for all using (true);
create policy "public read sales"      on sales for select using (true);
create policy "public write sales"     on sales for all using (true);

-- Seed inventory data
insert into inventory (bottle, paid, value, quantity) values
  ('ETL',              135, 170,  3),
  ('STAGG',            125, 150,  3),
  ('EHT BP',           150, 220,  3),
  ('EHT BP Batch 4',   150, 500,  1),
  ('EHT SiB',          110, 150,  1),
  ('EHT SR',           100, 140,  2),
  ('EHT SB',            75,  75,  2),
  ('WSiB',             225, 280,  3),
  ('CYPB',             300, 350,  1),
  ('WFP',              120, 160,  6),
  ('W12 1L',           160, 190,  1),
  ('THH',              325, 450,  1),
  ('Lot B',            600, 700,  1),
  ('Blanton''s',        90, 110,  6),
  ('Blanton''s SFTB',  220, 260,  1),
  ('Blanton''s Mini',   20,  40, 10);
