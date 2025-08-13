import type { Tournament } from "./types";

// In a real app, this would be a database
let tournaments: Tournament[] = [];

export function getAllTournaments(): Tournament[] {
  return [...tournaments];
}

export function getTournamentById(id: string): Tournament | undefined {
  const tournament = tournaments.find((t) => t.id === id);
  if (!tournament) {
    console.log(`Tournament ${id} not found in store. Available IDs:`, tournaments.map(t => t.id));
  }
  return tournament;
}

// Helper function to get current date in IST timezone as string
function getCurrentDateIST(): string {
  return new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
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
    createdAt: getCurrentDateIST(), // Use IST timezone string
    organizerId: tournament.organizerId || tournament.createdBy, // Ensure organizerId is set
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
      categories: tournament.categories?.map((cat) => ({
        id: cat.id,
        gender: cat.gender,
        division: cat.division,
        format: cat.format,
        pools: cat.pools?.map((p) => ({
          id: p.id,
          name: p.name,
          teams: p.teams.map((t) => ({
            id: t.id,
            name: t.name,
            manualPosition: t.manualPosition,
            qualified: t.qualified,
          })),
        })),
        matches: cat.matches?.length || 0,
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
      console.log(`Loaded ${tournaments.length} tournaments from localStorage`);
    }
  } catch (error) {
    console.error("Failed to load tournaments from localStorage", error);
  }
}

// Initialize tournaments from database on app start
export async function initializeTournaments(): Promise<void> {
  try {
    console.log("Initializing tournaments from database...");
    const response = await fetch('/api/tournaments');
    if (response.ok) {
      const dbTournaments = await response.json();
      tournaments = dbTournaments;
      saveTournamentsToLocalStorage();
      console.log(`Initialized ${tournaments.length} tournaments from database`);
    } else {
      console.warn("Failed to fetch tournaments from database, using localStorage fallback");
      loadTournamentsFromLocalStorage();
    }
  } catch (error) {
    console.warn("Failed to initialize tournaments from database, using localStorage fallback:", error);
    loadTournamentsFromLocalStorage();
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

// Helper function to find a match in a tournament's categories
function findMatchInTournament(tournament: Tournament, matchId: string): { categoryIndex: number; matchIndex: number } | null {
  for (let categoryIndex = 0; categoryIndex < tournament.categories.length; categoryIndex++) {
    const category = tournament.categories[categoryIndex];
    if (category.matches) {
      const matchIndex = category.matches.findIndex(m => m.id === matchId);
      if (matchIndex !== -1) {
        return { categoryIndex, matchIndex };
      }
    }
  }
  return null;
}

// Helper function to find a category by ID
function findCategoryInTournament(tournament: Tournament, categoryId: string): number | null {
  const categoryIndex = tournament.categories.findIndex(cat => cat.id === categoryId);
  return categoryIndex !== -1 ? categoryIndex : null;
}

// Enhanced match management functions that work with categories
export async function updateMatchInTournament(
  tournamentId: string,
  matchId: string,
  matchUpdates: Partial<any>
): Promise<boolean> {
  // Skip special force-update cases
  if (matchId === "force-update") {
    console.log("Handling force-update special case");
    saveTournamentsToLocalStorage();
    return true;
  }

  // Debug: Log all available tournament IDs
  console.log("Available tournament IDs:", tournaments.map(t => t.id));
  console.log("Looking for tournament ID:", tournamentId);
  console.log("Total tournaments in store:", tournaments.length);

  let tournament = getTournamentById(tournamentId);
  if (!tournament) {
    console.log(`Tournament ${tournamentId} not found in local store, trying to refresh from database...`);
    
    // Try to refresh from database
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`);
      if (response.ok) {
        const dbTournament = await response.json();
        // Add to local store
        tournaments.push(dbTournament);
        saveTournamentsToLocalStorage();
        tournament = dbTournament;
        console.log(`Tournament ${tournamentId} loaded from database and added to local store`);
      } else {
        console.error(`Tournament ${tournamentId} not found in database either`);
        console.error("Available tournaments:", tournaments.map(t => ({ id: t.id, name: t.name })));
        return false;
      }
    } catch (error) {
      console.error(`Failed to fetch tournament ${tournamentId} from database:`, error);
      console.error("Available tournaments:", tournaments.map(t => ({ id: t.id, name: t.name })));
      return false;
    }
  }

  const matchLocation = findMatchInTournament(tournament, matchId);
  if (!matchLocation) {
    console.error(`Match ${matchId} not found in tournament ${tournamentId}`);
    return false;
  }

  const { categoryIndex, matchIndex } = matchLocation;
  
  // Create a deep copy of the tournament
  const updatedTournament = JSON.parse(JSON.stringify(tournament));

  // Update the match
  updatedTournament.categories[categoryIndex].matches[matchIndex] = {
    ...updatedTournament.categories[categoryIndex].matches[matchIndex],
    ...matchUpdates,
  };

  // Log the update for debugging
  const category = tournament.categories[categoryIndex];
  const matches = category.matches;
  
  if (matches && matches[matchIndex]) {
    console.log(`Match update in category ${categoryIndex}:`, {
      matchId,
      before: matches[matchIndex],
      after: updatedTournament.categories[categoryIndex].matches[matchIndex],
    });
  }

  // Update the tournament in the store
  updateTournament(updatedTournament);
  saveTournamentsToLocalStorage();

  // Also update in the database
  try {
    await updateTournamentInDB(updatedTournament);
    console.log(`✅ Match ${matchId} updated in both local store and database`);
  } catch (error) {
    console.error(`❌ Failed to update match ${matchId} in database:`, error);
    // Don't fail the entire operation if DB update fails
    // The local update was successful
  }

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

  const matchLocation = findMatchInTournament(tournament, matchId);
  if (!matchLocation) {
    console.error(`Match ${matchId} not found in tournament ${tournamentId}`);
    return false;
  }

  const { categoryIndex, matchIndex } = matchLocation;
  const category = tournament.categories[categoryIndex];
  
  if (!category.matches) {
    console.error(`Category ${categoryIndex} has no matches`);
    return false;
  }

  const initialMatchesLength = category.matches.length;
  category.matches = category.matches.filter(match => match.id !== matchId);

  if (category.matches.length !== initialMatchesLength) {
    updateTournament(tournament);
    saveTournamentsToLocalStorage();
    return true;
  }

  return false;
}

export function addMatchToTournament(
  tournamentId: string,
  categoryId: string,
  newMatch: any
): boolean {
  const tournament = getTournamentById(tournamentId);
  if (!tournament) {
    console.error(`Tournament ${tournamentId} not found`);
    return false;
  }

  const categoryIndex = findCategoryInTournament(tournament, categoryId);
  if (categoryIndex === null) {
    console.error(`Category ${categoryId} not found in tournament ${tournamentId}`);
    return false;
  }

  const category = tournament.categories[categoryIndex];
  if (!category.matches) {
    category.matches = [];
  }

  category.matches.push(newMatch);
  updateTournament(tournament);
  saveTournamentsToLocalStorage();
  
  console.log(`Match added to category ${categoryId} in tournament ${tournamentId}`);
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
        await updateTournamentInDB(t); // PUT for existing - only pass tournament object
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
  categoryId: string,
  newMatch: any
): Promise<boolean> {
  try {
    // 1️⃣ Fetch the current tournament from DB
    const res = await fetch(`/api/tournaments/${tournamentId}`);
    if (!res.ok) throw new Error(`Tournament ${tournamentId} not found`);
    const tournament = await res.json();

    // 2️⃣ Find the category and add the new match
    const categoryIndex = tournament.categories.findIndex((cat: any) => cat.id === categoryId);
    if (categoryIndex === -1) {
      throw new Error(`Category ${categoryId} not found in tournament ${tournamentId}`);
    }

    if (!tournament.categories[categoryIndex].matches) {
      tournament.categories[categoryIndex].matches = [];
    }

    tournament.categories[categoryIndex].matches.push(newMatch);

    // 3️⃣ Update this tournament in DB
    const updateRes = await fetch(`/api/tournaments/${tournamentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tournament),
    });

    if (!updateRes.ok)
      throw new Error("Failed to update tournament with new match");

    console.log(`✅ Match added to category ${categoryId} in tournament ${tournamentId}`);
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

    // 2️⃣ Find the match in categories and remove it
    let matchFound = false;
    for (const category of tournament.categories) {
      if (category.matches) {
        const initialMatchesLength = category.matches.length;
        category.matches = category.matches.filter((match: any) => match.id !== matchId);
        
        if (category.matches.length !== initialMatchesLength) {
          matchFound = true;
          break;
        }
      }
    }

    if (!matchFound) {
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

    // 3️⃣ Find the match in categories and update it
    let matchFound = false;
    for (const category of tournament.categories) {
      if (category.matches) {
        const matchIndex = category.matches.findIndex((m: any) => m.id === matchId);
        if (matchIndex !== -1) {
          // Update the match
          category.matches[matchIndex] = {
            ...category.matches[matchIndex],
            ...matchUpdates,
          };
          matchFound = true;
          break;
        }
      }
    }

    if (!matchFound) {
      console.error(`Match ${matchId} not found in tournament ${tournamentId}`);
      return false;
    }

    // 4️⃣ Save updated tournament back to MongoDB
    const updateRes = await fetch(`/api/tournaments/${tournamentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tournament),
    });

    if (!updateRes.ok)
      throw new Error("Failed to update tournament after updating match");

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
    const newTournament: Tournament = {
      ...tournament,
      id: `tournament-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`,
      createdAt: getCurrentDateIST(), // Use IST timezone string
      organizerId: tournament.organizerId || tournament.createdBy, // Ensure organizerId is set
    };

    const res = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTournament),
    });

    if (!res.ok) throw new Error("Failed to create tournament");
    const created = await res.json();

    console.log(`Tournament ${created.id} created in MongoDB`);
    return created;
  } catch (error) {
    console.error("Failed to create tournament in MongoDB:", error);
    throw error;
  }
}

// Function to refresh tournaments from database
export async function refreshTournamentsFromDB(): Promise<void> {
  try {
    console.log("Refreshing tournaments from database...");
    const response = await fetch('/api/tournaments');
    if (!response.ok) {
      throw new Error(`Failed to fetch tournaments: ${response.status}`);
    }
    const dbTournaments = await response.json();
    
    // Update the local store
    tournaments = dbTournaments;
    
    // Save to localStorage
    saveTournamentsToLocalStorage();
    
    console.log(`Refreshed ${tournaments.length} tournaments from database`);
  } catch (error) {
    console.error("Failed to refresh tournaments from database:", error);
  }
}

// Debug function to inspect tournament store state
export function debugTournamentStore(): void {
  console.log("=== Tournament Store Debug Info ===");
  console.log("Total tournaments in store:", tournaments.length);
  console.log("Tournament IDs:", tournaments.map(t => t.id));
  console.log("Tournament names:", tournaments.map(t => t.name));
  console.log("Store tournaments array:", tournaments);
  console.log("=== End Debug Info ===");
}
