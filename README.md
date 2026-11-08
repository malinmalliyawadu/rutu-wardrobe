# Rutu

Rutu's personal stylist. It learns what suits her from a few photos and her
measurements, keeps a board of the outfits she loves, drafts a plan of what to
own, dresses her each morning from her own closet, and every night finds real
pieces from Wellington and ships-to-NZ womenswear shops that fill a slot in
that plan.

Started on 2026-11-08 from Malin's menswear wardrobe app (same finder, Claude
and try-on machinery), turned to womenswear and redesigned from scratch. See
[docs/design.md](docs/design.md) for the design, [docs/plan.md](docs/plan.md)
for the product, and [docs/schema.md](docs/schema.md) for the data model.

## Run it

Needs Node 24 and a Postgres 17 database.

```bash
cp .env.example .env
createdb rutu_wardrobe
npm install
npm run db:migrate
npm run dev
```

`npm run health` checks the database, Claude and the photo store from the
shell. Locally photos go to `PHOTOS_DIR`; leave the `R2_*` settings empty.

`APP_PASSWORD` unset (as in `.env.example`) leaves the local app open; set it
to try the sign-in.

## Deploy to Coolify

Its own Postgres and its own application, in one Coolify project and
environment so they share a private network, and its own Cloudflare R2
bucket for the photos. Nothing is shared with Malin's app: not the database,
not the bucket, not the password. The app is the `Dockerfile`; it runs its
migrations on boot and refuses to serve if one fails.

### 1. Postgres

1. **New resource → Databases → PostgreSQL**, version 17.
2. Start it. On its page, copy the **Postgres URL (internal)**. That is the
   app's `DATABASE_URL`.
3. **Backups → + Add** a daily schedule. The profile, the guide, the board and
   the plan cost Claude calls and Rutu's time to remake.

### 2. The photos, in R2

1. In the Cloudflare dashboard: **R2 Object Storage → Create bucket**, name
   `rutu-wardrobe-photos`, location Automatic, storage class Standard. Leave
   **Public access** off: the app is the only way in.
2. **R2 Object Storage → API → Manage API tokens → Create Account API
   token**: permission **Object Read & Write**, applied to
   `rutu-wardrobe-photos` only, no expiry. It shows the **Access Key ID** and
   **Secret Access Key** once; they are `R2_ACCESS_KEY_ID` and
   `R2_SECRET_ACCESS_KEY`. The **Account ID** on the R2 overview page is
   `R2_ACCOUNT_ID`.

### 3. The application

1. **New resource → Application → GitHub**, `malinmalliyawadu/rutu-wardrobe`
   (private: give the GitHub App access to it), branch `main`, build pack
   **Dockerfile**, port `3000`.
2. **Domains**: the `https://` address it should answer on.
3. **Environment variables**, all runtime, none ticked as build variables
   (the build needs no secret and runs with the network off):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | the internal URL from step 1 |
   | `ANTHROPIC_API_KEY` | an Anthropic API key |
   | `OPENAI_API_KEY` | an OpenAI key, for try-ons and the day's flat lay |
   | `APP_PASSWORD` | her sign-in password. Long, and not used anywhere else |
   | `R2_ACCOUNT_ID` | from step 2 |
   | `R2_ACCESS_KEY_ID` | from step 2 |
   | `R2_SECRET_ACCESS_KEY` | from step 2 |
   | `R2_BUCKET` | `rutu-wardrobe-photos` |

   Leave `PGSSLMODE` unset: the database is on the private network. No
   persistent storage: the photos are in R2.
4. **Health check**: the image has its own (`/api/health/live`, the database
   only, so a Claude outage never takes the app down). If Coolify's is
   switched on, give it the same path and port 3000.
5. **Deploy.** The log shows `migrate.complete`, then `Ready`.

### 4. The nightly finder

On the application: **Scheduled tasks → + Add**.

| Field | Value |
|---|---|
| Name | `finder` |
| Command | `npm run find` |
| Frequency | `0 2 * * *` if the server's timezone is Pacific/Auckland, `0 13 * * *` if it is UTC (2am in summer, 1am in winter). Offset it from Malin's app's finder by half an hour if both run on one server. |
| Container name | empty |
| Timeout | `3600` |

Coolify's default timeout is 300 seconds, and the run takes longer than that.
The spend is capped on /me/finder (US$1 a night for finds and US$0.50 for
statement pieces by default). **Execute now** once and check **Recent
executions** ends with a `find.complete` line.

**Run now** on /me/finder starts this same command inside the app's own
container. Only one run goes at a time: a run that finds another going logs
`find.busy` and exits 0 without starting.

### 5. Check it

- Sign in at the domain. `/api/health` (signed in) says ok for the database,
  Claude and Photos (`R2 bucket rutu-wardrobe-photos is writable`).
- On her iPhone, in Safari: **Share → Add to Home Screen**. It opens as Dressing room,
  with the mirror as its icon, signed in.
