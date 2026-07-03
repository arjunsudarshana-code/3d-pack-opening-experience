import React, { useState, useRef, useEffect, useMemo, Suspense } from 'react' // 👈 Suspense එකතු කළා
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Center, Stage, useTexture, ContactShadows, Html, useProgress } from '@react-three/drei' // 👈 Html, useProgress එකතු කළා
import { Box as SciFiBox } from './Box'
import * as THREE from 'three'
import { BackgroundParticles, CyberBackgroundRings } from './CyberEnvironment'

const RARITY_PRESETS = {
  1: { label: 'COMMON', color: '#9e9e9e', particleCount: 100, glow: 1.0 },
  2: { label: 'UNCOMMON', color: '#00ff66', particleCount: 180, glow: 1.6 },
  3: { label: 'RARE', color: '#00d2ff', particleCount: 260, glow: 2.4 },
  4: { label: 'EPIC', color: '#bf55ec', particleCount: 380, glow: 3.5 },
  5: { label: 'LEGENDARY', color: '#ffd700', particleCount: 550, glow: 5.0 }
}

const REWARDS_POOL = [
  { name: 'TITAN CARBON KNIFE', rarity: 1, texPrefix: 'carbon' },
  { name: 'MATRIX PHANTOM SMG', rarity: 2, texPrefix: 'matrix' },
  { name: 'CHRONO CYBER SHOTGUN', rarity: 3, texPrefix: 'chrono' },
  { name: 'PLASMA APEX PISTOL', rarity: 4, texPrefix: 'apex' },
  { name: 'GOLDEN VULCAN RIFLE', rarity: 5, texPrefix: 'vulcan' },
]

const BG_WIDTH  = 16.5   
const BG_HEIGHT = 9.28   
const BG_X =  0.0  
const BG_Y =  1.12 
const BG_Z = -3.2  

function CyberBackgroundPlane() {
  const bgTexture = useTexture('/cyber-bg.jpg')
  useEffect(() => {
    if (bgTexture) {
      bgTexture.colorSpace = THREE.SRGBColorSpace
      bgTexture.needsUpdate = true
    }
  }, [bgTexture])
  return (
    <mesh position={[BG_X, BG_Y, BG_Z]}>
      <planeGeometry args={[BG_WIDTH, BG_HEIGHT]} />
      <meshBasicMaterial map={bgTexture} toneMapped={false} fog={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

function SmokeParticles({ packState, themeColor }) {
  const pointsRef = useRef()
  const matRef = useRef()
  const count = 40 

  const smokeTex = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)')
    gradient.addColorStop(0.3, 'rgba(200, 200, 200, 0.3)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(canvas)
  }, [])

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = 0
      pos[i * 3 + 1] = 0.4
      pos[i * 3 + 2] = 0
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos((Math.random() * 2) - 1)
      const speed = 0.8 + Math.random() * 1.5 
      vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed
      vel[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed * 0.5 + 0.5 
      vel[i * 3 + 2] = Math.cos(phi) * speed
    }
    return [pos, vel]
  }, [count])

  const smokeTime = useRef(0)

  useEffect(() => {
    if (packState === 'OPENED') {
      smokeTime.current = performance.now() / 1000
      if (pointsRef.current) {
        const posAttr = pointsRef.current.geometry.attributes.position
        for (let i = 0; i < count * 3; i += 3) {
          posAttr.array[i] = 0
          posAttr.array[i + 1] = 0.4
          posAttr.array[i + 2] = 0
        }
        posAttr.needsUpdate = true
      }
    }
  }, [packState])

  useFrame((state) => {
    if (!pointsRef.current) return
    if (packState !== 'OPENED' && packState !== 'REVEAL') {
      if (matRef.current) matRef.current.opacity = 0
      return
    }
    const elapsed = state.clock.getElapsedTime() - smokeTime.current
    if (elapsed > 1.5) {
      if (matRef.current) matRef.current.opacity = 0
      return
    }
    const posAttr = pointsRef.current.geometry.attributes.position
    for (let i = 0; i < count; i++) {
      posAttr.array[i * 3] += velocities[i * 3] * 0.016
      posAttr.array[i * 3 + 1] += velocities[i * 3 + 1] * 0.016
      posAttr.array[i * 3 + 2] += velocities[i * 3 + 2] * 0.016
      velocities[i * 3] *= 0.95
      velocities[i * 3 + 1] *= 0.95
      velocities[i * 3 + 2] *= 0.95
    }
    posAttr.needsUpdate = true
    if (matRef.current) {
      matRef.current.size = 0.4 + elapsed * 1.5
      matRef.current.opacity = THREE.MathUtils.clamp(0.6 * (1 - (elapsed / 1.4)), 0, 0.6)
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial ref={matRef} map={smokeTex} color={themeColor} size={0.4} transparent={true} opacity={0} blending={THREE.NormalBlending} depthWrite={false} />
    </points>
  )
}

function CyberFloor() {
  const [diffuseMap, normalMap, roughnessMap] = useTexture(['/floor-diffuse.jpg', '/floor-normal.jpg', '/floor-roughness.jpg'])
  useEffect(() => {
    if (diffuseMap && normalMap && roughnessMap) {
      ;[diffuseMap, normalMap, roughnessMap].forEach((tex) => {
        tex.wrapS = THREE.RepeatWrapping
        tex.wrapT = THREE.RepeatWrapping
        tex.repeat.set(15, 15)
      })
      diffuseMap.colorSpace = THREE.SRGBColorSpace
      diffuseMap.needsUpdate = true
      normalMap.needsUpdate = true
      roughnessMap.needsUpdate = true
    }
  }, [diffuseMap, normalMap, roughnessMap])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.45, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial map={diffuseMap} normalMap={normalMap} roughnessMap={roughnessMap} color="#ffffff" metalness={0.6} roughness={0.2} />
    </mesh>
  )
}

