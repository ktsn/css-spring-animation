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
