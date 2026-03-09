import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
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
import { SOUND_EVENTS, createSoundEffects } from './soundEffects'

extend({ ThreeOrbitControls })

const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 }
]
const INITIAL_DIRECTION = DIRECTIONS.ArrowRight
const TICK_MS = 150
const CELL_SIZE = 0.9
const BOARD_SIZE = GRID_SIZE * CELL_SIZE
const FLOOR_Y = -0.24
const GRID_LINE_THICKNESS = 0.02
const WALL_THICKNESS = 0.12
const BOARD_EXTENT = BOARD_SIZE / 2
const GRID_LINE_COORDS = Array.from(
  { length: GRID_SIZE + 1 },
  (_, index) => index * CELL_SIZE - BOARD_EXTENT
)

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
function toWorldPosition(segment) {
  return {
    x: segment.x * CELL_SIZE - BOARD_EXTENT + CELL_SIZE / 2,
    z: segment.y * CELL_SIZE - BOARD_EXTENT + CELL_SIZE / 2
  }
}

function FoodMesh({ food }) {
  const meshRef = useRef(null)
  const { x, z } = toWorldPosition(food)

  useFrame(({ clock }) => {
    if (!meshRef.current) {
      return
    }

    const pulse = 1 + Math.sin(clock.getElapsedTime() * 4) * 0.12
    meshRef.current.scale.setScalar(pulse)
    meshRef.current.rotation.y += 0.02
  })

  return (
    <mesh ref={meshRef} position={[x, 0.34, z]} castShadow>
      <icosahedronGeometry args={[CELL_SIZE * 0.27, 1]} />
      <meshStandardMaterial
        color="#f97316"
        emissive="#ea580c"
        emissiveIntensity={0.35}
        roughness={0.28}
      />
    </mesh>
  )
}

function SnakeSegment({ segment, isHead }) {
  const { x, z } = toWorldPosition(segment)
  const height = isHead ? 0.72 : 0.56

  return (
    <mesh
      position={[x, FLOOR_Y + GRID_LINE_THICKNESS + height / 2, z]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[CELL_SIZE * 0.78, height, CELL_SIZE * 0.78]} />
      <meshStandardMaterial
        color={isHead ? '#22c55e' : '#15803d'}
        emissive={isHead ? '#14532d' : '#052e16'}
        emissiveIntensity={0.4}
        roughness={0.24}
        metalness={0.28}
      />
    </mesh>
  )
}

