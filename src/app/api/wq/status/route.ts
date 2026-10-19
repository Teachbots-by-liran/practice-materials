import { NextResponse } from "next/server";
import { getStore } from "@/lib/server/store";

/** Tells the app whether classes are available (cloud set up) or it should run on the device only. */
export async function GET() {
  return NextResponse.json({ classes: getStore() !== null });
}
