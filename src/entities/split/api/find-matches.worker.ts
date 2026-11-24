import { findMatches, type MatchInput } from '../lib/find-matches.ts'

/*
The worker entry of Find duplicates: wiring only, the rules are in lib/find-matches.ts. It answers
one request with the matches. The DOM and worker type libraries clash in one project, so the few
worker types it needs are here.
*/
interface WorkerScope {
  addEventListener(type: 'message', listener: (event: MessageEvent<MatchInput>) => void): void
  postMessage(message: ReturnType<typeof findMatches>): void
}

const worker = globalThis as unknown as WorkerScope

worker.addEventListener('message', (event) => {
  worker.postMessage(findMatches(event.data))
})
