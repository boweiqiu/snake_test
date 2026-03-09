const BGM_NOTES = [261.63, 329.63, 392, 329.63, 523.25, 392, 329.63, 293.66]
const BGM_NOTE_DURATION_SECONDS = 0.22
const BGM_NOTE_INTERVAL_MS = 260

export function togglePlaybackState(isPlaying) {
  return !isPlaying
}

export function getNextLoopIndex(currentIndex, total = BGM_NOTES.length) {
  if (total <= 0) {
    return 0
  }

  return (currentIndex + 1) % total
}

function createNoopAudioEngine() {
  return {
    async resume() {},
    startMusic() {},
    stopMusic() {},
    playEatEffect() {},
    playGameOverEffect() {},
    dispose() {}
  }
}

function playTone(context, destination, config) {
  if (!context || !destination) {
    return
  }

  const {
    frequency,
    type,
    durationSeconds,
    peakGain,
    startAt = context.currentTime
  } = config
  const oscillator = context.createOscillator()
  const gainNode = context.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startAt)

  gainNode.gain.setValueAtTime(0.0001, startAt)
  gainNode.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.02)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSeconds)

  oscillator.connect(gainNode)
  gainNode.connect(destination)

  oscillator.start(startAt)
  oscillator.stop(startAt + durationSeconds + 0.03)
}

export function createAudioEngine() {
  if (typeof window === 'undefined') {
    return createNoopAudioEngine()
  }

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextCtor) {
    return createNoopAudioEngine()
  }

  const context = new AudioContextCtor()
  const masterGain = context.createGain()
  masterGain.gain.value = 0.33
  masterGain.connect(context.destination)

  const musicGain = context.createGain()
  musicGain.gain.value = 0.17
  musicGain.connect(masterGain)

  const effectGain = context.createGain()
  effectGain.gain.value = 0.26
  effectGain.connect(masterGain)

  let bgmLoopIndex = 0
  let bgmTimerId = null

  function playBackgroundNote() {
    playTone(context, musicGain, {
      frequency: BGM_NOTES[bgmLoopIndex],
      type: 'triangle',
      durationSeconds: BGM_NOTE_DURATION_SECONDS,
      peakGain: 0.08
    })

    bgmLoopIndex = getNextLoopIndex(bgmLoopIndex)
  }

  function startMusic() {
    if (bgmTimerId !== null) {
      return
    }

    playBackgroundNote()
    bgmTimerId = window.setInterval(playBackgroundNote, BGM_NOTE_INTERVAL_MS)
  }

  function stopMusic() {
    if (bgmTimerId === null) {
      return
    }

    window.clearInterval(bgmTimerId)
    bgmTimerId = null
  }

  async function resume() {
    if (context.state === 'suspended') {
      await context.resume()
    }
  }

  function playEatEffect() {
    const now = context.currentTime
    playTone(context, effectGain, {
      frequency: 659.25,
      type: 'square',
      durationSeconds: 0.09,
      peakGain: 0.05,
      startAt: now
    })
    playTone(context, effectGain, {
      frequency: 783.99,
      type: 'square',
      durationSeconds: 0.08,
      peakGain: 0.04,
      startAt: now + 0.08
    })
  }

  function playGameOverEffect() {
    const now = context.currentTime
    playTone(context, effectGain, {
      frequency: 311.13,
      type: 'sawtooth',
      durationSeconds: 0.16,
      peakGain: 0.055,
      startAt: now
    })
    playTone(context, effectGain, {
      frequency: 233.08,
      type: 'sawtooth',
      durationSeconds: 0.2,
      peakGain: 0.055,
      startAt: now + 0.12
    })
  }

  function dispose() {
    stopMusic()
    masterGain.disconnect()
    musicGain.disconnect()
    effectGain.disconnect()
    void context.close()
  }

  return {
    resume,
    startMusic,
    stopMusic,
    playEatEffect,
    playGameOverEffect,
    dispose
  }
}
