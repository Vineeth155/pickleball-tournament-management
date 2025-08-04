"use client";

import type React from "react";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Tournament, Team } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, Save, GripVertical } from "lucide-react";
import type { User } from "next-auth";

// Update the TeamStats interface to include total points scored
interface TeamStats {
  team: Team;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  gamesWon: number;
  gamesLost: number;
  pointsWon: number;
  pointsLost: number;
  qualified?: boolean;
  manualPosition?: number; // Add manual position field
}

// Update the component props to include the optional qualification handler
interface StandingsTableProps {
  tournament: Tournament;
  standings?: Array<{
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
    manualPosition?: number; // Add manual position field
  }>;
  onToggleQualification?: (teamId: string, poolId: string) => void;
  poolId?: string;
  currentUser?: string | null;
  onUpdatePositions?: (
    teamPositions: Array<{ teamId: string; position: number }>,
    poolId: string
  ) => void;
  forceUpdate?: number; // Add this prop
}

export default function StandingsTable({
  tournament,
  standings: externalStandings,
  onToggleQualification,
  poolId,
  currentUser,
  onUpdatePositions,
  forceUpdate = 0,
}: StandingsTableProps) {
  const { teams, matches } = tournament;
  const [isEditingPositions, setIsEditingPositions] = useState(false);
  const [manualPositions, setManualPositions] = useState<
    Record<string, number>
  >({});
  const [draggedTeamId, setDraggedTeamId] = useState<string | null>(null);
  const [dragOverTeamId, setDragOverTeamId] = useState<string | null>(null);
  const dragCounter = useRef(0);
  const [localTeams, setLocalTeams] = useState<Team[]>(teams);
  const [positionChanges, setPositionChanges] = useState({});

  // Initialize manual positions from team data
  useEffect(() => {
    const initialPositions: Record<string, number> = {};

    if (externalStandings) {
      externalStandings.forEach((standing, index) => {
        if (standing.team.manualPosition !== undefined) {
          initialPositions[standing.team.id] = standing.team.manualPosition;
        } else {
          // Default to index+1 if no manual position is set
          initialPositions[standing.team.id] = index + 1;
        }
      });
    } else {
      teams.forEach((team, index) => {
        if (team.manualPosition !== undefined) {
          initialPositions[team.id] = team.manualPosition;
        } else {
          // Default to index+1 if no manual position is set
          initialPositions[team.id] = index + 1;
        }
      });
    }

    setManualPositions(initialPositions);
    setLocalTeams(teams);
  }, [teams, externalStandings, forceUpdate]);

  useEffect(() => {
    // This will trigger when forceUpdate changes
    if (forceUpdate) {
      // Force a re-render by updating a local state
      setPositionChanges({});
    }
  }, [forceUpdate]);

  // Calculate team statistics
  const teamStats = useMemo(() => {
    // If external standings are provided, use those
    if (externalStandings) {
      return externalStandings.map((standing) => ({
        team: standing.team,
        played: standing.played,
        wins: standing.wins,
        losses: standing.losses,
        draws: 0,
        points: standing.points,
        goalsFor: standing.goalsFor,
        goalsAgainst: 0,
        goalDifference: standing.goalDifference,
        gamesWon: standing.gamesWon,
        gamesLost: standing.gamesLost,
        pointsWon: standing.totalPoints,
        pointsLost: 0,
        qualified: standing.qualified,
        manualPosition: standing.team.manualPosition,
      }));
    }

    const stats: Record<string, TeamStats> = {};

    // Initialize stats for all teams
    localTeams.forEach((team) => {
      stats[team.id] = {
        team,
        played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        gamesWon: 0,
        gamesLost: 0,
        pointsWon: 0,
        pointsLost: 0,
        qualified: team.qualified || false, // Use the team's qualified status
        manualPosition: team.manualPosition, // Use the team's manual position if available
      };
    });

    // Calculate stats from completed matches
    matches.forEach((match) => {
      // Skip if either team ID is missing or if the team doesn't exist in stats
      if (
        !match.team1Id ||
        !match.team2Id ||
        !stats[match.team1Id] ||
        !stats[match.team2Id]
      ) {
        return;
      }

      const team1 = stats[match.team1Id];
      const team2 = stats[match.team2Id];

      // Only count matches that have been scored or have a winner
      if (
        match.winnerId ||
        (match.team1Score !== undefined && match.team2Score !== undefined)
      ) {
        // Increment matches played
        team1.played++;
        team2.played++;

        // Add goals/points if scores are defined
        if (match.team1Score !== undefined && match.team2Score !== undefined) {
          team1.goalsFor += match.team1Score;
          team1.goalsAgainst += match.team2Score;
          team2.goalsFor += match.team2Score;
          team2.goalsAgainst += match.team1Score;

          // Add game wins/losses if detailed game scores are available
          if (match.team1Games && match.team2Games) {
            const validGames = match.team1Games.filter(
              (score, i) =>
                score > 0 || (match.team2Games && match.team2Games[i] > 0)
            );

            validGames.forEach((score, i) => {
              const team1Score = score;
              const team2Score = match.team2Games ? match.team2Games[i] : 0;

              if (team1Score > team2Score) {
                team1.gamesWon++;
                team2.gamesLost++;
              } else if (team2Score > team1Score) {
                team2.gamesWon++;
                team1.gamesLost++;
              }

              // Add individual points from game scores
              if (!match.team1TotalPoints && !match.team2TotalPoints) {
                team1.pointsWon += team1Score;
                team1.pointsLost += team2Score;
                team2.pointsWon += team2Score;
                team2.pointsLost += team1Score;
              }
            });
          }

          // If total points are directly provided, use those instead
          if (
            match.team1TotalPoints !== undefined &&
            match.team2TotalPoints !== undefined
          ) {
            team1.pointsWon += match.team1TotalPoints;
            team1.pointsLost += match.team2TotalPoints;
            team2.pointsWon += match.team2TotalPoints;
            team2.pointsLost += match.team1TotalPoints;
          }
        }

        // Determine winner/loser
        if (match.winnerId === match.team1Id) {
          team1.wins++;
          team1.points += 3;
          team2.losses++;
        } else if (match.winnerId === match.team2Id) {
          team2.wins++;
          team2.points += 3;
          team1.losses++;
        } else if (
          match.team1Score !== undefined &&
          match.team2Score !== undefined
        ) {
          // If no winner but scores are set, check for a draw
          if (match.team1Score === match.team2Score) {
            team1.draws++;
            team2.draws++;
            team1.points += 1;
            team2.points += 1;
          } else if (match.team1Score > match.team2Score) {
            team1.wins++;
            team1.points += 3;
            team2.losses++;
          } else {
            team2.wins++;
            team2.points += 3;
            team1.losses++;
          }
        }
      }
    });

    // Calculate goal difference for each team
    Object.values(stats).forEach((team) => {
      team.goalDifference = team.goalsFor - team.goalsAgainst;
    });

    // Convert to array and sort with comprehensive tiebreakers
    const sortedStats = Object.values(stats).sort((a, b) => {
      // If manual positions are set, use them first
      if (
        a.team.manualPosition !== undefined &&
        b.team.manualPosition !== undefined
      ) {
        return a.team.manualPosition - b.team.manualPosition;
      }

      // If only one has a manual position, prioritize it
      if (a.team.manualPosition !== undefined) return -1;
      if (b.team.manualPosition !== undefined) return 1;

      // Otherwise use the standard sorting criteria
      if (a.points !== b.points) return b.points - a.points;
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.goalDifference !== b.goalDifference)
        return b.goalDifference - a.goalDifference;
      if (a.gamesWon !== b.gamesWon) return b.gamesWon - a.gamesWon;
      if (a.pointsWon !== b.pointsWon) return b.pointsWon - a.pointsWon;
      if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
      if (a.played !== b.played) return b.played - a.played;
      // Final tiebreaker: Team ID for consistency
      return a.team.id.localeCompare(b.team.id);
    });

    return sortedStats;
  }, [localTeams, matches, externalStandings, forceUpdate, positionChanges]);

  // Apply manual positions from state
  const displayTeamStats = useMemo(() => {
    // Create a copy of teamStats to avoid modifying the original
    const statsWithManualPositions = [...teamStats];

    // Apply manual positions from state
    Object.entries(manualPositions).forEach(([teamId, position]) => {
      const teamIndex = statsWithManualPositions.findIndex(
        (stat) => stat.team.id === teamId
      );
      if (teamIndex !== -1) {
        statsWithManualPositions[teamIndex] = {
          ...statsWithManualPositions[teamIndex],
          manualPosition: position,
        };
      }
    });

    // Sort by manual positions if editing, otherwise use the default sorting
    if (isEditingPositions) {
      return statsWithManualPositions.sort((a, b) => {
        const posA =
          a.team.id in manualPositions
            ? manualPositions[a.team.id]
            : a.manualPosition || Number.MAX_SAFE_INTEGER;
        const posB =
          b.team.id in manualPositions
            ? manualPositions[b.team.id]
            : b.manualPosition || Number.MAX_SAFE_INTEGER;
        return posA - posB;
      });
    }

    return statsWithManualPositions;
  }, [teamStats, manualPositions, isEditingPositions]);

  // Handle moving a team up in the standings
  const handleMoveUp = (teamId: string, currentIndex: number) => {
    if (currentIndex <= 0) return; // Can't move up if already at the top

    // Get the current positions
    const newPositions = { ...manualPositions };

    // Get the team above
    const teamAboveId = displayTeamStats[currentIndex - 1].team.id;

    // Swap positions
    const currentPos = newPositions[teamId] || currentIndex + 1;
    const abovePos = newPositions[teamAboveId] || currentIndex;

    newPositions[teamId] = abovePos;
    newPositions[teamAboveId] = currentPos;

    setManualPositions(newPositions);
  };

  // Handle moving a team down in the standings
  const handleMoveDown = (teamId: string, currentIndex: number) => {
    if (currentIndex >= displayTeamStats.length - 1) return; // Can't move down if already at the bottom

    // Get the current positions
    const newPositions = { ...manualPositions };

    // Get the team below
    const teamBelowId = displayTeamStats[currentIndex + 1].team.id;

    // Swap positions
    const currentPos = newPositions[teamId] || currentIndex + 1;
    const belowPos = newPositions[teamBelowId] || currentIndex + 2;

    newPositions[teamId] = belowPos;
    newPositions[teamBelowId] = currentPos;

    setManualPositions(newPositions);
  };

  // Handle drag start
  const handleDragStart = (
    e: React.DragEvent<HTMLTableRowElement>,
    teamId: string
  ) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", teamId);
    setDraggedTeamId(teamId);

    // Add a delay to prevent the drag ghost image from being weird
    setTimeout(() => {
      if (e.currentTarget) {
        e.currentTarget.classList.add("opacity-50");
      }
    }, 0);
  };

  // Handle drag over
  const handleDragOver = (
    e: React.DragEvent<HTMLTableRowElement>,
    teamId: string
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (draggedTeamId !== teamId) {
      setDragOverTeamId(teamId);
    }
  };

  // Handle drag enter
  const handleDragEnter = (
    e: React.DragEvent<HTMLTableRowElement>,
    teamId: string
  ) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (e.currentTarget) {
      e.currentTarget.classList.add("bg-gray-100", "dark:bg-gray-800");
    }
  };

  // Handle drag leave
  const handleDragLeave = (e: React.DragEvent<HTMLTableRowElement>) => {
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      if (e.currentTarget) {
        e.currentTarget.classList.remove("bg-gray-100", "dark:bg-gray-800");
      }
      setDragOverTeamId(null);
    }
  };

  // Handle drop
  const handleDrop = (
    e: React.DragEvent<HTMLTableRowElement>,
    targetTeamId: string
  ) => {
    e.preventDefault();
    if (e.currentTarget) {
      e.currentTarget.classList.remove("bg-gray-100", "dark:bg-gray-800");
    }
    dragCounter.current = 0;

    const sourceTeamId = e.dataTransfer.getData("text/plain");

    if (sourceTeamId !== targetTeamId) {
      // Find the indices of the source and target teams
      const sourceIndex = displayTeamStats.findIndex(
        (stat) => stat.team.id === sourceTeamId
      );
      const targetIndex = displayTeamStats.findIndex(
        (stat) => stat.team.id === targetTeamId
      );

      if (sourceIndex !== -1 && targetIndex !== -1) {
        // Create a new positions object
        const newPositions = { ...manualPositions };

        // Get all teams between source and target
        const start = Math.min(sourceIndex, targetIndex);
        const end = Math.max(sourceIndex, targetIndex);
        const affectedTeams = displayTeamStats.slice(start, end + 1);

        // If moving down, shift all teams between up
        if (sourceIndex < targetIndex) {
          affectedTeams.forEach((stat, i) => {
            if (i === 0) {
              // This is the dragged team, move it to the target position
              newPositions[stat.team.id] = targetIndex + 1;
            } else {
              // Shift this team up
              newPositions[stat.team.id] = start + i;
            }
          });
        }
        // If moving up, shift all teams between down
        else {
          affectedTeams.forEach((stat, i) => {
            if (i === affectedTeams.length - 1) {
              // This is the dragged team, move it to the target position
              newPositions[stat.team.id] = targetIndex + 1;
            } else {
              // Shift this team down
              newPositions[stat.team.id] = start + i + 1;
            }
          });
        }

        setManualPositions(newPositions);
      }
    }

    setDraggedTeamId(null);
    setDragOverTeamId(null);
    dragCounter.current = 0;
  };

  // Handle drag end
  const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
    if (e.currentTarget) {
      e.currentTarget.classList.remove("opacity-50");
    }
    setDraggedTeamId(null);
    setDragOverTeamId(null);
    dragCounter.current = 0;
  };

  // Save the manual positions
  const saveManualPositions = () => {
    if (!poolId || !onUpdatePositions) return;

    // Convert manual positions to the format expected by onUpdatePositions
    const teamPositions = Object.entries(manualPositions).map(
      ([teamId, position]) => ({
        teamId,
        position,
      })
    );

    console.log("Saving positions:", teamPositions);

    // Force a re-render immediately
    setPositionChanges((prev) => ({ ...prev, updated: Date.now() }));

    // Call the parent handler with the updated positions
    onUpdatePositions(teamPositions, poolId);

    // Exit edit mode
    setIsEditingPositions(false);
  };

  // Handle toggling qualification directly in the component
  const handleToggleQualification = useCallback(
    (teamId: string) => {
      if (!poolId || !onToggleQualification) return;

      // Update local state immediately for UI feedback
      setLocalTeams((prevTeams) => {
        return prevTeams.map((team) => {
          if (team.id === teamId) {
            return {
              ...team,
              qualified: !team.qualified,
            };
          }
          return team;
        });
      });

      // Force a re-render immediately
      setPositionChanges((prev) => ({ ...prev, [teamId]: Date.now() }));

      // Call the parent handler to update the actual data
      onToggleQualification(teamId, poolId);
    },
    [poolId, onToggleQualification]
  );

  // Format team name with skill level badge
  const formatTeamName = (team: Team, index: number, stats: TeamStats) => {
    // Check if this is a pool and if all matches are completed
    const isPoolPlay = tournament.pools && tournament.pools.length > 0;
    const poolId =
      team.poolId ||
      (isPoolPlay
        ? tournament.pools?.find((p) => p.teams.some((t) => t.id === team.id))
            ?.id
        : undefined);

    // If this is pool play, check if all matches in this pool are completed
    const allPoolMatchesCompleted =
      isPoolPlay && poolId !== undefined
        ? tournament.matches
            .filter(
              (m) =>
                m.poolId !== undefined &&
                m.poolId.toString() === poolId.toString()
            )
            .every((m) => m.winnerId !== null)
        : false;

    // Show "Advances" badge if team is qualified
    const showAdvancesBadge = isPoolPlay && stats.qualified;

    return (
      <div>
        <div className="font-medium">
          {team.name}
          {team.players && team.players.length > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              {team.players.join(" / ")}
            </div>
          )}
        </div>
        <div className="flex gap-1 mt-1">
          {team.skillLevel && (
            <Badge variant="outline" className="text-xs">
              {team.skillLevel}
            </Badge>
          )}
          {team.ageGroup && (
            <Badge variant="outline" className="text-xs">
              {team.ageGroup}
            </Badge>
          )}
          {showAdvancesBadge && (
            <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              Qualified
            </Badge>
          )}
        </div>
      </div>
    );
  };

  // Add a useEffect to respond to forceUpdate changes more aggressively
  useEffect(() => {
    if (forceUpdate > 0) {
      // Force a complete re-render by updating the local state
      setPositionChanges((prev) => ({ ...prev, forceUpdate: Date.now() }));

      // Re-initialize teams from props to ensure we have the latest data
      setLocalTeams([...teams]);
    }
  }, [forceUpdate, teams]);

  return (
    <div className="rounded-md border">
      {currentUser && poolId && (
        <div className="p-2 border-b flex justify-between items-center">
          {isEditingPositions ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditingPositions(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={saveManualPositions}>
                <Save className="h-4 w-4 mr-1" />
                Save Positions
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditingPositions(true)}
            >
              Edit Positions
            </Button>
          )}
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">Pos</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="text-center">P</TableHead>
            <TableHead className="text-center">W</TableHead>
            <TableHead className="text-center">L</TableHead>
            <TableHead className="text-center">GW</TableHead>
            <TableHead className="text-center">GL</TableHead>
            <TableHead className="text-center">PD</TableHead>
            <TableHead className="text-center">TP</TableHead>
            <TableHead className="text-center">Pts</TableHead>
            {onToggleQualification && currentUser && (
              <TableHead className="text-center">Qualify</TableHead>
            )}
            {isEditingPositions && currentUser && (
              <TableHead className="text-center">Move</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayTeamStats.map((standing, index) => (
            <TableRow
              key={standing.team.id}
              className={`
                ${standing.qualified ? "bg-green-50 dark:bg-green-900/20" : ""}
                ${draggedTeamId === standing.team.id ? "opacity-50" : ""}
                ${
                  dragOverTeamId === standing.team.id
                    ? "border-t-2 border-primary"
                    : ""
                }
                ${isEditingPositions ? "cursor-move" : ""}
              `}
              draggable={isEditingPositions}
              onDragStart={
                isEditingPositions
                  ? (e) => handleDragStart(e, standing.team.id)
                  : undefined
              }
              onDragOver={
                isEditingPositions
                  ? (e) => handleDragOver(e, standing.team.id)
                  : undefined
              }
              onDragEnter={
                isEditingPositions
                  ? (e) => handleDragEnter(e, standing.team.id)
                  : undefined
              }
              onDragLeave={isEditingPositions ? handleDragLeave : undefined}
              onDrop={
                isEditingPositions
                  ? (e) => handleDrop(e, standing.team.id)
                  : undefined
              }
              onDragEnd={isEditingPositions ? handleDragEnd : undefined}
            >
              <TableCell className="text-center font-medium">
                {index + 1}
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  {isEditingPositions && (
                    <GripVertical className="h-4 w-4 mr-2 text-muted-foreground cursor-grab" />
                  )}
                  {formatTeamName(standing.team, index, standing)}
                </div>
              </TableCell>
              <TableCell className="text-center">{standing.played}</TableCell>
              <TableCell className="text-center">{standing.wins}</TableCell>
              <TableCell className="text-center">{standing.losses}</TableCell>
              <TableCell className="text-center">{standing.gamesWon}</TableCell>
              <TableCell className="text-center">
                {standing.gamesLost}
              </TableCell>
              <TableCell className="text-center font-medium">
                {standing.goalDifference}
              </TableCell>
              <TableCell className="text-center font-medium">
                {standing.pointsWon}
              </TableCell>
              <TableCell className="text-center font-bold">
                {standing.points}
              </TableCell>
              {onToggleQualification && currentUser && poolId && (
                <TableCell className="text-center">
                  <Button
                    variant={standing.qualified ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleQualification(standing.team.id)}
                  >
                    {standing.qualified ? "Unqualify" : "Qualify"}
                  </Button>
                </TableCell>
              )}
              {isEditingPositions && currentUser && (
                <TableCell className="text-center">
                  <div className="flex flex-col gap-1 items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => handleMoveUp(standing.team.id, index)}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => handleMoveDown(standing.team.id, index)}
                      disabled={index === displayTeamStats.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="p-2 text-xs text-muted-foreground">
        <p>
          P = Matches Played, W = Wins, L = Losses, GW = Games Won, GL = Games
          Lost, PD = Point Difference, TP = Total Points Scored, Pts = Points
        </p>
      </div>
    </div>
  );
}
