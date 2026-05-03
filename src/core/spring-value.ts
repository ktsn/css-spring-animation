import {
  ParsedStyleTemplate,
  ParsedStyleValue,
  interpolateParsedStyle,
  parseLeadingUnit,
  parseStyleValue,
} from './style'
import type { AnimateValue } from './animate'
import { Spring, evaluateSpring, evaluateSpringVelocity } from './spring'

const SPRING_VALUE_BRAND: unique symbol = Symbol('springValue')

export interface Attachment {
  spring: Spring
  from: number
  to: number
  initialVelocity: number
  startTime: number
  duration: number
  ctx: { settled: boolean; stoppedDuration: number | undefined }
}

export function evaluateAttachmentValue(a: Attachment): number {
  if (a.ctx.settled && a.ctx.stoppedDuration === undefined) {
    return a.to
  }

  const elapsed = a.ctx.stoppedDuration ?? performance.now() - a.startTime
  const time = elapsed / a.duration

  return evaluateSpring(a.spring, {
    from: a.from,
    to: a.to,
    initialVelocity: a.initialVelocity,
    time,
  })
}

export function evaluateAttachmentVelocity(a: Attachment): number {
  if (a.ctx.settled) {
    return 0
  }

  const time = (performance.now() - a.startTime) / a.duration

  return evaluateSpringVelocity(a.spring, {
    from: a.from,
    to: a.to,
    initialVelocity: a.initialVelocity,
    time,
  })
}

export interface SpringComputed {
  readonly target: number
  current(): number
  velocity(): number
  setVelocity(v: number): void
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
  setVelocity(v: number): void
}

export interface SpringStyleValue extends ParsedStyleTemplate {
  values: SpringComputed[]
}

export function isSpringValue(value: unknown): value is SpringComputed {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<PropertyKey, unknown>)[SPRING_VALUE_BRAND] === true
  )
}

export function isSpringStyleValue(value: unknown): value is SpringStyleValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as SpringStyleValue).values) &&
    (value as SpringStyleValue).values.every(isSpringValue)
  )
}

/**
 * Wrap a plain numeric slot in a frozen `SpringComputed` whose `target`
 * mirrors the number. Existing `SpringComputed` values pass through
 * unchanged. Lets the controller and `animate()` route every parsed slot
 * through the SpringValue evaluation path uniformly.
 */
export function ensureSpring(value: number | SpringComputed): SpringComputed {
  if (isSpringValue(value)) return value
  const num = value
  return createSpring(() => num)
}

export function createSpring(
  read: () => number,
  write?: (next: number) => void,
): InternalSpring {
  let currentValue: number | undefined
  let velocity = 0

  const obj = {
    [SPRING_VALUE_BRAND]: true as const,
    _attachment: undefined as Attachment | undefined,

    current(): number {
      if (obj._attachment) {
        return evaluateAttachmentValue(obj._attachment)
      }
      return currentValue ?? read()
    },

    velocity(): number {
      return obj._attachment
        ? evaluateAttachmentVelocity(obj._attachment)
        : velocity
    },

    setVelocity(v: number): void {
      if (obj._attachment) {
        currentValue = evaluateAttachmentValue(obj._attachment)
        obj._attachment = undefined
      }
      velocity = v
    },
  }

  const descriptor: PropertyDescriptor = {
    get: read,
    enumerable: true,
    configurable: false,
  }
  if (write) {
    descriptor.set = (next: number) => {
      if (obj._attachment) {
        // Capture both position and velocity so the next animation can
        // pick up smoothly from the user's takeover point.
        currentValue = evaluateAttachmentValue(obj._attachment)
        velocity = evaluateAttachmentVelocity(obj._attachment)
        obj._attachment = undefined
      } else {
        currentValue = next
      }
      write(next)
    }
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
): SpringStyleValue {
  const wraps: string[] = []
  const units: string[] = []
  const slots: SpringComputed[] = []
  let cur = ''

  // Run each static template chunk through `parseStyleValue` so any embedded
  // numbers (e.g. the `0` in sv`0px ${y}px`) become slots too. This lets
  // the other module reuse the static spring value to retain animated value
  // and velocity for later.
  function consumeStatic(text: string): void {
    const parsed = parseStyleValue(text)
    for (let i = 0; i < parsed.values.length; i++) {
      cur += parsed.wraps[i] ?? ''
      wraps.push(cur)
      units.push(parsed.units[i] ?? '')
      slots.push(ensureSpring(parsed.values[i]!))
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
    slots.push(typeof v === 'number' ? ensureSpring(v) : v!)
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

/**
 * Lift a parser-produced `ParsedStyleValue` (numeric slots) into a
 * `SpringStyleValue` by wrapping each number in a constant `SpringComputed`.
 * Already-spring slots pass through unchanged.
 */
export function liftToSpring(value: {
  wraps: string[]
  units: string[]
  values: readonly (number | SpringComputed)[]
}): SpringStyleValue {
  return {
    wraps: value.wraps,
    units: value.units,
    values: value.values.map((v) => ensureSpring(v)),
  }
}

function snapshotValues(values: readonly SpringComputed[]): number[] {
  return values.map((s) => s.target)
}

/**
 * Snapshot a `SpringStyleValue` into a numeric `ParsedStyleValue` by reading
 * each slot's `target`. Used by `animate()` and the controller to build
 * static numeric forms of styles before passing them to renderers.
 */
export function snapshotParsed(value: SpringStyleValue): ParsedStyleValue {
  return {
    wraps: value.wraps,
    units: value.units,
    values: snapshotValues(value.values),
  }
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
