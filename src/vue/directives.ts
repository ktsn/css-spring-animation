import { Directive } from 'vue'
import {
  AnimateOptions,
  AnimateValue,
  AnimationController,
  createAnimateController,
} from '../core'

interface HTMLElementWithController extends HTMLElement {
  __springController?: AnimationController<Record<string, AnimateValue>>
}

export const vSpringStyle: Directive<
  HTMLElementWithController,
  Record<string, AnimateValue>
> = (el, { value }) => {
  ensureController(el).setStyle(value)
}

export const vSpringOptions: Directive<
  HTMLElementWithController,
  AnimateOptions<Record<string, number[]>>
> = (el, { value }) => {
  ensureController(el).setOptions(value)
}

function ensureController(
  el: HTMLElementWithController,
): AnimationController<Record<string, AnimateValue>> {
  let controller = el.__springController
  if (!controller) {
    controller = createAnimateController((style) => {
      for (const key in style) {
        el.style.setProperty(key, style[key] ?? '')
      }
    })
    el.__springController = controller
  }
  return controller
}
