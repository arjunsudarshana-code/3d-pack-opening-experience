import React, { useEffect, useRef } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ========================================================
// ⏱️ සිංහල කමෙන්ට් - මෙතනින් ADJUST කරන්න:
// පෙට්ටියේ පියන උපරිමයෙන්ම ඇරිලා "නවතින්න" ඕන තත්පරය (Seconds වලින්).
// ========================================================
const BOX_OPEN_PEAK_TIME = 3.5 

export function Box({ packState, onOpenComplete, ...props }) {
  const groupRef = useRef()
  const { scene, animations } = useGLTF('/box.glb')
  const { actions } = useAnimations(animations, groupRef)
  const animationName = "Take 001"
  const hasStarted = useRef(false)

  // 🎯 3D මොඩල් එකේ අයිටම් ට්‍රැක් කරගන්නා Refs
  const holoObjects = useRef([])
  const neonMaterials = useRef([]) // 💡 පෙට්ටියේ නියෝන් ලයිට්ස් මැටීරියල්ස් ටික තියාගන්න

  // 🔍 සීන් එක ලෝඩ් වුණු ගමන් හෝලෝග්‍රෑම් සහ නියෝන් ලයිට්ස් ටික ඩයිනමික් හොයාගන්නවා
  useEffect(() => {
    if (!scene) return
    const objects = []
    const neons = []
    
    scene.traverse((child) => {
      if (child.isMesh) {
        const name = child.name.toLowerCase()
        
        // 🛸 1. හෝලෝග්‍රෑම් කෝන්ස් සහ තුවක්කු ටික වෙන් කර ගැනීම
        if (
          name.includes('hologram') || name.includes('cone') || name.includes('weapon') || 
          name.includes('gun') || name.includes('rifle') || name.includes('pistol') || 
          name.includes('shotgun') || name.includes('smg') || name.includes('holo') || name.includes('pyramid')
        ) {
          objects.push({
            mesh: child,
            origY: child.position.y,
            origX: child.position.x,
            origZ: child.position.z,
            origRotY: child.rotation.y,
            origScale: child.scale.clone() // Glitch එකෙන් පස්සේ රීසෙට් කරන්න ඔරිජිනල් සයිස් එක සේව් කරයි
          })
        }
        
        // 💡 2. පෙට්ටියේ තියෙන සයිබර් නියෝන් ලයිට්ස් ටික වෙන් කර ගැනීම
        if (
          name.includes('light') || name.includes('neon') || name.includes('glow') || name.includes('led') ||
          (child.material && child.material.emissive && child.material.emissive.getHex() > 0 && !name.includes('hologram'))
        ) {
          if (child.material && !neons.includes(child.material)) {
            neons.push(child.material)
          }
        }
      }
    })
    holoObjects.current = objects
    neonMaterials.current = neons
  }, [scene])

  useEffect(() => {
    const currentAction = actions[animationName]
    if (!currentAction) return

    // IDLE - පෙට්ටිය සාමාන්‍ය විදිහට වැහිලා තියෙන තැන
    if (packState === 'IDLE') {
      currentAction.stop()
      currentAction.time = 0
      currentAction.paused = false
      currentAction.enabled = true
      hasStarted.current = false
    } 
    
    // OPENING - ක්ලික් කළ සැනින් පියන ලස්සනට දිგටම ඇරෙන්න පටන් ගනී
    if (packState === 'OPENING') {
      if (!hasStarted.current) {
        hasStarted.current = true
        currentAction.reset()
        currentAction.paused = false
        currentAction.enabled = true
        currentAction.setLoop(THREE.LoopOnce)
        currentAction.clampWhenFinished = true 
        currentAction.play()
      }
    }

    // 🔒 පියන ඇරිලා ඉවර වුණාම (OPENED / REVEAL) ආපහු වැහෙන්න නොදී එතනම freeze කර තබයි
    if (packState === 'OPENED' || packState === 'REVEAL' || packState === 'SKIPPED') {
      currentAction.time = BOX_OPEN_PEAK_TIME
      currentAction.paused = true
    }
  }, [packState, actions])

  // ========================================================
  // 🔄 REAL-TIME SCENE ANIMATION LOOP
  // ========================================================
  useFrame((state) => {
    const currentAction = actions[animationName]
    
    // 🛑 ඔයාගේ පරණ පියන ඇරෙන ලොජික් එක (එහෙම්මම සුරැකිව තබාගත්තා මචං)
    if (currentAction && packState === 'OPENING') {
      if (currentAction.time >= BOX_OPEN_PEAK_TIME) {
        currentAction.time = BOX_OPEN_PEAK_TIME
        currentAction.paused = true 
        if (onOpenComplete) onOpenComplete() 
      }
    }

    const time = state.clock.getElapsedTime()
    
    // ========================================================
    // 💡 3. NEON BREATHING LIGHT EFFECT (හුස්ම ගන්නා ලයිට්ස්)
    // 1.0 සිට 1.6 දක්වා ලයිට්ස් වල දීප්තිය (Emissive) හෙමින් පල්ස් වෙන්න සැලැස්වීම
    // ========================================================
    const breatheIntensity = 1.3 + Math.sin(time * 2.5) * 0.4
    neonMaterials.current.forEach((mat) => {
      mat.emissiveIntensity = breatheIntensity
    })

    // ========================================================
    // ⚡ 4. HOLOGRAPHIC FLICKER / GLITCH EFFECT + IDLE FLOATING
    // ========================================================
    // frame එකෙන් frame එකට 1.5% ක වගේ පොඩි චාන්ස් එකක් දෙනවා ක්ලික් එකක් (Glitch) වෙන්න
    const triggerGlitch = Math.random() > 0.985 

    holoObjects.current.forEach((item) => {
      // Base Hover: සාමාන්‍ය විදිහට හෙමින් උඩ පහළ පාවීම
      let targetY = item.origY + Math.sin(time * 2.0) * 0.04
      let targetX = item.origX
      let targetZ = item.origZ
      
      // ⚡ Glitch එකක් ට්‍රිගර් වුණු exact ෆ්‍රේම් එකේදී සිදුවන වෙනස්කම්:
      if (triggerGlitch) {
        targetX += (Math.random() - 0.5) * 0.035 // X පැත්තට හීනියට ගැස්සීම
        targetZ += (Math.random() - 0.5) * 0.035 // Z පැත්තට හීනියට ගැස්සීම
        
        // සිරස් අතට පොඩ්ඩක් කාඩ් එක ඇදලා සයිස් එක අවුල් කිරීම (Sci-Fi Distortion)
        item.mesh.scale.set(
          item.origScale.x * (0.9 + Math.random() * 0.15),
          item.origScale.y * (1.2 + Math.random() * 0.25), 
          item.origScale.z * (0.9 + Math.random() * 0.15)
        )
        
        // ගැස්සෙන තත්පරයට හෝලෝග්‍රෑම් එකේ බ්‍රයිට්නස් එක උපරිම (4.0) වේ
        if (item.mesh.material) {
          item.mesh.material.emissiveIntensity = 4.0
        }
      } else {
        // සාමාන්‍ය වෙලාවට ඔරිජිනල් සයිස් එකටයි දීප්තියටයි මාරම ස්මූත් පිට Lerp (Blend) වේ
        item.mesh.scale.lerp(item.origScale, 0.2)
        if (item.mesh.material) {
          item.mesh.material.emissiveIntensity = THREE.MathUtils.lerp(item.mesh.material.emissiveIntensity, 1.5, 0.2)
        }
      }

      // Physics Position ටික Mesh එකට ඇප්ලයි කිරීම
      item.mesh.position.y = targetY
      item.mesh.position.x = targetX
      item.mesh.position.z = targetZ
      
      // Gentle Auto-Rotation: හෝලෝග්‍රෑම් ආයුධ ටික වටේට හෙමින් 360° කැරකැවීම
      const name = item.mesh.name.toLowerCase()
      if (name.includes('gun') || name.includes('weapon') || name.includes('rifle') || name.includes('pistol') || name.includes('holo')) {
        item.mesh.rotation.y = item.origRotY + time * 0.4
      }
    })
  })

  return (
    <group ref={groupRef}>
      <primitive object={scene} {...props} />
    </group>
  )
}

export default Box