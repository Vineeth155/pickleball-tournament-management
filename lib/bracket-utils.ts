import {
  type Team,
  type Tournament,
  type Match,
  type Category,
  TournamentFormat,
} from "./types";

// Helper function to get current date in IST timezone as string
function getCurrentDateIST(): string {
  return new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
}

interface BracketOptions {
  earlyRoundPoints?: number;
  quarterFinalPoints?: number;
  semiFinalPoints?: number;
  finalPoints?: number;
  enablePoolPlay?: boolean;
  earlyRoundGames?: number;
  quarterFinalGames?: number;
  semiFinalGames?: number;
  finalGames?: number;
}

// Update the generateBracket function to work with categories
export function generateBracket(
  teams: Team[],
  name: string,
  format: TournamentFormat,
  description = "",
  createdBy: string,
  options: BracketOptions = {}
): Tournament {
  const {
    enablePoolPlay = false, // Default to false
    earlyRoundGames = 1,
    quarterFinalGames = 3,
    semiFinalGames = 3,
    finalGames = 3,
  } = options;

  // Create a default category with the tournament configuration
  const defaultCategory: Category = {
    id: `category-${Date.now()}`,
    gender: "Mens",
    division: "doubles",
    skillLevel: { min: 2.0, max: 8.0 },
    ageGroup: "Open",
    seedingMethod: "Random",
    format: format,
    totalRounds: 0, // Will be set after matches are generated
    pointsToWin: 11,
    winBy: 2,
    bestOf: 1,
    earlyRoundGames,
    quarterFinalGames,
    semiFinalGames,
    finalGames,
    earlyRoundPoints: 11,
    quarterFinalPoints: 11,
    semiFinalPoints: 11,
    finalPoints: 11,
    numberOfPools: 2,
    teams: teams,
    matches: [],
    pools: [],
    createdBy,
    updatedBy: createdBy,
  };

  // Generate matches for the category based on format
  if (format === TournamentFormat.POOL_PLAY) {
    defaultCategory.matches = generatePoolPlayMatches(teams, defaultCategory);
    defaultCategory.pools = generatePools(teams, defaultCategory.numberOfPools || 2);
  } else if (format === TournamentFormat.SINGLE_ELIMINATION) {
    console.log("Generating SINGLE_ELIMINATION matches...");
    defaultCategory.matches = generateSingleEliminationMatches(teams, defaultCategory);
    console.log(`After generating matches: ${defaultCategory.matches.length} matches, totalRounds: ${defaultCategory.totalRounds}`);
  } else if (format === TournamentFormat.DOUBLE_ELIMINATION) {
    defaultCategory.matches = generateDoubleEliminationMatches(teams, defaultCategory);
  } else if (format === TournamentFormat.ROUND_ROBIN) {
    defaultCategory.matches = generateRoundRobinMatches(teams, defaultCategory);
  }

  // Set totalRounds on the category
  console.log("About to calculate totalRounds...");
  console.log("Matches array:", defaultCategory.matches?.length || 0);
  console.log("Matches rounds:", defaultCategory.matches?.map(m => m.round) || []);

  if (defaultCategory.matches && defaultCategory.matches.length > 0) {
    const maxRound = Math.max(...defaultCategory.matches.map(m => m.round), 0);
    defaultCategory.totalRounds = maxRound + 1;
    console.log(`Set totalRounds for category to: ${defaultCategory.totalRounds} (max round: ${maxRound})`);

    // Debug: Show all rounds that were generated
    const rounds = [...new Set(defaultCategory.matches.map(m => m.round))].sort((a, b) => a - b);
    console.log(`Rounds generated in main function: ${rounds.join(', ')}`);

    // Verify the assignment worked
    console.log(`Verification - category.totalRounds is now: ${defaultCategory.totalRounds}`);
  } else {
    console.warn(`No matches generated, setting totalRounds to 0`);
    defaultCategory.totalRounds = 0;
  }

  return {
    id: `tournament-${Date.now()}`,
    name,
    description,
    categories: [defaultCategory],
    createdAt: getCurrentDateIST(), // Use IST timezone string
    createdBy,
    organizerId: createdBy, // Use createdBy as organizerId for now
    updatedBy: createdBy,
  };
}

// Generate bracket for a specific category
export function generateBracketForCategory(category: Category): Category {
  const { teams = [], format } = category;

  if (!teams || teams.length === 0) {
    console.warn(`No teams provided for category ${category.gender} ${category.division}`);
    return category;
  }

  // Create a copy of the category to avoid mutating the original
  const updatedCategory = { ...category };

  // Generate matches based on the format
  if (format === TournamentFormat.POOL_PLAY) {
    // For pool play, we need to update the teams with poolId and then generate matches
    const { updatedTeams, matches } = generatePoolPlayMatchesWithTeamUpdates(teams, category);
    updatedCategory.teams = updatedTeams;
    updatedCategory.matches = matches;
    updatedCategory.pools = generatePools(updatedTeams, category.numberOfPools || 2);
  } else if (format === TournamentFormat.SINGLE_ELIMINATION) {
    updatedCategory.matches = generateSingleEliminationMatches(teams, category);
  } else if (format === TournamentFormat.DOUBLE_ELIMINATION) {
    updatedCategory.matches = generateDoubleEliminationMatches(teams, category);
  } else if (format === TournamentFormat.ROUND_ROBIN) {
    updatedCategory.matches = generateRoundRobinMatches(teams, category);
  } else {
    console.warn(`Unknown tournament format: ${format}`);
    updatedCategory.matches = [];
  }

  // Validate that matches were generated
  if (!updatedCategory.matches || updatedCategory.matches.length === 0) {
    console.warn(`No matches generated for category ${category.gender} ${category.division} with format ${format}`);
    updatedCategory.totalRounds = 0; // Set to 0 if no matches
  } else {
    console.log(`Generated ${updatedCategory.matches.length} matches for category ${category.gender} ${category.division}`);

    // Calculate and set totalRounds based on the generated matches
    if (updatedCategory.matches.length > 0) {
      const maxRound = Math.max(...updatedCategory.matches.map(m => m.round), 0);
      updatedCategory.totalRounds = maxRound + 1;
      console.log(`Category ${category.gender} ${category.division} has ${updatedCategory.totalRounds} rounds (max round: ${maxRound})`);

      // Debug: Show all rounds that were generated
      const rounds = [...new Set(updatedCategory.matches.map(m => m.round))].sort((a, b) => a - b);
      console.log(`Rounds generated: ${rounds.join(', ')}`);
    }
  }

  return updatedCategory;
}

