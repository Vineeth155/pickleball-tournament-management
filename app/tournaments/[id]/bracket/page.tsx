"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getStoredUser } from "@/lib/auth";
import { initializeTournaments } from "@/lib/tournament-store";
import {
  getTournamentByIdFromDB,
  getTournamentsFromDB,
  updateMatchInTournament,
} from "@/lib/tournament-store";
import TournamentBracket from "@/components/tournament-bracket";
import type { User, Tournament, Match } from "@/lib/types";
import { ArrowLeft } from "lucide-react";

export default function TournamentBracketPage() {
  const router = useRouter();
  const params = useParams();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);

  // Load user and tournament from localStorage on initial render
  useEffect(() => {
    const fetchData = async () => {
      const user = getStoredUser();
      if (user) {
        setCurrentUser(user);
      }

      // Initialize tournaments from database
      initializeTournaments();

      // Find tournament by slug
      const slug = params?.id as string;
      if (slug) {
        // const allTournaments = await getTournamentsFromDB();
        const foundTournament = await getTournamentByIdFromDB(slug);

        if (foundTournament) {
          setTournament(foundTournament);
        } else {
          // Tournament not found, redirect to tournaments list
          router.push("/tournaments");
        }
      }
    };

    fetchData();
  }, [params, router]);

  // Helper function to create a URL-friendly slug
  const createSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  // Update the handleUpdateMatch function to properly handle knockout matches
  const handleUpdateMatch = async (
    matchId: string,
    updatedMatch: Partial<Match>
  ) => {
    if (!tournament || !(currentUser === tournament?.createdBy)) return;

    // Ensure completed flag is set if winner is set
    if (updatedMatch.winnerId !== undefined && updatedMatch.winnerId !== null) {
      updatedMatch.completed = true;
    }

    // Debug to see what's happening
    console.log(`[Bracket Page] Updating match ${matchId}:`, {
      update: updatedMatch,
    });

    // Direct update to ensure persistence
    await updateMatchInTournament(tournament.id, matchId, updatedMatch);

    // Refresh tournament data
    const allTournaments = await getTournamentsFromDB();
    const updatedTournament = allTournaments.find(
      (t) => t.id === tournament.id
    );
    if (updatedTournament) {
      setTournament(updatedTournament);
    }
  };

  if (!tournament) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p>Loading tournament bracket...</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push(`/tournaments/${params?.id}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tournament Details
        </Button>
        <h1 className="text-2xl font-bold">{tournament.name} - Bracket</h1>
      </div>

      <TournamentBracket
        tournament={tournament}
        onUpdateMatch={handleUpdateMatch}
        currentUser={currentUser}
      />
    </main>
  );
}
