import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import Organizer from "@/models/Organizer";

export async function GET(req: Request) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const createdBy = url.searchParams.get("createdBy");

    let tournaments;
    if (createdBy) {
      // ✅ filter tournaments created by a specific organizer
      tournaments = await Tournament.find({ createdBy });
    } else {
      // ✅ return all tournaments if no filter
      tournaments = await Tournament.find({});
    }

    return NextResponse.json(tournaments);
  } catch (error: any) {
    console.error("GET /api/tournaments error:", error);
    return NextResponse.json(
      { error: "Failed to load tournaments" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectDB();

    const tournament = await Tournament.create(body);

    // ✅ Push tournament ID into organizer's tournaments array
    if (body.createdBy) {
      await Organizer.findOneAndUpdate(
        { organizerId: body.createdBy },
        { $push: { tournaments: tournament.id } }
      );
    }

    return NextResponse.json(tournament);
  } catch (error) {
    console.error("POST /api/tournaments error:", error);
    return NextResponse.json(
      { error: "Failed to create tournament" },
      { status: 500 }
    );
  }
}
