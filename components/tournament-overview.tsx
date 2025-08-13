"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Team, Match, Category, Tournament } from "@/lib/types";
import { Users, Trophy, Target, ArrowRight } from "lucide-react";
import { useState } from "react";

interface TournamentOverviewProps {
  tournament: Tournament;
}

interface PoolSummary {
  id: number;
  teams: Team[];
  matches: Match[];
  completedMatches: number;
  totalMatches: number;
  topTeams: Team[];
}

export default function TournamentOverview({ tournament }: TournamentOverviewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const getPoolSummary = (category: Category): PoolSummary[] => {
    if (!category.matches || !category.teams) return [];

    const pools: PoolSummary[] = [];
    const poolMatches = category.matches.filter(m => m.poolId !== undefined && m.poolId < 100);
    
    // Find the maximum pool ID
    const maxPoolId = Math.max(...category.teams.map(t => t.poolId || 0), 0);
    
    for (let i = 0; i <= maxPoolId; i++) {
      const poolTeams = category.teams.filter(t => t.poolId === i);
      const poolMatches = category.matches.filter(m => m.poolId === i);
      
      if (poolTeams.length > 0) {
        const completedMatches = poolMatches.filter(m => m.completed).length;
        const totalMatches = poolMatches.length;
        
        // Get top 2 teams based on wins
        const topTeams = getTopTeams(poolTeams, poolMatches).slice(0, 2);
        
        pools.push({
          id: i,
          teams: poolTeams,
          matches: poolMatches,
          completedMatches,
          totalMatches,
          topTeams
        });
      }
    }
    
    return pools;
  };

  const getTopTeams = (teams: Team[], matches: Match[]) => {
    const standings = teams.map(team => {
      const teamMatches = matches.filter(m => 
        m.team1Id === team.id || m.team2Id === team.id
      );
      
      let wins = 0;
      let losses = 0;
      
      teamMatches.forEach(match => {
        if (match.completed && match.winnerId) {
          if (match.winnerId === team.id) {
            wins++;
          } else if (match.winnerId !== "tied") {
            losses++;
          }
        }
      });
      
      return {
        team,
        wins,
        losses,
        winPercentage: wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0
      };
    });
    
    return standings.sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      return b.winPercentage - a.winPercentage;
    });
  };

  const getCategoryProgress = (category: Category) => {
    if (!category.matches) return { completed: 0, total: 0, percentage: 0 };
    
    const completed = category.matches.filter(m => m.completed).length;
    const total = category.matches.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    return { completed, total, percentage };
  };

  if (!tournament.isStarted) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Tournament Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {tournament.categories.map((category) => {
            const pools = getPoolSummary(category);
            const progress = getCategoryProgress(category);
            
            if (pools.length === 0) return null;
            
            return (
              <div key={category.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {category.gender} {category.division}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>{pools.length} Pools</span>
                      <span>{category.teams?.length || 0} Teams</span>
                      <span>{progress.completed}/{progress.total} Matches Complete</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {progress.percentage.toFixed(0)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Complete</div>
                  </div>
                </div>

                {/* Pool Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pools.map((pool) => (
                    <div key={pool.id} className="border rounded-lg p-3 bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Pool {String.fromCharCode(65 + pool.id)}</h4>
                        <Badge variant="outline">{pool.teams.length}</Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{pool.completedMatches}/{pool.totalMatches} matches</span>
                        </div>
                        
                        {pool.topTeams.length > 0 && (
                          <div className="pt-2 border-t">
                            <div className="text-xs text-muted-foreground mb-1">Top Teams:</div>
                            {pool.topTeams.map((team, index) => (
                              <div key={team.id} className="flex items-center gap-2">
                                <Badge variant={index === 0 ? "default" : "secondary"} className="text-xs">
                                  {index + 1}
                                </Badge>
                                <span className="text-xs font-medium">{team.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Category Actions */}
                <div className="mt-4 pt-4 border-t flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                  >
                    {selectedCategory === category.id ? "Hide Details" : "View Details"}
                    <ArrowRight className={`ml-2 h-3 w-3 transition-transform ${
                      selectedCategory === category.id ? "rotate-90" : ""
                    }`} />
                  </Button>
                </div>

                {/* Detailed Category View */}
                {selectedCategory === category.id && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="space-y-4">
                      {pools.map((pool) => (
                        <div key={pool.id} className="border rounded-lg p-3">
                          <h5 className="font-medium mb-2">Pool {String.fromCharCode(65 + pool.id)} Standings</h5>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-2">Pos</th>
                                  <th className="text-left p-2">Team</th>
                                  <th className="text-center p-2">W</th>
                                  <th className="text-center p-2">L</th>
                                  <th className="text-center p-2">Win %</th>
                                </tr>
                              </thead>
                              <tbody>
                                {getTopTeams(pool.teams, pool.matches).map((standing, index) => (
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
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
