## Context

The game currently has no audio layer, while issue #10 requires background music with play/pause controls and compatibility with gameplay sound effects. The app is a single React page with game loop logic in `App.jsx`, so audio control should remain local to the client and not change game rules or persistence.

## Goals / Non-Goals

**Goals:**
- Add background music that can be started and paused by the player.
- Ensure background music and gameplay sound effects can play concurrently.
- Keep audio implementation lightweight with no server dependency.
- Cover new audio-state behavior with unit tests where feasible.

**Non-Goals:**
- Advanced mixer settings (volume sliders, track selection, mute groups).
- Network audio streaming or user-uploaded music.
- Full browser compatibility fallback for very old audio APIs.

## Decisions

1. **Use a small Web Audio engine instead of static media files**
   - Rationale: Avoid repository bloat and external licensing concerns while delivering immediate background music and effects.
   - Alternative considered: shipping mp3/ogg assets. Rejected for higher asset management overhead in this small project.

2. **Separate background music state from effect triggers**
   - Rationale: Background music should toggle independently, while effects fire on game events (eat/collision). This directly satisfies coexistence.
   - Alternative considered: one shared playback channel. Rejected because effects could interrupt background music.

3. **Drive effect triggers from existing game-loop events**
   - Rationale: Eat and game-over transitions already exist in the loop, so adding effect triggers there keeps behavior deterministic.
   - Alternative considered: separate observer/event bus. Rejected as unnecessary complexity.

## Risks / Trade-offs

- **[Risk] Browser autoplay restrictions block audio until user interaction** → Mitigation: lazily create/resume audio context from keyboard/button interactions.
- **[Risk] Added logic in game loop increases coupling to UI** → Mitigation: move audio synthesis details into a dedicated utility module and keep App integration thin.
- **[Trade-off] Synthesized tones sound simpler than recorded tracks** → Accepted for fast implementation and zero asset maintenance.
