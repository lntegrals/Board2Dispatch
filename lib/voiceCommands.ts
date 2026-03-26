import type { Workflow, PlanResult, PlanningStatus } from "./types";
import { callGeminiText } from "./gemini";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
    jobIds?: string[];   // for reassign with multiple jobs
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

// ---------------------------------------------------------------------------
// Context builder — compact board state for the AI
// ---------------------------------------------------------------------------

function buildVoiceContext(workflow: Workflow): string {
  const techs = workflow.workers
    .map((w) => `TECH id=${w.id} name="${w.name}" status=${w.status}`)
    .join("\n");

  const jobs = workflow.jobs
    .map((j) => {
      const assigned = j.assignedWorkerName ? ` assigned_to="${j.assignedWorkerName}"` : "";
      return `JOB id=${j.id} customer="${j.customerName}" status=${j.status} priority=${j.priority}${assigned}`;
    })
    .join("\n");

  return `TECHNICIANS:\n${techs}\n\nJOBS:\n${jobs}`;
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a voice command interpreter for an HVAC dispatch board.
Parse the spoken command and return ONLY valid JSON — no markdown, no prose.

=== COMMAND TYPES ===
status_change: "mark Rivera as en route", "Chen is done", "set Johnson to assigned"
tech_unavailable: "Marcus is sick", "Danny can't make it", "take Priya offline"
new_emergency: "emergency at Smith house, no AC", "add urgent call for Johnson"
customer_escalated: "escalate Thornfield", "make Rivera urgent"
rebalance: "rebalance", "redo the schedule", "replan everything"
reassign: "have Marcus do the Rivera job", "give the last two jobs to Danny", "assign Thornfield to Priya", "let Marcus handle those last jobs"
  → Use this when someone is directing which tech should handle specific job(s).
  → "the last two jobs" = the 2 lowest-priority or last-listed unassigned/assigned jobs on the board.
  → "the last job" = the single lowest-priority or last-listed job.
  → Resolve all job names to jobIds. Put them in jobIds array (even for a single job).
query: "what's Danny working on?", "who has the urgent job?", "how many jobs left?"
generate_briefings: "generate briefings", "create morning briefings"
generate_etas: "send ETAs", "generate customer messages"
unknown: cannot parse confidently

=== FUZZY MATCHING ===
"Rivera" matches "Rivera Residence". "Danny" matches "Danny Ruiz".
"en route" = en_route, "on the way" = en_route, "finished" = done, "done" = done, "assigned" = assigned.
"last two jobs" = the final 2 jobs listed in the JOB list above (by order, lowest priority last).
Always include the resolved id (techId or jobId/jobIds) when applicable. If ambiguous → type=unknown.

=== CURRENT BOARD STATE ===
{{CONTEXT}}

=== OUTPUT JSON SCHEMA ===
{
  "type": "<VoiceCommandType>",
  "params": {
    "jobId": "<string or null>",
    "jobIds": ["<id1>", "<id2>"],
    "techId": "<string or null>",
    "status": "<unassigned|assigned|en_route|done or null>",
    "emergencyCustomerName": "<string or null>",
    "emergencyProblem": "<string or null>",
    "emergencyAddress": "<string or null>",
    "queryAnswer": "<one sentence answer for query type, null otherwise>"
  },
  "confirmation": "<one natural sentence describing the action, e.g. 'Assigning Chen Tune-up and Nguyen Mini-split to Marcus Webb'>",
  "confidence": "high|medium|low"
}`;

// ---------------------------------------------------------------------------
// parseVoiceCommand — main export
// ---------------------------------------------------------------------------

export async function parseVoiceCommand(
  transcript: string,
  workflow: Workflow,
  plan: PlanResult | null
): Promise<VoiceCommand> {
  void plan; // available for future use

  const context = buildVoiceContext(workflow);
  const systemPrompt = SYSTEM_PROMPT.replace("{{CONTEXT}}", context);

  try {
    const raw = await callGeminiText(systemPrompt, transcript, {
      temperature: 0.1,
      maxOutputTokens: 384,
    });

    // callGeminiText already strips think tags and code fences
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    const jsonStr =
      firstBrace !== -1 && lastBrace !== -1
        ? raw.substring(firstBrace, lastBrace + 1)
        : raw;

    const parsed = JSON.parse(jsonStr) as Omit<VoiceCommand, "rawTranscript">;
    return { ...parsed, rawTranscript: transcript };
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
