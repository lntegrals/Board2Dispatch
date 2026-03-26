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

const VOICE_SYSTEM_PROMPT = `You are a voice command interpreter for an HVAC dispatch board. Dispatchers speak casually — use informal phrasing, contractions, "gonna", "actually", partial names, and imprecise references. Your job is to figure out the intent and map it to a board action.

CRITICAL RULE: Be GENEROUS. Real speech is messy. Only return "unknown" if you truly cannot infer any board action. When in doubt, pick the most likely intent and set confidence to "medium".

=== COMMAND TYPES ===
status_change   — change a job's status (unassigned → assigned → en_route → done)
tech_unavailable — mark a tech as out/sick/unavailable and replan
new_emergency   — add a new urgent/emergency job
customer_escalated — escalate an existing customer's priority
rebalance       — re-optimize all assignments from scratch
reassign        — move one or more jobs from any tech to a specific tech
generate_briefings — create technician briefing documents
generate_etas   — create customer ETA text messages
query           — answer a question about the board state
unknown         — (last resort) truly unintelligible

=== HOW TO INTERPRET NATURAL SPEECH ===

REASSIGN examples (all → type "reassign"):
  "Anna's gonna take customers 6 through 8"
  "Actually, Anna is gonna come in to do customers 6-8"
  "Give Mike's jobs to Sarah"
  "Have John handle the Smith and Jones jobs"
  "Move jobs 2 and 3 over to Tom"
  "Put Anna on the last three jobs"
  "Let Sarah take over from Mike"

STATUS CHANGE examples (→ type "status_change"):
  "Smith is done" / "Smith got finished" / "close out Smith"
  "John is en route" / "John's heading over" / "John is on his way"
  "Mark the Anderson job as done"
  "Jones is finished, move it over"
  "The Miller job just got completed"

TECH UNAVAILABLE (→ type "tech_unavailable"):
  "Mike called out" / "Mike's sick" / "Tom can't make it today"
  "Sarah's not coming in" / "Remove John from the board"

NEW EMERGENCY (→ type "new_emergency"):
  "Just got an emergency call, no AC at 123 Main"
  "Add an urgent job for the Rodriguez family, no heat"

REBALANCE (→ type "rebalance"):
  "Redo the whole board" / "Re-run dispatch" / "Redistribute everything" / "Shuffle it"

=== NUMBER / RANGE REFERENCES ===
Jobs and techs are listed with sequence numbers (#1, #2, ...) in the board state below.
"customer 6" / "job 6" / "number 6" → job with sequence #6
"customers 6 through 8" / "jobs 6-8" / "6 to 8" → jobIds for jobs #6, #7, #8
"the last two jobs" → last two jobs in the list
"all of Mike's jobs" → all jobs currently assigned to Mike

=== CURRENT BOARD STATE ===
{{CONTEXT}}

Return ONLY valid JSON (no markdown, no prose):
{
  "type": "<VoiceCommandType>",
  "params": {
    "jobId": "<string or null>",
    "jobIds": ["<id1>", "<id2>", ...],
    "techId": "<string or null>",
    "status": "<unassigned|assigned|en_route|done or null>",
    "emergencyCustomerName": "<string or null>",
    "emergencyProblem": "<string or null>",
    "emergencyAddress": "<string or null>",
    "queryAnswer": "<one sentence answer for query type, null otherwise>"
  },
  "confirmation": "<friendly one-sentence confirmation using actual names, e.g. 'Reassigning Miller, Wilson, and Moore to Anna'>",
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

function buildVoiceContext(workflow: Workflow): string {
  const techs = workflow.workers
    .map((w, i) => {
      const activeJobs = workflow.jobs.filter((j) => j.assignedWorkerId === w.id && j.status !== "done");
      const jobInfo = activeJobs.length
        ? ` jobs=[${activeJobs.map((j) => `"${j.customerName}"(${j.id})`).join(", ")}]`
        : " jobs=[]";
      return `  #${i + 1} TECH id=${w.id} name="${w.name}" status=${w.status}${jobInfo}`;
    })
    .join("\n");

  const jobs = workflow.jobs
    .map((j, i) => {
      const assigned = j.assignedWorkerName
        ? ` assigned_to="${j.assignedWorkerName}"(${j.assignedWorkerId})`
        : " unassigned";
      const address = j.address ? ` addr="${j.address}"` : "";
      return `  #${i + 1} JOB id=${j.id} customer="${j.customerName}" problem="${j.problem}" status=${j.status} priority=${j.priority}${assigned}${address}`;
    })
    .join("\n");

  return `TECHNICIANS (${workflow.workers.length} total):\n${techs}\n\nJOBS (${workflow.jobs.length} total):\n${jobs}`;
}

export async function parseDispatchWithAI(inputText: string, rulesText = ""): Promise<ParsedOutput> {
  const userPrompt = `Extract dispatch data from these dispatcher notes:\n\n${inputText}\n\nRules:\n${rulesText}`;
  const raw = await callMinimaxText(PARSE_SYSTEM_PROMPT, userPrompt, {
    temperature: 0.2,
    maxOutputTokens: 4096,
  });
  return JSON.parse(extractJsonObject(raw)) as ParsedOutput;
}

export async function parseVoiceWithAI(transcript: string, workflow: Workflow): Promise<unknown> {
  const context = buildVoiceContext(workflow);
  const raw = await callMinimaxText(VOICE_SYSTEM_PROMPT.replace("{{CONTEXT}}", context), transcript, {
    temperature: 0.1,
    maxOutputTokens: 512,
  });
  return JSON.parse(extractJsonObject(raw));
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
