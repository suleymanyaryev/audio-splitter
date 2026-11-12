# Code layout

Type: grilling
Status: open

## Question

The user wants Feature-Sliced Design, Reka UI and Tailwind, and also wants no abstraction that exists only for a possible future. Full FSD has six layers (`app`, `pages`, `widgets`, `features`, `entities`, `shared`); this app has two screens and one pipeline. Which subset of FSD fits, and where does each kind of code live?

Decide:

- Which layers exist from the first milestone, and which are added only when a second consumer appears.
- The slices: what is a page, a widget, a feature and an entity here (load screen, review screen, waveform, loudness curve, split list, export; source file, split, track).
- Where the hand-written signal-processing modules live, given that AGENTS.md requires worker entries to stay thin and analysis logic to sit in plain modules that specs import directly.
- Where the ffmpeg.wasm wrapper lives.
- Whether `vue-router` and `pinia`, already installed, earn their place: two screens could be routes or one component switching on state; shared state could be a store or plain refs.
- How Tailwind and Reka UI are added (Tailwind version and Vite integration, class sorting, any lint or Prettier change, which needs the user's explicit approval per AGENTS.md).
- Whether FSD import rules are enforced by a lint rule or by convention.
