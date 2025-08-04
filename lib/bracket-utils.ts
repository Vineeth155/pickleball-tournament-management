import {
  type Team,
  type Tournament,
  type Match,
  TournamentFormat,
} from "./types";

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

// Update the generateBracket function to ensure it respects the format
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

  // Only use pool play if explicitly requested via format or enablePoolPlay option
  if (format === TournamentFormat.POOL_PLAY) {
    return generatePoolPlayBracket(
      teams,
      name,
      description,
      createdBy,
      options
    );
  }

  // For other formats, respect the user's choice
  switch (format) {
    case TournamentFormat.SINGLE_ELIMINATION:
      return generateSingleEliminationBracket(
        teams,
        name,
        description,
        createdBy,
        options
      );
    case TournamentFormat.DOUBLE_ELIMINATION:
      return generateDoubleEliminationBracket(
        teams,
        name,
        description,
        createdBy,
        options
      );
    case TournamentFormat.ROUND_ROBIN:
      return generateRoundRobinBracket(
        teams,
        name,
        description,
        createdBy,
        options
      );
    default:
      return generateSingleEliminationBracket(
        teams,
        name,
        description,
        createdBy,
        options
      );
  }
}

/**
 * Generate a single elimination tournament bracket
 */
function generateSingleEliminationBracket(
  teams: Team[],
  name: string,
  description: string,
  createdBy: string,
  options: BracketOptions = {}
): Tournament {
  const {
    earlyRoundGames = 1,
    quarterFinalGames = 3,
    semiFinalGames = 3,
    finalGames = 3,
    earlyRoundPoints = 11,
    quarterFinalPoints = 11,
    semiFinalPoints = 11,
    finalPoints = 11,
  } = options;

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

    // Determine the number of games for this match based on the round
    const bestOf = earlyRoundGames;

    matches.push({
      pointsToWin:
        bestOf === earlyRoundGames
          ? earlyRoundPoints
          : bestOf === quarterFinalGames
          ? quarterFinalPoints
          : bestOf === semiFinalGames
          ? semiFinalPoints
          : finalPoints,
      id: `match-0-${i}`,
      round: 0,
      position: i,
      team1Id: team1Index !== null ? sortedTeams[team1Index]?.id || null : null,
      team2Id: team2Index !== null ? sortedTeams[team2Index]?.id || null : null,
      team1Score: undefined,
      team2Score: undefined,
      team1Games: Array(bestOf).fill(0),
      team2Games: Array(bestOf).fill(0),
      winnerId: isBye ? sortedTeams[team1Index as number]?.id || null : null,
      isBye,
      bestOf,
    });
  }

  // Generate subsequent rounds
  for (let round = 1; round < totalRounds; round++) {
    const matchesInRound = perfectBracketSize / Math.pow(2, round + 1);

    // Determine the number of games for this round
    let bestOf = earlyRoundGames;

    // Quarter-finals (round totalRounds-3)
    if (round === totalRounds - 3) {
      bestOf = quarterFinalGames;
    }
    // Semi-finals (round totalRounds-2)
    else if (round === totalRounds - 2) {
      bestOf = semiFinalGames;
    }
    // Finals (round totalRounds-1)
    else if (round === totalRounds - 1) {
      bestOf = finalGames;
    }

    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        pointsToWin:
          bestOf === earlyRoundGames
            ? earlyRoundPoints
            : bestOf === quarterFinalGames
            ? quarterFinalPoints
            : bestOf === semiFinalGames
            ? semiFinalPoints
            : finalPoints,
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
      });
    }
  }

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

  return {
    id: `tournament-${Date.now()}`,
    name,
    description,
    format: TournamentFormat.SINGLE_ELIMINATION,
    createdAt: Date.now(),
    matches,
    totalRounds,
    teams: sortedTeams,
    createdBy,
    pools: [],
    knockoutBracketPopulated: false,
  };
}

/**
 * Generate a double elimination tournament bracket
 */
