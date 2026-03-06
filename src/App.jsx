import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  DIRECTIONS,
  GRID_SIZE,
  hasCollision,
  isOppositeDirection,
  spawnFood,
  stepSnake
} from './gameUtils'

const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 }
]
const INITIAL_DIRECTION = DIRECTIONS.ArrowRight
const TICK_MS = 150

function buildCellMap(snake, food) {
  const map = new Map()
  snake.forEach((segment, index) => {
    map.set(`${segment.x},${segment.y}`, index === 0 ? 'head' : 'body')
  })

  if (food) {
    map.set(`${food.x},${food.y}`, 'food')
  }

  return map
}

function App() {
  const [snake, setSnake] = useState(INITIAL_SNAKE)
  const [direction, setDirection] = useState(INITIAL_DIRECTION)
  const [queuedDirection, setQueuedDirection] = useState(INITIAL_DIRECTION)
  const [food, setFood] = useState(() => spawnFood(INITIAL_SNAKE))
  const [score, setScore] = useState(0)
  const [isGameOver, setIsGameOver] = useState(false)

  useEffect(() => {
    function onKeyDown(event) {
      const next = DIRECTIONS[event.key]
      if (!next || isGameOver) {
        return
      }

      setQueuedDirection((currentQueued) => {
        if (isOppositeDirection(direction, next) || isOppositeDirection(currentQueued, next)) {
          return currentQueued
        }

        return next
      })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [direction, isGameOver])

  useEffect(() => {
    if (isGameOver) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setSnake((currentSnake) => {
        const activeDirection = queuedDirection
        setDirection(activeDirection)

        const currentHead = currentSnake[0]
        const willEatFood =
          food &&
          currentHead.x + activeDirection.x === food.x &&
          currentHead.y + activeDirection.y === food.y

        const nextSnake = stepSnake(currentSnake, activeDirection, willEatFood)

        if (hasCollision(nextSnake, GRID_SIZE)) {
          setIsGameOver(true)
          return currentSnake
        }

        if (willEatFood) {
          setScore((value) => value + 1)
          setFood(spawnFood(nextSnake, GRID_SIZE))
        }

        return nextSnake
      })
    }, TICK_MS)

    return () => window.clearInterval(timerId)
  }, [food, isGameOver, queuedDirection])

  const cells = useMemo(() => {
    const map = buildCellMap(snake, food)
    const result = []
    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        result.push({ key: `${x},${y}`, type: map.get(`${x},${y}`) || 'empty' })
      }
    }
    return result
  }, [snake, food])

  function resetGame() {
    setSnake(INITIAL_SNAKE)
    setDirection(INITIAL_DIRECTION)
    setQueuedDirection(INITIAL_DIRECTION)
    setFood(spawnFood(INITIAL_SNAKE, GRID_SIZE))
    setScore(0)
    setIsGameOver(false)
  }

  return (
    <main className="app">
      <h1>Snake 1.0</h1>
      <p className="instructions">Use arrow keys or WASD to move.</p>
      <div className="hud">
        <span>Score: {score}</span>
        {isGameOver && <strong className="game-over">Game Over</strong>}
      </div>

      <section className="board" aria-label="snake-board">
        {cells.map((cell) => (
          <div
            key={cell.key}
            className={`cell cell--${cell.type}`}
            aria-hidden="true"
          />
        ))}
      </section>

      <button type="button" onClick={resetGame} className="restart">
        Restart
      </button>
    </main>
  )
}

export default App
