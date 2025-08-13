"use client";

import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Team, Match, Category } from "@/lib/types";
import { Trophy, Target } from "lucide-react";
import { MatchCard } from "@/components/match-card";
import { MatchWinnerIndicator } from "@/components/match-winner-indicator";
import { BracketLines } from "@/components/bracket-lines";

interface KnockoutBracketDisplayProps {
  category: Category;
  teams: Team[];
  matches: Match[];
  onUpdateMatch: (matchId: string, updatedMatch: Partial<Match>) => void;
  currentUser: string | null;
  tournamentId: string;
  qualifiedTeams?: Set<string>;
}

export default function KnockoutBracketDisplay({ 
  category, 
  teams, 
  matches, 
  onUpdateMatch, 
  currentUser,
  tournamentId,
  qualifiedTeams = new Set()
}: KnockoutBracketDisplayProps) {
  const bracketContainerRef = useRef<HTMLDivElement>(null);

  // Filter knockout matches (rounds 100+)
  const knockoutMatches = matches.filter(m => m.isKnockout && m.round >= 100);
  
  if (knockoutMatches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Knockout Matches</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Knockout stage matches haven't been generated yet or there are no matches to display.</p>
        </CardContent>
      </Card>
    );
  }

  const getTeam = (id: string | null) => {
    if (!id) return null;
    return teams.find((team) => team.id === id) || null;
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

  // Sort matches within each round
  Object.keys(matchesByRound).forEach((roundKey) => {
    const round = Number.parseInt(roundKey);
    matchesByRound[round] = matchesByRound[round].sort((a, b) => a.position - b.position);
  });

  return (
    <div className="space-y-6">
      {/* Qualified Teams Display */}
      {qualifiedTeams.size > 0 ? (
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Target className="h-5 w-5" />
              Qualified Teams ({qualifiedTeams.size})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from(qualifiedTeams).map(teamId => {
                const team = teams.find(t => t.id === teamId);
                return team ? (
                  <div key={teamId} className="flex items-center gap-2 p-3 bg-white border border-green-300 rounded-lg shadow-sm">
                    <Badge variant="default" className="bg-green-600 text-white text-xs">
                      Qualified
                    </Badge>
                    <span className="text-sm font-medium text-gray-800">{team.name}</span>
                  </div>
                ) : null;
              })}
            </div>
            <p className="text-sm text-green-700 mt-3 font-medium">
              These teams have qualified from pool play and are ready for knockout rounds. 
              No matches have been scheduled yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-gray-200 bg-gray-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-600">
              <Target className="h-5 w-5" />
              No Teams Qualified Yet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Teams need to be qualified from pool play before they can appear in knockout rounds. 
              Go to the Pool Matches tab to advance teams from pools.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Knockout Stage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto relative" ref={bracketContainerRef}>
            <div className="flex space-x-6 min-w-max pb-6">
              {sortedRounds.map((round) => {
                const roundMatches = matchesByRound[round] || [];

                return (
                  <div key={round} className="flex-shrink-0 w-72">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold">
                        {getRoundName(round)}
                      </h3>
                      <Badge variant="outline">{roundMatches.length} matches</Badge>
                    </div>
                    <div className="space-y-4">
                      {roundMatches.map((match) => {
                        const team1 = getTeam(match.team1Id);
                        const team2 = getTeam(match.team2Id);
                        const ready = (match.team1Id && match.team2Id) || match.isBye;
                        const completed = !!match.winnerId || !!match.completed;

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
                              onUpdateMatch={onUpdateMatch}
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
              })}
            </div>
            <BracketLines
              matchesByRound={matchesByRound}
              totalRounds={Math.max(...Object.keys(matchesByRound).map(Number), 0)}
              format="single_elimination"
              containerRef={bracketContainerRef}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
