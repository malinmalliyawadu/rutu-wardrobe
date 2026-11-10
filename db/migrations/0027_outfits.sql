-- An outfit from scratch, asked for by Malin for Rutu on 2026-11-10. Under
-- Closet, Dress me, she says what it is for ("a friend's wedding, outdoors")
-- and what it is made from, and one outfit comes back:
--
--   closet    Opus dresses her from her pieces alone.
--   shops     Sonnet reads the brief into the garments to look for, the
--             nightly filter finds them in her size over what the last run
--             read, and Opus puts the outfit together from the closest of each.
--   both      Opus wears what she owns and buys only what it lacks.
--   anywhere  tied to no shop and to nothing she owns: Opus describes the
--             ideal garments in words, and the ask makes a picture of her in
--             them (docs/plan.md 1.1 says what is sent).

create table outfits (
  id          bigint generated always as identity primary key,
  -- What she said it is for, as she typed it. Empty when she gave none.
  brief       text not null default '' check (char_length(brief) <= 300),
  source      text not null check (source in ('closet', 'shops', 'both', 'anywhere')),
  status      text not null default 'making' check (status in ('making', 'ready', 'failed')),
  -- Where it is while it is being made, for the page's one line.
  stage       text not null default 'planning' check (stage in ('planning', 'looking', 'composing')),
  title       text,
  occasion    text,
  weather     text,
  why         text,
  styling     text,
  -- An outfit made only of her pieces is a look like any other, in a set of
  -- its own kind: saving, wearing, changing its pieces and its pictures are
  -- the look's. A remake takes the look's place in the set, so the outfit
  -- follows it.
  set_id      bigint references look_sets (id) on delete set null,
  -- Counts, the exchange rates it priced with, and what each call cost.
  stats       jsonb not null default '{}'::jsonb,
  usd         numeric(10, 6) not null default 0,
  -- In words for her, when it failed.
  error       text,
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);

-- One in the making at a time, held by the database like a search.
create unique index outfits_one_making on outfits ((true)) where status = 'making';

create index outfits_started on outfits (started_at desc);

-- What the outfit is made of, the outermost layer first: a piece of hers, a
-- product from the shops with the price and sizes found for her when it was
-- made, or a garment described in words.
create table outfit_items (
  outfit_id        bigint not null references outfits (id) on delete cascade,
  position         smallint not null,
  piece_id         bigint references wardrobe_pieces (id) on delete cascade,
  product_id       bigint references products (id) on delete cascade,
  -- A garment described rather than owned or sold: name, garment_type,
  -- colour_name, colour_hex, fabric, fit, why and search.
  idea             jsonb,
  -- A few words on why this one, for a product.
  why              text,
  -- In the store's currency, in her size.
  price_cents      integer,
  compare_at_cents integer,
  sizes            text[] not null default '{}',
  size_known       boolean not null default false,
  primary key (outfit_id, position),
  constraint outfit_items_one_thing check (num_nonnulls(piece_id, product_id, idea) = 1)
);

create index outfit_items_product on outfit_items (product_id) where product_id is not null;

-- The set an outfit of her own pieces is offered in.
alter table look_sets drop constraint look_sets_kind_check;
alter table look_sets add constraint look_sets_kind_check check (kind in ('set', 'day', 'piece', 'ask'));
