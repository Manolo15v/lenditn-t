import { Globe, type LucideIcon, Monitor, Smartphone, Tablet } from 'lucide-react'

export type Device = { label: string; icon: LucideIcon }

// Order matters in both lists: Edge and Opera also say "Chrome", Chrome also
// says "Safari", and iPadOS and Android tablets also match the phone patterns.
const BROWSERS: [RegExp, string][] = [
  [/Edg\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/Firefox\/|FxiOS/, 'Firefox'],
  [/Chrome\/|CriOS/, 'Chrome'],
  [/Safari\//, 'Safari'],
]

const SYSTEMS: [RegExp, string, LucideIcon][] = [
  [/iPad/, 'iPad', Tablet],
  [/iPhone|iPod/, 'iPhone', Smartphone],
  [/Android(?!.*Mobile)/, 'Android tablet', Tablet],
  [/Android/, 'Android', Smartphone],
  [/Windows/, 'Windows', Monitor],
  [/Mac OS X|Macintosh/, 'macOS', Monitor],
  [/CrOS/, 'ChromeOS', Monitor],
  [/Linux/, 'Linux', Monitor],
]

// A best-effort label, not detection: the header is whatever the client chose
// to send. Good enough to tell "my phone" from "the library PC", which is all
// the sessions page asks of it.
export function describeDevice(userAgent: string | null): Device {
  if (!userAgent) return { label: 'Unknown device', icon: Globe }

  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1]
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))

  if (!browser && !system) return { label: 'Unknown device', icon: Globe }
  if (!system) return { label: browser ?? 'Unknown device', icon: Globe }
  return { label: browser ? `${browser} on ${system[1]}` : system[1], icon: system[2] }
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export const formatDateTime = (iso: string) => dateTimeFormatter.format(new Date(iso))
