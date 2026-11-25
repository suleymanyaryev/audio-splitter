# 07: A file over the size limit is refused at load

**What to build:** if the pinned core cannot read past 2 GB, a larger source file is refused before probing with a plain message, for example "This file is 2.6 GB; the splitter reads files up to 2 GB.", instead of failing halfway through a decode.

Only if ticket 01 shows the core cannot read the 2.6 GB stand-in. If it reads it, close this ticket with that finding and change nothing.

**Blocked by:** 01, 03

**Status:** resolved

- [x] The limit is the one ticket 01 measured.
- [x] A file over it gets the message on the load page, and no ffmpeg session is opened for it.
- [x] A source-file store spec covers a file over the limit and one at it.
- [x] A CHANGELOG line under `## [Unreleased]`.

## Answer

Closed with no code change, as the ticket says: ticket 01 showed the pinned core can read the 2.6 GB stand-in. In its words ([The 2 GB question](01-spike-decode-and-split-the-stand-ins.md#the-2-gb-question)): the 2.62 GB (2.44 GiB) 3 h MP4 decodes to the end (185 slices, 487,689,216 frames, equal to native's), its last track, which starts past 2 GiB, cuts bit-exactly, and a 4.84 GB copy (past 4 GiB) gives byte-identical cuts and an identical last-slice curve. So there is no limit to enforce at 2 GB.

The boxes above do not apply, since they describe the refusal this ticket would have built. They are ticked as "not needed", with nothing added: no store check, no message, no spec and no CHANGELOG line.

## Comments

- Not known: whether a limit exists above 4.84 GB, and how much memory a 3 h decode of a video takes (ticket 01 did not measure it). If a real file of that size fails halfway through a decode, this ticket's idea (refuse before probing, with the file's size in the message) is the place to start.
- Spec story 31 ("a file larger than the splitter can read is refused at once") stays unmet by design, because no size has been found that the splitter cannot read.
