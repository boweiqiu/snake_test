import { describe, expect, it, vi } from 'vitest'
import { SOUND_EFFECTS, SOUND_EVENTS, createSoundEffects } from './soundEffects'

function createFakeAudioContext() {
  const frequency = {
    linearRampToValueAtTime: vi.fn(),
    setValueAtTime: vi.fn()
  }
  const oscillator = {
    connect: vi.fn(),
    frequency,
    start: vi.fn(),
    stop: vi.fn(),
    type: 'sine'
  }
  const gain = {
    exponentialRampToValueAtTime: vi.fn(),
    setValueAtTime: vi.fn()
  }
  const gainNode = {
    connect: vi.fn(),
    gain
  }

  return {
    close: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(() => gainNode),
    createOscillator: vi.fn(() => oscillator),
    currentTime: 2,
    destination: { label: 'destination' },
    gainNode,
    oscillator,
    resume: vi.fn().mockResolvedValue(undefined)
  }
}

describe('createSoundEffects', () => {
  it('plays configured sound for a known event', () => {
    const context = createFakeAudioContext()
    const soundEffects = createSoundEffects({
      audioContextFactory: () => context
    })

    const result = soundEffects.play(SOUND_EVENTS.eat)

    expect(result).toBe(true)
    expect(context.resume).toHaveBeenCalledTimes(1)
    expect(context.createOscillator).toHaveBeenCalledTimes(1)
    expect(context.createGain).toHaveBeenCalledTimes(1)
    expect(context.oscillator.type).toBe(SOUND_EFFECTS[SOUND_EVENTS.eat].type)
    expect(context.oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(
      SOUND_EFFECTS[SOUND_EVENTS.eat].frequency,
      context.currentTime
    )
    expect(context.oscillator.start).toHaveBeenCalledWith(context.currentTime)
  })

  it('returns false safely when audio context is unavailable', () => {
    const soundEffects = createSoundEffects({
      audioContextFactory: () => null
    })

    expect(() => soundEffects.resume()).not.toThrow()
    expect(soundEffects.play(SOUND_EVENTS.start)).toBe(false)
    expect(soundEffects.play('unknown-event')).toBe(false)
    expect(() => soundEffects.destroy()).not.toThrow()
  })

  it('handles runtime audio errors without throwing', () => {
    const context = createFakeAudioContext()
    context.resume = vi.fn().mockRejectedValue(new Error('blocked'))
    context.createOscillator = vi.fn(() => {
      throw new Error('oscillator failed')
    })

    const soundEffects = createSoundEffects({
      audioContextFactory: () => context
    })

    expect(() => soundEffects.resume()).not.toThrow()
    expect(() => soundEffects.play(SOUND_EVENTS.collision)).not.toThrow()
    expect(soundEffects.play(SOUND_EVENTS.collision)).toBe(false)
  })
})
