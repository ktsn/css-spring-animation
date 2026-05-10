import { animate } from '../../src/core'

const demo = document.getElementById('demo')!
let ctx: ReturnType<typeof animate> | undefined

setInterval(() => {
  animate(
    (style) => {
      Object.entries(style).forEach(([k, v]) => {
        demo.style.setProperty(k, v)
      })
    },
    [{ translate: `0px 0px` }, { translate: `300px 300px` }],
    {
      duration: 1000,
      bounce: 0,
    },
  )
}, 3000)