function generateDoubleEliminationBracket(
  teams: Team[],
  name: string,
  description: string,
  createdBy: string,
  options: BracketOptions = {}
): Tournament {
  const {
    earlyRoundGames = 1,
    quarterFinalGames = 3,
    semiFinalGames = 3,
    finalGames = 3,
    earlyRoundPoints = 11,
    quarterFinalPoints = 11,
    semiFinalPoints = 11,
    finalPoints = 11,
  } = options;

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
  const totalLoserRounds = totalWinnerRounds * 2 - 1;
  const totalRounds = totalWinnerRounds + totalLoserRounds + 1; // +1 for final
  const perfectBracketSize = Math.pow(2, totalWinnerRounds);

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
      pointsToWin:
        bestOf === earlyRoundGames
          ? earlyRoundPoints
          : bestOf === quarterFinalGames
          ? quarterFinalPoints
          : bestOf === semiFinalGames
          ? semiFinalPoints
          : finalPoints,
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
    });
  }

  // Generate subsequent rounds for winners bracket
  for (let round = 1; round < totalWinnerRounds; round++) {
    const matchesInRound = perfectBracketSize / Math.pow(2, round + 1);

    // Determine the number of games for this round
    let bestOf = earlyRoundGames;

    // Quarter-finals
    if (round === totalWinnerRounds - 3) {
      bestOf = quarterFinalGames;
    }
    // Semi-finals
    else if (round === totalWinnerRounds - 2) {
      bestOf = semiFinalGames;
    }
    // Finals
    else if (round === totalWinnerRounds - 1) {
      bestOf = finalGames;
    }

    for (let i = 0; i < matchesInRound; i++) {
      // Calculate the correct loser destination
      const loserRound = round * 2;
      const loserPosition = Math.floor(i / 2);

      matches.push({
        pointsToWin:
          bestOf === earlyRoundGames
            ? earlyRoundPoints
            : bestOf === quarterFinalGames
            ? quarterFinalPoints
            : bestOf === semiFinalGames
            ? semiFinalPoints
            : finalPoints,
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
      pointsToWin:
        bestOf === earlyRoundGames
          ? earlyRoundPoints
          : bestOf === quarterFinalGames
          ? quarterFinalPoints
          : bestOf === semiFinalGames
          ? semiFinalPoints
          : finalPoints,
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
      bestOf = quarterFinalGames;
    }
    // Semi-finals equivalent
    else if (loserRoundEquivalent === 2) {
      bestOf = semiFinalGames;
    }
    // Finals equivalent
    else if (loserRoundEquivalent === 1) {
      bestOf = finalGames;
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
        pointsToWin:
          bestOf === earlyRoundGames
            ? earlyRoundPoints
            : bestOf === quarterFinalGames
            ? quarterFinalPoints
            : bestOf === semiFinalGames
            ? semiFinalPoints
            : finalPoints,
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
      });
    }
  }

  // Final match (winners bracket champion vs losers bracket champion)
  matches.push({
    pointsToWin:
      bestOf === earlyRoundGames
        ? earlyRoundPoints
        : bestOf === quarterFinalGames
        ? quarterFinalPoints
        : bestOf === semiFinalGames
        ? semiFinalPoints
        : finalPoints,
    id: `final-match`,
    round: totalRounds - 1,
    position: 0,
    team1Id: null, // Winners bracket champion
    team2Id: null, // Losers bracket champion
    team1Score: undefined,
    team2Score: undefined,
    team1Games: Array(finalGames).fill(0),
    team2Games: Array(finalGames).fill(0),
    winnerId: null,
    isBye: false,
    isWinnersBracket: false,
    loserGoesTo: null,
    bestOf: finalGames,
  });

  return {
    id: `tournament-${Date.now()}`,
    name,
    description,
    format: TournamentFormat.DOUBLE_ELIMINATION,
    createdAt: Date.now(),
    matches,
    totalRounds,
    totalWinnerRounds,
    teams: sortedTeams,
    createdBy,
    pools: [],
    knockoutBracketPopulated: false,
  };
}

