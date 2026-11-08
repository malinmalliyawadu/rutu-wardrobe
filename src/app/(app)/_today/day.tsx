import { connection } from 'next/server'

import { ButtonLink } from '@/components/ui/layout'
import { Refresh } from '@/components/ui/refresh'
import { listSlots } from '@/lib/blueprint'
import { readDay, trainsOn, type DayOutfit } from '@/lib/day-outfit'
import { list } from '@/lib/format'
import { gymReadiness, OCCASION_LABELS, readiness } from '@/lib/looks'
import { listPieces } from '@/lib/pieces'
import { getProfile } from '@/lib/profile'
import { SEASON_INFO, seasonName } from '@/lib/seasons'
import { getGuide } from '@/lib/style-guide'
import { dateLabel, dressDate, forecastLine, nzDate, nzSeason } from '@/lib/weather'

import { DressAgain, DressForGym } from './dress-again'
import { Spread } from './spread'
import { Starter } from './starter'

/*
 * Today. Once there is a style guide and enough of a wardrobe, the first
 * opening on a day starts its outfit (Starter) and the page waits,
 * refreshing, until Opus has put it together; from six in the evening it
 * dresses her for tomorrow. On a day she trains, a gym fit follows. Before
 * any of that, the page is the one next step. Nothing animates in: the
 * picture is the arrival.
 */

export async function Day() {
  await connection()
  const now = new Date()
  const date = dressDate(now)
  const isToday = date === nzDate(now)
  const when = isToday ? ('today' as const) : ('tomorrow' as const)
  const [guide, pieces, day, profile, slots] = await Promise.all([getGuide(), listPieces(), readDay(date), getProfile(), listSlots()])
  const season = profile.confirmed_at ? profile.season : null

  if (!season) {
    return (
      <Step
        title="Your mirror is waiting."
        line="Tell it your colouring, proportions and sizes. It works out what suits you, drafts what to own, then looks for it every night in Wellington and online."
        href={profile.analysed_at ? '/me/colouring' : '/me/photos'}
        button={profile.analysed_at ? 'Confirm your read' : 'Start with a photo'}
      />
    )
  }

  if (!guide) {
    return (
      <Step
        title={`You are ${seasonName(season).toLowerCase()}.`}
        line={`${SEASON_INFO[season].traits} Next comes your style guide, drafted from this read: your colours, the shapes that suit you, and what to own.`}
        href="/style/palette"
        button="Draft your style guide"
      />
    )
  }

  const ready = readiness(pieces)
  const head = <DateLine date={date} forecast={day?.forecast ?? null} />

  if (!day && !ready.ready) {
    const active = pieces.filter((piece) => !piece.set_aside_at).length
    return (
      <section aria-labelledby="day" className="max-w-2xl">
        {head}
        <h1 id="day" className="display mt-6">
          What to wear {when}
        </h1>
        <p className="prose-measure mt-5 text-lg text-ink-2">
          Every morning this is an outfit from what you own, for the forecast and your day.{' '}
          {active === 0 ? 'Your closet is empty: ' : `You have ${active} ${active === 1 ? 'piece' : 'pieces'}; `}
          add {list(ready.missing)} to start.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/closet/new">Add a piece</ButtonLink>
          {slots.length === 0 ? (
            <ButtonLink href="/style/plan" variant="quiet">
              Draft your plan
            </ButtonLink>
          ) : null}
        </div>
      </section>
    )
  }

  if (!day || day.status === 'making') {
    return (
      <section aria-labelledby="day">
        <Making when={when} note={day?.note ?? null} head={head} />
        {day ? <Refresh /> : <Starter />}
      </section>
    )
  }

  if (day.status === 'failed' || day.options.length === 0) {
    return (
      <section aria-labelledby="day" className="max-w-2xl">
        {head}
        <h1 id="day" className="display mt-6">
          Nothing to wear yet
        </h1>
        <p role="alert" className="prose-measure mt-5 text-lg text-ink-2">
          {day.status === 'failed'
            ? (day.error ?? 'It could not be put together. Try again.')
            : 'The pieces of this outfit are gone from your closet.'}
        </p>
        <div className="mt-8">
          <DressAgain when={when} open />
        </div>
      </section>
    )
  }

  const canDraw = Boolean(process.env.OPENAI_API_KEY)
  const shownImageUsd = day.options[day.shown]?.image?.usd ?? null
  const today = nzDate(now)

  return (
    <div>
      <Spread
        key={day.id}
        dayId={day.id}
        head={head}
        options={day.options.map((option) => ({
          look: option.look,
          today: option.today,
          occasion: OCCASION_LABELS[option.look.occasion],
          image: option.image,
        }))}
        shown={day.shown}
        today={today}
        isToday={isToday}
        canDraw={canDraw}
      />
      {day.options[day.shown]?.image?.status === 'making' || day.gym?.image?.status === 'making' ? <Refresh /> : null}

      {day.gym ? (
        <section aria-labelledby="gym" className="mt-20 lg:mt-28">
          <h2 id="gym" className="headline mb-6">
            For the gym
          </h2>
          <Spread
            dayId={day.id}
            options={[{ look: day.gym.look, today: day.gym.today, occasion: OCCASION_LABELS.gym, image: day.gym.image }]}
            shown={0}
            today={today}
            isToday={isToday}
            canDraw={canDraw}
            compact
          />
        </section>
      ) : trainsOn(profile, date) ? (
        <GymNotReady missing={gymReadiness(pieces).missing} when={when} />
      ) : null}

      <section aria-labelledby="again" className="mt-20 max-w-xl lg:mt-28">
        <h2 id="again" className="headline">
          Something on {when}?
        </h2>
        <p className="mt-2 text-ink-2">A dinner, a long walk, a wedding to get to. Say so and the mirror dresses you again.</p>
        <div className="mt-5">
          <DressAgain when={when} />
        </div>
        {day.note ? <p className="caption mt-4">This outfit is dressed for &ldquo;{day.note}&rdquo;.</p> : null}
      </section>

      <Credits day={day} imageUsd={shownImageUsd} />
    </div>
  )
}

