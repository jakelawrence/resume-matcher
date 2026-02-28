import { NextResponse } from "next/server";
import { getLatestRunState } from "@/lib/runState/storage";

export const runtime = "nodejs";

export async function GET() {
  try {
    const latestRunState = getLatestRunState();
    if (!latestRunState) {
      return NextResponse.json({ success: false, error: "No saved run state found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: latestRunState }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load latest run state.";
    console.error("[run-state/latest]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
