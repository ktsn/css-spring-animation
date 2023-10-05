export const t = '--css-spring-animation-t'

let registered = false

export function registerPropertyIfNeeded() {
  if (registered) {
    return
  }

  CSS.registerProperty({
    name: t,
    inherits: false,
    initialValue: '0',
    syntax: '<number>',
  })
  registered = true
}

export function wait(duration: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), duration)
  })
}
