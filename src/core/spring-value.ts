import {
  ParsedStyleValue,
  StyleValue,
  joinStyleValues,
  parseLeadingUnit,
  parseStyleValue,
} from './style'
import { Spring, evaluateSpring, evaluateSpringVelocity } from './spring'

const SPRING_VALUE_BRAND: unique symbol = Symbol('springValue')

/**
 * An animation info that is attached to a SpringValue.
 * When attached, a SpringValue returns its current value and velocity
 * computed from the animation info instead of its own state.
 */
export interface Attachment {
  spring: Spring
  from: number
  to: number
  initialVelocity: number
  startTime: number
  duration: number
  ctx: { settled: boolean; stoppedDuration: number | undefined }
}

function evaluateAttachmentValue(a: Attachment): number {
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

function evaluateAttachmentVelocity(a: Attachment): number {
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

/**
 * A spring value that `target` value is readonly and derived from a getter function.
 */
export interface SpringComputed {
  readonly target: number
  current(): number
  velocity(): number
  setVelocity(v: number): void
}

/**
 * A spring value that allows setting the `target` value.
 */
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

export type SpringStyleValue = StyleValue<SpringComputed>

export function isSpringValue(value: unknown): value is SpringComputed {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<PropertyKey, unknown>)[SPRING_VALUE_BRAND] === true
  )
}

/**
 * The base factory function of spring values.
 * If `write` argument is omitted the spring value will be readonly.
 */
export function createSpringValue(
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
        // Detach from the animation and capture the current position
        // so that the next animation can pick up smoothly from the user's takeover point.
        currentValue = evaluateAttachmentValue(obj._attachment)
        obj._attachment = undefined
      }
      velocity = v
    },
  }

  const descriptor: PropertyDescriptor = {
    get: read,
    enumerable: true,
    configurable: true,
  }
  if (write) {
    descriptor.set = (next: number) => {
      if (obj._attachment) {
        // Detach from the animation and capture both position and velocity
        // so the next animation can pick up smoothly from the user's takeover point.
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

export type SvInterpolation = number | string | SpringComputed

/**
 * A template tag function for building a CSS property value with spring value
 * interpolations. The returned value can be passed to a spring style prop.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const x = springValue(10)
 * const y = springValue(20)
 * </script>
 *
 * <template>
 *   <spring.div
 *     :spring-style="{ translate: sv`${x}px ${y}px` }"
 *   ></div>
 * </template>
 * ```
 */
export function sv(
  strings: TemplateStringsArray,
  ...values: SvInterpolation[]
): SpringStyleValue {
  const parts: SpringStyleValue[] = []

  // Parse the leading static string
  parts.push(liftToSpringStyle(parseStyleValue(strings[0] ?? '')))

  // Process each interpolation, then parse trailing unit and static text
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!
    const next = strings[i + 1] ?? ''

    if (typeof v === 'string') {
      // Literal text contribution; folds into the surrounding wrap on join.
      parts.push({ wraps: [v], units: [], values: [] })
      parts.push(liftToSpringStyle(parseStyleValue(next)))
      continue
    }

    const { unit, rest } = parseLeadingUnit(next)
    parts.push({
      wraps: ['', ''],
      units: [unit],
      values: [typeof v === 'number' ? createSpringValue(() => v) : v],
    })
    parts.push(liftToSpringStyle(parseStyleValue(rest)))
  }

  return joinStyleValues(parts)
}

/**
 * Lift a parser-produced `ParsedStyleValue` (numeric slots) into a
 * `SpringStyleValue` by wrapping each number in a constant `SpringComputed`.
 */
export function liftToSpringStyle(value: ParsedStyleValue): SpringStyleValue {
  return {
    wraps: value.wraps,
    units: value.units,
    values: value.values.map((v) => createSpringValue(() => v)),
  }
}

/**
 * Snapshot a `SpringStyleValue` into a numeric `ParsedStyleValue` by reading
 * each slot's `target`. Used by `animate()` and the controller to build
 * static numeric forms of styles before passing them to renderers.
 */
export function snapshotSpringStyle(value: SpringStyleValue): ParsedStyleValue {
  return {
    wraps: value.wraps,
    units: value.units,
    values: value.values.map((s) => s.target),
  }
}
