import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Organizer from "@/models/Organizer";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  await connectDB();
  const qpm = await params;
  console.log("QPM", qpm);
  const organizer = await Organizer.findOne({ organizerId: qpm.id });
  if (!organizer) {
    return NextResponse.json({ error: "Organizer not found" }, { status: 404 });
  }
  return NextResponse.json(organizer);
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    await connectDB();

    const updated = await Organizer.findOneAndUpdate({ _id: params.id }, body, {
      new: true,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Organizer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT /api/organizers/:id error:", error);
    return NextResponse.json(
      { error: "Failed to update organizer" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  await connectDB();
  const deleted = await Organizer.findOneAndDelete({ _id: params.id });
  if (!deleted) {
    return NextResponse.json({ error: "Organizer not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
