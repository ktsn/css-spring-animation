export type Result<T> = Parsed<T> | Failed

interface Parsed<T> {
  ok: true
  value: T
  rest: string
}

interface Failed {
  ok: false
}

export type Parser<T> = (value: string) => Result<T>

const failed = {
  ok: false,
} as const

export function regexp(regexp: RegExp): Parser<string> {
  return (value: string) => {
    const match = value.match(regexp)
    if (!match) {
      return failed
    }

    return {
      ok: true,
      value: match[0],
      rest: value.slice(match[0].length),
    }
  }
}

export function or<T>(...parsers: Parser<T>[]): Parser<T> {
  return (value) => {
    for (const parser of parsers) {
      const parsed = parser(value)
      if (parsed.ok) {
        return parsed
      }
    }

    return failed
  }
}

export function map<T, U>(parser: Parser<T>, fn: (value: T) => U): Parser<U> {
  return (value: string) => {
    const parsed = parser(value)
    if (!parsed.ok) {
      return parsed
    }
    return {
      ...parsed,
      value: fn(parsed.value),
    }
  }
}

export function seq<T>(...parsers: Parser<T>[]): Parser<T[]> {
  return (value) => {
    return parsers.reduce<Result<T[]>>(
      (acc, parser) => {
        if (!acc.ok) {
          return acc
        }

        const parsed = parser(acc.rest)
        if (!parsed.ok) {
          return parsed
        }

        return {
          ...acc,
          value: [...acc.value, parsed.value],
          rest: parsed.rest,
        }
      },
      {
        ok: true,
        value: [],
        rest: value,
      },
    )
  }
}

export function many<T>(parser: Parser<T>): Parser<T[]> {
  return (value) => {
    let result: Result<T[]> = {
      ok: true,
      value: [],
      rest: value,
    }

    while (true) {
      if (result.rest === '') {
        return result
      }

      const parsed = parser(result.rest)
      if (!parsed.ok) {
        return result
      }

      result.value.push(parsed.value)
      result.rest = parsed.rest
    }
  }
}

export function some<T>(parser: Parser<T>): Parser<T[]> {
  return (value) => {
    const parsed = many(parser)(value)
    if (!parsed.ok) {
      return parsed
    }

    if (parsed.value.length === 0) {
      return failed
    }

    return parsed
  }
}

export function optional(parser: Parser<string>): Parser<string> {
  return (value) => {
    const parsed = parser(value)
    return {
      ok: true,
      value: parsed.ok ? parsed.value : '',
      rest: parsed.ok ? parsed.rest : value,
    }
  }
}

export function join(parser: Parser<string[]>): Parser<string> {
  return map(parser, (value) => value.join(''))
}

export function string(str: string): Parser<string> {
  return (value) => {
    if (!value.startsWith(str)) {
      return failed
    }

    return {
      ok: true,
      value: str,
      rest: value.slice(str.length),
    }
  }
}

export const anyChar: Parser<string> = (value) => {
  if (value === '') {
    return failed
  }

  return {
    ok: true,
    value: value[0]!,
    rest: value.slice(1),
  }
}

export const integer: Parser<string> = (value) => {
  const head = regexp(/^[1-9]/)
  const tail = regexp(/^\d*/)

  const sign = optional(or(string('+'), string('-')))
  const zero = string('0')
  const nonZero = join(seq(head, tail))

  return join(seq(sign, or(zero, nonZero)))(value)
}

export const float: Parser<string> = (value) => {
  const head = join(seq(optional(integer), string('.')))
  const tail = regexp(/^\d+/)

  return join(seq(head, tail))(value)
}

export const number: Parser<string> = (value) => {
  const head = or(float, integer)
  const exp = join(seq(or(string('e'), string('E')), integer))

  return join(seq(head, optional(exp)))(value)
}