// Generate brackets for all categories in a tournament
export function generateBracketsForTournament(tournament: Tournament): Tournament {
  if (!tournament.categories || tournament.categories.length === 0) {
    console.error("Tournament has no categories");
    throw new Error("Tournament must have at least one category");
  }

  const updatedTournament = { ...tournament };

  // Generate brackets for each category
  updatedTournament.categories = tournament.categories.map(category => {
    try {
      return generateBracketForCategory(category);
    } catch (error) {
      console.error(`Error generating bracket for category ${category.gender} ${category.division}:`, error);
      // Return the original category if bracket generation fails
      return category;
    }
  });

  // Set totalRounds on each category based on their matches
  updatedTournament.categories.forEach(category => {
    console.log(`\n=== Processing category: ${category.gender} ${category.division} ===`);
    console.log(`Current totalRounds: ${category.totalRounds}`);
    console.log(`Matches count: ${category.matches?.length || 0}`);

    if (category.matches && category.matches.length > 0) {
      // Debug: Show all match rounds
      const allRounds = category.matches.map(m => m.round);
      console.log(`All match rounds: ${allRounds.join(', ')}`);

      const maxRound = Math.max(...category.matches.map(m => m.round), 0);
      const calculatedTotalRounds = maxRound + 1;

      console.log(`Calculated values: maxRound=${maxRound}, calculatedTotalRounds=${calculatedTotalRounds}`);

      // Only update if totalRounds is not already set or is incorrect
      if (!category.totalRounds || category.totalRounds !== calculatedTotalRounds) {
        console.log(`Updating totalRounds for ${category.gender} ${category.division}: ${category.totalRounds} -> ${calculatedTotalRounds}`);
        category.totalRounds = calculatedTotalRounds;
      } else {
        console.log(`Category ${category.gender} ${category.division}: totalRounds already correct (${category.totalRounds})`);
      }

      console.log(`Final totalRounds: ${category.totalRounds}`);
    } else {
      console.warn(`Category ${category.gender} ${category.division} has no matches, setting totalRounds to 0`);
      category.totalRounds = 0;
    }
  });

  updatedTournament.isStarted = true;

  // Set knockoutBracketPopulated on categories based on their format
  updatedTournament.categories.forEach(category => {
    if (category.matches && category.matches.length > 0) {
      // Only set knockoutBracketPopulated for formats that actually have knockout brackets
      if (category.format === TournamentFormat.SINGLE_ELIMINATION ||
        category.format === TournamentFormat.DOUBLE_ELIMINATION ||
        category.format === TournamentFormat.POOL_PLAY) {
        category.knockoutBracketPopulated = true;
        console.log(`Category ${category.gender} ${category.division}: knockout bracket populated`);
      } else {
        // Round Robin doesn't have knockout brackets
        category.knockoutBracketPopulated = false;
        console.log(`Category ${category.gender} ${category.division}: no knockout bracket (${category.format})`);
      }
    }
  });

  // Log summary of generated brackets
  const totalMatches = updatedTournament.categories.reduce((total, cat) => {
    return total + (cat.matches?.length || 0);
  }, 0);

  console.log(`Generated brackets for tournament "${updatedTournament.name}":`);
  console.log(`- Categories: ${updatedTournament.categories.length}`);
  console.log(`- Total matches: ${totalMatches}`);
  console.log(`- Category rounds:`, updatedTournament.categories.map(cat =>
    `${cat.gender} ${cat.division}: ${cat.totalRounds} rounds`
  ));

  return updatedTournament;
}