/**
 * Generate a round robin tournament
 */
function generateRoundRobinBracket(
  teams: Team[],
  name: string,
  description: string,
  createdBy: string,
  options: BracketOptions = {}
): Tournament {
  const { earlyRoundGames = 1 } = options;

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
    round.forEach((matchup, matchIndex) => {
      if (matchup.team1Id !== "bye" && matchup.team2Id !== "bye") {
        matches.push({
          pointsToWin:
            bestOf === earlyRoundGames
              ? earlyRoundPoints
              : bestOf === quarterFinalGames
              ? quarterFinalPoints
              : bestOf === semiFinalGames
              ? semiFinalPoints
              : finalPoints,
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
        });
      }
    });
  });

  return {
    id: `tournament-${Date.now()}`,
    name,
    description,
    format: TournamentFormat.ROUND_ROBIN,
    createdAt: Date.now(),
    matches,
    totalRounds: roundsNeeded,
    teams,
    createdBy,
    pools: [],
    knockoutBracketPopulated: false,
  };
}

/**
 * Generate a pool play tournament with knockout stage
 */
function generatePoolPlayBracket(
  teams: Team[],
  name: string,
  description: string,
  createdBy: string,
  options: BracketOptions = {}
): Tournament {
  const {
    earlyRoundGames = 1,
    quarterFinalGames = 3,
    semiFinalGames = 3,
    finalGames = 3,
    earlyRoundPoints = 11,
    quarterFinalPoints = 11,
    semiFinalPoints = 11,
    finalPoints = 11,
  } = options;

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
  let numPools = 2; // Default to 2 pools

  if (sortedTeams.length >= 16) {
    numPools = 4;
  } else if (sortedTeams.length >= 12) {
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
            pointsToWin: earlyRoundPoints,
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
          });
        }
      });
    });
  });

  // Calculate total rounds needed for knockout stage
  const teamsAdvancing = numPools * 2; // Top 2 from each pool
  const knockoutRounds = Math.ceil(Math.log2(teamsAdvancing));

  // Generate knockout stage matches
  const knockoutRoundCounter = 0;

  for (let round = 0; round < knockoutRounds; round++) {
    const matchesInRound = Math.pow(2, knockoutRounds - round - 1);

    // Determine the number of games for this round
    let bestOf = earlyRoundGames;

    // Quarter-finals (round 0 for 8 teams)
    if (round === 0 && knockoutRounds >= 3) {
      bestOf = quarterFinalGames;
    }
    // Semi-finals (round knockoutRounds-2)
    else if (round === knockoutRounds - 2) {
      bestOf = semiFinalGames;
    }
    // Finals (round knockoutRounds-1)
    else if (round === knockoutRounds - 1) {
      bestOf = finalGames;
    }

    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        pointsToWin:
          bestOf === earlyRoundGames
            ? earlyRoundPoints
            : bestOf === quarterFinalGames
            ? quarterFinalPoints
            : bestOf === semiFinalGames
            ? semiFinalPoints
            : finalPoints,
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
      });
    }
  }

  // Create pool objects for the tournament
  const poolObjects = pools.map((poolTeams, index) => ({
    id: index.toString(),
    name: `Pool ${String.fromCharCode(65 + index)}`, // Pool A, Pool B, etc.
    teams: poolTeams,
  }));

  return {
    id: `tournament-${Date.now()}`,
    name,
    description,
    format: TournamentFormat.POOL_PLAY,
    createdAt: Date.now(),
    matches,
    totalRounds: Math.max(...matches.map((m) => m.round)) + 1,
    teams: sortedTeams,
    createdBy,
    pools: poolObjects,
    knockoutBracketPopulated: false,
  };
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

    schedule.push(roundMatches);
  }

  return schedule;
}
