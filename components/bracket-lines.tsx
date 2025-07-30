"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import type { Match } from "@/lib/types"

interface BracketLinesProps {
  matchesByRound: Record<number, Match[]>
  totalRounds: number
  format: string
  containerRef: React.RefObject<HTMLDivElement>
}

export function BracketLines({ matchesByRound, totalRounds, format, containerRef }: BracketLinesProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [lines, setLines] = useState<Array<{ x1: number; y1: number; x2: number; y2: number }>>([])
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  // Function to calculate the positions of the matches and draw the lines
  const calculateLines = () => {
    if (!containerRef.current || !svgRef.current) return

    const container = containerRef.current
    const svg = svgRef.current
    const containerRect = container.getBoundingClientRect()

    // Set SVG dimensions to match container
    setDimensions({
      width: containerRect.width,
      height: containerRect.height,
    })

    const newLines: Array<{ x1: number; y1: number; x2: number; y2: number }> = []

    // Get all match elements
    const matchElements = container.querySelectorAll("[data-match-id]")
    const matchPositions: Record<string, { x: number; y: number; width: number; height: number }> = {}

    // Calculate positions of all matches relative to the container
    matchElements.forEach((element) => {
      const matchId = element.getAttribute("data-match-id")
      if (!matchId) return

      const rect = element.getBoundingClientRect()
      matchPositions[matchId] = {
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height,
      }
    })

    // For each round except the last, connect matches to the next round
    for (let round = 0; round < totalRounds - 1; round++) {
      const currentRoundMatches = matchesByRound[round] || []
      const nextRoundMatches = matchesByRound[round + 1] || []

      currentRoundMatches.forEach((match) => {
        // Find the next round match this one feeds into
        const nextRoundPosition = Math.floor(match.position / 2)
        const nextMatch = nextRoundMatches.find((m) => m.position === nextRoundPosition)

        if (!nextMatch) return

        const currentMatchPos = matchPositions[match.id]
        const nextMatchPos = matchPositions[nextMatch.id]

        if (!currentMatchPos || !nextMatchPos) return

        // Calculate line coordinates
        const x1 = currentMatchPos.x + currentMatchPos.width
        const y1 = currentMatchPos.y + currentMatchPos.height / 2
        const x2 = nextMatchPos.x
        const y2 = nextMatchPos.y + nextMatchPos.height / 2

        newLines.push({ x1, y1, x2, y2 })
      })
    }

    // For knockout stage in pool play format, connect matches between rounds
    if (format === "POOL_PLAY") {
      // Get all knockout rounds (round >= 100)
      const knockoutRounds = Object.keys(matchesByRound)
        .map(Number)
        .filter((round) => round >= 100)
        .sort((a, b) => a - b)

      for (let i = 0; i < knockoutRounds.length - 1; i++) {
        const currentRound = knockoutRounds[i]
        const nextRound = knockoutRounds[i + 1]

        const currentRoundMatches = matchesByRound[currentRound] || []
        const nextRoundMatches = matchesByRound[nextRound] || []

        currentRoundMatches.forEach((match) => {
          // Find the next round match this one feeds into
          const nextRoundPosition = Math.floor(match.position / 2)
          const nextMatch = nextRoundMatches.find((m) => m.position === nextRoundPosition)

          if (!nextMatch) return

          const currentMatchPos = matchPositions[match.id]
          const nextMatchPos = matchPositions[nextMatch.id]

          if (!currentMatchPos || !nextMatchPos) return

          // Calculate line coordinates
          const x1 = currentMatchPos.x + currentMatchPos.width
          const y1 = currentMatchPos.y + currentMatchPos.height / 2
          const x2 = nextMatchPos.x
          const y2 = nextMatchPos.y + nextMatchPos.height / 2

          newLines.push({ x1, y1, x2, y2 })
        })
      }
    }

    setLines(newLines)
  }

  // Calculate lines on mount and when matches change
  useEffect(() => {
    calculateLines()

    // Add resize listener to recalculate lines when window size changes
    const handleResize = () => {
      calculateLines()
    }

    window.addEventListener("resize", handleResize)

    // Recalculate after a short delay to ensure all elements are properly rendered
    const timeout = setTimeout(() => {
      calculateLines()
    }, 500)

    return () => {
      window.removeEventListener("resize", handleResize)
      clearTimeout(timeout)
    }
  }, [matchesByRound, totalRounds, format])

  return (
    <svg
      ref={svgRef}
      className="absolute top-0 left-0 pointer-events-none z-0"
      width={dimensions.width}
      height={dimensions.height}
    >
      {lines.map((line, index) => (
        <g key={index}>
          <path
            d={`M ${line.x1} ${line.y1} C ${line.x1 + 20} ${line.y1}, ${line.x2 - 20} ${line.y2}, ${line.x2} ${line.y2}`}
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeOpacity="0.3"
            className="text-primary"
          />
        </g>
      ))}
    </svg>
  )
}
