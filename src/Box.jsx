import React, { useEffect, useRef, useState } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const BOX_OPEN_PEAK_TIME = 3.5 

export function Box({ packState, themeColor, onOpenComplete, ...props }) {
  const groupRef = useRef()
  const { scene, animations } = useGLTF('/box.glb')
  const { actions } = useAnimations(animations, groupRef)
  const animationName = "Take 001"
  const hasStarted = useRef(false)
  const [hovered, setHovered] = useState(false)

  // 🎯 HIGH-PERFORMANCE REFS: මෙමරි එක කෑෂ් කරගන්නා Refs
  const holoObjects = useRef([])
  const holoConeMaterials = useRef([])
  const middleLightRef = useRef()

  // ⚡ [CPU OPTIMIZATION]: useFrame එක ඇතුලේ scene.traverse නොකර කෑලි ට්‍රැක් කරන්න හදපු කෑෂ් Refs
  const middleBoxMaterials = useRef([])
  const sideBoxMaterials = useRef([])
  const middleConeMaterials = useRef([])
  const sideConeMaterials = useRef([])

  // 🎨 Static Color instances (Garbage Collection එක සම්පූර්ණයෙන්ම නැති කිරීමට)
  const rainbowColorObj = useRef(new THREE.Color())
  const sideBoxColorObj = useRef(new THREE.Color('#00ffff'))
  const targetColorObj = useRef(new THREE.Color())
  const rarityColorObj = useRef(new THREE.Color())

  useEffect(() => {
    if (packState === 'IDLE') {
      document.body.style.cursor = hovered ? 'pointer' : 'auto'
    } else {
      document.body.style.cursor = 'auto'
    }
    return () => { document.body.style.cursor = 'auto' }
  }, [hovered, packState])

  // 🔍 INITIAL GENERATION AND CACHING LOOP (මොඩල් එක ලෝඩ් වෙද්දී එක පාරක් පමණක් පීරයි)[cite: 10]
  useEffect(() => {
    if (!scene) return

    const existingPivots = []
    scene.traverse((child) => {
      if (child.name === "unified_weapon_pivot") existingPivots.push(child)
    })
    existingPivots.forEach((pivot) => {
      const parent = pivot.parent
      const children = [...pivot.children]
      children.forEach((mesh) => {
        mesh.position.add(pivot.position)
        parent.add(mesh)
      })
      parent.remove(pivot)
    })

    const objects = []
    holoConeMaterials.current = []
    middleBoxMaterials.current = []
    sideBoxMaterials.current = []
    middleConeMaterials.current = []
    sideConeMaterials.current = []

    const gunGroups = {}

    scene.traverse((child) => {
      if (child.isMesh) {
        const name = child.name.toLowerCase()
        
        if (!name.includes('cone') && !name.includes('hologram') && !name.includes('pyramid') && !name.includes('holo')) {
          child.castShadow = true
          child.receiveShadow = true
        }

        // 📐 Mesh එක පිහිටලා තියෙන සැබෑ X පොසිෂන් එක මෙතනදීම එක පාරක් ගණනය කරමු
        let accumulatedX = child.position.x
        let parentNode = child.parent
        while (parentNode && parentNode !== scene) {
          accumulatedX += parentNode.position.x
          parentNode = parentNode.parent
        }
        const isMiddleBox = Math.abs(accumulatedX) < 1.0

        // 🔮 Hologram Cone setup[cite: 10]
        const isConeElement = (name.includes('cone') || name.includes('hologram') || name.includes('pyramid') || name.includes('holo')) && !name.includes('box') && !name.includes('chest')
        
        if (isConeElement) {
          const setupHoloMat = (mat) => {
            if (!mat) return
            mat.transparent = true
            mat.blending = THREE.AdditiveBlending
            mat.side = THREE.DoubleSide
            mat.depthWrite = false
            if (isMiddleBox) {
              if (!middleConeMaterials.current.includes(mat)) middleConeMaterials.current.push(mat)
            } else {
              if (!sideConeMaterials.current.includes(mat)) sideConeMaterials.current.push(mat)
            }
          }
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(setupHoloMat)
            else setupHoloMat(child.material)
          }
        } else {
          // 💡 Standard Neon / Box materials caching
          const cacheBoxMat = (mat) => {
            if (!mat) return
            if (isMiddleBox) {
              if (!middleBoxMaterials.current.includes(mat)) middleBoxMaterials.current.push(mat)
            } else {
              if (!sideBoxMaterials.current.includes(mat)) sideBoxMaterials.current.push(mat)
            }
          }
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(cacheBoxMat)
            else cacheBoxMat(child.material)
          }
        }

        if (name.includes('gun') || name.includes('weapon') || name.includes('rifle') || name.includes('pistol') || name.includes('shotgun') || name.includes('smg')) {
          const parentUuid = child.parent.uuid
          if (!gunGroups[parentUuid]) {
            gunGroups[parentUuid] = { parent: child.parent, meshes: [] }
          }
          gunGroups[parentUuid].meshes.push(child)
        }
      }
    })

    Object.values(gunGroups).forEach(({ parent, meshes }) => {
      const pivotGroup = new THREE.Group()
      pivotGroup.name = "unified_weapon_pivot"
      parent.add(pivotGroup)
      const collectiveBox = new THREE.Box3()
      meshes.forEach((mesh) => {
        mesh.geometry.computeBoundingBox()
        mesh.updateMatrix()
        const localBox = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix)
        collectiveBox.union(localBox)
      })
      const center = new THREE.Vector3()
      collectiveBox.getCenter(center)
      meshes.forEach((mesh) => {
        pivotGroup.add(mesh)
        mesh.position.sub(center)
      })
      pivotGroup.position.copy(center)
    })

    scene.traverse((child) => {
      const name = child.name.toLowerCase()
      if ((name.includes('cone') || name.includes('hologram') || name.includes('pyramid') || name.includes('holo')) && !name.includes('box') && !name.includes('chest') && child.isMesh) {
        objects.push({ mesh: child, isWeapon: false, origY: child.position.y, origX: child.position.x, origZ: child.position.z, origRotY: child.rotation.y, origScale: child.scale.clone() })
      }
      if (child.name === "unified_weapon_pivot") {
        objects.push({ mesh: child, isWeapon: true, origY: child.position.y, origX: child.position.x, origZ: child.position.z, origRotY: child.rotation.y, origScale: child.scale.clone() })
      }
    })

    holoObjects.current = objects
  }, [scene])

  useEffect(() => {
    const currentAction = actions[animationName]
    if (!currentAction) return

    if (packState === 'IDLE') {
      currentAction.stop()
      currentAction.time = 0
      currentAction.paused = false
      currentAction.enabled = true
      hasStarted.current = false
    } 
    
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

    if (packState === 'OPENED' || packState === 'REVEAL' || packState === 'SKIPPED') {
      currentAction.time = BOX_OPEN_PEAK_TIME
      currentAction.paused = true
    }
  }, [packState, actions])

  // ========================================================
  // 🔄 HIGH-PERFORMANCE 60FPS SCENE LOOP (NO SCENE.TRAVERSE)[cite: 10]
  // ========================================================
  useFrame((state) => {
    const currentAction = actions[animationName]
    if (currentAction && packState === 'OPENING') {
      if (currentAction.time >= BOX_OPEN_PEAK_TIME) {
        currentAction.time = BOX_OPEN_PEAK_TIME
        currentAction.paused = true
        if (onOpenComplete) onOpenComplete()
      }
    }

    const time = state.clock.getElapsedTime()
    
    let breatheIntensity = 1.3 + Math.sin(time * 2.5) * 0.4
    if (packState === 'IDLE' && hovered) {
      breatheIntensity = 3.5 + Math.sin(time * 6.0) * 0.8
    }

    // ✨ [EXCLUSIVE POP-UP SHINE][cite: 10]
    let middleBoxShine = breatheIntensity
    if (packState === 'IDLE') {
      middleBoxShine = 5.5 + Math.sin(time * 5.5) * 2.5 
      if (hovered) middleBoxShine = 9.5 + Math.sin(time * 9.0) * 3.5 
    }

    // 🎨 Heavy Rainbow and color preparation[cite: 10]
    const hue = (time * 0.14) % 1.0
    rainbowColorObj.current.setHSL(hue, 1.0, 0.50)
    rarityColorObj.current.set(themeColor)

    // ⚡ DYNAMIC AURA LIGHT CONTROLLER[cite: 10]
    if (middleLightRef.current && packState === 'IDLE') {
      middleLightRef.current.color.copy(rainbowColorObj.current) 
      middleLightRef.current.intensity = 35.0 + Math.sin(time * 5.5) * 15.0 
    } else if (middleLightRef.current) {
      middleLightRef.current.color.copy(rarityColorObj.current)
      middleLightRef.current.intensity = packState === 'OPENING' ? 10.0 : 45.0
    }

    // 🚀 ULTRA-FAST CACHED MATERIAL UPDATES (ලූප් එක 100 ගුණයක් වේගවත් කලා මචං)
    if (packState === 'IDLE' || packState === 'OPENING') {
      // 🌈 Middle Box Heavy Neon Rainbow[cite: 10]
      middleBoxMaterials.current.forEach((mat) => {
        if (mat.color) mat.color.lerp(rainbowColorObj.current, 0.08)
        if (mat.emissive) mat.emissive.lerp(rainbowColorObj.current, 0.08)
        mat.emissiveIntensity = middleBoxShine
      })
      // 🔒 Side Boxes Stable Cyan[cite: 10]
      sideBoxMaterials.current.forEach((mat) => {
        if (mat.color) mat.color.lerp(sideBoxColorObj.current, 0.08)
        if (mat.emissive) mat.emissive.lerp(sideBoxColorObj.current, 0.08)
        mat.emissiveIntensity = breatheIntensity
      })
      // 🔮 Middle Cone[cite: 10]
      middleConeMaterials.current.forEach((mat) => {
        if (mat.color) mat.color.lerp(rainbowColorObj.current, 0.08)
        mat.opacity = 0.40 + Math.sin(time * 5.0) * 0.06
      })
      // 🔒 Side Cones[cite: 10]
      sideConeMaterials.current.forEach((mat) => {
        if (mat.color) mat.color.lerp(sideBoxColorObj.current, 0.08)
        mat.opacity = 0.35 + Math.sin(time * 4.5) * 0.05
      })
    } else {
      // 🎁 Unboxed Card Reveal Sync State[cite: 10]
      const applyRevealGlow = (mat, isMiddle) => {
        if (mat.color) mat.color.lerp(rarityColorObj.current, 0.05)
        if (mat.emissive) mat.emissive.lerp(rarityColorObj.current, 0.05)
        mat.emissiveIntensity = isMiddle ? (7.0 + Math.sin(time * 5.0) * 1.5) : breatheIntensity
      }
      middleBoxMaterials.current.forEach(m => applyRevealGlow(m, true))
      sideBoxMaterials.current.forEach(m => applyRevealGlow(m, false))
      
      targetColorObj.current.set(themeColor)
      const updateConeReveal = (mat) => {
        if (mat.color) mat.color.lerp(targetColorObj.current, 0.08)
        mat.opacity = 0.35 + Math.sin(time * 4.5) * 0.05
      }
      middleConeMaterials.current.forEach(updateConeReveal)
      sideConeMaterials.current.forEach(updateConeReveal)
    }

    // 🔫 5. Weapons Floating Animation[cite: 10]
    const triggerGlitch = Math.random() > 0.985
    holoObjects.current.forEach((item) => {
      let targetY = item.origY + Math.sin(time * 2.0) * 0.04
      let targetX = item.origX
      let targetZ = item.origZ

      if (item.isWeapon && item.origX < -0.5) targetX += 0.65
      
      if (triggerGlitch) {
        targetX += (Math.random() - 0.5) * 0.035
        targetZ += (Math.random() - 0.5) * 0.035
        item.mesh.scale.set(
          item.origScale.x * (0.9 + Math.random() * 0.15),
          item.origScale.y * (1.2 + Math.random() * 0.25),
          item.origScale.z * (0.9 + Math.random() * 0.15)
        )
      } else {
        item.mesh.scale.lerp(item.origScale, 0.2)
      }

      item.mesh.position.y = targetY
      item.mesh.position.x = targetX
      item.mesh.position.z = targetZ
      if (item.isWeapon) item.mesh.rotation.y = item.origRotY + time * 0.5
    })

    // ========================================================
    // 📦 6. Real-time Ground Lock & Bobbing[cite: 10]
    // ========================================================
    if (groupRef.current) {
      let targetScale = 1
      let targetBoxY = 0.10
      if (packState === 'IDLE') {
        targetBoxY += Math.sin(time * 1.8) * 0.012
        if (hovered) {
          targetScale = 1.045
          targetBoxY += 0.02
        }
      }
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1)
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetBoxY, 0.1)
    }
  })

  return (
    <group 
      ref={groupRef} 
      position={[0, 0, 0]}
      onPointerOver={(e) => { if (packState === 'IDLE') { e.stopPropagation(); setHovered(true); } }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      <pointLight ref={middleLightRef} position={[0, -0.2, 0.5]} distance={2.5} intensity={0} />
      <primitive object={scene} {...props} />
    </group>
  )
}

export default Box