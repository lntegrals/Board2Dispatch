import { NextResponse } from "next/server";
import type { PlanResult, Workflow } from "@/lib/types";
import { generateActionWithAI } from "@/lib/server/ai";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      kind?: "briefings" | "etas";
      plan?: PlanResult;
      workflow?: Workflow;
    };

    if (!body.kind || !body.plan || !body.workflow) {
      return NextResponse.json({ error: "kind, plan, and workflow are required" }, { status: 400 });
    }

    const output = await generateActionWithAI(body.kind, body.plan, body.workflow);
    return NextResponse.json({ output });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown generation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
