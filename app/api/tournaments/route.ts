import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Tournament from "@/models/Tournament";

export async function GET() {
  try {
    await connectDB();
    const tournaments = await Tournament.find({});
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
    console.log("Incoming tournament:", body);

    await connectDB();
    const created = await Tournament.create(body);

    return NextResponse.json(created);
  } catch (error: any) {
    console.error("POST /api/tournaments error:", error);
    return NextResponse.json(
      { error: "Failed to save tournament", details: error.message },
      { status: 500 }
    );
  }
}
