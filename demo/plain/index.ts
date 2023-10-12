import { animate, unit } from '../../src/core'

const demo = document.getElementById('demo')!

setInterval(() => {
  animate(
    [0, 300],
    (value, styles) => {
      demo.style.translate = `${unit(value, 'px')} ${unit(value, 'px')}`
      Object.entries(styles).forEach(([k, v]) => {
        demo.style.setProperty(k, v)
      })
    },
    {
      velocity: 20,
      duration: 1000,
      bounce: -0.1,
    },
  )
}, 2000)
