# [0.17.0](https://github.com/ktsn/css-spring-animation/compare/v0.16.2...v0.17.0) (2025-07-02)


### Features

* add springCSS utility ([950ea8b](https://github.com/ktsn/css-spring-animation/commit/950ea8b3c02d141296906f22e52b3ad92aeaeda3))
* make settling duration more precise ([b3b3e63](https://github.com/ktsn/css-spring-animation/commit/b3b3e634972a51a1371f512244c5f244d19ae0fb))



## [0.16.2](https://github.com/ktsn/css-spring-animation/compare/v0.16.1...v0.16.2) (2025-03-03)


### Bug Fixes

* allow to import with modern moduleResolution TypeScript config ([45b9989](https://github.com/ktsn/css-spring-animation/commit/45b9989a773ed159b16edba4e1b40a6f53259200))


### Features

* add `onSettleCurrent` to `useSpring` ([c42dfaa](https://github.com/ktsn/css-spring-animation/commit/c42dfaa0103b076179b4841fd512b2389e83febf))



## [0.16.1](https://github.com/ktsn/css-spring-animation/compare/v0.16.0...v0.16.1) (2024-12-10)


### Bug Fixes

* do not try hardware acceleration if browser is not supported ([9d5644c](https://github.com/ktsn/css-spring-animation/commit/9d5644cf822e58b4c85bef49888b948c020f32e6))


### Performance Improvements

* improve hardware accelerated animation timing function precision ([657333f](https://github.com/ktsn/css-spring-animation/commit/657333fbde9f8ca18465153e24551222f9ac49fe))



# [0.16.0](https://github.com/ktsn/css-spring-animation/compare/v0.15.0...v0.16.0) (2024-12-03)


### Bug Fixes

* fix the problem that unit completion is not applied in some cases ([9a77969](https://github.com/ktsn/css-spring-animation/commit/9a779690a29e93887c0f126e7b36d00e3ea93f53))


### Features

* trigger hardware accelerated transition if possible ([#10](https://github.com/ktsn/css-spring-animation/issues/10)) ([6f170fc](https://github.com/ktsn/css-spring-animation/commit/6f170fc5c46cbcaa29b8b55fa760c4d6e0238a08))



# [0.15.0](https://github.com/ktsn/css-spring-animation/compare/v0.14.0...v0.15.0) (2024-11-20)


### Features

* add relocating option for `useSpring` and `<spring>` ([fdae4cb](https://github.com/ktsn/css-spring-animation/commit/fdae4cb8eff466fa801dde241e318e4c33cae713))



# [0.14.0](https://github.com/ktsn/css-spring-animation/compare/v0.13.0...v0.14.0) (2024-11-18)


### Bug Fixes

* set spring style value immediately if the value is not animatable ([df35daf](https://github.com/ktsn/css-spring-animation/commit/df35daf34c6420844615e83f7633da9637e42450))


### Features

* set enter/leave transition classes to transitioning elements as same as Vue's transition components ([8a70820](https://github.com/ktsn/css-spring-animation/commit/8a70820229ece3214a63fc1d14a7f12c9fd53340))



# [0.13.0](https://github.com/ktsn/css-spring-animation/compare/v0.12.3...v0.13.0) (2024-10-03)


### Bug Fixes

* ensure triggering animation / update options when values passed to useSpring are mutated ([bc863ef](https://github.com/ktsn/css-spring-animation/commit/bc863ef16c7a8ef8f0736260570638f9d1212b58))


### Features

* add `disabled` prop for `<spring>` element ([fc54bac](https://github.com/ktsn/css-spring-animation/commit/fc54bac71cc3501b8050b7d767f1b467e6b07182))



## [0.12.3](https://github.com/ktsn/css-spring-animation/compare/v0.12.2...v0.12.3) (2024-06-16)


### Bug Fixes

* fix problem that an animation may not work on chrome ([45cde70](https://github.com/ktsn/css-spring-animation/commit/45cde705c7c5cef154691d631e1abf711f29bd98))
* make animation controller auto complete missing unit when animation to 0 value is stopped with `stop()` method ([#9](https://github.com/ktsn/css-spring-animation/issues/9)) ([907e381](https://github.com/ktsn/css-spring-animation/commit/907e38116cd82a5a92e32194b1b8a80293f10263))



## [0.12.2](https://github.com/ktsn/css-spring-animation/compare/v0.12.1...v0.12.2) (2024-03-08)


### Bug Fixes

* avoid triggering transition when set styles are the same with the previously set styles ([e981e72](https://github.com/ktsn/css-spring-animation/commit/e981e720d02d1939b90c4dcee054d32ed42e6f13))
* make velocity normalization expression correct ([ccaf9d6](https://github.com/ktsn/css-spring-animation/commit/ccaf9d61210e2081cb4505345d94b96d930860c1))



## [0.12.1](https://github.com/ktsn/css-spring-animation/compare/v0.12.0...v0.12.1) (2024-03-07)


### Bug Fixes

* do not trigger transition when from and to are the same and velocity is 0 ([e987e54](https://github.com/ktsn/css-spring-animation/commit/e987e54858c30c709818d567c147fe7bee4e94c0))



# [0.12.0](https://github.com/ktsn/css-spring-animation/compare/v0.11.0...v0.12.0) (2024-01-16)


### Bug Fixes

* fix wrong animation happened when it is occurred by stopping previous animation ([#8](https://github.com/ktsn/css-spring-animation/issues/8)) ([412b1b1](https://github.com/ktsn/css-spring-animation/commit/412b1b11aa239be973bcb7e9a16834b617e633ac))


### Features

* auto complete 0 value without unit in animation style ([284ecdc](https://github.com/ktsn/css-spring-animation/commit/284ecdc786cfd9acd81a77c7c577377a22d68b68))



# [0.11.0](https://github.com/ktsn/css-spring-animation/compare/v0.10.0...v0.11.0) (2023-12-29)

### Features

- fallback leaveTo to enterFrom style when it is not specified ([a680420](https://github.com/ktsn/css-spring-animation/commit/a680420c781f9b10fa3a20f8f51180b9449e5979))
- inherit previous move velocity when move transition is occurred repeatedly ([#7](https://github.com/ktsn/css-spring-animation/issues/7)) ([f2ec6cd](https://github.com/ktsn/css-spring-animation/commit/f2ec6cd75115d3c9e7372e53609c5bbd250a573d))

## 0.10.0

### New Features

- Added `onFinishCurrent` function to `useSpring` composable.

## 0.9.0

### New Features

- Added `<SpringTransitionGroup>` component.
- Added `mode` prop to `<SpringTransition>` component (as same prop as `mode` prop of `<Trasntion>`).

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