// Helper function to generate single elimination matches for a category
function generateSingleEliminationMatches(teams: Team[], category: Category): Match[] {
  const { earlyRoundGames = 1, earlyRoundPoints = 11 } = category;

  // Sort teams by seed if available
  const sortedTeams = [...teams].sort((a, b) => {
    if (a.seed && b.seed) return a.seed - b.seed;
    if (a.seed) return -1;
    if (b.seed) return 1;
    return 0;
  });

  // Calculate the number of rounds needed
  const totalTeams = sortedTeams.length;
  const totalRounds = Math.ceil(Math.log2(totalTeams));
  const perfectBracketSize = Math.pow(2, totalRounds);

  console.log(`Single elimination bracket generation:`, {
    totalTeams,
    totalRounds,
    perfectBracketSize,
    byesNeeded: perfectBracketSize - totalTeams
  });

  // Calculate number of byes needed
  const byesNeeded = perfectBracketSize - totalTeams;

  // Create matches array
  const matches: Match[] = [];

  // Generate first round matches
  const firstRoundMatchCount = perfectBracketSize / 2;

  // Create a map to track which teams have been assigned
  const assignedTeams = new Set<string>();

  for (let i = 0; i < firstRoundMatchCount; i++) {
    // For seeded tournaments, we want to distribute byes to top seeds
    // This uses a standard bracket distribution algorithm
    let team1Index: number | null = null;
    let team2Index: number | null = null;
    let isBye = false;

    // Calculate the ideal positions for this match
    const seedPosition1 = i;
    const seedPosition2 = firstRoundMatchCount * 2 - 1 - i;

    // Assign team 1 if available
    if (
      seedPosition1 < totalTeams &&
      !assignedTeams.has(sortedTeams[seedPosition1].id)
    ) {
      team1Index = seedPosition1;
      assignedTeams.add(sortedTeams[seedPosition1].id);
    }

    // Assign team 2 if available
    if (
      seedPosition2 < totalTeams &&
      !assignedTeams.has(sortedTeams[seedPosition2].id)
    ) {
      team2Index = seedPosition2;
      assignedTeams.add(sortedTeams[seedPosition2].id);
    }

    // Check if this is a bye match (only one team assigned)
    if (team1Index !== null && team2Index === null) {
      isBye = true;
    } else if (team1Index === null && team2Index !== null) {
      // If only team2 is assigned, move it to team1 position
      team1Index = team2Index;
      team2Index = null;
      isBye = true;
    }

    // If we've assigned all teams, don't create empty matches
    if (team1Index === null && team2Index === null) {
      continue;
    }

    matches.push({
      id: `match-0-${i}`,
      round: 0,
      position: i,
      team1Id: team1Index !== null ? sortedTeams[team1Index]?.id || null : null,
      team2Id: team2Index !== null ? sortedTeams[team2Index]?.id || null : null,
      team1Score: undefined,
      team2Score: undefined,
      team1Games: Array(earlyRoundGames).fill(0),
      team2Games: Array(earlyRoundGames).fill(0),
      winnerId: isBye ? sortedTeams[team1Index as number]?.id || null : null,
      isBye,
      bestOf: earlyRoundGames,
      createdAt: getCurrentDateIST(),
      updatedAt: getCurrentDateIST(),
      createdBy: category.createdBy,
      updatedBy: category.updatedBy,
    });
  }

  // Generate subsequent rounds with proper progression
  for (let round = 1; round < totalRounds; round++) {
    const matchesInRound = perfectBracketSize / Math.pow(2, round + 1);

    // Determine the number of games for this round
    let bestOf = earlyRoundGames;
    let pointsToWin = earlyRoundPoints;

    // Quarter-finals (round totalRounds-3)
    if (round === totalRounds - 3) {
      bestOf = category.quarterFinalGames || 3;
      pointsToWin = category.quarterFinalPoints || 11;
    }
    // Semi-finals (round totalRounds-2)
    else if (round === totalRounds - 2) {
      bestOf = category.semiFinalGames || 3;
      pointsToWin = category.semiFinalPoints || 11;
    }
    // Finals (round totalRounds-1)
    else if (round === totalRounds - 1) {
      bestOf = category.finalGames || 3;
      pointsToWin = category.finalPoints || 11;
    }

    // Ensure we create matches for this round even if there are no teams yet
    for (let i = 0; i < matchesInRound; i++) {
      // Calculate where the winner of this match goes
      const nextRound = round + 1;
      const nextMatchPosition = Math.floor(i / 2);

      matches.push({
        id: `match-${round}-${i}`,
        round,
        position: i,
        team1Id: null,
        team2Id: null,
        team1Score: undefined,
        team2Score: undefined,
        team1Games: Array(bestOf).fill(0),
        team2Games: Array(bestOf).fill(0),
        winnerId: null,
        isBye: false,
        bestOf,
        createdAt: getCurrentDateIST(),
        updatedAt: getCurrentDateIST(),
        createdBy: category.createdBy,
        updatedBy: category.updatedBy,
      });
    }
  }

  // Ensure we have all rounds from 0 to totalRounds-1
  const roundsCreated = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);
  console.log(`Generated rounds for single elimination: ${roundsCreated.join(', ')}`);
  console.log(`Expected rounds: 0 to ${totalRounds - 1}`);
  console.log(`Total matches generated: ${matches.length}`);
  console.log(`Sample match structure:`, matches[0] ? {
    id: matches[0].id,
    round: matches[0].round,
    position: matches[0].position
  } : 'No matches');

  // Advance teams that got a bye in the first round
  const byeMatches = matches.filter(
    (match) => match.round === 0 && match.isBye
  );

  byeMatches.forEach((byeMatch) => {
    const nextMatchPosition = Math.floor(byeMatch.position / 2);

    const nextMatch = matches.find(
      (m) => m.round === 1 && m.position === nextMatchPosition
    );

    if (nextMatch && byeMatch.winnerId) {
      if (byeMatch.position % 2 === 0) {
        nextMatch.team1Id = byeMatch.winnerId;
      } else {
        nextMatch.team2Id = byeMatch.winnerId;
      }
    }
  });

  return matches;
}

