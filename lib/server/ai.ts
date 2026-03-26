import type { PlanResult, Workflow } from "@/lib/types";
import { callMinimaxMultimodal, callMinimaxText } from "@/lib/server/minimax";

export interface ParsedOutput {
  workers: { id?: string; name: string; skills?: string[] }[];
  jobs: {
    id?: string;
    customerName: string;
    problem: string;
    priority: "urgent" | "high" | "normal" | "low";
    requiredSkills?: string[];
    address?: string;
    estimatedMinutes?: number;
  }[];
  rules: { condition: string; action: string }[];
  followUps?: { question: string }[];
  warnings?: { message: string; severity: "info" | "caution" | "alert" }[];
}

const PARSE_SYSTEM_PROMPT = `You are an expert HVAC dispatch coordinator AI with 15+ years of field experience.
Extract structured dispatch data from messy dispatcher notes and return ONLY valid JSON.
No explanation, no markdown fences — just the raw JSON object.

Return ONLY this JSON and nothing else:
{
  "workers": [{ "id": "w1", "name": "...", "skills": ["hvac", "epa608", "commercial"] }],
  "jobs": [{ "id": "j1", "customerName": "...", "problem": "...", "priority": "urgent|high|normal|low", "requiredSkills": ["hvac", "refrigeration"], "address": "...", "estimatedMinutes": 90 }],
  "rules": [{ "condition": "...", "action": "..." }],
  "followUps": [
    { "question": "..." },
    { "question": "..." },
    { "question": "..." }
  ],
  "warnings": [
    { "message": "...", "severity": "info|caution|alert" }
  ]
}`;

const VOICE_SYSTEM_PROMPT = `You are a voice command interpreter for an HVAC dispatch board.
Parse the spoken command and return ONLY valid JSON — no markdown, no prose.

=== COMMAND TYPES ===
status_change, tech_unavailable, new_emergency, customer_escalated, rebalance, reassign, generate_briefings, generate_etas, query, unknown

=== CURRENT BOARD STATE ===
{{CONTEXT}}

Return JSON:
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
  "confirmation": "<one sentence>",
  "confidence": "high|medium|low"
}`;

const VOICE_RECOVERY_SYSTEM_PROMPT = `You are a fault-tolerant voice command interpreter for an HVAC dispatch board.
Your job is to recover intent from imperfect speech transcripts.
You MUST infer the most likely actionable command using board context.
Only use unknown when the transcript is completely unrelated to dispatch work.

=== RECOVERY RULES ===
- Resolve misheard names to the closest technician/customer in context.
- Treat variants like "on route"/"in route"/"en route" as en_route.
- Treat "done"/"complete"/"finished" as done.
- If user asks to "move" or "set" a job to a status, return status_change.
- If user says a tech is unavailable/offline/sick, return tech_unavailable.
- If user asks to rebalance/re-run dispatch, return rebalance.

=== CURRENT BOARD STATE ===
{{CONTEXT}}

Return JSON:
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
  "confirmation": "<one sentence>",
  "confidence": "high|medium|low"
}`;

const IMAGE_SYSTEM_PROMPT = `You are an OCR assistant for an HVAC dispatch office.
Extract ALL visible text from the image exactly as written.
If the image is too blurry, unclear, or contains no relevant dispatch text, respond with exactly: UNCLEAR
Return only the extracted text with no commentary.`;

const BRIEFINGS_SYSTEM_PROMPT = `You are a dispatch coordinator for an HVAC company.
Write a professional morning briefing for each technician based on assigned jobs.
Return a JSON object: { "sections": [{ "heading": "Tech Name", "body": "full briefing text" }] }`;

const ETAS_SYSTEM_PROMPT = `You are a customer service coordinator for an HVAC company.
Draft short, professional ETA text messages.
Return a JSON object: { "sections": [{ "heading": "Customer Name", "body": "message text" }] }`;

