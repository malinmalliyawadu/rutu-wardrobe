'use client'

import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'

/*
 * Form primitives. Labels are always visible, errors sit under their field
 * and are announced, inputs are 16px so iOS never zooms. Numbers are text
 * inputs with a decimal keyboard rather than type=number, which brings
 * spinners and rejects a stray comma.
 */

export function Field({
  label,
  name,
  hint,
  error,
  children,
}: {
  label: string
  name: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${name}-error`} role="alert" className="mt-1.5 text-sm text-alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${name}-hint`} className="mt-1.5 text-sm text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export type DefaultValue = string | number | null | undefined

/**
 * Initial values for a form: what is saved, overridden by whatever the last
 * failed submit echoed back, so a correction never costs the other fields.
 * React 19 resets a form once its action returns, so this is what keeps them.
 */
export function withEcho<T extends Record<string, DefaultValue>>(
  saved: T,
  echo: Record<string, string> | undefined,
): T {
  if (!echo) return saved
  const merged = { ...saved } as Record<string, DefaultValue>
  for (const key of Object.keys(saved)) {
    if (key in echo) merged[key] = echo[key]
  }
  return merged as T
}

function described(name: string, error?: string) {
  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${name}-error` : undefined,
  } as const
}

export function TextInput({
  name,
  defaultValue,
  error,
  placeholder,
  type = 'text',
  autoComplete = 'off',
}: {
  name: string
  defaultValue: DefaultValue
  error?: string
  placeholder?: string
  type?: 'text' | 'url' | 'search' | 'password'
  autoComplete?: string
}) {
  return (
    <input
      id={name}
      name={name}
      type={type}
      autoComplete={autoComplete}
      defaultValue={defaultValue ?? ''}
      placeholder={placeholder}
      className="input"
      {...described(name, error)}
    />
  )
}

export function NumberInput({
  name,
  defaultValue,
  unit,
  error,
  integer = false,
}: {
  name: string
  defaultValue: DefaultValue
  unit?: string
  error?: string
  integer?: boolean
}) {
  return (
    <div className="relative">
      <input
        id={name}
        name={name}
        type="text"
        inputMode={integer ? 'numeric' : 'decimal'}
        autoComplete="off"
        defaultValue={defaultValue ?? ''}
        className={`input tabular ${unit ? 'pr-12' : ''}`}
        {...described(name, error)}
      />
      {unit ? (
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-ink-3">{unit}</span>
      ) : null}
    </div>
  )
}

export function TextArea({
  name,
  defaultValue,
  error,
  placeholder,
  rows = 4,
}: {
  name: string
  defaultValue: DefaultValue
  error?: string
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      id={name}
      name={name}
      rows={rows}
      defaultValue={defaultValue ?? ''}
      placeholder={placeholder}
      className="input"
      {...described(name, error)}
    />
  )
}

export function Select({
  name,
  defaultValue,
  options,
  placeholder = 'Not set',
  error,
  onChange,
}: {
  name: string
  defaultValue: DefaultValue
  options: { value: string; label: string }[]
  placeholder?: string
  error?: string
  onChange?: (value: string) => void
}) {
  return (
    <select
      id={name}
      name={name}
      defaultValue={defaultValue ?? ''}
      className="input"
      onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      {...described(name, error)}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

/**
 * A row of choices as chips, one at a time (radio) or several (checkbox).
 * The input sits inside the chip, so the whole chip is the hit area and the
 * keyboard moves through them like any radio group.
 */
export function ChoiceChips({
  name,
  options,
  defaultValue,
  multiple = false,
  legend,
  error,
}: {
  name: string
  options: { value: string; label: string }[]
  defaultValue: string | string[] | null | undefined
  multiple?: boolean
  legend: string
  error?: string
}) {
  const chosen = new Set(Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : [])
  return (
    <fieldset>
      <legend className="field-label">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className="chip">
            <input
              type={multiple ? 'checkbox' : 'radio'}
              name={name}
              value={option.value}
              defaultChecked={chosen.has(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
      {error ? (
        <p role="alert" className="mt-1.5 text-sm text-alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}

/**
 * A form's button. While the action runs it is disabled and says what is
 * happening, so the press is acknowledged at once and cannot be sent twice.
 */
export function SubmitButton({
  children,
  pending: pendingLabel,
  variant = 'primary',
  size = 'normal',
  className = '',
  name,
  value,
}: {
  children: ReactNode
  pending: ReactNode
  /** One primary per screen; everything else is quiet. */
  variant?: 'primary' | 'quiet'
  size?: 'normal' | 'small'
  className?: string
  name?: string
  value?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      aria-busy={pending || undefined}
      className={`btn ${variant === 'primary' ? 'btn-primary' : 'btn-quiet'} ${size === 'small' ? 'btn-small' : ''} ${className}`}
    >
      {pending ? (
        <>
          <Spinner />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  )
}

export function Spinner({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={`spin ${className}`}>
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** What an action said: an error in alert colour, anything else quietly. Announced either way. */
export function FormMessage({ message, tone = 'error' }: { message?: string | null; tone?: 'error' | 'info' }) {
  if (!message) return null
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`text-sm ${tone === 'error' ? 'text-alert' : 'text-ink-2'}`}>
      {message}
    </p>
  )
}