function BoxHighlights({ themeColor, packState }) {
  const lightRef1 = useRef()
  const lightRef2 = useRef()
  const lightRef3 = useRef()
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    let baseIntensity = 2.0 + Math.sin(time * 4) * 0.5
    if (packState === 'OPENED' || packState === 'REVEAL') baseIntensity = 45.0 + Math.sin(time * 8) * 5.0
    if (lightRef1.current) lightRef1.current.intensity = baseIntensity
    if (lightRef2.current) lightRef2.current.intensity = baseIntensity * 0.6
    if (lightRef3.current) lightRef3.current.intensity = baseIntensity * 0.6
  })
  return (
    <group position={[0, 0.1, 0]}>
      <pointLight ref={lightRef1} position={[0, 0, 0]} color={themeColor} distance={15} decay={1.2} castShadow />
      <group position={[-2.4, 0, -0.2]}><pointLight ref={lightRef2} color={themeColor} distance={4} decay={1.3} castShadow /></group>
      <group position={[2.4, 0, -0.2]}><pointLight ref={lightRef3} color={themeColor} distance={4} decay={1.3} castShadow /></group>
    </group>
  )
}

function InteractiveScene({ children, packState }) {
  const sceneGroupRef = useRef()
  useFrame((state) => {
    if (!sceneGroupRef.current) return
    const swayIntensityX = packState === 'REVEAL' ? 0.03 : 0.18
    const swayIntensityY = packState === 'REVEAL' ? 0.02 : 0.12
    sceneGroupRef.current.rotation.y = THREE.MathUtils.lerp(sceneGroupRef.current.rotation.y, state.pointer.x * swayIntensityX, 0.05)
    sceneGroupRef.current.rotation.x = THREE.MathUtils.lerp(sceneGroupRef.current.rotation.x, -state.pointer.y * swayIntensityY, 0.05)
  })
  return <group ref={sceneGroupRef}>{children}</group>
}

