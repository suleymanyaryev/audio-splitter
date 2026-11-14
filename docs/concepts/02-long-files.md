# 02 · Long files

Milestone 1 decoded the whole file in one go. That is fine for a 30 s fixture and wrong for an hour of music: the numbers do not fit in memory. This milestone reads the file a slice at a time, keeps a tiny summary of each slice, and throws the samples away.

## The words

- **Slice**: one stretch of the source file that is decoded on its own: 60 s, or 300 s for an MP3 (see "Longer MP3 slices"). One ffmpeg call per slice.
- **Wasm heap**: the one block of memory a WebAssembly program (ffmpeg.wasm) may use. The pinned `@ffmpeg/core@0.12.10` declares a heap that starts at 32 MB and may grow to **2,048 MB** (read from the memory section of its `.wasm` file; ticket 02 reads the same figures from the build script). Files do not live in the heap: ffmpeg's outputs are plain JavaScript byte arrays inside its worker, and they leave it through `readFile`, one array at a time.
- **Web Worker**: a background thread of the page. Work in it does not freeze the interface. ffmpeg.wasm already runs in its own worker, and the page talks to it by messages. Each call (`exec`) runs to the end without listening, so the only way to stop it is `terminate()`, which kills the worker and everything in it.
- **Pre-roll**: a run-in. A decoder that jumps into the middle of a file starts cold: MP3 frames borrow bytes from earlier frames (the bit reservoir), Opus has a pre-skip, and AAC shows the same effect, smaller. So the app starts decoding 1 s before the slice and drops that second: `-ss S-1 -i input -ss 1 -t 60` (`-t 300` for an MP3). The first slice starts at 0 and has nothing before it.
- **Leftover**: a **bucket** (10 ms of samples, from note 01) is a whole number of samples. When a slice ends in the middle of a bucket, the samples already seen are carried into the next slice's first bucket instead of being cut short.
- **Reload budget**: how many calls one ffmpeg worker may serve before the app replaces it with a fresh one. The app uses about 20.
- **Nyquist limit and aliasing**: a sample rate can only describe pitches up to half of itself (22,050 Hz for 44,100 Hz). If samples are simply dropped to lower the rate, higher pitches do not vanish: they come back as false lower ones. That error is **aliasing**; a **low-pass filter** removes the high pitches first so there is nothing left to alias.

## Worked example: `samples/sample1.m4a`

**1. The memory math.** One hour of stereo at 44.1 kHz is 3,600 × 44,100 × 2 channels × 4 bytes = 1,270,080,000 bytes (1.27 GB). `sample1` is 3,686.21 s: 1.30 GB. Three hours is 3.81 GB, against an 89 MB file (ticket 04 has the same table for 2 h). The wasm heap caps at 2 GB, and in the browser ffmpeg peaked at 2.0 to 2.8 times the size of the output (ticket 06, one whole-file decode on a 24 GB Mac).

**2. Watching it fail.** Milestone 1's code on this machine (Chrome, `pnpm dev`, file given to the file input; `ffmpeg` core 0.12.10), one decode call for the whole file:

| File (sample1 stitched with native ffmpeg, `-c copy`) | PCM size | Result                         |
| ----------------------------------------------------- | -------- | ------------------------------ |
| `sample1.m4a`, 1:01:26                                | 1.30 GB  | loads, review page after 4.4 s |
| 1:40:00                                               | 2.12 GB  | loads, after 7.0 s             |
| 1:45:00                                               | 2.22 GB  | fails after 17.4 s             |
| 2:02:52 (sample1 twice)                               | 2.60 GB  | fails after 17.7 s             |
| 3:04:18 (sample1 three times)                         | 3.90 GB  | fails after 23.5 s             |

So the real `sample1` does not fail here: an hour fits on a 24 GB machine, as ticket 06 also found. What fails is anything over about 2 GiB (2,147,483,648 bytes, which is 1:41:27 of this audio). The load page then shows, word for word:

> sample2h.m4a could not be loaded at the decode step.
> ffmpeg said: ffmpeg did not finish reading /decoded.pcm within 10 s
> Choose another file

That message points at the wrong cause. ffmpeg decoded the whole file (about 7 s) and then could not hand the result over: the console holds the real error, `Failed to execute 'postMessage' on 'DedicatedWorkerGlobalScope': The ArrayBuffer/ArrayBufferView size exceeds the supported range`. The worker never answered, so the 10 s watchdog fired. Total time to failure is roughly the decode plus those 10 s. A computer with less memory would probably run out earlier, at the peak memory above, not at 2 GiB (inferred; not tried).

