export function mapValues<T, U>(
  object: T,
  fn: (value: T[keyof T], key: keyof T) => U,
): { [K in keyof T]: U } {
  const result: any = {}
  for (const key in object) {
    result[key] = fn(object[key], key)
  }
  return result
}

export function zip<T>(a: readonly T[], b: readonly T[]): [T, T][] {
  const result: [T, T][] = []
  const length = Math.min(a.length, b.length)
  for (let i = 0; i < length; i++) {
    result.push([a[i]!, b[i]!])
  }
  return result
}

export function range(start: number, end: number): number[] {
  const result = []
  for (let i = start; i < end; i++) {
    result.push(i)
  }
  return result
}

export function isBrowserSupported(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.registerProperty === 'function' &&
    CSS.supports('width', 'calc(1px * exp(0))')
  )
}

export function forceReflow(): void {
  document.body.offsetHeight
}
