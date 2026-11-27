# 10 · Speed without pitch

The player has a play speed, 0.5× to 2.0×. There are two ways to make sound play faster, and only one of them keeps the pitch. This note makes a sample twice as fast both ways, measures what each does, and explains the method that keeps the pitch.

## The words

- **Pitch**: how high a note sounds. It is its **frequency**, the number of times the wave repeats in a second. A wave that repeats 90 times a second is 90 Hz, a low hum. Doubling it moves the note up one octave.
- **Period**: the length of one repeat. In samples, `sample rate / frequency` (sample rate as in [note 01](01-sound-is-numbers.md)).
- **Resampling**: playing the same list of samples at a different sample rate. This is what a tape or a record does when it is sped up.
- **Time-stretching**: changing how long the sound lasts while keeping its pitch. The samples are not just replayed at another rate: the sound is rebuilt from pieces of itself.
- **WSOLA** (waveform-similarity overlap-add): the time-stretching method of ffmpeg's `atempo` and of Chrome, explained below.
- **Play speed** (GLOSSARY.md): how fast the source is heard against real time. Avoid "rate", which is the sample rate here.
- **Stretch**: the player's word for a piece of the source it plays, the range or the selected track. It has nothing to do with time-stretching.

## Worked example: `samples/sample1.m4a`

Ten seconds from 1:00.000, mono, 44,100 Hz: 441,000 samples. Native ffmpeg made it twice as fast and half as fast, two ways:

- **Resampled:** `asetrate=88200,aresample=44100`. The same samples, each one lasting half as long: tape played fast.
- **Time-stretched:** `atempo=2`. The same sound, in half the time.

The strongest frequency is the highest peak of a Hann-windowed FFT of 32,768 samples (a bin 1.35 Hz wide), on the same stretch of sound in each version.

| Version             | Length   | Strongest frequency            |
| ------------------- | -------- | ------------------------------ |
| Original            | 10.000 s | 89.73 Hz                       |
| Resampled ×2        | 5.000 s  | 179.61 Hz: ×2.00, an octave up |
| Time-stretched ×2   | 5.0008 s | 90.16 Hz: ×1.00, unchanged     |
| Resampled ×0.5      | 20.000 s | 44.83 Hz: an octave down       |
| Time-stretched ×0.5 | 19.965 s | 90.05 Hz: unchanged            |

The lengths are the same, and the pitches are not: that is the whole difference.

**Why resampling moves the pitch.** The strongest frequency is a bass note that repeats every 44,100 / 89.73 = **491.5 samples**. Resampling does not change those 491.5 samples, only how long a sample lasts. At 88,200 samples a second they take half as long, so the note repeats twice as often, at 88,200 / 491.5 = 179.5 Hz. Every repeat is kept and squeezed into half the time: 897 repeats in 10 s, 898 in 5 s. Speed and pitch are one number, and they cannot move apart.

**What time-stretching does instead.** It keeps the period at about 491.5 samples, so the pitch stays. Half the time then fits only half the repeats: 451 of them in 5.0008 s. The sound has been cut up and about every other repeat dropped, and the cuts must not be heard. The lengths show it is not a resample: `atempo` works in whole blocks, so 5.0008 s and 19.965 s are not exact.

## WSOLA

1. **Cut** the sound into short blocks that overlap, so each block shares its edges with its neighbours.
2. **Lay them down at a new spacing.** To go twice as fast, the next block is taken from twice as far ahead in the source, so about half of the source is never used. To go half as fast, each stretch of source is used by two blocks in a row.
3. **Line each block up with its neighbour.** Laid down exactly where the plan puts it, a block may be out of step with the one before, and the join is heard as a click or a hollow flutter. So each block is slid a little, within a small search range, to the spot where its waveform is **most like** the end of the block before it: the "waveform similarity". A held note is periodic, so a matching spot is always near, and the join is silent.
4. **Cross-fade** the overlap. One block fades out as the next fades in.

Pitch survives because no block is replayed at another rate: each is the original sound at its original pace, and only the number of blocks, and so the total time, changes.

**Why speech and drum hits smear.** The search in step 3 works because a held note repeats. A drum hit is a burst, and a consonant ("t", "s") is mostly noise: each is a single event with nothing like it nearby to line up with. At 2.0× the burst can fall in the skipped part of the source, or be cut by a block edge. At 0.5× two blocks in a row use it, so it is laid down twice, a few tens of milliseconds apart. Either way the attack, the instant a hit starts, is blurred: fast speech sounds slightly mushy and a snare gets a faint echo. Close to 1× the blocks barely move and little is lost.

**The browser does it.** The player is an `<audio>` element, so the app sets the speed and Chrome runs the method above ([ADR 0004](../adr/0004-time-stretching-by-the-browser.md)). Measured after the element, the bass of the worked example stays within one 1.35 Hz bin of 89.7 Hz at 0.5× and at 2.0×, nowhere near the 179 Hz and 45 Hz of a resample.

## Source time and real time

A play speed changes how much real time a stretch takes, never where things are in the file. At 2.0× the element's `currentTime` advances 2 s of source per real second, so the playhead covers 10 s of the file in 5 s. Split times, track lengths and the axes are all in source time, and none of them changes with the speed.

## Where it lives in the code

- [`src/widgets/split-zoom/api/audio-element.ts`](../../src/widgets/split-zoom/api/audio-element.ts): `setPlaySpeed` sets the element's `preservesPitch`, `defaultPlaybackRate` and `playbackRate`: the browser's time-stretching.
- [`src/widgets/split-zoom/config/play-speed.ts`](../../src/widgets/split-zoom/config/play-speed.ts): 0.5×, 2.0× and the 0.1 step.
- [ADR 0004](../adr/0004-time-stretching-by-the-browser.md): why the stretch is the browser's, and what it needs from the player.
