# 14 · The spectrum

The waveform and the loudness curve both say how loud the file is. Neither says what it sounds like: a bass line, a voice and a cymbal can be equally loud. This milestone splits each short moment of the file into the tones it is made of and draws how strong each one is. A crossfade that keeps the level up still changes the tones, and that change becomes visible.

## The words

- **Tone**: a sine wave of one frequency, in hertz (Hz), cycles per second. 1 kHz is a thousand cycles per second.
- **A sound is a sum of tones**: any short stretch of samples can be rebuilt exactly by adding sine waves of the right frequencies, each with its own strength and starting point. This is not an approximation; the sum gives the samples back to float rounding.
- **Spectrum**: how strong each tone is in one short moment of the file (GLOSSARY.md).
- **Spectrogram**: the file's spectrum over time, one spectrum per 50 ms side by side: time across, frequency up, strength as shade (GLOSSARY.md).
- **Frame**: the samples one spectrum is made from. The app uses **2048** samples of the mono downmix (note 01), centred on the middle of a loudness window (note 03).
- **Step**: the gap between two tones the spectrum can tell apart, the sample rate divided by the frame size. At 44.1 kHz that is 44,100 / 2048 = **21.5 Hz**, so the frame holds 1,025 steps from 0 Hz to 22.05 kHz.
- **Half the sample rate** (the Nyquist frequency): the highest tone a sample rate can hold, 22.05 kHz at 44.1 kHz. It takes at least two samples to make one cycle.

## A sound is a sum of tones

A pure tone of 1 kHz is one sine wave. Its spectrum is one spike at 1 kHz and nothing elsewhere. A note on a piano is a spike at its pitch and smaller spikes at two, three and four times it; those are what make it a piano and not a flute. A cymbal is a haze from a few kHz up, with no spikes at all. Music is all of them at once, changing every moment.

One spectrum answers "which tones, and how strong, in these 46 ms?". The spectrogram asks it again every 50 ms and lays the answers side by side. A held bass note is a horizontal line low down; a drum hit is a short vertical smear; silence is blank.

## The plain DFT: one comparison per tone

The **discrete Fourier transform** (DFT) finds the strength of each step by comparing the frame with a tone of that frequency. For step k, it multiplies every sample by a cosine of k cycles across the frame and adds the products, then does the same with a sine. If the frame holds that tone, the products line up and the sum is large. If it doesn't, they cancel out and the sum is near 0. The cosine and the sine together catch the tone at any starting point, and the length of the two sums, √(re² + im²), is its strength.

That is 2048 multiply-adds per step and 1,025 steps: **2.1 million** per spectrum. Measured on 2026-11-26 on a real frame of `sample1.m4a` (20:10, Hann-windowed), with the cosines and sines worked out once:

|        | One spectrum | 216,000 spectra (3 h) |
| ------ | ------------ | --------------------- |
| Node   | 2,608 µs     | 9.4 min               |
| Chrome | 2,635 µs     | 9.5 min               |

The DFT is the definition, and it is easy to check by eye. It is too slow to run for every window of a long file.

## The FFT: the same answer, found faster

The **fast Fourier transform** (FFT) gets exactly the same numbers. It works because the 1,025 comparisons repeat each other's work. Split the frame into its even and odd samples: the DFT of 2048 samples is two DFTs of 1024, joined with one multiply per step. Each of those splits again, down to pairs. That is 11 halvings (2¹¹ = 2048), each costing one pass over the frame, so **11,264** multiplications instead of 2.1 million. This is the **radix-2** FFT, and it is why the frame size is a power of two.

Measured on the same frame:

|        | One spectrum | Against the DFT |
| ------ | ------------ | --------------- |
| Node   | 18.4 µs      | 141 times       |
| Chrome | 15.9 µs      | 166 times       |

The FFT and the DFT differed by at most **4.6 × 10⁻¹⁴**, on values up to 26.7: float rounding. That is why the DFT is the FFT's reference in its spec. The spec's 26 µs came from a different FFT. Working the cosines out inside the loop made it **124 µs**, so they are worked out once per frame size.

## The Hann window: why a frame is not cut off square

The FFT assumes the frame repeats forever, its end joined to its start. A frame cut off square has a jump at that join, and a jump is made of every frequency at once. That spreads a tone's strength across the whole spectrum. This is called **leakage**.

