/** What a Claude call cost, as the rest of the app says it: "US$0.12", or "under US$0.01" for a read. */
export function usd(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null
  if (value < 0.005) return 'under US$0.01'
  return `US$${value.toFixed(2)}`
}

/** "Long and lean" from "long and lean." */
export function sentence(value: string): string {
  const trimmed = value.trim().replace(/[.]+$/, '')
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}
