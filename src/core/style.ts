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
import { takeUntil } from './utils'

export interface ParsedStyleTemplate {
  units: string[]
  wraps: string[]
}

export interface ParsedStyleValue extends ParsedStyleTemplate {
  values: number[]
}

interface Token {
  type: 'string' | 'number' | 'colorNumber' | 'colorHex' | 'unit'
  value: string
}

const unit = regexp(/^([a-z%]+)/)

const parser: Parser<Token[]> = (value) => {
  const numberWithUnit = map(seq(number, optional(unit)), (value) => ({
    type: 'number',
    value,
  }))

  const color = map(hexColor, (value) => ({
    type: 'hexColor',
    value,
  }))

  const char = map(anyChar, (value) => ({
    type: 'char',
    value: [value],
  }))

  const result = many(or(numberWithUnit, color, char))(value)
  if (!result.ok) {
    return result
  }

  return {
    ...result,
    value: result.value.reduce<Token[]>((acc, res) => {
      if (res.type === 'hexColor') {
        const tokens: Token[] = [
          {
            type: 'colorNumber',
            value: res.value[0]!,
          },
          {
            type: 'colorHex',
            value: res.value[1]!,
          },
          {
            type: 'colorHex',
            value: res.value[2]!,
          },
          {
            type: 'colorHex',
            value: res.value[3]!,
          },
        ]
        if (res.value[4]) {
          tokens.push({
            type: 'colorHex',
            value: res.value[4],
          })
        }
        return acc.concat(tokens)
      }

      if (res.type === 'number') {
        return acc.concat([
          {
            type: 'number',
            value: res.value[0]!,
          },
          {
            type: 'unit',
            value: res.value[1]!,
          },
        ])
      }

      const last = acc[acc.length - 1]
      if (last && last.type === 'string') {
        last.value += res.value[0]!
      } else {
        acc.push({
          type: 'string',
          value: res.value[0]!,
        })
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

  const preprocessed = tokens.reduce<Token[]>((acc, token, i) => {
    const prev = acc[acc.length - 1]
    if (token.type === 'string' && prev?.type === 'string') {
      prev.value += token.value
      return acc
    }

    if (token.type === 'number' && prev?.type !== 'string') {
      acc.push(
        {
          type: 'string',
          value: '',
        },
        token,
      )
      return acc
    }

    if (token.type === 'colorNumber') {
      const hexes = takeUntil(
        tokens.slice(i + 1),
        (token) => token.type !== 'colorHex',
      )

      const str = hexes.length === 4 ? 'rgba(' : 'rgb('
      if (prev?.type === 'string') {
        prev.value += str
      } else {
        acc.push({
          type: 'string',
          value: str,
        })
      }
      return acc
    }

    if (token.type === 'colorHex') {
      const value =
        token.value.length === 1 ? token.value + token.value : token.value

      if (tokens[i - 1]?.type !== 'colorNumber') {
        acc.push({
          type: 'string',
          value: ', ',
        })
      }

      acc.push(
        {
          type: 'number',
          value: String(parseInt(value, 16)),
        },
        {
          type: 'unit',
          value: '',
        },
      )

      if (tokens[i + 1]?.type !== 'colorHex') {
        acc.push({
          type: 'string',
          value: ')',
        })
      }

      return acc
    }

    return acc.concat([token])
  }, [])

  if (preprocessed[preprocessed.length - 1]?.type !== 'string') {
    preprocessed.push({
      type: 'string',
      value: '',
    })
  }

  return preprocessed.reduce<ParsedStyleValue>(
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
