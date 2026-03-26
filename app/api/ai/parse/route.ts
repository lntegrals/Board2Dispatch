import { NextResponse } from "next/server";
import { parseDispatchWithAI } from "@/lib/server/ai";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { inputText?: string; rulesText?: string };
    if (!body.inputText?.trim()) {
      return NextResponse.json({ error: "inputText is required" }, { status: 400 });
    }

    const parsed = await parseDispatchWithAI(body.inputText, body.rulesText ?? "");
    return NextResponse.json({ parsed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
