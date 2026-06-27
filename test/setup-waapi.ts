// jsdom does not implement the Web Animations API. We only need
// `Element.animate` to return an object with a no-op `cancel()` because the
// library never reads anything else off the returned `Animation`.
const noop = () => {}

const stubAnimate: Element['animate'] = function () {
  const animation: Partial<Animation> = {
    cancel: noop,
    finish: noop,
    play: noop,
    pause: noop,
    reverse: noop,
    commitStyles: noop,
    persist: noop,
    updatePlaybackRate: noop,
    addEventListener: noop,
    removeEventListener: noop,
    dispatchEvent: () => true,
    finished: Promise.resolve() as unknown as Animation['finished'],
    ready: Promise.resolve() as unknown as Animation['ready'],
  }
  return animation as Animation
}

if (!Element.prototype.animate) {
  Element.prototype.animate = stubAnimate
}