// Helper function to generate double elimination matches for a category
function generateDoubleEliminationMatches(teams: Team[], category: Category): Match[] {
  const { earlyRoundGames = 1, earlyRoundPoints = 11 } = category;

  // Sort teams by seed if available
  const sortedTeams = [...teams].sort((a, b) => {
    if (a.seed && b.seed) return a.seed - b.seed;
    if (a.seed) return -1;
    if (b.seed) return 1;
    return 0;
  });

  // Calculate the number of rounds needed for winners bracket
  const totalTeams = sortedTeams.length;
  const totalWinnerRounds = Math.ceil(Math.log2(totalTeams));
  const perfectBracketSize = Math.pow(2, totalWinnerRounds);

  // Calculate losers bracket rounds
  // Losers bracket needs to handle teams dropping from each winners round
  // and then play through to determine the finalist
  const totalLoserRounds = totalWinnerRounds + 1; // +1 for final consolidation
  const totalRounds = totalWinnerRounds + totalLoserRounds + 1; // +1 for grand final

  // Create matches array
  const matches: Match[] = [];

  // Generate winners bracket first round matches
  const firstRoundMatchCount = perfectBracketSize / 2;

  // Create a map to track which teams have been assigned
  const assignedTeams = new Set<string>();

  // Winners bracket - first round
  for (let i = 0; i < firstRoundMatchCount; i++) {
    let team1Index: number | null = null;
    let team2Index: number | null = null;
    let isBye = false;

    // Calculate the ideal positions for this match
    const seedPosition1 = i;
    const seedPosition2 = firstRoundMatchCount * 2 - 1 - i;

    // Assign team 1 if available
    if (
      seedPosition1 < totalTeams &&
      !assignedTeams.has(sortedTeams[seedPosition1].id)
    ) {
      team1Index = seedPosition1;
      assignedTeams.add(sortedTeams[seedPosition1].id);
    }

    // Assign team 2 if available
    if (
      seedPosition2 < totalTeams &&
      !assignedTeams.has(sortedTeams[seedPosition2].id)
    ) {
      team2Index = seedPosition2;
      assignedTeams.add(sortedTeams[seedPosition2].id);
    }

    // Check if this is a bye match (only one team assigned)
    if (team1Index !== null && team2Index === null) {
      isBye = true;
    } else if (team1Index === null && team2Index !== null) {
      // If only team2 is assigned, move it to team1 position
      team1Index = team2Index;
      team2Index = null;
      isBye = true;
    }

    // If we've assigned all teams, don't create empty matches
    if (team1Index === null && team2Index === null) {
      continue;
    }

    matches.push({
      id: `w-match-0-${i}`,
      round: 0,
      position: i,
      team1Id: team1Index !== null ? sortedTeams[team1Index]?.id || null : null,
      team2Id: team2Index !== null ? sortedTeams[team2Index]?.id || null : null,
      team1Score: undefined,
      team2Score: undefined,
      team1Games: Array(earlyRoundGames).fill(0),
      team2Games: Array(earlyRoundGames).fill(0),
      winnerId: isBye ? sortedTeams[team1Index as number]?.id || null : null,
      isBye,
      isWinnersBracket: true,
      loserGoesTo: isBye ? null : `l-match-0-${Math.floor(i / 2)}`,
      bestOf: earlyRoundGames,
      createdAt: getCurrentDateIST(),
      updatedAt: getCurrentDateIST(),
      createdBy: category.createdBy,
      updatedBy: category.updatedBy,
    });
  }

  // Generate subsequent rounds for winners bracket
  for (let round = 1; round < totalWinnerRounds; round++) {
    const matchesInRound = perfectBracketSize / Math.pow(2, round + 1);

    // Determine the number of games for this round
    let bestOf = earlyRoundGames;

    // Quarter-finals
    if (round === totalWinnerRounds - 3) {
      bestOf = category.quarterFinalGames || 3;
    }
    // Semi-finals
    else if (round === totalWinnerRounds - 2) {
      bestOf = category.semiFinalGames || 3;
    }
    // Finals
    else if (round === totalWinnerRounds - 1) {
      bestOf = category.finalGames || 3;
    }

    for (let i = 0; i < matchesInRound; i++) {
      // Calculate the correct loser destination
      const loserRound = round * 2;
      const loserPosition = Math.floor(i / 2);

      matches.push({
        id: `w-match-${round}-${i}`,
        round,
        position: i,
        team1Id: null,
        team2Id: null,
        team1Score: undefined,
        team2Score: undefined,
        team1Games: Array(bestOf).fill(0),
        team2Games: Array(bestOf).fill(0),
        winnerId: null,
        isBye: false,
        isWinnersBracket: true,
        loserGoesTo:
          round < totalWinnerRounds - 1
            ? `l-match-${loserRound}-${loserPosition}`
            : null,
        bestOf,
        createdAt: getCurrentDateIST(),
        updatedAt: getCurrentDateIST(),
        createdBy: category.createdBy,
        updatedBy: category.updatedBy,
      });
    }
  }

  // Advance teams that got a bye in the first round of winners bracket
  const byeMatches = matches.filter(
    (match) => match.round === 0 && match.isBye && match.isWinnersBracket
  );

  byeMatches.forEach((byeMatch) => {
    const nextMatchPosition = Math.floor(byeMatch.position / 2);

    const nextMatch = matches.find(
      (m) =>
        m.round === 1 && m.position === nextMatchPosition && m.isWinnersBracket
    );

    if (nextMatch && byeMatch.winnerId) {
      if (byeMatch.position % 2 === 0) {
        nextMatch.team1Id = byeMatch.winnerId;
      } else {
        nextMatch.team2Id = byeMatch.winnerId;
      }
    }
  });

  // Generate losers bracket matches
  // First round of losers bracket receives losers from winners round 1
  const firstRoundLoserMatches = Math.ceil(firstRoundMatchCount / 2);

  // Create losers bracket rounds
  // First, create round 0 of losers bracket (losers from winners round 1)
  for (let i = 0; i < firstRoundLoserMatches; i++) {
    matches.push({
      id: `l-match-0-${i}`,
      round: totalWinnerRounds, // Start losers bracket rounds after winners rounds
      position: i,
      team1Id: null,
      team2Id: null,
      team1Score: undefined,
      team2Score: undefined,
      team1Games: Array(earlyRoundGames).fill(0),
      team2Games: Array(earlyRoundGames).fill(0),
      winnerId: null,
      isBye: false,
      isWinnersBracket: false,
      loserGoesTo: null,
      // Winners from losers round 0 go to losers round 1
      winnerGoesTo: `l-match-1-${i}`,
      bestOf: earlyRoundGames,
      createdAt: getCurrentDateIST(),
      updatedAt: getCurrentDateIST(),
      createdBy: category.createdBy,
      updatedBy: category.updatedBy,
    });
  }

  // Now create the rest of the losers bracket
  for (let round = 1; round < totalLoserRounds; round++) {
    const isConsolidationRound = round % 2 === 1;

    // Calculate how many matches in this round
    let matchesInRound = 0;

    if (isConsolidationRound) {
      // Consolidation rounds have the same number of matches as the previous round
      matchesInRound = matches.filter(
        (m) => !m.isWinnersBracket && m.round === totalWinnerRounds + round - 1
      ).length;
    } else {
      // Regular rounds have half the number of matches as the previous round
      const previousRoundMatches = matches.filter(
        (m) => !m.isWinnersBracket && m.round === totalWinnerRounds + round - 1
      ).length;
      matchesInRound = Math.ceil(previousRoundMatches / 2);
    }

    // Determine the number of games for this round
    let bestOf = earlyRoundGames;

    // For later rounds in losers bracket, use more games
    const loserRoundEquivalent = totalLoserRounds - round;

    // Quarter-finals equivalent
    if (loserRoundEquivalent === 3) {
      bestOf = category.quarterFinalGames || 3;
    }
    // Semi-finals equivalent
    else if (loserRoundEquivalent === 2) {
      bestOf = category.semiFinalGames || 3;
    }
    // Finals equivalent
    else if (loserRoundEquivalent === 1) {
      bestOf = category.finalGames || 3;
    }

    for (let i = 0; i < matchesInRound; i++) {
      // Calculate where the winner of this match goes
      let winnerGoesTo = null;

      if (round < totalLoserRounds - 1) {
        const nextRound = round + 1;
        const nextMatchPosition = isConsolidationRound ? Math.floor(i / 2) : i;
        winnerGoesTo = `l-match-${nextRound}-${nextMatchPosition}`;
      } else if (round === totalLoserRounds - 1) {
        // Last losers round winner goes to final
        winnerGoesTo = "final-match";
      }

      matches.push({
        id: `l-match-${round}-${i}`,
        round: totalWinnerRounds + round,
        position: i,
        team1Id: null,
        team2Id: null,
        team1Score: undefined,
        team2Score: undefined,
        team1Games: Array(bestOf).fill(0),
        team2Games: Array(bestOf).fill(0),
        winnerId: null,
        isBye: false,
        isWinnersBracket: false,
        loserGoesTo: null,
        winnerGoesTo: winnerGoesTo,
        bestOf,
        createdAt: getCurrentDateIST(),
        updatedAt: getCurrentDateIST(),
        createdBy: category.createdBy,
        updatedBy: category.updatedBy,
      });
    }
  }

  // Final match (winners bracket champion vs losers bracket champion)
  matches.push({
    id: `final-match`,
    round: totalRounds - 1,
    position: 0,
    team1Id: null, // Winners bracket champion
    team2Id: null, // Losers bracket champion
    team1Score: undefined,
    team2Score: undefined,
    team1Games: Array(category.finalGames || 3).fill(0),
    team2Games: Array(category.finalGames || 3).fill(0),
    winnerId: null,
    isBye: false,
    isWinnersBracket: false,
    loserGoesTo: null,
    bestOf: category.finalGames || 3,
    createdAt: getCurrentDateIST(),
    updatedAt: getCurrentDateIST(),
    createdBy: category.createdBy,
    updatedBy: category.updatedBy,
  });

  return matches;
}

