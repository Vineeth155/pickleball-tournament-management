import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Tournament from "@/models/Tournament";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  try {
    const { id: tournamentId, matchId } = await params;

    if (!tournamentId || !matchId) {
      return NextResponse.json(
        { error: "Tournament ID and Match ID are required" },
        { status: 400 }
      );
    }

    await connectDB();
    console.log("Looking for tournament with ID:", tournamentId);
    const tournament = await Tournament.findOne({ id: tournamentId });
    console.log("Tournament found:", tournament ? "Yes" : "No");
    
    if (!tournament) {
      console.log("No tournament found with ID:", tournamentId);
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    console.log("Looking for match with ID:", matchId);
    console.log("Available matches:", tournament.matches?.length || 0);
    const match = tournament.matches.find((m: any) => m.id === matchId);
    console.log("Match found:", match ? "Yes" : "No");
    
    if (!match) {
      console.log("No match found with ID:", matchId);
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404 }
      );
    }

    // Find teams for this match
    const team1 = tournament.teams.find((t: any) => t.id === match.team1Id) || null;
    const team2 = tournament.teams.find((t: any) => t.id === match.team2Id) || null;

    const matchData = {
      match,
      team1,
      team2,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        location: tournament.location,
        startDate: tournament.startDate,
        division: tournament.division,
        format: tournament.format,
        totalRounds: tournament.totalRounds,
      },
    };

    return NextResponse.json(matchData);
  } catch (error) {
    console.error("Error fetching match:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
