import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Organizer from "@/models/Organizer";

export async function POST(req: Request) {
  try {
    const { organizerId } = await req.json();
    if (!organizerId) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    await connectDB();
    const organizer = await Organizer.findOne({ organizerId });

    return NextResponse.json({ valid: !!organizer });
  } catch (err) {
    console.error("Validation error:", err);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
