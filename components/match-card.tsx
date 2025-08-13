"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import type { Match, Team } from "@/lib/types"
import { Clock, MapPin, Trophy, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface MatchCardProps {
  match: Match
  team1: Team | null
  team2: Team | null
  onUpdateMatch: (matchId: string, updatedMatch: Partial<Match>) => void
  ready?: boolean
  completed?: boolean
  currentUser: any
  pointsToWin?: number
  winBy?: number
  bestOf?: number
  tournamentId: string
}

export function MatchCard({
  match,
  team1,
  team2,
  onUpdateMatch,
  ready = false,
  completed = false,
  currentUser,
  pointsToWin = 11,
  winBy = 2,
  bestOf = 1,
  tournamentId,
}: MatchCardProps) {
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showEditConfirm, setShowEditConfirm] = useState(false)
  const [team1Score, setTeam1Score] = useState<number | undefined>(match.team1Score)
  const [team2Score, setTeam2Score] = useState<number | undefined>(match.team2Score)
  const [team1Games, setTeam1Games] = useState<number[]>(match.team1Games || Array(bestOf).fill(0))
  const [team2Games, setTeam2Games] = useState<number[]>(match.team2Games || Array(bestOf).fill(0))

  // Handle updating game scores
  const handleGameScoreChange = (teamNumber: 1 | 2, gameIndex: number, value: string) => {
    const score = value === "" ? 0 : Number.parseInt(value, 10)
    if (isNaN(score) || score < 0) return

    if (teamNumber === 1) {
      const newScores = [...team1Games]
      newScores[gameIndex] = score
      setTeam1Games(newScores)
    } else {
      const newScores = [...team2Games]
      newScores[gameIndex] = score
      setTeam2Games(newScores)
    }
  }

  // Calculate total score from games
  const calculateTotalScore = (games: number[]) => {
    return games.reduce((sum, score) => sum + score, 0)
  }

  // Calculate games won
  const calculateGamesWon = (team1Games: number[], team2Games: number[]) => {
    let team1Wins = 0
    let team2Wins = 0

    for (let i = 0; i < team1Games.length; i++) {
      if (team1Games[i] > team2Games[i]) {
        team1Wins++
      } else if (team2Games[i] > team1Games[i]) {
        team2Wins++
      }
    }

    return { team1Wins, team2Wins }
  }

  // Determine match winner based on games
  const determineWinner = () => {
    const { team1Wins, team2Wins } = calculateGamesWon(team1Games, team2Games)
    const gamesNeededToWin = Math.ceil(bestOf / 2)

    if (team1Wins >= gamesNeededToWin) {
      return match.team1Id
    } else if (team2Wins >= gamesNeededToWin) {
      return match.team2Id
    }
    return null
  }

  // Check if match is tied (same number of games won)
  const isMatchTied = () => {
    const { team1Wins, team2Wins } = calculateGamesWon(team1Games, team2Games)
    return team1Wins === team2Wins && team1Wins > 0
  }

  // Handle saving the match score
  const handleSaveScore = async () => {
    if (!team1 || !team2) return

    // Validate that at least one game has scores
    const hasScores = team1Games.some((score, index) => score > 0 || team2Games[index] > 0)

    if (!hasScores) {
      toast({
        title: "Invalid Scores",
        description: "Please enter scores for at least one game.",
        variant: "destructive",
      })
      return
    }

    // Set loading state
    setIsSaving(true)

    try {
      // Calculate total scores
      const totalTeam1Score = calculateTotalScore(team1Games)
      const totalTeam2Score = calculateTotalScore(team2Games)

      // Determine winner
      const winnerId = determineWinner()

      // Create the updated match object
      const updatedMatch: Partial<Match> = {
        team1Score: totalTeam1Score,
        team2Score: totalTeam2Score,
        team1Games: team1Games,
        team2Games: team2Games,
        team1TotalPoints: totalTeam1Score,
        team2TotalPoints: totalTeam2Score,
      }

      // Check if match is tied
      const isTied = isMatchTied()
      
      // Only set winner and completed if there's a clear winner
      if (winnerId) {
        updatedMatch.winnerId = winnerId
        updatedMatch.completed = true
      } else if (isTied) {
        // If match is tied, mark as completed with "tied" as winnerId
        updatedMatch.winnerId = "tied"
        updatedMatch.completed = true
      } else {
        // If no clear winner and not tied, reset the match to incomplete
        updatedMatch.winnerId = undefined
        updatedMatch.completed = false
      }

      // Update the match
      await onUpdateMatch(match.id, updatedMatch)

      // Exit editing mode
      setIsEditing(false)

      // Show success toast with appropriate message
      if (winnerId && winnerId !== "tied") {
        const winnerName = winnerId === match.team1Id ? team1?.name : team2?.name
        toast({
          title: "Score Saved Successfully! 🏆",
          description: `${winnerName} wins the match!`,
          duration: 5000,
        })

        // Show winner banner
        toast({
          title: "🎉 Match Complete!",
          description: `${winnerName} is the winner!`,
          duration: 8000,
        })
      } else if (isTied) {
        toast({
          title: "Score Saved Successfully! 🤝",
          description: "Match ended in a tie!",
          duration: 5000,
        })

        // Show tie banner
        toast({
          title: "🤝 Match Complete!",
          description: "The match ended in a tie!",
          duration: 8000,
        })
      } else {
        toast({
          title: "Score Saved Successfully!",
          description: "Match scores have been updated.",
          duration: 3000,
        })
      }
    } catch (error) {
      toast({
        title: "Error Saving Score",
        description: "Failed to save the match score. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Handle starting edit mode
  const handleStartEdit = () => {
    if (completed && (match.winnerId === "tied" || match.winnerId)) {
      // Show confirmation dialog for editing completed matches (winners or ties)
      setShowEditConfirm(true)
    } else {
      // Start editing immediately for incomplete matches
      setIsEditing(true)
    }
  }

  // Handle canceling score entry
  const handleCancelScore = () => {
    // Reset to original values
    setTeam1Score(match.team1Score)
    setTeam2Score(match.team2Score)
    setTeam1Games(match.team1Games || Array(bestOf).fill(0))
    setTeam2Games(match.team2Games || Array(bestOf).fill(0))

    // Exit editing mode
    setIsEditing(false)
  }

  // Format the score display
  const formatScore = (team1Score?: number, team2Score?: number) => {
    if (team1Score === undefined || team2Score === undefined) {
      return "vs"
    }
    return `${team1Score} - ${team2Score}`
  }

  // Format the game scores for display
  const formatGameScores = () => {
    if (!match.team1Games || !match.team2Games) return null

    return match.team1Games
      .map((score, index) => {
        if (score === 0 && match.team2Games![index] === 0) return null
        return `${score}-${match.team2Games![index]}`
      })
      .filter(Boolean)
      .join(", ")
  }

  // Render the match card
  return (
    <Card className={`overflow-hidden ${completed ? "border-green-500 dark:border-green-700" : ""} ${isEditing ? "border-blue-500 dark:border-blue-700 ring-2 ring-blue-200 dark:ring-blue-800" : ""}`}>
      <CardHeader className={`p-4 ${isEditing ? "bg-blue-50 dark:bg-blue-950/20" : "bg-muted/50"}`}>
        <div className="flex justify-between items-center">
          <div className="text-sm font-medium">
            {isEditing ? "✏️ Editing Match " : "Match "}{match.position + 1}
            {completed && !isEditing && " ✅"}
          </div>
          {match.court && (
            <Badge variant="outline" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {match.court}
            </Badge>
          )}
          {match.scheduledTime && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {match.scheduledTime}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {isEditing ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-2">Enter Game Scores</h3>

            {/* Team names above score inputs */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-right font-medium text-sm">{team1 ? team1.name : "Team 1"}</div>
              <div className="text-center"></div>
              <div className="font-medium text-sm">{team2 ? team2.name : "Team 2"}</div>
            </div>

            {Array.from({ length: bestOf }).map((_, gameIndex) => (
              <div key={gameIndex} className="grid grid-cols-3 gap-2 items-center">
                <div className="text-right">
                  <Input
                    type="number"
                    min="0"
                    value={team1Games[gameIndex] || ""}
                    onChange={(e) => handleGameScoreChange(1, gameIndex, e.target.value)}
                    className="text-right"
                  />
                </div>
                <div className="text-center">Game {gameIndex + 1}</div>
                <div>
                  <Input
                    type="number"
                    min="0"
                    value={team2Games[gameIndex] || ""}
                    onChange={(e) => handleGameScoreChange(2, gameIndex, e.target.value)}
                  />
                </div>
              </div>
            ))}
            <div className="flex justify-between mt-4">
              <Button variant="outline" size="sm" onClick={handleCancelScore} className="flex items-center gap-1" disabled={isSaving}>
                <ArrowLeft className="h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSaveScore} size="sm" disabled={isSaving} className="flex items-center gap-1">
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    💾 Save Score
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <div className={`flex-1 ${match.winnerId === match.team1Id ? "font-bold" : ""}`}>
                {team1 ? (
                  <div>
                    <div>{team1.name}</div>
                    {team1.players && team1.players.length > 0 && (
                      <div className="text-xs text-muted-foreground">{team1.players.join(" / ")}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-muted-foreground">TBD</div>
                )}
              </div>
              <div className="mx-2 text-center">
                <div className="text-lg font-semibold">{formatScore(match.team1Score, match.team2Score)}</div>
                {formatGameScores() && <div className="text-xs text-muted-foreground">{formatGameScores()}</div>}
              </div>
              <div className={`flex-1 text-right ${match.winnerId === match.team2Id ? "font-bold" : ""}`}>
                {team2 ? (
                  <div>
                    <div>{team2.name}</div>
                    {team2.players && team2.players.length > 0 && (
                      <div className="text-xs text-muted-foreground">{team2.players.join(" / ")}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-muted-foreground">TBD</div>
                )}
              </div>
            </div>
            {match.winnerId && match.winnerId !== "tied" && (
              <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span className="font-semibold text-lg">
                    🏆 {match.winnerId === match.team1Id ? team1?.name : team2?.name} Wins! 
                  </span>
                </div>
                <div className="text-center text-sm text-green-600 dark:text-green-400 mt-1">
                  Final Score: {match.team1Score} - {match.team2Score}
                </div>
              </div>
            )}
            {match.winnerId === "tied" && (
              <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-300">
                  <span className="text-2xl">🤝</span>
                  <span className="font-semibold text-lg">
                    Match is Tied! 🤝
                  </span>
                </div>
                <div className="text-center text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Final Score: {match.team1Score} - {match.team2Score}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="p-2 bg-muted/30 flex justify-center gap-2">
        {!isEditing && ready && !completed && currentUser && (
          <Button variant="outline" size="sm" onClick={handleStartEdit} className="flex items-center gap-1">
            📝 Enter Score
          </Button>
        )}
        {!isEditing && completed && currentUser && (
          <Button variant="outline" size="sm" onClick={handleStartEdit} className="flex items-center gap-1">
            ✏️ Edit Score
          </Button>
        )}
        {!isEditing && completed && (
          <div className="text-xs text-muted-foreground text-center">
            {match.winnerId === "tied" ? "Match ended in tie • Click Edit Score to modify" : "Match completed • Click Edit Score to modify"}
          </div>
        )}
      </CardFooter>

      {/* Edit Confirmation Dialog */}
      <Dialog open={showEditConfirm} onOpenChange={setShowEditConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Completed Match?</DialogTitle>
            <DialogDescription>
              This match has already been completed {match.winnerId === "tied" ? "in a tie" : "with a winner"}. Are you sure you want to edit the scores? 
              This could affect the tournament bracket progression.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowEditConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setShowEditConfirm(false)
              setIsEditing(true)
            }}>
              Yes, Edit Match
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