/** The day it is for, and the weather it is dressed for. */
function DateLine({ date, forecast }: { date: string; forecast: DayOutfit['forecast'] }) {
  const month = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-NZ', { month: 'long', timeZone: 'UTC' })
  return (
    <div>
      <p className="caption">
        {dateLabel(date)}, {nzSeason(date)}
      </p>
      <p className="mt-1 text-ink">{forecast ? forecastLine(forecast) : `No forecast could be read, so a usual ${month} day in Wellington.`}</p>
    </div>
  )
}

/** Before the read or the guide exists: the next step, as the page, in an empty mirror. */
function Step({ title, line, href, button }: { title: string; line: string; href: string; button: string }) {
  return (
    <section aria-labelledby="day" className="grid items-center gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-16">
      <div aria-hidden className="arch aspect-[4/5] w-full max-w-[13rem] bg-surface lg:max-w-none">
        <div className="absolute inset-[7%] rounded-[var(--radius-arch)] shadow-[inset_0_0_0_1px_var(--line-strong)]" />
      </div>
      <div>
        <h1 id="day" className="display">
          {title}
        </h1>
        <p className="prose-measure mt-5 text-lg text-ink-2">{line}</p>
        <ButtonLink href={href} className="mt-8">
          {button}
        </ButtonLink>
      </div>
    </section>
  )
}

/** The spread's shape while Opus puts the day together, with a line on what is happening. */
function Making({ when, note, head }: { when: string; note: string | null; head: React.ReactNode }) {
  return (
    <div role="status" className="lg:grid lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] lg:gap-16">
      <div aria-hidden className="arch aspect-[4/5] bg-surface" />
      <div className="mt-8 lg:mt-24">
        {head}
        <h1 id="day" className="display mt-6">
          Dressing you for {when}
        </h1>
        <p className="prose-measure mt-5 text-lg text-ink-2" aria-live="polite">
          Reading the forecast and your closet{note ? ` for “${note}”` : ''}, and putting three outfits together.
        </p>
        <p className="caption mt-2">About a minute. You can leave and come back.</p>
      </div>
    </div>
  )
}

/** A day she trains whose outfit came without a gym fit: says what to mark, or offers a new outfit. */
function GymNotReady({ missing, when }: { missing: string[]; when: string }) {
  return (
    <section aria-labelledby="gym" className="mt-20 max-w-xl lg:mt-28">
      <h2 id="gym" className="headline">
        For the gym
      </h2>
      <p className="mt-3 text-ink-2">
        {missing.length > 0
          ? `You train ${when}. Mark ${list(missing)} as gym kit in your closet and the next outfit comes with a gym fit.`
          : `You train ${when}, but this outfit came without a gym fit. Dress again and the new one comes with it.`}
      </p>
      {missing.length > 0 ? (
        <ButtonLink href="/closet" variant="quiet" size="small" className="mt-5">
          Your closet
        </ButtonLink>
      ) : (
        <DressForGym />
      )}
    </section>
  )
}

function Credits({ day, imageUsd }: { day: DayOutfit; imageUsd: number | null }) {
  return (
    <p className="caption mt-16 max-w-xl">
      Forecast from{' '}
      <a href="https://open-meteo.com/" className="underline decoration-line-strong underline-offset-[3px]">
        Open-Meteo
      </a>
      . Put together by Opus{day.usd !== null ? ` for US$${day.usd.toFixed(2)}` : ''}
      {day.remake_usd > 0 ? `, its pieces changed for US$${day.remake_usd.toFixed(2)}` : ''}
      {imageUsd !== null ? `, drawn by OpenAI for US$${imageUsd.toFixed(2)}` : ''}.
    </p>
  )
}
