import { animate } from '../../src/main'

const demo = document.getElementById('demo')!

setInterval(() => {
  animate(
    [0, 300],
    (value, styles) => {
      demo.style.translate = `${value} ${value}`
      Object.entries(styles).forEach(([k, v]) => {
        if (k.startsWith('--')) {
          demo.style.setProperty(k, v)
        } else {
          demo.style[k as any] = v as any
        }
      })
    },
    {
      velocity: 20,
      duration: 1000,
      bounce: -0.1,
    },
  )
}, 2000)
