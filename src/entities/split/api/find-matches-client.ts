import type { FoundMatch, MatchInput } from '../lib/find-matches.ts'

/*
Runs the finding function in a Web Worker, so the page stays responsive while it works: starts the
worker, sends the one request, resolves with the answer and terminates the worker. The curve is
copied to the worker, not handed over, since the source-file store still owns it. `signal` stops
the worker early, when the answer is no longer wanted, and rejects. It is the one module a store
spec replaces, with a fake that runs the same function in-process.
*/
export function findMatchesInWorker(
  request: MatchInput,
  signal: AbortSignal,
): Promise<FoundMatch[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('find-matches.worker.ts', import.meta.url), {
      type: 'module',
    })
    function fail(reason: Error) {
      worker.terminate()
      reject(reason)
    }
    signal.addEventListener('abort', () => {
      fail(new Error('The search was stopped'))
    })
    worker.addEventListener('message', (event: MessageEvent<FoundMatch[]>) => {
      worker.terminate()
      resolve(event.data)
    })
    worker.addEventListener('messageerror', () => {
      fail(new Error("The worker's answer could not be read"))
    })
    worker.addEventListener('error', (event) => {
      fail(new Error(event.message))
    })
    worker.postMessage(request)
  })
}
