import { App } from 'vue'
import { vSpringOptions, vSpringStyle } from './directives'

export { useSpring, useSpringStyle } from './use-spring'
export { vSpringStyle, vSpringOptions } from './directives'

export * from '../core'

function install(app: App): void {
  app.directive('spring-style', vSpringStyle)
  app.directive('spring-options', vSpringOptions)
}

export default {
  install,
}
