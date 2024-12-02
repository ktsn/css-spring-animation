import {
  Parser,
  anyChar,
  hexColor,
  many,
  map,
  number,
  optional,
  or,
  regexp,
  seq,
} from './combinator'

export interface ParsedStyleTemplate {
  units: string[]
  wraps: string[]
}

export interface ParsedStyleValue extends ParsedStyleTemplate {
  values: number[]
}

type Token = CharToken | NumberToken | HexColorToken

interface CharToken {
  type: 'char'
  value: string
}

interface NumberToken {
  type: 'number'
  value: number
  unit: string
}

interface HexColorToken {
  type: 'hexColor'
  red: number
  green: number
  blue: number
  alpha: number | undefined
}

const unit = regexp(/^([a-z%]+)/)

const parser: Parser<Token[]> = (value) => {
  const numberWithUnit = map(
    seq(number, optional(unit)),
    (value): Token => ({
      type: 'number',
      value: Number(value[0]),
      unit: value[1] ?? '',
    }),
  )

  const color = map(hexColor, (value): Token => {
    const [red, green, blue, alpha] = value.slice(1).map((v, i) => {
      if (!v) {
        return undefined
      }
      const filled = v.length === 1 ? v + v : v
      const n = parseInt(filled, 16)
      return i === 3 ? n / 0xff : n
    })

    return {
      type: 'hexColor',
      red: red!,
      green: green!,
      blue: blue!,
      alpha,
    }
  })

  const char = map(
    anyChar,
    (value): Token => ({
      type: 'char',
      value,
    }),
  )

  return many(or(numberWithUnit, color, char))(value)
}

export function parseStyleValue(value: string): ParsedStyleValue {
  const parsed = parser(value)
  if (!parsed.ok) {
    return {
      values: [],
      units: [],
      wraps: [value],
    }
  }

  const tokens: Token[] = [...parsed.value, { type: 'char', value: '' }]

  return tokens.reduce<ParsedStyleValue>(
    (acc, token, i) => {
      const last = tokens[i - 1]
      const continuousWrap = last?.type === 'char' || last?.type === 'hexColor'

      if (token.type === 'char') {
        if (continuousWrap) {
          acc.wraps[acc.wraps.length - 1] += token.value
        } else {
          acc.wraps.push(token.value)
        }
        return acc
      }

      if (token.type === 'number') {
        if (!continuousWrap) {
          acc.wraps.push('')
        }
        acc.values.push(token.value)
        acc.units.push(token.unit)
        return acc
      }

      if (token.type === 'hexColor') {
        const prefix = token.alpha === undefined ? 'rgb(' : 'rgba('
        if (continuousWrap) {
          acc.wraps[acc.wraps.length - 1] += prefix
        } else {
          acc.wraps.push(prefix)
        }

        acc.values.push(token.red, token.green, token.blue)
        acc.units.push('', '', '')
        acc.wraps.push(', ', ', ')

        if (token.alpha !== undefined) {
          acc.values.push(token.alpha)
          acc.units.push('')
          acc.wraps.push(', ')
        }

        acc.wraps.push(')')

        return acc
      }

      return acc
    },
    {
      values: [],
      units: [],
      wraps: [],
    },
  )
}

/**
 * If `target` has a value of 0 without unit, the unit is completed with the unit of the same position in `context`.
 */
export function completeParsedStyleUnit(
  target: ParsedStyleValue,
  context: ParsedStyleTemplate,
): ParsedStyleValue {
  const completed = target.units.map((unit, i) => {
    if (!unit && target.values[i] === 0) {
      return context.units[i] ?? ''
    }
    return unit
  })

  return {
    ...target,
    units: completed,
  }
}

export function interpolateParsedStyle(
  template: ParsedStyleTemplate,
  values: (string | number)[],
): string {
  return template.wraps.reduce((acc, wrap, i) => {
    const unit = template.units[i] ?? ''

    const value =
      values[i] === undefined
        ? ''
        : typeof values[i] === 'number'
          ? `${values[i]}${unit}`
          : `calc(1${unit} * (${values[i]}))`

    return acc + wrap + value
  }, '')
}
