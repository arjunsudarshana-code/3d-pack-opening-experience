import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// 🌀 1. CYBER BACKGROUND RINGS (ULTRA-BRIGHT REAL NEON GLOW)
export function CyberBackgroundRings({ themeColor, packState }) {
  const ringRef1 = useRef()
  const ringRef2 = useRef()
  const matRef1 = useRef()
  const matRef2 = useRef()

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    
    if (ringRef1.current) ringRef1.current.rotation.z = time * 0.06
    if (ringRef2.current) ringRef2.current.rotation.z = -time * 0.03

    const isRevealed = packState === 'OPENED' || packState === 'REVEAL'
    const targetIntensity1 = isRevealed ? 45.0 : 12.0
    const targetIntensity2 = isRevealed ? 30.0 : 8.0

    if (matRef1.current) matRef1.current.emissiveIntensity = THREE.MathUtils.lerp(matRef1.current.emissiveIntensity, targetIntensity1, 0.1)
    if (matRef2.current) matRef2.current.emissiveIntensity = THREE.MathUtils.lerp(matRef2.current.emissiveIntensity, targetIntensity2, 0.1)
    
    const targetScale = isRevealed ? 1.08 + Math.sin(time * 2) * 0.01 : 1.0
    if (ringRef1.current) ringRef1.current.scale.setScalar(THREE.MathUtils.lerp(ringRef1.current.scale.x, targetScale, 0.05))
    if (ringRef2.current) ringRef2.current.scale.setScalar(THREE.MathUtils.lerp(ringRef2.current.scale.x, targetScale, 0.05))
  })

  const activeColor = (packState === 'IDLE' || packState === 'OPENING') ? '#00d2ff' : themeColor

  return (
    <group position={[0, 0.4, -3.5]}>
      <mesh ref={ringRef1}>
        <torusGeometry args={[3.8, 0.04, 12, 64]} />
        <meshStandardMaterial 
          ref={matRef1} 
          color="#000000"
          emissive={activeColor} 
          emissiveIntensity={12.0}
          toneMapped={false}
          transparent 
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          wireframe 
        />
      </mesh>
      
      <mesh ref={ringRef2} rotation={[0, 0, Math.PI / 4]}>
        <torusGeometry args={[4.8, 0.025, 8, 48]} />
        <meshStandardMaterial 
          ref={matRef2} 
          color="#000000"
          emissive={activeColor} 
          emissiveIntensity={8.0}
          toneMapped={false}
          transparent 
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          wireframe 
        />
      </mesh>
    </group>
  )
}

// 🌌 2. BACKGROUND PARTICLES (UPGRADED AAA VORTEX SYSTEM)
export function BackgroundParticles({ count = 200, themeColor, packState }) {
  const pointsRef = useRef()
  
  const [particles, angles, radii] = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const angs = new Float32Array(count)
    const rads = new Float32Array(count)
    
    for (let i = 0; i < count; i++) {
      angs[i] = Math.random() * Math.PI * 2
      rads[i] = 1.5 + Math.random() * 6.5
      
      positions[i * 3] = Math.cos(angs[i]) * rads[i]
      positions[i * 3 + 1] = (Math.random() - 0.3) * 5 
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4
    }
    return [positions, angs, rads]
  }, [count])

  useFrame((state) => {
    if (!pointsRef.current) return
    const posAttr = pointsRef.current.geometry.attributes.position
    
    const isOpening = packState === 'OPENING' || packState === 'OPENED'
    const speed = isOpening ? 1.8 : 0.25

    for (let i = 0; i < count; i++) {
      angles[i] += 0.01 * speed
      posAttr.array[i * 3] = Math.cos(angles[i]) * radii[i]
      posAttr.array[i * 3 + 1] += 0.003
      if (posAttr.array[i * 3 + 1] > 4) posAttr.array[i * 3 + 1] = -2 
    }
    posAttr.needsUpdate = true
    pointsRef.current.rotation.z = state.clock.getElapsedTime() * 0.02
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[particles, 3]} />
      </bufferGeometry>
      <pointsMaterial color={themeColor} size={0.04} sizeAttenuation={true} transparent={true} opacity={0.4} blending={THREE.AdditiveBlending} />
    </points>
  )
}