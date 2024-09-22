"use client"
import { Canvas, useLoader, ThreeEvent } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import { Leva, useControls } from "leva"
import { Button } from "@/components/ui/button"

// Define the type for props
interface FoilProps {
  position: [number, number, number]
  scratchEnabled: boolean
}

interface PaperProps {
  position: [number, number, number]
}

function Foil({ position, scratchEnabled }: FoilProps) {
  const ref = useRef<THREE.Mesh>(null)
  const scratchCanvas = useMemo(() => document.createElement("canvas"), [])
  const [scratchContext, setScratchContext] =
    useState<CanvasRenderingContext2D | null>(null)
  const [isScratching, setIsScratching] = useState(false)
  const [maskTexture, setMaskTexture] = useState<THREE.CanvasTexture | null>(
    null
  )

  // Load textures
  const foilNormal = useLoader(THREE.TextureLoader, "/glitterNormalMap.png")
  const rainbowTexture = useLoader(THREE.TextureLoader, "/rainbowGradient.png")
  const environmentMap = useLoader(THREE.TextureLoader, "/envMap.png")

  // Leva UI controls
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

  // Initialize scratch canvas and mask texture
  useEffect(() => {
    scratchCanvas.width = 512
    scratchCanvas.height = 512
    const ctx = scratchCanvas.getContext("2d")
    setScratchContext(ctx)

    if (ctx) {
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, scratchCanvas.width, scratchCanvas.height)
    }

    const texture = new THREE.CanvasTexture(scratchCanvas)
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.format = THREE.RGBAFormat
    setMaskTexture(texture)
  }, [scratchCanvas])

  // Update texture repeat
  useEffect(() => {
    foilNormal.wrapS = foilNormal.wrapT = THREE.RepeatWrapping
    foilNormal.repeat.set(sizeX / sizeY, 1)
    rainbowTexture.wrapS = rainbowTexture.wrapT = THREE.ClampToEdgeWrapping
  }, [sizeX, sizeY, rainbowTexture, foilNormal])

  // Handle pointer events
  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!scratchEnabled) return
    setIsScratching(true)
  }

  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    if (!scratchEnabled) return
    setIsScratching(false)
  }

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!scratchEnabled || !isScratching || !scratchContext || !maskTexture)
      return

    const uv = event.uv
    if (!uv) return

    const x = uv.x * scratchCanvas.width
    const y = (1 - uv.y) * scratchCanvas.height // Flip Y

    scratchContext.globalCompositeOperation = "destination-out"
    scratchContext.beginPath()
    scratchContext.arc(x, y, 20, 0, Math.PI * 2)
    scratchContext.fill()

    maskTexture.needsUpdate = true
  }

  if (!maskTexture) return null // Wait until maskTexture is initialized

  return (
    <mesh
      position={position}
      ref={ref}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      <planeGeometry args={[sizeX, sizeY]} />
      <meshPhysicalMaterial
        side={THREE.DoubleSide}
        map={rainbowTexture}
        normalMap={foilNormal}
        envMap={environmentMap}
        metalness={metalness}
        roughness={roughness}
        clearcoat={clearcoat}
        clearcoatRoughness={clearcoatRoughness}
        transparent={true}
        alphaMap={maskTexture}
        alphaTest={0.5} // Add alphaTest
      />
    </mesh>
  )
}

function Paper({ position }: PaperProps) {
  const ticketTexture = useLoader(THREE.TextureLoader, "/lotteryFront.png")
  const [imageSize, setImageSize] = useState<[number, number]>([1, 1])

  useEffect(() => {
    if (ticketTexture.image) {
      const { width, height } = ticketTexture.image
      const aspectRatio = width / height
      setImageSize([aspectRatio, 1])
    }
  }, [ticketTexture])

  return (
    <mesh position={position}>
      <planeGeometry args={imageSize} />
      <meshStandardMaterial
        side={THREE.DoubleSide}
        color="#fff"
        map={ticketTexture}
      />
    </mesh>
  )
}

function Scene({ scratchEnabled }: { scratchEnabled: boolean }) {
  return (
    <>
      <group>
        <Paper position={[0, 0, 0.01]} />
        <Foil position={[0, -0.248, 0.011]} scratchEnabled={scratchEnabled} />
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
      <OrbitControls
        minDistance={0.2}
        maxDistance={3}
        enabled={!scratchEnabled}
        makeDefault
      />
    </>
  )
}

export default function Home() {
  const [scratchEnabled, setScratchEnabled] = useState(false)

  return (
    <div
      className="min-w-screen min-h-screen flex items-center justify-center flex-col"
      id="canvas-container"
    >
      <div className="w-full flex justify-center">
        <Button onClick={() => setScratchEnabled((prev) => !prev)}>
          {scratchEnabled ? "Enable Rotate" : "Scratch"}
        </Button>
      </div>
      <Canvas
        camera={{ position: [0, 0, 0.8], fov: 75 }}
        style={{ width: "100%", height: "90vh" }}
      >
        <Scene scratchEnabled={scratchEnabled} />
      </Canvas>
      <Leva />
    </div>
  )
}
