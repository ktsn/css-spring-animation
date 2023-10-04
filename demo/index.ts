import { animate } from '../src/main'

const demo = document.getElementById('demo')!

setInterval(() => {
  animate(
    demo,
    ['0px', '300px'],
    (el, value) => {
      el.style.translate = `${value} ${value}`
    },
    {
      velocity: 20,
      duration: 1000,
      bounce: -0.1,
    },
  )
}, 2000)
