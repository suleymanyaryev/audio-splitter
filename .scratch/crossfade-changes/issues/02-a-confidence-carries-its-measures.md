# 02: A confidence carries its measures

**What to build:** a prefactor with no visible change. A split's confidence today is a band and a depth. It becomes a band with two optional measures, the depth and the contrast, each in dB or none, so a later ticket can give a split a contrast, or both. The tooltip and the order of `{` and `}` read from the measures. Gap and dip splits carry their depth exactly as now.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

Spec: `.scratch/crossfade-changes/spec.md`, Implementation Decisions "The split store" (a split's confidence).

- [ ] A split's confidence holds a band, a depth or none, and a contrast or none.
- [ ] Find splits gives gap and dip splits their depth and no contrast, as today.
- [ ] The tooltip shows each measure the confidence has; with a depth only, the text is exactly today's.
- [ ] The confidence order reads the measures; with depths only, it is exactly today's (least deep first, ties by time).
- [ ] Moving a split and marking it checked clear the whole confidence, as today.
- [ ] Every existing confidence spec passes, updated only for the new shape.
- [ ] Checks: the Task tier after each loop, the Checkpoint tier at the end. No changelog line: nothing the user sees changes.
