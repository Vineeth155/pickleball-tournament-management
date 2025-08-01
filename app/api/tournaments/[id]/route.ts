import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Tournament from "@/models/Tournament";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  await connectDB();
  const tournament = await Tournament.findOne({ id: params.id });
  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 }
    );
  }
  return NextResponse.json(tournament);
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    await connectDB();

    const updated = await Tournament.findOneAndUpdate(
      { id: params.id }, // Match by your custom id field
      body,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT /api/tournaments/:id error:", error);
    return NextResponse.json(
      { error: "Failed to update tournament" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  await connectDB();
  const deleted = await Tournament.findOneAndDelete({ id: params.id });
  if (!deleted) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true });
}