**3. Decoding in slices.** Slices are 60 s, or 300 s for an MP3 (see "Longer MP3 slices"); the rest of this section counts 60 s slices. 3,686.21 / 60 = 61.4, so **62 slices** (13 for the same file as MP3): the "38 / 62 slices" of the progress bar (the probe is not counted, so there are 63 calls). Each full slice is 60 × 44,100 = 2,646,000 frames × 2 × 4 = **21,168,000 bytes** (21 MB), and native ffmpeg gives exactly that for the first slice and for the slices at 60 s and 1,800 s, in `.m4a` and `.mp3`; `.opus` (always 48 kHz) gives 2,880,000 frames, 23,040,000 bytes. The last slice holds what is left: 1,156,048 frames (26.21 s). All 62 add up to 162,562,048 frames, the count of a one-pass decode (tickets 06 and 12). In the browser a 60 s slice peaked at +360 MB; 300 s slices peaked at +769 MB (ticket 06). Memory depends on the slice, not on the file.

**4. Why the 1 s pre-roll.** Cut the slice 1,800 to 1,860 s with and without it, and compare with the same stretch of a one-pass decode (native ffmpeg 8.1; loudness per 50 ms window):

| Format  | No pre-roll: worst 50 ms window   | With pre-roll                                        |
| ------- | --------------------------------- | ---------------------------------------------------- |
| `.mp3`  | the first window is 11.98 dB off  | every window equal within 0.01 dB; samples identical |
| `.opus` | 1.66 dB off, three windows differ | same; samples identical                              |
| `.m4a`  | 0.23 dB off                       | same; largest sample difference −63.8 dBFS           |

Ticket 12 measured the same effect in ffmpeg.wasm 5.1.4: the cold start spoils the first 50 to 80 ms of an MP3 slice (up to 16.6 dB) and more than 250 ms of Opus (up to 9.4 dB), which once shortened a −35 dB gap by 0.8 s. With the pre-roll every border was exact. It costs about 1/60 more decoding (ticket 19). Without it, the loudness curve of milestone 3 would show false dips every 60 s.

**5. Carrying leftovers.** At 44,100 Hz a bucket is 441 samples and a slice is 2,646,000, exactly 6,000 buckets: nothing is left over. At 48,000 Hz it is 480 and 2,880,000, also 6,000. At 22,050 Hz a bucket is `Math.round(220.5)` = 221 samples (JavaScript rounds .5 up) and a slice is 1,323,000 samples: 5,986 whole buckets and **94 samples left** (1,323,000 − 5,986 × 221). Native ffmpeg confirms the slice length at that rate, 1,323,000 frames (checked with `-ar 22050`, which only makes a file of that rate; the app never resamples). If each slice closed its own short bucket of 94 samples, every slice would add 127 samples of drift, and by the last border (61 of them) the time axis would be 7,747 samples, 0.35 s, off. So the builder keeps the 94 samples and finishes that bucket with the first 127 samples of the next slice. Only the very last bucket of the file may stay short.

**6. Keep summaries, drop samples.** One bucket of 441 stereo frames is 3,528 bytes and its peak is 8 bytes: 441 times smaller. The peaks for `sample1` are 368,622 × 2 × 4 = 2.95 MB; for 1 h 2.88 MB, for 3 h **8.64 MB**, against 1.27 GB and 3.81 GB of samples. The loudness curve of milestone 3 adds about 0.9 MB for 3 h (ticket 07). After each slice is analysed its file is deleted inside ffmpeg and its array is dropped, so memory never holds more than one slice and the summaries.

**7. ffmpeg's own worker, and none of ours.** ffmpeg.wasm already moves the decoding off the page, and hands each slice over without a copy. Our analysis of one slice (downmix, peaks) took about 8 ms, 0.5 s per hour (tickets 06 and 07), too little to freeze anything. A second worker of ours would hold ffmpeg's worker inside it, untested under Vite, for no gain (ticket 07). Cancel is `terminate()` on ffmpeg's worker (ticket 15).

**8. The reload budget.** ffmpeg ends each call by throwing, and nothing resets its call stack, which is only 64 KB in this core (ticket 02, with a pull request as the source). Each call uses a little up. Measured: a fresh worker failed with `memory access out of bounds` on the 159th decode call and on the 161st cut call (ticket 06); `exec(['-version'])` failed on the 75th call, and ffprobe stopped answering on the 32nd, without an error (ticket 02). After that every call on that worker fails. The fix is in ffmpeg.wasm's main branch, but not in 0.12.10. So the app replaces the worker every 20 calls, an 8 times margin under 159, with a watchdog on every call. A reload (`terminate()`, `load()`, mount again) took 55 to 77 ms and memory stayed flat over 120 of them (ticket 06). One hour is 64 calls and 3 reloads (ticket 12); `sample1` stitched three times would be 1 probe plus 185 slices, 186 calls, so about 9 reloads (arithmetic).