// Helper function to generate round robin matches for a category
function generateRoundRobinMatches(teams: Team[], category: Category): Match[] {
  const { earlyRoundGames = 1 } = category;

  const totalTeams = teams.length;
  const matches: Match[] = [];

  // For round robin, each team plays against every other team
  // If odd number of teams, one team gets a bye each round
  const roundsNeeded = totalTeams % 2 === 0 ? totalTeams - 1 : totalTeams;

  // Create a fixed schedule using the circle method
  // This ensures each team plays exactly once per round and plays every other team exactly once
  const schedule = createRoundRobinSchedule(teams);

  // Add all matches from the schedule
  schedule.forEach((round, roundIndex) => {
    // Only process rounds that have at least one non-bye match
    const nonByeMatches = round.filter(matchup =>
      matchup.team1Id !== "bye" && matchup.team2Id !== "bye"
    );

    if (nonByeMatches.length > 0) {
      nonByeMatches.forEach((matchup, matchIndex) => {
        matches.push({
          id: `match-${roundIndex}-${matchIndex}`,
          round: roundIndex,
          position: matchIndex,
          team1Id: matchup.team1Id,
          team2Id: matchup.team2Id,
          team1Score: undefined,
          team2Score: undefined,
          team1Games: Array(earlyRoundGames).fill(0),
          team2Games: Array(earlyRoundGames).fill(0),
          winnerId: null,
          isBye: false,
          bestOf: earlyRoundGames,
          createdAt: getCurrentDateIST(),
          updatedAt: getCurrentDateIST(),
          createdBy: category.createdBy,
          updatedBy: category.updatedBy,
        });
      });
    }
  });

  // Ensure we have sequential rounds by re-mapping round numbers
  if (matches.length > 0) {
    const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);
    const roundMapping = new Map();
    rounds.forEach((oldRound, newRound) => {
      roundMapping.set(oldRound, newRound);
    });

    // Update all matches with sequential round numbers
    matches.forEach(match => {
      match.round = roundMapping.get(match.round) || 0;
    });
  }

  console.log(`Round robin matches generated:`, {
    totalTeams,
    totalMatches: matches.length,
    rounds: [...new Set(matches.map(m => m.round))].sort((a, b) => a - b)
  });

  return matches;
}

