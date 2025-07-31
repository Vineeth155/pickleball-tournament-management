"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Tournament, type User, TournamentFormat } from "@/lib/types";
import {
  deleteTournamentFromDB,
  getTournamentsFromDB,
} from "@/lib/tournament-store";
import { CalendarIcon, Trophy, Users, Trash2, MapPin } from "lucide-react";

interface TournamentListProps {
  currentUser: User | null;
}

export default function TournamentList({ currentUser }: TournamentListProps) {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (!hasInitialized) {
      const fetchTournaments = async () => {
        const data = await getTournamentsFromDB();
        setTournaments(data);
        setHasInitialized(true);
      };
      fetchTournaments();
    }
  }, [hasInitialized]);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this tournament?")) {
      await deleteTournamentFromDB(id);
      const updatedTournaments = await getTournamentsFromDB();
      setTournaments(updatedTournaments);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  // Helper function to create a URL-friendly slug
  const createSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  // Update the getFormatLabel function to include Pool Play
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

  // Update the getFormatColor function to include Pool Play with a different color
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

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium mb-2">No Tournaments Yet</h3>
        <p className="text-muted-foreground mb-6">
          Create your first tournament to get started
        </p>
        <Button onClick={() => router.push("/create-tournament")}>
          Create Tournament
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {tournaments.map((tournament) => (
        <Card key={tournament.id} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <CardTitle className="line-clamp-1">{tournament.name}</CardTitle>
              <Badge className={getFormatColor(tournament.format)}>
                {getFormatLabel(tournament.format)}
              </Badge>
            </div>
            <CardDescription className="line-clamp-2">
              {tournament.description || "No description provided"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground mb-2">
              <CalendarIcon className="mr-1 h-4 w-4" />
              Created on {formatDate(tournament.createdAt)}
            </div>
            <div className="flex items-center text-sm text-muted-foreground mb-2">
              <Users className="mr-1 h-4 w-4" />
              {tournament.teams.length} Teams
            </div>
            {tournament.location && (
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="mr-1 h-4 w-4" />
                {tournament.location}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            <Link href={`/${createSlug(tournament.name)}`} passHref>
              <Button variant="outline">View Details</Button>
            </Link>
            {currentUser?.isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-700 hover:bg-red-100"
                onClick={() => handleDelete(tournament.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
