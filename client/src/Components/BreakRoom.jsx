import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'

const GRID_SIZE = 9
const MOLES = ['🚰', '💡', '🪟', '🚿', '🛁', '🔌']
const TOOLS = ['🔧', '🪛', '🔨', '🪚', '🔩']

const LEVELS = [
  { label: 'Easy',   duration: 30, spawnMs: 1200, showMs: 1800 },
  { label: 'Medium', duration: 30, spawnMs: 800,  showMs: 1200 },
  { label: 'Hard',   duration: 30, spawnMs: 500,  showMs: 800  },
]

export default function BreakRoom({ taskerId }) {
  const [levelIdx, setLevelIdx]       = useState(0)
  const [gameState, setGameState]     = useState('idle')
  const [score, setScore]             = useState(0)
  const [misses, setMisses]           = useState(0)
  const [timeLeft, setTimeLeft]       = useState(LEVELS[0].duration)
  const [cells, setCells]             = useState(Array(GRID_SIZE).fill(null))
  const [hitIdx, setHitIdx]           = useState(null)
  const [highScore, setHighScore]     = useState(null)
  const [combo, setCombo]             = useState(0)
  const [comboFlash, setComboFlash]   = useState(false)
  const [savingScore, setSavingScore] = useState(false)

  // Ref mirrors cells so spawnMole can read current state without stale closures
  const cellsRef    = useRef(Array(GRID_SIZE).fill(null))
  const moleTimers  = useRef({})
  const timerRef    = useRef(null)
  const spawnRef    = useRef(null)
  const scoreRef    = useRef(0)
  const level       = LEVELS[levelIdx]

  // Keep scoreRef in sync for endGame closure
  useEffect(() => { scoreRef.current = score }, [score])

  // Load personal best
  useEffect(() => {
    if (!taskerId) return
    supabase
      .from('tasker_game_scores')
      .select('score')
      .eq('tasker_id', taskerId)
      .order('score', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => { if (data) setHighScore(data.score) })
  }, [taskerId])

  function setCell(idx, value) {
    cellsRef.current[idx] = value
    setCells([...cellsRef.current])
  }

  function resetCells() {
    cellsRef.current = Array(GRID_SIZE).fill(null)
    setCells(Array(GRID_SIZE).fill(null))
  }

  const endGame = useCallback(() => {
    clearInterval(timerRef.current)
    clearInterval(spawnRef.current)
    Object.values(moleTimers.current).forEach(clearTimeout)
    moleTimers.current = {}
    resetCells()
    setGameState('over')

    const finalScore = scoreRef.current
    if (!taskerId || finalScore === 0) return
    setSavingScore(true)
    supabase
      .from('tasker_game_scores')
      .insert({ tasker_id: taskerId, score: finalScore, level: LEVELS[levelIdx].label })
      .then(() => {
        setHighScore((prev) => (prev === null || finalScore > prev ? finalScore : prev))
        setSavingScore(false)
      })
  }, [taskerId, levelIdx])

  const spawnMole = useCallback(() => {
    // Read directly from ref — no stale closure issues
    const emptyIdxs = cellsRef.current
      .map((c, i) => (c === null ? i : -1))
      .filter((i) => i !== -1)

    if (emptyIdxs.length === 0) return

    const idx  = emptyIdxs[Math.floor(Math.random() * emptyIdxs.length)]
    const mole = {
      emoji: MOLES[Math.floor(Math.random() * MOLES.length)],
      tool:  TOOLS[Math.floor(Math.random() * TOOLS.length)],
      id:    Date.now() + Math.random(),
    }

    setCell(idx, mole)

    // Auto-hide after showMs
    moleTimers.current[idx] = setTimeout(() => {
      if (cellsRef.current[idx]?.id === mole.id) {
        setCell(idx, null)
        setMisses((m) => m + 1)
        setCombo(0)
      }
      delete moleTimers.current[idx]
    }, level.showMs)
  }, [level.showMs])

  const startGame = () => {
    Object.values(moleTimers.current).forEach(clearTimeout)
    moleTimers.current = {}
    resetCells()
    scoreRef.current = 0
    setScore(0)
    setMisses(0)
    setCombo(0)
    setHitIdx(null)
    setTimeLeft(level.duration)
    setGameState('playing')
  }

  // Countdown timer
  useEffect(() => {
    if (gameState !== 'playing') return
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { endGame(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [gameState, endGame])

  // Spawner
  useEffect(() => {
    if (gameState !== 'playing') return
    // Spawn one immediately then on interval
    spawnMole()
    spawnRef.current = setInterval(spawnMole, level.spawnMs)
    return () => clearInterval(spawnRef.current)
  }, [gameState, spawnMole, level.spawnMs])

  const whack = (idx) => {
    if (gameState !== 'playing') return
    const cell = cellsRef.current[idx]
    if (!cell) return

    clearTimeout(moleTimers.current[idx])
    delete moleTimers.current[idx]
    setCell(idx, null)

    setHitIdx(idx)
    setTimeout(() => setHitIdx(null), 250)

    setCombo((prev) => {
      const next = prev + 1
      if (next >= 3) setComboFlash(true)
      setTimeout(() => setComboFlash(false), 400)
      return next
    })
    setScore((s) => {
      const pts = combo >= 2 ? 2 : 1
      scoreRef.current = s + pts
      return s + pts
    })
  }

  const timerColor = timeLeft <= 5
    ? 'text-red-500 animate-pulse'
    : timeLeft <= 10 ? 'text-orange-400' : 'text-gray-700'

  return (
    <div className="max-w-lg mx-auto px-2 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🎮</span>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Break Room</h2>
          <p className="text-xs text-gray-400">Fix It Fast — tap the broken fixtures before they disappear!</p>
        </div>
      </div>

      {/* Personal best */}
      {highScore !== null && (
        <div className="mb-4 flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 w-fit">
          <span className="text-lg">🏆</span>
          <span className="text-sm font-bold text-yellow-700">Personal Best: {highScore} pts</span>
        </div>
      )}

      {/* Level selector */}
      {gameState !== 'playing' && (
        <div className="flex gap-2 mb-5">
          {LEVELS.map((l, i) => (
            <button
              key={l.label}
              onClick={() => { setLevelIdx(i); setTimeLeft(l.duration) }}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                levelIdx === i
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}

      {/* Game over */}
      {gameState === 'over' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5 text-center">
          <p className="text-4xl mb-2">🛠️</p>
          <h3 className="text-xl font-bold text-gray-800 mb-1">Time's Up!</h3>
          <p className="text-3xl font-black text-orange-500 mb-1">{score} pts</p>
          <p className="text-xs text-gray-400 mb-2">{misses} missed</p>
          {savingScore && <p className="text-xs text-gray-400 mb-2">Saving score…</p>}
          {score > 0 && highScore !== null && score >= highScore && (
            <p className="text-sm font-bold text-yellow-600 mb-3">🏆 New personal best!</p>
          )}
          <button
            onClick={startGame}
            className="mt-2 px-8 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors"
          >
            Play Again
          </button>
        </div>
      )}

      {/* HUD */}
      {gameState === 'playing' && (
        <div className="grid grid-cols-4 mb-4 bg-white rounded-xl shadow-sm border border-gray-100 divide-x divide-gray-100">
          <div className="text-center py-3 px-1">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Score</p>
            <p className="text-lg sm:text-2xl font-black text-orange-500">{score}</p>
          </div>
          <div className="text-center py-3 px-1">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Time</p>
            <p className={`text-lg sm:text-2xl font-black ${timerColor}`}>{timeLeft}s</p>
          </div>
          <div className="text-center py-3 px-1">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Combo</p>
            <p className={`text-lg sm:text-2xl font-black transition-all ${comboFlash ? 'text-yellow-400 scale-125' : 'text-gray-700'}`}>
              {combo >= 3 ? `x${combo}🔥` : combo > 0 ? `x${combo}` : '—'}
            </p>
          </div>
          <div className="text-center py-3 px-1">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Missed</p>
            <p className="text-lg sm:text-2xl font-black text-red-400">{misses}</p>
          </div>
        </div>
      )}

      {/* Grid */}
      {gameState !== 'idle' && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {cells.map((cell, idx) => (
            <button
              key={idx}
              onClick={() => whack(idx)}
              className={`relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-150 select-none
                ${cell
                  ? 'bg-orange-50 border-orange-400 shadow-md scale-105 cursor-pointer active:scale-90'
                  : 'bg-gray-50 border-gray-200 cursor-default'
                }
                ${hitIdx === idx ? 'bg-green-100 border-green-400 scale-90' : ''}
              `}
            >
              {cell ? (
                <>
                  <span className="text-4xl leading-none">{cell.emoji}</span>
                  <span className="text-xl mt-1">{cell.tool}</span>
                </>
              ) : (
                <span className="text-3xl opacity-20">🏠</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Start screen */}
      {gameState === 'idle' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-5xl mb-3">🔧</p>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Fix It Fast!</h3>
          <p className="text-sm text-gray-500 mb-1">Broken fixtures pop up — tap them before they vanish!</p>
          <p className="text-xs text-gray-400 mb-5">3+ hits in a row = combo bonus 🔥</p>
          <button
            onClick={startGame}
            className="px-10 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-lg transition-colors shadow-md"
          >
            Start Game
          </button>
        </div>
      )}
    </div>
  )
}
