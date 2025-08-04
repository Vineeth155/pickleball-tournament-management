import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Organizer from "@/models/Organizer";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      phone,
      email,
      location,
      locationLink,
      aboutUs,
      username,
      password,
    } = body;

    if (!name || !phone || !email || !location || !username || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectDB();

    const organizerId = "ORG-" + nanoid(8);

    const organizer = await Organizer.create({
      organizerId,
      name,
      phone,
      email,
      location,
      locationLink,
      aboutUs,
      username,
      password, // ✅ Store username & password
      createdAt: new Date(),
    });

    return NextResponse.json(organizer);
  } catch (error) {
    console.error("POST /api/organizers error:", error);
    return NextResponse.json(
      { error: "Failed to create organizer" },
      { status: 500 }
    );
  }
}

export async function GET() {
  await connectDB();
  const organizers = await Organizer.find().sort({ createdAt: -1 });
  return NextResponse.json(organizers);
}