// 💥 CINEMATIC 3D EXPLOSION PULSE[cite: 8]
function BurstParticles({ packState, themeColor }) {
  const pointsRef = useRef()
  const matRef = useRef()
  const count = 350 
  
  const particles = useMemo(() => {
    const pArr = []
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      pArr.push({
        x: 0, y: 0.4, z: 0,
        vx: Math.cos(angle) * (2.0 + Math.random() * 4.0),
        vy: Math.sin(angle) * (2.0 + Math.random() * 4.0) + 1.5,
        vz: 6.5 + Math.random() * 9.5, 
        targetX: (Math.random() - 0.5) * 1.5,
        targetY: 0.6 + (Math.random() - 0.5) * 2.2,
        targetZ: 1.35,
        attractSpeed: 0.06 + Math.random() * 0.06
      })
    }
    return pArr
  }, [count])

  const burstTime = useRef(0)

  useEffect(() => {
    if (packState === 'OPENED') {
      burstTime.current = performance.now() / 1000
      if (pointsRef.current) {
        const posAttr = pointsRef.current.geometry.attributes.position
        for (let i = 0; i < count; i++) {
          posAttr.array[i * 3] = 0
          posAttr.array[i * 3 + 1] = 0.4
          posAttr.array[i * 3 + 2] = 0
        }
        posAttr.needsUpdate = true
      }
    }
  }, [packState])

  useFrame((state) => {
    if (!pointsRef.current) return
    if (packState !== 'OPENED' && packState !== 'REVEAL') {
      if (matRef.current) matRef.current.opacity = 0 
      return
    }
    const elapsed = state.clock.getElapsedTime() - burstTime.current
    if (elapsed > 1.8) {
      if (matRef.current) matRef.current.opacity = 0
      return
    }
    const posAttr = pointsRef.current.geometry.attributes.position
    for (let i = 0; i < count; i++) {
      const p = particles[i]
      if (elapsed < 0.45) {
        posAttr.array[i * 3] += p.vx * 0.016
        posAttr.array[i * 3 + 1] += p.vy * 0.016
        posAttr.array[i * 3 + 2] += p.vz * 0.016
      } else {
        posAttr.array[i * 3] += (p.targetX - posAttr.array[i * 3]) * p.attractSpeed
        posAttr.array[i * 3 + 1] += (p.targetY - posAttr.array[i * 3 + 1]) * p.attractSpeed
        posAttr.array[i * 3 + 2] += (p.targetZ - posAttr.array[i * 3 + 2]) * p.attractSpeed
      }
    }
    posAttr.needsUpdate = true
    if (matRef.current) matRef.current.opacity = THREE.MathUtils.clamp(1 - (elapsed / 1.6), 0, 1)
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array(count * 3), 3]} /></bufferGeometry>
      <pointsMaterial ref={matRef} color={themeColor} size={0.035} transparent={true} opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  )
}

