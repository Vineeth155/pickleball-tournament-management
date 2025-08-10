export interface PlayerDetail {
  skillLevel: string;
  ageGroup: string;
  gender: "Male" | "Female";
}

export interface Team {
  id: string;
  name: string;
  seed?: number;
  players?: string[]; // Player names for doubles teams
  playerDetails?: PlayerDetail[]; // Individual player details for doubles teams
  skillLevel?: string; // Pickleball skill level (2.5, 3.0, 3.5, 4.0, 4.5, 5.0)
  ageGroup?: string; // Age group (19+, 35+, 50+, 65+)
  gender?: "Men" | "Women" | "Mixed"; // Gender category
  poolId?: number | string; // For pool play, which pool this team belongs to
  contactEmail?: string; // Contact email for the team
  contactPhone?: string; // Contact phone for the team
  qualified?: boolean; // Whether the team is qualified for knockout stage
  manualPosition?: number; // Manual position override for standings
}

export interface Match {
  id: string;
  round: number;
  position: number;
  team1Id: string | null;
  team2Id: string | null;
  team1Score?: number;
  team2Score?: number;
  team1Games?: number[]; // Array of game scores for best of 3/5 [11-5, 9-11, 11-7]
  team2Games?: number[]; // Array of game scores for best of 3/5 [5-11, 11-9, 7-11]
  team1TotalPoints?: number; // Total points scored by team 1 across all games
  team2TotalPoints?: number; // Total points scored by team 2 across all games
  winnerId: string | null;
  isBye: boolean;
  isWinnersBracket?: boolean;
  loserGoesTo?: string | null;
  winnerGoesTo?: string | null; // Added to track where winners go in losers bracket
  court?: string; // Court assignment
  scheduledTime?: string; // Scheduled time
  matchType?: "Singles" | "Doubles" | "Mixed Doubles"; // Type of match
  bestOf?: number; // Number of games in the match
  completed?: boolean; // Match is completed
  poolId?: number | string; // For pool play, which pool this match belongs to
  isKnockout?: boolean; // For pool play, whether this is a knockout stage match
}

export interface Pool {
  id: string;
  name: string;
  teams: Team[];
}

export enum TournamentFormat {
  SINGLE_ELIMINATION = "single_elimination",
  DOUBLE_ELIMINATION = "double_elimination",
  ROUND_ROBIN = "round_robin",
  POOL_PLAY = "pool_play", // Pool play followed by playoffs (common in pickleball)
}

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  format: TournamentFormat;
  categories: Category[];
  organizerId: string; // ID of the organizer who created this tournament
  createdAt: number;
  matches: Match[];
  totalRounds: number;
  totalWinnerRounds?: number; // Add this for double elimination
  teams: Team[];
  createdBy: string;
  location?: string; // Venue location
  startDate?: string; // Tournament start date
  endDate?: string; // Tournament end date
  pointsToWin?: number; // Points needed to win a game (11, 15, or 21)
  winBy?: number; // Points needed to win by (usually 1 or 2)
  bestOf?: number; // Number of games in the match
  pools?: Pool[]; // For pool play format
  slug?: string; // URL-friendly slug for the tournament
  isStarted?: boolean; // Whether the tournament has been started
  earlyRoundGames?: number; // Number of games in early rounds
  quarterFinalGames?: number; // Number of games in quarter finals
  semiFinalGames?: number; // Number of games in semi finals
  finalGames?: number; // Number of games in finals
  knockoutBracketPopulated?: boolean; // Flag to track if knockout bracket has been populated
}

export interface Category {
  id: string;
  gender: "Mens" | "Womens" | "mixed";
  division: "singles" | "doubles";
  skillLevel?: { min?: number; max?: number };
  ageGroup?: string; // e.g., "19+", "35+", "50+", "65+"
  seedingMethod: "Random" | "Ranking_Based";
}

export interface User {
  id: string;
}
