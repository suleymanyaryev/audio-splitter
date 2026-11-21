import { answerCoreRequest } from '@/shared/api/ffmpeg/core-request.ts'

/*
The service worker's entry: wiring only, its rules are in core-request.ts. Vite builds it to the
unhashed `sw.js` at the build's root (see vite.config.ts), so its scope is the app's folder. The
DOM and worker type libraries clash in one project, so the few worker types it needs are here.
*/
interface WorkerEvent extends Event {
  waitUntil(work: Promise<unknown>): void
}

interface FetchEvent extends Event {
  readonly request: Request
  respondWith(response: Promise<Response>): void
}

interface WorkerScope {
  addEventListener(type: 'install' | 'activate', listener: (event: WorkerEvent) => void): void
  addEventListener(type: 'fetch', listener: (event: FetchEvent) => void): void
  skipWaiting(): Promise<void>
  clients: { claim(): Promise<void> }
}

const worker = globalThis as unknown as WorkerScope

/*
A new version takes over at once, so a fixed `sw.js` replaces a bad one without waiting for every
tab to close; there is no other kill switch. The worker keeps no state, so nothing is lost.
*/
worker.addEventListener('install', (event) => {
  event.waitUntil(worker.skipWaiting())
})

// Takes control on activation, so the visit that installs it serves the core's later loads.
worker.addEventListener('activate', (event) => {
  event.waitUntil(worker.clients.claim())
})

worker.addEventListener('fetch', (event) => {
  const answer = answerCoreRequest(event.request)
  if (answer) event.respondWith(answer)
})
