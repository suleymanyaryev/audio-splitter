# 10 · Speed without pitch

This milestone adds a play speed, 0.5× to 2.0×, to the player. The control is small. The idea under it is not: there are two ways to make sound play faster, and only one of them keeps the pitch. This note makes a sample twice as fast both ways, measures what each does, and explains the method that keeps the pitch.

## The words

- **Sample rate**: how many samples make one second, as in note 01. 44,100 for the sample used here.
- **Pitch**: how high a note sounds. It is its **frequency**, the number of times the wave repeats in a second. A wave that repeats 90 times a second is 90 Hz, a low hum. Doubling it moves the note up one octave.
- **Period**: the length of one repeat. In samples, `sample rate / frequency`.
- **Resampling**: playing the same list of samples at a different sample rate. This is what a tape or a record does when it is sped up.
- **Time-stretching**: changing how long the sound lasts while keeping its pitch. The samples are not just replayed at another rate: the sound is rebuilt from pieces of itself.
- **WSOLA** (waveform-similarity overlap-add): the time-stretching method used by ffmpeg's `atempo` and by Chrome, explained below.
- **Play speed** (GLOSSARY.md): how fast the source is heard against real time. Avoid "rate", which is the sample rate here.
- **Stretch** (in the player's code, `toggleStretch`): a piece of the source file the player plays, the range or the selected track. It has nothing to do with time-stretching: one word for two unrelated things.

## Worked example: `samples/sample1.m4a`

Ten seconds from 1:00.000, mono, 44,100 Hz: 441,000 samples. Native ffmpeg 8.1 made it twice as fast two ways, on 2026-11-22:

- **Resampled:** `asetrate=88200,aresample=44100`. The same samples, each one lasting half as long. This is tape played fast.
- **Time-stretched:** `atempo=2`. The same sound, in half the time.

The length is from the file's sample count. The strongest frequency is the highest peak of a Hann-windowed FFT of 32,768 samples (a bin 1.35 Hz wide), on the same stretch of sound in each version: 1 s into the original, so 0.5 s into the fast ones.

| Version             | Length   | Strongest frequency            |
| ------------------- | -------- | ------------------------------ |
| Original            | 10.000 s | 89.73 Hz                       |
| Resampled ×2        | 5.000 s  | 179.61 Hz: ×2.00, an octave up |
| Time-stretched ×2   | 5.0008 s | 90.16 Hz: ×1.00, unchanged     |
| Resampled ×0.5      | 20.000 s | 44.83 Hz: an octave down       |
| Time-stretched ×0.5 | 19.965 s | 90.05 Hz: unchanged            |

The lengths are the same, and the pitches are not: that is the whole difference.

**Why resampling moves the pitch.** The strongest frequency is a bass note that repeats every 44,100 / 89.73 = **491.5 samples**. Resampling does not change those 491.5 samples. It only changes how long a sample lasts: at 88,200 samples a second, 491.5 of them take half as long, so the note repeats twice as often, at 88,200 / 491.5 = 179.5 Hz. Every repeat is kept and squeezed into half the time: 897 repeats in 10 s, 898 in 5 s. Speed and pitch are one number, and they cannot move apart.

**What time-stretching does instead.** It keeps the period at about 491.5 samples, so the pitch stays. Half the time then fits only half the repeats: 451 of them in 5.0008 s. The sound has been cut up and about every other repeat dropped, and the cuts must not be heard. The lengths show it is not a resample: 5.0008 s and 19.965 s are not exact, because `atempo` works in whole blocks, and the resampled versions (5.000 s, 20.000 s) are.

## WSOLA

1. **Cut** the sound into short blocks that overlap, so each block shares its edges with its neighbours.
2. **Lay them down at a new spacing.** To go twice as fast, the next block is taken from twice as far ahead in the source, so about half of the source is never used. To go half as fast, the blocks are taken from half as far ahead, so each stretch of source is used by two blocks in a row.
3. **Line each block up with its neighbour.** If a block is laid down exactly where the plan puts it, the two waves may be out of step at the join, and the cross-fade between them is heard as a click or a hollow flutter. So each block is slid a little, within a small search range, to the spot where its waveform is **most like** the end of the block before it. That is the "waveform similarity". A held note is periodic, so a spot where the waves match is always near, and the join is silent.
4. **Cross-fade** the overlap. One block fades out as the next fades in.

Pitch survives because no block is replayed at another rate: each is the original sound at its original pace, and only the number of blocks, and so the total time, changes.

**Why speech and drum hits smear.** The search in step 3 works because a held note repeats. A drum hit is a burst, and a consonant ("t", "s") is mostly noise: each is a single event with nothing like it nearby to line up with. At 2.0×, the burst can fall in the part of the source that is skipped, or be cut by a block edge. At 0.5×, two blocks in a row use it, so it is laid down twice, a few tens of milliseconds apart. Either way the attack, which is the instant a hit starts, is blurred, which is why fast speech sounds slightly mushy and a snare gets a faint echo. Close to 1× the blocks barely move and little is lost; the effect grows towards the ends of the range.

**Why the app does not do it by hand.** The app's learnable signal maths is hand-written, but this one is done by the browser: the player is an `<audio>` element, and a hand-written stretch would mean leaving it. [ADR 0004](../adr/0004-time-stretching-by-the-browser.md) has the reasoning. This note is the learning: the method above is what Chrome runs when the app sets the speed.

## In Chrome

_Filled in once the control is built and heard in Chrome, with measured numbers._

## Where it lives in the code

- [`src/widgets/split-zoom/model/audition.ts`](../../src/widgets/split-zoom/model/audition.ts): the one player, whose `<audio>` element will play at the play speed.
- [ADR 0004](../adr/0004-time-stretching-by-the-browser.md): why the stretch is the browser's, and what it needs from the player.
