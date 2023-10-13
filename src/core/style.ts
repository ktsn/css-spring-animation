export interface SpringStyleTemplate {
  units: string[]
  strings: readonly string[]
}

export interface SpringStyle extends SpringStyleTemplate {
  values: number[]
}

export function s(
  strings: readonly string[],
  ...values: number[]
): SpringStyle {
  const units = strings.slice(1).map((str) => {
    const match = str.match(/^([a-z%]+)/)
    return match ? match[1]! : ''
  })

  return {
    values,
    units,
    strings: strings.map((str, i) => {
      const unit = units[i - 1]
      if (!unit) {
        return str
      }
      return str.slice(unit.length)
    }),
  }
}

export function generateSpringStyle(
  template: SpringStyleTemplate,
  values: (string | number)[],
): string {
  return template.strings.reduce((acc, str, i) => {
    const unit = template.units[i] ?? ''

    const value =
      values[i] === undefined
        ? ''
        : typeof values[i] === 'number'
        ? `${values[i]}${unit}`
        : `calc(1${unit} * (${values[i]}))`

    return acc + str + value
  }, '')
}