function RewardCard({ packState, activeReward }) {
  const cardRef = useRef()
  const shaderRef = useRef() 
  const laserColor = useRef(new THREE.Color())

  const loadedTextures = useTexture({
    vulcanFront: '/vulcan-front.png', vulcanBack: '/vulcan-back.png',
    apexFront: '/apex-front.png', apexBack: '/apex-back.png',
    chronoFront: '/chrono-front.png', chronoBack: '/chrono-back.png',
    matrixFront: '/matrix-front.png', matrixBack: '/matrix-back.png',
    carbonFront: '/carbon-front.png', // 👈 මේ පේළිය අලුතෙන් එකතු කළා මචං
    carbonBack: '/carbon-back.png',   // 👈 මේ පේළියත් අලුතෙන් එකතු කළා මචං
  })

  const currentFrontTexture = loadedTextures[`${activeReward.texPrefix}Front`]
  const currentBackTexture = loadedTextures[`${activeReward.texPrefix}Back`]

  useEffect(() => {
    if (currentFrontTexture && currentBackTexture) {
      currentFrontTexture.colorSpace = THREE.SRGBColorSpace
      currentBackTexture.colorSpace = THREE.SRGBColorSpace
      currentFrontTexture.needsUpdate = true
      currentBackTexture.needsUpdate = true
    }
  }, [currentFrontTexture, currentBackTexture])

  const revealStartTime = useRef(0)
  const isRevealing = packState === 'OPENED' || packState === 'REVEAL' || packState === 'SKIPPED'
  const isDragging = useRef(false)
  const pointerStart = useRef({ x: 0, y: 0 })
  const dragRotation = useRef({ x: -0.1, y: 0 })

  useEffect(() => {
    if (isRevealing && revealStartTime.current === 0) {
      revealStartTime.current = clockRef.current ? clockRef.current.getElapsedTime() : performance.now() / 1000
    }
    if (packState === 'IDLE') {
      revealStartTime.current = 0
      dragRotation.current = { x: -0.1, y: 0 }
    }
  }, [packState, isRevealing])

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!isDragging.current || packState !== 'REVEAL') return
      dragRotation.current.y += (e.clientX - pointerStart.current.x) * 0.009 
      dragRotation.current.x += (e.clientY - pointerStart.current.y) * 0.009
      dragRotation.current.x = THREE.MathUtils.clamp(dragRotation.current.x, -Math.PI / 3, Math.PI / 3)
      pointerStart.current = { x: e.clientX, y: e.clientY }
    }
    const handlePointerUp = () => { isDragging.current = false }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => { window.removeEventListener('pointermove', handlePointerMove); window.removeEventListener('pointerup', handlePointerUp); }
  }, [packState])

  const clockRef = useRef(null)

  useFrame((state) => {
    if (!cardRef.current) return
    clockRef.current = state.clock
    const time = state.clock.getElapsedTime()

    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = time
      laserColor.current.set(activeReward.color)
      shaderRef.current.uniforms.uColor.value.copy(laserColor.current)
    }

    let targetPosition = new THREE.Vector3(0, 0.4, 0)
    let targetScale = new THREE.Vector3(0, 0, 0)
    let targetRotationY = 0
    let targetRotationX = 0

    if (isRevealing) {
      const elapsedTime = state.clock.getElapsedTime() - revealStartTime.current
      if (elapsedTime < 1.2) {
        targetRotationY = elapsedTime * 15 
        const progress = elapsedTime / 1.2
        const bounceScale = progress < 0.6 ? THREE.MathUtils.lerp(0, 1.25, progress / 0.6) : THREE.MathUtils.lerp(1.25, 1.0, (progress - 0.6) / 0.4)
        targetScale.set(bounceScale, bounceScale, bounceScale)
        targetPosition.set(0, 0.6, 1.35)
        dragRotation.current.y = targetRotationY
      } else {
        targetPosition.set(0, 0.6, 1.35)
        targetScale.set(1, 1, 1)
        if (packState === 'REVEAL') {
          targetRotationY = dragRotation.current.y
          targetRotationX = dragRotation.current.x
        } else {
          targetRotationY = Math.sin(time * 1.5) * 0.2
          targetRotationX = -0.1 + Math.cos(time * 1.0) * 0.05
          dragRotation.current.y = THREE.MathUtils.lerp(dragRotation.current.y, targetRotationY, 0.1)
          dragRotation.current.x = THREE.MathUtils.lerp(dragRotation.current.x, targetRotationX, 0.1)
        }
      }
      cardRef.current.position.lerp(targetPosition, 0.025)
      if (elapsedTime >= 1.2) {
        cardRef.current.scale.lerp(targetScale, 0.07)
        cardRef.current.rotation.x = THREE.MathUtils.lerp(cardRef.current.rotation.x, targetRotationX, 0.08)
        cardRef.current.rotation.y = THREE.MathUtils.lerp(cardRef.current.rotation.y, targetRotationY, 0.08)
      } else {
        cardRef.current.rotation.set(targetRotationX, targetRotationY, 0)
      }
    } else {
      cardRef.current.rotation.set(0, 0, 0)
      cardRef.current.position.copy(targetPosition)
      cardRef.current.scale.set(0, 0, 0)
    }
  })

  return (
    <group ref={cardRef} visible={isRevealing} onPointerDown={(e) => { if (packState === 'REVEAL') { e.stopPropagation(); isDragging.current = true; pointerStart.current = { x: e.clientX, y: e.clientY }; } }}>
      <pointLight position={[0, 0, 1.5]} color="#ffffff" intensity={5.0} distance={4} decay={1.5} />
      <pointLight position={[0, 0, -1.5]} color="#ffffff" intensity={5.0} distance={4} decay={1.5} />
      <mesh castShadow position={[0, 0, 0.003]}><planeGeometry args={[1.2, 1.8]} /><meshStandardMaterial map={currentFrontTexture} color="#ffffff" side={THREE.FrontSide} roughness={0.5} metalness={0.0} /></mesh>
      <mesh castShadow position={[0, 0, -0.003]} rotation={[0, Math.PI, 0]}><planeGeometry args={[1.2, 1.8]} /><meshStandardMaterial map={currentBackTexture} color="#ffffff" side={THREE.FrontSide} roughness={0.5} metalness={0.0} /></mesh>
      <mesh position={[0, 0, 0]}><planeGeometry args={[1.25, 1.85]} /><shaderMaterial ref={shaderRef} toneMapped={false} transparent blending={THREE.AdditiveBlending} side={THREE.DoubleSide} uniforms={{ uColor: { value: new THREE.Color() }, uTime: { value: 0 } }} vertexShader={`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`} fragmentShader={`varying vec2 vUv; uniform vec3 uColor; uniform float uTime; void main() { float angle = atan(vUv.y - 0.5, vUv.x - 0.5); float runningWave = sin(angle * 2.0 - uTime * 7.5) * 0.5 + 0.5; float neonGlow = pow(runningWave, 5.0) * 15.0 + runningWave * 2.5; gl_FragColor = vec4(uColor * neonGlow, 1.0); }`} /></mesh>
    </group>
  )
}
// 🎯 3D සීන් එක ඇත්තටම රෙන්ඩර් වෙලා ඉවරද කියලා බලන අලුත් Component එක
function SceneReadyTrigger({ onReady }) {
  useEffect(() => {
    // 3D ඇසෙට්ස් ඔක්කොම මවුන්ට් වුණු සැනින් ඇප් එකට ready කියලා සිග්නල් එක දෙනවා
    const timer = setTimeout(onReady, 50)
    return () => clearTimeout(timer)
  }, [onReady])
  return null
}

