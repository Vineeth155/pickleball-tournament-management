"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Trophy, ArrowLeft, ExternalLink, Copy, Share2 } from "lucide-react";
import Link from "next/link";
import type { Tournament, Match, Team } from "@/lib/types";


export default function MatchDetailPage() {
  const params = useParams();
  const tournamentId = params.id as string;
  const matchId = params.matchId as string;
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [team1, setTeam1] = useState<Team | null>(null);
  const [team2, setTeam2] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [nextUpdateIn, setNextUpdateIn] = useState(5);

  // Fetch tournament and match data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/tournaments/${tournamentId}/match/${matchId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("Match not found");
          } else {
            setError("Failed to load match data");
          }
          return;
        }

        const data = await response.json();
        setTournament(data.tournament);
        setMatch(data.match);
        setTeam1(data.team1);
        setTeam2(data.team2);
        setLastUpdated(new Date());
        
      } catch (err) {
        console.error("Error fetching match data:", err);
        setError("Failed to load match data");
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId && matchId) {
      fetchData();
    }
  }, [tournamentId, matchId]);

  // Set up real-time updates (polling every 5 seconds)
  useEffect(() => {
    if (!tournamentId || !matchId) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/tournaments/${tournamentId}/match/${matchId}`);
        if (response.ok) {
          const data = await response.json();
          setTournament(data.tournament);
          setMatch(data.match);
          setTeam1(data.team1);
          setTeam2(data.team2);
          setLastUpdated(new Date());
        }
      } catch (err) {
        console.error("Error updating match data:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [tournamentId, matchId]);

  // Countdown timer for next update
  useEffect(() => {
    if (!tournamentId || !matchId) return;

    const countdownInterval = setInterval(() => {
      setNextUpdateIn((prev) => {
        if (prev <= 1) {
          return 5; // Reset to 5 seconds
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [tournamentId, matchId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
            <p className="text-lg">Loading match...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tournament || !match) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            {error || "Match not found"}
          </h1>
          <Link href={`/tournaments/${tournamentId}`}>
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Tournament
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Format the score display
  const formatScore = (team1Score?: number, team2Score?: number) => {
    if (team1Score === undefined || team2Score === undefined) {
      return "vs";
    }
    return `${team1Score} - ${team2Score}`;
  };

  // Format the game scores for display
  const formatGameScores = () => {
    if (!match.team1Games || !match.team2Games) return null;

    return match.team1Games
      .map((score, index) => {
        if (score === 0 && match.team2Games![index] === 0) return null;
        return `${score}-${match.team2Games![index]}`;
      })
      .filter(Boolean)
      .join(", ");
  };

  // Get round name
  const getRoundName = (round: number) => {
    if (round >= 100) {
      return `Knockout Round ${round - 99}`;
    }
    return `Round ${round + 1}`;
  };

  // Copy match link to clipboard
  const copyMatchLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  // Share match link using Web Share API
  const shareMatchLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${tournament?.name} - Match ${match?.position + 1}`,
          text: `Follow this match live: ${tournament?.name}`,
          url: window.location.href,
        });
      } catch (err) {
        console.error("Failed to share:", err);
      }
    } else {
      // Fallback to copy if Web Share API is not available
      copyMatchLink();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Link href={`/tournaments/${tournamentId}`}>
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Tournament
            </Button>
          </Link>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">LIVE</span>
            </div>
            <h1 className="text-2xl font-bold">{tournament.name}</h1>
            <p className="text-muted-foreground">{getRoundName(match.round)} - Match {match.position + 1}</p>
          </div>
        </div>
        
        {/* Tournament Info */}
        <div className="flex flex-wrap gap-4 mb-6">
          {tournament.location && (
            <Badge variant="outline" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {tournament.location}
            </Badge>
          )}
          {tournament.startDate && (
            <Badge variant="outline">
              {new Date(tournament.startDate).toLocaleDateString()}
            </Badge>
          )}
          {tournament.division && (
            <Badge variant="outline">{tournament.division}</Badge>
          )}
        </div>
      </div>

      {/* Match Card */}
      <Card className={`mb-8 ${match.winnerId ? "border-green-500 dark:border-green-700" : ""}`}>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">Match Details</CardTitle>
              <p className="text-muted-foreground">
                {getRoundName(match.round)} • Position {match.position + 1}
              </p>
            </div>
            <div className="flex gap-2">
              {match.court && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {match.court}
                </Badge>
              )}
              {match.scheduledTime && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {match.scheduledTime}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Teams and Score */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Team 1 */}
            <div className={`text-center md:text-right ${match.winnerId === match.team1Id ? "font-bold" : ""}`}>
              {team1 ? (
                <div>
                  <div className="text-lg font-semibold">{team1.name}</div>
                  {team1.players && team1.players.length > 0 && (
                    <div className="text-sm text-muted-foreground">{team1.players.join(" / ")}</div>
                  )}
                  {team1.skillLevel && (
                    <div className="text-xs text-muted-foreground">Skill: {team1.skillLevel}</div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground">TBD</div>
              )}
            </div>

            {/* Score */}
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">
                {formatScore(match.team1Score, match.team2Score)}
              </div>
              {formatGameScores() && (
                <div className="text-sm text-muted-foreground mb-2">
                  Games: {formatGameScores()}
                </div>
              )}
              {match.bestOf && match.bestOf > 1 && (
                <div className="text-xs text-muted-foreground">
                  Best of {match.bestOf}
                </div>
              )}
              {!match.winnerId && match.team1Id && match.team2Id && (
                <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                  Match in progress
                </div>
              )}
            </div>

            {/* Team 2 */}
            <div className={`text-center md:text-left ${match.winnerId === match.team2Id ? "font-bold" : ""}`}>
              {team2 ? (
                <div>
                  <div className="text-lg font-semibold">{team2.name}</div>
                  {team2.players && team2.players.length > 0 && (
                    <div className="text-sm text-muted-foreground">{team2.players.join(" / ")}</div>
                  )}
                  {team2.skillLevel && (
                    <div className="text-xs text-muted-foreground">Skill: {team2.skillLevel}</div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground">TBD</div>
              )}
            </div>
          </div>

          {/* Winner Display */}
          {match.winnerId && (
            <div className="text-center py-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                <Trophy className="h-6 w-6" />
                <span className="text-lg font-semibold">
                  Winner: {match.winnerId === match.team1Id ? team1?.name : team2?.name}
                </span>
              </div>
            </div>
          )}

          {/* Match Status */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted">
              <div className={`w-2 h-2 rounded-full ${match.winnerId ? "bg-green-500" : match.team1Id && match.team2Id ? "bg-yellow-500" : "bg-gray-400"}`}></div>
              <span className="text-sm font-medium">
                {match.winnerId ? "Completed" : match.team1Id && match.team2Id ? "In Progress" : "Scheduled"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Match Link Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Match Link</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Share this unique link with others to let them follow this match live:
          </p>
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm font-mono break-all flex-1 mr-2">
                {typeof window !== "undefined" ? window.location.href : ""}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={shareMatchLink}
                  className="flex items-center gap-1"
                >
                  <Share2 className="h-3 w-3" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyMatchLink}
                  className="flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" />
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Updates Info */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Live Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This page automatically updates every 5 seconds to show the latest match results.
          </p>
          <div className="mt-2 text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Next update in: {nextUpdateIn} seconds
          </div>
        </CardContent>
      </Card>

      {/* Tournament Bracket Link */}
      <div className="text-center">
        <Link href={`/tournaments/${tournamentId}/bracket`}>
          <Button variant="outline" className="flex items-center gap-2 mx-auto">
            <ExternalLink className="h-4 w-4" />
            View Full Tournament Bracket
          </Button>
        </Link>
      </div>
    </div>
  );
}
