import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Center, Stage, useTexture } from '@react-three/drei'
import { Box as SciFiBox } from './Box'
import * as THREE from 'three'


// 👑 AAA GAMING 5-RARITY VISUAL PRESETS
const RARITY_PRESETS = {
  1: { label: 'COMMON', color: '#9e9e9e', particleCount: 100, glow: 1.0 },   // සාමාන්‍ය (සුදු/අළු)
  2: { label: 'UNCOMMON', color: '#00ff66', particleCount: 180, glow: 1.6 }, // සුවිශේෂී (නියෝන් කොළ)
  3: { label: 'RARE', color: '#00d2ff', particleCount: 260, glow: 2.4 },     // දුර්ලභ (සයිබර් නිල්)
  4: { label: 'EPIC', color: '#bf55ec', particleCount: 380, glow: 3.5 },     // අතිශය දුර්ලභ (පර්පල්)
  5: { label: 'LEGENDARY', color: '#ffd700', particleCount: 550, glow: 5.0 } // මිථ්‍යා ප්‍රමාණයේ (රන්වන් රන්)
}

// 📊 UPDATED REWARDS POOL USING THE 5 RARITIES
const REWARDS_POOL = [
  { name: 'TITAN CARBON KNIFE', rarity: 1, texPrefix: 'carbon' },
  { name: 'MATRIX PHANTOM SMG', rarity: 2, texPrefix: 'matrix' },
  { name: 'CHRONO CYBER SHOTGUN', rarity: 3, texPrefix: 'chrono' },
  { name: 'PLASMA APEX PISTOL', rarity: 4, texPrefix: 'apex' },
  { name: 'GOLDEN VULCAN RIFLE', rarity: 5, texPrefix: 'vulcan' },
]

// ========================================================
// 💨 NEW ADVANCED VFX: BILLBOARDED SMOKE BLAST COMPONENT
// කැමරාව කොහේ තිබ්බත් කැමරාව දෙසට මුහුණ ලා පිපිරී යන දුම් පටලය
// ========================================================
function SmokeParticles({ packState, themeColor }) {
  const pointsRef = useRef()
  const matRef = useRef()
  const count = 40 // දුම් කැදලි ප්‍රමාණය

  // 1. ඩයිනමික් ලෙස කෝඩ් එකෙන්ම Soft Circular Smoke Puff එකක් සාදා ගැනීම (No image needed)
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
    const tex = new THREE.CanvasTexture(canvas)
    return tex
  }, [])

  // 2. දුම් කැදලි වල ආරම්භක පිහිටීම් සහ ප්‍රසාරණය වන වේගයන් ගණනය කිරීම
  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      // පෙට්ටිය මැදින් දුම පටන් ගනී
      pos[i * 3] = 0
      pos[i * 3 + 1] = 0.4
      pos[i * 3 + 2] = 0

      // හතර අතටම වටකුරු හැඩයකින් දුම විසිවීමට (Spherical Expansion)
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos((Math.random() * 2) - 1)
      const speed = 0.8 + Math.random() * 1.5 // දුම පැතිරෙන වේගය

      vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed
      vel[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed * 0.5 + 0.5 // පොඩ්ඩක් උඩට වැඩිපුර යන්න
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
      // Position = Position + Velocity (දුම ඈතට පැතිරීම)
      posAttr.array[i * 3] += velocities[i * 3] * 0.016
      posAttr.array[i * 3 + 1] += velocities[i * 3 + 1] * 0.016
      posAttr.array[i * 3 + 2] += velocities[i * 3 + 2] * 0.016
      
      // දුම හෙමින් වාතයට මුසුවී වේගය අඩුවීම (Friction/Damping)
      velocities[i * 3] *= 0.95
      velocities[i * 3 + 1] *= 0.95
      velocities[i * 3 + 2] *= 0.95
    }
    posAttr.needsUpdate = true

    if (matRef.current) {
      // 📈 දුම ප්‍රසාරණය වෙද්දී සයිස් එක ලොකු කිරීම
      matRef.current.size = 0.4 + elapsed * 1.5
      // 📉 කාලය ගතවත්ම දුම හෙමින් මැකී යාම (Fade-out)
      matRef.current.opacity = THREE.MathUtils.clamp(0.6 * (1 - (elapsed / 1.4)), 0, 0.6)
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      {/* Three.js PointsMaterial එකෙන් දුම් කැදලි ඔටෝමැටිකවම හැමතිස්සෙම කැමරාව පැත්තට හරවා තබයි (Billboarding) */}
      <pointsMaterial 
        ref={matRef} 
        map={smokeTex}
        color={themeColor} // අයිටම් එකේ පාටට හීනියට ටින්ට් වේ
        size={0.4} 
        transparent={true} 
        opacity={0} 
        blending={THREE.NormalBlending} 
        depthWrite={false} 
      />
    </points>
  )
}

