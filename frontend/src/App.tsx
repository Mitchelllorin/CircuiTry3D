import React, { useEffect, useMemo, useRef, useState } from 'react'

// Simple Ohm's law API client
async function fetchOhmsLaw(params: { voltage?: number; current?: number; resistance?: number }) {
  const res = await fetch('/api/ohms?'+ new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined)) as Record<string, string>
  ))
  if (!res.ok) throw new Error(`Backend error ${res.status}`)
  return res.json() as Promise<{ voltage: number; current: number; resistance: number; power: number }>
}

export function App() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [values, setValues] = useState({ voltage: 5, resistance: 100, current: undefined as number | undefined })
  const [result, setResult] = useState<{ voltage: number; current: number; resistance: number; power: number } | null>(null)

  const handleCalculate = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchOhmsLaw(values)
      setResult(data)
    } catch (e: any) {
      setError(e.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // initial compute
    handleCalculate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#fff', background: 'linear-gradient(135deg,#1a1a2e,#16213e)', minHeight: '100vh', padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>CircuiTry3D</h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>React + Three.js frontend with Spring Boot backend</p>

      <div style={{ display: 'grid', gap: 12, maxWidth: 640 }}>
        <label>
          <span>Voltage (E, V)</span>
          <input type="number" value={values.voltage}
                 onChange={(e)=>setValues(v=>({...v, voltage: Number(e.target.value)}))}
                 style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #444', background: '#111', color: '#fff' }} />
        </label>
        <label>
          <span>Resistance (R, Ω)</span>
          <input type="number" value={values.resistance}
                 onChange={(e)=>setValues(v=>({...v, resistance: Number(e.target.value)}))}
                 style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #444', background: '#111', color: '#fff' }} />
        </label>
        <label>
          <span>Current (I, A) – optional</span>
          <input type="number" value={values.current ?? ''}
                 onChange={(e)=>setValues(v=>({...v, current: e.target.value === '' ? undefined : Number(e.target.value)}))}
                 style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #444', background: '#111', color: '#fff' }} />
        </label>

        <button onClick={handleCalculate} disabled={loading}
                style={{ padding: '10px 16px', borderRadius: 10, background: '#00ff88', color: '#000', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
          {loading ? 'Calculating…' : 'Calculate'}
        </button>
        {error && <div style={{ color: '#ff6666' }}>Error: {error}</div>}
        {result && (
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 12, padding: 12 }}>
            <div>Voltage: <b>{result.voltage.toFixed(2)} V</b></div>
            <div>Current: <b>{result.current.toFixed(4)} A</b></div>
            <div>Resistance: <b>{Number.isFinite(result.resistance) ? result.resistance.toFixed(2) : '∞'} Ω</b></div>
            <div>Power: <b>{result.power.toFixed(3)} W</b></div>
          </div>
        )}

        <a href="/prototype.html" style={{ color: '#00ff88', marginTop: 8 }}>Open legacy prototype</a>
      </div>

      <div style={{ marginTop: 24 }}>
        <ThreeCanvas />
      </div>
    </div>
  )
}

function ThreeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let unmounted = false
    async function init() {
      try {
        const THREE = await import('three')
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0x0a0a1a)
        const camera = new THREE.PerspectiveCamera(75, 16/9, 0.1, 1000)
        camera.position.set(0, 2, 5)
        const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current!, antialias: true })
        renderer.setSize(640, 360)

        const ambient = new THREE.AmbientLight(0x404040, 0.6)
        scene.add(ambient)
        const dir = new THREE.DirectionalLight(0xffffff, 1.0)
        dir.position.set(10, 10, 5)
        scene.add(dir)

        const geometry = new THREE.TorusKnotGeometry(0.8, 0.25, 120, 16)
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff88, metalness: 0.2, roughness: 0.3 })
        const mesh = new THREE.Mesh(geometry, material)
        scene.add(mesh)

        function animate() {
          if (unmounted) return
          requestAnimationFrame(animate)
          mesh.rotation.y += 0.01
          renderer.render(scene, camera)
        }
        animate()
        setReady(true)
      } catch (e: any) {
        setError(e.message || 'WebGL initialization failed')
      }
    }
    init()
    return () => { unmounted = true }
  }, [])

  return (
    <div>
      <canvas ref={canvasRef} width={640} height={360} style={{ width: 640, height: 360, border: '1px solid #222', borderRadius: 8 }} />
      {error && <div style={{ color: '#ff6666' }}>Three.js error: {error}</div>}
      {!error && !ready && <div style={{ color: '#aaa' }}>Loading 3D…</div>}
    </div>
  )
}
