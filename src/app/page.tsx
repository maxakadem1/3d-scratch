"use client"

import { Canvas, useLoader, useFrame } from "@react-three/fiber"
import { useEffect, useRef, useState } from "react"
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import { Leva, useControls } from "leva"
import { Button } from "@/components/ui/button"

// Define the type for props
interface FoilProps {
  position: [number, number, number]
}

interface PaperProps {
  position: [number, number, number]
}

function Foil({ position }: FoilProps) {
  const ref = useRef<THREE.Mesh>(null)

  // Load textures: normal map for the foil and rainbow gradient for color
  const foilNormal = useLoader(THREE.TextureLoader, "/glitterNormalMap.png") // Normal map
  const rainbowTexture = useLoader(THREE.TextureLoader, "/rainbowGradient.png") // Rainbow gradient texture
  const environmentMap = useLoader(THREE.TextureLoader, "/envMap.png") // Environment map for reflections

  // Leva UI controls for material properties
  const { metalness, roughness, clearcoat, clearcoatRoughness } = useControls(
    "Foil Texture",
    {
      metalness: { value: 0.73, min: 0, max: 1, step: 0.01 },
      roughness: { value: 0.67, min: 0, max: 1, step: 0.01 },
      clearcoat: { value: 1, min: 0, max: 1, step: 0.01 },
      clearcoatRoughness: { value: 1, min: 0, max: 1, step: 0.01 },
    }
  )
  const { sizeX, sizeY } = useControls("Foil Size", {
    sizeX: { value: 0.37, min: 0.2, max: 2, step: 0.01 },
    sizeY: { value: 0.473, min: 0.2, max: 2, step: 0.01 },
  })

  // Update texture repeat to prevent normal map stretching, but allow rainbow texture to stretch
  useEffect(() => {
    // Set repeat for foil normal map to prevent stretching
    foilNormal.wrapS = foilNormal.wrapT = THREE.RepeatWrapping
    foilNormal.repeat.set(sizeX / sizeY, 1)

    // No repeat adjustments for rainbow texture to allow it to stretch
    rainbowTexture.wrapS = rainbowTexture.wrapT = THREE.ClampToEdgeWrapping
  }, [sizeX, sizeY, rainbowTexture, foilNormal])

  return (
    <mesh position={position} ref={ref}>
      <planeGeometry args={[sizeX, sizeY]} /> {/* Smaller foil on top of A4 */}
      <meshPhysicalMaterial
        side={THREE.DoubleSide} // Apply on both sides
        map={rainbowTexture} // Apply rainbow gradient texture, allowing it to stretch
        normalMap={foilNormal} // Add normal map for depth and glitter bumps
        envMap={environmentMap} // Environment map for reflections
        metalness={metalness} // Controlled by Leva for high reflectivity
        roughness={roughness} // Controlled by Leva for a smooth reflective surface
        clearcoat={clearcoat} // Adds a shiny clear coat layer
        clearcoatRoughness={clearcoatRoughness} // Slight roughness on the clear coat
        transparent={false} // Ensure transparency is disabled
        alphaTest={0} // Prevent any transparency from alpha
      />
    </mesh>
  )
}

function Paper({ position }: PaperProps) {
  const ticketTexture = useLoader(THREE.TextureLoader, "/lotteryFront2.png") // Ticket texture
  const [imageSize, setImageSize] = useState<[number, number]>([1, 1])

  // When the texture is loaded, update the image size
  useEffect(() => {
    if (ticketTexture.image) {
      const { width, height } = ticketTexture.image
      const aspectRatio = width / height
      setImageSize([aspectRatio, 1])
    }
  }, [ticketTexture])

  return (
    <mesh position={position}>
      {/* Adjust planeGeometry to match the texture's aspect ratio */}
      <planeGeometry args={imageSize} />
      <meshStandardMaterial
        side={THREE.DoubleSide}
        color="#fff"
        map={ticketTexture}
      />
    </mesh>
  )
}

function Scene() {
  const rotation = useRef({ x: 0, y: 0 })
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.x = rotation.current.x
      groupRef.current.rotation.y = rotation.current.y
    }
  })

  return (
    <>
      {/* Group both Paper and Foil */}
      <group ref={groupRef}>
        {/* A4 Paper */}
        <Paper position={[0, 0, 0.01]} />

        {/* Foil slightly above the paper */}
        <Foil position={[0, -0.248, 0.011]} />
      </group>

      <ambientLight intensity={Math.PI / 2} />
      <spotLight
        position={[10, 10, 10]}
        angle={0.15}
        penumbra={1}
        decay={0}
        intensity={Math.PI}
      />
      <pointLight
        position={[-10, -10, -10]}
        decay={0}
        intensity={Math.PI / 2}
      />

      <ContactShadows
        position={[0, -1.4, 0]}
        opacity={0.75}
        scale={10}
        blur={3}
        far={4}
      />
      <Environment preset="city" />
      <OrbitControls minDistance={0.2} maxDistance={3} makeDefault />
    </>
  )
}

export default function Home() {
  return (
    <div
      className="min-w-screen min-h-screen flex items-center justify-center flex-col"
      id="canvas-container"
    >
      <div className="w-full flex justify-center">
        <Button>Scratch</Button>
      </div>
      <Canvas
        camera={{ position: [0, 0, 0.8], fov: 75 }}
        style={{ width: "100%", height: "90vh" }}
        onPointerDown={(event) => {
          event.stopPropagation()
        }}
      >
        <Scene />
      </Canvas>
      <Leva /> {/* Render Leva UI */}
    </div>
  )
}
