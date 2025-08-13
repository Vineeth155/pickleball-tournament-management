"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Team, Match, Category } from "@/lib/types";
import { Users, Trophy, Target, ChevronDown, ChevronUp, ArrowUp } from "lucide-react";
import { MatchCard } from "@/components/match-card";
import { MatchWinnerIndicator } from "@/components/match-winner-indicator";

interface PoolBracketDisplayProps {
  category: Category;
  teams: Team[];
  matches: Match[];
  onUpdateMatch: (matchId: string, updatedMatch: Partial<Match>) => void;
  currentUser: string | null;
  tournamentId: string;
  onTeamQualification: (teamIds: string[]) => void;
  qualifiedTeams: Set<string>;
}

interface Pool {
  id: number;
  teams: Team[];
  matches: Match[];
}

export default function PoolBracketDisplay({ 
  category, 
  teams, 
  matches, 
  onUpdateMatch, 
  currentUser,
  tournamentId,
  onTeamQualification,
  qualifiedTeams
}: PoolBracketDisplayProps) {
  const [selectedPool, setSelectedPool] = useState<number | null>(null);
  const [selectedTeamsForAdvancement, setSelectedTeamsForAdvancement] = useState<Set<string>>(new Set());
  
  // Group teams by pool
  const pools: Pool[] = [];
  const poolMatches = matches.filter(m => m.poolId !== undefined && m.poolId < 100);
  
  // Find the maximum pool ID
  const maxPoolId = Math.max(...teams.map(t => t.poolId || 0), 0);
  
  for (let i = 0; i <= maxPoolId; i++) {
    const poolTeams = teams.filter(t => t.poolId === i);
    const poolMatches = matches.filter(m => m.poolId === i);
    
    if (poolTeams.length > 0) {
      pools.push({
        id: i,
        teams: poolTeams,
        matches: poolMatches
      });
    }
  }
  
  // Set the first pool as selected by default when component mounts
  useEffect(() => {
    if (pools.length > 0 && selectedPool === null) {
      setSelectedPool(0); // Select the first pool (index 0)
    }
  }, [pools.length, selectedPool]);

  const getTeam = (id: string | null) => {
    if (!id) return null;
    return teams.find((team) => team.id === id) || null;
  };



  const advanceTeamsToKnockout = () => {
    if (selectedTeamsForAdvancement.size === 0) return;
    
    // Mark selected teams as qualified for knockout rounds
    const teamIds = Array.from(selectedTeamsForAdvancement);
    onTeamQualification(teamIds);
    
    // Clear selection after advancement
    setSelectedTeamsForAdvancement(new Set());
  };

  const getPoolStandings = (pool: Pool) => {
    const standings = pool.teams.map(team => {
      const teamMatches = pool.matches.filter(m => 
        m.team1Id === team.id || m.team2Id === team.id
      );
      
      let wins = 0;
      let losses = 0;
      let gamesWon = 0;
      let gamesLost = 0;
      
      teamMatches.forEach(match => {
        if (match.completed && match.winnerId) {
          if (match.winnerId === team.id) {
            wins++;
          } else if (match.winnerId !== "tied") {
            losses++;
          }
        }
        
        // Calculate games won/lost
        if (match.team1Games && match.team2Games) {
          if (match.team1Id === team.id) {
            gamesWon += match.team1Games.reduce((sum, score) => sum + score, 0);
            gamesLost += match.team2Games.reduce((sum, score) => sum + score, 0);
          } else {
            gamesWon += match.team2Games.reduce((sum, score) => sum + score, 0);
            gamesLost += match.team1Games.reduce((sum, score) => sum + score, 0);
          }
        }
      });
      
      return {
        team,
        wins,
        losses,
        gamesWon,
        gamesLost,
        winPercentage: wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0
      };
    });
    
    // Sort by wins, then by win percentage, then by games won
    return standings.sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.winPercentage !== b.winPercentage) return b.winPercentage - a.winPercentage;
      return b.gamesWon - a.gamesWon;
    });
  };



  if (pools.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Pools Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This category doesn't have any pools configured yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pools Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {pools.map((pool) => (
          <Card 
            key={pool.id} 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedPool === pool.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
            }`}
            onClick={() => setSelectedPool(selectedPool === pool.id ? null : pool.id)}
          >
            <CardHeader className="">
              <CardTitle className="text-lg flex items-center justify-between">
                Pool {String.fromCharCode(65 + pool.id)}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Selected Pool Details */}
      {selectedPool !== null && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Trophy className="h-5 w-5" />
              Pool {String.fromCharCode(65 + selectedPool)} Details
              <Badge variant="outline">{pools[selectedPool].teams.length} Teams</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Pool Standings */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Pool Standings
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Select</th>
                      <th className="text-left p-2">Position</th>
                      <th className="text-left p-2">Team</th>
                      <th className="text-center p-2">W</th>
                      <th className="text-center p-2">L</th>
                      <th className="text-center p-2">Win %</th>
                      <th className="text-center p-2">Games</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPoolStandings(pools[selectedPool]).map((standing, index) => (
                      <tr key={standing.team.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <Checkbox
                            checked={selectedTeamsForAdvancement.has(standing.team.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedTeamsForAdvancement);
                              if (checked) {
                                newSelected.add(standing.team.id);
                              } else {
                                newSelected.delete(standing.team.id);
                              }
                              setSelectedTeamsForAdvancement(newSelected);
                            }}
                          />
                        </td>
                        <td className="p-2">
                          <Badge variant={index < 2 ? "default" : "secondary"}>
                            {index + 1}
                          </Badge>
                        </td>
                        <td className="p-2 font-medium">
                          {standing.team.name}
                        </td>
                        <td className="p-2 text-center">{standing.wins}</td>
                        <td className="p-2 text-center">{standing.losses}</td>
                        <td className="p-2 text-center">{standing.winPercentage.toFixed(1)}%</td>
                        <td className="p-2 text-center text-muted-foreground">
                          {standing.gamesWon}-{standing.gamesLost}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Team Advancement Section */}
              {currentUser && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-sm">Advance Teams to Knockout</h5>
                    <Badge variant="outline">
                      {selectedTeamsForAdvancement.size} teams selected
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={advanceTeamsToKnockout}
                      disabled={selectedTeamsForAdvancement.size === 0}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Advance Selected Teams
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTeamsForAdvancement(new Set())}
                      disabled={selectedTeamsForAdvancement.size === 0}
                    >
                      Clear Selection
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Select teams from the standings above and click "Advance" to mark them as qualified. Qualified teams will appear in the Knockout Bracket tab.
                  </p>
                </div>
              )}
              

            </div>

            {/* Pool Matches */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Pool Matches
              </h4>
              <div className="space-y-3">
                {pools[selectedPool].matches
                  .sort((a, b) => a.round - b.round)
                  .map((match) => {
                    const team1 = getTeam(match.team1Id);
                    const team2 = getTeam(match.team2Id);
                    const ready = (match.team1Id && match.team2Id) || match.isBye;
                    const completed = !!match.winnerId || !!match.completed;

                    return (
                      <div key={match.id} className="border rounded-lg p-3 bg-white">
                        {/* Match Header */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-muted-foreground">
                            Round {match.round + 1} • Match {match.position + 1}
                          </span>
                          <Badge variant={completed ? "default" : "secondary"}>
                            {completed ? "Completed" : "Pending"}
                          </Badge>
                        </div>
                        
                        {/* Match Content - Horizontal Layout */}
                        <div className="flex items-center gap-4">
                          {/* Team 1 */}
                          <div className="flex-1 text-center">
                            <div className="font-medium text-sm mb-1">{team1?.name || 'TBD'}</div>
                            {match.team1Score !== undefined && (
                              <div className="text-2xl font-bold text-blue-600">
                                {match.team1Score}
                              </div>
                            )}
                            {match.team1Games && match.team1Games.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Games: {match.team1Games.join('-')}
                              </div>
                            )}
                          </div>

                          {/* VS Separator */}
                          <div className="text-muted-foreground font-medium">VS</div>

                          {/* Team 2 */}
                          <div className="flex-1 text-center">
                            <div className="font-medium text-sm mb-1">{team2?.name || 'TBD'}</div>
                            {match.team2Score !== undefined && (
                              <div className="text-2xl font-bold text-red-600">
                                {match.team2Score}
                              </div>
                            )}
                            {match.team2Games && match.team2Games.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Games: {match.team2Games.join('-')}
                              </div>
                            )}
                          </div>

                          {/* Score Entry Section */}
                          {currentUser && (
                            <div className="flex-shrink-0 border-l pl-4">
                              {!completed ? (
                                <>
                                  <div className="text-sm font-medium mb-2">Enter Score</div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      placeholder="Team 1"
                                      className="w-16 px-2 py-1 text-sm border rounded"
                                      min="0"
                                      value={match.team1Score || ''}
                                      onChange={(e) => {
                                        const score = parseInt(e.target.value) || 0;
                                        onUpdateMatch(match.id, { team1Score: score });
                                      }}
                                    />
                                    <span className="text-muted-foreground">-</span>
                                    <input
                                      type="number"
                                      placeholder="Team 2"
                                      className="w-16 px-2 py-1 text-sm border rounded"
                                      min="0"
                                      value={match.team2Score || ''}
                                      onChange={(e) => {
                                        const score = parseInt(e.target.value) || 0;
                                        onUpdateMatch(match.id, { team2Score: score });
                                      }}
                                    />
                                    <button
                                      onClick={() => {
                                        if (match.team1Score !== undefined && match.team2Score !== undefined) {
                                          const winnerId = match.team1Score > match.team2Score ? match.team1Id : match.team2Id;
                                          onUpdateMatch(match.id, { 
                                            winnerId: winnerId,
                                            completed: true 
                                          });
                                        }
                                      }}
                                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                      disabled={match.team1Score === undefined || match.team2Score === undefined}
                                    >
                                      Submit
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="text-sm font-medium mb-2 text-green-600">Edit Score</div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      placeholder="Team 1"
                                      className="w-16 px-2 py-1 text-sm border rounded"
                                      min="0"
                                      value={match.team1Score || ''}
                                      onChange={(e) => {
                                        const score = parseInt(e.target.value) || 0;
                                        onUpdateMatch(match.id, { team1Score: score });
                                      }}
                                    />
                                    <span className="text-muted-foreground">-</span>
                                    <input
                                      type="number"
                                      placeholder="Team 2"
                                      className="w-16 px-2 py-1 text-sm border rounded"
                                      min="0"
                                      value={match.team2Score || ''}
                                      onChange={(e) => {
                                        const score = parseInt(e.target.value) || 0;
                                        onUpdateMatch(match.id, { team2Score: score });
                                      }}
                                    />
                                    <button
                                      onClick={() => {
                                        if (match.team1Score !== undefined && match.team2Score !== undefined) {
                                          const winnerId = match.team1Score > match.team2Score ? match.team1Id : match.team2Id;
                                          onUpdateMatch(match.id, { 
                                            winnerId: winnerId,
                                            completed: true 
                                          });
                                        }
                                      }}
                                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                    >
                                      Update
                                    </button>
                                  </div>
                                  {match.winnerId && (
                                    <div className="mt-2 text-xs text-green-600">
                                      Winner: {match.winnerId === match.team1Id ? team1?.name : team2?.name}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
