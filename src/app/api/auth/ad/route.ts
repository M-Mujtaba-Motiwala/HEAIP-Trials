import { NextResponse } from "next/server";

// AD endpoint removed — platform now uses direct NextAuth credentials.
export async function POST() {
  return NextResponse.json(
    { error: "Active Directory authentication is not configured. Use direct login." },
    { status: 410 }
  );
}