// Helper function to generate pool play matches for a category
function generatePoolPlayMatches(teams: Team[], category: Category): Match[] {
  const { earlyRoundGames = 1, earlyRoundPoints = 11 } = category;

  // Sort teams by skill level/rating if available
  const sortedTeams = [...teams].sort((a, b) => {
    if (a.skillLevel && b.skillLevel) {
      // Convert skill levels like "4.5" to numbers for comparison
      const skillA = Number.parseFloat(a.skillLevel);
      const skillB = Number.parseFloat(b.skillLevel);
      return skillB - skillA; // Higher skill first
    }
    if (a.seed && b.seed) return a.seed - b.seed;
    if (a.seed) return -1;
    if (b.seed) return 1;
    return 0;
  });

  // Determine number of pools based on team count
  let numPools = category.numberOfPools || 2; // Use category setting or default to 2

  if (sortedTeams.length >= 16 && !category.numberOfPools) {
    numPools = 4;
  } else if (sortedTeams.length >= 12 && !category.numberOfPools) {
    numPools = 3;
  }

  // Create pools with snake distribution
  const pools: Team[][] = Array.from({ length: numPools }, () => []);

  // Distribute teams in snake pattern (1,2,3,4,4,3,2,1,...)
  sortedTeams.forEach((team, index) => {
    const poolIndex = index % (2 * numPools);
    const actualPoolIndex =
      poolIndex < numPools ? poolIndex : 2 * numPools - 1 - poolIndex;
    // Add poolId to the team
    pools[actualPoolIndex].push({
      ...team,
      poolId: actualPoolIndex,
    });
  });

  // Create matches for pool play (round robin within each pool)
  const matches: Match[] = [];
  let matchCounter = 0;

  // Generate round robin matches for each pool
  pools.forEach((poolTeams, poolIndex) => {
    const schedule = createRoundRobinSchedule(poolTeams);

    schedule.forEach((round, roundIndex) => {
      round.forEach((matchup, matchIndex) => {
        if (matchup.team1Id !== "bye" && matchup.team2Id !== "bye") {
          matches.push({
            id: `pool-${poolIndex}-match-${matchCounter++}`,
            round: roundIndex,
            position: matchIndex,
            team1Id: matchup.team1Id,
            team2Id: matchup.team2Id,
            team1Score: undefined,
            team2Score: undefined,
            team1Games: Array(earlyRoundGames).fill(0),
            team2Games: Array(earlyRoundGames).fill(0),
            winnerId: null,
            isBye: false,
            poolId: poolIndex,
            bestOf: earlyRoundGames,
            createdAt: getCurrentDateIST(),
            updatedAt: getCurrentDateIST(),
            createdBy: category.createdBy,
            updatedBy: category.updatedBy,
          });
        }
      });
    });
  });

  // Calculate total rounds needed for knockout stage
  const teamsAdvancing = numPools * 2; // Top 2 from each pool
  const knockoutRounds = Math.ceil(Math.log2(teamsAdvancing));

  // Generate knockout stage matches
  for (let round = 0; round < knockoutRounds; round++) {
    const matchesInRound = Math.pow(2, knockoutRounds - round - 1);

    // Determine the number of games for this round
    let bestOf = earlyRoundGames;

    // Quarter-finals (round 0 for 8 teams)
    if (round === 0 && knockoutRounds >= 3) {
      bestOf = category.quarterFinalGames || 3;
    }
    // Semi-finals (round knockoutRounds-2)
    else if (round === knockoutRounds - 2) {
      bestOf = category.semiFinalGames || 3;
    }
    // Finals (round knockoutRounds-1)
    else if (round === knockoutRounds - 1) {
      bestOf = category.finalGames || 3;
    }

    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        id: `knockout-${round}-${i}`,
        round: round + 100, // Use 100+ to distinguish from pool play rounds
        position: i,
        team1Id: null,
        team2Id: null,
        team1Score: undefined,
        team2Score: undefined,
        team1Games: Array(bestOf).fill(0),
        team2Games: Array(bestOf).fill(0),
        winnerId: null,
        isBye: false,
        isKnockout: true,
        bestOf,
        createdAt: getCurrentDateIST(),
        updatedAt: getCurrentDateIST(),
        createdBy: category.createdBy,
        updatedBy: category.updatedBy,
      });
    }
  }

  return matches;
}

