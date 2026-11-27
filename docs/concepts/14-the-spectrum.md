# 14 · The spectrum

The waveform and the loudness curve both say how loud the file is. Neither says what it sounds like: a bass line, a voice and a cymbal can be equally loud. This note splits each short moment of the file into the tones it is made of and draws how strong each one is. A crossfade that keeps the level up still changes the tones, and that change becomes visible.

## The words

- **Tone**: a sine wave of one frequency, in hertz (Hz), cycles per second. 1 kHz is a thousand cycles per second.
- **A sound is a sum of tones**: any short stretch of samples can be rebuilt exactly by adding sine waves of the right frequencies, each with its own strength and starting point. This is not an approximation; the sum gives the samples back to float rounding.
- **Spectrum**: how strong each tone is in one short moment of the file (GLOSSARY.md).
- **Spectrogram**: the file's spectrum over time, one spectrum per 50 ms side by side: time across, frequency up, strength as shade (GLOSSARY.md).
- **Frame**: the samples one spectrum is made from. The app uses **2048** samples of the mono downmix ([note 01](01-sound-is-numbers.md)), centred on the middle of a loudness window ([note 03](03-loudness.md)).
- **Step**: the gap between two tones the spectrum can tell apart, the sample rate divided by the frame size. At 44.1 kHz that is 44,100 / 2048 = **21.5 Hz**, so a frame of **46 ms** holds 1,025 steps from 0 Hz to 22.05 kHz.
- **Half the sample rate** (the Nyquist frequency, [note 02](02-long-files.md)): the highest tone a sample rate can hold, 22.05 kHz at 44.1 kHz.

## A sound is a sum of tones

A pure tone of 1 kHz is one sine wave. Its spectrum is one spike at 1 kHz and nothing elsewhere. A note on a piano is a spike at its pitch and smaller spikes at two, three and four times it; those are what make it a piano and not a flute. A cymbal is a haze from a few kHz up, with no spikes at all. Music is all of them at once, changing every moment.

One spectrum answers "which tones, and how strong, in these 46 ms?". The spectrogram asks it again every 50 ms and lays the answers side by side. A held bass note is a horizontal line low down; a drum hit is a short vertical smear; silence is blank.

## The plain DFT: one comparison per tone

The **discrete Fourier transform** (DFT) finds the strength of each step by comparing the frame with a tone of that frequency. For step k, it multiplies every sample by a cosine of k cycles across the frame and adds the products, then does the same with a sine. If the frame holds that tone, the products line up and the sum is large. If it doesn't, they cancel out and the sum is near 0. The cosine and the sine together catch the tone at any starting point, and the length of the two sums, √(re² + im²), is its strength.

That is 2048 multiply-adds per step and 1,025 steps: **2.1 million** per spectrum. On a real frame of `sample1.m4a` it takes **2,608 µs** in Node, so the 216,000 spectra of a 3 h file would take 9.4 min. The DFT is the definition, easy to check by eye, and too slow for every window of a long file.

## The FFT: the same answer, found faster

The **fast Fourier transform** (FFT) gets exactly the same numbers, because the 1,025 comparisons repeat each other's work. Split the frame into its even and odd samples: the DFT of 2048 samples is two DFTs of 1024, joined with one multiply per step. Each of those splits again, down to pairs. That is 11 halvings (2¹¹ = 2048), each costing one pass over the frame, so **11,264** multiplications instead of 2.1 million. This is the **radix-2** FFT, and it is why the frame size is a power of two.

On the same frame it takes **18.4 µs**, 141 times faster, and differs from the DFT by at most **4.6 × 10⁻¹⁴** on values up to 26.7: float rounding. So the DFT is the FFT's reference in its spec. Working the cosines out inside the loop made it 124 µs, so they are worked out once per frame size.

## The Hann window: why a frame is not cut off square

The FFT assumes the frame repeats forever, its end joined to its start. A frame cut off square has a jump at that join, and a jump is made of every frequency at once. That spreads a tone's strength across the whole spectrum: **leakage**.

The **Hann window** fades the frame in and out with one cycle of a cosine, from 0 at both ends to 1 in the middle, so the join has no jump. On a 1 kHz sine, the strength 1 kHz away, at 2 kHz, is −43.3 dB under the spike with a square frame and −109 dB with a Hann frame. On real music, square frames read every sample at about −55 dB at 16 kHz, where Hann frames read −95 to −120 dB (below). The cost is a spike about 4 steps wide instead of 1, and a frame's ends count for little. Each frame is centred on its window, and a 46 ms Hann frame against a 50 ms window misses almost nothing between two spectra.

