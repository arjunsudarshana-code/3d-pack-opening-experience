# 📦 Premium 3D Gaming Unboxing Experience

[cite_start]A high-fidelity, interactive 3D Pack Opening and Reward Reveal system built using **React Three Fiber (R3F)**, **Three.js**, and **Vite**[cite: 2]. [cite_start]This component transforms standard collectible rewards into a premium, AAA gaming-grade cinematic experience[cite: 3, 6].

## 🚀 Live Demo
*(Once hosted, paste your live deployment URL here! e.g., Vercel / Netlify link)*

---

## ✨ Features Built & Delivered

### 1. 🎬 Cinematic 3D Core Flow
- [cite_start]**Controlled Box Animation:** Smoothly tracks and locks the GLTF/Blender container opening lifecycle at peak timestamps without reverse-looping glitches[cite: 11, 13, 33, 39].
- [cite_start]**State Management:** Fully reactive state pipeline supporting `IDLE`, `OPENING`, `OPENED`, and `REVEAL` interaction phases[cite: 47, 56].
- **Cinematic Eye-Level Camera:** Optimized viewport angle configured natively on the Three.js Canvas for a front-facing viewing experience.

### 2. ⚡ Advanced Visual Effects (VFX)
- [cite_start]**Billboarded Smoke Blast:** Dynamic soft-puff particle system that explodes on box-open and constantly faces the active camera (Three.js billboarding logic)[cite: 14].
- **3D Cone Particle Burst:** High-velocity explosive spark engine that fires interactive 3D particles toward the viewer with physics-based gravity damping.
- **Holographic Glitch & Flicker:** Procedural micro-distortion (positional jitter, axial stretching, and emissive spikes) simulating real laser projection breakdowns.

### 3. 💡 Immersive Environment & Shading
- **Cyber sector Grid Floor:** Responsive neon matrix grid providing a strong structural foundation that adapts to reward themes.
- **Rotating Tech Rings:** Multi-layered background laser rings rotating in slow-motion, producing cinematic 3D parallax depth when tracking mouse movements.
- **Neon LED Breathing:** Smooth sinusoidal pulsation (`Math.sin`) applied dynamically to the box's integrated emission maps.
- **Space Hovering:** Micro-amplitude hovering logic keeping floating holographic items dynamically animated in 3D space.

### 4. 👑 5-Tier Rarity Preset Engine
[cite_start]The system accepts a rarity tier input prop (`1` to `5`) and automatically configures global visual parameters[cite: 48, 51, 64]:
- **Level 1 (COMMON):** Clean minimal layout, 100 particles, slate grey theme.
- **Level 2 (UNCOMMON):** Neon green radioactive tint, 180 particles.
- **Level 3 (RARE):** Cyber blue theme, 260 particles, enhanced back-glow.
- **Level 4 (EPIC):** Deep plasma purple theme, 380 particles, high emission intensity.
- [cite_start]**Level 5 (LEGENDARY):** Mythic golden bloom effect, 550 massive explosion particles, maximum emissive glow[cite: 20].

### 5. 🎛️ Interactive Reward Card
- [cite_start]**3D Inspection Controls:** High-responsiveness pointer tracking allowing users to pitch, yaw, and spin the revealed reward card via mouse drag[cite: 3, 49].
- [cite_start]**Dual-Sided Textures:** Supports independent frontend and backend image map loading seamlessly pulled from background configurations[cite: 5, 19, 55].

---

## 🛠️ Tech Stack Used
- [cite_start]**Framework:** React (Vite template) [cite: 2, 27]
- **3D Graphics:** Three.js / @react-three/fiber
- **3D Helpers:** @react-three/drei
- [cite_start]**Assets:** Custom optimized GLB Models & Canvas Shaders [cite: 34, 35]

---

## 📦 Handoff & Integration Specifications

### Expected Props Data Shape
[cite_start]To deploy this reusable component into your production system, import and pass data as follows[cite: 4, 21, 76]:

```jsx
<Box 
  packState={packState}            // 'IDLE' | 'OPENING' | 'OPENED' | 'REVEAL'
  onOpenComplete={handleComplete}  // Triggered exactly at the peak opening frame
/>

<RewardCard 
  packState={packState}
  activeReward={{
    name: "GOLDEN VULCAN RIFLE",
    rarity: 5,                     // 1 to 5 Tier System
    texPrefix: "vulcan"            // Maps to asset textures (front/back)
  }}
/>