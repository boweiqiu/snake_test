import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  DIRECTIONS,
  GRID_SIZE,
  INITIAL_ECONOMY,
  MAX_COIN_MULTIPLIER,
  MAX_SLOW_LEVEL,
  SHOP_ITEM_IDS,
  SHOP_ITEMS,
  canPurchaseItem,
  getTickMs,
  hasCollision,
  isOppositeDirection,
  purchaseItem,
  spawnFood,
  stepSnake
} from './gameUtils'

const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 }
]
const INITIAL_DIRECTION = DIRECTIONS.ArrowRight

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

function isItemMaxed(economy, itemId) {
  if (itemId === SHOP_ITEM_IDS.coinMultiplier) {
    return economy.coinMultiplier >= MAX_COIN_MULTIPLIER
  }

  if (itemId === SHOP_ITEM_IDS.slowTime) {
    return economy.slowLevel >= MAX_SLOW_LEVEL
  }

  return false
}

function getItemProgress(economy, itemId) {
  if (itemId === SHOP_ITEM_IDS.coinMultiplier) {
    return `Lv ${economy.coinMultiplier}/${MAX_COIN_MULTIPLIER}`
  }

  if (itemId === SHOP_ITEM_IDS.slowTime) {
    return `Lv ${economy.slowLevel}/${MAX_SLOW_LEVEL}`
  }

  return 'Repeatable'
}

function App() {
  const [snake, setSnake] = useState(INITIAL_SNAKE)
  const [direction, setDirection] = useState(INITIAL_DIRECTION)
  const [queuedDirection, setQueuedDirection] = useState(INITIAL_DIRECTION)
  const [food, setFood] = useState(() => spawnFood(INITIAL_SNAKE))
  const [score, setScore] = useState(0)
  const [isGameOver, setIsGameOver] = useState(false)
  const [economy, setEconomy] = useState(INITIAL_ECONOMY)

  const tickMs = useMemo(() => getTickMs(economy.slowLevel), [economy.slowLevel])

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
        const nextHead = {
          x: currentHead.x + activeDirection.x,
          y: currentHead.y + activeDirection.y
        }
        const willEatFood = food && nextHead.x === food.x && nextHead.y === food.y
        const shouldGrow = willEatFood || economy.pendingGrowth > 0
        const nextSnake = stepSnake(currentSnake, activeDirection, shouldGrow)

        if (hasCollision(nextSnake, GRID_SIZE)) {
          if (economy.shields > 0) {
            setEconomy((value) => ({ ...value, shields: Math.max(0, value.shields - 1) }))
            return currentSnake
          }

          setIsGameOver(true)
          return currentSnake
        }

        if (economy.pendingGrowth > 0) {
          setEconomy((value) => ({ ...value, pendingGrowth: value.pendingGrowth - 1 }))
        }

        if (willEatFood) {
          setScore((value) => value + 1)
          setEconomy((value) => ({ ...value, money: value.money + value.coinMultiplier }))
          setFood(spawnFood(nextSnake, GRID_SIZE))
        }

        return nextSnake
      })
    }, tickMs)

    return () => window.clearInterval(timerId)
  }, [economy.coinMultiplier, economy.pendingGrowth, economy.shields, food, isGameOver, queuedDirection, tickMs])

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

  function buyItem(itemId) {
    if (isGameOver) {
      return
    }

    setEconomy((value) => purchaseItem(value, itemId))
  }

  function resetGame() {
    setSnake(INITIAL_SNAKE)
    setDirection(INITIAL_DIRECTION)
    setQueuedDirection(INITIAL_DIRECTION)
    setFood(spawnFood(INITIAL_SNAKE, GRID_SIZE))
    setScore(0)
    setEconomy(INITIAL_ECONOMY)
    setIsGameOver(false)
  }

  return (
    <main className="app">
      <h1>Snake 2.0</h1>
      <p className="instructions">Use arrow keys or WASD to move. Buy buffs while playing.</p>
      <div className="hud">
        <span>Score: {score}</span>
        <span>Money: ${economy.money}</span>
        <span>Speed: {tickMs}ms</span>
        {isGameOver && <strong className="game-over">Game Over</strong>}
      </div>

      <div className="buffs" aria-label="active-buffs">
        <span>Multiplier x{economy.coinMultiplier}</span>
        <span>Queued Growth {economy.pendingGrowth}</span>
        <span>Shields {economy.shields}</span>
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

      <section className="shop" aria-label="shop">
        <h2>Shop</h2>
        <div className="shop-grid">
          {SHOP_ITEMS.map((item) => {
            const maxed = isItemMaxed(economy, item.id)
            const canBuy = canPurchaseItem(economy, item.id)

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => buyItem(item.id)}
                disabled={isGameOver || !canBuy}
                className="shop-item"
              >
                <span className="shop-item__name">{item.name}</span>
                <span className="shop-item__desc">{item.description}</span>
                <span className="shop-item__meta">Cost ${item.cost} · {getItemProgress(economy, item.id)}</span>
                <strong className="shop-item__action">{maxed ? 'Maxed' : 'Buy'}</strong>
              </button>
            )
          })}
        </div>
      </section>

      <button type="button" onClick={resetGame} className="restart">
        Restart
      </button>
    </main>
  )
}

export default App
