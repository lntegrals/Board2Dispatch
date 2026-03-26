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

function normalizeTranscript(input: string): string {
  return input
    .toLowerCase()
    .replace(/[.,!?;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractStatus(transcript: string): PlanningStatus | null {
  if (/\b(en route|enroute|in route|on route|on the way)\b/.test(transcript)) return "en_route";
  if (/\b(done|completed|complete|finished|closed out|wrapped up)\b/.test(transcript)) return "done";
  if (/\b(assigned|assign)\b/.test(transcript)) return "assigned";
  if (/\b(unassigned|not assigned|backlog|queue)\b/.test(transcript)) return "unassigned";
  return null;
}

function findBestJobId(transcript: string, workflow: Workflow): string | null {
  const normalized = normalizeTranscript(transcript);

  const idMatch = workflow.jobs.find((job) => normalized.includes(job.id.toLowerCase()));
  if (idMatch) return idMatch.id;

  const customerMatch = workflow.jobs.find((job) => {
    const customer = normalizeTranscript(job.customerName);
    return customer.length > 2 && normalized.includes(customer);
  });
  if (customerMatch) return customerMatch.id;

  const tokens = new Set(normalized.split(" "));
  let best: { id: string; score: number } | null = null;

  for (const job of workflow.jobs) {
    const nameTokens = normalizeTranscript(job.customerName)
      .split(" ")
      .filter((t) => t.length > 2);
    const overlap = nameTokens.filter((t) => tokens.has(t)).length;
    if (overlap > 0 && (!best || overlap > best.score)) {
      best = { id: job.id, score: overlap };
    }
  }

  return best?.id ?? null;
}

function findBestTechId(transcript: string, workflow: Workflow): string | null {
  const normalized = normalizeTranscript(transcript);

  const idMatch = workflow.workers.find((w) => normalized.includes(w.id.toLowerCase()));
  if (idMatch) return idMatch.id;

  const nameMatch = workflow.workers.find((w) => {
    const name = normalizeTranscript(w.name);
    return name.length > 2 && normalized.includes(name);
  });
  if (nameMatch) return nameMatch.id;

  const tokens = new Set(normalized.split(" "));
  let best: { id: string; score: number } | null = null;

  for (const tech of workflow.workers) {
    const nameTokens = normalizeTranscript(tech.name)
      .split(" ")
      .filter((t) => t.length > 2);
    const overlap = nameTokens.filter((t) => tokens.has(t)).length;
    if (overlap > 0 && (!best || overlap > best.score)) {
      best = { id: tech.id, score: overlap };
    }
  }

  return best?.id ?? null;
}

function fallbackParseVoiceCommand(transcript: string, workflow: Workflow): VoiceCommand | null {
  const normalized = normalizeTranscript(transcript);

  if (/\b(rebalance|redistribute|re run dispatch|rerun dispatch|optimize board)\b/.test(normalized)) {
    return {
      type: "rebalance",
      params: {},
      confirmation: "Rebalancing the dispatch board.",
      confidence: "medium",
      rawTranscript: transcript,
    };
  }

  if (/\b(briefing|briefings)\b/.test(normalized)) {
    return {
      type: "generate_briefings",
      params: {},
      confirmation: "Generating technician briefings.",
      confidence: "medium",
      rawTranscript: transcript,
    };
  }

  if (/\b(eta|text customer|customer text|arrival window)\b/.test(normalized)) {
    return {
      type: "generate_etas",
      params: {},
      confirmation: "Preparing ETA messages.",
      confidence: "medium",
      rawTranscript: transcript,
    };
  }

  if (/\b(unavailable|offline|called out|out sick|not available)\b/.test(normalized)) {
    const techId = findBestTechId(normalized, workflow);
    if (techId) {
      return {
        type: "tech_unavailable",
        params: { techId },
        confirmation: "Marked technician as unavailable and replanning.",
        confidence: "medium",
        rawTranscript: transcript,
      };
    }
  }

  const status = extractStatus(normalized);
  if (status && /\b(mark|set|change|update|move)\b/.test(normalized)) {
    const jobId = findBestJobId(normalized, workflow);
    if (jobId) {
      return {
        type: "status_change",
        params: { jobId, status },
        confirmation: `Updated job status to ${status.replace("_", " ")}.`,
        confidence: "medium",
        rawTranscript: transcript,
      };
    }
  }

  return null;
}

function isRecognized(command: VoiceCommand | null | undefined): command is VoiceCommand {
  return !!command && command.type !== "unknown";
}

export async function parseVoiceCommand(
  transcript: string,
  workflow: Workflow,
  plan: PlanResult | null
): Promise<VoiceCommand> {
  void plan;

  const localCandidate = fallbackParseVoiceCommand(transcript, workflow);

  try {
    const response = await fetch("/api/ai/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, workflow }),
    });

    if (!response.ok) throw new Error(`Voice route error: ${response.status}`);
    const data = (await response.json()) as { command?: Omit<VoiceCommand, "rawTranscript"> };
    if (!data.command) throw new Error("Empty command response");

    const aiCommand: VoiceCommand = { ...data.command, rawTranscript: transcript };

    if (isRecognized(aiCommand)) return aiCommand;
    if (localCandidate) return localCandidate;
    return aiCommand;
  } catch {
    if (localCandidate) return localCandidate;

    return {
      type: "unknown",
      params: {},
      confirmation: "Sorry, I couldn't understand that command.",
      confidence: "low",
      rawTranscript: transcript,
    };
  }
}
