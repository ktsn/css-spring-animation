import { animate } from '../../src/core'

const demo = document.getElementById('demo') as HTMLElement
let ctx: ReturnType<typeof animate> | undefined

setInterval(() => {
  ctx?.stop()
  ctx = animate(
    demo,
    [{ translate: `0px 0px` }, { translate: `300px 300px` }],
    {
      duration: 1000,
      bounce: 0,
    },
  )
}, 3000)
