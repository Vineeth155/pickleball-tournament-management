"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Match, Team } from "@/lib/types"

interface DebugMatchProps {
  match: Match
  team1: Team | null
  team2: Team | null
}

export function DebugMatch({ match, team1, team2 }: DebugMatchProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="absolute -bottom-2 -right-2 z-10 text-xs bg-yellow-200 dark:bg-yellow-800 border-yellow-500"
        onClick={() => setIsOpen(true)}
      >
        Debug
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Match Debug Info</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm font-mono overflow-auto max-h-[400px]">
            <div>
              <h3 className="font-bold">Match ID: {match.id}</h3>
              <p>
                Round: {match.round} | Position: {match.position}
              </p>
              <p>Is ByeMatch: {match.isBye ? "Yes" : "No"}</p>
              <p>Completed: {match.completed ? "Yes" : "No"}</p>
              <p>Winner ID: {match.winnerId || "None"}</p>
            </div>

            <div>
              <h3 className="font-bold">Team 1</h3>
              <p>ID: {match.team1Id || "None"}</p>
              <p>Name: {team1?.name || "None"}</p>
              <p>Score: {match.team1Score !== undefined ? match.team1Score : "None"}</p>
              <p>Games: {match.team1Games ? match.team1Games.join(", ") : "None"}</p>
              <p className="font-bold text-green-600">{match.winnerId === match.team1Id ? "WINNER" : ""}</p>
            </div>

            <div>
              <h3 className="font-bold">Team 2</h3>
              <p>ID: {match.team2Id || "None"}</p>
              <p>Name: {team2?.name || "None"}</p>
              <p>Score: {match.team2Score !== undefined ? match.team2Score : "None"}</p>
              <p>Games: {match.team2Games ? match.team2Games.join(", ") : "None"}</p>
              <p className="font-bold text-green-600">{match.winnerId === match.team2Id ? "WINNER" : ""}</p>
            </div>

            <div className="mt-4">
              <pre className="text-xs p-2 bg-gray-100 dark:bg-gray-800 rounded-md overflow-x-auto">
                {JSON.stringify(match, null, 2)}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
