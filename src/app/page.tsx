"use client"
import React, {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { Canvas, useLoader, useThree } from "@react-three/fiber"
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import { Leva, useControls } from "leva"
import { Button } from "@/components/ui/button"

interface FoilProps {
  position: [number, number, number]
  scratchEnabled: boolean
  onScratchComplete: () => void
}

interface PaperProps {
  position: [number, number, number]
}

interface FoilHandle {
  updateScratchAtScreenPosition: (clientX: number, clientY: number) => void
  resetPreviousPoint: () => void
}

const Foil = React.forwardRef(function Foil(
  { position, scratchEnabled, onScratchComplete }: FoilProps,
  ref
) {
  const meshRef = useRef<THREE.Mesh>(null)
  const scratchCanvas = useMemo(() => document.createElement("canvas"), [])
  const [scratchContext, setScratchContext] =
    useState<CanvasRenderingContext2D | null>(null)
  const [maskTexture, setMaskTexture] = useState<THREE.CanvasTexture | null>(
    null
  )

  const foilNormal = useLoader(THREE.TextureLoader, "/glitterNormalMap2.png")
  const rainbowTexture = useLoader(THREE.TextureLoader, "/rainbowGradient.png")
  const environmentMap = useLoader(THREE.TextureLoader, "/envMap.png")

  const { metalness, roughness, clearcoat, clearcoatRoughness } = useControls(
    "Foil Texture",
    {
      metalness: { value: 0.73, min: 0, max: 1, step: 0.01 },
      roughness: { value: 0.67, min: 0, max: 1, step: 0.01 },
      clearcoat: { value: 1, min: 0, max: 1, step: 0.01 },
      clearcoatRoughness: { value: 1, min: 0, max: 1, step: 0.01 },
    }
  )
  const [sizeX] = useState(0.37)
  const [sizeY] = useState(0.473)
  // const { sizeX, sizeY } = useControls("Foil Size", {
  //   sizeX: { value: 0.37, min: 0.2, max: 2, step: 0.01 },
  //   sizeY: { value: 0.473, min: 0.2, max: 2, step: 0.01 },
  // })

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

  useEffect(() => {
    foilNormal.wrapS = foilNormal.wrapT = THREE.RepeatWrapping
    foilNormal.repeat.set(sizeX / sizeY, 1)
    rainbowTexture.wrapS = rainbowTexture.wrapT = THREE.ClampToEdgeWrapping
  }, [sizeX, sizeY, rainbowTexture, foilNormal])

  const previousPoint = useRef<{ x: number; y: number } | null>(null)

  const updateScratch = (uv: { x: number; y: number }) => {
    if (!scratchEnabled || !scratchContext || !maskTexture) return

    const x = uv.x * scratchCanvas.width
    const y = (1 - uv.y) * scratchCanvas.height

    scratchContext.globalCompositeOperation = "destination-out"
    scratchContext.lineWidth = 40
    scratchContext.lineCap = "round"
    scratchContext.lineJoin = "round"

    if (previousPoint.current) {
      scratchContext.beginPath()
      scratchContext.moveTo(previousPoint.current.x, previousPoint.current.y)
      scratchContext.lineTo(x, y)
      scratchContext.stroke()
    } else {
      scratchContext.beginPath()
      scratchContext.arc(x, y, 20, 0, Math.PI * 2, true)
      scratchContext.fill()
    }

    previousPoint.current = { x, y }
    maskTexture.needsUpdate = true

    // Calculate the scratched area
    const imageData = scratchContext.getImageData(
      0,
      0,
      scratchCanvas.width,
      scratchCanvas.height
    )
    const totalPixels = scratchCanvas.width * scratchCanvas.height
    let clearedPixels = 0

    for (let i = 0; i < imageData.data.length; i += 4) {
      if (imageData.data[i + 3] === 0) clearedPixels++ // Check alpha channel
    }

    const percentageScratched = (clearedPixels / totalPixels) * 100
    if (percentageScratched >= 80) {
      onScratchComplete()
    }
  }

  const { camera, gl } = useThree()
  const plane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 0, 1), -position[2]),
    [position]
  )
  const raycaster = useMemo(() => new THREE.Raycaster(), [])

  useImperativeHandle(ref, () => ({
    updateScratchAtScreenPosition(clientX: number, clientY: number) {
      const mouse = new THREE.Vector2()
      mouse.x = (clientX / gl.domElement.clientWidth) * 2 - 1
      mouse.y = -(clientY / gl.domElement.clientHeight) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const intersectionPoint = new THREE.Vector3()
      const intersects = raycaster.ray.intersectPlane(plane, intersectionPoint)

      if (intersects && intersectionPoint && meshRef.current) {
        // Convert the intersection point to local space
        const foilPosition = meshRef.current.worldToLocal(
          intersectionPoint.clone()
        )

        const width = sizeX // Use sizeX directly
        const height = sizeY // Use sizeY directly

        const uv = {
          x: (foilPosition.x + width / 2) / width,
          y: (foilPosition.y + height / 2) / height,
        }

        if (uv.x >= 0 && uv.x <= 1 && uv.y >= 0 && uv.y <= 1) {
          updateScratch(uv)
        }
      }
    },

    resetPreviousPoint() {
      previousPoint.current = null
    },
  }))

  if (!maskTexture) return null

  return (
    <mesh ref={meshRef} position={position}>
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
        alphaTest={0.5}
      />
    </mesh>
  )
})

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