// 🌐 BACKGROUND FLOOR GRID
function CyberFloorGrid({ themeColor }) {
  return <gridHelper args={[40, 40, themeColor, '#141130']} position={[0, -0.75, 0]} opacity={0.35} transparent />
}

// 🌀 CYBER BACKGROUND RINGS
function CyberBackgroundRings({ themeColor }) {
  const ringRef1 = useRef()
  const ringRef2 = useRef()
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    if (ringRef1.current) ringRef1.current.rotation.z = time * 0.04
    if (ringRef2.current) ringRef2.current.rotation.z = -time * 0.02
  })
  return (
    <group position={[0, 0.4, -3.5]}>
      <mesh ref={ringRef1}>
        <torusGeometry args={[3.8, 0.015, 8, 64]} />
        <meshBasicMaterial color={themeColor} transparent opacity={0.15} wireframe />
      </mesh>
      <mesh ref={ringRef2} rotation={[0, 0, Math.PI / 4]}>
        <torusGeometry args={[4.8, 0.01, 6, 48]} />
        <meshBasicMaterial color={themeColor} transparent opacity={0.08} wireframe />
      </mesh>
    </group>
  )
}

// 🎥 INTERACTIVE SCENE WRAPPER (MOUSE PARALLAX / SWAY)[cite: 1]
function InteractiveScene({ children, packState }) {
  const sceneGroupRef = useRef()
  useFrame((state) => {
    if (!sceneGroupRef.current) return
    const swayIntensityX = packState === 'REVEAL' ? 0.03 : 0.18
    const swayIntensityY = packState === 'REVEAL' ? 0.02 : 0.12
    const targetRotationY = state.pointer.x * swayIntensityX
    const targetRotationX = -state.pointer.y * swayIntensityY
    sceneGroupRef.current.rotation.y = THREE.MathUtils.lerp(sceneGroupRef.current.rotation.y, targetRotationY, 0.05)
    sceneGroupRef.current.rotation.x = THREE.MathUtils.lerp(sceneGroupRef.current.rotation.x, targetRotationX, 0.05)
  })
  return <group ref={sceneGroupRef}>{children}</group>
}

