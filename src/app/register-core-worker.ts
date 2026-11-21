/*
Registers the service worker that answers the ffmpeg core's files from Cache Storage (see
sw.worker.ts). Production builds only: the dev server's core URLs carry no hash, so a copy kept
there could go stale after a dependency bump. A browser that cannot register it, or refuses,
loads the core from the network as before.
*/
export async function registerCoreWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  try {
    await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
  } catch {
    // Nothing else depends on it.
  }
}
