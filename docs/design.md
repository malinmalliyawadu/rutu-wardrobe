# Design

Rutu's wardrobe is a dressing room: the place she decides what to wear in the
morning, and the boutique that brings her what suits her at night. Every
screen opens on the thing itself (an outfit, a garment, her palette) and the
words come after. Nothing on a screen is there to explain the screen.

Designed 2026-11-08 from scratch, not from Malin's app. Tokens and primitives
live in `src/app/globals.css`; shared components in `src/components`. This
file is the reasoning, so a new page can be built without reading every
other page. She reads it on her phone and her laptop: both are first class,
the phone is the same content in one column.

## The signature: the arch

A dressing-room mirror is an arch: a semicircular head over straight sides.
It is the one shape this app owns, and it is spent in few places:

- the picture of a whole look (the outfit of the day, a look in the closet),
  `LookPicture` in `.arch` (`--radius-arch`);
- every picture of her (a try-on), in the mirror viewer and its thumbnail;
- the active tab's mark, a small arch;
- the ribbon of her palette, each swatch with an arched head;
- an empty mirror on Today and the sign-in page, when there is nothing yet.

Nothing else is arch-shaped: a single garment is a rounded tile on the white
sweep (`.sweep`, `--radius-tile`), a card of words is `.card`. Do not put
products, buttons or cards in arches; it stops meaning "you, dressed".

## Information architecture

Five tabs (bottom bar on the phone, words in the top bar from `lg` up), by
how often each is opened. A tab with sections shows them as chips under its
title (`SectionChips`).

| Tab | Route | Sections | What it is |
|---|---|---|---|
| Today | `/` | none | The outfit of the day in the mirror, its two other options, a gym fit on training days, "Something on today?". Until there is a read, a guide and a wardrobe, the one next step. |
| Shop | `/shop` | New (`/shop`), Wishlist (`/shop/wishlist`), Statement (`/shop/statement`), All shops (`/shop/browse`) | Last night's finds by plan slot, with a line to ask the shops for something (`/shop/ask`, a result at `/shop/ask/[id]`). The wishlist is what she saved and the links she pasted, with what changed. Statement pieces are Claude's picks of bold colour, texture or cut. All shops is everything the finder read, searchable. |
| Closet | `/closet` | Pieces (`/closet`), Looks (`/closet/looks`), Dress me (`/closet/dress`, an outfit `/closet/dress/[id]`), Try-ons (`/closet/try-ons`), Worn (`/closet/worn`) | What she owns. A piece is `/closet/[id]`, adding one `/closet/new`. Looks are outfits made from her pieces. Dress me is one outfit for whatever she says it is for, from her closet, the shops, both or anything, as a spread. Try-ons are every picture of her in something (`/closet/try-ons/[id]`, choose pieces at `/closet/try-ons/new`). Worn is what to rotate out and what gets passed over. |
| Style | `/style` | Board (`/style`), Palette (`/style/palette`), Plan (`/style/plan`) | What she loves and what suits her. The board is her inspiration: pictures and links of outfits she loves, read by Claude into her taste. The palette is her style guide (colours, shapes, fits; sections edited at `/style/palette/[section]`). The plan is what to own by priority (a slot `/style/plan/[id]`, a new one `/style/plan/new`). |
| Me | `/me` | none (a hub of rows) | Her profile, edited rarely: photos (`/me/photos`), colouring and proportions (`/me/colouring`), sizes (`/me/sizes`), her week (`/me/week`), taste (`/me/taste`), budget (`/me/budget`), and the finder's spend and shops (`/me/finder`). |

Sign-in is `/login`, outside the frame. It is the one page a stranger can
reach, so it names no one: the public name (the page title, the home-screen
name in the manifest) is "Dressing room", and "Rutu" appears only inside,
as the wordmark.

## Material

