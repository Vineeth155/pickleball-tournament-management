import { getTournaments, saveTournament } from "./tournament-store";
import type { TournamentType } from "./types";

let tournaments: TournamentType[] = [];

// ✅ Save tournaments to MongoDB
export async function saveTournamentsToDB(): Promise<void> {
  try {
    const tournamentsCopy = JSON.parse(JSON.stringify(tournaments));
    for (const t of tournamentsCopy) {
      await saveTournament(t); // API call to POST /api/tournaments
    }
    console.log("Tournaments saved to MongoDB:", tournamentsCopy.length);
  } catch (error) {
    console.error("Failed to save tournaments to MongoDB", error);
  }
}

// ✅ Load tournaments from MongoDB
export async function loadTournamentsFromDB(): Promise<void> {
  try {
    const data = await getTournaments(); // API call to GET /api/tournaments
    tournaments = data;
    console.log("Tournaments loaded from MongoDB:", tournaments.length);
  } catch (error) {
    console.error("Failed to load tournaments from MongoDB", error);
  }
}

// Getter for other parts of the app
export function getTournamentData(): TournamentType[] {
  return tournaments;
}
