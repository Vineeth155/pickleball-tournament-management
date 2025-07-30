import type { Tournament } from "./types";

// In a real app, this would be a database
let tournaments: Tournament[] = [];

export function getAllTournaments(): Tournament[] {
  return [...tournaments];
}

export function getTournamentById(id: string): Tournament | undefined {
  return tournaments.find((t) => t.id === id);
}

export function createTournament(
  tournament: Omit<Tournament, "id" | "createdAt">
): Tournament {
  const slug = createSlug(tournament.name);

  const newTournament: Tournament = {
    ...tournament,
    id: `tournament-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`,
    createdAt: Date.now(),
    slug,
  };

  tournaments.push(newTournament);

  // In a real app, we would save to a database
  saveTournamentsToLocalStorage();

  return newTournament;
}

// Update the updateTournament function to ensure proper state updates
export function updateTournament(tournament: Tournament): Tournament {
  const index = tournaments.findIndex((t) => t.id === tournament.id);

  if (index !== -1) {
    // Create a deep copy to ensure all nested objects are properly updated
    tournaments[index] = JSON.parse(JSON.stringify(tournament));

    // Immediately save to localStorage
    saveTournamentsToLocalStorage();

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
    });
  } else {
    console.error(`Tournament ${tournament.id} not found in store`);
  }

  return tournament;
}

export function deleteTournament(id: string): boolean {
  const initialLength = tournaments.length;
  tournaments = tournaments.filter((t) => t.id !== id);

  if (tournaments.length !== initialLength) {
    saveTournamentsToLocalStorage();
    return true;
  }

  return false;
}

// Local storage functions for persistence
export function loadTournamentsFromLocalStorage(): void {
  if (typeof window === "undefined") return;

  try {
    const storedTournaments = localStorage.getItem("tournaments");
    if (storedTournaments) {
      tournaments = JSON.parse(storedTournaments);
    }
  } catch (error) {
    console.error("Failed to load tournaments from localStorage", error);
  }
}

// Update the saveTournamentsToLocalStorage function to ensure proper state persistence
export function saveTournamentsToLocalStorage(): void {
  if (typeof window === "undefined") return;

  try {
    // Create a deep copy to avoid reference issues
    const tournamentsCopy = JSON.parse(JSON.stringify(tournaments));
    localStorage.setItem("tournaments", JSON.stringify(tournamentsCopy));
    console.log("Tournaments saved to localStorage:", tournamentsCopy.length);
  } catch (error) {
    console.error("Failed to save tournaments to localStorage", error);
  }
}

// Helper function to create a URL-friendly slug
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Enhance the updateMatchInTournament function to handle force updates
export function updateMatchInTournament(
  tournamentId: string,
  matchId: string,
  matchUpdates: Partial<any>
): boolean {
  // Skip special force-update cases
  if (matchId === "force-update") {
    console.log("Handling force-update special case");
    // Just trigger a save to ensure all changes are persisted
    saveTournamentsToLocalStorage();
    return true;
  }

  const tournament = getTournamentById(tournamentId);
  if (!tournament) {
    console.error(`Tournament ${tournamentId} not found`);
    return false;
  }

  const matchIndex = tournament.matches.findIndex((m) => m.id === matchId);
  if (matchIndex === -1) {
    console.error(`Match ${matchId} not found in tournament ${tournamentId}`);
    return false;
  }

  // Create a deep copy of the tournament
  const updatedTournament = JSON.parse(JSON.stringify(tournament));

  // Update the match
  updatedTournament.matches[matchIndex] = {
    ...updatedTournament.matches[matchIndex],
    ...matchUpdates,
  };

  // Log the update for debugging
  console.log(`Direct match update:`, {
    matchId,
    before: tournament.matches[matchIndex],
    after: updatedTournament.matches[matchIndex],
  });

  // Update the tournament in the store
  updateTournament(updatedTournament);

  // Force save to localStorage to ensure persistence
  saveTournamentsToLocalStorage();

  return true;
}

export function deleteMatchFromTournament(
  tournamentId: string,
  matchId: string
): boolean {
  const tournament = getTournamentById(tournamentId);
  if (!tournament) {
    console.error(`Tournament ${tournamentId} not found`);
    return false;
  }

  const initialMatchesLength = tournament.matches.length;
  tournament.matches = tournament.matches.filter(
    (match) => match.id !== matchId
  );

  if (tournament.matches.length !== initialMatchesLength) {
    updateTournament(tournament);
    saveTournamentsToLocalStorage();
    return true;
  }

  return false;
}

export function addMatchToTournament(
  tournamentId: string,
  newMatch: any
): boolean {
  const tournament = getTournamentById(tournamentId);
  if (!tournament) {
    console.error(`Tournament ${tournamentId} not found`);
    return false;
  }

  tournament.matches.push(newMatch);
  updateTournament(tournament);
  saveTournamentsToLocalStorage();
  return true;
}

