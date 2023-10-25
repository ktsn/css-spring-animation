import { animate } from '../../src/core'

const demo = document.getElementById('demo')!
let ctx: ReturnType<typeof animate> | undefined

setInterval(() => {
  animate(
    {
      translate: [`0px 0px`, `300px 300px`],
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
      bounce: 0,
    },
  )
}, 3000)
