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
import { getStoredUser } from "@/lib/auth";
import { initializeTournaments } from "@/lib/tournament-store";
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
  Trophy,
  Target,
  Clock,
} from "lucide-react";
import { generateBracket, generateBracketsForTournament, validateGeneratedBrackets } from "@/lib/bracket-utils";
import Image from "next/image";


export default function TournamentDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [startingTournament, setStartingTournament] = useState(false);

  // Load user and tournament from localStorage on initial render
  useEffect(() => {
    const fetchTournament = async () => {
      const user = getStoredUser();
      if (user) {
        setCurrentUser(user);
      }

      // Load tournaments from localStorage
      initializeTournaments();

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

  const formatDate = (timestamp: number | Date | string) => {
    let date: Date;
    if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      date = timestamp;
    }
    return date.toLocaleDateString();
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

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case "Mens":
        return "Men's";
      case "Womens":
        return "Women's";
      case "mixed":
        return "Mixed";
      default:
        return gender;
    }
  };

  const getDivisionLabel = (division: string) => {
    return division.charAt(0).toUpperCase() + division.slice(1);
  };

  const getSkillLevelLabel = (skillLevel: { min?: number; max?: number }) => {
    if (!skillLevel) return "Any Level";
    if (skillLevel.min && skillLevel.max) {
      return `${skillLevel.min}.0 - ${skillLevel.max}.0`;
    } else if (skillLevel.min) {
      return `${skillLevel.min}.0+`;
    } else if (skillLevel.max) {
      return `Up to ${skillLevel.max}.0`;
    }
    return "Any Level";
  };

  // Helper function to create a URL-friendly slug
  const createSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  // Calculate total teams across all categories
  const getTotalTeams = () => {
    if (!tournament?.categories) return 0;
    return tournament.categories.reduce((total, category) => {
      return total + (category.teams?.length || 0);
    }, 0);
  };

  // Helper function to get current date in IST timezone as string
  const getCurrentDateIST = (): string => {
    return new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  };

  // Start the tournament - generate bracket with current teams
  const handleStartTournament = async () => {
    if (!tournament || !(currentUser === tournament?.createdBy)) return;

    // Check if tournament is already started
    if (tournament.isStarted) {
      alert("Tournament has already been started. You can view the brackets or edit existing matches.");
      return;
    }

    setStartingTournament(true);

    try {
      // Check if all categories have teams
      const categoriesWithTeams = tournament.categories.filter(cat => 
        cat.teams && cat.teams.length > 0
      );
      
      if (categoriesWithTeams.length === 0) {
        alert("Cannot start tournament: No categories have teams registered.");
        return;
      }

      // Validate tournament configuration
      if (!tournament.categories || tournament.categories.length === 0) {
        alert("Cannot start tournament: Tournament must have at least one category configured.");
        return;
      }
      
      // Check if tournament has a start date
      if (!tournament.startDate) {
        alert("Cannot start tournament: Tournament must have a start date configured.");
        return;
      }
      
      // Check if start date is in the future
      const startDate = new Date(tournament.startDate);
      const now = new Date();
      if (startDate < now) {
        alert("Cannot start tournament: Start date must be in the future.");
        return;
      }
      
      // Check if tournament has a location
      if (!tournament.location || tournament.location.trim() === "") {
        alert("Cannot start tournament: Tournament must have a location configured.");
        return;
      }

      // Check if any category has insufficient teams for the format
      for (const category of categoriesWithTeams) {
        const minTeams = getMinimumTeamsForFormat(category.format);
        if (category.teams!.length < minTeams) {
          alert(`Cannot start tournament: Category ${category.gender} ${category.division} needs at least ${minTeams} teams, but only has ${category.teams!.length}.`);
          return;
        }
        
        // Additional validation for specific formats
        if (category.format === TournamentFormat.POOL_PLAY && category.numberOfPools) {
          const teamsPerPool = Math.ceil(category.teams!.length / category.numberOfPools);
          if (teamsPerPool < 2) {
            alert(`Cannot start tournament: Category ${category.gender} ${category.division} has too many pools (${category.numberOfPools}) for ${category.teams!.length} teams. Each pool needs at least 2 teams.`);
            return;
          }
        }
        
        // Validate team configuration
        if (category.teams) {
          for (const team of category.teams) {
            if (!team.name || team.name.trim() === "") {
              alert(`Cannot start tournament: Team in category ${category.gender} ${category.division} has an invalid name.`);
              return;
            }
          }
        }
      }

      // Generate brackets for all categories
      console.log("Generating brackets for tournament categories...");
      
      // Show progress to user
      if (categoriesWithTeams.length > 1) {
        console.log(`Generating brackets for ${categoriesWithTeams.length} categories...`);
      }
      
      const updatedTournament = generateBracketsForTournament(tournament);
      
      // Validate that brackets were generated successfully
      const validation = validateGeneratedBrackets(updatedTournament);
      if (!validation.isValid) {
        console.error("Bracket validation failed:", validation.errors);
        throw new Error(`Bracket generation failed: ${validation.errors.join(', ')}`);
      }
      
      if (!updatedTournament.categories || updatedTournament.categories.length === 0) {
        throw new Error("Failed to generate brackets for tournament categories");
      }
      
      // Check that matches were generated for each category
      let totalMatches = 0;
      for (const category of updatedTournament.categories) {
        if (!category.matches || category.matches.length === 0) {
          console.warn(`No matches generated for category: ${category.gender} ${category.division}`);
        } else {
          totalMatches += category.matches.length;
          console.log(`Generated ${category.matches.length} matches for ${category.gender} ${category.division}`);
        }
      }
      
      console.log(`Total matches generated: ${totalMatches}`);
      
      // Final validation - ensure all categories have valid round configurations
      const categoriesWithInvalidRounds = updatedTournament.categories.filter(
        cat => !cat.totalRounds || cat.totalRounds < 1
      );
      
      if (categoriesWithInvalidRounds.length > 0) {
        throw new Error("Generated tournament has invalid round configuration");
      }
      
      // Validate that all categories have matches
      const categoriesWithoutMatches = updatedTournament.categories.filter(
        cat => !cat.matches || cat.matches.length === 0
      );
      
      if (categoriesWithoutMatches.length > 0) {
        console.warn("Some categories have no matches generated:", 
          categoriesWithoutMatches.map(cat => `${cat.gender} ${cat.division}`)
        );
      }
      
      // Preserve other tournament properties
      const finalTournament = {
        ...updatedTournament,
        id: tournament.id,
        createdAt: tournament.createdAt, // Keep as string
        organizerId: tournament.organizerId || tournament.createdBy, // Ensure organizerId is set
        location: tournament.location,
        startDate: tournament.startDate,
        slug: tournament.slug,
        isStarted: true, // Mark as started
        updatedAt: getCurrentDateIST(), // Use IST timezone string
        updatedBy: currentUser, // Track who started the tournament
      };
      
      // Log the final tournament configuration for debugging
      console.log("Final tournament configuration:", {
        id: finalTournament.id,
        name: finalTournament.name,
        categories: finalTournament.categories.length,
        categoryRounds: finalTournament.categories.map(cat => ({
          gender: cat.gender,
          division: cat.division,
          totalRounds: cat.totalRounds,
          matches: cat.matches?.length || 0,
          knockoutBracketPopulated: cat.knockoutBracketPopulated
        })),
        isStarted: finalTournament.isStarted
      });

      // Update the tournament in the database
      console.log("Updating tournament in database...");
      await updateTournamentInDB(finalTournament);
      
      // Update local state
      setTournament(finalTournament);
      console.log("Tournament updated successfully in local state");

      // Show success message
      const categoryCount = updatedTournament.categories.length;
      const formatNames = categoriesWithTeams.map(cat => getFormatLabel(cat.format)).join(", ");
      
      alert(
        `Tournament has been started successfully!\n\n` +
        `Generated brackets for ${categoryCount} categories with ${totalMatches} total matches.\n\n` +
        `Tournament formats: ${formatNames}\n\n` +
        `You can now view the brackets and manage matches.`
      );

      // Redirect to bracket page
      console.log("Redirecting to bracket page...");
      router.push(`/tournaments/${params?.id}/bracket`);
    } catch (error) {
      console.error("Error starting tournament:", error);
      
      // Provide more specific error messages
      let errorMessage = "There was an error starting the tournament. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("Failed to generate brackets")) {
          errorMessage = "Failed to generate tournament brackets. Please check your tournament configuration and try again.";
        } else if (error.message.includes("database") || error.message.includes("update")) {
          errorMessage = "Failed to save tournament updates. Please check your connection and try again.";
        }
      }
      
      alert(errorMessage);
    } finally {
      setStartingTournament(false);
    }
  };

  // Helper function to get minimum teams required for each format
  const getMinimumTeamsForFormat = (format: TournamentFormat): number => {
    switch (format) {
      case TournamentFormat.SINGLE_ELIMINATION:
        return 2;
      case TournamentFormat.DOUBLE_ELIMINATION:
        return 4;
      case TournamentFormat.ROUND_ROBIN:
        return 3;
      case TournamentFormat.POOL_PLAY:
        return 4;
      default:
        return 2;
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
                {tournament.categories.length} Categories
              </div>
              <div className="flex items-center">
                <Trophy className="mr-1 h-4 w-4" />
                {getTotalTeams()} Total Teams
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
                  `This tournament features ${tournament.categories.length} categories with different skill levels, age groups, and divisions. Each category will be played according to its specific format and rules.`}
              </p>

              <h3>Tournament Details</h3>
              <ul>
                <li>
                  <strong>Categories:</strong> {tournament.categories.length}
                </li>
                <li>
                  <strong>Total Teams:</strong> {getTotalTeams()}
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
                  disabled={startingTournament || getTotalTeams() < 2}
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
              <CardTitle>Tournament Categories</CardTitle>
              <CardDescription>
                {tournament.categories.length} categories available for registration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tournament.categories.map((category) => (
                  <div key={category.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">
                        {getGenderLabel(category.gender)} {getDivisionLabel(category.division)}
                      </h3>
                      <Badge className={getFormatColor(category.format)}>
                        {getFormatLabel(category.format)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                                             <div className="flex items-center gap-2">
                         <Target className="h-4 w-4 text-muted-foreground" />
                         <span>Skill Level: {getSkillLevelLabel(category.skillLevel || {})}</span>
                       </div>
                      
                      {category.ageGroup && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>Age Group: {category.ageGroup}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{category.teams?.length || 0} Teams Registered</span>
                      </div>
                    </div>

                    {category.pointsToWin && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-sm text-muted-foreground">
                          <strong>Game Rules:</strong> {category.pointsToWin} points to win
                          {category.winBy && category.winBy > 1 && `, win by ${category.winBy}`}
                          {category.bestOf && category.bestOf > 1 && `, best of ${category.bestOf}`}
                        </div>
                      </div>
                    )}


                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Registration Status</CardTitle>
              <CardDescription>
                Overall tournament registration information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Total Categories:</span>
                  <Badge variant="outline">{tournament.categories.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Teams:</span>
                  <Badge variant="outline">{getTotalTeams()}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Tournament Status:</span>
                  <Badge 
                    variant={tournament.isStarted ? "default" : "secondary"}
                    className={tournament.isStarted ? "bg-green-100 text-green-800" : ""}
                  >
                    {tournament.isStarted ? "Started" : "Not Started"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

