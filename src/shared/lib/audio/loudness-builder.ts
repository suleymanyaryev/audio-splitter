// 50 ms holds several cycles of a low bass note (40 Hz is 25 ms per cycle) and still places a gap
// to a twentieth of a second.
const WINDOW_SECONDS = 0.05
// Digital silence has an RMS of 0 and `Math.log10(0)` is -Infinity, which cannot be drawn or
// compared, so every RMS under 1e-5 (-100 dB) is stored as -100 dB.
const FLOOR_DB = -100
const FLOOR_RMS = 1e-5

// A window is a whole number of samples: 2205 at 44.1 kHz, 2400 at 48 kHz, 1103 at 22.05 kHz.
function windowSizeAt(sampleRate: number): number {
  return Math.round(sampleRate * WINDOW_SECONDS)
}

/*
How long one window lasts, from its sample count: exactly 0.05 at 44.1 and 48 kHz, 1103 / 22050
at 22.05 kHz. Window times are this times the window's index, never a rounded 0.05.
*/
export function loudnessWindowSeconds(sampleRate: number): number {
  return windowSizeAt(sampleRate) / sampleRate
}

/*
Builds the loudness curve of a mono signal: one value in dB per 50 ms window, [dB0, dB1, …]. A window
is a whole number of samples (2205 at 44.1 kHz, 2400 at 48 kHz, 1103 at 22.05 kHz), windows follow
each other with no overlap, and its dB is 20 * log10 of the RMS of its samples.

The signal arrives slice by slice with `push`, and a slice can end in the middle of a window. That
open window is the leftover: the builder keeps its running sum of squares and sample count, and the
next `push` carries on from there. Only the last window of the file may be shorter than the rest.
*/
export function createLoudnessBuilder(sampleRate: number) {
  const windowSize = windowSizeAt(sampleRate)
  // One array of closed windows per push, joined once in `finish`.
  const chunks: Float32Array[] = []
  let length = 0

  // The open window. A JS number is a float64, so a long sum of squares does not lose small samples.
  let sumOfSquares = 0
  let count = 0

  function decibelsOfOpenWindow(): number {
    const rms = Math.sqrt(sumOfSquares / count)
    return rms < FLOOR_RMS ? FLOOR_DB : 20 * Math.log10(rms)
  }

  return {
    push(mono: Float32Array): void {
      const closing = Math.floor((count + mono.length) / windowSize)
      const chunk = new Float32Array(closing)
      let closed = 0

      for (const sample of mono) {
        sumOfSquares += sample * sample
        count++
        if (count < windowSize) continue

        chunk[closed] = decibelsOfOpenWindow()
        closed++
        sumOfSquares = 0
        count = 0
      }
      chunks.push(chunk)
      length += chunk.length
    },

    // Closes the last, shorter window if it has samples, and returns every window's dB.
    finish(): Float32Array {
      if (count > 0) {
        chunks.push(Float32Array.of(decibelsOfOpenWindow()))
        length += 1
        sumOfSquares = 0
        count = 0
      }

      const curve = new Float32Array(length)
      let offset = 0
      for (const chunk of chunks) {
        curve.set(chunk, offset)
        offset += chunk.length
      }
      return curve
    },
  }
}
