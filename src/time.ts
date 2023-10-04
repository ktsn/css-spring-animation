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

export function setTimeTransition(el: HTMLElement, duration: number): void {
  el.style.transition = `${t} ${duration}ms linear`
}

export function setTimeProperty(el: HTMLElement, value: number | null): void {
  el.style.setProperty(t, value === null ? null : String(value))
}

export function waitForTimeTransition(el: HTMLElement, onEnd: () => void) {
  function onTransitionEnd(event: TransitionEvent) {
    if (event.target !== el || event.propertyName !== t) {
      return
    }

    el.removeEventListener('transitionend', onTransitionEnd)
    onEnd()
  }

  el.addEventListener('transitionend', onTransitionEnd)
}
