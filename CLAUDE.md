# Rutu

Rutu's personal womenswear stylist. Single user, a web app she uses on her
phone and her laptop. Built 2026-11-08 from Malin's menswear wardrobe app
(`malinmalliyawadu/wardrobe`): the backend is the same machinery turned to
womenswear, the interface was designed from scratch. Read `docs/design.md`
before touching any page, `docs/plan.md` for the product, `docs/schema.md`
for the data model, and `AGENTS.md` (written by Next) before touching Next.js
APIs: this is Next 16 with Cache Components on, and it differs from older
training data.

## Stack, fixed

Next.js 16 App Router, TypeScript, React 19, Tailwind 4, `postgres.js` with no
ORM, `@anthropic-ai/sdk`, `zod` (one schema each for Claude's output format
and for form parsing), `sharp` (photo resizing and metadata stripping). Node 24
runs the TypeScript in `scripts/` directly. Docker on Coolify with plain
Postgres; the nightly finder is a Coolify scheduled task running a CLI inside
the app image. Ask before adding a dependency.

## Commands

| Command | What |
|---|---|
| `npm run dev` | Dev server (or the `rutu` entry in `.claude/launch.json`) |
| `npm run db:migrate` | Apply `db/migrations/*.sql` in order, once each |
| `npm run db:reset` | Drop `public` and rebuild from zero. Local only |
| `npm run health` | Database and Claude reachability from the shell |
| `npm run find` | The nightly finder: ingest, filter, score, statement pieces |
| `npm run db:seed-retailers` | Upsert `data/retailers.json` into `retailers` (the finder also does this) |
| `npm run typecheck`, `npm run lint`, `npm test` | What CI runs |

Local Postgres is Homebrew's on 5432, database `rutu_wardrobe`. `.env` holds
`DATABASE_URL`; Claude credentials come from `ANTHROPIC_API_KEY` or an
`ant auth login` profile.

## Conventions

- Applied migrations are never edited. The runner refuses a changed checksum.
  0001 to 0022 are Malin's history; 0023 turns it into womenswear.
- Anything that reads Postgres in a page sits under `Suspense` and awaits
  `connection()` first, so the static shell prerenders and the data streams.
- Relative imports carry the `.ts` extension so Node can run the scripts;
  `@/` alias imports carry none.
- Forms are Server Actions with `useActionState`. On a validation error the
  action returns `errors` and echoes the submitted `values`; the form merges
  them into its defaults with `withEcho` (`src/components/ui/form.tsx`),
  because React 19 resets a form once its action returns. On success the
  action `redirect`s.
- Every mutation calls `revalidatePath('/', 'layout')`.
- Shared server actions live in `src/app/actions/` (day, feed, look,
  try-on); an area's own actions sit beside its pages.
- Photos live in a private Cloudflare R2 bucket in production and in
  `PHOTOS_DIR` locally, never in `public/`, and are served only through
  `/photos/*`. Every read, write and delete goes through `files()` in
  `src/lib/storage.ts`. Masters are 1568px JPEGs with no metadata.
- `npm test` creates and drops its own scratch database for the migration
  test. Never point the test at a database you care about.
- Claude calls go through `src/lib/claude.ts`: Opus for the rare,
  quality-sensitive calls, Sonnet for nightly scoring and photo reads.
- Try-on images come from OpenAI (`OPENAI_API_KEY`), only through
  `src/lib/try-on.ts`, only on Rutu's tap, one at a time. An outfit from
  anything (Dress me) has no separate tap: the form says her photo goes before
  she taps its button, and that tap is the tap. The one image made without a
  tap is the outfit of the day's flat lay (`src/lib/look-image.ts`), from
  photos of her clothes, never of her. The photo rule in docs/plan.md 1.1 is
  what was agreed; do not send her photos anywhere else.
- Fonts are committed under `src/fonts` and loaded with `next/font/local`; the
  Docker build runs with the network off and fails on any build-time fetch.
- Plain dash, never an em dash, in copy, comments and prompts.

## The womenswear model

- Garment types (`src/lib/wardrobe-values.ts`, mirrored in migration 0023's
  check constraints): tee, tank, top, shirt, knitwear, sweatshirt, dress,
  jumpsuit, skirt, trousers, jeans, shorts, tailoring, jacket, coat,
  activewear, flats, heels, sandals, boots, sneakers, belt, bag, jewellery,
  accessory.
