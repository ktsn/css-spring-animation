import { createApp } from 'vue'
import App from './App.vue'
import plugin from '../../src/vue'

createApp(App).use(plugin).mount('#app')
