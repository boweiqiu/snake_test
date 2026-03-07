export const GRID_SIZE = 20
export const BASE_TICK_MS = 150
export const SLOW_TIME_STEP_MS = 20
export const GROWTH_PACK_SIZE = 2

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

export const SHOP_ITEM_IDS = {
  coinMultiplier: 'coin_multiplier',
  growthPack: 'growth_pack',
  shield: 'shield',
  slowTime: 'slow_time'
}

export const SHOP_ITEMS = [
  {
    id: SHOP_ITEM_IDS.coinMultiplier,
    name: 'Coin Multiplier',
    cost: 5,
    description: 'Each bean gives +1 coin permanently.'
  },
  {
    id: SHOP_ITEM_IDS.growthPack,
    name: 'Growth Pack',
    cost: 4,
    description: `Gain ${GROWTH_PACK_SIZE} free growth ticks.`
  },
  {
    id: SHOP_ITEM_IDS.shield,
    name: 'Safety Shield',
    cost: 6,
    description: 'Negate one fatal collision.'
  },
  {
    id: SHOP_ITEM_IDS.slowTime,
    name: 'Slow Time',
    cost: 7,
    description: 'Reduce snake speed permanently.'
  }
]

export const MAX_COIN_MULTIPLIER = 4
export const MAX_SLOW_LEVEL = 4

export const INITIAL_ECONOMY = {
  money: 0,
  coinMultiplier: 1,
  pendingGrowth: 0,
  shields: 0,
  slowLevel: 0
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

export function getTickMs(slowLevel, baseTickMs = BASE_TICK_MS) {
  return baseTickMs + slowLevel * SLOW_TIME_STEP_MS
}

export function canPurchaseItem(economy, itemId) {
  const item = SHOP_ITEMS.find((entry) => entry.id === itemId)
  if (!item || economy.money < item.cost) {
    return false
  }

  if (itemId === SHOP_ITEM_IDS.coinMultiplier) {
    return economy.coinMultiplier < MAX_COIN_MULTIPLIER
  }

  if (itemId === SHOP_ITEM_IDS.slowTime) {
    return economy.slowLevel < MAX_SLOW_LEVEL
  }

  return true
}

export function purchaseItem(economy, itemId) {
  if (!canPurchaseItem(economy, itemId)) {
    return economy
  }

  const item = SHOP_ITEMS.find((entry) => entry.id === itemId)
  const nextEconomy = {
    ...economy,
    money: economy.money - item.cost
  }

  if (itemId === SHOP_ITEM_IDS.coinMultiplier) {
    nextEconomy.coinMultiplier += 1
    return nextEconomy
  }

  if (itemId === SHOP_ITEM_IDS.growthPack) {
    nextEconomy.pendingGrowth += GROWTH_PACK_SIZE
    return nextEconomy
  }

  if (itemId === SHOP_ITEM_IDS.shield) {
    nextEconomy.shields += 1
    return nextEconomy
  }

  if (itemId === SHOP_ITEM_IDS.slowTime) {
    nextEconomy.slowLevel += 1
    return nextEconomy
  }

  return nextEconomy
}
