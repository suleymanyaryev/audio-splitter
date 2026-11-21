# 04: Ask the browser to keep the stored copy

**What to build:** after my first file loads successfully, the app asks the browser once to keep its stored data, so the ffmpeg core is less likely to be cleared when space runs low. Firefox's prompt appears then, never when the page opens. A refusal, or a browser without the request, changes nothing.

**Blocked by:** 03 (Keep the ffmpeg core in the browser)

**Status:** ready-for-agent

Spec: `.scratch/ffmpeg-load-time/spec.md` (stories 15–17)

- [ ] When a file first becomes `ready` in this page's life, the `source-file` store calls `navigator.storage.persist()` where it exists, once. Neither its answer nor an error is reported.
- [ ] Specs (the store, with `persist` stubbed): asked once after the first ready file; not after a failed load; not again after a second file; nothing breaking where `navigator.storage.persist` is missing or rejects.
- [ ] Checked by hand in Firefox: the prompt appears after the first successful load and not on opening the page.
- [ ] `docs/architecture.md` notes when persistence is asked for and why then. No CHANGELOG line: the user notices nothing beyond ticket 03.
