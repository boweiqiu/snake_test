## Why

Current gameplay only includes short sound effects, so the game feels sparse during longer sessions. Adding optional background music improves immersion while preserving existing effect feedback.

## What Changes

- Add looped background music playback during active gameplay.
- Add an in-game control to play/pause background music at runtime.
- Keep collision/eat effects working independently from background music.
- Add tests for new audio-state behavior and non-regression of effects behavior.

## Capabilities

### New Capabilities
- `background-music-control`: Provide background music playback with user play/pause control and independent coexistence with sound effects.

### Modified Capabilities
- None.

## Impact

- Affected code: `src/App.jsx`, `src/gameUtils.js`, and related styling in `src/App.css`.
- New static asset: background music audio file under `src/assets/`.
- Tests: update/add unit tests for audio state handling in `src/gameUtils.test.js` or new test files.
