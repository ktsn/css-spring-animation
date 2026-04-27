import {
  ParsedStyleValue,
  interpolateParsedStyle,
  parseLeadingUnit,
  parseStyleValue,
} from './style'
import type { AnimateValue } from './animate'

const SPRING_VALUE_BRAND: unique symbol = Symbol('springValue')

interface Attachment {
  readValue(): number
  readVelocity(): number
}

export interface SpringComputed {
  readonly target: number
  current(): number
  velocity(): number
}

export interface SpringValue extends SpringComputed {
  target: number
}

interface InternalSpring {
  [SPRING_VALUE_BRAND]: true
  _attachment: Attachment | undefined
  target: number
  current(): number
  velocity(): number
}

/**
 * @deprecated Use `ParsedStyleValue` directly — the two types are unified.
 */
export type SpringStyleValue = ParsedStyleValue

export function isSpringValue(value: unknown): value is SpringComputed {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<PropertyKey, unknown>)[SPRING_VALUE_BRAND] === true
  )
}

export function isSpringStyleValue(value: unknown): value is ParsedStyleValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as ParsedStyleValue).values) &&
    (value as ParsedStyleValue).values.some(isSpringValue)
  )
}

export function createSpring(
  read: () => number,
  write?: (next: number) => void,
): InternalSpring {
  const obj = {
    [SPRING_VALUE_BRAND]: true as const,
    _attachment: undefined as Attachment | undefined,

    current(): number {
      return obj._attachment ? obj._attachment.readValue() : read()
    },

    velocity(): number {
      return obj._attachment ? obj._attachment.readVelocity() : 0
    },
  }

  const descriptor: PropertyDescriptor = {
    get: read,
    enumerable: true,
    configurable: false,
  }
  if (write) {
    descriptor.set = write
  }
  Object.defineProperty(obj, 'target', descriptor)

  return obj as InternalSpring
}

export function attachSpringValue(
  value: SpringComputed,
  attachment: Attachment,
): void {
  ;(value as InternalSpring)._attachment = attachment
}

type SvInterpolation = number | string | SpringComputed

export function sv(
  strings: TemplateStringsArray,
  ...values: SvInterpolation[]
): ParsedStyleValue {
  const wraps: string[] = []
  const units: string[] = []
  const slots: (number | SpringComputed)[] = []
  let cur = ''

  // Run each static template chunk through `parseStyleValue` so any embedded
  // numbers (e.g. the `0` in `sv\`0px ${y}px\``) become slots too. This keeps
  // slot indices aligned with the indices in the controller's parsed value
  // array, which is critical for correct readValue / readVelocity binding.
  function consumeStatic(text: string): void {
    const parsed = parseStyleValue(text)
    for (let i = 0; i < parsed.values.length; i++) {
      cur += parsed.wraps[i] ?? ''
      wraps.push(cur)
      units.push(parsed.units[i] ?? '')
      slots.push(parsed.values[i]!)
      cur = ''
    }
    cur += parsed.wraps[parsed.values.length] ?? ''
  }

  consumeStatic(strings[0] ?? '')

  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    const next = strings[i + 1] ?? ''

    if (typeof v === 'string') {
      cur += v
      consumeStatic(next)
      continue
    }

    const { unit, rest } = parseLeadingUnit(next)

    wraps.push(cur)
    units.push(unit)
    slots.push(v as number | SpringComputed)
    cur = ''
    consumeStatic(rest)
  }

  wraps.push(cur)

  return {
    wraps,
    units,
    values: slots,
  }
}

function snapshotValues(
  values: readonly (number | SpringComputed)[],
): number[] {
  return values.map((v) => (isSpringValue(v) ? v.target : v))
}

export function resolveSpringStyleValue(value: AnimateValue): AnimateValue {
  if (typeof value !== 'object' || !isSpringStyleValue(value)) {
    return value
  }
  return interpolateParsedStyle(value, snapshotValues(value.values))
}

/**
 * Resolve a record of spring-style entries — replacing any entries that
 * contain `SpringComputed` slots with the interpolated CSS string built from
 * each slot's current `target`. Non-marker entries are passed through
 * unchanged. Returns the same object reference when no marker entries are
 * present.
 */
export function resolveSpringStyle<T extends Record<string, AnimateValue>>(
  raw: T,
): Record<keyof T, AnimateValue> {
  let hasSpringValue = false
  const resolved: Record<string, AnimateValue> = {}

  for (const key in raw) {
    const v = raw[key]!
    if (isSpringStyleValue(v)) {
      resolved[key] = interpolateParsedStyle(v, snapshotValues(v.values))
      hasSpringValue = true
    } else {
      resolved[key] = v
    }
  }

  return (hasSpringValue ? resolved : raw) as Record<keyof T, AnimateValue>
}
