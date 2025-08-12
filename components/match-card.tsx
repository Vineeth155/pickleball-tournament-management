"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { Match, Team } from "@/lib/types"
import { Clock, MapPin, Trophy, ArrowLeft, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

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

  // Handle saving the match score
  const handleSaveScore = () => {
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
      winnerId: winnerId,
      completed: true,
    }

    // Update the match
    onUpdateMatch(match.id, updatedMatch)

    // Exit editing mode
    setIsEditing(false)

    // Show success toast
    toast({
      title: "Score Updated",
      description: "The match score has been successfully updated.",
    })
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
    <Card className={`overflow-hidden ${completed ? "border-green-500 dark:border-green-700" : ""}`}>
      <CardHeader className="p-4 bg-muted/50">
        <div className="flex justify-between items-center">
          <div className="text-sm font-medium">Match {match.position + 1}</div>
          <div className="flex gap-2">

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
              <Button variant="outline" size="sm" onClick={handleCancelScore} className="flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSaveScore} size="sm">
                Save Score
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
            {match.winnerId && (
              <div className="flex items-center justify-center gap-1 text-sm text-green-600 dark:text-green-400">
                <Trophy className="h-4 w-4" />
                <span>Winner: {match.winnerId === match.team1Id ? team1?.name : team2?.name}</span>
              </div>
            )}

          </>
        )}
      </CardContent>
      <CardFooter className="p-2 bg-muted/30 flex justify-center gap-2">
        {!isEditing && ready && !completed && currentUser && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            Enter Score
          </Button>
        )}
        {!isEditing && completed && currentUser && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            Edit Score
          </Button>
        )}
        <Link href={`/tournaments/${tournamentId}/match/${match.id}`}>
          <Button variant="default" size="sm" className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white">
            <ExternalLink className="h-3 w-3" />
            View Match
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
