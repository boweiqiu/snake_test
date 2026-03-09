## ADDED Requirements

### Requirement: Core game events SHALL trigger audio cues
The game SHALL provide short sound effects for key gameplay events so players can identify state changes without relying only on visual feedback.

#### Scenario: Game start cue
- **WHEN** a new game session starts
- **THEN** the system plays the start sound effect once

#### Scenario: Food collected cue
- **WHEN** the snake head reaches the current food position
- **THEN** the system plays the food collection sound effect

#### Scenario: Collision cue
- **WHEN** the snake collides with a wall or itself
- **THEN** the system plays the collision sound effect

#### Scenario: Game over cue
- **WHEN** a collision ends the session
- **THEN** the system plays the game-over sound effect

### Requirement: Sound playback SHALL fail safely
If audio playback is unavailable, blocked, or errors during runtime, the game SHALL continue running without breaking gameplay.

#### Scenario: Audio unavailable
- **WHEN** the browser does not provide a usable audio context
- **THEN** the game continues without throwing unhandled runtime errors

#### Scenario: Audio resume rejected
- **WHEN** the audio context resume operation is rejected by browser policy
- **THEN** gameplay logic remains unaffected and no crash occurs
