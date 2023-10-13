import { animate, s } from '../../src/core'

const demo = document.getElementById('demo')!

setInterval(() => {
  animate(
    {
      translate: [s`${0}px ${0}px`, s`${300}px ${300}px`],
    },
    (style) => {
      Object.entries(style).forEach(([k, v]) => {
        demo.style.setProperty(k, v)
      })
    },
    {
      velocity: {
        translate: [20, 20],
      },
      duration: 1000,
      bounce: -0.1,
    },
  )
}, 2000)
