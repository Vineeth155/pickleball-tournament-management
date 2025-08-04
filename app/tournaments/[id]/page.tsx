"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStoredUser, loadTournamentsFromLocalStorage } from "@/lib/auth";
import {
  getTournamentByIdFromDB,
  getTournamentsFromDB,
  updateTournamentInDB,
} from "@/lib/tournament-store";
import { type User, type Tournament, TournamentFormat } from "@/lib/types";
import {
  ArrowLeft,
  Calendar,
  Users,
  MapPin,
  Edit,
  ChevronRight,
  Play,
  AlertCircle,
} from "lucide-react";
import TeamRegistrationForm from "@/components/team-registration-form";
import { generateBracket } from "@/lib/bracket-utils";
import Image from "next/image";

export default function TournamentDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [startingTournament, setStartingTournament] = useState(false);

  // Load user and tournament from localStorage on initial render
  useEffect(() => {
    const fetchTournament = async () => {
      const user = getStoredUser();
      if (user) {
        setCurrentUser(user);
      }

      // Load tournaments from localStorage
      loadTournamentsFromLocalStorage();

      // Find tournament by slug
      const slug = params?.id as string;
      if (slug) {
        // const allTournaments = await getTournamentsFromDB();
        const foundTournament = await getTournamentByIdFromDB(slug);
        console.log(foundTournament);

        if (foundTournament) {
          setTournament(foundTournament);
        } else {
          // Tournament not found, redirect to tournaments list
          router.push("/tournaments");
        }
      }
    };

    fetchTournament();
  }, [params, router]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getFormatLabel = (format: TournamentFormat) => {
    switch (format) {
      case TournamentFormat.SINGLE_ELIMINATION:
        return "Single Elimination";
      case TournamentFormat.DOUBLE_ELIMINATION:
        return "Double Elimination";
      case TournamentFormat.ROUND_ROBIN:
        return "Round Robin";
      case TournamentFormat.POOL_PLAY:
        return "Pool Play";
      default:
        return "Unknown Format";
    }
  };

  const getFormatColor = (format: TournamentFormat) => {
    switch (format) {
      case TournamentFormat.SINGLE_ELIMINATION:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case TournamentFormat.DOUBLE_ELIMINATION:
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case TournamentFormat.ROUND_ROBIN:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case TournamentFormat.POOL_PLAY:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  // Helper function to create a URL-friendly slug
  const createSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  // Start the tournament - generate bracket with current teams
  const handleStartTournament = async () => {
    if (!tournament || !currentUser === tournament?.createdBy) return;

    setStartingTournament(true);

    try {
      // Generate a new bracket with the current teams
      const updatedTournament = generateBracket(
        tournament.teams,
        tournament.name,
        tournament.format,
        tournament.description,
        tournament.createdBy,
        {
          enablePoolPlay: true,
          earlyRoundGames: tournament.earlyRoundGames || 1,
          quarterFinalGames: tournament.quarterFinalGames || 3,
          semiFinalGames: tournament.semiFinalGames || 3,
          finalGames: tournament.finalGames || 3,
        }
      );

      // Preserve other tournament properties
      const finalTournament = {
        ...updatedTournament,
        id: tournament.id,
        createdAt: tournament.createdAt,
        location: tournament.location,
        startDate: tournament.startDate,
        division: tournament.division,
        pointsToWin: tournament.pointsToWin,
        winBy: tournament.winBy,
        matchType: tournament.matchType,
        slug: tournament.slug,
        isStarted: true, // Mark as started
      };

      // Update the tournament
      await updateTournamentInDB(finalTournament);
      setTournament(finalTournament);

      // Show success message
      alert(
        "Tournament has been started! The bracket has been generated with the current teams."
      );

      // Redirect to bracket page
      router.push(`/${params?.id}/bracket`);
    } catch (error) {
      console.error("Error starting tournament:", error);
      alert("There was an error starting the tournament. Please try again.");
    } finally {
      setStartingTournament(false);
    }
  };

  if (!tournament) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p>Loading tournament details...</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => router.push("/tournaments")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Tournaments
      </Button>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{tournament.name}</h1>
              <Badge className={getFormatColor(tournament.format)}>
                {getFormatLabel(tournament.format)}
              </Badge>

              {tournament.isStarted && (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-300"
                >
                  Tournament Started
                </Badge>
              )}
            </div>

            {tournament.description && (
              <p className="text-muted-foreground mb-4">
                {tournament.description}
              </p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
              <div className="flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                Created on {formatDate(tournament.createdAt)}
              </div>
              <div className="flex items-center">
                <Users className="mr-1 h-4 w-4" />
                {tournament.teams.length} Teams
              </div>
              {tournament.location && (
                <div className="flex items-center">
                  <MapPin className="mr-1 h-4 w-4" />
                  {tournament.location}
                </div>
              )}
            </div>

            <div className="relative h-64 w-full mb-6 bg-gray-100 rounded-lg overflow-hidden">
              <Image
                src="/placeholder.svg?height=400&width=800"
                alt={tournament.name}
                fill
                className="object-cover"
              />
            </div>

            <div className="prose max-w-none">
              <h2>About This Tournament</h2>
              <p>
                {tournament.description ||
                  `This is a ${getFormatLabel(tournament.format)} tournament. 
                  ${
                    tournament.format === TournamentFormat.POOL_PLAY
                      ? "Teams will be divided into pools for round-robin play, followed by a knockout stage for top teams."
                      : tournament.format === TournamentFormat.ROUND_ROBIN
                      ? "Each team will play against every other team in the tournament."
                      : tournament.format ===
                        TournamentFormat.DOUBLE_ELIMINATION
                      ? "Teams will have a second chance after their first loss."
                      : "Teams will be eliminated after a single loss."
                  }`}
              </p>

              {tournament.division && (
                <>
                  <h3>Division</h3>
                  <p>{tournament.division}</p>
                </>
              )}

              <h3>Tournament Details</h3>
              <ul>
                <li>
                  <strong>Format:</strong> {getFormatLabel(tournament.format)}
                </li>
                <li>
                  <strong>Match Type:</strong>{" "}
                  {tournament.matchType || "Standard"}
                </li>
                {tournament.pointsToWin && (
                  <li>
                    <strong>Points to Win:</strong> {tournament.pointsToWin}
                  </li>
                )}
                {tournament.bestOf && tournament.bestOf > 1 && (
                  <li>
                    <strong>Match Format:</strong> Best of {tournament.bestOf}
                  </li>
                )}
                <li>
                  <strong>Teams:</strong> {tournament.teams.length}
                </li>
                {tournament.startDate && (
                  <li>
                    <strong>Start Date:</strong> {tournament.startDate}
                  </li>
                )}
                {tournament.location && (
                  <li>
                    <strong>Location:</strong> {tournament.location}
                  </li>
                )}
              </ul>
            </div>

            <div className="mt-8 flex gap-4">
              {tournament.isStarted ? (
                <Button
                  onClick={() =>
                    router.push(`/tournaments/${params?.id}/bracket`)
                  }
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  View Bracket
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : currentUser === tournament?.createdBy ? (
                <Button
                  onClick={handleStartTournament}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={startingTournament || tournament.teams.length < 2}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {startingTournament
                    ? "Starting Tournament..."
                    : "Start Tournament"}
                </Button>
              ) : (
                <div className="flex items-center text-amber-600 dark:text-amber-400">
                  <AlertCircle className="mr-2 h-5 w-5" />
                  <p>Tournament has not been started yet</p>
                </div>
              )}

              {currentUser === tournament?.createdBy && (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/tournaments/${params?.id}/edit`)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Tournament
                </Button>
              )}
            </div>
          </div>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Tournament Registration</CardTitle>
              <CardDescription>
                Register your team to participate in this tournament
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tournament.isStarted ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                  <p className="text-amber-800 dark:text-amber-200">
                    Registration is closed. The tournament has already started.
                  </p>
                </div>
              ) : showRegistrationForm ? (
                <TeamRegistrationForm
                  tournament={tournament}
                  onCancel={() => setShowRegistrationForm(false)}
                  onSubmit={(team) => {
                    // Add team to tournament
                    const updatedTeams = [...tournament.teams, team];
                    const updatedTournament = {
                      ...tournament,
                      teams: updatedTeams,
                    };
                    updateTournamentInDB(updatedTournament);
                    setTournament(updatedTournament);
                    setShowRegistrationForm(false);
                  }}
                />
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Join this tournament by registering your team. Fill out the
                    registration form with your team details.
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => setShowRegistrationForm(true)}
                  >
                    Register Team
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Registered Teams</CardTitle>
              <CardDescription>
                {tournament.teams.length} teams have registered
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tournament.teams.length > 0 ? (
                <ul className="space-y-2">
                  {tournament.teams.map((team) => (
                    <li key={team.id} className="p-2 border rounded-md">
                      <div className="font-medium">{team.name}</div>
                      {team.players && team.players.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {team.players.join(" / ")}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No teams have registered yet. Be the first to join!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
