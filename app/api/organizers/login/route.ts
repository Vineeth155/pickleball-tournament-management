import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Organizer from "@/models/Organizer";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    await connectDB();
    const organizer = await Organizer.findOne({ username, password });

    if (!organizer) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    return NextResponse.json({ organizerId: organizer.organizerId });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Server error during login" },
      { status: 500 }
    );
  }
}