The **Hann window** fades the frame in and out with one cycle of a cosine, from 0 at both ends to 1 in the middle, so the join has no jump. Measured on a 1 kHz sine, relative to its spike:

| Frame  | At 1.2 kHz | At 2 kHz | At 10 kHz |
| ------ | ---------- | -------- | --------- |
| Square | −27.5 dB   | −43.3 dB | −65.0 dB  |
| Hann   | −67.7 dB   | −109 dB  | −172 dB   |

On real music, leakage fills in what isn't there. With square frames, every sample reads about −55 dB at 16 kHz. With Hann frames, they read −95 to −120 dB (below). The cost is a spike about 4 steps wide instead of 1, and the quarter of the frame near each end counts for little. Frames are centred on their window, and a Hann frame is 46 ms against a 50 ms window, so almost nothing between two spectra is missed.

## The time–frequency trade

A frame of N samples gives steps of rate / N Hz and lasts N / rate seconds. A longer frame tells tones apart better and blurs time more. You can't have both.

| Frame | At 44.1 kHz    | At 48 kHz      | At 22.05 kHz   | FFT (Node) |
| ----- | -------------- | -------------- | -------------- | ---------- |
| 2048  | 46 ms, 21.5 Hz | 43 ms, 23.4 Hz | 93 ms, 10.8 Hz | 18 µs      |
| 4096  | 93 ms, 10.8 Hz | 85 ms, 11.7 Hz | 186 ms, 5.4 Hz | 36 µs      |

At 2048 a frame fits inside its 50 ms window. At 4096 it would spread over two windows either side, so a drum hit would smear over 100 ms. It would also cost twice the FFT time. At 22.05 kHz a 2048 frame already spans two windows, which is fine for a rare rate.

**Why the bass draws as blocks.** On a log axis (below) the low bands are narrow: 50 to 100 Hz is as tall as 5 to 10 kHz. At 44.1 kHz and 2048 samples, **46 of the 128 bands**, everything under 446 Hz, are narrower than one 21.5 Hz step. Each of them shows the step it lies in, so neighbouring bands repeat the same value. The bottom octave, 50 to 100 Hz, is about 15 bands and only 4 steps, so it shows 4 blocks. At 4096 it would be 32 bands under 229 Hz. The blocks are left visible: they are the trade, drawn.

## The bands

1,025 steps are too many to keep for every window, and most are high: the top octave, 11 to 22 kHz, holds half of them. The ear hears ratios, as with loudness (note 03), so the app keeps **128 bands on a log axis** from 50 Hz to half the sample rate. Each band's top is the same ratio above its bottom: (22,050 / 50)^(1/128) at 44.1 kHz, **14.6 bands per octave**.

- **A band holds the summed power of its steps.** Power is strength squared, re² + im². A wide band at 10 kHz sums 21 steps, so a tone anywhere inside it counts in full.
- **A band too narrow for any step takes the step it lies in**: the step nearest the band's middle.
- **The scale.** The power is divided by that of a full-scale sine (swinging between −1 and 1, through the same Hann window), then turned into dB with `10 * Math.log10(power)`. It's 10 and not 20, because it is already squared. So a full-scale sine reads **0 dB**. Note 03's RMS reads the same sine at −3.01 dB: the two scales measure different things.
- **The floor is −100 dB**, as in note 03. Silence has a power of 0 and would be −∞. Each band is stored as **one byte**, 0 for −100 dB and 255 for 0 dB, so a step of 0.39 dB.

How close a full-scale sine comes to 0 dB depends on its band:

| Sine   | Loudest band     | Reads    | Why                                  |
| ------ | ---------------- | -------- | ------------------------------------ |
| 5 kHz  | 4,812–5,046 Hz   | 0.00 dB  | The band holds the whole spike       |
| 15 kHz | 14,370–15,071 Hz | 0.00 dB  | Same                                 |
| 1 kHz  | 955–1,001 Hz     | −2.64 dB | The spike straddles two bands        |
| 100 Hz | 97–102 Hz        | −2.47 dB | One step, and Hann spreads the spike |
| 60 Hz  | 55–58 Hz         | −2.02 dB | Same                                 |