function Arena() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, FLOOR_Y, 0]}>
        <planeGeometry args={[BOARD_SIZE + 1.2, BOARD_SIZE + 1.2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.92} metalness={0.06} />
      </mesh>

      {GRID_LINE_COORDS.map((coord) => (
        <mesh key={`x-${coord}`} position={[coord, FLOOR_Y + 0.001, 0]} receiveShadow>
          <boxGeometry args={[GRID_LINE_THICKNESS, GRID_LINE_THICKNESS, BOARD_SIZE]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      ))}

      {GRID_LINE_COORDS.map((coord) => (
        <mesh key={`z-${coord}`} position={[0, FLOOR_Y + 0.001, coord]} receiveShadow>
          <boxGeometry args={[BOARD_SIZE, GRID_LINE_THICKNESS, GRID_LINE_THICKNESS]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      ))}

      <mesh
        position={[0, FLOOR_Y + 0.42, -BOARD_EXTENT - WALL_THICKNESS / 2]}
        receiveShadow
      >
        <boxGeometry args={[BOARD_SIZE + WALL_THICKNESS, 0.86, WALL_THICKNESS]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh
        position={[0, FLOOR_Y + 0.42, BOARD_EXTENT + WALL_THICKNESS / 2]}
        receiveShadow
      >
        <boxGeometry args={[BOARD_SIZE + WALL_THICKNESS, 0.86, WALL_THICKNESS]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh
        position={[-BOARD_EXTENT - WALL_THICKNESS / 2, FLOOR_Y + 0.42, 0]}
        receiveShadow
      >
        <boxGeometry args={[WALL_THICKNESS, 0.86, BOARD_SIZE + WALL_THICKNESS]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh
        position={[BOARD_EXTENT + WALL_THICKNESS / 2, FLOOR_Y + 0.42, 0]}
        receiveShadow
      >
        <boxGeometry args={[WALL_THICKNESS, 0.86, BOARD_SIZE + WALL_THICKNESS]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </group>
  )
}

function CameraControls() {
  const controlsRef = useRef(null)
  const { camera, gl } = useThree()

  useFrame(() => {
    controlsRef.current?.update()
  })

  return (
    <threeOrbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      enablePan={false}
      enableDamping
      dampingFactor={0.07}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 2.05}
      minDistance={11}
      maxDistance={24}
    />
  )
}

function SnakeScene({ snake, food }) {
  return (
    <Canvas
      shadows
      camera={{ position: [11.5, 13.5, 12], fov: 42, near: 0.1, far: 80 }}
      dpr={[1, 1.8]}
    >
      <color attach="background" args={['#0b1220']} />
      <ambientLight intensity={0.5} />
      <hemisphereLight intensity={0.36} groundColor="#0f172a" />
      <directionalLight
        position={[7, 14, 5]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-8, 6, -6]} intensity={0.35} />
      <Arena />
      {snake.map((segment, index) => (
        <SnakeSegment
          key={`${segment.x}-${segment.y}-${index}`}
          segment={segment}
          isHead={index === 0}
        />
      ))}
      {food && <FoodMesh food={food} />}
      <CameraControls />
    </Canvas>
  )
}

function App() {
  const [snake, setSnake] = useState(INITIAL_SNAKE)
  const [direction, setDirection] = useState(INITIAL_DIRECTION)
  const [queuedDirection, setQueuedDirection] = useState(INITIAL_DIRECTION)
  const [food, setFood] = useState(() => spawnFood(INITIAL_SNAKE))
  const [score, setScore] = useState(0)
  const [isGameOver, setIsGameOver] = useState(false)
  const [economy, setEconomy] = useState(INITIAL_ECONOMY)
  const soundEffectsRef = useRef(null)
  const startCuePlayedRef = useRef(false)

  const tickMs = useMemo(() => getTickMs(economy.slowLevel), [economy.slowLevel])

  useEffect(() => {
    soundEffectsRef.current = createSoundEffects()

    return () => {
      soundEffectsRef.current?.destroy()
      soundEffectsRef.current = null
    }
  }, [])

  useEffect(() => {
    if (isGameOver) {
      startCuePlayedRef.current = false
      return
    }

    if (startCuePlayedRef.current) {
      return
    }

    soundEffectsRef.current?.play(SOUND_EVENTS.start)
    startCuePlayedRef.current = true
  }, [isGameOver])

  useEffect(() => {
    function onKeyDown(event) {
      const next = DIRECTIONS[event.key]
      if (!next || isGameOver) {
        return
      }

      soundEffectsRef.current?.resume()

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
          soundEffectsRef.current?.play(SOUND_EVENTS.collision)

          if (economy.shields > 0) {
            setEconomy((value) => ({ ...value, shields: Math.max(0, value.shields - 1) }))
            return currentSnake
          }

          soundEffectsRef.current?.play(SOUND_EVENTS.gameOver)
          setIsGameOver(true)
          return currentSnake
        }

        if (economy.pendingGrowth > 0) {
          setEconomy((value) => ({ ...value, pendingGrowth: value.pendingGrowth - 1 }))
        }

        if (willEatFood) {
          soundEffectsRef.current?.play(SOUND_EVENTS.eat)
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
    const cellMap = buildCellMap(snake, food)
    const nextCells = []

    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const type = cellMap.get(`${x},${y}`) ?? 'empty'
        nextCells.push({ key: `${x}-${y}`, type })
      }
    }

    return nextCells
  }, [snake, food])
  const occupiedCellCount = useMemo(() => buildCellMap(snake, food).size, [snake, food])

  function buyItem(itemId) {
    if (isGameOver) {
      return
    }

    setEconomy((value) => purchaseItem(value, itemId))
  }

  function resetGame() {
    const shouldPlayStartImmediately = !isGameOver

    setSnake(INITIAL_SNAKE)
    setDirection(INITIAL_DIRECTION)
    setQueuedDirection(INITIAL_DIRECTION)
    setFood(spawnFood(INITIAL_SNAKE, GRID_SIZE))
    setScore(0)
    setEconomy(INITIAL_ECONOMY)
    setIsGameOver(false)

    if (shouldPlayStartImmediately) {
      soundEffectsRef.current?.play(SOUND_EVENTS.start)
      startCuePlayedRef.current = true
    } else {
      startCuePlayedRef.current = false
    }
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
      <h1>Snake 3D</h1>
      <p className="instructions">Use arrow keys or WASD to move. Drag to orbit camera.</p>
      <div className="hud">
        <span>Score: {score}</span>
        <span>Occupied: {occupiedCellCount}</span>
        {isGameOver && <strong className="game-over">Game Over</strong>}
      </div>

      <section className="scene-shell" aria-label="snake-board">
        <SnakeScene snake={snake} food={food} />
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
