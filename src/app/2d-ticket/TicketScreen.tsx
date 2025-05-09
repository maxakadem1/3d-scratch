"use client"
import { Leva, useControls } from "leva"
import React, { useEffect, useRef, useState } from "react"

interface ScratchTicket2DProps {
  width: number
  height: number
  ticketImageUrl: string
  brushSize: number
  areaX: number
  areaY: number
  areaWidth: number
  areaHeight: number
  onScratchComplete: () => void
}

const ScratchTicket2D: React.FC<ScratchTicket2DProps> = ({
  width,
  height,
  ticketImageUrl,
  brushSize,
  areaX,
  areaY,
  areaWidth,
  areaHeight,
  onScratchComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [cleared, setCleared] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current!
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")!

    // fill only the scratch-area overlay
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = "#CCC"
    ctx.fillRect(areaX, areaY, areaWidth, areaHeight)
    ctx.globalCompositeOperation = "destination-out"
  }, [width, height, areaX, areaY, areaWidth, areaHeight])

  const getPointerPos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    const { x, y } = getPointerPos(e)
    if (
      x >= areaX &&
      x <= areaX + areaWidth &&
      y >= areaY &&
      y <= areaY + areaHeight
    ) {
      setIsDrawing(true)
      draw(e)
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return
    draw(e)
  }

  const onPointerUp = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    checkCompletion()
  }

  const draw = (e: React.PointerEvent) => {
    const ctx = canvasRef.current!.getContext("2d")!
    const { x, y } = getPointerPos(e)
    if (
      x < areaX ||
      x > areaX + areaWidth ||
      y < areaY ||
      y > areaY + areaHeight
    )
      return
    ctx.beginPath()
    ctx.arc(x, y, brushSize, 0, Math.PI * 2)
    ctx.fill()
  }

  const checkCompletion = () => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    const imgData = ctx.getImageData(areaX, areaY, areaWidth, areaHeight)
    let count = 0
    for (let i = 3; i < imgData.data.length; i += 4) {
      if (imgData.data[i] === 0) count++
    }
    const total = areaWidth * areaHeight
    const percent = (count / total) * 100
    if (percent > 80 && !cleared) {
      setCleared(true)
      onScratchComplete()
    }
  }

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width, height, userSelect: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <img
        src={ticketImageUrl}
        alt="Scratch Ticket"
        style={{ display: "block", width, height }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          cursor: "pointer",
        }}
      />
    </div>
  )
}

export default function Home2D() {
  // separate Leva panels so each control group works correctly
  const { ticketWidth, ticketHeight } = useControls("Ticket Size", {
    ticketWidth: { value: 500, min: 100, max: 1000, step: 10 },
    ticketHeight: { value: 1000, min: 600, max: 2000, step: 10 },
  })
  const { brushSize } = useControls("Scratch Brush", {
    brushSize: { value: 25, min: 5, max: 100, step: 1 },
  })
  const { areaX, areaY, areaWidth, areaHeight } = useControls("Scratch Area", {
    areaX: { value: 25, min: 0, max: 700, step: 1 },
    areaY: { value: 520, min: 0, max: 1000, step: 1 },
    areaWidth: { value: 450, min: 10, max: 1000, step: 1 },
    areaHeight: { value: 450, min: 10, max: 600, step: 1 },
  })

  const [revealed, setRevealed] = useState(false)

  return (
    <>
      <Leva collapsed />
      <div className="flex flex-col items-center justify-center min-h-[90vh] min-w-[90vw]">
        {!revealed ? (
          <ScratchTicket2D
            width={ticketWidth}
            height={ticketHeight}
            ticketImageUrl="/lotteryFront.png"
            brushSize={brushSize}
            areaX={areaX}
            areaY={areaY}
            areaWidth={areaWidth}
            areaHeight={areaHeight}
            onScratchComplete={() => setRevealed(true)}
          />
        ) : (
          <div className="text-xl font-bold">You Won!</div>
        )}
      </div>
    </>
  )
}
