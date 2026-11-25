# 07: A file over the size limit is refused at load

**What to build:** if the pinned core cannot read past 2 GB, a larger source file is refused before probing with a plain message, for example "This file is 2.6 GB; the splitter reads files up to 2 GB.", instead of failing halfway through a decode.

Only if ticket 01 shows the core cannot read the 2.6 GB stand-in. If it reads it, close this ticket with that finding and change nothing.

**Blocked by:** 01, 03

**Status:** ready-for-agent

- [ ] The limit is the one ticket 01 measured.
- [ ] A file over it gets the message on the load page, and no ffmpeg session is opened for it.
- [ ] A source-file store spec covers a file over the limit and one at it.
- [ ] A CHANGELOG line under `## [Unreleased]`.
