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
const EVENT_NOTICE_MS = 1100
const STAR_COUNT = 120

function getDirectionYaw(direction) {
  if (direction.x === 1) {
    return -Math.PI / 2
  }

  if (direction.x === -1) {
    return Math.PI / 2
  }

  if (direction.y === 1) {
    return Math.PI
  }

  return 0
}

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
  const haloRef = useRef(null)
  const { x, z } = toWorldPosition(food)

  useFrame(({ clock }) => {
    if (!meshRef.current) {
      return
    }

    const elapsed = clock.getElapsedTime()
    const pulse = 1 + Math.sin(elapsed * 4) * 0.12
    meshRef.current.scale.setScalar(pulse)
    meshRef.current.rotation.y += 0.02

    if (haloRef.current) {
      const haloScale = 1 + Math.sin(elapsed * 3.2) * 0.08
      haloRef.current.scale.setScalar(haloScale)
      haloRef.current.rotation.z += 0.01
    }
  })

  return (
    <group position={[x, 0.34, z]}>
      <mesh ref={meshRef} castShadow>
        <icosahedronGeometry args={[CELL_SIZE * 0.27, 1]} />
        <meshStandardMaterial
          color="#f97316"
          emissive="#ea580c"
          emissiveIntensity={0.35}
          roughness={0.28}
        />
      </mesh>
      <mesh ref={haloRef} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[CELL_SIZE * 0.35, CELL_SIZE * 0.045, 8, 32]} />
        <meshStandardMaterial color="#fb923c" emissive="#fb923c" emissiveIntensity={0.7} />
      </mesh>
    </group>
  )
}

function SnakeSegment({ segment, isHead, direction }) {
  const meshRef = useRef(null)
  const { x, z } = toWorldPosition(segment)
  const height = isHead ? 0.72 : 0.56
  const yaw = isHead ? getDirectionYaw(direction) : 0

  useFrame(({ clock }) => {
    if (!meshRef.current) {
      return
    }

    const elapsed = clock.getElapsedTime()
    const pulse = isHead
      ? 1 + Math.sin(elapsed * 6) * 0.05
      : 1 + Math.sin(elapsed * 3 + segment.x * 0.31 + segment.y * 0.47) * 0.02
    meshRef.current.scale.set(1, pulse, 1)
  })

  return (
    <mesh
      ref={meshRef}
      position={[x, FLOOR_Y + GRID_LINE_THICKNESS + height / 2, z]}
      rotation={[0, yaw, 0]}
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
      {isHead && (
        <>
          <mesh position={[-CELL_SIZE * 0.13, CELL_SIZE * 0.11, CELL_SIZE * 0.22]}>
            <sphereGeometry args={[CELL_SIZE * 0.07, 10, 10]} />
            <meshStandardMaterial color="#ffffff" emissive="#bfdbfe" emissiveIntensity={0.9} />
          </mesh>
          <mesh position={[CELL_SIZE * 0.13, CELL_SIZE * 0.11, CELL_SIZE * 0.22]}>
            <sphereGeometry args={[CELL_SIZE * 0.07, 10, 10]} />
            <meshStandardMaterial color="#ffffff" emissive="#bfdbfe" emissiveIntensity={0.9} />
          </mesh>
        </>
      )}
    </mesh>
  )
}

function StarField() {
  const pointsRef = useRef(null)
  const stars = useMemo(() => {
    const coordinates = new Float32Array(STAR_COUNT * 3)
    for (let index = 0; index < STAR_COUNT; index += 1) {
      const i = index * 3
      coordinates[i] = (Math.random() - 0.5) * 44
      coordinates[i + 1] = 5 + Math.random() * 14
      coordinates[i + 2] = (Math.random() - 0.5) * 44
    }
    return coordinates
  }, [])

  useFrame(({ clock }) => {
    if (!pointsRef.current) {
      return
    }

    const elapsed = clock.getElapsedTime()
    pointsRef.current.rotation.y = elapsed * 0.02
    pointsRef.current.position.y = Math.sin(elapsed * 0.4) * 0.2
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={stars.length / 3} array={stars} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#7dd3fc" size={0.14} sizeAttenuation transparent opacity={0.85} />
    </points>
  )
}

function BoardAura() {
  const auraRef = useRef(null)

  useFrame(({ clock }) => {
    if (!auraRef.current) {
      return
    }

    auraRef.current.material.emissiveIntensity = 0.45 + Math.sin(clock.getElapsedTime() * 2.5) * 0.12
  })

  return (
    <group>
      <mesh
        ref={auraRef}
        position={[0, FLOOR_Y + 0.86, -BOARD_EXTENT - WALL_THICKNESS / 2]}
      >
        <boxGeometry args={[BOARD_SIZE + WALL_THICKNESS, 0.07, 0.06]} />
        <meshStandardMaterial color="#0b3b1f" emissive="#22c55e" emissiveIntensity={0.48} />
      </mesh>
      <mesh position={[0, FLOOR_Y + 0.86, BOARD_EXTENT + WALL_THICKNESS / 2]}>
        <boxGeometry args={[BOARD_SIZE + WALL_THICKNESS, 0.07, 0.06]} />
        <meshStandardMaterial color="#0b3b1f" emissive="#22c55e" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[-BOARD_EXTENT - WALL_THICKNESS / 2, FLOOR_Y + 0.86, 0]}>
        <boxGeometry args={[0.06, 0.07, BOARD_SIZE + WALL_THICKNESS]} />
        <meshStandardMaterial color="#0b3b1f" emissive="#22c55e" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[BOARD_EXTENT + WALL_THICKNESS / 2, FLOOR_Y + 0.86, 0]}>
        <boxGeometry args={[0.06, 0.07, BOARD_SIZE + WALL_THICKNESS]} />
        <meshStandardMaterial color="#0b3b1f" emissive="#22c55e" emissiveIntensity={0.35} />
      </mesh>
    </group>
  )
}

