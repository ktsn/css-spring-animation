import { computed, ref } from 'vue'
import { AnimateValue } from '../core'
import {
  ParsedStyleTemplate,
  interpolateParsedStyle,
  parseStyleValue,
} from '../core/style'

const SPRING_VALUE_BRAND = Symbol('springValue')
const SPRING_STYLE_BRAND = Symbol('springStyleValue')

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
  _attachments: Attachment[]
  target: number
  current(): number
  velocity(): number
}

export interface SpringStyleValue {
  [SPRING_STYLE_BRAND]: true
  template: ParsedStyleTemplate
  slots: (number | SpringComputed)[]
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
    (value as Record<PropertyKey, unknown>)[SPRING_STYLE_BRAND] === true
  )
}

function createSpring(
  read: () => number,
  write: ((next: number) => void) | undefined,
): InternalSpring {
  const attachments: Attachment[] = []

  const obj = {
    [SPRING_VALUE_BRAND]: true as const,
    _attachments: attachments,

    current(): number {
      const last = attachments[attachments.length - 1]
      return last ? last.readValue() : read()
    },

    velocity(): number {
      const last = attachments[attachments.length - 1]
      return last ? last.readVelocity() : 0
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

export function springValue(initial: number): SpringValue {
  const valueRef = ref(initial)

  return createSpring(
    () => valueRef.value,
    (next) => {
      valueRef.value = next
    },
  )
}

export function springComputed(getter: () => number): SpringComputed {
  const valueRef = computed(getter)
  return createSpring(() => valueRef.value, undefined)
}

export function attachSpringValue(
  value: SpringComputed,
  attachment: Attachment,
): void {
  const sv = value as InternalSpring
  sv._attachments.push(attachment)
  if (sv._attachments.length > 1) {
    console.warn(
      '[css-spring-animation] springValue is bound to multiple spring elements at once. current() and velocity() will reflect the most-recently-bound element.',
    )
  }
}

export function detachSpringValue(
  value: SpringComputed,
  attachment: Attachment,
): void {
  const sv = value as InternalSpring
  const i = sv._attachments.indexOf(attachment)
  if (i !== -1) {
    sv._attachments.splice(i, 1)
  }
}

/**
 * Resolve a record of spring-style entries — replacing any `SpringStyleValue`
 * markers with the interpolated CSS string built from each slot's current
 * `target`. Non-marker entries are passed through unchanged. Returns the same
 * object reference when no markers are present, so reference-aliasing
 * consumers (e.g. spy assertions) keep their existing semantics.
 */
export function resolveSpringStyle<
  T extends Record<string, AnimateValue | SpringStyleValue>,
>(raw: T): Record<keyof T, AnimateValue> {
  let hasSpringValue = false
  const resolved: Record<string, AnimateValue> = {}

  for (const key in raw) {
    const v = raw[key]!

    if (isSpringStyleValue(v)) {
      const values = v.slots.map((slot) =>
        isSpringValue(slot) ? slot.target : slot,
      )
      resolved[key] = interpolateParsedStyle(v.template, values)

      hasSpringValue = true
    } else {
      resolved[key] = v
    }
  }

  return (hasSpringValue ? resolved : raw) as Record<keyof T, AnimateValue>
}

const unitRegex = /^[a-z%]+/

type SvInterpolation = number | string | SpringComputed

export function sv(
  strings: TemplateStringsArray,
  ...values: SvInterpolation[]
): SpringStyleValue {
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

    const match = next.match(unitRegex)
    const unit = match ? match[0] : ''
    const rest = match ? next.slice(unit.length) : next

    wraps.push(cur)
    units.push(unit)
    slots.push(v as number | SpringComputed)
    cur = ''
    consumeStatic(rest)
  }

  wraps.push(cur)

  return {
    [SPRING_STYLE_BRAND]: true,
    template: { wraps, units },
    slots,
  }
}
