"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { MatchCard } from "@/components/match-card";
import { MatchWinnerIndicator } from "@/components/match-winner-indicator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  type Category,
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
import PoolBracketDisplay from "@/components/pool-bracket-display";
import KnockoutBracketDisplay from "@/components/knockout-bracket-display";
import {
  updateMatchInTournamentInDB,
  saveTournamentsToDB,
  updateTournamentInDB,
  deleteMatchFromTournamentInDB,
  addMatchToTournamentInDB,
  getTournamentByIdFromDB,
} from "@/lib/tournament-store";

interface CategoryBracketProps {
  category: Category;
  tournamentId: string;
  onUpdateMatch: (matchId: string, updatedMatch: Partial<Match>) => void;
  currentUser: string | null;
}

export default function CategoryBracket({
  category,
  tournamentId,
  onUpdateMatch,
  currentUser,
}: CategoryBracketProps) {
  const { matches = [], teams = [], format, pools = [], totalRounds = 0 } = category;
  
  // Debug logging
  console.log("CategoryBracket render:", {
    categoryId: category.id,
    gender: category.gender,
    division: category.division,
    format,
    totalRounds,
    teamsCount: teams.length,
    matchesCount: matches.length,
    matches: matches.map(m => ({
      id: m.id,
      round: m.round,
      position: m.position,
      team1Id: m.team1Id,
      team2Id: m.team2Id
    }))
  });
  
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
  
  // For tracking qualified teams from pools
  const [qualifiedTeams, setQualifiedTeams] = useState<Set<string>>(new Set());
  
  // Initialize qualified teams from category data if available
  useEffect(() => {
    if (category.qualifiedTeams && Array.isArray(category.qualifiedTeams)) {
      setQualifiedTeams(new Set(category.qualifiedTeams));
    }
  }, [category.qualifiedTeams]);
  const [newMatchCourt, setNewMatchCourt] = useState<string>("");
  const [newMatchTime, setNewMatchTime] = useState<string>("");

  // Track if we're currently populating the bracket
  const [isPopulatingBracket, setIsPopulatingBracket] = useState(false);

  // Add local state to track matches
  const [localMatches, setLocalMatches] = useState<Match[]>(matches);
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

  // Update local matches when category changes
  useEffect(() => {
    setLocalMatches(matches);
  }, [matches]);

  const roundNames = useMemo(() => {
    if (!format || !totalRounds) return [];
    
    if (format === TournamentFormat.ROUND_ROBIN) {
      return Array.from(
        { length: totalRounds },
        (_, i) => `Round ${i + 1}`
      );
    }

    const names = [];

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
  }, [totalRounds, format, teams.length]);

  // Group matches by round
  const matchesByRound = useMemo(() => {
    const grouped: Record<number, Match[]> = {};

    for (let i = 0; i < totalRounds; i++) {
      grouped[i] = localMatches
        .filter((match) => match.round === i)
        .sort((a, b) => a.position - b.position);
    }

    return grouped;
  }, [totalRounds, localMatches]);

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

  // Check if the category is completed
  const isCategoryCompleted = useMemo(() => {
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
    const finalRound = totalRounds - 1;
    const finalMatch = matches.find((match) => match.round === finalRound);

    return finalMatch ? !!finalMatch.winnerId : false;
  }, [format, matches, totalRounds]);

  // Get the winner of the category
  const categoryWinner = useMemo(() => {
    // Only determine a winner if the category is completed
    if (!isCategoryCompleted) {
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
    const finalRound = totalRounds - 1;
    const finalMatch = matches.find((match) => match.round === finalRound);

    if (finalMatch?.winnerId) {
      return getTeam(finalMatch.winnerId);
    }

    return null;
  }, [format, isCategoryCompleted, matches, teams, totalRounds]);

  // Display category winner banner if there is one
  const WinnerBanner = () => {
    if (!categoryWinner) return null;

    return (
      <div className="mb-8 p-6 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-center">
        <h3 className="text-xl font-semibold mb-2">Category Winner</h3>
        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
          {categoryWinner.name}
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
        : totalRounds - 1;

    if (activeRound < maxRound) {
      setActiveRound(activeRound + 1);
    }
  };

  const handleTeamQualification = async (teamIds: string[]) => {
    const newQualifiedTeams = new Set(qualifiedTeams);
    teamIds.forEach(teamId => {
      newQualifiedTeams.add(teamId);
    });
    setQualifiedTeams(newQualifiedTeams);
    
    // Update the database with qualified teams
    try {
      // Get the current tournament from database
      const tournament = await getTournamentByIdFromDB(tournamentId);
      if (!tournament) {
        console.error('Tournament not found for database update');
        return;
      }
      
      // Update the category with qualified teams
      const updatedCategories = tournament.categories.map(cat => 
        cat.id === category.id 
          ? { ...cat, qualifiedTeams: Array.from(newQualifiedTeams) }
          : cat
      );
      
      // Update the tournament in the database
      const updatedTournament = {
        ...tournament,
        categories: updatedCategories
      };
      
      await updateTournamentInDB(updatedTournament);
      
      console.log('Qualified teams updated in database:', teamIds);
      toast({
        title: "Teams Qualified",
        description: `${teamIds.length} team(s) have been qualified for knockout rounds`,
      });
      
    } catch (error) {
      console.error('Failed to update qualified teams in database:', error);
      // Revert the local state if database update fails
      setQualifiedTeams(qualifiedTeams);
      toast({
        title: "Update Failed",
        description: "Failed to save qualified teams to database. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Debug: Show what format we're dealing with
  console.log("CategoryBracket render logic:", {
    format,
    totalRounds,
    teamsCount: teams.length,
    matchesCount: matches.length,
    isCategoryCompleted,
    roundNames: roundNames.length
  });

  // Render different bracket layouts based on format
  if (format === TournamentFormat.ROUND_ROBIN) {
    console.log("Rendering ROUND_ROBIN format");
    return (
      <div className="space-y-8">
        {/* Winner Banner - only show when category is actually completed */}
        {isCategoryCompleted && <WinnerBanner />}

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
                    disabled={activeRound === totalRounds - 1}
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
                        <MatchWinnerIndicator
                          match={match}
                          team1={team1}
                          team2={team2}
                          compact={true}
                        />
                        <MatchCard
                          match={match}
                          team1={team1}
                          team2={team2}
                          onUpdateMatch={(matchId, updates) =>
                            onUpdateMatch(matchId, updates)
                          }
                          ready={ready}
                          completed={completed}
                          currentUser={!!currentUser}
                          pointsToWin={category.pointsToWin}
                          winBy={category.winBy}
                          bestOf={match.bestOf || 1}
                          tournamentId={tournamentId}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                className="overflow-x-auto relative"
                ref={bracketContainerRef}
              >
                <div className="flex space-x-6 min-w-max pb-6">
                  {Array.from({ length: totalRounds }).map(
                    (_, roundIndex) => {
                      const roundMatches = matchesByRound[roundIndex] || [];

                      return (
                        <div key={roundIndex} className="flex-shrink-0 w-72">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold">
                              Round {roundIndex + 1}
                            </h3>
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
                                  <MatchWinnerIndicator
                                    match={match}
                                    team1={team1}
                                    team2={team2}
                                    compact={false}
                                  />
                                  <MatchCard
                                    match={match}
                                    team1={team1}
                                    team2={team2}
                                    onUpdateMatch={(matchId, updates) =>
                                      onUpdateMatch(matchId, updates)
                                    }
                                    ready={ready}
                                    completed={completed}
                                    currentUser={!!currentUser}
                                    pointsToWin={category.pointsToWin}
                                    winBy={category.winBy}
                                    bestOf={match.bestOf || 1}
                                    tournamentId={tournamentId}
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
                  totalRounds={totalRounds}
                  format={format}
                  containerRef={bracketContainerRef}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="standings">
            <StandingsTable
              tournament={{ categories: [category] }}
              forceUpdate={forceUpdateCounter}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  } else if (format === TournamentFormat.SINGLE_ELIMINATION) {
    console.log("Rendering SINGLE_ELIMINATION format");
    console.log("SINGLE_ELIMINATION debug:", {
      totalRounds,
      matchesByRound: Object.keys(matchesByRound),
      roundNames: roundNames.length,
      teams: teams.length,
      matches: matches.length
    });
    
    // Check if we have the data needed to render
    if (totalRounds === 0) {
      console.log("ERROR: totalRounds is 0, cannot render bracket");
      return (
        <div className="text-center p-8">
          <h3 className="text-xl font-semibold mb-2">
            {category.gender} {category.division}
          </h3>
          <p className="text-muted-foreground">
            Cannot render bracket: totalRounds is 0
          </p>

        </div>
      );
    }
    
    if (Object.keys(matchesByRound).length === 0) {
      console.log("ERROR: matchesByRound is empty, cannot render bracket");
      return (
        <div className="text-center p-8">
          <h3 className="text-xl font-semibold mb-2">
            {category.gender} {category.division}
          </h3>
          <p className="text-muted-foreground">
            Cannot render bracket: no matches organized by rounds
          </p>

        </div>
      );
    }
    
    return (
      <div className="space-y-8">
        {/* Winner Banner - only show when category is actually completed */}
        {isCategoryCompleted && <WinnerBanner />}

        <Tabs defaultValue="bracket" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="bracket">Bracket</TabsTrigger>
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
                    {roundNames[activeRound] || `Round ${activeRound + 1}`}
                  </h3>
                  <Button
                    variant="outline"
                    onClick={handleNextRound}
                    disabled={activeRound === totalRounds - 1}
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
                        <MatchWinnerIndicator
                          match={match}
                          team1={team1}
                          team2={team2}
                          compact={true}
                        />
                        <MatchCard
                          match={match}
                          team1={team1}
                          team2={team2}
                          onUpdateMatch={(matchId, updates) =>
                            onUpdateMatch(matchId, updates)
                          }
                          ready={ready}
                          completed={completed}
                          currentUser={!!currentUser}
                          pointsToWin={category.pointsToWin}
                          winBy={category.winBy}
                          bestOf={match.bestOf || 1}
                          tournamentId={tournamentId}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                className="overflow-x-auto relative"
                ref={bracketContainerRef}
              >
                <div className="flex space-x-6 min-w-max pb-6">
                  {Array.from({ length: totalRounds }).map(
                    (_, roundIndex) => {
                      const roundMatches = matchesByRound[roundIndex] || [];

                      return (
                        <div key={roundIndex} className="flex-shrink-0 w-72">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold">
                              {roundNames[roundIndex] || `Round ${roundIndex + 1}`}
                            </h3>
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
                                  <MatchCard
                                    match={match}
                                    team1={team1}
                                    team2={team2}
                                    onUpdateMatch={(matchId, updates) =>
                                      onUpdateMatch(matchId, updates)
                                    }
                                    ready={ready}
                                    completed={completed}
                                    currentUser={!!currentUser}
                                    pointsToWin={category.pointsToWin}
                                    winBy={category.winBy}
                                    bestOf={match.bestOf || 1}
                                    tournamentId={tournamentId}
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
                  totalRounds={totalRounds}
                  format={format}
                  containerRef={bracketContainerRef}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="standings">
            <StandingsTable
              tournament={{ categories: [category] }}
              forceUpdate={forceUpdateCounter}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  } else if (format === TournamentFormat.DOUBLE_ELIMINATION) {
    console.log("Rendering DOUBLE_ELIMINATION format");
    return (
      <div className="space-y-8">
        {/* Winner Banner - only show when category is actually completed */}
        {isCategoryCompleted && <WinnerBanner />}

        <Tabs defaultValue="bracket" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="bracket">Bracket</TabsTrigger>
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
                    {roundNames[activeRound] || `Round ${activeRound + 1}`}
                  </h3>
                  <Button
                    variant="outline"
                    onClick={handleNextRound}
                    disabled={activeRound === (totalRounds - 1)}
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
                        <MatchWinnerIndicator
                          match={match}
                          team1={team1}
                          team2={team2}
                          compact={true}
                        />
                        <MatchCard
                          match={match}
                          team1={team1}
                          team2={team2}
                          onUpdateMatch={(matchId, updates) =>
                            onUpdateMatch(matchId, updates)
                          }
                          ready={ready}
                          completed={completed}
                          currentUser={!!currentUser}
                          pointsToWin={category.pointsToWin}
                          winBy={category.winBy}
                          bestOf={match.bestOf || 1}
                          tournamentId={tournamentId}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                className="overflow-x-auto relative"
                ref={bracketContainerRef}
              >
                <div className="flex space-x-6 min-w-max pb-6">
                  {Array.from({ length: totalRounds }).map(
                    (_, roundIndex) => {
                      const roundMatches = matchesByRound[roundIndex] || [];

                      return (
                        <div key={roundIndex} className="flex-shrink-0 w-72">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold">
                              {roundNames[roundIndex] || `Round ${roundIndex + 1}`}
                            </h3>
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
                                  <MatchWinnerIndicator
                                    match={match}
                                    team1={team1}
                                    team2={team2}
                                    compact={false}
                                  />
                                  <MatchCard
                                    match={match}
                                    team1={team1}
                                    team2={team2}
                                    onUpdateMatch={(matchId, updates) =>
                                      onUpdateMatch(matchId, updates)
                                    }
                                    ready={ready}
                                    completed={completed}
                                    currentUser={!!currentUser}
                                    pointsToWin={category.pointsToWin}
                                    winBy={category.winBy}
                                    bestOf={match.bestOf || 1}
                                    tournamentId={tournamentId}
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
                  totalRounds={totalRounds}
                  format={format}
                  containerRef={bracketContainerRef}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="standings">
            <StandingsTable
              tournament={{ categories: [category] }}
              forceUpdate={forceUpdateCounter}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  } else if (format === TournamentFormat.POOL_PLAY) {
    console.log("Rendering POOL_PLAY format");
    return (
      <div className="space-y-8">
        {/* Winner Banner - only show when category is actually completed */}
        {isCategoryCompleted && <WinnerBanner />}

        <Tabs defaultValue="pools" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="pools">Pool Matches</TabsTrigger>
            <TabsTrigger value="knockout">Knockout Bracket</TabsTrigger>
            <TabsTrigger value="standings">Standings</TabsTrigger>
          </TabsList>

          <TabsContent value="pools">
            <PoolBracketDisplay
              category={category}
              teams={teams}
              matches={matches}
              onUpdateMatch={onUpdateMatch}
              currentUser={currentUser}
              tournamentId={tournamentId}
              onTeamQualification={handleTeamQualification}
              qualifiedTeams={qualifiedTeams}
            />
          </TabsContent>

          <TabsContent value="knockout">
            <KnockoutBracketDisplay
              category={category}
              teams={teams}
              matches={matches}
              onUpdateMatch={onUpdateMatch}
              currentUser={currentUser}
              tournamentId={tournamentId}
              qualifiedTeams={qualifiedTeams}
            />
          </TabsContent>

          <TabsContent value="standings">
            <StandingsTable
              tournament={{ categories: [category] }}
              forceUpdate={forceUpdateCounter}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // For other formats, return a simple message for now
  console.log("Rendering fallback - no format matched:", format);
  return (
    <div className="space-y-8">
      <div className="text-center p-8">
        <h3 className="text-xl font-semibold mb-2">
          {category.gender} {category.division}
        </h3>
        <p className="text-muted-foreground">
          Bracket format: {format}
        </p>
        <p className="text-muted-foreground">
          Total rounds: {totalRounds}
        </p>
        <p className="text-muted-foreground">
          Teams: {teams.length}
        </p>
        <p className="text-muted-foreground">
          Matches: {matches.length}
        </p>
        

      </div>
    </div>
  );
}
