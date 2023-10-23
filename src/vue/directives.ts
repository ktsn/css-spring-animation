import { App, Directive } from 'vue'
import {
  AnimateValue,
  AnimationController,
  SpringOptions,
  createAnimateController,
} from '../core'

interface HTMLElementWithController extends HTMLElement {
  __springController?: AnimationController<Record<string, AnimateValue>>
}

function install(app: App): void {
  app.directive('spring-style', springStyle)
  app.directive('spring-options', springOptions)
}

export const springDirectives = {
  install,
}

const springStyle: Directive<
  HTMLElementWithController,
  Record<string, AnimateValue>
> = (el, { value }, vnode) => {
  const controller = ensureController(el)

  vnode.dirs?.forEach((dir) => {
    if (dir.dir === springOptions) {
      const options = dir.value
      if (options) {
        controller.setOptions(options)
      }
    }
  })

  controller.setStyle(value)
}

// Because options value is collected on v-spring-style directive,
// we do nothing in v-spring-options directive itself.
// The directive definition object is used to find it from a vnode
// in v-spring-style directive.
const springOptions: Directive<HTMLElementWithController, SpringOptions> = {}

function ensureController(
  el: HTMLElementWithController,
): AnimationController<Record<string, AnimateValue>> {
  let controller = el.__springController
  if (!controller) {
    controller = createAnimateController((style) => {
      for (const key in style) {
        if (key.startsWith('--')) {
          el.style.setProperty(key, style[key] ?? '')
        } else {
          el.style[key as any] = style[key] ?? ''
        }
      }
    })
    el.__springController = controller
  }
  return controller
}
