import { findMatches, type FoundMatch, type MatchInput } from '../../lib/find-matches.ts'

/*
The worker client is the one thing a spec replaces, with this module: the fake answers with the
real finding function, in this process. `held` keeps the answers back until a spec lets them go, so
a press can be overtaken. `failure` makes the search fail with that reason, and `signal` is the
last press's stop signal.
*/
export const client = {
  isHolding: false,
  held: [] as (() => void)[],
  failure: null as string | null,
  signal: null as AbortSignal | null,
}

// Puts the client back as a spec starts: answering at once, with nothing held and no failure.
export function resetClient() {
  client.isHolding = false
  client.held = []
  client.failure = null
  client.signal = null
}

// Lets every held answer go, in the order the presses went out.
export function answerHeld() {
  for (const answer of client.held) answer()
}

export function findMatchesInWorker(request: MatchInput, signal: AbortSignal) {
  return new Promise<FoundMatch[]>((resolve, reject) => {
    client.signal = signal
    // As a real worker gets it: a structured copy, which refuses what cannot be cloned.
    const copy = structuredClone(request)
    const answer = () => {
      if (client.failure === null) resolve(findMatches(copy))
      else reject(new Error(client.failure))
    }
    if (client.isHolding) client.held.push(answer)
    else answer()
  })
}
