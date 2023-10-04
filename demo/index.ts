import { animate } from '../src/main'

const demo = document.getElementById('demo')!

setInterval(() => {
  animate(
    demo,
    {
      from: 0,
      to: 200,
      velocity: 20,
    },
    {
      duration: 2000,
    },
  )
}, 1000)
