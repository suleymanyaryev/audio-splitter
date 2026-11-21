import { createApp } from 'vue'
import { createPinia } from 'pinia'

import { preloadCoreWhenIdle } from '@/shared/api/ffmpeg/core-preloader.ts'
import { startTheme } from '@/shared/lib/theme/theme.ts'
import App from './App.vue'
import { registerCoreWorker } from './register-core-worker.ts'
import './styles/main.css'

// Before the app is created: the inline script in index.html has themed the page, this keeps it so.
startTheme()

const app = createApp(App)

app.use(createPinia())

app.mount('#app')

/*
After mounting, so the page draws first. The download runs in dev as in production; the service
worker is registered in production builds only.
*/
preloadCoreWhenIdle()
void registerCoreWorker()
