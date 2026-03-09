export const SOUND_EVENTS = Object.freeze({
  start: 'start',
  eat: 'eat',
  collision: 'collision',
  gameOver: 'gameOver'
})

export const SOUND_EFFECTS = Object.freeze({
  [SOUND_EVENTS.start]: {
    type: 'triangle',
    frequency: 440,
    frequencyEnd: 620,
    attack: 0.01,
    duration: 0.14,
    gain: 0.06
  },
  [SOUND_EVENTS.eat]: {
    type: 'sine',
    frequency: 780,
    frequencyEnd: 980,
    attack: 0.008,
    duration: 0.1,
    gain: 0.07
  },
  [SOUND_EVENTS.collision]: {
    type: 'sawtooth',
    frequency: 220,
    frequencyEnd: 120,
    attack: 0.005,
    duration: 0.18,
    gain: 0.08
  },
  [SOUND_EVENTS.gameOver]: {
    type: 'square',
    frequency: 180,
    frequencyEnd: 72,
    attack: 0.005,
    duration: 0.24,
    gain: 0.09
  }
})

function getAudioContextConstructor() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.AudioContext ?? window.webkitAudioContext ?? null
}

export function createSoundEffects({ audioContextFactory } = {}) {
  let context = null
  let disabled = false
  let muted = false

  function getContext() {
    if (disabled) {
      return null
    }

    if (context) {
      return context
    }

    try {
      if (audioContextFactory) {
        context = audioContextFactory()
      } else {
        const AudioContextConstructor = getAudioContextConstructor()
        context = AudioContextConstructor ? new AudioContextConstructor() : null
      }
    } catch {
      context = null
    }

    if (!context) {
      disabled = true
      return null
    }

    return context
  }

  function resume() {
    const activeContext = getContext()
    if (!activeContext || typeof activeContext.resume !== 'function') {
      return
    }

    try {
      const maybePromise = activeContext.resume()
      if (maybePromise && typeof maybePromise.catch === 'function') {
        maybePromise.catch(() => {})
      }
    } catch {
      // Keep gameplay running even if resume fails.
    }
  }

  function play(eventName) {
    if (muted) {
      return false
    }

    const effect = SOUND_EFFECTS[eventName]
    if (!effect) {
      return false
    }

    const activeContext = getContext()
    if (!activeContext) {
      return false
    }

    resume()

    try {
      const now = activeContext.currentTime ?? 0
      const oscillator = activeContext.createOscillator()
      const gainNode = activeContext.createGain()

      oscillator.type = effect.type
      oscillator.frequency.setValueAtTime(effect.frequency, now)
      oscillator.frequency.linearRampToValueAtTime(effect.frequencyEnd, now + effect.duration)

      gainNode.gain.setValueAtTime(0.0001, now)
      gainNode.gain.exponentialRampToValueAtTime(effect.gain, now + effect.attack)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + effect.duration)

      oscillator.connect(gainNode)
      gainNode.connect(activeContext.destination)

      oscillator.start(now)
      oscillator.stop(now + effect.duration)

      return true
    } catch {
      return false
    }
  }

  function setMuted(value) {
    muted = Boolean(value)
  }

  function isMuted() {
    return muted
  }

  function destroy() {
    if (!context || typeof context.close !== 'function') {
      context = null
      return
    }

    try {
      const maybePromise = context.close()
      if (maybePromise && typeof maybePromise.catch === 'function') {
        maybePromise.catch(() => {})
      }
    } catch {
      // Ignore close failures and release local reference.
    }

    context = null
  }

  return {
    destroy,
    isMuted,
    play,
    resume,
    setMuted
  }
}
