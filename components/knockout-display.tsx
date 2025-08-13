"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Team, Match, Category } from "@/lib/types";
import { Trophy, Target, Users } from "lucide-react";

interface KnockoutDisplayProps {
  category: Category;
  teams: Team[];
  matches: Match[];
}

export default function KnockoutDisplay({ category, teams, matches }: KnockoutDisplayProps) {
  // Filter knockout matches (rounds 100+)
  const knockoutMatches = matches.filter(m => m.isKnockout && m.round >= 100);
  
  if (knockoutMatches.length === 0) {
    return null;
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

  const getRoundName = (round: number) => {
    const roundNumber = round - 100;
    switch (roundNumber) {
      case 0: return "Quarter Finals";
      case 1: return "Semi Finals";
      case 2: return "Finals";
      default: return `Round ${roundNumber + 1}`;
    }
  };

  // Group matches by round
  const matchesByRound = knockoutMatches.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  const sortedRounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Knockout Stage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {sortedRounds.map((round) => (
            <div key={round}>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                {getRoundName(round)}
              </h4>
              <div className="grid gap-3">
                {matchesByRound[round]
                  .sort((a, b) => a.position - b.position)
                  .map((match) => (
                    <div key={match.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Match {match.position + 1}</span>
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