## The time–frequency trade

A frame of N samples gives steps of rate / N Hz and lasts N / rate seconds. A longer frame tells tones apart better and blurs time more. You can't have both. At 44.1 kHz, 2048 samples are 46 ms with 21.5 Hz steps; 4096 would be 93 ms with 10.8 Hz steps, spread over two windows either side, so a drum hit would smear over 100 ms, at twice the FFT time. So the frame is 2048, which fits inside its 50 ms window.

**Why the bass draws as blocks.** On a log axis (below) the low bands are narrow: 50 to 100 Hz is as tall as 5 to 10 kHz. At 44.1 kHz and 2048 samples, **46 of the 128 bands**, everything under 446 Hz, are narrower than one 21.5 Hz step. Each of them shows the step it lies in, so neighbouring bands repeat the same value. The bottom octave, 50 to 100 Hz, is about 15 bands and only 4 steps, so it shows 4 blocks: the trade, drawn.

## The bands

1,025 steps are too many to keep for every window, and most are high: the top octave, 11 to 22 kHz, holds half of them. The ear hears ratios, as with loudness (note 03), so the app keeps **128 bands on a log axis** from 50 Hz to half the sample rate, each band's top the same ratio above its bottom: **14.6 bands per octave** at 44.1 kHz.

- **A band holds the summed power of its steps.** Power is strength squared, re² + im². A wide band at 10 kHz sums 21 steps, so a tone anywhere inside it counts in full.
- **A band too narrow for any step takes the step nearest its middle**: the blocks above.
- **The scale.** The power is divided by that of a full-scale sine through the same Hann window, then turned into dB with `10 * Math.log10(power)`: 10 and not 20, because power is already squared. So a full-scale sine reads **0 dB**, where note 03's RMS reads it at −3.01 dB: the two scales measure different things.
- **The floor is −100 dB**, as in note 03. Each band is stored as **one byte**, 0 for −100 dB and 255 for 0 dB, so a step of 0.39 dB.

A full-scale 5 kHz sine falls in the band 4,812–5,046 Hz, which holds the whole spike, and reads 0.00 dB. A 1 kHz sine straddles two bands and reads −2.64 dB. Under 446 Hz a band takes one step, which holds about two thirds of a tone's power, so a 100 Hz sine reads −2.47 dB. "About 0 dB" means within 3 dB, and exactly 0 above a few kHz.

## The 16 kHz wall

Averaged over 60 s, relative to its loudest step, `sample1.m4a` reads −67 dB at 5 kHz, −104 dB at 15 kHz and **−120 dB at 16 kHz**. Every sample is below −95 dB by 16 kHz.

That edge is an **encoder's lowpass**: a lossy encoder spends its bits where the ear is sharpest and throws the top away. It sits at the same place in the m4a, the mp3 and the opus of one recording, so it was cut once, in their common source, and re-encoding cannot bring it back.

## Built in the load loop

One spectrum per 50 ms loudness window, so the spectrogram has the loudness curve's column count. A 3 h file is 216,000 columns of 128 bytes: 27.6 MB, three times the 8.64 MB of the peaks (note 02). Steps instead of bands, 1,025 floats a column, would be 885 MB.

The samples are gone once a slice is analysed (note 02), so the spectrogram is built beside the peaks and the loudness from the samples each slice already decodes. Decoding again for a spectrum would cost a whole load; the FFT in the load loop costs about 20 µs a column.

## Where it lives in the code

- [`src/shared/lib/audio/fft.ts`](../../src/shared/lib/audio/fft.ts): `createFft`, the radix-2 FFT, with the twiddles and the bit-reversed order worked out once per size. Its spec checks it against a plain DFT.
- [`src/shared/lib/audio/spectrogram-builder.ts`](../../src/shared/lib/audio/spectrogram-builder.ts): `createSpectrogramBuilder`, one column per loudness window from a 2048-sample Hann frame, its bands summed against a full-scale sine's power, one byte each from −100 to 0 dB.
- [`src/widgets/split-zoom/lib/spectrogram-axis.ts`](../../src/widgets/split-zoom/lib/spectrogram-axis.ts): `frequencyToY` and `yToFrequency`, the log axis.