// 💥 EXPLOSIVE PARTICLE BURST
function BurstParticles({ packState, themeColor }) {
  const pointsRef = useRef()
  const matRef = useRef()
  const count = 250 
  
  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = 0
      pos[i * 3 + 1] = 0.4
      pos[i * 3 + 2] = 0
      
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos((Math.random() * 2) - 1)
      const speed = 3.5 + Math.random() * 5.0 
      
      vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed       
      vel[i * 3 + 1] = (Math.sin(phi) * Math.sin(theta) * speed) + 3.0 
      vel[i * 3 + 2] = Math.cos(phi) * speed                     
    }
    return [pos, vel]
  }, [count])

  const burstTime = useRef(0)

  useEffect(() => {
    if (packState === 'OPENED') {
      burstTime.current = performance.now() / 1000
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
    const elapsed = state.clock.getElapsedTime() - burstTime.current
    if (elapsed > 1.6) {
      if (matRef.current) matRef.current.opacity = 0
      return
    }
    const posAttr = pointsRef.current.geometry.attributes.position
    for (let i = 0; i < count; i++) {
      posAttr.array[i * 3] += velocities[i * 3] * 0.016
      posAttr.array[i * 3 + 1] += velocities[i * 3 + 1] * 0.016
      posAttr.array[i * 3 + 2] += velocities[i * 3 + 2] * 0.016
      velocities[i * 3 + 1] -= 0.06 
    }
    posAttr.needsUpdate = true
    if (matRef.current) {
      matRef.current.opacity = THREE.MathUtils.clamp(1 - (elapsed / 1.4), 0, 1)
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial ref={matRef} color={themeColor} size={0.06} transparent={true} opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  )
}

// 🌌 BACKGROUND PARTICLES
function BackgroundParticles({ count = 150, themeColor }) {
  const pointsRef = useRef()
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10       
      positions[i * 3 + 1] = (Math.random() - 0.3) * 6   
      positions[i * 3 + 2] = (Math.random() - 0.7) * 8   
    }
    return positions
  }, [count])

  useFrame((state) => {
    if (!pointsRef.current) return
    const time = state.clock.getElapsedTime()
    pointsRef.current.rotation.y = time * 0.03
    pointsRef.current.rotation.x = Math.sin(time * 0.02) * 0.05
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[particlesPosition, 3]} />
      </bufferGeometry>
      <pointsMaterial color={themeColor} size={0.035} sizeAttenuation={true} transparent={true} opacity={0.3} blending={THREE.AdditiveBlending} />
    </points>
  )
}

