import { animate } from '../src/main'

const demo = document.getElementById('demo')!

setInterval(() => {
  animate(
    demo,
    {
      from: 0,
      to: 800,
      velocity: 20,
    },
    {
      duration: 10000,
      bounce: -0.7,
    },
  )
}, 1000)
