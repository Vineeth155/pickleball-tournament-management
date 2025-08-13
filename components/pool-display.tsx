"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Team, Match, Category } from "@/lib/types";
import { Users, Trophy, Target } from "lucide-react";

interface PoolDisplayProps {
  category: Category;
  teams: Team[];
  matches: Match[];
}

interface Pool {
  id: number;
  teams: Team[];
  matches: Match[];
}

export default function PoolDisplay({ category, teams, matches }: PoolDisplayProps) {
  const [selectedPool, setSelectedPool] = useState<number | null>(null);

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

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return "TBD";
    const team = teams.find(t => t.id === teamId);
    return team?.name || "Unknown Team";
  };

  const getMatchStatus = (match: Match) => {
    if (match.completed) {
      if (match.winnerId === "tied") return "Tied";
      return "Completed";
    }
    if (match.team1Id && match.team2Id) return "Scheduled";
    return "Pending";
  };

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "bg-green-100 text-green-800";
      case "Scheduled": return "bg-blue-100 text-blue-800";
      case "Tied": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
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
      {/* Pool Selection */}
      <div className="flex flex-wrap gap-2">
        {pools.map((pool) => (
          <Button
            key={pool.id}
            variant={selectedPool === pool.id ? "default" : "outline"}
            onClick={() => setSelectedPool(selectedPool === pool.id ? null : pool.id)}
            className="min-w-[120px]"
          >
            Pool {String.fromCharCode(65 + pool.id)} {/* A, B, C, D */}
            <Badge variant="secondary" className="ml-2">
              {pool.teams.length}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Selected Pool Details */}
      {selectedPool !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pool {String.fromCharCode(65 + selectedPool)}
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
                          <Badge variant={index < 2 ? "default" : "secondary"}>
                            {index + 1}
                          </Badge>
                        </td>
                        <td className="p-2 font-medium">{standing.team.name}</td>
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
            </div>

            {/* Pool Matches */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Pool Matches
              </h4>
              <div className="grid gap-3">
                {pools[selectedPool].matches
                  .sort((a, b) => a.round - b.round)
                  .map((match) => (
                    <div key={match.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Round {match.round + 1}</span>
                        <Badge className={getMatchStatusColor(getMatchStatus(match))}>
                          {getMatchStatus(match)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="font-medium">{getTeamName(match.team1Id)}</div>
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
                        
                        <div className="text-center">
                          <div className="font-medium">{getTeamName(match.team2Id)}</div>
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
                      </div>
                      
                      {match.winnerId && match.winnerId !== "tied" && (
                        <div className="mt-2 text-center">
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Winner: {getTeamName(match.winnerId)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pool Overview (when no pool is selected) */}
      {selectedPool === null && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pools.map((pool) => (
            <Card key={pool.id} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedPool(pool.id)}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  Pool {String.fromCharCode(65 + pool.id)}
                  <Badge variant="outline">{pool.teams.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{pool.teams.length} teams</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="h-4 w-4" />
                    <span>{pool.matches.length} matches</span>
                  </div>
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground">Click to view details</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
