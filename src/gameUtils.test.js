import { describe, expect, it } from 'vitest'
import { hasCollision, spawnFood, stepSnake } from './gameUtils'

describe('stepSnake', () => {
  it('moves forward without growth', () => {
    const snake = [
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 0, y: 2 }
    ]

    const next = stepSnake(snake, { x: 1, y: 0 }, false)

    expect(next).toEqual([
      { x: 3, y: 2 },
      { x: 2, y: 2 },
      { x: 1, y: 2 }
    ])
  })

  it('grows when shouldGrow is true', () => {
    const snake = [
      { x: 2, y: 2 },
      { x: 1, y: 2 }
    ]

    const next = stepSnake(snake, { x: 0, y: 1 }, true)

    expect(next).toEqual([
      { x: 2, y: 3 },
      { x: 2, y: 2 },
      { x: 1, y: 2 }
    ])
  })
})

describe('hasCollision', () => {
  it('detects wall collision', () => {
    expect(hasCollision([{ x: -1, y: 0 }, { x: 0, y: 0 }], 20)).toBe(true)
  })

  it('detects self collision', () => {
    const snake = [
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 2, y: 2 }
    ]

    expect(hasCollision(snake, 20)).toBe(true)
  })
})

describe('spawnFood', () => {
  it('retries until it finds a free cell', () => {
    const snake = [
      { x: 0, y: 0 },
      { x: 1, y: 0 }
    ]

    const randomValues = [0, 0, 0.1, 0]
    let index = 0

    const food = spawnFood(snake, 20, () => {
      const value = randomValues[index]
      index += 1
      return value
    })

    expect(food).toEqual({ x: 2, y: 0 })
  })

  it('returns null when board is full', () => {
    const snake = [{ x: 0, y: 0 }]
    expect(spawnFood(snake, 1)).toBeNull()
  })
})