// ⏳ UPDATE කරපු ලෝඩර් එක (sceneReady ප්‍රොප් එක අනුව ක්ෂණිකව වහයි)
function CustomSceneLoader({ sceneReady }) {
  const { progress } = useProgress()
  const [smoothProgress, setSmoothProgress] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    let animationFrame
    const updateProgress = () => {
      setSmoothProgress((prev) => {
        if (prev < progress) {
          const next = prev + 3
          if (next >= 100) return 100
          animationFrame = requestAnimationFrame(updateProgress)
          return next
        }
        return prev
      })
    }
    animationFrame = requestAnimationFrame(updateProgress)
    return () => cancelAnimationFrame(animationFrame)
  }, [progress])

  // ⚡ 100% වෙලා, 3D බොක්ස් එක ඇත්තටම ස්ක්‍රීන් එකට ආපු සැනින් කෙළින්ම ලෝඩර් එක වසා දමයි
  useEffect(() => {
    if (smoothProgress === 100 && sceneReady) {
      setVisible(false)
    }
  }, [smoothProgress, sceneReady])

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: '#010103', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', zIndex: 99999,
      pointerEvents: 'none'
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(6, 5, 18, 0.85)', backdropFilter: 'blur(20px)', padding: '2.5rem 4rem',
        borderRadius: '24px', border: '1px solid rgba(0, 255, 102, 0.2)',
        boxShadow: '0 0 40px rgba(0, 255, 102, 0.15)', width: '350px', textAlign: 'center',
        fontFamily: '"Impact", "Arial Black", "Orbitron", sans-serif'
      }}>
        <h3 style={{ color: '#00ff66', margin: 0, fontSize: '1.4rem', letterSpacing: '3px', textTransform: 'uppercase', textShadow: '0 0 10px rgba(0, 255, 102, 0.6)' }}>
          INITIALIZING CORES...
        </h3>
        <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', marginTop: '1.5rem', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ width: `${smoothProgress}%`, height: '100%', background: 'linear-gradient(90deg, #00ff66, #00d2ff)', boxShadow: '0 0 12px #00ff66', transition: 'width 0.1s ease-out' }} />
        </div>
        <span style={{ color: '#ffffff', fontFamily: 'sans-serif', fontSize: '0.9rem', fontWeight: 'bold', marginTop: '0.8rem', opacity: 0.8, letterSpacing: '1px' }}>
          {Math.round(smoothProgress)}% LOADED
        </span>
      </div>
    </div>
  )
}

