import type { Tournament } from "./types"

// In a real app, this would be a database
let tournaments: Tournament[] = []

export function getAllTournaments(): Tournament[] {
  return [...tournaments]
}

export function getTournamentById(id: string): Tournament | undefined {
  return tournaments.find((t) => t.id === id)
}

export function createTournament(tournament: Omit<Tournament, "id" | "createdAt">): Tournament {
  const slug = createSlug(tournament.name)

  const newTournament: Tournament = {
    ...tournament,
    id: `tournament-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    createdAt: Date.now(),
    slug,
  }

  tournaments.push(newTournament)

  // In a real app, we would save to a database
  saveTournamentsToLocalStorage()

  return newTournament
}

// Update the updateTournament function to ensure proper state updates
export function updateTournament(tournament: Tournament): Tournament {
  const index = tournaments.findIndex((t) => t.id === tournament.id)

  if (index !== -1) {
    // Create a deep copy to ensure all nested objects are properly updated
    tournaments[index] = JSON.parse(JSON.stringify(tournament))

    // Immediately save to localStorage
    saveTournamentsToLocalStorage()

    // Log the update for debugging
    console.log(`Tournament ${tournament.id} updated in store`, {
      pools: tournament.pools?.map((p) => ({
        id: p.id,
        name: p.name,
        teams: p.teams.map((t) => ({
          id: t.id,
          name: t.name,
          manualPosition: t.manualPosition,
          qualified: t.qualified,
        })),
      })),
    })
  } else {
    console.error(`Tournament ${tournament.id} not found in store`)
  }

  return tournament
}

export function deleteTournament(id: string): boolean {
  const initialLength = tournaments.length
  tournaments = tournaments.filter((t) => t.id !== id)

  if (tournaments.length !== initialLength) {
    saveTournamentsToLocalStorage()
    return true
  }

  return false
}

// Local storage functions for persistence
export function loadTournamentsFromLocalStorage(): void {
  if (typeof window === "undefined") return

  try {
    const storedTournaments = localStorage.getItem("tournaments")
    if (storedTournaments) {
      tournaments = JSON.parse(storedTournaments)
    }
  } catch (error) {
    console.error("Failed to load tournaments from localStorage", error)
  }
}

// Update the saveTournamentsToLocalStorage function to ensure proper state persistence
export function saveTournamentsToLocalStorage(): void {
  if (typeof window === "undefined") return

  try {
    // Create a deep copy to avoid reference issues
    const tournamentsCopy = JSON.parse(JSON.stringify(tournaments))
    localStorage.setItem("tournaments", JSON.stringify(tournamentsCopy))
    console.log("Tournaments saved to localStorage:", tournamentsCopy.length)
  } catch (error) {
    console.error("Failed to save tournaments to localStorage", error)
  }
}

// Helper function to create a URL-friendly slug
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

// Enhance the updateMatchInTournament function to handle force updates
export function updateMatchInTournament(tournamentId: string, matchId: string, matchUpdates: Partial<any>): boolean {
  // Skip special force-update cases
  if (matchId === "force-update") {
    console.log("Handling force-update special case")
    // Just trigger a save to ensure all changes are persisted
    saveTournamentsToLocalStorage()
    return true
  }

  const tournament = getTournamentById(tournamentId)
  if (!tournament) {
    console.error(`Tournament ${tournamentId} not found`)
    return false
  }

  const matchIndex = tournament.matches.findIndex((m) => m.id === matchId)
  if (matchIndex === -1) {
    console.error(`Match ${matchId} not found in tournament ${tournamentId}`)
    return false
  }

  // Create a deep copy of the tournament
  const updatedTournament = JSON.parse(JSON.stringify(tournament))

  // Update the match
  updatedTournament.matches[matchIndex] = {
    ...updatedTournament.matches[matchIndex],
    ...matchUpdates,
  }

  // Log the update for debugging
  console.log(`Direct match update:`, {
    matchId,
    before: tournament.matches[matchIndex],
    after: updatedTournament.matches[matchIndex],
  })

  // Update the tournament in the store
  updateTournament(updatedTournament)

  // Force save to localStorage to ensure persistence
  saveTournamentsToLocalStorage()

  return true
}

export function deleteMatchFromTournament(tournamentId: string, matchId: string): boolean {
  const tournament = getTournamentById(tournamentId)
  if (!tournament) {
    console.error(`Tournament ${tournamentId} not found`)
    return false
  }

  const initialMatchesLength = tournament.matches.length
  tournament.matches = tournament.matches.filter((match) => match.id !== matchId)

  if (tournament.matches.length !== initialMatchesLength) {
    updateTournament(tournament)
    saveTournamentsToLocalStorage()
    return true
  }

  return false
}

export function addMatchToTournament(tournamentId: string, newMatch: any): boolean {
  const tournament = getTournamentById(tournamentId)
  if (!tournament) {
    console.error(`Tournament ${tournamentId} not found`)
    return false
  }

  tournament.matches.push(newMatch)
  updateTournament(tournament)
  saveTournamentsToLocalStorage()
  return true
}
