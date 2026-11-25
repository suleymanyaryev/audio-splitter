export interface Correlation {
  // Pearson's r over the best overlap, −1 to 1.
  r: number
  /*
  Where the stretch's first window sits in the other one, in windows: negative when it hangs over
  the start.
  */
  offset: number
  // How many windows meet at that offset.
  overlap: number
}

// A stretch whose squared deviations from its mean add up to less than this has no shape (dB²).
const FLAT_VARIANCE = 1e-6

/*
Running totals of a stretch: `sum[i]` and `squares[i]` add up its first `i` values, so the total of
any run of windows is one subtraction (`totalBetween`) and not a pass over them.
*/
function runningTotals(values: Float32Array) {
  const sum = new Float64Array(values.length + 1)
  const squares = new Float64Array(values.length + 1)
  for (const [index, value] of values.entries()) {
    sum[index + 1] = (sum[index] ?? 0) + value
    squares[index + 1] = (squares[index] ?? 0) + value * value
  }
  return { sum, squares }
}

function totalBetween(totals: Float64Array, from: number, to: number) {
  return (totals[to] ?? 0) - (totals[from] ?? 0)
}

/*
Slides `stretch` along `along`, one window at a time, and scores how well the two agree at each
offset (docs/concepts/11-finding-repeats.md). The score is Pearson's r over the windows that meet:

  r = Σ (a − mean a)(b − mean b) / √( Σ (a − mean a)² · Σ (b − mean b)² )

Written with sums, so nothing is stored per offset: with n windows meeting,
Σ (a − mean a)(b − mean b) = Σab − Σa·Σb / n, and the two spreads are Σa² − (Σa)² / n and likewise
for b. Σa, Σb, Σa² and Σb² come from running totals, so each offset costs one pass over its overlap,
for Σab, the only sum that needs both stretches at once.

At offset 0 the first windows meet. A negative offset lets `stretch` hang over the start of `along`,
and a late one over its end, so two tracks whose ends overlap are scored too. An offset whose
overlap is under `minimumOverlap` is never scored (a handful of windows agrees by chance), and
neither is one where either side is flat, since r would divide by zero.

Returns the best r with its offset and overlap, or null when no offset could be scored. A tie goes
to the earliest offset, so the answer is the same on every run.
*/
export function slidingCorrelation(
  stretch: Float32Array,
  along: Float32Array,
  minimumOverlap: number,
): Correlation | null {
  const stretchTotals = runningTotals(stretch)
  const alongTotals = runningTotals(along)
  let best: Correlation | null = null

  // From the offset where only `minimumOverlap` windows of `stretch` meet the start of `along`,
  // to the one where only that many meet its end.
  const first = minimumOverlap - stretch.length
  const last = along.length - minimumOverlap
  for (let offset = first; offset <= last; offset++) {
    // The windows that meet: stretch[from, to) against along[from + offset, to + offset).
    const from = Math.max(0, -offset)
    const to = Math.min(stretch.length, along.length - offset)
    const overlap = to - from
    if (overlap < minimumOverlap) continue

    const sumA = totalBetween(stretchTotals.sum, from, to)
    const sumB = totalBetween(alongTotals.sum, from + offset, to + offset)
    const spreadA = totalBetween(stretchTotals.squares, from, to) - (sumA * sumA) / overlap
    const spreadB =
      totalBetween(alongTotals.squares, from + offset, to + offset) - (sumB * sumB) / overlap
    if (spreadA < FLAT_VARIANCE || spreadB < FLAT_VARIANCE) continue

    let sumAB = 0
    for (let index = from; index < to; index++) {
      sumAB += (stretch[index] ?? 0) * (along[index + offset] ?? 0)
    }

    const r = (sumAB - (sumA * sumB) / overlap) / Math.sqrt(spreadA * spreadB)
    // Rounding can leave a perfect match a hair over 1.
    const clamped = Math.min(1, Math.max(-1, r))
    if (best === null || clamped > best.r) best = { r: clamped, offset, overlap }
  }

  return best
}
