import {
  Parser,
  anyChar,
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

interface Token {
  type: 'string' | 'number' | 'unit'
  value: string
}

const unit = regexp(/^([a-z%]+)/)

const parser: Parser<Token[]> = (value) => {
  const numberWithUnit = map(seq(number, optional(unit)), (value) => ({
    type: 'number',
    value,
  }))

  const char = map(anyChar, (value) => ({
    type: 'char',
    value: [value],
  }))

  const result = many(or(numberWithUnit, char))(value)
  if (!result.ok) {
    return result
  }

  return {
    ...result,
    value: result.value.reduce<Token[]>((acc, res) => {
      if (res.type === 'char') {
        const last = acc[acc.length - 1]
        if (last && last.type === 'string') {
          last.value += res.value[0]!
        } else {
          acc.push({
            type: 'string',
            value: res.value[0]!,
          })
        }
      } else {
        acc.push(
          {
            type: 'number',
            value: res.value[0]!,
          },
          {
            type: 'unit',
            value: res.value[1]!,
          },
        )
      }

      return acc
    }, []),
  }
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

  const tokens = [...parsed.value]

  if (tokens[0]?.type !== 'string') {
    tokens.unshift({
      type: 'string',
      value: '',
    })
  }

  if (tokens[tokens.length - 1]?.type !== 'string') {
    tokens.push({
      type: 'string',
      value: '',
    })
  }

  return tokens.reduce<ParsedStyleValue>(
    (acc, token) => {
      if (token.type === 'string') {
        acc.wraps.push(token.value)
      } else if (token.type === 'number') {
        acc.values.push(parseFloat(token.value))
      } else if (token.type === 'unit') {
        acc.units.push(token.value)
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
