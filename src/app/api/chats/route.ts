import { NextResponse } from "next/server";

const AI_BASE_URL =
  process.env.AI_SERVICE_URL ||
  process.env.NEXT_PUBLIC_AI_BASE_URL ||
  "https://ecojindu-ai-480235407496.us-central1.run.app";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel") || "";
  const query = channel ? `?channel=${encodeURIComponent(channel)}` : "";

  try {
    const res = await fetch(`${AI_BASE_URL.replace(/\/$/, "")}/admin/chats${query}`, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { status: "error", message: `AI Service responded with ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { status: "error", message: errorMsg },
      { status: 502 }
    );
  }
}
