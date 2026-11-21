import { createApp } from 'vue'
import { createPinia } from 'pinia'

import { preloadCoreWhenIdle } from '@/shared/api/ffmpeg/core-preloader.ts'
import App from './App.vue'
import './styles/main.css'

const app = createApp(App)

app.use(createPinia())

app.mount('#app')

// After mounting, so the page draws first; runs in dev as in production.
preloadCoreWhenIdle()
