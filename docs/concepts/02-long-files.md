# 02 · Long files

Decoding a whole file in one go is fine for a 30 s test file and wrong for an hour of music: the numbers do not fit in memory. So the app reads the file a slice at a time, keeps a tiny summary of each slice, and throws the samples away.

## The words

- **Slice**: one stretch of the source file that is decoded on its own: 60 s, or 300 s for an MP3. One ffmpeg call per slice.
- **Wasm heap**: the one block of memory a WebAssembly program (ffmpeg.wasm) may use. In `@ffmpeg/core@0.12.10` it may grow to **2,048 MB**.
- **Web Worker**: a background thread of the page, so work in it does not freeze the interface. ffmpeg.wasm runs in its own worker, and the page talks to it by messages. A call (`exec`) runs to the end without listening, so the only way to stop it is `terminate()`, which kills the worker.
- **Pre-roll**: a run-in. A decoder that jumps into the middle of a file starts cold: MP3 frames borrow bytes from earlier frames (the bit reservoir), Opus has a pre-skip, and AAC shows the same effect, smaller. So the app starts decoding 1 s before the slice and drops that second: `-ss S-1 -i input -ss 1 -t 60` (`-t 300` for an MP3). The first slice starts at 0 and has nothing before it.
- **Leftover**: a **bucket** (10 ms of samples, [note 01](01-sound-is-numbers.md)) is a whole number of samples. When a slice ends in the middle of a bucket, the samples already seen are carried into the next slice's first bucket instead of being cut short.
- **Reload budget**: how many calls one ffmpeg worker may serve before the app replaces it with a fresh one: 20.
- **Nyquist limit and aliasing**: a sample rate can only describe pitches up to half of itself (22,050 Hz for 44,100 Hz). If samples are simply dropped to lower the rate, higher pitches do not vanish: they come back as false lower ones. That error is **aliasing**; a **low-pass filter** removes the high pitches first so there is nothing left to alias.

## Worked example: `samples/sample1.m4a`

**1. The memory math.** One hour of stereo at 44.1 kHz is 3,600 × 44,100 × 2 channels × 4 bytes = 1,270,080,000 bytes (1.27 GB). `sample1` is 3,686.21 s: 1.30 GB. Three hours is 3.81 GB, against an 89 MB file. In Chrome one whole-file decode of `sample1` still loads, but anything over 2 GiB (1:41:27 of this audio) fails: ffmpeg decodes it, then cannot hand the array over (`The ArrayBuffer/ArrayBufferView size exceeds the supported range`).

**2. Decoding in slices.** 3,686.21 / 60 = 61.4, so **62 slices** of 60 s (13 for the same file as MP3). Each full slice is 60 × 44,100 = 2,646,000 frames × 2 × 4 = **21,168,000 bytes** (21 MB); `.opus`, always 48 kHz, gives 23,040,000 bytes. The last slice holds what is left: 1,156,048 frames (26.21 s). All 62 add up to 162,562,048 frames, the count of a one-pass decode. Memory depends on the slice, not on the file.

**3. Why the 1 s pre-roll.** Cut the slice 1,800 to 1,860 s without it and compare its loudness, per 50 ms window, with the same stretch of a one-pass decode: the `.mp3` slice's first window is **11.98 dB** off, the `.opus` 1.66 dB, the `.m4a` 0.23 dB. With the pre-roll every window agrees within 0.01 dB, and the `.mp3` and `.opus` samples are identical. Without it a loudness curve would show a false dip every 60 s. It costs about 1/60 more decoding.

**4. Carrying leftovers.** At 44,100 Hz a bucket is 441 samples and a slice is 2,646,000, exactly 6,000 buckets: nothing is left over. At 22,050 Hz a bucket is `Math.round(220.5)` = 221 samples (JavaScript rounds .5 up) and a slice is 1,323,000 samples: 5,986 whole buckets and **94 samples left** (1,323,000 − 5,986 × 221). If each slice closed its own short bucket of 94 samples, every slice would add 127 samples of drift, and by the last of 61 borders the time axis would be 7,747 samples, **0.35 s**, off. So the builder keeps the 94 samples and finishes that bucket with the first 127 samples of the next slice. Only the very last bucket of the file may stay short.

**5. Keep summaries, drop samples.** One bucket of 441 stereo frames is 3,528 bytes and its peak is 8 bytes: 441 times smaller. The peaks for 3 h are **8.64 MB**, against 3.81 GB of samples. After each slice is analysed its file is deleted inside ffmpeg and its array is dropped, so memory never holds more than one slice and the summaries.

**6. The reload budget.** ffmpeg ends each call by throwing, and nothing resets its call stack, which is only 64 KB in this core. Each call uses a little up, and after enough calls every call on that worker fails: measured failures came between the 75th and the 159th call. So the app replaces the worker every 20 calls, with a watchdog on every call. A reload (`terminate()`, `load()`, mount again) takes under 100 ms. One hour is 63 calls (the probe and 62 slices), so 3 reloads.

**7. Why the app does not downsample.** A lower rate would only be a smaller copy of samples nobody keeps, and it would not even change the loudness: dropping every 5th sample with no filter aliases badly, yet moved this file's loudness by 0.00 dB, because aliasing moves energy to a wrong pitch and loudness only counts energy.

**Longer MP3 slices.** ffmpeg seeks an MP3 by reading from the start, so a late slice costs about 1.4 s whatever its length, and fewer, longer slices mean fewer seeks: 300 s slices decoded the 3 h MP3 in 39.0 s where 60 s slices took 133.1 s.

## Where it lives in the code

- [`src/shared/api/ffmpeg/ffmpeg.ts`](../../src/shared/api/ffmpeg/ffmpeg.ts): the watchdog on every call and a fresh worker every 20 calls.
- [`src/entities/source-file/api/decode-slice.ts`](../../src/entities/source-file/api/decode-slice.ts): one `f32le` call for one slice, with its pre-roll.
- [`src/shared/lib/audio/peaks-builder.ts`](../../src/shared/lib/audio/peaks-builder.ts): fed slice after slice, carrying the leftover of a bucket across each border.
- [`src/entities/source-file/model/source-file.ts`](../../src/entities/source-file/model/source-file.ts): the slice loop, each slice dropped after analysis.
