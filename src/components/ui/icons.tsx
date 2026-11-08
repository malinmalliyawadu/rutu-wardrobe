import type { SVGProps } from 'react'

/*
 * One icon family: 24px grid, 1.6 stroke, round caps and joins, outline only.
 * Drawn for this app, so the tabs speak its language: the mirror is today.
 */

type IconProps = SVGProps<SVGSVGElement>

function base(props: IconProps): IconProps {
  return {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
  }
}

/** The dressing-room mirror: what to wear today. */
export function MirrorIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6.5 20.5V9.75a5.5 5.5 0 0 1 11 0V20.5Z" />
      <path d="M4.5 20.5h15" />
      <path d="M10 9.5a2.5 2.5 0 0 1 2-2.4" />
    </svg>
  )
}

/** A shopping bag: the shops. */
export function BagIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5.2 8.5h13.6l-.9 11.1a1 1 0 0 1-1 .9H7.1a1 1 0 0 1-1-.9Z" />
      <path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" />
    </svg>
  )
}

/** A hanger: what she owns. */
export function HangerIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4a2 2 0 0 1 2 2c0 1.2-1 1.6-2 2.3V9.5" />
      <path d="M12 9.5 3.8 15.4a1.5 1.5 0 0 0 .9 2.7h14.6a1.5 1.5 0 0 0 .9-2.7Z" />
    </svg>
  )
}

/** A dress form: her style, the board, the palette, the plan. */
export function DressFormIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 3.5h8" />
      <path d="M9 3.5c0 2-1.5 3.2-1.5 5.5 0 1.8 1.2 2.6 1.2 4.5 0 2.2-2.2 3.4-2.2 5.5h11c0-2.1-2.2-3.3-2.2-5.5 0-1.9 1.2-2.7 1.2-4.5 0-2.3-1.5-3.5-1.5-5.5" />
      <path d="M12 19v1.5" />
      <path d="M9.5 20.5h5" />
    </svg>
  )
}

/** Her: the profile and the settings. */
export function PersonIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8.25" r="3.75" />
      <path d="M4.75 20.25c.9-3.6 3.75-5.5 7.25-5.5s6.35 1.9 7.25 5.5" />
    </svg>
  )
}

export function BackIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m14.5 6-6 6 6 6" />
    </svg>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m6.5 6.5 11 11m0-11-11 11" />
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  )
}

export function HeartIcon({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(props)} fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 20s-7.5-4.6-7.5-10.1A4.15 4.15 0 0 1 12 7.6a4.15 4.15 0 0 1 7.5 2.3C19.5 15.4 12 20 12 20Z" />
    </svg>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  )
}

/** Leaves for the shop's own page. */
export function OutIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9.5 5.5h-3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-3" />
      <path d="M13.5 4.5h6v6M19.5 4.5 11 13" />
    </svg>
  )
}

/** A sun behind a cloud: the day's weather. */
export function WeatherIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7.5 18.5h9.25a3.25 3.25 0 0 0 .3-6.49A5 5 0 0 0 7.5 13.5a2.5 2.5 0 0 0 0 5Z" />
      <path d="M8.2 8.3A3.5 3.5 0 0 1 14.6 7" />
    </svg>
  )
}

export function CameraIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 8.5a1 1 0 0 1 1-1h2.6l1.4-2h5l1.4 2h2.6a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1Z" />
      <circle cx="12" cy="13" r="3.25" />
    </svg>
  )
}
