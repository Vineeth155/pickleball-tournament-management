"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getStoredUser, loadTournamentsFromLocalStorage } from "@/lib/auth"
import { getTournamentById, updateTournament } from "@/lib/tournament-store"
import TournamentBracket from "@/components/tournament-bracket"
import StandingsTable from "@/components/standings-table"
import { type User, type Tournament, type Match, TournamentFormat } from "@/lib/types"
import { ArrowLeft, Calendar, Users, AlertCircle } from "lucide-react"

export default function TournamentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [activeTab, setActiveTab] = useState("bracket")

  // Load user and tournament from localStorage on initial render
  useEffect(() => {
    const user = getStoredUser()
    if (user) {
      setCurrentUser(user)
    }

    // Load tournaments from localStorage
    loadTournamentsFromLocalStorage()

    // Get the specific tournament
    const id = params?.id as string
    if (id) {
      const foundTournament = getTournamentById(id)
      if (foundTournament) {
        setTournament(foundTournament)
      } else {
        // Tournament not found, redirect to tournaments list
        router.push("/tournaments")
      }
    }
  }, [params, router])

  // Calculate tournament completion status
  const isTournamentCompleted = () => {
    if (!tournament) return false

    if (tournament.format === TournamentFormat.ROUND_ROBIN) {
      const totalMatches = tournament.matches.length
      const completedMatches = tournament.matches.filter(
        (match) => !!match.winnerId || (match.team1Score !== undefined && match.team2Score !== undefined),
      ).length

      return totalMatches > 0 && completedMatches === totalMatches
    } else {
      // For elimination formats, check if the final match is completed
      const finalRound = tournament.totalRounds - 1
      const finalMatch = tournament.matches.find((match) => match.round === finalRound)

      return finalMatch ? !!finalMatch.winnerId : false
    }
  }

  // Calculate remaining matches
  const getRemainingMatches = () => {
    if (!tournament) return 0

    const totalMatches = tournament.matches.length
    const completedMatches = tournament.matches.filter(
      (match) => !!match.winnerId || (match.team1Score !== undefined && match.team2Score !== undefined),
    ).length

    return totalMatches - completedMatches
  }

  // Update the handleUpdateMatch function to ensure proper state updates
  const handleUpdateMatch = (matchId: string, updatedMatch: Partial<Match>) => {
    if (!tournament || !currentUser?.isAdmin) return

    // Create a deep copy of the tournament to avoid reference issues
    const updatedTournament = JSON.parse(JSON.stringify(tournament)) as Tournament
    const matchIndex = updatedTournament.matches.findIndex((m) => m.id === matchId)

    if (matchIndex !== -1) {
      const match = updatedTournament.matches[matchIndex]

      // Ensure completed flag is set if winner is set
      if (updatedMatch.winnerId !== undefined && updatedMatch.winnerId !== null) {
        updatedMatch.completed = true
      }

      // Debug to see what's happening
      console.log(`[Page] Updating match ${matchId}:`, {
        current: match.winnerId,
        new: updatedMatch.winnerId,
        update: updatedMatch,
      })

      // Update the match with new data
      updatedTournament.matches[matchIndex] = {
        ...match,
        ...updatedMatch,
      }

      // If winner is updated and it's not a round robin tournament, update the next round match
      if (updatedMatch.winnerId && tournament.format !== TournamentFormat.ROUND_ROBIN) {
        const currentRound = match.round
        const nextRound = currentRound + 1

        if (tournament.format === TournamentFormat.DOUBLE_ELIMINATION) {
          // Handle double elimination logic
          if (match.isWinnersBracket) {
            // Winner advances in winners bracket
            if (nextRound < updatedTournament.totalWinnerRounds!) {
              const nextMatchPosition = Math.floor(match.position / 2)
              const nextMatch = updatedTournament.matches.find(
                (m) => m.round === nextRound && m.position === nextMatchPosition && m.isWinnersBracket,
              )

              if (nextMatch) {
                if (match.position % 2 === 0) {
                  nextMatch.team1Id = updatedMatch.winnerId
                } else {
                  nextMatch.team2Id = updatedMatch.winnerId
                }
              }
            } else if (nextRound === updatedTournament.totalWinnerRounds) {
              // Winner of winners final goes to grand final
              const finalMatch = updatedTournament.matches.find((m) => m.id === "final-match")
              if (finalMatch) {
                finalMatch.team1Id = updatedMatch.winnerId
              }
            }

            // Loser goes to losers bracket
            if (match.team1Id && match.team2Id) {
              const loserId = match.team1Id === updatedMatch.winnerId ? match.team2Id : match.team1Id
              if (loserId && match.loserGoesTo) {
                const loserMatch = updatedTournament.matches.find((m) => m.id === match.loserGoesTo)
                if (loserMatch) {
                  // For first round losers, alternate between team1 and team2 slots
                  if (match.round === 0) {
                    if (match.position % 2 === 0) {
                      loserMatch.team1Id = loserId
                    } else {
                      loserMatch.team2Id = loserId
                    }
                  } else {
                    // For later rounds, losers always go to team2 slot
                    loserMatch.team2Id = loserId
                  }
                }
              }
            }
          } else if (!match.isWinnersBracket && match.id !== "final-match") {
            // This is a losers bracket match
            if (match.winnerGoesTo) {
              const nextMatch = updatedTournament.matches.find((m) => m.id === match.winnerGoesTo)
              if (nextMatch) {
                // For losers bracket, determine if this is a consolidation round
                const isConsolidationRound = (match.round - updatedTournament.totalWinnerRounds!) % 2 === 0

                if (isConsolidationRound) {
                  // In consolidation rounds, winners go to team1 slot
                  nextMatch.team1Id = updatedMatch.winnerId
                } else {
                  // In regular rounds, placement depends on position
                  if (match.position % 2 === 0) {
                    nextMatch.team1Id = updatedMatch.winnerId
                  } else {
                    nextMatch.team2Id = updatedMatch.winnerId
                  }
                }
              }
            }
          } else if (match.round === updatedTournament.totalRounds - 2) {
            // Winner of losers final goes to grand final
            const finalMatch = updatedTournament.matches.find((m) => m.id === "final-match")
            if (finalMatch) {
              finalMatch.team2Id = updatedMatch.winnerId
            }
          }
        } else if (tournament.format === TournamentFormat.SINGLE_ELIMINATION) {
          // Handle single elimination logic
          if (nextRound < updatedTournament.totalRounds) {
            // Find the position in the next round
            const nextMatchPosition = Math.floor(match.position / 2)

            const nextMatch = updatedTournament.matches.find(
              (m) => m.round === nextRound && m.position === nextMatchPosition,
            )

            if (nextMatch) {
              // Determine if this winner goes to team1 or team2 slot
              if (match.position % 2 === 0) {
                nextMatch.team1Id = updatedMatch.winnerId
              } else {
                nextMatch.team2Id = updatedMatch.winnerId
              }
            }
          }
        }
      }

      // Update the tournament in localStorage
      updateTournament(updatedTournament)

      // Update the local state
      setTournament(updatedTournament)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString()
  }

  const getFormatLabel = (format: TournamentFormat) => {
    switch (format) {
      case TournamentFormat.SINGLE_ELIMINATION:
        return "Single Elimination"
      case TournamentFormat.DOUBLE_ELIMINATION:
        return "Double Elimination"
      case TournamentFormat.ROUND_ROBIN:
        return "Round Robin"
      default:
        return "Unknown Format"
    }
  }

  const getFormatColor = (format: TournamentFormat) => {
    switch (format) {
      case TournamentFormat.SINGLE_ELIMINATION:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case TournamentFormat.DOUBLE_ELIMINATION:
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case TournamentFormat.ROUND_ROBIN:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  if (!tournament) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p>Loading tournament...</p>
      </div>
    )
  }

  const remainingMatches = getRemainingMatches()
  const tournamentComplete = isTournamentCompleted()

  return (
    <main className="container mx-auto py-8 px-4">
      <Button variant="ghost" className="mb-6" onClick={() => router.push("/tournaments")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Tournaments
      </Button>

      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{tournament.name}</h1>
          <Badge className={getFormatColor(tournament.format)}>{getFormatLabel(tournament.format)}</Badge>

          {!tournamentComplete && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
              In Progress
            </Badge>
          )}

          {tournamentComplete && (
            <Badge variant="outline" className="bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-300">
              Completed
            </Badge>
          )}
        </div>

        {tournament.description && <p className="text-muted-foreground mb-4">{tournament.description}</p>}

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Calendar className="mr-1 h-4 w-4" />
            Created on {formatDate(tournament.createdAt)}
          </div>
          <div className="flex items-center">
            <Users className="mr-1 h-4 w-4" />
            {tournament.teams.length} Teams
          </div>

          {!tournamentComplete && (
            <div className="flex items-center text-yellow-600 dark:text-yellow-400">
              <AlertCircle className="mr-1 h-4 w-4" />
              {remainingMatches} matches remaining
            </div>
          )}
        </div>
      </div>

      {tournament.format === TournamentFormat.ROUND_ROBIN ? (
        <Tabs defaultValue="bracket" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="bracket">Matches</TabsTrigger>
            <TabsTrigger value="standings">Standings</TabsTrigger>
          </TabsList>
          <TabsContent value="bracket">
            <TournamentBracket tournament={tournament} onUpdateMatch={handleUpdateMatch} currentUser={currentUser} />
          </TabsContent>
          <TabsContent value="standings">
            <StandingsTable tournament={tournament} />
          </TabsContent>
        </Tabs>
      ) : (
        <TournamentBracket tournament={tournament} onUpdateMatch={handleUpdateMatch} currentUser={currentUser} />
      )}

      {!currentUser?.isAdmin && (
        <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg text-center">
          <p className="text-yellow-800 dark:text-yellow-200">
            Login as an admin to update match results and manage the tournament.
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => router.push("/")}>
            Go to Login
          </Button>
        </div>
      )}
    </main>
  )
}