**9. Sample rate: why the app does not downsample.** Nothing here needs a lower rate: each slice is already in memory at full rate, the peaks come straight from it, and it is then thrown away. A lower rate would only be a smaller copy of samples that nobody keeps. It would have been safe for loudness: ticket 04 measured the 44.1 kHz curve of this file against lower rates, and at 8 kHz it differs by 0.01 dB on average (0.03 dB in 99 % of windows), at 2 kHz by 0.04 dB (0.30 dB), and only at 1 kHz does it break (0.40 dB, 4.36 dB; different gaps). Dropping every 5th sample with no filter aliases badly, yet changed the loudness by 0.00 dB: aliasing moves energy to a wrong pitch but does not remove it, and loudness only counts energy.

## Decode times

Measured on 2026-11-14 on the real files (`samples/sample1.*`, and `samples/sample3h.*` made by stitching `sample1` three times). Same machine for every cell: an Apple M4 Pro with 24 GB, Chrome, `pnpm dev`, one run per cell. The time runs from giving the file to the file input until the review page appears, so it includes loading ffmpeg and the probe.

| Format  | 1 h (`sample1`) | 3 h (`sample3h`) |
| ------- | --------------- | ---------------- |
| `.m4a`  | 5.9 s           | 19.2 s           |
| `.mp3`  | 18.3 s          | 130.8 s (2:11)   |
| `.opus` | 8.8 s           | 25.7 s           |

For comparison, ticket 12 measured 1 h in ffmpeg.wasm on a busy machine: `.m4a` 12.0 to 12.3 s, VBR `.mp3` 17.1 s, `.opus` 8.8 to 9.1 s. An MP3 slice gets slower with its position (ffmpeg reads from the start to seek), so a 3 h MP3 is inferred at about 100 s.

`.m4a` and `.opus` take about three times as long for three times the audio (m4a: 0.1 s per slice, steadily). The MP3 grows with position: its first 20 slices took 0.16 s each, slices 80 to 100 took 0.71 s each and the last 20 took 1.23 s each, so 3 h costs 7 times the hour, not 3 times, and came out above the inferred 100 s. Every file loaded, and the progress bar counted up to 62 (1 h) and 185 (3 h) slices. The 3 h run reloaded the ffmpeg worker 9 times without a failure. The page's JavaScript heap ended between 94 and 118 MB for the 1 h files and between 99 and 163 MB for the 3 h files (`performance.memory`, which does not see ffmpeg's own worker), with no growth from one hour to three.

### Longer MP3 slices

An MP3 is decoded in 300 s slices; `.m4a` and `.opus` stay at 60 s. ffmpeg seeks an MP3 by reading from the start, so a late slice costs about 1.4 s whatever its length, and fewer slices mean fewer seeks. The other two seek almost for free, so longer slices would only cost memory. No size cap is needed: an MP3 cannot exceed 48 kHz stereo, so a 300 s slice is at most 115 MB of floats.

Measured on 2026-11-14 on the same machine as above (Apple M4 Pro, 24 GB, Chrome), one run per cell. Peak is Chrome's summed RSS over idle.

| File        | 60 s slices        | 300 s slices      |
| ----------- | ------------------ | ----------------- |
| 3 h MP3     | 133.1 s, +1,142 MB | 39.0 s, +931 MB   |
| 1 h MP3     | 18.1 s, +468 MB    | 9.0 s, +628 MB    |
| 3 h `.m4a`  | 17.6 s, +507 MB    | 16.1 s, +1,084 MB |
| 3 h `.opus` | 25.8 s, +550 MB    | 25.0 s, +890 MB   |

The 3 h MP3 took 75.7 s (+962 MB) at 120 s slices and 53.6 s (+944 MB) at 180 s. With 300 s slices the 1 h and 3 h MP3 decode times above become **9.0 s and 39.0 s**; the progress bar counts to 13 (1 h) and 37 (3 h) slices.

## Where it lives in the code

- [`src/shared/api/ffmpeg/ffmpeg.ts`](../../src/shared/api/ffmpeg/ffmpeg.ts): loads the core, mounts the file, a watchdog on every call. A fresh worker every 20 calls; cancel is `close()` on the session, which terminates the current worker.
- [`src/entities/source-file/api/decode-slice.ts`](../../src/entities/source-file/api/decode-slice.ts): one `f32le` call for one slice, `-ss S-1 -i input -ss 1 -t 60` (`-t 300` for an MP3), the first slice without pre-roll.
- `decode-whole-file.ts`: milestone 1's single call, the one that fails above. Removed; the slice call replaced it.
- [`src/shared/lib/audio/peaks-builder.ts`](../../src/shared/lib/audio/peaks-builder.ts): a peaks builder that is fed slice after slice and carries the leftover samples of a bucket across each border.
- [`src/entities/source-file/model/source-file.ts`](../../src/entities/source-file/model/source-file.ts): the slice loop, progress counted per slice, each slice file deleted after analysis, the failure with its step.
- [`src/pages/load/ui/LoadPage.vue`](../../src/pages/load/ui/LoadPage.vue): the progress bar ("38 / 62 slices"), Cancel, and the one failure message with "Choose another file".