// 👑 REWARD CARD COMPONENT
function RewardCard({ packState, activeReward }) {
  const cardRef = useRef()
  const glowRef = useRef()
  
  const loadedTextures = useTexture({
    vulcanFront: '/vulcan-front.png',
    vulcanBack: '/vulcan-back.png',
    apexFront: '/apex-front.png',
    apexBack: '/apex-back.png',
    chronoFront: '/chrono-front.png',
    chronoBack: '/chrono-back.png',
    matrixFront: '/matrix-front.png',
    matrixBack: '/matrix-back.png',
  })

  const currentFrontTexture = loadedTextures[`${activeReward.texPrefix}Front`]
  const currentBackTexture = loadedTextures[`${activeReward.texPrefix}Back`]

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

  const clockRef = useRef(null)

  useFrame((state) => {
    if (!cardRef.current) return
    clockRef.current = state.clock

    let targetPosition = new THREE.Vector3(0, 0.4, 0)
    let targetScale = new THREE.Vector3(0, 0, 0)
    let targetRotationY = 0
    let targetRotationX = 0
    let targetRotationZ = 0
    let currentEmissiveIntensity = 1.5

    if (isRevealing) {
      const elapsedTime = state.clock.getElapsedTime() - revealStartTime.current

      if (elapsedTime < 1.2) {
        targetRotationY = elapsedTime * 15 
        targetRotationZ = Math.sin(elapsedTime * 5) * 0.6
        currentEmissiveIntensity = 4.5 - (elapsedTime * 2.0) 

        const progress = elapsedTime / 1.2
        const bounceScale = progress < 0.6 
          ? THREE.MathUtils.lerp(0, 1.25, progress / 0.6) 
          : THREE.MathUtils.lerp(1.25, 1.0, (progress - 0.6) / 0.4)

        targetScale.set(bounceScale, bounceScale, bounceScale)
        targetPosition.set(0, 0.6, 1.35)
        dragRotation.current.y = targetRotationY
      } else {
        targetPosition.set(0, 0.6, 1.35)
        targetScale.set(1, 1, 1)

        if (packState === 'REVEAL') {
          targetRotationY = dragRotation.current.y
          targetRotationX = dragRotation.current.x
          targetRotationZ = 0
        } else {
          targetRotationY = Math.sin(state.clock.getElapsedTime() * 1.5) * 0.2
          targetRotationX = -0.1 + Math.cos(state.clock.getElapsedTime() * 1.0) * 0.05
          dragRotation.current.y = THREE.MathUtils.lerp(dragRotation.current.y, targetRotationY, 0.1)
          dragRotation.current.x = THREE.MathUtils.lerp(dragRotation.current.x, targetRotationX, 0.1)
        }
        currentEmissiveIntensity = 1.2 + Math.sin(state.clock.getElapsedTime() * 3) * 0.2
      }

      cardRef.current.position.lerp(targetPosition, 0.07)
      
      if (elapsedTime >= 1.2) {
        cardRef.current.scale.lerp(targetScale, 0.07)
        cardRef.current.rotation.x = THREE.MathUtils.lerp(cardRef.current.rotation.x, targetRotationX, 0.08)
        cardRef.current.rotation.y = THREE.MathUtils.lerp(cardRef.current.rotation.y, targetRotationY, 0.08)
        cardRef.current.rotation.z = THREE.MathUtils.lerp(cardRef.current.rotation.z, targetRotationZ, 0.08)
      } else {
        cardRef.current.rotation.set(targetRotationX, targetRotationY, targetRotationZ)
      }
    } else {
      cardRef.current.rotation.set(0, 0, 0)
      cardRef.current.position.copy(targetPosition)
      cardRef.current.scale.set(0, 0, 0)
    }

    if (glowRef.current && glowRef.current.material) {
      glowRef.current.material.emissiveIntensity = currentEmissiveIntensity
    }
  })

  return (
    <group 
      ref={cardRef} 
      visible={isRevealing}
      onPointerDown={(e) => {
        if (packState !== 'REVEAL') return
        e.stopPropagation()
        isDragging.current = true
        pointerStart.current = { x: e.clientX, y: e.clientY }
        e.target.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!isDragging.current || packState !== 'REVEAL') return
        e.stopPropagation()
        const deltaX = e.clientX - pointerStart.current.x
        const deltaY = e.clientY - pointerStart.current.y
        dragRotation.current.y += deltaX * 0.006 
        dragRotation.current.x += deltaY * 0.006
        dragRotation.current.x = THREE.MathUtils.clamp(dragRotation.current.x, -Math.PI / 3, Math.PI / 3)
        pointerStart.current = { x: e.clientX, y: e.clientY }
      }}
      onPointerUp={(e) => {
        if (packState !== 'REVEAL') return
        e.stopPropagation()
        isDragging.current = false
        e.target.releasePointerCapture(e.pointerId)
      }}
    >
      {/* FRONT SIDE */}
      <mesh castShadow position={[0, 0, 0.003]}>
        <planeGeometry args={[1.2, 1.8]} />
        <meshStandardMaterial map={currentFrontTexture} color="#ffffff" side={THREE.FrontSide} roughness={0.4} metalness={0.2} />
      </mesh>
      {/* BACK SIDE */}
      <mesh castShadow position={[0, 0, -0.003]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.2, 1.8]} />
        <meshStandardMaterial map={currentBackTexture} color="#ffffff" side={THREE.FrontSide} roughness={0.4} metalness={0.2} />
      </mesh>
      {/* DYNAMIC GLOW BACKPLATE */}
      <mesh ref={glowRef} position={[0, 0, 0]}>
        <planeGeometry args={[1.22, 1.82]} />
        <meshStandardMaterial color="#000000" emissive={activeReward.color} emissiveIntensity={1.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function App() {
  const [packState, setPackState] = useState('IDLE')
  const [activeReward, setActiveReward] = useState(REWARDS_POOL[0])
  
  // ⚡ මෙන්න මේ රේඛාව අලුතින්ම ඇතුළත් කරන්න මචං:
  const currentPreset = useMemo(() => RARITY_PRESETS[activeReward.rarity], [activeReward])
  
  const openingAudioRef = useRef(null)

  const handlePackClick = () => {
    if (packState === 'IDLE') {
      const randomIndex = Math.floor(Math.random() * REWARDS_POOL.length)
      setActiveReward(REWARDS_POOL[randomIndex])

      setPackState('OPENING')

      const clickAudio = new Audio('/box-click.mp3')
      clickAudio.volume = 0.6
      clickAudio.play().catch(e => console.log("Audio play blocked", e))

      openingAudioRef.current = new Audio('/box-open.mp3')
      openingAudioRef.current.volume = 0.5
      openingAudioRef.current.play().catch(e => console.log("Audio play blocked", e))
    }
  }

  const handleOpenComplete = () => {
    setPackState('OPENED')

    if (openingAudioRef.current) {
      openingAudioRef.current.pause()
    }

    const revealAudio = new Audio('/card-reveal.mp3')
    revealAudio.volume = 0.7
    revealAudio.play().catch(e => console.log("Audio play blocked", e))
    
    setTimeout(() => {
      setPackState('REVEAL')
    }, 1500)
  }

  const handleReset = () => {
    if (openingAudioRef.current) {
      openingAudioRef.current.pause()
      openingAudioRef.current.time = 0
    }
    setPackState('IDLE')
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh', 
      background: 'radial-gradient(circle at center, #16113a 0%, #060512 55%, #010103 100%)', 
      overflow: 'hidden' 
    }}>
      
      <Canvas camera={{ position: [0, 0.6, 7], fov: 45 }}>
        <ambientLight intensity={0.4} /> 
        
        <directionalLight 
          position={[0, 1.5, 3]} 
          intensity={packState === 'IDLE' ? 0.2 : 3.5} 
          color="#ffffff" 
          castShadow
        />
        <directionalLight 
          position={[0, 1.5, -3]} 
          intensity={packState === 'IDLE' ? 0 : 3.0} 
          color="#ffffff" 
        />

        <BackgroundParticles count={currentPreset.particleCount} themeColor={currentPreset.color} />
<BurstParticles packState={packState} themeColor={currentPreset.color} />

{/* ⚡ NEW SMOKE BLAST: තරු කැට පිපිරෙන සැනින්ම දුම් පටලයත් එකවරම ක්‍රියාත්මක වේ */}
<SmokeParticles packState={packState} themeColor={currentPreset.color} />

<Stage environment="night" intensity={0.5} adjustCamera={false}>
  
  <InteractiveScene packState={packState}>
    <CyberFloorGrid themeColor={currentPreset.color} />
    <CyberBackgroundRings themeColor={currentPreset.color} />

    <Center>
      <SciFiBox 
        packState={packState} 
        onOpenComplete={handleOpenComplete}
        onPointerDown={handlePackClick} 
      />
    </Center>
    
    {/* ⚡ RewardCard එකට දෙන activeReward එක ප්‍රීසෙට් එකත් එක්ක මෙන්න මේ විදිහට මර්ජ් කරලා පාස් කරන්න මචං */}
    <RewardCard 
      packState={packState} 
      activeReward={{ ...activeReward, ...currentPreset }} 
    />
  </InteractiveScene>

</Stage>

        <OrbitControls 
          enableRotate={packState !== 'REVEAL'} 
          enableZoom={packState === 'REVEAL'} 
          minDistance={3.8} 
          maxDistance={5.5} 
          enablePan={false} 
          maxPolarAngle={Math.PI / 2} 
        />
      </Canvas>

      {/* UI Overlay */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h1 style={{ color: '#fff', fontFamily: 'sans-serif', fontSize: '1.2rem', margin: 0, letterSpacing: '2px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
            {packState === 'IDLE' && "⚡ CLICK BOX TO UNBOX"}
            {packState === 'OPENING' && "🔓 UNLOCKING SECURITY CORE..."}
            {(packState === 'OPENED' || packState === 'REVEAL') && "📦 CONTAINMENT STABLE"}
          </h1>
        </div>

        {packState === 'REVEAL' && (
          <div style={{ margin: '0 auto 1rem auto', textAlign: 'center', pointerEvents: 'auto', background: 'rgba(10, 10, 22, 0.7)', padding: '1.5rem 3rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <span style={{ color: activeReward.color, fontWeight: 'bold', letterSpacing: '4px', fontSize: '0.85rem', fontFamily: 'sans-serif', textShadow: `0 0 10px ${activeReward.color}` }}>
              {activeReward.label}
            </span>
            <h2 style={{ color: '#fff', fontFamily: 'sans-serif', fontSize: '2.2rem', marginTop: '0.4rem', marginBottom: '1.2rem', fontWeight: '900', letterSpacing: '1px' }}>
              {activeReward.name}
            </h2>
            <button 
              onClick={handleReset}
              style={{ background: activeReward.color, color: '#000', border: 'none', padding: '0.8rem 2.5rem', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'sans-serif' }}
            >
              RESET PACK
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App