function Scene({
  scratchEnabled,
  onScratchComplete,
  foilVisible,
  foilRef,
}: {
  scratchEnabled: boolean
  onScratchComplete: () => void
  foilVisible: boolean
  foilRef: React.Ref<unknown>
}) {
  return (
    <>
      <group>
        <Paper position={[0, 0, 0.01]} />
        {foilVisible && (
          <Foil
            ref={foilRef}
            position={[0, -0.248, 0.011]}
            scratchEnabled={scratchEnabled}
            onScratchComplete={onScratchComplete}
          />
        )}
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
  const [scratchComplete, setScratchComplete] = useState(false)
  const [foilVisible, setFoilVisible] = useState(true)
  const [isScratching, setIsScratching] = useState(false)
  const foilRef = useRef<FoilHandle>(null)

  const handleScratchComplete = () => {
    setScratchComplete(true)
  }

  const handleDoneClick = () => {
    setFoilVisible(false)
  }

  const handlePointerDown = () => {
    setIsScratching(true)
  }

  const handlePointerUp = () => {
    setIsScratching(false)
    if (foilRef.current) {
      foilRef.current.resetPreviousPoint()
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isScratching) return
    if (foilRef.current && foilVisible) {
      const rect = event.currentTarget.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      foilRef.current.updateScratchAtScreenPosition(x, y)
    }
  }

  return (
    <>
      <div className="absolute w-fit h-fit top-10 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex flex-row gap-3 p-4">
          <Button onClick={() => setScratchEnabled((prev) => !prev)}>
            {scratchEnabled ? "Enable Rotate" : "Scratch"}
          </Button>
          {scratchComplete && <Button onClick={handleDoneClick}>Done</Button>}
        </div>
      </div>
      <div
        className="min-w-screen min-h-screen flex items-center justify-center flex-col"
        id="canvas-container"
      >
        <Canvas
          camera={{ position: [0, 0, 0.8], fov: 75 }}
          style={{ width: "100%", height: "100vh" }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerMove={handlePointerMove}
        >
          <Scene
            scratchEnabled={scratchEnabled}
            onScratchComplete={handleScratchComplete}
            foilVisible={foilVisible}
            foilRef={foilRef}
          />
        </Canvas>

        <Leva />
      </div>
    </>
  )
}