Under 446 Hz a band takes one step, and the Hann window puts about two thirds of a tone's power in its middle step (−1.76 dB), less when the tone falls between two steps. "About 0 dB" means within 3 dB, and exactly 0 above a few kHz. The strip shades the 80 dB below the file's loudest point, so a 2 dB shortfall doesn't show.

## The 16 kHz wall

Averaged over 60 s from 20:00, each file's level relative to its loudest step (native ffmpeg decode, Hann frames, every 50 ms, a 200 Hz band around each frequency):

| File                   | Rate   | 5 kHz | 10 kHz | 15 kHz | 16 kHz | 18 kHz | 16 kHz, square |
| ---------------------- | ------ | ----- | ------ | ------ | ------ | ------ | -------------- |
| `sample-crossfade.m4a` | 48,000 | −46   | −59    | −68    | −95    | −106   | −57            |
| `sample-crossfade.mp3` | 48,000 | −46   | −59    | −68    | −95    | −106   | −57            |
| `sample1.m4a`          | 44,100 | −67   | −79    | −104   | −120   | −122   | −55            |
| `sample1.mp3`          | 44,100 | −67   | −79    | −105   | −117   | −113   | −55            |
| `sample1.opus`         | 48,000 | −67   | −78    | −101   | −119   | −119   | −55            |
| `sample1-shuffled.m4a` | 44,100 | −88   | −106   | −104   | −112   | −128   | −59            |
| `sample3h.m4a`         | 44,100 | −67   | −79    | −103   | −119   | −120   | −55            |
| `sample3h.mp3`         | 44,100 | −67   | −79    | −105   | −117   | −113   | −55            |
| `sample3h.opus`        | 48,000 | −67   | −78    | −101   | −119   | −119   | −55            |

Every file is below −95 dB by 16 kHz. `sample1` is already below −100 dB at 15 kHz. `sample1-shuffled.m4a` is quiet at 20:00, so its whole row is low. The square column shows leakage hiding the wall.

That edge is an **encoder's lowpass**. A lossy encoder (AAC, MP3, Opus) spends its bits where the ear is sharpest and throws away the top, often everything above 16 kHz, so it never encodes it. The edge sits at the same place in the m4a, the mp3 and the opus of one recording. So it was probably cut once, in the AAC source they were all made from, and re-encoding has no way to bring it back. On the strip it is a hard ceiling with nothing above it.

## The cost of building it in the load loop

One spectrum per 50 ms loudness window, so the spectrogram has the same column count as the loudness curve. One column is the window, the FFT, the 128 band sums and the bytes: **21.5 µs in Node, 17.3 µs in Chrome**.

| Length | Columns | Extra time (Chrome) | Memory  |
| ------ | ------- | ------------------- | ------- |
| 1 h    | 72,000  | 1.2 s               | 9.2 MB  |
| 3 h    | 216,000 | 3.7 s               | 27.6 MB |

The 3 h m4a loads in 19.2 s today (note 02). The spec estimated about 6 s more from a 26 µs FFT. The measured compute is closer to 4 s. Ticket 05 measures the real load time. 27.6 MB is three times the 8.64 MB of the peaks and thirty times the 0.9 MB loudness curve, still far under the 3.81 GB of samples that note 02 never keeps.

## Why in the load loop, and why bands

This stands in for an ADR.

- **Decoding again costs a whole load.** The samples are gone once each slice is analysed (note 02). Getting them back for a spectrum means another ffmpeg decode: 19.2 s for the 3 h m4a, and minutes for the 3 h MP3, which slows as it seeks further in (note 06). The FFT on top of the decode that already runs costs about 4 s.
- **Every view wants it at once.** The Split view, the Track view and the Range view each draw a different stretch. A per-view decode would wait at every click; a spectrogram already built draws at once.
- **#18 reads the whole file.** Proposing splits from the spectrum compares every moment with its neighbours, so it needs every column anyway.
- **Bands, not steps.** A column of 1,025 float steps is 4,100 bytes, so 885 MB for 3 h. 128 bytes is 32 times smaller, which makes it 27.6 MB. The log axis keeps the low notes apart, and the high steps merged into one band are ones the eye couldn't tell apart either.

## Where it lives in the code

Filled in once the milestone is built (ticket 05).
