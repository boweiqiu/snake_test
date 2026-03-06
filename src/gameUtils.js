export const GRID_SIZE = 20

export const DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
  W: { x: 0, y: -1 },
  S: { x: 0, y: 1 },
  A: { x: -1, y: 0 },
  D: { x: 1, y: 0 }
}

export function isOppositeDirection(current, next) {
  return current.x + next.x === 0 && current.y + next.y === 0
}

export function stepSnake(snake, direction, shouldGrow) {
  const head = snake[0]
  const nextHead = { x: head.x + direction.x, y: head.y + direction.y }
  const nextSnake = [nextHead, ...snake]

  if (!shouldGrow) {
    nextSnake.pop()
  }

  return nextSnake
}

export function hasCollision(snake, gridSize = GRID_SIZE) {
  const [head, ...body] = snake

  if (
    head.x < 0 ||
    head.y < 0 ||
    head.x >= gridSize ||
    head.y >= gridSize
  ) {
    return true
  }

  return body.some((segment) => segment.x === head.x && segment.y === head.y)
}

export function spawnFood(snake, gridSize = GRID_SIZE, randomFn = Math.random) {
  if (snake.length >= gridSize * gridSize) {
    return null
  }

  while (true) {
    const x = Math.floor(randomFn() * gridSize)
    const y = Math.floor(randomFn() * gridSize)
    const overlapsSnake = snake.some((segment) => segment.x === x && segment.y === y)

    if (!overlapsSnake) {
      return { x, y }
    }
  }
}
