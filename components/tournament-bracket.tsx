"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { MatchCard } from "@/components/match-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  type Tournament,
  type User,
  type Match,
  TournamentFormat,
  type Team,
} from "@/lib/types";
import { Plus, Trash2, ChevronRight, ChevronLeft } from "lucide-react";
import StandingsTable from "@/components/standings-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { BracketLines } from "@/components/bracket-lines";
import {
  updateMatchInTournamentInDB,
  saveTournamentsToDB,
  updateTournamentInDB,
  deleteMatchFromTournamentInDB,
  addMatchToTournamentInDB,
} from "@/lib/tournament-store";

interface TournamentBracketProps {
  tournament: Tournament;
  onUpdateMatch: (matchId: string, updatedMatch: Partial<Match>) => void;
  currentUser: string | null;
}

export default function TournamentBracket({
  tournament,
  onUpdateMatch,
  currentUser,
}: TournamentBracketProps) {
  const { matches, teams, format, pools } = tournament;
  const { toast } = useToast();
  const [activePool, setActivePool] = useState<string | null>(
    pools && pools.length > 0 ? pools[0].id : null
  );
  const bracketContainerRef = useRef<HTMLDivElement>(null);

  // For manual team assignment
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [team1Selection, setTeam1Selection] = useState<string>("");
  const [team2Selection, setTeam2Selection] = useState<string>("");

  // For match deletion
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);

  // For adding new matches
  const [isAddMatchDialogOpen, setIsAddMatchDialogOpen] = useState(false);
  const [newMatchRound, setNewMatchRound] = useState<number>(0);
  const [newMatchPosition, setNewMatchPosition] = useState<number>(0);
  const [newMatchPoolId, setNewMatchPoolId] = useState<string>("");
  const [newMatchTeam1, setNewMatchTeam1] = useState<string>("");
  const [newMatchTeam2, setNewMatchTeam2] = useState<string>("");
  const [newMatchCourt, setNewMatchCourt] = useState<string>("");
  const [newMatchTime, setNewMatchTime] = useState<string>("");

  // Track if we're currently populating the bracket
  const [isPopulatingBracket, setIsPopulatingBracket] = useState(false);

  // Add local state to track matches and tournament
  const [localMatches, setLocalMatches] = useState<Match[]>(matches);
  const [localTournament, setLocalTournament] =
    useState<Tournament>(tournament);
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);

  // For mobile navigation
  const [activeRound, setActiveRound] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on a mobile device
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => {
      window.removeEventListener("resize", checkIfMobile);
    };
  }, []);

  // Update local matches when tournament changes
  useEffect(() => {
    setLocalMatches(matches);
    setLocalTournament(tournament);
  }, [matches, tournament]);

  const roundNames = useMemo(() => {
    if (format === TournamentFormat.ROUND_ROBIN) {
      return Array.from(
        { length: tournament.totalRounds },
        (_, i) => `Round ${i + 1}`
      );
    }

    const names = [];
    const totalRounds = tournament.totalRounds;

    if (format === TournamentFormat.DOUBLE_ELIMINATION) {
      // For double elimination, we need to handle winners and losers brackets
      const winnerRounds = Math.ceil(Math.log2(teams.length));
      const loserRounds = winnerRounds * 2 - 1;

      // Winners bracket rounds
      for (let i = 0; i < winnerRounds; i++) {
        names[i] =
          i === winnerRounds - 1
            ? "Winners Final"
            : i === winnerRounds - 2
            ? "Winners Semi-Final"
            : `Winners Round ${i + 1}`;
      }

      // Losers bracket rounds
      for (let i = 0; i < loserRounds; i++) {
        names[winnerRounds + i] =
          i === loserRounds - 1
            ? "Losers Final"
            : i === loserRounds - 2
            ? "Losers Semi-Final"
            : `Losers Round ${i + 1}`;
      }

      // Grand final
      names[winnerRounds + loserRounds] = "Grand Final";

      return names;
    }

    // Single elimination format
    if (totalRounds === 1) {
      names.push("Final");
      return names;
    }

    if (totalRounds >= 2) names.push("Final");
    if (totalRounds >= 3) names.push("Semi-Finals");
    if (totalRounds >= 4) names.push("Quarter-Finals");

    // Add Round of 16, Round of 32, etc.
    for (let i = 4; i < totalRounds; i++) {
      names.push(`Round of ${Math.pow(2, i + 1)}`);
    }

    // First round
    names.push("First Round");

    return names.reverse();
  }, [tournament.totalRounds, format, teams.length]);

  // Group matches by round
  const matchesByRound = useMemo(() => {
    const grouped: Record<number, Match[]> = {};

    for (let i = 0; i < tournament.totalRounds; i++) {
      grouped[i] = localMatches
        .filter((match) => match.round === i)
        .sort((a, b) => a.position - b.position);
    }

    return grouped;
  }, [tournament.totalRounds, localMatches]);

  // Group knockout matches by round (for pool play)
  const knockoutMatchesByRound = useMemo(() => {
    if (format !== TournamentFormat.POOL_PLAY) return {};

    const grouped: Record<number, Match[]> = {};

    // Get all knockout matches (round >= 100)
    const knockoutMatches = localMatches.filter((m) => m.round >= 100);

    // Group by round
    knockoutMatches.forEach((match) => {
      const round = match.round;
      if (!grouped[round]) {
        grouped[round] = [];
      }
      grouped[round].push(match);
    });

    // Sort matches within each round
    Object.keys(grouped).forEach((roundKey) => {
      const round = Number.parseInt(roundKey);
      grouped[round] = grouped[round].sort((a, b) => a.position - b.position);
    });

    return grouped;
  }, [format, localMatches]);

  // Group pool matches by pool
  const matchesByPool = useMemo(() => {
    if (!pools || pools.length === 0) return {};

    const grouped: Record<string, Match[]> = {};

    pools.forEach((pool) => {
      const poolIdStr = pool.id.toString();
      grouped[poolIdStr] = localMatches
        .filter((match) => {
          // Ensure we're comparing strings to strings
          const matchPoolIdStr =
            match.poolId !== undefined ? match.poolId.toString() : undefined;
          return matchPoolIdStr === poolIdStr;
        })
        .sort((a, b) => {
          if (a.round !== b.round) return a.round - b.round;
          return a.position - b.position;
        });
    });

    return grouped;
  }, [pools, localMatches]);

  // Find team by ID
  const getTeam = (id: string | null) => {
    if (!id) return null;
    return teams.find((team) => team.id === id) || null;
  };

  // Check if a match is ready (both teams assigned or one team with a bye)
  const isMatchReady = (match: Match) => {
    return (match.team1Id && match.team2Id) || match.isBye;
  };

  // Check if a match is completed
  const isMatchCompleted = (match: Match) => {
    return !!match.winnerId || !!match.completed;
  };

  // Check if the tournament is completed
  const isTournamentCompleted = useMemo(() => {
    // For round robin, all matches must be completed
    if (format === TournamentFormat.ROUND_ROBIN) {
      const totalMatches = matches.length;
      const completedMatches = matches.filter(
        (match) =>
          !!match.winnerId ||
          (match.team1Score !== undefined && match.team2Score !== undefined)
      ).length;

      return totalMatches > 0 && completedMatches === totalMatches;
    }

    // For elimination formats, check if the final match is completed
    const finalRound = tournament.totalRounds - 1;
    const finalMatch = matches.find((match) => match.round === finalRound);

    return finalMatch ? !!finalMatch.winnerId : false;
  }, [format, matches, tournament.totalRounds]);

  // Get the winner of the tournament
  const tournamentWinner = useMemo(() => {
    // Only determine a winner if the tournament is completed
    if (!isTournamentCompleted) {
      return null;
    }

    if (format === TournamentFormat.ROUND_ROBIN) {
      // For round robin, calculate team statistics to determine the winner
      const teamStats: Record<
        string,
        {
          points: number;
          wins: number;
          goalDifference: number;
          goalsFor: number;
          totalPoints: number;
        }
      > = {};

      // Initialize stats
      teams.forEach((team) => {
        teamStats[team.id] = {
          points: 0,
          wins: 0,
          goalDifference: 0,
          goalsFor: 0,
          totalPoints: 0,
        };
      });

      // Calculate stats from matches
      matches.forEach((match) => {
        if (match.team1Id && match.team2Id) {
          const team1Stats = teamStats[match.team1Id];
          const team2Stats = teamStats[match.team2Id];

          // Add tracking for total points from game scores or total points
          if (match.team1Games && match.team2Games) {
            match.team1Games.forEach((score, i) => {
              if (score > 0 || (match.team2Games && match.team2Games[i] > 0)) {
                if (team1Stats) team1Stats.totalPoints += score;
                if (team2Stats && match.team2Games)
                  team2Stats.totalPoints += match.team2Games[i];
              }
            });
          }

          if (
            match.team1Score !== undefined &&
            match.team2Score !== undefined
          ) {
            // Update goal stats
            if (team1Stats) {
              team1Stats.goalDifference += match.team1Score - match.team2Score;
              team1Stats.goalsFor += match.team1Score;
            }

            if (team2Stats) {
              team2Stats.goalDifference += match.team2Score - match.team1Score;
              team2Stats.goalsFor += match.team2Score;
            }

            // Update points and wins
            if (match.team1Score > match.team2Score) {
              if (team1Stats) {
                team1Stats.points += 3;
                team1Stats.wins += 1;
              }
            } else if (match.team2Score > match.team1Score) {
              if (team2Stats) {
                team2Stats.points += 3;
                team2Stats.wins += 1;
              }
            } else {
              // Draw
              if (team1Stats) team1Stats.points += 1;
              if (team2Stats) team2Stats.points += 1;
            }
          } else if (match.winnerId) {
            // If only winnerId is set (no scores)
            const winnerStats =
              match.winnerId === match.team1Id ? team1Stats : team2Stats;
            if (winnerStats) {
              winnerStats.points += 3;
              winnerStats.wins += 1;
            }
          }
        }
      });

      // Find the team with the highest points (and tiebreakers)
      const sortedTeams = Object.entries(teamStats).sort((a, b) => {
        const [idA, statsA] = a;
        const [idB, statsB] = b;

        // Sort by points
        if (statsA.points !== statsB.points) {
          return statsB.points - statsA.points;
        }

        // Tiebreaker 1: Wins
        if (statsA.wins !== statsB.wins) {
          return statsB.wins - statsA.wins;
        }

        // Tiebreaker 2: Goal difference
        if (statsA.goalDifference !== statsB.goalDifference) {
          return statsB.goalDifference - statsA.goalDifference;
        }

        // Tiebreaker 3: Goals scored
        if (statsA.goalsFor !== statsB.goalsFor) {
          return statsB.goalsFor - statsA.goalsFor;
        }

        // Tiebreaker 4: Total points scored
        if (statsA.totalPoints !== statsB.totalPoints) {
          return statsB.totalPoints - statsA.totalPoints;
        }

        return 0;
      });

      // Return the winner if we have teams
      if (sortedTeams.length > 0) {
        const winnerId = sortedTeams[0][0];
        return getTeam(winnerId);
      }

      return null;
    }

    // For elimination formats, get the winner of the final match
    const finalRound = tournament.totalRounds - 1;
    const finalMatch = matches.find((match) => match.round === finalRound);

    if (finalMatch?.winnerId) {
      return getTeam(finalMatch.winnerId);
    }

    return null;
  }, [format, isTournamentCompleted, matches, teams, tournament.totalRounds]);

  // Calculate pool standings
  const poolStandings = useMemo(() => {
    if (!pools || pools.length === 0) return {};

    const standings: Record<
      string,
      Array<{
        team: Team;
        played: number;
        wins: number;
        losses: number;
        points: number;
        position: number;
        goalDifference: number;
        goalsFor: number;
        totalPoints: number;
        gamesWon: number;
        gamesLost: number;
        qualified?: boolean;
      }>
    > = {};

    pools.forEach((pool) => {
      const poolIdStr = pool.id.toString();
      const poolMatches = matchesByPool[poolIdStr] || [];
      const poolTeamStats: Record<
        string,
        {
          played: number;
          wins: number;
          losses: number;
          points: number;
          goalDifference: number;
          goalsFor: number;
          gamesWon: number;
          gamesLost: number;
          totalPoints: number;
        }
      > = {};

      // Initialize stats for all teams in this pool
      pool.teams.forEach((team) => {
        poolTeamStats[team.id] = {
          played: 0,
          wins: 0,
          losses: 0,
          points: 0,
          goalDifference: 0,
          goalsFor: 0,
          gamesWon: 0,
          gamesLost: 0,
          totalPoints: 0,
        };
      });

      // Calculate stats from matches
      poolMatches.forEach((match) => {
        if (match.team1Id && match.team2Id) {
          const team1Stats = poolTeamStats[match.team1Id];
          const team2Stats = poolTeamStats[match.team2Id];

          if (team1Stats) team1Stats.played++;
          if (team2Stats) team2Stats.played++;

          // Add game stats if available
          if (match.team1Games && match.team2Games) {
            match.team1Games.forEach((score, i) => {
              if (score > 0 || (match.team2Games && match.team2Games[i] > 0)) {
                const team2Score = match.team2Games ? match.team2Games[i] : 0;

                if (score > team2Score) {
                  if (team1Stats) team1Stats.gamesWon++;
                  if (team2Stats) team2Stats.gamesLost++;
                } else if (team2Score > score) {
                  if (team2Stats) team2Stats.gamesWon++;
                  if (team1Stats) team1Stats.gamesLost++;
                }

                // Add points
                if (team1Stats) team1Stats.totalPoints += score;
                if (team2Stats && match.team2Games)
                  team2Stats.totalPoints += team2Score;
              }
            });
          }

          // Add match stats
          if (
            match.team1Score !== undefined &&
            match.team2Score !== undefined
          ) {
            if (team1Stats) {
              team1Stats.goalsFor += match.team1Score;
              team1Stats.goalDifference += match.team1Score - match.team2Score;
            }

            if (team2Stats) {
              team2Stats.goalsFor += match.team2Score;
              team2Stats.goalDifference += match.team2Score - match.team1Score;
            }
          }

          // Determine winner
          if (match.winnerId === match.team1Id) {
            if (team1Stats) {
              team1Stats.wins++;
              team1Stats.points += 3;
            }
            if (team2Stats) team2Stats.losses++;
          } else if (match.winnerId === match.team2Id) {
            if (team2Stats) {
              team2Stats.wins++;
              team2Stats.points += 3;
            }
            if (team1Stats) team1Stats.losses++;
          }
        }
      });

      // Convert to array and sort with comprehensive tiebreakers
      const sortedStandings = Object.entries(poolTeamStats)
        .map(([teamId, stats]) => {
          const team = pool.teams.find((t) => t.id === teamId)!;
          return {
            team,
            ...stats,
            position: 0, // Will be set after sorting
            qualified: team.qualified || false, // Use the team's qualified status
          };
        })
        .sort((a, b) => {
          // Sort by manual position first if available
          if (
            a.team.manualPosition !== undefined &&
            b.team.manualPosition !== undefined
          ) {
            return a.team.manualPosition - b.team.manualPosition;
          }

          // If only one has a manual position, prioritize it
          if (a.team.manualPosition !== undefined) return -1;
          if (b.team.manualPosition !== undefined) return 1;

          // Otherwise use standard sorting criteria
          if (a.points !== b.points) return b.points - a.points;
          if (a.wins !== b.wins) return b.wins - a.wins;
          if (a.goalDifference !== b.goalDifference)
            return b.goalDifference - a.goalDifference;
          if (a.gamesWon !== b.gamesWon) return b.gamesWon - a.gamesWon;
          if (a.totalPoints !== b.totalPoints)
            return b.totalPoints - a.totalPoints;
          if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
          return a.team.id.localeCompare(b.team.id);
        });

      // Assign positions after sorting
      sortedStandings.forEach((standing, index) => {
        standing.position = index + 1;
      });

      standings[poolIdStr] = sortedStandings;
    });

    return standings;
  }, [pools, matchesByPool, localTournament, forceUpdateCounter]);

  // Check if all pool matches are completed
  const areAllPoolMatchesCompleted = useMemo(() => {
    if (!pools || pools.length === 0) return false;

    // Check if all pool matches have a winner
    for (const pool of pools) {
      const poolIdStr = pool.id.toString();
      const poolMatches = matchesByPool[poolIdStr] || [];

      // If any match in this pool doesn't have a winner, return false
      if (poolMatches.some((match) => !match.winnerId)) {
        return false;
      }
    }

    return true;
  }, [pools, matchesByPool]);

  // Get qualified teams from all pools
  const qualifiedTeams = useMemo(() => {
    if (!pools || !poolStandings) return [];

    const qualified: Array<{
      team: Team;
      position: number;
      poolId: string;
      poolName: string;
    }> = [];

    pools.forEach((pool) => {
      const poolIdStr = pool.id.toString();
      const poolStandingsList = poolStandings[poolIdStr] || [];

      // Get qualified teams from this pool
      const qualifiedFromPool = poolStandingsList
        .filter((standing) => standing.qualified)
        .map((standing) => ({
          team: standing.team,
          position: standing.position,
          poolId: poolIdStr,
          poolName: pool.name,
        }));

      qualified.push(...qualifiedFromPool);
    });

    return qualified;
  }, [pools, poolStandings]);

  // Handle updating team positions
  const handleUpdatePositions = useCallback(
    async (
      teamPositions: Array<{ teamId: string; position: number }>,
      poolId: string
    ) => {
      if (!currentUser === tournament?.createdBy) return;

      try {
        // Create a deep copy of the tournament
        const updatedTournament = JSON.parse(JSON.stringify(localTournament));

        // Find the pool in the updated tournament
        const poolIndex = updatedTournament.pools?.findIndex(
          (p) => p.id.toString() === poolId
        );
        if (poolIndex === -1 || poolIndex === undefined) return;

        // Update each team's manual position
        teamPositions.forEach(({ teamId, position }) => {
          const teamIndex = updatedTournament.pools[poolIndex].teams.findIndex(
            (t) => t.id === teamId
          );
          if (teamIndex !== -1) {
            // Update the team's manual position
            updatedTournament.pools[poolIndex].teams[teamIndex].manualPosition =
              position;
          }
        });

        console.log(
          `Updated positions for ${teamPositions.length} teams in pool ${poolId}`,
          teamPositions
        );

        // Update local state immediately to reflect changes in UI
        setLocalTournament(updatedTournament);

        // Update the tournament in the store
        await updateTournamentInDB(updatedTournament);

        // Force save to localStorage
        await saveTournamentsToDB();

        // Force a re-render
        setForceUpdateCounter((prev) => prev + 1);

        // Show success toast
        toast({
          title: "Positions Updated",
          description: "Team positions have been successfully updated.",
          variant: "success",
        });
      } catch (error) {
        console.error("Error updating team positions:", error);
        toast({
          title: "Error",
          description: "Failed to update team positions.",
          variant: "destructive",
        });
      }
    },
    [currentUser, localTournament, toast]
  );

  // Handle toggling team qualification
  const handleToggleQualification = useCallback(
    async (teamId: string, poolId: string) => {
      if (!currentUser === tournament?.createdBy) return;

      try {
        // Create a deep copy of the tournament
        const updatedTournament = JSON.parse(JSON.stringify(localTournament));

        // Find the pool in the updated tournament
        const poolIndex = updatedTournament.pools?.findIndex(
          (p) => p.id.toString() === poolId
        );
        if (poolIndex === -1 || poolIndex === undefined) return;

        // Find the team in the pool
        const teamIndex = updatedTournament.pools[poolIndex].teams.findIndex(
          (t) => t.id === teamId
        );
        if (teamIndex === -1) return;

        // Get the current team
        const team = updatedTournament.pools[poolIndex].teams[teamIndex];

        // Toggle the qualified status
        const isCurrentlyQualified = team.qualified || false;
        team.qualified = !isCurrentlyQualified;

        console.log(
          `Toggling qualification for team ${team.name} to ${team.qualified}`
        );

        // Update local state immediately to reflect changes in UI
        setLocalTournament(updatedTournament);

        // Update the tournament in the store
        await updateTournamentInDB(updatedTournament);

        // Force save to localStorage
        await saveTournamentsToDB();

        // Force a re-render
        setForceUpdateCounter((prev) => prev + 1);

        // Show success toast
        toast({
          title: isCurrentlyQualified ? "Team Unqualified" : "Team Qualified",
          description: `${team.name} has been ${
            isCurrentlyQualified ? "removed from" : "added to"
          } the qualified teams.`,
          variant: "success",
        });
      } catch (error) {
        console.error("Error toggling team qualification:", error);
        toast({
          title: "Error",
          description: "Failed to update team qualification status.",
          variant: "destructive",
        });
      }
    },
    [currentUser, localTournament, toast]
  );

  // Automatically populate the knockout bracket with qualified teams
  const populateKnockoutBracket = async () => {
    if (
      !areAllPoolMatchesCompleted ||
      qualifiedTeams.length === 0 ||
      isPopulatingBracket
    ) {
      console.log("Cannot populate bracket:", {
        areAllPoolMatchesCompleted,
        qualifiedTeamsLength: qualifiedTeams.length,
        isPopulatingBracket,
      });
      return;
    }

    setIsPopulatingBracket(true);
    console.log(
      "Starting to populate knockout bracket with qualified teams:",
      qualifiedTeams
    );

    try {
      // First, clear any existing team assignments in the knockout bracket
      const knockoutMatches = tournament.matches.filter((m) => m.round >= 100);
      console.log("Found knockout matches:", knockoutMatches.length);

      knockoutMatches.forEach((match) => {
        onUpdateMatch(match.id, {
          team1Id: null,
          team2Id: null,
          winnerId: null,
        });
      });

      // Get the first round knockout matches
      const knockoutRounds = Object.keys(knockoutMatchesByRound).sort();
      if (knockoutRounds.length === 0) {
        console.error("No knockout rounds found");
        setIsPopulatingBracket(false);
        return;
      }

      const firstRound = Number.parseInt(knockoutRounds[0]);
      const firstRoundMatches = [
        ...(knockoutMatchesByRound[firstRound] || []),
      ].sort((a, b) => a.position - b.position);
      console.log("First round matches:", firstRoundMatches.length);

      // Check if we have enough matches for the qualified teams
      if (firstRoundMatches.length * 2 < qualifiedTeams.length) {
        console.error("Not enough matches for all qualified teams");
        setIsPopulatingBracket(false);
        return;
      }

      // Group teams by their pool
      const teamsByPool: Record<
        string,
        Array<{ team: Team; position: number }>
      > = {};
      qualifiedTeams.forEach(({ team, position, poolId }) => {
        if (!teamsByPool[poolId]) {
          teamsByPool[poolId] = [];
        }
        teamsByPool[poolId].push({ team, position });
      });

      // Get pool IDs and sort them
      const poolIds = Object.keys(teamsByPool).sort();
      const numPools = poolIds.length;
      console.log("Pools with qualified teams:", numPools);

      // Create the seeding pattern to ensure teams from the same pool are on opposite sides
      // and teams with the same position don't meet in early rounds
      const seededTeams: Team[] = [];

      // Improved seeding logic to separate teams from the same pool
      if (numPools === 2) {
        // For 2 pools: A1, B2, B1, A2
        const poolA = teamsByPool[poolIds[0]];
        const poolB = teamsByPool[poolIds[1]];

        const a1 = poolA.find((t) => t.position === 1)?.team;
        const a2 = poolA.find((t) => t.position === 2)?.team;
        const b1 = poolB.find((t) => t.position === 1)?.team;
        const b2 = poolB.find((t) => t.position === 2)?.team;

        if (a1) seededTeams.push(a1);
        if (b2) seededTeams.push(b2);
        if (b1) seededTeams.push(b1);
        if (a2) seededTeams.push(a2);
      } else if (numPools === 4) {
        // For 4 pools: A1, C1, B2, D2, D1, B1, C2, A2
        const poolA = teamsByPool[poolIds[0]];
        const poolB = teamsByPool[poolIds[1]];
        const poolC = teamsByPool[poolIds[2]];
        const poolD = teamsByPool[poolIds[3]];

        const a1 = poolA.find((t) => t.position === 1)?.team;
        const a2 = poolA.find((t) => t.position === 2)?.team;
        const b1 = poolB.find((t) => t.position === 1)?.team;
        const b2 = poolB.find((t) => t.position === 2)?.team;
        const c1 = poolC.find((t) => t.position === 1)?.team;
        const c2 = poolC.find((t) => t.position === 2)?.team;
        const d1 = poolD.find((t) => t.position === 1)?.team;
        const d2 = poolD.find((t) => t.position === 2)?.team;

        if (a1) seededTeams.push(a1);
        if (c1) seededTeams.push(c1);
        if (b2) seededTeams.push(b2);
        if (d2) seededTeams.push(d2);
        if (d1) seededTeams.push(d1);
        if (b1) seededTeams.push(b1);
        if (c2) seededTeams.push(c2);
        if (a2) seededTeams.push(a2);
      } else if (numPools === 3) {
        // For 3 pools: A1, C1, B2, A2, B1, C2
        const poolA = teamsByPool[poolIds[0]];
        const poolB = teamsByPool[poolIds[1]];
        const poolC = teamsByPool[poolIds[2]];

        const a1 = poolA.find((t) => t.position === 1)?.team;
        const a2 = poolA.find((t) => t.position === 2)?.team;
        const b1 = poolB.find((t) => t.position === 1)?.team;
        const b2 = poolB.find((t) => t.position === 2)?.team;
        const c1 = poolC.find((t) => t.position === 1)?.team;
        const c2 = poolC.find((t) => t.position === 2)?.team;

        if (a1) seededTeams.push(a1);
        if (c1) seededTeams.push(c1);
        if (b2) seededTeams.push(b2);
        if (a2) seededTeams.push(a2);
        if (b1) seededTeams.push(b1);
        if (c2) seededTeams.push(c2);
      } else {
        // For other numbers of pools, use a more general approach that ensures
        // teams from the same pool don't meet in the first round

        // First, create pairs of teams from each pool
        const poolPairs: Array<{ first: Team; second: Team; poolId: string }> =
          [];

        poolIds.forEach((poolId) => {
          const poolTeams = teamsByPool[poolId];
          const first = poolTeams.find((t) => t.position === 1)?.team;
          const second = poolTeams.find((t) => t.position === 2)?.team;

          if (first && second) {
            poolPairs.push({ first, second, poolId });
          }
        });

        // Then distribute them across the bracket to ensure teams from the same pool
        // are in opposite halves
        for (let i = 0; i < poolPairs.length; i++) {
          const pair = poolPairs[i];

          // Place first place teams
          seededTeams[i] = pair.first;

          // Place second place teams in opposite half
          const oppositePosition = poolPairs.length * 2 - 1 - i;
          seededTeams[oppositePosition] = pair.second;
        }

        // Remove any undefined entries
        const cleanedSeededTeams = seededTeams.filter(
          (team) => team !== undefined
        );
        seededTeams.length = 0;
        seededTeams.push(...cleanedSeededTeams);
      }

      console.log(
        "Seeded teams for bracket:",
        seededTeams.map((t) => t.name)
      );

      // Assign teams to matches using standard bracket distribution
      const totalTeams = seededTeams.length;
      const perfectBracketSize = Math.pow(2, Math.ceil(Math.log2(totalTeams)));
      const firstRoundMatchCount = perfectBracketSize / 2;

      // Assign teams to matches
      for (let i = 0; i < firstRoundMatchCount; i++) {
        if (i >= firstRoundMatches.length) break;

        const match = firstRoundMatches[i];

        // Calculate the ideal positions for this match using standard bracket seeding
        const seedPosition1 = i;
        const seedPosition2 = firstRoundMatchCount * 2 - 1 - i;

        // Assign team 1 if available
        if (seedPosition1 < totalTeams) {
          const team1 = seededTeams[seedPosition1];
          console.log(`Assigning ${team1.name} to match ${match.id} as team1`);

          // Use a direct update to ensure the team assignment persists
          await updateMatchInTournamentInDB(tournament.id, match.id, {
            team1Id: team1.id,
          });

          // Also update local state
          setLocalMatches((prev) =>
            prev.map((m) =>
              m.id === match.id ? { ...m, team1Id: team1.id } : m
            )
          );
        }

        // Assign team 2 if available
        if (seedPosition2 < totalTeams) {
          const team2 = seededTeams[seedPosition2];
          console.log(`Assigning ${team2.name} to match ${match.id} as team2`);

          // Use a direct update to ensure the team assignment persists
          await updateMatchInTournamentInDB(tournament.id, match.id, {
            team2Id: team2.id,
          });

          // Also update local state
          setLocalMatches((prev) =>
            prev.map((m) =>
              m.id === match.id ? { ...m, team2Id: team2.id } : m
            )
          );
        }
      }

      // Mark the tournament as having its knockout bracket populated
      if (tournament.id) {
        // Update the tournament object directly instead of trying to update a non-existent match
        const updatedTournament = {
          ...tournament,
          knockoutBracketPopulated: true,
        };

        // Update the tournament in the store
        await updateTournamentInDB(updatedTournament);

        // Force save to localStorage
        await saveTournamentsToDB();
      }

      console.log("Knockout bracket population completed");

      // Show success toast
      toast({
        title: "Bracket Populated",
        description:
          "Knockout bracket has been populated with qualified teams.",
        variant: "success",
      });
    } catch (error) {
      console.error("Error populating knockout bracket:", error);

      // Show error toast
      toast({
        title: "Error",
        description:
          "Failed to populate the knockout bracket. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPopulatingBracket(false);
    }
  };

  // Check if knockout bracket has already been populated
  const isKnockoutBracketPopulated = useMemo(() => {
    // Check if any knockout match has teams assigned
    return (
      tournament.knockoutBracketPopulated ||
      localMatches.some((m) => m.round >= 100 && (m.team1Id || m.team2Id))
    );
  }, [tournament, localMatches]);

  // Force knockout bracket update when all pool matches are completed
  useEffect(() => {
    if (
      areAllPoolMatchesCompleted &&
      qualifiedTeams.length > 0 &&
      !isKnockoutBracketPopulated &&
      format === TournamentFormat.POOL_PLAY
    ) {
      // Auto-populate the bracket when all pool matches are completed and it hasn't been populated yet
      populateKnockoutBracket();
    }
  }, [
    areAllPoolMatchesCompleted,
    qualifiedTeams.length,
    isKnockoutBracketPopulated,
    format,
  ]);

  // Open the team assignment dialog for a specific match
  const openAssignDialog = (match: Match) => {
    if (!currentUser === tournament?.createdBy) return;

    setCurrentMatch(match);
    setTeam1Selection(match.team1Id || "none");
    setTeam2Selection(match.team2Id || "none");
    setIsAssignDialogOpen(true);
  };

  // Handle saving team assignments from the dialog
  const handleSaveTeamAssignment = async () => {
    if (!currentMatch) return;

    const updates: Partial<Match> = {};

    if (team1Selection && team1Selection !== "none") {
      updates.team1Id = team1Selection;
    } else if (team1Selection === "none") {
      updates.team1Id = null;
    }

    if (team2Selection && team2Selection !== "none") {
      updates.team2Id = team2Selection;
    } else if (team2Selection === "none") {
      updates.team2Id = null;
    }

    // Update local state
    const updatedMatches = localMatches.map((m) =>
      m.id === currentMatch.id ? { ...m, ...updates } : m
    );
    setLocalMatches(updatedMatches);

    // Direct update to ensure persistence
    await updateMatchInTournamentInDB(tournament.id, currentMatch.id, updates);

    // Call the parent's update function
    onUpdateMatch(currentMatch.id, updates);

    setIsAssignDialogOpen(false);

    // Show toast notification
    if (currentUser === tournament?.createdBy) {
      toast({
        title: "Teams Assigned",
        description: "Teams have been successfully assigned to the match.",
        variant: "success",
      });
    }
  };

  // Handle match winner and advance to next round
  const handleUpdateMatch = async (
    matchId: string,
    updatedMatch: Partial<Match>
  ) => {
    const match = localMatches.find((m) => m.id === matchId);
    if (!match) return;

    // Ensure completed flag is set if winner is set
    if (updatedMatch.winnerId !== undefined && updatedMatch.winnerId !== null) {
      updatedMatch.completed = true;
    }

    // Debug to see what's happening
    console.log(`Updating match ${matchId}:`, {
      current: match.winnerId,
      new: updatedMatch.winnerId,
      update: updatedMatch,
    });

    // Create a deep copy of matches to avoid reference issues
    const updatedMatches = JSON.parse(JSON.stringify(localMatches)) as Match[];
    const matchIndex = updatedMatches.findIndex((m) => m.id === matchId);

    if (matchIndex !== -1) {
      // Update the specific match with the new data, preserving existing team assignments
      updatedMatches[matchIndex] = {
        ...updatedMatches[matchIndex],
        ...updatedMatch,
      };

      // Update local state first for immediate UI feedback
      setLocalMatches(updatedMatches);
    }

    // Direct update to ensure persistence - IMPORTANT: only update the specific fields that changed
    // This prevents other fields like team1Id and team2Id from being cleared
    await updateMatchInTournamentInDB(tournament.id, matchId, updatedMatch);

    // Call the parent's update function with only the specific updates
    onUpdateMatch(matchId, updatedMatch);

    // If a winner is set, advance to the next round
    if (updatedMatch.winnerId && match.winnerId !== updatedMatch.winnerId) {
      advanceWinnerToNextRound(match, updatedMatch.winnerId);
    }

    setForceUpdateCounter((prev) => prev + 1);
  };

  // Function to advance winner to the next round
  const advanceWinnerToNextRound = async (match: Match, winnerId: string) => {
    // For pool play knockout stage
    if (format === TournamentFormat.POOL_PLAY && match.round >= 100) {
      const currentRound = match.round;
      const nextRound = currentRound + 1;

      // Find the next match in the knockout bracket
      const nextMatchPosition = Math.floor(match.position / 2);
      const nextMatch = localMatches.find(
        (m) => m.round === nextRound && m.position === nextMatchPosition
      );

      if (nextMatch) {
        // Determine if this winner goes to team1 or team2 slot
        const updates =
          match.position % 2 === 0
            ? { team1Id: winnerId }
            : { team2Id: winnerId };

        // Create a deep copy of matches to avoid reference issues
        const updatedMatches = JSON.parse(
          JSON.stringify(localMatches)
        ) as Match[];
        const nextMatchIndex = updatedMatches.findIndex(
          (m) => m.id === nextMatch.id
        );

        if (nextMatchIndex !== -1) {
          // Update only the specific field (team1Id or team2Id)
          updatedMatches[nextMatchIndex] = {
            ...updatedMatches[nextMatchIndex],
            ...updates,
          };

          // Update local state
          setLocalMatches(updatedMatches);
        }

        // Direct update to ensure persistence - IMPORTANT: only update the specific field
        if (tournament.id) {
          await updateMatchInTournamentInDB(
            tournament.id,
            nextMatch.id,
            updates
          );
        }

        // Call the parent's update function with only the specific updates
        onUpdateMatch(nextMatch.id, updates);
      }
    }

    // Keep the rest of the function as is for other tournament formats...
    else if (format === TournamentFormat.SINGLE_ELIMINATION) {
      const currentRound = match.round;
      const nextRound = currentRound + 1;

      // Check if there's a next round
      if (nextRound < tournament.totalRounds) {
        const nextMatchPosition = Math.floor(match.position / 2);
        const nextMatch = localMatches.find(
          (m) => m.round === nextRound && m.position === nextMatchPosition
        );

        if (nextMatch) {
          // Determine if this winner goes to team1 or team2 slot
          const updates =
            match.position % 2 === 0
              ? { team1Id: winnerId }
              : { team2Id: winnerId };

          // Create a deep copy of matches to avoid reference issues
          const updatedMatches = JSON.parse(
            JSON.stringify(localMatches)
          ) as Match[];
          const nextMatchIndex = updatedMatches.findIndex(
            (m) => m.id === nextMatch.id
          );

          if (nextMatchIndex !== -1) {
            // Update only the specific field (team1Id or team2Id)
            updatedMatches[nextMatchIndex] = {
              ...updatedMatches[nextMatchIndex],
              ...updates,
            };

            // Update local state
            setLocalMatches(updatedMatches);
          }

          // Direct update to ensure persistence
          await updateMatchInTournamentInDB(
            tournament.id,
            nextMatch.id,
            updates
          );

          // Call the parent's update function
          onUpdateMatch(nextMatch.id, updates);
        }
      }
    }
    // For double elimination and other formats, similar logic applies...
    else if (format === TournamentFormat.DOUBLE_ELIMINATION) {
      const currentRound = match.round;

      // Handle winners bracket matches
      if (match.isWinnersBracket) {
        const nextRound = currentRound + 1;

        // If not the final round of winners bracket
        if (nextRound < tournament.totalWinnerRounds!) {
          const nextMatchPosition = Math.floor(match.position / 2);
          const nextMatch = localMatches.find(
            (m) =>
              m.round === nextRound &&
              m.position === nextMatchPosition &&
              m.isWinnersBracket
          );

          if (nextMatch) {
            // Determine if this winner goes to team1 or team2 slot
            const updates =
              match.position % 2 === 0
                ? { team1Id: winnerId }
                : { team2Id: winnerId };

            // Create a deep copy of matches to avoid reference issues
            const updatedMatches = JSON.parse(
              JSON.stringify(localMatches)
            ) as Match[];
            const nextMatchIndex = updatedMatches.findIndex(
              (m) => m.id === nextMatch.id
            );

            if (nextMatchIndex !== -1) {
              // Update only the specific field (team1Id or team2Id)
              updatedMatches[nextMatchIndex] = {
                ...updatedMatches[nextMatchIndex],
                ...updates,
              };

              // Update local state
              setLocalMatches(updatedMatches);
            }

            // Direct update to ensure persistence
            await updateMatchInTournamentInDB(
              tournament.id,
              nextMatch.id,
              updates
            );

            // Call the parent's update function
            onUpdateMatch(nextMatch.id, updates);
          }
        }
        // If it's the winners bracket final
        else if (nextRound === tournament.totalWinnerRounds) {
          // Winner goes to grand final
          const finalMatch = localMatches.find((m) => m.id === "final-match");
          if (finalMatch) {
            const updates = { team1Id: winnerId };

            // Create a deep copy of matches to avoid reference issues
            const updatedMatches = JSON.parse(
              JSON.stringify(localMatches)
            ) as Match[];
            const finalMatchIndex = updatedMatches.findIndex(
              (m) => m.id === finalMatch.id
            );

            if (finalMatchIndex !== -1) {
              // Update only the specific field (team1Id)
              updatedMatches[finalMatchIndex] = {
                ...updatedMatches[finalMatchIndex],
                ...updates,
              };

              // Update local state
              setLocalMatches(updatedMatches);
            }

            // Direct update to ensure persistence
            await updateMatchInTournamentInDB(
              tournament.id,
              finalMatch.id,
              updates
            );

            // Call the parent's update function
            onUpdateMatch(finalMatch.id, updates);
          }
        }

        // Handle the loser of this match
        if (match.team1Id && match.team2Id && match.loserGoesTo) {
          const loserId =
            match.team1Id === winnerId ? match.team2Id : match.team1Id;
          const loserMatch = localMatches.find(
            (m) => m.id === match.loserGoesTo
          );

          if (loserMatch) {
            // For first round losers, alternate between team1 and team2 slots
            const updates =
              match.round === 0 && match.position % 2 === 0
                ? { team1Id: loserId }
                : { team2Id: loserId };

            // Create a deep copy of matches to avoid reference issues
            const updatedMatches = JSON.parse(
              JSON.stringify(localMatches)
            ) as Match[];
            const loserMatchIndex = updatedMatches.findIndex(
              (m) => m.id === loserMatch.id
            );

            if (loserMatchIndex !== -1) {
              // Update only the specific field (team1Id or team2Id)
              updatedMatches[loserMatchIndex] = {
                ...updatedMatches[loserMatchIndex],
                ...updates,
              };

              // Update local state
              setLocalMatches(updatedMatches);
            }

            // Direct update to ensure persistence
            await updateMatchInTournamentInDB(
              tournament.id,
              loserMatch.id,
              updates
            );

            // Call the parent's update function
            onUpdateMatch(loserMatch.id, updates);
          }
        }
      }
      // Handle losers bracket matches
      else if (!match.isWinnersBracket && match.id !== "final-match") {
        if (match.winnerGoesTo) {
          const nextMatch = localMatches.find(
            (m) => m.id === match.winnerGoesTo
          );
          if (nextMatch) {
            // For losers bracket, determine if this is a consolidation round
            const isConsolidationRound =
              (match.round - tournament.totalWinnerRounds!) % 2 === 0;
            const updates =
              isConsolidationRound || match.position % 2 === 0
                ? { team1Id: winnerId }
                : { team2Id: winnerId };

            // Create a deep copy of matches to avoid reference issues
            const updatedMatches = JSON.parse(
              JSON.stringify(localMatches)
            ) as Match[];
            const nextMatchIndex = updatedMatches.findIndex(
              (m) => m.id === nextMatch.id
            );

            if (nextMatchIndex !== -1) {
              // Update only the specific field (team1Id or team2Id)
              updatedMatches[nextMatchIndex] = {
                ...updatedMatches[nextMatchIndex],
                ...updates,
              };

              // Update local state
              setLocalMatches(updatedMatches);
            }

            // Direct update to ensure persistence
            await updateMatchInTournamentInDB(
              tournament.id,
              nextMatch.id,
              updates
            );

            // Call the parent's update function
            onUpdateMatch(nextMatch.id, updates);
          }
        }
      }
      // Handle losers final
      else if (match.round === tournament.totalRounds - 2) {
        // Winner of losers final goes to grand final
        const finalMatch = localMatches.find((m) => m.id === "final-match");
        if (finalMatch) {
          const updates = { team2Id: winnerId };

          // Create a deep copy of matches to avoid reference issues
          const updatedMatches = JSON.parse(
            JSON.stringify(localMatches)
          ) as Match[];
          const finalMatchIndex = updatedMatches.findIndex(
            (m) => m.id === finalMatch.id
          );

          if (finalMatchIndex !== -1) {
            // Update only the specific field (team2Id)
            updatedMatches[finalMatchIndex] = {
              ...updatedMatches[finalMatchIndex],
              ...updates,
            };

            // Update local state
            setLocalMatches(updatedMatches);
          }

          // Direct update to ensure persistence
          await updateMatchInTournamentInDB(
            tournament.id,
            finalMatch.id,
            updates
          );

          // Call the parent's update function
          onUpdateMatch(finalMatch.id, updates);
        }
      }
    }
  };

  // Handle match deletion
  const openDeleteMatchDialog = (match: Match) => {
    if (!currentUser === tournament?.createdBy) return;
    setMatchToDelete(match);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteMatch = async () => {
    if (!matchToDelete || !currentUser === tournament?.createdBy) return;

    try {
      // Delete the match from the tournament
      await deleteMatchFromTournamentInDB(tournament.id, matchToDelete.id);

      // Update local state
      setLocalMatches((prev) => prev.filter((m) => m.id !== matchToDelete.id));

      // Close the dialog
      setIsDeleteDialogOpen(false);

      // Show success toast
      toast({
        title: "Match Deleted",
        description: "The match has been successfully deleted.",
        variant: "success",
      });
    } catch (error) {
      console.error("Error deleting match:", error);
      toast({
        title: "Error",
        description: "Failed to delete the match. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle adding a new match
  const openAddMatchDialog = (round: number, poolId?: string) => {
    if (!currentUser === tournament?.createdBy) return;

    // Find the next available position in the round
    let nextPosition = 0;
    if (poolId) {
      // For pool matches
      const poolMatches = localMatches.filter(
        (m) =>
          m.poolId !== undefined &&
          m.poolId.toString() === poolId &&
          m.round === round
      );
      nextPosition =
        poolMatches.length > 0
          ? Math.max(...poolMatches.map((m) => m.position)) + 1
          : 0;
    } else if (round >= 100) {
      // For knockout matches
      const knockoutMatches = localMatches.filter((m) => m.round === round);
      nextPosition =
        knockoutMatches.length > 0
          ? Math.max(...knockoutMatches.map((m) => m.position)) + 1
          : 0;
    } else {
      // For regular rounds
      const roundMatches = localMatches.filter((m) => m.round === round);
      nextPosition =
        roundMatches.length > 0
          ? Math.max(...roundMatches.map((m) => m.position)) + 1
          : 0;
    }

    setNewMatchRound(round);
    setNewMatchPosition(nextPosition);
    setNewMatchPoolId(poolId || "");
    setNewMatchTeam1("");
    setNewMatchTeam2("");
    setNewMatchCourt("");
    setNewMatchTime("");
    setIsAddMatchDialogOpen(true);
  };

  const handleAddMatch = async () => {
    if (!currentUser === tournament?.createdBy) return;

    try {
      // Create a new match object
      const newMatch: Match = {
        id: `match-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        round: newMatchRound,
        position: newMatchPosition,
        team1Id:
          newMatchTeam1 && newMatchTeam1 !== "none" ? newMatchTeam1 : null,
        team2Id:
          newMatchTeam2 && newMatchTeam2 !== "none" ? newMatchTeam2 : null,
        winnerId: null,
        isBye: false,
        court: newMatchCourt || undefined,
        scheduledTime: newMatchTime || undefined,
        poolId: newMatchPoolId || undefined,
        bestOf: tournament.bestOf || 1,
      };

      // Add the match to the tournament
      await addMatchToTournamentInDB(tournament.id, newMatch);

      // Update local state
      setLocalMatches((prev) => [...prev, newMatch]);

      // Close the dialog
      setIsAddMatchDialogOpen(false);

      // Show success toast
      toast({
        title: "Match Added",
        description: "A new match has been successfully added.",
        variant: "success",
      });
    } catch (error) {
      console.error("Error adding match:", error);
      toast({
        title: "Error",
        description: "Failed to add the match. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Display tournament winner banner if there is one
  const WinnerBanner = () => {
    if (!tournamentWinner) return null;

    return (
      <div className="mb-8 p-6 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-center">
        <h3 className="text-xl font-semibold mb-2">Tournament Winner</h3>
        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
          {tournamentWinner.name}
        </p>
      </div>
    );
  };

  // Mobile navigation for rounds
  const handlePreviousRound = () => {
    if (activeRound > 0) {
      setActiveRound(activeRound - 1);
    }
  };

  const handleNextRound = () => {
    const maxRound =
      format === TournamentFormat.POOL_PLAY
        ? Math.max(...Object.keys(knockoutMatchesByRound).map(Number), 0)
        : tournament.totalRounds - 1;

    if (activeRound < maxRound) {
      setActiveRound(activeRound + 1);
    }
  };

  // Render different bracket layouts based on format
  if (format === TournamentFormat.ROUND_ROBIN) {
    return (
      <div className="space-y-8">
        {/* Winner Banner - only show when tournament is actually completed */}
        {isTournamentCompleted && <WinnerBanner />}

        <Tabs defaultValue="bracket" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="bracket">Matches</TabsTrigger>
            <TabsTrigger value="standings">Standings</TabsTrigger>
          </TabsList>

          <TabsContent value="bracket">
            {isMobile ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <Button
                    variant="outline"
                    onClick={handlePreviousRound}
                    disabled={activeRound === 0}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <h3 className="text-xl font-semibold">
                    Round {activeRound + 1}
                  </h3>
                  <Button
                    variant="outline"
                    onClick={handleNextRound}
                    disabled={activeRound === tournament.totalRounds - 1}
                    className="flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-4">
                  {(matchesByRound[activeRound] || []).map((match) => {
                    const team1 = getTeam(match.team1Id);
                    const team2 = getTeam(match.team2Id);
                    const ready = isMatchReady(match);
                    const completed = isMatchCompleted(match);

                    return (
                      <div
                        key={match.id}
                        className="relative"
                        data-match-id={match.id}
                      >
                        {currentUser === tournament?.createdBy && (
                          <div className="absolute -top-2 -right-2 z-10 flex gap-1">
                            {!completed && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-white dark:bg-gray-800"
                                onClick={() => openAssignDialog(match)}
                              >
                                Assign Teams
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-white dark:bg-gray-800 text-red-500 hover:text-red-700"
                              onClick={() => openDeleteMatchDialog(match)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <MatchCard
                          match={match}
                          team1={team1}
                          team2={team2}
                          onUpdateMatch={(matchId, updates) =>
                            handleUpdateMatch(matchId, updates)
                          }
                          ready={ready}
                          completed={completed}
                          currentUser={
                            currentUser
                              ? currentUser === tournament?.createdBy
                              : false
                          }
                          pointsToWin={tournament.pointsToWin}
                          winBy={tournament.winBy}
                          bestOf={match.bestOf || 1}
                          tournamentId={tournament.id}
                        />
                      </div>
                    );
                  })}
                  {currentUser === tournament?.createdBy && (
                    <Button
                      variant="outline"
                      onClick={() => openAddMatchDialog(activeRound)}
                      className="w-full flex items-center justify-center gap-1 mt-4"
                    >
                      <Plus className="h-4 w-4" />
                      Add Match
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="overflow-x-auto relative"
                ref={bracketContainerRef}
              >
                <div className="flex space-x-6 min-w-max pb-6">
                  {Array.from({ length: tournament.totalRounds }).map(
                    (_, roundIndex) => {
                      const roundMatches = matchesByRound[roundIndex] || [];

                      return (
                        <div key={roundIndex} className="flex-shrink-0 w-72">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold">
                              Round {roundIndex + 1}
                            </h3>
                            {currentUser === tournament?.createdBy && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openAddMatchDialog(roundIndex)}
                                className="flex items-center gap-1"
                              >
                                <Plus className="h-4 w-4" />
                                Add Match
                              </Button>
                            )}
                          </div>
                          <div className="space-y-4">
                            {roundMatches.map((match) => {
                              const team1 = getTeam(match.team1Id);
                              const team2 = getTeam(match.team2Id);
                              const ready = isMatchReady(match);
                              const completed = isMatchCompleted(match);

                              return (
                                <div
                                  key={match.id}
                                  className="relative"
                                  data-match-id={match.id}
                                >
                                  {currentUser === tournament?.createdBy && (
                                    <div className="absolute -top-2 -right-2 z-10 flex gap-1">
                                      {!completed && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="bg-white dark:bg-gray-800"
                                          onClick={() =>
                                            openAssignDialog(match)
                                          }
                                        >
                                          Assign Teams
                                        </Button>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-white dark:bg-gray-800 text-red-500 hover:text-red-700"
                                        onClick={() =>
                                          openDeleteMatchDialog(match)
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                  <MatchCard
                                    match={match}
                                    team1={team1}
                                    team2={team2}
                                    onUpdateMatch={(matchId, updates) =>
                                      handleUpdateMatch(matchId, updates)
                                    }
                                    ready={ready}
                                    completed={completed}
                                    currentUser={
                                      currentUser
                                        ? currentUser === tournament?.createdBy
                                        : false
                                    }
                                    pointsToWin={tournament.pointsToWin}
                                    winBy={tournament.winBy}
                                    bestOf={match.bestOf || 1}
                                    tournamentId={tournament.id}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
                <BracketLines
                  matchesByRound={matchesByRound}
                  totalRounds={tournament.totalRounds}
                  format={format}
                  containerRef={bracketContainerRef}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="standings">
            <StandingsTable
              tournament={tournament}
              forceUpdate={forceUpdateCounter}
            />
          </TabsContent>
        </Tabs>

        {/* Team Assignment Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Teams to Match</DialogTitle>
              <DialogDescription>
                Select teams to assign to this match
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="space-y-2">
                <Label htmlFor="team1">Team 1</Label>
                <Select
                  value={team1Selection}
                  onValueChange={setTeam1Selection}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent
                    className="max-h-[200px] overflow-y-auto"
                    position="popper"
                  >
                    <div className="overflow-y-auto max-h-[200px] pr-2">
                      <SelectItem value="none">None</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team2">Team 2</Label>
                <Select
                  value={team2Selection}
                  onValueChange={setTeam2Selection}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent
                    className="max-h-[200px] overflow-y-auto"
                    position="popper"
                  >
                    <div className="overflow-y-auto max-h-[200px] pr-2">
                      <SelectItem value="none">None</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAssignDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveTeamAssignment}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Match Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Match</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this match? This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-4 max-h-[60vh] overflow-y-auto">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteMatch}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Match Dialog */}
        <Dialog
          open={isAddMatchDialogOpen}
          onOpenChange={setIsAddMatchDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Match</DialogTitle>
              <DialogDescription>
                Enter the details for the new match
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="round">Round</Label>
                  <Input
                    id="round"
                    type="number"
                    value={newMatchRound}
                    onChange={(e) => setNewMatchRound(Number(e.target.value))}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    type="number"
                    value={newMatchPosition}
                    onChange={(e) =>
                      setNewMatchPosition(Number(e.target.value))
                    }
                    min="0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team1">Team 1</Label>
                <Select value={newMatchTeam1} onValueChange={setNewMatchTeam1}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team (optional)" />
                  </SelectTrigger>
                  <SelectContent
                    className="max-h-[200px] overflow-y-auto"
                    position="popper"
                  >
                    <div className="overflow-y-auto max-h-[200px] pr-2">
                      <SelectItem value="none">None</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team2">Team 2</Label>
                <Select value={newMatchTeam2} onValueChange={setNewMatchTeam2}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team (optional)" />
                  </SelectTrigger>
                  <SelectContent
                    className="max-h-[200px] overflow-y-auto"
                    position="popper"
                  >
                    <div className="overflow-y-auto max-h-[200px] pr-2">
                      <SelectItem value="none">None</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="court">Court (optional)</Label>
                <Input
                  id="court"
                  value={newMatchCourt}
                  onChange={(e) => setNewMatchCourt(e.target.value)}
                  placeholder="e.g., Court 1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Scheduled Time (optional)</Label>
                <Input
                  id="time"
                  value={newMatchTime}
                  onChange={(e) => setNewMatchTime(e.target.value)}
                  placeholder="e.g., 10:00 AM"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAddMatchDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddMatch}>Add Match</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Pool Play Format
  if (format === TournamentFormat.POOL_PLAY || (pools && pools.length > 0)) {
    return (
      <div className="space-y-8">
        {/* Winner Banner */}
        <WinnerBanner />

        <Tabs defaultValue="pools" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="pools">Pool Play</TabsTrigger>
            <TabsTrigger value="knockout">Knockout Stage</TabsTrigger>
          </TabsList>

          <TabsContent value="pools" className="space-y-8">
            {/* Pool Selection Tabs */}
            {pools && pools.length > 0 && (
              <div className="mb-6">
                <Tabs value={activePool || ""} onValueChange={setActivePool}>
                  <TabsList className="flex flex-wrap">
                    {pools.map((pool) => (
                      <TabsTrigger key={pool.id} value={pool.id.toString()}>
                        {pool.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            )}
            {/* Active Pool Standings */}
            {activePool && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-4">Standings</h3>
                {poolStandings[activePool] ? (
                  <StandingsTable
                    key={`active-pool-${activePool}-${forceUpdateCounter}`}
                    tournament={{
                      ...tournament,
                      teams:
                        pools?.find((p) => p.id.toString() === activePool)
                          ?.teams || [],
                    }}
                    standings={poolStandings[activePool]}
                    onToggleQualification={handleToggleQualification}
                    onUpdatePositions={handleUpdatePositions}
                    poolId={activePool}
                    currentUser={
                      currentUser
                        ? currentUser === tournament?.createdBy
                        : false
                    }
                    forceUpdate={forceUpdateCounter}
                  />
                ) : (
                  <p>No standings available for this pool.</p>
                )}
              </div>
            )}
            {/* Pool Matches */}
            {activePool &&
              (isMobile ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <Button
                      variant="outline"
                      onClick={handlePreviousRound}
                      disabled={activeRound === 0}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <h3 className="text-xl font-semibold">
                      Round {activeRound + 1}
                    </h3>
                    <Button
                      variant="outline"
                      onClick={handleNextRound}
                      disabled={
                        activeRound ===
                        Math.max(
                          ...Array.from(
                            new Set(
                              matchesByPool[activePool]?.map(
                                (match) => match.round
                              ) || [0]
                            )
                          )
                        )
                      }
                      className="flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {(
                      matchesByPool[activePool]?.filter(
                        (match) => match.round === activeRound
                      ) || []
                    ).map((match) => {
                      const team1 = getTeam(match.team1Id);
                      const team2 = getTeam(match.team2Id);
                      const ready = isMatchReady(match);
                      const completed = isMatchCompleted(match);

                      return (
                        <div
                          key={match.id}
                          className="relative"
                          data-match-id={match.id}
                        >
                          {currentUser === tournament?.createdBy && (
                            <div className="absolute -top-2 -right-2 z-10 flex gap-1">
                              {!completed && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-white dark:bg-gray-800"
                                  onClick={() => openAssignDialog(match)}
                                >
                                  Assign Teams
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-white dark:bg-gray-800 text-red-500 hover:text-red-700"
                                onClick={() => openDeleteMatchDialog(match)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          <MatchCard
                            match={match}
                            team1={team1}
                            team2={team2}
                            onUpdateMatch={(matchId, updates) =>
                              handleUpdateMatch(matchId, updates)
                            }
                            ready={ready}
                            completed={completed}
                            currentUser={
                              currentUser
                                ? currentUser === tournament?.createdBy
                                : false
                            }
                            pointsToWin={tournament.pointsToWin}
                            winBy={tournament.winBy}
                            bestOf={match.bestOf || 1}
                            tournamentId={tournament.id}
                          />
                        </div>
                      );
                    })}
                    {currentUser === tournament?.createdBy && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          openAddMatchDialog(activeRound, activePool)
                        }
                        className="w-full flex items-center justify-center gap-1 mt-4"
                      >
                        <Plus className="h-4 w-4" />
                        Add Match
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className="overflow-x-auto relative"
                  ref={bracketContainerRef}
                >
                  <div className="flex space-x-6 min-w-max pb-6">
                    {/* Only show rounds that have matches */}
                    {Array.from(
                      new Set(
                        matchesByPool[activePool]?.map(
                          (match) => match.round
                        ) || []
                      )
                    )
                      .sort((a, b) => a - b)
                      .map((roundIndex) => {
                        const roundMatches =
                          matchesByPool[activePool]?.filter(
                            (match) => match.round === roundIndex
                          ) || [];

                        return (
                          <div key={roundIndex} className="flex-shrink-0 w-72">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="text-xl font-semibold">
                                Round {roundIndex + 1}
                              </h3>
                              {currentUser === tournament?.createdBy && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    openAddMatchDialog(roundIndex, activePool)
                                  }
                                  className="flex items-center gap-1"
                                >
                                  <Plus className="h-4 w-4" />
                                  Add Match
                                </Button>
                              )}
                            </div>
                            <div className="space-y-4">
                              {roundMatches.map((match) => {
                                const team1 = getTeam(match.team1Id);
                                const team2 = getTeam(match.team2Id);
                                const ready = isMatchReady(match);
                                const completed = isMatchCompleted(match);

                                return (
                                  <div
                                    key={match.id}
                                    className="relative"
                                    data-match-id={match.id}
                                  >
                                    {currentUser === tournament?.createdBy && (
                                      <div className="absolute -top-2 -right-2 z-10 flex gap-1">
                                        {!completed && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="bg-white dark:bg-gray-800"
                                            onClick={() =>
                                              openAssignDialog(match)
                                            }
                                          >
                                            Assign Teams
                                          </Button>
                                        )}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="bg-white dark:bg-gray-800 text-red-500 hover:text-red-700"
                                          onClick={() =>
                                            openDeleteMatchDialog(match)
                                          }
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    )}
                                    <MatchCard
                                      match={match}
                                      team1={team1}
                                      team2={team2}
                                      onUpdateMatch={(matchId, updates) =>
                                        handleUpdateMatch(matchId, updates)
                                      }
                                      ready={ready}
                                      completed={completed}
                                      currentUser={
                                        currentUser
                                          ? currentUser ===
                                            tournament?.createdBy
                                          : false
                                      }
                                      pointsToWin={tournament.pointsToWin}
                                      winBy={tournament.winBy}
                                      bestOf={match.bestOf || 1}
                                      tournamentId={tournament.id}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                    {/* Add Round button for admins */}
                    {currentUser === tournament?.createdBy && (
                      <div className="flex-shrink-0 w-72">
                        <div className="flex justify-center items-center h-full">
                          <Button
                            variant="outline"
                            onClick={() => {
                              const nextRound =
                                Math.max(
                                  0,
                                  ...Array.from(
                                    new Set(
                                      matchesByPool[activePool]?.map(
                                        (match) => match.round
                                      ) || [0]
                                    )
                                  )
                                ) + 1;
                              openAddMatchDialog(nextRound, activePool);
                            }}
                            className="flex items-center gap-1"
                          >
                            <Plus className="h-4 w-4" />
                            Add New Round
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <BracketLines
                    matchesByRound={
                      matchesByPool[activePool]?.reduce((acc, match) => {
                        const round = match.round;
                        if (!acc[round]) acc[round] = [];
                        acc[round].push(match);
                        return acc;
                      }, {} as Record<number, Match[]>) || {}
                    }
                    totalRounds={
                      Math.max(
                        ...Array.from(
                          new Set(
                            matchesByPool[activePool]?.map(
                              (match) => match.round
                            ) || [0]
                          )
                        )
                      ) + 1
                    }
                    format={format}
                    containerRef={bracketContainerRef}
                  />
                </div>
              ))}
          </TabsContent>

          <TabsContent value="knockout" className="space-y-8">
            {/* Populate Bracket Button */}
            {currentUser === tournament?.createdBy &&
              areAllPoolMatchesCompleted &&
              qualifiedTeams.length > 0 && (
                <div className="mb-8">
                  <Button
                    onClick={populateKnockoutBracket}
                    disabled={isPopulatingBracket || isKnockoutBracketPopulated}
                    className="mb-4"
                  >
                    {isPopulatingBracket
                      ? "Populating Bracket..."
                      : isKnockoutBracketPopulated
                      ? "Bracket Populated"
                      : "Populate Knockout Bracket"}
                  </Button>
                  {!areAllPoolMatchesCompleted && (
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      All pool matches must be completed before populating the
                      knockout bracket.
                    </p>
                  )}
                </div>
              )}
            {/* Qualified Teams Section */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Qualified Teams</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {qualifiedTeams.map(({ team, position, poolName }) => (
                  <div
                    key={team.id}
                    className="p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-sm flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{team.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {poolName} - Position {position}
                      </p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <span className="font-semibold text-green-800 dark:text-green-300">
                        {position}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* All Pool Standings */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Pool Standings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pools &&
                  pools.map((pool) => (
                    <div key={pool.id} className="border rounded-lg p-4">
                      <h4 className="text-lg font-medium mb-4">{pool.name}</h4>
                      <StandingsTable
                        key={`standings-${pool.id}-${forceUpdateCounter}`}
                        tournament={{
                          ...tournament,
                          teams: pool.teams || [],
                        }}
                        standings={poolStandings[pool.id.toString()] || []}
                        onToggleQualification={handleToggleQualification}
                        onUpdatePositions={handleUpdatePositions}
                        poolId={pool.id.toString()}
                        currentUser={
                          currentUser
                            ? currentUser === tournament?.createdBy
                            : false
                        }
                        forceUpdate={forceUpdateCounter}
                      />
                    </div>
                  ))}
              </div>
            </div>
            {/* Knockout Stage Matches */}
            {isMobile ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <Button
                    variant="outline"
                    onClick={handlePreviousRound}
                    disabled={
                      activeRound < 100 ||
                      !Object.keys(knockoutMatchesByRound).includes(
                        activeRound.toString()
                      )
                    }
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <h3 className="text-xl font-semibold">
                    {activeRound >= 100
                      ? `Knockout Round ${activeRound - 99}`
                      : "Select Round"}
                  </h3>
                  <Button
                    variant="outline"
                    onClick={handleNextRound}
                    disabled={
                      !Object.keys(knockoutMatchesByRound).includes(
                        (activeRound + 1).toString()
                      )
                    }
                    className="flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-4">
                  {(knockoutMatchesByRound[activeRound] || []).map((match) => {
                    const team1 = getTeam(match.team1Id);
                    const team2 = getTeam(match.team2Id);
                    const ready = isMatchReady(match);
                    const completed = isMatchCompleted(match);

                    return (
                      <div
                        key={match.id}
                        className="relative"
                        data-match-id={match.id}
                      >
                        {currentUser === tournament?.createdBy && (
                          <div className="absolute -top-2 -right-2 z-10 flex gap-1">
                            {!completed && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-white dark:bg-gray-800"
                                onClick={() => openAssignDialog(match)}
                              >
                                Assign Teams
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-white dark:bg-gray-800 text-red-500 hover:text-red-700"
                              onClick={() => openDeleteMatchDialog(match)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <MatchCard
                          match={match}
                          team1={team1}
                          team2={team2}
                          onUpdateMatch={(matchId, updates) =>
                            handleUpdateMatch(matchId, updates)
                          }
                          ready={ready}
                          completed={completed}
                          currentUser={
                            currentUser
                              ? currentUser === tournament?.createdBy
                              : false
                          }
                          pointsToWin={tournament.pointsToWin}
                          winBy={tournament.winBy}
                          bestOf={match.bestOf || 1}
                          tournamentId={tournament.id}
                        />
                      </div>
                    );
                  })}
                  {currentUser === tournament?.createdBy &&
                    activeRound >= 100 && (
                      <Button
                        variant="outline"
                        onClick={() => openAddMatchDialog(activeRound)}
                        className="w-full flex items-center justify-center gap-1 mt-4"
                      >
                        <Plus className="h-4 w-4" />
                        Add Match
                      </Button>
                    )}
                  {!Object.keys(knockoutMatchesByRound).length && (
                    <div className="text-center p-4 border rounded-lg">
                      <p>No knockout matches available yet.</p>
                      {currentUser === tournament?.createdBy && (
                        <Button
                          variant="outline"
                          onClick={() => openAddMatchDialog(100)}
                          className="mt-4 flex items-center gap-1 mx-auto"
                        >
                          <Plus className="h-4 w-4" />
                          Add First Knockout Round
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="overflow-x-auto relative"
                ref={bracketContainerRef}
              >
                <div className="flex space-x-6 min-w-max pb-6">
                  {Object.keys(knockoutMatchesByRound)
                    .sort((a, b) => Number.parseInt(a) - Number.parseInt(b))
                    .map((roundKey) => {
                      const round = Number.parseInt(roundKey);
                      const roundMatches = knockoutMatchesByRound[round] || [];

                      return (
                        <div key={round} className="flex-shrink-0 w-72">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold">
                              Knockout Round {round - 99}
                            </h3>
                            {currentUser === tournament?.createdBy && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openAddMatchDialog(round)}
                                className="flex items-center gap-1"
                              >
                                <Plus className="h-4 w-4" />
                                Add Match
                              </Button>
                            )}
                          </div>
                          <div className="space-y-4">
                            {roundMatches.map((match) => {
                              const team1 = getTeam(match.team1Id);
                              const team2 = getTeam(match.team2Id);
                              const ready = isMatchReady(match);
                              const completed = isMatchCompleted(match);

                              return (
                                <div
                                  key={match.id}
                                  className="relative"
                                  data-match-id={match.id}
                                >
                                  {currentUser === tournament?.createdBy && (
                                    <div className="absolute -top-2 -right-2 z-10 flex gap-1">
                                      {!completed && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="bg-white dark:bg-gray-800"
                                          onClick={() =>
                                            openAssignDialog(match)
                                          }
                                        >
                                          Assign Teams
                                        </Button>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-white dark:bg-gray-800 text-red-500 hover:text-red-700"
                                        onClick={() =>
                                          openDeleteMatchDialog(match)
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                  <MatchCard
                                    match={match}
                                    team1={team1}
                                    team2={team2}
                                    onUpdateMatch={(matchId, updates) =>
                                      handleUpdateMatch(matchId, updates)
                                    }
                                    ready={ready}
                                    completed={completed}
                                    currentUser={
                                      currentUser
                                        ? currentUser === tournament?.createdBy
                                        : false
                                    }
                                    pointsToWin={tournament.pointsToWin}
                                    winBy={tournament.winBy}
                                    bestOf={match.bestOf || 1}
                                    tournamentId={tournament.id}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                  {/* Add Round button for admins */}
                  {currentUser === tournament?.createdBy && (
                    <div className="flex-shrink-0 w-72">
                      <div className="flex justify-center items-center h-full">
                        <Button
                          variant="outline"
                          onClick={() => {
                            const existingRounds = Object.keys(
                              knockoutMatchesByRound
                            ).map((r) => Number(r));
                            const nextRound =
                              existingRounds.length > 0
                                ? Math.max(...existingRounds) + 1
                                : 100;
                            openAddMatchDialog(nextRound);
                          }}
                          className="flex items-center gap-1"
                        >
                          <Plus className="h-4 w-4" />
                          Add New Round
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <BracketLines
                  matchesByRound={knockoutMatchesByRound}
                  totalRounds={Object.keys(knockoutMatchesByRound).length}
                  format="POOL_PLAY"
                  containerRef={bracketContainerRef}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Team Assignment Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Teams to Match</DialogTitle>
              <DialogDescription>
                Select teams to assign to this match
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="space-y-2">
                <Label htmlFor="team1">Team 1</Label>
                <Select
                  value={team1Selection}
                  onValueChange={setTeam1Selection}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent
                    className="max-h-[200px] overflow-y-auto"
                    position="popper"
                  >
                    <div className="overflow-y-auto max-h-[200px] pr-2">
                      <SelectItem value="none">None</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team2">Team 2</Label>
                <Select
                  value={team2Selection}
                  onValueChange={setTeam2Selection}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent
                    className="max-h-[200px] overflow-y-auto"
                    position="popper"
                  >
                    <div className="overflow-y-auto max-h-[200px] pr-2">
                      <SelectItem value="none">None</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAssignDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveTeamAssignment}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Match Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Match</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this match? This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-4 max-h-[60vh] overflow-y-auto">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteMatch}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Match Dialog */}
        <Dialog
          open={isAddMatchDialogOpen}
          onOpenChange={setIsAddMatchDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Match</DialogTitle>
              <DialogDescription>
                Enter the details for the new match
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="round">Round</Label>
                  <Input
                    id="round"
                    type="number"
                    value={newMatchRound}
                    onChange={(e) => setNewMatchRound(Number(e.target.value))}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    type="number"
                    value={newMatchPosition}
                    onChange={(e) =>
                      setNewMatchPosition(Number(e.target.value))
                    }
                    min="0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team1">Team 1</Label>
                <Select value={newMatchTeam1} onValueChange={setNewMatchTeam1}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team (optional)" />
                  </SelectTrigger>
                  <SelectContent
                    className="max-h-[200px] overflow-y-auto"
                    position="popper"
                  >
                    <div className="overflow-y-auto max-h-[200px] pr-2">
                      <SelectItem value="none">None</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team2">Team 2</Label>
                <Select value={newMatchTeam2} onValueChange={setNewMatchTeam2}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team (optional)" />
                  </SelectTrigger>
                  <SelectContent
                    className="max-h-[200px] overflow-y-auto"
                    position="popper"
                  >
                    <div className="overflow-y-auto max-h-[200px] pr-2">
                      <SelectItem value="none">None</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="court">Court (optional)</Label>
                <Input
                  id="court"
                  value={newMatchCourt}
                  onChange={(e) => setNewMatchCourt(e.target.value)}
                  placeholder="e.g., Court 1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Scheduled Time (optional)</Label>
                <Input
                  id="time"
                  value={newMatchTime}
                  onChange={(e) => setNewMatchTime(e.target.value)}
                  placeholder="e.g., 10:00 AM"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAddMatchDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddMatch}>Add Match</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Single Elimination Format (default)
  return (
    <div className="space-y-8">
      {/* Winner Banner */}
      {isTournamentCompleted && <WinnerBanner />}

      {isMobile ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <Button
              variant="outline"
              onClick={handlePreviousRound}
              disabled={activeRound === 0}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <h3 className="text-xl font-semibold">
              {roundNames[activeRound] || `Round ${activeRound + 1}`}
            </h3>
            <Button
              variant="outline"
              onClick={handleNextRound}
              disabled={activeRound === tournament.totalRounds - 1}
              className="flex items-center gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-4">
            {(matchesByRound[activeRound] || []).map((match) => {
              const team1 = getTeam(match.team1Id);
              const team2 = getTeam(match.team2Id);
              const ready = isMatchReady(match);
              const completed = isMatchCompleted(match);

              return (
                <div
                  key={match.id}
                  className="relative"
                  data-match-id={match.id}
                >
                  {currentUser === tournament?.createdBy && (
                    <div className="absolute -top-2 -right-2 z-10 flex gap-1">
                      {!completed && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white dark:bg-gray-800"
                          onClick={() => openAssignDialog(match)}
                        >
                          Assign Teams
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white dark:bg-gray-800 text-red-500 hover:text-red-700"
                        onClick={() => openDeleteMatchDialog(match)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <MatchCard
                    match={match}
                    team1={team1}
                    team2={team2}
                    onUpdateMatch={(matchId, updates) =>
                      handleUpdateMatch(matchId, updates)
                    }
                    ready={ready}
                    completed={completed}
                    currentUser={
                      currentUser
                        ? currentUser === tournament?.createdBy
                        : false
                    }
                    pointsToWin={tournament.pointsToWin}
                    winBy={tournament.winBy}
                    bestOf={match.bestOf || 1}
                    tournamentId={tournament.id}
                  />
                </div>
              );
            })}
            {currentUser === tournament?.createdBy && (
              <Button
                variant="outline"
                onClick={() => openAddMatchDialog(activeRound)}
                className="w-full flex items-center justify-center gap-1 mt-4"
              >
                <Plus className="h-4 w-4" />
                Add Match
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto relative" ref={bracketContainerRef}>
          <div className="flex space-x-6 min-w-max pb-6">
            {Array.from({ length: tournament.totalRounds }).map(
              (_, roundIndex) => {
                const roundMatches = matchesByRound[roundIndex] || [];
                const roundName =
                  roundNames[roundIndex] || `Round ${roundIndex + 1}`;

                return (
                  <div key={roundIndex} className="flex-shrink-0 w-72">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold">{roundName}</h3>
                      {currentUser === tournament?.createdBy && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAddMatchDialog(roundIndex)}
                          className="flex items-center gap-1"
                        >
                          <Plus className="h-4 w-4" />
                          Add Match
                        </Button>
                      )}
                    </div>
                    <div className="space-y-4">
                      {roundMatches.map((match) => {
                        const team1 = getTeam(match.team1Id);
                        const team2 = getTeam(match.team2Id);
                        const ready = isMatchReady(match);
                        const completed = isMatchCompleted(match);

                        return (
                          <div
                            key={match.id}
                            className="relative"
                            data-match-id={match.id}
                          >
                            {currentUser === tournament?.createdBy && (
                              <div className="absolute -top-2 -right-2 z-10 flex gap-1">
                                {!completed && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-white dark:bg-gray-800"
                                    onClick={() => openAssignDialog(match)}
                                  >
                                    Assign Teams
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-white dark:bg-gray-800 text-red-500 hover:text-red-700"
                                  onClick={() => openDeleteMatchDialog(match)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            <MatchCard
                              match={match}
                              team1={team1}
                              team2={team2}
                              onUpdateMatch={(matchId, updates) =>
                                handleUpdateMatch(matchId, updates)
                              }
                              ready={ready}
                              completed={completed}
                              currentUser={
                                currentUser
                                  ? currentUser === tournament?.createdBy
                                  : false
                              }
                              pointsToWin={tournament.pointsToWin}
                              winBy={tournament.winBy}
                              bestOf={match.bestOf || 1}
                              tournamentId={tournament.id}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
            )}
          </div>
          <BracketLines
            matchesByRound={matchesByRound}
            totalRounds={tournament.totalRounds}
            format={format}
            containerRef={bracketContainerRef}
          />
        </div>
      )}

      {/* Team Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Teams to Match</DialogTitle>
            <DialogDescription>
              Select teams to assign to this match
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="team1">Team 1</Label>
              <Select value={team1Selection} onValueChange={setTeam1Selection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent
                  className="max-h-[200px] overflow-y-auto"
                  position="popper"
                >
                  <div className="overflow-y-auto max-h-[200px] pr-2">
                    <SelectItem value="none">None</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="team2">Team 2</Label>
              <Select value={team2Selection} onValueChange={setTeam2Selection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent
                  className="max-h-[200px] overflow-y-auto"
                  position="popper"
                >
                  <div className="overflow-y-auto max-h-[200px] pr-2">
                    <SelectItem value="none">None</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAssignDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTeamAssignment}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Match Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Match</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this match? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4 max-h-[60vh] overflow-y-auto">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteMatch}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Match Dialog */}
      <Dialog
        open={isAddMatchDialogOpen}
        onOpenChange={setIsAddMatchDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Match</DialogTitle>
            <DialogDescription>
              Enter the details for the new match
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="round">Round</Label>
                <Input
                  id="round"
                  type="number"
                  value={newMatchRound}
                  onChange={(e) => setNewMatchRound(Number(e.target.value))}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  type="number"
                  value={newMatchPosition}
                  onChange={(e) => setNewMatchPosition(Number(e.target.value))}
                  min="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="team1">Team 1</Label>
              <Select value={newMatchTeam1} onValueChange={setNewMatchTeam1}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team (optional)" />
                </SelectTrigger>
                <SelectContent
                  className="max-h-[200px] overflow-y-auto"
                  position="popper"
                >
                  <div className="overflow-y-auto max-h-[200px] pr-2">
                    <SelectItem value="none">None</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="team2">Team 2</Label>
              <Select value={newMatchTeam2} onValueChange={setNewMatchTeam2}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team (optional)" />
                </SelectTrigger>
                <SelectContent
                  className="max-h-[200px] overflow-y-auto"
                  position="popper"
                >
                  <div className="overflow-y-auto max-h-[200px] pr-2">
                    <SelectItem value="none">None</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="court">Court (optional)</Label>
              <Input
                id="court"
                value={newMatchCourt}
                onChange={(e) => setNewMatchCourt(e.target.value)}
                placeholder="e.g., Court 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Scheduled Time (optional)</Label>
              <Input
                id="time"
                value={newMatchTime}
                onChange={(e) => setNewMatchTime(e.target.value)}
                placeholder="e.g., 10:00 AM"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAddMatchDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddMatch}>Add Match</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