// Helper function to generate pool play matches with updated teams (including poolId)
function generatePoolPlayMatchesWithTeamUpdates(teams: Team[], category: Category): { updatedTeams: Team[], matches: Match[] } {
  const { earlyRoundGames = 1, earlyRoundPoints = 11 } = category;

  // Sort teams by skill level/rating if available
  const sortedTeams = [...teams].sort((a, b) => {
    if (a.skillLevel && b.skillLevel) {
      // Convert skill levels like "4.5" to numbers for comparison
      const skillA = Number.parseFloat(a.skillLevel);
      const skillB = Number.parseFloat(b.skillLevel);
      return skillB - skillA; // Higher skill first
    }
    if (a.seed && b.seed) return a.seed - b.seed;
    if (a.seed) return -1;
    if (b.seed) return 1;
    return 0;
  });

  // Determine number of pools based on team count
  let numPools = category.numberOfPools || 2; // Use category setting or default to 2

  if (sortedTeams.length >= 16 && !category.numberOfPools) {
    numPools = 4;
  } else if (sortedTeams.length >= 12 && !category.numberOfPools) {
    numPools = 3;
  }

  // Create pools with snake distribution
  const pools: Team[][] = Array.from({ length: numPools }, () => []);

  // Distribute teams in snake pattern (1,2,3,4,4,3,2,1,...)
  sortedTeams.forEach((team, index) => {
    const poolIndex = index % (2 * numPools);
    const actualPoolIndex =
      poolIndex < numPools ? poolIndex : 2 * numPools - 1 - poolIndex;
    // Add poolId to the team
    pools[actualPoolIndex].push({
      ...team,
      poolId: actualPoolIndex,
    });
  });

  // Create matches for pool play (round robin within each pool)
  const matches: Match[] = [];
  let matchCounter = 0;

  // Generate round robin matches for each pool
  pools.forEach((poolTeams, poolIndex) => {
    const schedule = createRoundRobinSchedule(poolTeams);

    schedule.forEach((round, roundIndex) => {
      round.forEach((matchup, matchIndex) => {
        if (matchup.team1Id !== "bye" && matchup.team2Id !== "bye") {
          matches.push({
            id: `pool-${poolIndex}-match-${matchCounter++}`,
            round: roundIndex,
            position: matchIndex,
            team1Id: matchup.team1Id,
            team2Id: matchup.team2Id,
            team1Score: undefined,
            team2Score: undefined,
            team1Games: Array(earlyRoundGames).fill(0),
            team2Games: Array(earlyRoundGames).fill(0),
            winnerId: null,
            isBye: false,
            poolId: poolIndex,
            bestOf: earlyRoundGames,
            createdAt: getCurrentDateIST(),
            updatedAt: getCurrentDateIST(),
            createdBy: category.createdBy,
            updatedBy: category.updatedBy,
          });
        }
      });
    });
  });

  // Calculate total rounds needed for knockout stage
  const teamsAdvancing = numPools * 2; // Top 2 from each pool
  const knockoutRounds = Math.ceil(Math.log2(teamsAdvancing));

  // Generate knockout stage matches
  for (let round = 0; round < knockoutRounds; round++) {
    const matchesInRound = Math.pow(2, knockoutRounds - round - 1);

    // Determine the number of games for this round
    let bestOf = earlyRoundGames;

    // Quarter-finals (round 0 for 8 teams)
    if (round === 0 && knockoutRounds >= 3) {
      bestOf = category.quarterFinalGames || 3;
    }
    // Semi-finals (round knockoutRounds-2)
    else if (round === knockoutRounds - 2) {
      bestOf = category.semiFinalGames || 3;
    }
    // Finals (round knockoutRounds-1)
    else if (round === knockoutRounds - 1) {
      bestOf = category.finalGames || 3;
    }

    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        id: `knockout-${round}-${i}`,
        round: round + 100, // Use 100+ to distinguish from pool play rounds
        position: i,
        team1Id: null,
        team2Id: null,
        team1Score: undefined,
        team2Score: undefined,
        team1Games: Array(bestOf).fill(0),
        team2Games: Array(bestOf).fill(0),
        winnerId: null,
        isBye: false,
        isKnockout: true,
        bestOf,
        createdAt: getCurrentDateIST(),
        updatedAt: getCurrentDateIST(),
        createdBy: category.createdBy,
        updatedBy: category.updatedBy,
      });
    }
  }

  // Flatten the pools array to get all teams with poolId
  const updatedTeams = pools.flat();

  return { updatedTeams, matches };
}

// Helper function to generate pools for a category
function generatePools(teams: Team[], numberOfPools: number) {
  // Sort teams by skill level/rating if available
  const sortedTeams = [...teams].sort((a, b) => {
    if (a.skillLevel && b.skillLevel) {
      const skillA = Number.parseFloat(a.skillLevel);
      const skillB = Number.parseFloat(b.skillLevel);
      return skillB - skillA; // Higher skill first
    }
    if (a.seed && b.seed) return a.seed - b.seed;
    if (a.seed) return -1;
    if (b.seed) return 1;
    return 0;
  });

  // Create pools with snake distribution
  const pools: Team[][] = Array.from({ length: numberOfPools }, () => []);

  // Distribute teams in snake pattern (1,2,3,4,4,3,2,1,...)
  sortedTeams.forEach((team, index) => {
    const poolIndex = index % (2 * numberOfPools);
    const actualPoolIndex =
      poolIndex < numberOfPools ? poolIndex : 2 * numberOfPools - 1 - poolIndex;

    // Create a copy of the team with poolId
    const teamWithPool = {
      ...team,
      poolId: actualPoolIndex,
    };

    pools[actualPoolIndex].push(teamWithPool);
  });

  // Create pool objects
  return pools.map((poolTeams, index) => ({
    id: index.toString(),
    name: `Pool ${String.fromCharCode(65 + index)}`, // Pool A, Pool B, etc.
    teams: poolTeams,
    createdAt: getCurrentDateIST(),
    updatedAt: getCurrentDateIST(),
    createdBy: "system",
    updatedBy: "system",
  }));
}

