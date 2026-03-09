import { describe, expect, it } from 'vitest'
import { getNextLoopIndex, togglePlaybackState } from './audioEngine'

describe('togglePlaybackState', () => {
  it('switches paused to playing', () => {
    expect(togglePlaybackState(false)).toBe(true)
  })

  it('switches playing to paused', () => {
    expect(togglePlaybackState(true)).toBe(false)
  })
})

describe('getNextLoopIndex', () => {
  it('advances and wraps with total length', () => {
    expect(getNextLoopIndex(0, 4)).toBe(1)
    expect(getNextLoopIndex(3, 4)).toBe(0)
  })

  it('returns zero when total is not positive', () => {
    expect(getNextLoopIndex(9, 0)).toBe(0)
  })
})