function App() {
  const [packState, setPackState] = useState('IDLE')
  const [sceneReady, setSceneReady] = useState(false)
  const [activeReward, setActiveReward] = useState(REWARDS_POOL[0])
  const currentPreset = useMemo(() => RARITY_PRESETS[activeReward.rarity], [activeReward])

  const openingAudioRef = useRef(null)
  const [volume, setVolume] = useState(0.5)
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    if (openingAudioRef.current) openingAudioRef.current.volume = isMuted ? 0 : volume
  }, [volume, isMuted])
  
  const handlePackClick = () => {
    if (packState === 'IDLE') {
      setActiveReward(REWARDS_POOL[Math.floor(Math.random() * REWARDS_POOL.length)])
      setPackState('OPENING')
      const clickAudio = new Audio('/box-click.mp3'); clickAudio.volume = isMuted ? 0 : volume; clickAudio.play().catch(e => {})
      openingAudioRef.current = new Audio('/box-open.mp3'); openingAudioRef.current.volume = isMuted ? 0 : volume; openingAudioRef.current.play().catch(e => {})
    }
  }

  const handleOpenComplete = () => {
    setPackState('OPENED')
    if (openingAudioRef.current) openingAudioRef.current.pause()
    const revealAudio = new Audio('/card-reveal.mp3'); revealAudio.volume = isMuted ? 0 : volume; revealAudio.play().catch(e => {})
    setTimeout(() => setPackState('REVEAL'), 1500)
  }

  const handleReset = () => {
    if (openingAudioRef.current) { openingAudioRef.current.pause(); openingAudioRef.current.time = 0; }
    setPackState('IDLE')
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: (packState === 'REVEAL' || packState === 'OPENED') ? `radial-gradient(circle at center, ${currentPreset.color}22 0%, #060512 65%, #010103 100%)` : 'radial-gradient(circle at center, #16113a 0%, #060512 55%, #010103 100%)', overflow: 'hidden', transition: 'background 0.8s ease-in-out' }}>
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 100, background: 'rgba(255, 255, 255, 0.07)', backdropFilter: 'blur(10px)', padding: '10px 15px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', gap: '12px', color: '#fff', fontFamily: 'sans-serif' }}>
        <button onClick={() => setIsMuted(!isMuted)} style={{ background: 'none', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', color: isMuted ? '#ff4a4a' : '#00ff66', transition: 'all 0.2s', letterSpacing: '1px' }}>{isMuted ? '🔇 MUTED' : '🔊 SOUND'}</button>
        <input type="range" min="0" max="1" step="0.05" value={volume} disabled={isMuted} onChange={(e) => setVolume(parseFloat(e.target.value))} style={{ accentColor: '#00d2ff', cursor: 'pointer', width: '70px', opacity: isMuted ? 0.3 : 1 }} />
      </div>
      
      <Canvas shadows camera={{ position: [0.08, 0.00, 6.17], fov: 45 }}>
        {/* ⚡ Suspense එක මෙතනින් ස්ටාර්ට් කරන්න මචං */}
        <Suspense fallback={null}> {/* 👈 මෙතන fallback එක null කරන්න මචං */}
           <SceneReadyTrigger onReady={() => setSceneReady(true)} />
          
          <fog attach="fog" args={['#060512', 4, 9.5]} />
          <ambientLight intensity={0.05} />
        <fog attach="fog" args={['#060512', 4, 9.5]} />
        <ambientLight intensity={0.05} /> 
        <spotLight position={[0, 8, 3]} angle={0.55} penumbra={1} intensity={150} castShadow shadow-bias={-0.0001} />
        <pointLight position={[-1.2, -1.2, -1.8]} intensity={(packState === 'REVEAL' || packState === 'OPENED') ? 130 : 90} distance={8} color={(packState === 'REVEAL' || packState === 'OPENED') ? currentPreset.color : "#00f0ff"} />
        <pointLight position={[1.2, -1.2, -1.8]} intensity={(packState === 'REVEAL' || packState === 'OPENED') ? 130 : 90} distance={8} color={(packState === 'REVEAL' || packState === 'OPENED') ? currentPreset.color : "#ff6600"} />
        <pointLight position={[1.2, -1.2, -1.8]} intensity={90} distance={8} color="#ff6600" />

        <BackgroundParticles count={currentPreset.particleCount} themeColor={currentPreset.color} packState={packState} />
        <BurstParticles packState={packState} themeColor={currentPreset.color} />
        <SmokeParticles packState={packState} themeColor={currentPreset.color} />

        <Stage environment="night" intensity={0.5} adjustCamera={false}>
          <CyberBackgroundPlane />
          <InteractiveScene packState={packState}>
            <CyberBackgroundRings themeColor={currentPreset.color} packState={packState} />
            <BoxHighlights themeColor={currentPreset.color} packState={packState} />
            <Center><SciFiBox packState={packState} themeColor={currentPreset.color} onOpenComplete={handleOpenComplete} onPointerDown={handlePackClick} /></Center>
            <RewardCard packState={packState} activeReward={{ ...activeReward, ...currentPreset }} />
          </InteractiveScene>
        </Stage>
        <ContactShadows position={[0, -1.44, 0]} opacity={2} scale={12} blur={1.5} far={1.5} />
        <CyberFloor />
        </Suspense> {/* 👈 OrbitControls එකට උඩින් මෙතනින් Suspense එක ක්ලෝස් කරන්න මචං */}
        
        <OrbitControls enableRotate={false} enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2} />
      </Canvas>

      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', position: 'absolute', top: '2.5rem', left: 0 }}>
          <style>{`@keyframes textPopPulse { 0%, 100% { transform: scale(0.96); filter: drop-shadow(0 0 8px #00ff66aa); } 50% { transform: scale(1.05); filter: drop-shadow(0 0 25px #00ff66ef); } } @keyframes lockClickOpen { 0% { transform: scale(0.8) rotate(-15deg); } 30% { transform: scale(1.4) rotate(20deg); } 60% { transform: scale(1.1) rotate(-10deg); } 100% { transform: scale(1) rotate(0deg); } } .unlocking-container-active { display: flex; alignItems: center; gap: 12px; animation: textPopPulse 1.2s infinite ease-in-out; color: #00ff66 !important; } .animated-lock-icon { display: inline-block; animation: lockClickOpen 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }`}</style>
          <h1 style={{ color: '#ffffff', fontFamily: '"Impact", "Arial Black", "Orbitron", sans-serif', fontSize: packState === 'OPENING' ? '2.2rem' : '1.4rem', margin: 0, letterSpacing: '4px', textTransform: 'uppercase', WebkitTextStroke: packState === 'OPENING' ? '1.5px #003311' : '1px #505050', textShadow: `1px 1px 0px #000000, 2px 2px 0px #000000, 3px 3px 5px rgba(0, 0, 0, 0.9), 0px 0px 12px ${packState === 'IDLE' ? '#00d2ff' : currentPreset.color}aa`, transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
            {packState === 'IDLE' && "⚡ CLICK BOX TO UNBOX"}
            {packState === 'OPENING' && (<span className="unlocking-container-active"><span className="animated-lock-icon">🔓</span><span>UNLOCKING SECURITY CORE...</span></span>)}
            {(packState === 'OPENED' || packState === 'REVEAL') && "📦 CONTAINMENT STABLE"}
          </h1>
        </div>

        {packState === 'REVEAL' && (
          <div style={{ position: 'absolute', bottom: '6%', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(30px) saturate(180%)', WebkitBackdropFilter: 'blur(30px) saturate(180%)', padding: '2rem 4rem', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.22)', boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.15)', pointerEvents: 'auto', textAlign: 'center', zIndex: 1000, minWidth: '440px' }}>
            <style>{`@keyframes neonBlinkPulse { 0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px var(--neon-glow)) drop-shadow(0 0 30px var(--neon-glow)); } 50% { transform: scale(0.985); filter: drop-shadow(0 0 5px var(--neon-glow)) drop-shadow(0 0 12px var(--neon-glow)); } } .neon-pulse-text { animation: neonBlinkPulse 1.5s infinite ease-in-out; display: inline-block; }`}</style>
            <span style={{ color: '#ffffff', fontWeight: 'bold', letterSpacing: '5px', fontSize: '0.8rem', fontFamily: 'sans-serif', textTransform: 'uppercase', textShadow: `0 0 8px ${activeReward.color}, 0 0 20px ${activeReward.color}` }}>{activeReward.label}</span>
            {(() => {
              let fontColor = '#ffffff', strokeColor = '#222222';
              if (activeReward.texPrefix === 'chrono') { fontColor = '#00f0ff'; strokeColor = '#001a33'; }
              else if (activeReward.texPrefix === 'apex') { fontColor = '#e599ff'; strokeColor = '#2d0033'; }
              else if (activeReward.texPrefix === 'matrix') { fontColor = '#55ff99'; strokeColor = '#00260d'; }
              else if (activeReward.texPrefix === 'vulcan') { fontColor = '#ffd700'; strokeColor = '#332600'; }
              return <h2 className="neon-pulse-text" style={{ color: fontColor, fontFamily: '"Impact", "Arial Black", "Orbitron", sans-serif', fontSize: '2.1rem', marginTop: '0.5rem', marginBottom: '1.8rem', fontWeight: '900', letterSpacing: '1.5px', textTransform: 'uppercase', WebkitTextStroke: `1.5px ${strokeColor}`, textShadow: `1px 1px 0px ${strokeColor}, 2px 2px 0px #000000, 3px 3px 0px rgba(0, 0, 0, 0.85), 4px 4px 6px rgba(0, 0, 0, 0.95), 0px 0px 8px ${fontColor}88, 0px 0px 20px ${activeReward.color}aa`, '--neon-glow': activeReward.color, transition: 'all 0.3s ease' }}>{activeReward.name}</h2>
            })()}
            <button onClick={handleReset} style={{ background: '#ff1a1a', color: '#ffffff', border: 'none', padding: '1rem 3.8rem', borderRadius: '30px', fontWeight: 'bold', fontSize: '1.05rem', letterSpacing: '1px', cursor: 'pointer', fontFamily: 'sans-serif', boxShadow: '0 0 25px rgba(255, 26, 26, 0.5)', transition: 'all 0.2s ease' }} onMouseEnter={(e) => e.target.style.background = '#d90000'} onMouseLeave={(e) => e.target.style.background = '#ff1a1a'}>RESET PACK</button>
          </div>
        )}
      </div>
      <CustomSceneLoader sceneReady={sceneReady} /> {/* 👈 මේ විදිහට ප්‍රොප් එක පාස් කරන්න මචං */}
    </div>
  )
}

export default App