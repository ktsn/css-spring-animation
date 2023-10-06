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
