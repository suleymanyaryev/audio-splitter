/*
A radix-2 fast Fourier transform (concept note 14). It gives the same answer as the plain DFT,
which compares a frame with a cosine and a sine of every step, but it reuses the work those
comparisons share: the transform of N samples is the transforms of its even and its odd samples,
joined with one multiply per step. Halving down to pairs takes log2(N) passes over the frame, so
2048 samples cost 11 × 1024 butterflies instead of 2048 × 2048 multiply-adds.

`createFft(size)` works out the cosines, the sines and the reordering once, and returns a
function that transforms `re` and `im` (each `size` long) in place.
*/
export function createFft(size: number) {
  if (size < 1 || !Number.isSafeInteger(Math.log2(size))) {
    throw new RangeError(`An FFT needs a power of two, not ${size}`)
  }
  const half = size / 2
  /*
  The twiddles: e^(-2πik/size) for the first half of the steps. Working them out inside the loop
  made the FFT six times slower (concept note 14).
  */
  const cos = new Float64Array(half)
  const sin = new Float64Array(half)
  for (let k = 0; k < half; k++) {
    cos[k] = Math.cos((-2 * Math.PI * k) / size)
    sin[k] = Math.sin((-2 * Math.PI * k) / size)
  }

  /*
  Halving again and again sorts the samples by their index read backwards in binary (in 8
  samples, index 1 = 001 goes to 100 = 4), so the samples are put in that order first and the
  passes then join neighbours.
  */
  const bits = Math.log2(size)
  const reversed = new Uint32Array(size)
  for (let index = 0; index < size; index++) {
    let backwards = 0
    for (let bit = 0; bit < bits; bit++) backwards |= ((index >> bit) & 1) << (bits - 1 - bit)
    reversed[index] = backwards
  }

  return (re: Float64Array, im: Float64Array): void => {
    for (let index = 0; index < size; index++) {
      const other = reversed[index] ?? index
      if (index >= other) continue
      const realPart = re[index] ?? 0
      re[index] = re[other] ?? 0
      re[other] = realPart
      const imaginaryPart = im[index] ?? 0
      im[index] = im[other] ?? 0
      im[other] = imaginaryPart
    }

    // Each pass joins pairs of transforms of `length / 2` samples into transforms of `length`.
    for (let length = 2; length <= size; length *= 2) {
      const halfLength = length / 2
      const stride = size / length
      for (let start = 0; start < size; start += length) {
        for (let k = 0; k < halfLength; k++) {
          const c = cos[k * stride] ?? 0
          const s = sin[k * stride] ?? 0
          const even = start + k
          const odd = even + halfLength
          const evenRe = re[even] ?? 0
          const evenIm = im[even] ?? 0
          const oddRe = re[odd] ?? 0
          const oddIm = im[odd] ?? 0
          // The odd half's step k, turned by the twiddle; the butterfly adds and subtracts it.
          const turnedRe = oddRe * c - oddIm * s
          const turnedIm = oddRe * s + oddIm * c
          re[odd] = evenRe - turnedRe
          im[odd] = evenIm - turnedIm
          re[even] = evenRe + turnedRe
          im[even] = evenIm + turnedIm
        }
      }
    }
  }
}