function PulseWave({ color, trigger, y = FLOOR_Y + 0.03 }) {
  const meshRef = useRef(null)
  const materialRef = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    startRef.current = null
    if (meshRef.current) {
      meshRef.current.visible = true
    }
  }, [trigger])

  useFrame(({ clock }) => {
    if (!meshRef.current || !materialRef.current) {
      return
    }

    if (startRef.current === null) {
      startRef.current = clock.getElapsedTime()
    }

    const elapsed = clock.getElapsedTime() - startRef.current
    const duration = 0.72
    const progress = Math.min(1, elapsed / duration)
    const scale = 0.35 + progress * 2.1

    meshRef.current.scale.set(scale, scale, scale)
    materialRef.current.opacity = 0.42 * (1 - progress)
    meshRef.current.visible = progress < 1
  })

  return (
    <mesh ref={meshRef} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[BOARD_SIZE * 0.14, BOARD_SIZE * 0.2, 56]} />
      <meshBasicMaterial
        ref={materialRef}
        color={color}
        transparent
        opacity={0.36}
        depthWrite={false}
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
      <BoardAura />
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

function SnakeScene({ snake, food, direction, foodPulse, shieldPulse }) {
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
      <StarField />
      <Arena />
      {snake.map((segment, index) => (
        <SnakeSegment
          key={`${segment.x}-${segment.y}-${index}`}
          segment={segment}
          isHead={index === 0}
          direction={direction}
        />
      ))}
      {food && <FoodMesh food={food} />}
      <PulseWave color="#22d3ee" trigger={foodPulse} />
      <PulseWave color="#f59e0b" trigger={shieldPulse} y={FLOOR_Y + 0.08} />
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
  const [eventNotice, setEventNotice] = useState(null)
  const [foodPulse, setFoodPulse] = useState(0)
  const [shieldPulse, setShieldPulse] = useState(0)

  const tickMs = useMemo(() => getTickMs(economy.slowLevel), [economy.slowLevel])

  useEffect(() => {
    if (!eventNotice) {
      return undefined
    }

    const timerId = window.setTimeout(() => {
      setEventNotice(null)
    }, EVENT_NOTICE_MS)

    return () => window.clearTimeout(timerId)
  }, [eventNotice])

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
            setShieldPulse((value) => value + 1)
            setEventNotice({
              id: `${Date.now()}-shield`,
              type: 'shield',
              text: 'Shield absorbed a fatal collision'
            })
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
          setFoodPulse((value) => value + 1)
          setEventNotice({
            id: `${Date.now()}-food`,
            type: 'food',
            text: `Bean collected +$${economy.coinMultiplier}`
          })
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
    setSnake(INITIAL_SNAKE)
    setDirection(INITIAL_DIRECTION)
    setQueuedDirection(INITIAL_DIRECTION)
    setFood(spawnFood(INITIAL_SNAKE, GRID_SIZE))
    setScore(0)
    setEconomy(INITIAL_ECONOMY)
    setEventNotice(null)
    setFoodPulse(0)
    setShieldPulse(0)
    setIsGameOver(false)
  }

  return (
    <main className="app">
      <h1>Snake 2.0</h1>
      <p className="instructions">Use arrow keys or WASD to move. Buy buffs while playing and watch live visual cues.</p>
      <div className="hud hud--primary">
        <span>Score: {score}</span>
        <span>Money: ${economy.money}</span>
        <span>Speed: {tickMs}ms</span>
        {isGameOver && <strong className="game-over">Game Over</strong>}
      </div>

      <div className="buffs" aria-label="active-buffs">
        <span className="buff-pill">Multiplier x{economy.coinMultiplier}</span>
        <span className="buff-pill">Queued Growth {economy.pendingGrowth}</span>
        <span className={`buff-pill ${economy.shields > 0 ? 'buff-pill--active' : ''}`}>Shields {economy.shields}</span>
      </div>

      <section className="board" aria-label="tactical-mini-board">
        {cells.map((cell) => (
          <div
            key={cell.key}
            className={`cell cell--${cell.type}`}
            aria-hidden="true"
          />
        ))}
      </section>
      <h2 className="scene-title">Snake 3D Arena</h2>
      <p className="instructions">Use arrow keys or WASD to move. Drag to orbit camera.</p>
      <div className="hud">
        <span>Score: {score}</span>
        <span>Occupied: {occupiedCellCount}</span>
        <span>Grid Fill: {Math.round((occupiedCellCount / (GRID_SIZE * GRID_SIZE)) * 100)}%</span>
        {isGameOver && <strong className="game-over">Game Over</strong>}
      </div>

      {eventNotice && (
        <div key={eventNotice.id} className={`event-notice event-notice--${eventNotice.type}`}>
          {eventNotice.text}
        </div>
      )}

      <section className="scene-shell" aria-label="snake-board">
        <SnakeScene
          snake={snake}
          food={food}
          direction={direction}
          foodPulse={foodPulse}
          shieldPulse={shieldPulse}
        />
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