- **Ground**: petal paper by day (`--ground` #f6e7e4), aubergine black by
  night (#1d1220). `--surface` is a step deeper (skeletons, empty mirrors),
  `--raised` a step lighter (cards, fields).
- **Sweep** (`--photo`, white, near-white at night): every product and piece
  photo sits on it, multiplied in, so a shop's white background becomes the
  tile. It stays light at night on purpose: the garment's colour is what she
  is judging.
- **Ink**: aubergine (#2e1630). The type, and the one solid button on a
  screen (`.btn-primary`). Primary buttons are never coloured.
- **Accent**: deep rose (`--accent` #a3365f, a light rose at night). The only
  interface colour: the active tab's arch, a word that acts (`.link`), a
  saved heart, a focus ring, good news. Never a fill behind text.
- **Her palette**: every other colour on screen is Rutu's own, as flat
  swatches (`Swatch`, `Swatches`): the ribbon beside the wordmark, a slot's
  colours, a piece without a photo. Every swatch carries its name
  (`data-colour`), shown under the mouse by `ColourTip`.
- **Alert** (`--alert`) is for errors and the hold-to-delete fill only.

No gradients. No drop shadows (a 1px inset `--line-strong` edge where a
control needs one). Glass only on the phone's tab bar, which the page scrolls
under.

## Type

Two faces, committed under `src/fonts`:

| Class | Face | Use |
|---|---|---|
| `.display` | Bodoni Moda 500, optical size auto, clamp 2.5 to 4.25rem | A page's name, the look's name on Today. One per screen. |
| `.headline` | Bodoni Moda 500, 1.625 to 2.125rem | A section's name, a card's name in a spread, an empty state. |
| `.voice` | Bodoni Moda italic | The stylist's one line on why: a look's styling note, a find's reason. |
| `.title` | Hanken Grotesk 600, 1.0625rem | A row's or tile's name. |
| body | Hanken Grotesk 400, 16px, 1.55 | Everything read. `text-lg` for the lead line. |
| `.caption` | Hanken Grotesk 500, 13px, ink-3 | A small line naming what follows: the occasion, a date, a shop, a count. Sentence case. |

Bodoni is for few words, set large; never for a paragraph, a button, a label
or a price. Prices and counts are `.tabular`. Line length stays under 38rem
(`.prose-measure`).

Never: tracked uppercase labels, a label above every block, one word of a
headline in another colour or weight, middle dots between facts (a comma or
a new line), an arrow glued to link text, an em dash anywhere.

## Layout

- Gutter `--gutter`: 1.25rem on the phone, 3rem from `lg`. The frame's
  column is `max-w-[82rem]`, centred, left-aligned inside.
- A page opens with `PageHead` (the Bodoni title, an optional plain line, an
  aside, and the section chips). Sections inside a page use `Section` (a
  Bodoni headline and a caption aside), separated by space (3.5rem, 5rem at
  `lg`), never by a rule. Hairlines (`border-line`) divide rows in a list.
- Grids of garments: 2 across on the phone, 3 at `lg`, 4 at `xl`, gap-x 1rem
  and gap-y 2rem. Product photos 4:5 on the sweep, `object-contain` with no
  padding (most shops shoot on light grey, which then fills the tile rather
  than sitting as a box inside it); her own piece photos 3:4, `object-cover`.
- A spread (Today, a piece, a look, a find in detail): the picture on the left
  (up to 34rem, sticky on the laptop), the words on the right; on the phone
  the picture first, then the words.
- Forms: one column `max-w-2xl`, paired fields side by side from `sm`
  (`sm:grid-cols-2`). Visible labels (`Field`), errors under the field, one
  primary button at the end.
- `.scroller` for a row that swipes sideways on the phone; make it a grid
  from `sm` or `lg` where it should not scroll.
- Touch targets 44px and up. The phone's tab bar pads for the home
  indicator; `main` pads the bottom so nothing hides under it.

## Components

- Shell (`components/shell`): `Wordmark` ("Rutu" in Bodoni italic),
  `PaletteRibbon` / `LivePalette`, `Nav` / `NavShell`, `ColourTip`.
- UI (`components/ui`):
  - `layout.tsx`: `PageHead`, `Section`, `BackLink`, `Empty`, `ButtonLink`, `RowLink`.
  - `form.tsx`: `Field`, `TextInput`, `NumberInput`, `TextArea`, `Select`,
    `ChoiceChips`, `SubmitButton`, `Spinner`, `FormMessage`, `withEcho`.
  - `photos.tsx`: `ProductPhoto` (a shop photo on the sweep, via
    `productLoader`), `PiecePicture` (her photo, the shop's, or the colour).
  - `swatch.tsx`, `sections.tsx` (`SectionChips`), `skeleton.tsx` (`Block`,
    `Lines`, `TileGrid`), `hold-button.tsx`, `refresh.tsx`, `icons.tsx`.
- Look (`components/look`): `LookPicture` and `FlatLay` (a look in the
  arch), `LookThumb`, `LookActions` (Wear this, Save), `ChangePieces`,
  `TryOn` (the "See it on me" control and the mirror viewer) and `LookOnMe`.
- Shared server actions live in `src/app/actions/` (day, feed, look,
  try-on); an area's own actions sit beside its pages (`closet/actions.ts`).

## Motion

From the animate and design-engineering skills: transform and opacity only;
`--ease-out` for entrances; UI transitions under 300ms; press feedback is
`.pressable`, `.btn` or `.chip` (scale 0.97 at 160ms); hover effects only
under `(hover: hover) and (pointer: fine)`; every animation has a
`prefers-reduced-motion` variant (a plain fade, or nothing).

No page-load animation anywhere: the picture is the arrival. Motion only
answers a tap:

- `.crossfade` when content swaps in place (Today's options, a form opening
  in place);
- `.leaving` on a card going after an action (dismissed, saved away);
- `.viewer` on the mirror and any dialog opening (scale 0.96 and fade from
  its centre; it closes at once);
- `.tile-enter` on a tile arriving after an upload or a pin;
- the tab's arch scaling in under the open tab;
- `.lift` on a garment tile's photo under the mouse (scale 1.025, 300ms).

Swiping through a `.scroller` is native scroll snap.

## Copy

Second person, warm and plain, sentence case: "Wear this", "Save", "Add a
piece", "Pin it". A button says what happens. An empty state says what to do
next, once, with the one way to do it. Errors say what went wrong and what to
do. The stylist's voice (the italic line) can be a little more personal.
Plain dash, never an em dash.
