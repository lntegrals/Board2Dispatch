import { NextResponse } from "next/server";
import type { Workflow, PlanResult } from "@/lib/types";
import { parseVoiceWithAI } from "@/lib/server/ai";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { transcript?: string; workflow?: Workflow; plan?: PlanResult | null };
    if (!body.transcript?.trim() || !body.workflow) {
      return NextResponse.json({ error: "transcript and workflow are required" }, { status: 400 });
    }

    const command = await parseVoiceWithAI(body.transcript, body.workflow, body.plan);
    return NextResponse.json({ command });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown voice parse error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
