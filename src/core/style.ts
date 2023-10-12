export interface SpringStyle {
  values: readonly number[]
  units: readonly string[]
  strings: readonly string[]
}

export function s(
  strings: readonly string[],
  ...values: readonly number[]
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
