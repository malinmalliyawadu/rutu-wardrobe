-- Her inspiration board, asked for by Rutu on 2026-11-08: pictures of outfits
-- she loves, uploaded from her phone or taken from a page she pastes a link
-- to. Every pin has a picture, stored like her other photos (a metadata-free
-- master and thumb in the file store, under board/, served only through
-- /photos/board/:id). Claude (Sonnet) reads each one once, when it is pinned,
-- into a few words; together the reads become a summary of her taste she can
-- add to her profile. See src/lib/board.ts.

create table board_pins (
  id          bigint generated always as identity primary key,
  -- 'photo': a picture she uploaded. 'link': a page she pasted, with its
  -- picture (the page's own, or one she uploaded when it had none).
  kind        text not null check (kind in ('photo', 'link')),
  source_url  text,
  -- The page's title, for a link.
  title       text,
  -- The file's key in the store. The thumb sits next to it as .thumb.jpg.
  path        text not null unique,
  sha256      text not null,
  bytes       integer not null check (bytes > 0),
  width       integer not null,
  height      integer not null,
  -- What she loves about it, in her words.
  note        text,
  -- Claude's read as it answered (or { failure }), with its model and tokens.
  read        jsonb,
  read_at     timestamptz,
  usd         numeric(10, 6),
  created_at  timestamptz not null default now(),
  check ((kind = 'link') = (source_url is not null))
);

create index board_pins_newest on board_pins (created_at desc, id desc);

-- "What your board says": one Claude summary of the pins' reads at a time,
-- newest wins; the older ones stay for what they cost. applied_at is when she
-- added it to her profile's taste.
create table board_summaries (
  id          bigint generated always as identity primary key,
  summary     jsonb not null,
  pin_ids     bigint[] not null,
  model       text,
  usd         numeric(10, 6),
  created_at  timestamptz not null default now(),
  applied_at  timestamptz
);
