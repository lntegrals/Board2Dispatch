import type { Workflow, PlanResult, PlanningStatus } from "./types";

export type VoiceCommandType =
  | "status_change"
  | "tech_unavailable"
  | "new_emergency"
  | "customer_escalated"
  | "rebalance"
  | "reassign"
  | "generate_briefings"
  | "generate_etas"
  | "query"
  | "unknown";

export interface VoiceCommand {
  type: VoiceCommandType;
  params: {
    jobId?: string;
    jobIds?: string[];
    techId?: string;
    status?: PlanningStatus;
    emergencyCustomerName?: string;
    emergencyProblem?: string;
    emergencyAddress?: string;
    queryAnswer?: string;
  };
  confirmation: string;
  confidence: "high" | "medium" | "low";
  rawTranscript: string;
}

export async function parseVoiceCommand(
  transcript: string,
  workflow: Workflow,
  plan: PlanResult | null
): Promise<VoiceCommand> {
  void plan;

  try {
    const response = await fetch("/api/ai/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, workflow }),
    });

    if (!response.ok) throw new Error(`Voice route error: ${response.status}`);
    const data = (await response.json()) as { command?: Omit<VoiceCommand, "rawTranscript"> };
    if (!data.command) throw new Error("Empty command response");

    return { ...data.command, rawTranscript: transcript };
  } catch {
    return {
      type: "unknown",
      params: {},
      confirmation: "Sorry, I couldn't understand that command.",
      confidence: "low",
      rawTranscript: transcript,
    };
  }
}
