import { NextRequest, NextResponse } from "next/server";
import { subscribeTokenToTopic } from "@/lib/fcm";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const { token, match_id } = await request.json();

    if (!token || !match_id) {
      return NextResponse.json(
        { ok: false, error: "Missing token or match_id" },
        { status: 400 },
      );
    }

    await subscribeTokenToTopic(token, match_id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[push/subscribe-topic]", message);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { token, match_id } = await request.json();

    if (!token || !match_id) {
      return NextResponse.json(
        { ok: false, error: "Missing token or match_id" },
        { status: 400 },
      );
    }

    const { unsubscribeTokenFromTopic } = await import("@/lib/fcm");
    await unsubscribeTokenFromTopic(token, match_id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[push/unsubscribe-topic]", message);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
