## 1. Audio module and event mapping

- [x] 1.1 Create `src/soundEffects.js` with Web Audio API based effect definitions for `start`, `eat`, `collision`, and `gameOver`
- [x] 1.2 Add safe guards and graceful fallback when `AudioContext` is unavailable or resume/play fails

## 2. Game integration

- [x] 2.1 Integrate sound effect controller into `src/App.jsx` and trigger effects at start, food collection, collision, and game-over transitions
- [x] 2.2 Ensure sound triggering avoids duplicate playback in a single tick and does not alter existing game rules

## 3. Validation

- [x] 3.1 Add unit tests for sound configuration / event mapping and safety behavior
- [x] 3.2 Run project test suite and build to verify no regressions