function extractJsonObject(raw: string): string {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    return cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

function buildDispatchSummary(plan: PlanResult, workflow: Workflow): string {
  const workerMap = new Map(workflow.workers.map((w) => [w.id, w]));
  const jobMap = new Map(workflow.jobs.map((j) => [j.id, j]));
  const lines: string[] = ["=== TODAY'S DISPATCH PLAN ===\n"];

  for (const assignment of plan.assignments) {
    const worker = workerMap.get(assignment.workerId);
    const job = jobMap.get(assignment.jobId);
    if (!worker || !job) continue;
    lines.push(`TECH: ${worker.name} (skills: ${worker.skills.join(", ")})`);
    lines.push(`  → Customer: ${job.customerName}`);
    lines.push(`  → Address: ${job.address ?? "TBD"}`);
    lines.push(`  → Problem: ${job.problem}`);
    lines.push(`  → Priority: ${job.priority} | Est. ${job.estimatedMinutes ?? 60} min`);
    lines.push(`  → Skills required: ${job.requiredSkills.join(", ")}`);
    lines.push("");
  }

  return lines.join("\n");
}

function buildVoiceContext(workflow: Workflow, plan?: PlanResult | null): string {
  const techs = workflow.workers
    .map((w) => `TECH id=${w.id} name="${w.name}" status=${w.status} skills=[${w.skills.join(", ")}]`)
    .join("\n");

  const jobs = workflow.jobs
    .map((j) => {
      const assigned = j.assignedWorkerName ? ` assigned_to="${j.assignedWorkerName}"` : "";
      const addr = j.address ? ` address="${j.address}"` : "";
      return `JOB id=${j.id} customer="${j.customerName}" problem="${j.problem}" status=${j.status} priority=${j.priority}${assigned}${addr}`;
    })
    .join("\n");

  const assignments = plan?.assignments?.length
    ? plan.assignments
        .map((a) => `ASSIGNMENT job_id=${a.jobId} tech_id=${a.workerId} tech_name="${a.workerName}" score=${a.score.toFixed(2)}`)
        .join("\n")
    : "No active assignments in plan context.";

  return `TECHNICIANS:\n${techs}\n\nJOBS:\n${jobs}\n\nPLAN:\n${assignments}`;
}

function isUnknownVoiceType(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== "object") return true;
  const value = (parsed as { type?: unknown }).type;
  return value === "unknown" || typeof value !== "string";
}

export async function parseDispatchWithAI(inputText: string, rulesText = ""): Promise<ParsedOutput> {
  const userPrompt = `Extract dispatch data from these dispatcher notes:\n\n${inputText}\n\nRules:\n${rulesText}`;
  const raw = await callMinimaxText(PARSE_SYSTEM_PROMPT, userPrompt, {
    temperature: 0.2,
    maxOutputTokens: 4096,
  });
  return JSON.parse(extractJsonObject(raw)) as ParsedOutput;
}

export async function parseVoiceWithAI(
  transcript: string,
  workflow: Workflow,
  plan?: PlanResult | null
): Promise<unknown> {
  const context = buildVoiceContext(workflow, plan);
  const strictRaw = await callMinimaxText(VOICE_SYSTEM_PROMPT.replace("{{CONTEXT}}", context), transcript, {
    temperature: 0.1,
    maxOutputTokens: 512,
  });

  const strictParsed = JSON.parse(extractJsonObject(strictRaw)) as unknown;
  if (!isUnknownVoiceType(strictParsed)) return strictParsed;

  const recoveryInput = `Transcript: ${transcript}\n\nInterpret this against the current board and recover the most likely command.`;
  const recoveryRaw = await callMinimaxText(VOICE_RECOVERY_SYSTEM_PROMPT.replace("{{CONTEXT}}", context), recoveryInput, {
    temperature: 0.2,
    maxOutputTokens: 512,
  });

  return JSON.parse(extractJsonObject(recoveryRaw));
}

export async function generateActionWithAI(kind: "briefings" | "etas", plan: PlanResult, workflow: Workflow): Promise<unknown> {
  const summary = buildDispatchSummary(plan, workflow);
  const prompt = kind === "briefings" ? BRIEFINGS_SYSTEM_PROMPT : ETAS_SYSTEM_PROMPT;
  const raw = await callMinimaxText(prompt, summary, {
    temperature: 0.6,
    maxOutputTokens: 3000,
  });
  return JSON.parse(extractJsonObject(raw));
}

export async function extractImageTextWithAI(imageBase64: string, mimeType: string): Promise<string> {
  return callMinimaxMultimodal(
    IMAGE_SYSTEM_PROMPT,
    "Extract all text from this dispatch whiteboard or notes image.",
    imageBase64,
    mimeType
  );
}
