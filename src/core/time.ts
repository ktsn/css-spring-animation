export const t = '--css-spring-animation-time'

let registered = false

export function registerPropertyIfNeeded() {
  if (
    typeof CSS === 'undefined' ||
    typeof CSS.registerProperty !== 'function' ||
    registered
  ) {
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

export function wait(
  duration: number,
  forceResolve?: { fn: (() => void)[] },
): Promise<void> {
  let resolved = false
  let timer: ReturnType<typeof setTimeout>

  return new Promise((resolve) => {
    function onEnd() {
      if (resolved) {
        return
      }
      resolved = true
      clearTimeout(timer)
      resolve()
    }

    if (forceResolve) {
      forceResolve.fn.push(onEnd)
    }
    timer = setTimeout(onEnd, duration)
  })
}
