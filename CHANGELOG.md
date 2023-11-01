## 0.8.1

### Bug Fixes

- Bundle `<SpringTransition>` component type.

## 0.8.0

### New Features

- Added `<SpringTransition>` component.

## 0.7.1

### Bug Fixes

- reset transition and time custom property when `useSpring` is disabled

## 0.7.0

- Improve spring parameters

### Breaking Changes

- Rename default exported plugin object with `springDirectives`

## 0.6.0

- add `spring` component namespace. e.g. `<spring.div :spring-style="{ translate: x + 'px' }"></spring.div>`

## 0.5.2

- hyphenate style property name passed to `v-spring-style` directive.

## 0.5.1

- alpha part in hex color should be in range 0-1

## 0.5.0

- Allow to pass normal string for animation target value.
- Support hex color (`#RRGGBB`) animation.

### Breaking Changes

- Removed `s` util function.

## 0.4.3

- calculate velocity from input style automatically while disabled

### Breaking Changes

- Removed velocity option from `useSpring` and `v-spring-options`

## 0.4.2

- annotate v-spring-options type for type diagnostics

## 0.4.1

- ensure `v-spring-options` value is applied before triggering `v-spring-style` animation on the same update.

### Breaking Changes

- removed `useSpringStyle`

## 0.4.0

- add `s` util.
- add `v-spring-style` and `v-spring-options` directives.
- allow to install the above directives globally by `app.use(plugin)`.

### Breaking Changes

- `animate` and `useSpring` interface is changed.
- removed `unit` util.

## 0.3.1

- return real value and real velocity after animation is stopped.
- `finishingPromise` and `settlingPromise` should be resolved after internal processing is finished.

## 0.3.0

- Add `useSpring` vue composable.
  - `realValue` and `realVelocity` are available in addition to `style` from `useSpringStyle`.

### Breaking Changes

- Renamed the returned context properties from `animate`.
  - `ctx.current` -> `ctx.realValue`
  - `ctx.velocity` -> `ctx.realVelocity`

## 0.2.0

- Add `unit` function in favor of `unit` option

### Breaking Changes

- `unit` option of `animate` is removed

## 0.1.1

- Add `unit` option

## 0.1.0

Initial release