function createRoundRobinSchedule(teams: Team[]) {
  const schedule = [];
  const teamCount = teams.length;

  // If odd number of teams, add a "bye" team
  const teamsForScheduling = [...teams];
  if (teamCount % 2 === 1) {
    teamsForScheduling.push({ id: "bye", name: "BYE" } as Team);
  }

  const n = teamsForScheduling.length;
  const rounds = n - 1;

  console.log(`Creating round robin schedule:`, {
    originalTeamCount: teamCount,
    teamsForScheduling: teamsForScheduling.length,
    totalRounds: rounds
  });

  // Create array of team IDs for scheduling
  const teamIds = teamsForScheduling.map((team) => team.id);

  // For each round
  for (let round = 0; round < rounds; round++) {
    const roundMatches = [];

    // In each round, each team plays once
    for (let i = 0; i < n / 2; i++) {
      // First team stays fixed, others rotate
      const team1Index = i;
      const team2Index = n - 1 - i;

      // For the first position, use the fixed team
      const team1Id =
        i === 0 ? teamIds[0] : teamIds[((round + i) % (n - 1)) + 1];
      // For the opponent, rotate the teams
      const team2Id =
        i === 0
          ? teamIds[((round + 1) % (n - 1)) + 1]
          : teamIds[((round + team2Index) % (n - 1)) + 1];

      // Ensure we're not matching a team against itself and neither team is a bye
      if (team1Id !== team2Id && team1Id !== "bye" && team2Id !== "bye") {
        roundMatches.push({
          team1Id: team1Id,
          team2Id: team2Id,
        });
      }
    }

    console.log(`Round ${round} matches:`, roundMatches);
    schedule.push(roundMatches);
  }

  return schedule;
}

// Helper function to validate generated brackets
export function validateGeneratedBrackets(tournament: Tournament): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  console.log("Validating generated brackets for tournament:", tournament.name);

  if (!tournament.categories || tournament.categories.length === 0) {
    errors.push("Tournament has no categories");
    return { isValid: false, errors };
  }

  tournament.categories.forEach((category, categoryIndex) => {
    console.log(`Validating category ${category.gender} ${category.division}:`, {
      totalRounds: category.totalRounds,
      matchesCount: category.matches?.length || 0,
      rounds: category.matches ? [...new Set(category.matches.map(m => m.round))].sort((a, b) => a - b) : []
    });

    if (!category.matches || category.matches.length === 0) {
      errors.push(`Category ${category.gender} ${category.division} has no matches`);
      return;
    }

    // Validate match structure
    category.matches.forEach((match, matchIndex) => {
      if (!match.id) {
        errors.push(`Match ${matchIndex} in category ${categoryIndex} has no ID`);
      }

      if (match.round < 0) {
        errors.push(`Match ${match.id} has invalid round number: ${match.round}`);
      }

      if (match.position < 0) {
        errors.push(`Match ${match.id} has invalid position: ${match.position}`);
      }

      // For first round matches, ensure teams are assigned
      if (match.round === 0 && !match.team1Id && !match.team2Id && !match.isBye) {
        errors.push(`First round match ${match.id} has no teams assigned and is not a bye`);
      }
    });

    // Validate round progression
    const rounds = [...new Set(category.matches.map(m => m.round))].sort((a, b) => a - b);
    console.log(`Category ${category.gender} ${category.division} rounds:`, rounds);

    // Separate pool play rounds (0-99) from knockout rounds (100+)
    const poolPlayRounds = rounds.filter(r => r < 100);
    const knockoutRounds = rounds.filter(r => r >= 100);

    // Validate pool play rounds are sequential
    for (let i = 1; i < poolPlayRounds.length; i++) {
      if (poolPlayRounds[i] !== poolPlayRounds[i - 1] + 1) {
        const missingRounds = [];
        for (let r = poolPlayRounds[i - 1] + 1; r < poolPlayRounds[i]; r++) {
          missingRounds.push(r);
        }
        errors.push(`Category ${category.gender} ${category.division} has non-sequential pool play rounds: ${poolPlayRounds[i - 1]} -> ${poolPlayRounds[i]} (missing: ${missingRounds.join(', ')})`);
      }
    }

    // Validate knockout rounds are sequential (starting from 100)
    for (let i = 1; i < knockoutRounds.length; i++) {
      if (knockoutRounds[i] !== knockoutRounds[i - 1] + 1) {
        const missingRounds = [];
        for (let r = knockoutRounds[i - 1] + 1; r < knockoutRounds[i]; r++) {
          missingRounds.push(r);
        }
        errors.push(`Category ${category.gender} ${category.division} has non-sequential knockout rounds: ${knockoutRounds[i - 1]} -> ${knockoutRounds[i]} (missing: ${missingRounds.join(', ')})`);
      }
    }
  });

  console.log("Validation result:", { isValid: errors.length === 0, errors });

  return {
    isValid: errors.length === 0,
    errors
  };
}
