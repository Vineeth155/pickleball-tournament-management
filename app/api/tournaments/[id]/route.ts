import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Tournament from "@/models/Tournament";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;
  const tournament = await Tournament.findOne({ id });
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    await connectDB();
    const { id } = await params;

    const updated = await Tournament.findOneAndUpdate(
      { id }, // Match by your custom id field
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
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;
  const deleted = await Tournament.findOneAndDelete({ id });
  if (!deleted) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true });
}