export async function loadTournamentsFromDB(): Promise<void> {
  try {
    const res = await fetch("/api/tournaments", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch tournaments");

    const data = await res.json();
    tournaments = data;

    console.log("Tournaments loaded from MongoDB:", tournaments.length);
  } catch (error) {
    console.error("Failed to load tournaments from MongoDB", error);
  }
}
export async function getTournamentsFromDB(): Promise<Tournament[]> {
  try {
    const res = await fetch("/api/tournaments", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load tournaments");
    const data = await res.json();
    return data; // ✅ return the tournaments instead of void
  } catch (error) {
    console.error("❌ Failed to load tournaments from DB:", error);
    return [];
  }
}

export async function saveTournamentsToDB(): Promise<void> {
  try {
    const tournamentsCopy = JSON.parse(JSON.stringify(tournaments));

    for (const t of tournamentsCopy) {
      if (t._id) {
        await updateTournamentInDB(t.id, t); // PUT for existing
      } else {
        await saveTournamentToDB(t); // POST for new
      }
    }

    console.log("Tournaments saved to MongoDB:", tournamentsCopy.length);
  } catch (error) {
    console.error("Failed to save tournaments to MongoDB", error);
  }
}
export async function saveTournamentToDB(tournament: any) {
  const res = await fetch("/api/tournaments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tournament),
  });
  if (!res.ok) throw new Error("Failed to save tournament");
  return res.json();
}
// export async function updateTournamentInDB(id: string, tournament: any) {
//   const res = await fetch(`/api/tournaments/${id}`, {
//     method: "PUT",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(tournament),
//   });
//   if (!res.ok) throw new Error("Failed to update tournament");
//   return res.json();
// }
export async function updateTournamentInDB(
  tournament: Tournament
): Promise<Tournament> {
  try {
    const res = await fetch(`/api/tournaments/${tournament.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tournament),
    });

    if (!res.ok) throw new Error("Failed to update tournament");
    const updated = await res.json();

    console.log(`Tournament ${tournament.id} updated in MongoDB`);
    return updated;
  } catch (error) {
    console.error("Failed to update tournament in MongoDB:", error);
    throw error;
  }
}
export async function deleteTournamentFromDB(id: string) {
  const res = await fetch(`/api/tournaments/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete tournament");
  return res.json();
}
export async function getTournamentByIdFromDB(
  id: string
): Promise<Tournament | null> {
  try {
    const res = await fetch(`/api/tournaments/${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch tournament");
    return res.json();
  } catch (error) {
    console.error(`Failed to get tournament ${id} from MongoDB`, error);
    return null;
  }
}
export async function addMatchToTournamentInDB(
  tournamentId: string,
  newMatch: any
): Promise<boolean> {
  try {
    // 1️⃣ Fetch the current tournament from DB
    const res = await fetch(`/api/tournaments/${tournamentId}`);
    if (!res.ok) throw new Error(`Tournament ${tournamentId} not found`);
    const tournament = await res.json();

    // 2️⃣ Add the new match
    tournament.matches.push(newMatch);

    // 3️⃣ Update this tournament in DB
    const updateRes = await fetch(`/api/tournaments/${tournamentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tournament),
    });

    if (!updateRes.ok)
      throw new Error("Failed to update tournament with new match");

    console.log(`✅ Match added to tournament ${tournamentId}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to add match to tournament:", error);
    return false;
  }
}
export async function deleteMatchFromTournamentInDB(
  tournamentId: string,
  matchId: string
): Promise<boolean> {
  try {
    // 1️⃣ Fetch the current tournament from MongoDB
    const res = await fetch(`/api/tournaments/${tournamentId}`);
    if (!res.ok) throw new Error(`Tournament ${tournamentId} not found`);
    const tournament = await res.json();

    const initialMatchesLength = tournament.matches.length;

    // 2️⃣ Remove the match
    tournament.matches = tournament.matches.filter(
      (match: any) => match.id !== matchId
    );

    if (tournament.matches.length === initialMatchesLength) {
      console.warn(`Match ${matchId} not found in tournament ${tournamentId}`);
      return false;
    }

    // 3️⃣ Save updated tournament back to MongoDB
    const updateRes = await fetch(`/api/tournaments/${tournamentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tournament),
    });

    if (!updateRes.ok)
      throw new Error("Failed to update tournament after deleting match");

    console.log(`✅ Match ${matchId} deleted from tournament ${tournamentId}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to delete match from tournament:", error);
    return false;
  }
}
export async function updateMatchInTournamentInDB(
  tournamentId: string,
  matchId: string,
  matchUpdates: Partial<any>
): Promise<boolean> {
  try {
    // 1️⃣ Handle the force-update special case
    if (matchId === "force-update") {
      console.log("Handling force-update special case");
      return true; // No DB update needed here
    }

    // 2️⃣ Fetch the tournament from MongoDB
    const res = await fetch(`/api/tournaments/${tournamentId}`);
    if (!res.ok) throw new Error(`Tournament ${tournamentId} not found`);
    const tournament = await res.json();

    const matchIndex = tournament.matches.findIndex(
      (m: any) => m.id === matchId
    );
    if (matchIndex === -1) {
      console.error(`Match ${matchId} not found in tournament ${tournamentId}`);
      return false;
    }

    // 3️⃣ Create a deep copy and update the match
    const updatedTournament = JSON.parse(JSON.stringify(tournament));
    updatedTournament.matches[matchIndex] = {
      ...updatedTournament.matches[matchIndex],
      ...matchUpdates,
    };

    // 4️⃣ Send updated tournament back to MongoDB
    const updateRes = await fetch(`/api/tournaments/${tournamentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedTournament),
    });

    if (!updateRes.ok) throw new Error("Failed to update match in MongoDB");

    console.log(`✅ Match ${matchId} updated in tournament ${tournamentId}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to update match in tournament:", error);
    return false;
  }
}
export async function createTournamentInDB(
  tournament: Omit<Tournament, "id" | "createdAt">
): Promise<Tournament> {
  try {
    const slug = createSlug(tournament.name);

    const newTournament: Tournament = {
      ...tournament,
      createdAt: Date.now(),
      slug,
    };

    const res = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTournament),
    });

    if (!res.ok) throw new Error("Failed to create tournament");
    const savedTournament = await res.json();

    console.log(`✅ Tournament "${savedTournament.name}" created in MongoDB`);
    return savedTournament;
  } catch (error) {
    console.error("❌ Failed to create tournament:", error);
    throw error;
  }
}