- Sizes (`src/lib/profile.ts`): a letter, an AU/NZ dress size (UK is the same
  number), a jeans waist in inches, bust, waist, hips and inseam, shoes in EU
  and AU (which is the US women's number). `src/lib/finder/classify.ts` reads
  shop size labels into keys (`S`, `S/M`, `AU10`, `W27`, `EU38`, `US7`,
  `UK5`), turning US, EU and IT clothing numbers into AU, and never guesses at
  a label's own 0 to 3.
- The read adds waist definition to build, shoulder vs hip and torso vs leg.
- A whole look is a top and a bottom, or a dress or jumpsuit, plus shoes
  (`src/lib/look-rules.ts`).

## Design

Designed 2026-11-08; the reasoning is in `docs/design.md`, the tokens in
`src/app/globals.css`. A dressing room: petal paper by day, aubergine black
by night, aubergine ink, deep rose as the only accent, every garment photo on
a white sweep. Bodoni Moda for the few words that carry a screen (and its
italic for the stylist's line), Hanken Grotesk for everything read. The arch,
a dressing-room mirror, is the one signature shape: pictures of a whole look,
pictures of her, the active tab's mark, the palette ribbon. Never use it for
single garments, cards or buttons. Her own palette shows as named swatches.
No gradients, no drop shadows, no tracked caps labels, no middle dots.

Tabs: Today (`/`, the outfit of the day), Shop (`/shop`: New, Wishlist,
Statement, All shops, and ask the shops), Closet (`/closet`: Pieces, Looks,
Dress me, Try-ons, Worn), Style (`/style`: her inspiration Board, Palette, Plan), Me
(`/me`: profile and the finder's settings).

Motion only answers a tap (crossfade, a card leaving, the mirror opening, a
tile arriving); transform and opacity only, under 300ms, `--ease-out`,
`.pressable`/`.btn`/`.chip` press feedback at 0.97, hover only under
`(hover: hover) and (pointer: fine)`, a reduced-motion variant for every
animation, no page-load animation.

Cache Components keeps visited pages in the DOM hidden by `<Activity>`: in
browser checks, select visible elements only, and key server-fed forms on
what they edit so a return visit shows saved values.

## Status

Built 2026-11-08 (from Malin's milestones M0 to M5, all carried across):
profile and read, style guide and plan, the nightly finder, try-on, closet
and looks, outfit of the day, gym fits, statement pieces, worn, and her
inspiration board. Nothing has been gated with Rutu yet. First gates, in
order: her read on her own photos (season and proportions she agrees with),
then the guide and plan, then a week of finds and outfits she would wear.

An outfit from scratch (migration 0027, ported 2026-11-10 from Malin's app) is
Closet, Dress me: `/closet/dress` is the ask and her earlier outfits,
`/closet/dress/[id]` the outfit, and Today's "Something on" section links to
it. `src/lib/outfit.ts` is the pipeline; what the browser needs is in
`outfit-values.ts`. She says what it is for, typed or from a prompt she taps,
and what it is made from. From her closet (`closet`), Opus dresses her from
her pieces alone. From the shops, Sonnet reads the brief into up to eight
garments (`planOutfit`), the nightly filter finds each in her size over what
the last run read (`findPool`: the ten closest to the plan's words, then up to
four she saved or Claude rated 70 or more), and Opus puts the outfit together.
From both, the plan names only what she lacks. From anything (`anywhere`), no
shop is read and nothing she owns is used: Opus describes the ideal garments
(`ideas`), each with Ask the shops, and `askOutfit` starts
`startAskedOutfitTryOn` once the outfit is ready, every garment in words and
her photo the one image sent, under the outfit's own key (`describedKey`); the
spread's arch fills with the picture. The form's notice and button label for
this follow the checked radio in CSS, so they show before the page hydrates,
and Anything is never preselected. The brief sets the level of dress. Opus
gives two and `tidyOutfit` keeps the first that is whole by `look-rules.ts`,
at most eight things (what a try-on takes), with nothing from a source she did
not ask for. An outfit made only of her pieces is a look in a `look_sets` row
of kind `ask`, shown as a wide `LookCard`; any other is `outfit_items` rows
shown by `OutfitSpread`, each product with Save at the price and size found,
the whole with "See it on me". It runs in `after()`, one at a time, and the
page refreshes while it does. Prices are last night's.
