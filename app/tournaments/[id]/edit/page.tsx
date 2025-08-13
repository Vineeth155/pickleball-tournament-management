"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getStoredUser } from "@/lib/auth";
import { initializeTournaments } from "@/lib/tournament-store";
import {
  getTournamentByIdFromDB,
  getTournamentsFromDB,
  updateTournamentInDB,
} from "@/lib/tournament-store";
import type { User, Tournament } from "@/lib/types";
import { ArrowLeft } from "lucide-react";
import TournamentForm from "@/components/tournament-form";
import { useToast } from "@/hooks/use-toast";

export default function EditTournamentPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Load user and tournament from localStorage on initial render
  useEffect(() => {
    const fetchTournament = async () => {
      if (!hasCheckedAuth) {
        const user = getStoredUser();
        if (user) {
          setCurrentUser(user);
        } else {
          // Redirect non-logged in users
          router.push("/");
          return;
        }

        // Load tournaments from localStorage
        initializeTournaments();

        // Find tournament by slug
        const slug = params?.id as string;
        if (slug) {
          const foundTournament = await getTournamentByIdFromDB(slug);

          if (foundTournament) {
            setTournament(foundTournament);
          } else {
            // Tournament not found, redirect to tournaments list
            router.push("/tournaments");
          }
        }
        
        setIsLoading(false);
        setHasCheckedAuth(true);
      }
    };

    fetchTournament();
  }, [params, router, hasCheckedAuth]);

  // Separate effect for redirection to avoid race conditions
  useEffect(() => {
    // Only redirect after we've loaded the user and checked auth
    if (!isLoading && hasCheckedAuth) {
      if (!currentUser) {
        console.log("No user found, redirecting to home");
        router.push("/");
      }
    }
  }, [currentUser, isLoading, router, hasCheckedAuth]);

  // Check if user is the tournament creator
  useEffect(() => {
    if (tournament && currentUser && tournament.createdBy !== currentUser) {
      // Redirect non-admin users
      router.push("/");
    }
  }, [tournament, currentUser, router]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p>Loading tournament or checking permissions...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p>You need admin permissions to access this page.</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p>Tournament not found.</p>
      </div>
    );
  }

  if (tournament.createdBy !== currentUser) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p>You don't have permission to edit this tournament.</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => router.push(`/tournaments/${params?.id}`)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Tournament Details
      </Button>

      <h1 className="text-3xl font-bold mb-8">
        Edit Tournament: {tournament.name}
      </h1>

      <TournamentForm 
        userId={currentUser} 
        tournament={tournament}
        isEditing={true}
      />
    </main>
  );
}
