/**
 * Board2Dispatch Parser
 *
 * Uses MiniMax API (MiniMax-M2.7) to extract structured dispatch data from
 * messy natural language input (whiteboard notes, dispatcher memos, etc.).
 * Also generates situation-specific follow-up questions and proactive warnings
 * in the same API call, eliminating the sequential latency of a second call.
 *
 * Falls back to a local heuristic parser when the API key is not set,
 * so the app works out-of-the-box in demo mode.
 */

import type { Workflow, Worker, Job, Rule, Priority, FollowUpQuestion, DispatchWarning, ParseResult } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedOutput {
  workers: Omit<Worker, "status">[];
  jobs: Omit<Job, "status">[];
  rules: Omit<Rule, "id">[];
  followUps?: { question: string }[];
  warnings?: { message: string; severity: "info" | "caution" | "alert" }[];
}

// ---------------------------------------------------------------------------
// Default fallback questions (used when API is unavailable)
// ---------------------------------------------------------------------------

export const DEFAULT_QUESTIONS: FollowUpQuestion[] = [
  {
    id: "fq1",
    question: "Are any technicians unavailable today due to illness, training, or other reasons?",
    answer: "",
  },
  {
    id: "fq2",
    question: "Are there any emergency or same-day calls that weren't mentioned in the notes?",
    answer: "",
  },
  {
    id: "fq3",
    question: "Are any customers flagged as VIP or high-priority accounts that need special attention?",
    answer: "",
  },
];

// ---------------------------------------------------------------------------
// MiniMax API call
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert HVAC dispatch coordinator AI with 15+ years of field experience.
Extract structured dispatch data from messy dispatcher notes and return ONLY valid JSON.
No explanation, no markdown fences — just the raw JSON object.

=== HVAC SKILL TAXONOMY ===
Use these skill tags: hvac, electrical, refrigeration, duct, commercial, plumbing, controls, geothermal, boiler, senior, epa608, mini-split, vrf, chiller
Certifications: EPA 608 (required for any refrigerant work — R-410A, R-22, R-32, R-407C)
Refrigerants: R-410A (modern systems post-2010), R-22 (legacy, phase-out)

=== PRIORITY KEYWORDS ===
urgent: "no cool", "no AC", "no heat", "AC out", "heat out", "water leak from unit", "electrical smell", "burning smell", "no air", "been down", "baby", "infant", "elderly", "hospital", "medical equipment", "not working", "broken", "out", "asap", "emergency"
high: "tenant complaint", "commercial building", "office down", "VIP", "same day", "today only", "escalated", "paid in full", "critical", "important", "priority"
normal: scheduled maintenance, tune-ups, inspections
low: quotes, estimates, non-urgent inspections

=== ESTIMATED MINUTES BY JOB TYPE ===
Emergency no-cool/no-heat: 90-120 | Refrigerant recharge: 60-90 | RTU/rooftop service: 120-180
Mini-split install (per zone): 120-180 | Thermostat replacement: 30-45 | Annual tune-up: 60-90
Duct repair/sealing: 90-120 | Electrical panel work: 60-90 | New system install: 240-480

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
}

=== FOLLOW-UP QUESTION RULES ===
Generate exactly 3 follow-up questions tailored to THIS specific dispatch situation.
Look for: EPA 608 needed but no certified tech listed, more urgent jobs than available techs, missing addresses on urgent jobs, ambiguous priorities, required skills no tech has.
Be specific — reference actual names, job types, and gaps found. NOT generic templates.
Good: "Rivera job mentions refrigerant — is Marcus EPA 608 certified for R-410A work?"
Bad: "Are any technicians unavailable today?"

=== WARNING RULES ===
Proactively surface these (only include warnings that actually apply):
- More urgent jobs than available techs → severity: "alert", e.g. "3 urgent jobs but only 2 techs available — consider calling in backup"
- Refrigerant job but no tech with epa608 skill → severity: "alert"
- Water leak from unit → severity: "caution" (may need plumber referral)
- Burning smell or electrical smell → severity: "alert" (safety: check wiring before energizing)
- Urgent job with no address listed → severity: "caution"
- Required skill that no listed tech has → severity: "alert"
Omit warnings that do not apply. Return an empty array if no issues found.`;

async function callMinimax(prompt: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_MINIMAX_API_KEY;

  if (!apiKey) {
    throw new Error("NO_API_KEY");
  }

  const response = await fetch("https://api.minimax.io/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "MiniMax-M2.7",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    throw new Error(`Minimax API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ---------------------------------------------------------------------------
// Local heuristic parser (fallback / demo mode)
// ---------------------------------------------------------------------------

const URGENCY_KEYWORDS = ["urgent", "emergency", "asap", "no ac", "no heat", "not working", "broken", "out"];
const HIGH_KEYWORDS = ["same day", "today", "priority", "important", "critical"];
const SKILL_MAP: Record<string, string[]> = {
  "hvac": ["hvac", "air condition", "ac unit", "heating", "cooling", "heat pump"],
  "electrical": ["electrical", "electric", "wiring", "breaker", "panel"],
  "refrigeration": ["refrigerant", "freon", "refrigeration", "r-22", "r-410"],
  "duct": ["duct", "ductwork", "vent", "ventilation"],
  "commercial": ["commercial", "rooftop", "rtu", "chiller"],
  "plumbing": ["plumbing", "pipe", "drain", "water"],
};

function inferSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const skills: string[] = [];
  for (const [skill, keywords] of Object.entries(SKILL_MAP)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      skills.push(skill);
    }
  }
  return skills.length > 0 ? skills : ["hvac"];
}

function inferPriority(text: string): Priority {
  const lower = text.toLowerCase();
  if (URGENCY_KEYWORDS.some((kw) => lower.includes(kw))) return "urgent";
  if (HIGH_KEYWORDS.some((kw) => lower.includes(kw))) return "high";
  return "normal";
}

function localParse(text: string, rulesText: string): ParsedOutput {
  const lines = text.split(/\n|,|;/).map((l) => l.trim()).filter(Boolean);
  void lines;

  const workers: ParsedOutput["workers"] = [];
  const jobs: ParsedOutput["jobs"] = [];
  let workerIdx = 1;
  let jobIdx = 1;

  // Simple pattern matching — look for "Worker:", "Tech:", name lines
  const workerPatterns = /\b(tech|worker|technician|employee|staff)\s*:?\s*([A-Z][a-z]+ ?[A-Z]?[a-z]*)/gi;
  const workerNames = new Set<string>();

  let match;
  while ((match = workerPatterns.exec(text)) !== null) {
    const name = match[2].trim();
    if (!workerNames.has(name)) {
      workerNames.add(name);
      workers.push({
        id: `w${workerIdx++}`,
        name,
        skills: inferSkills(text),
      });
    }
  }

  // Fallback: look for capitalized Name patterns as workers
  if (workers.length === 0) {
    const namePattern = /^([A-Z][a-z]+ [A-Z][a-z]+)\s*[-–:]/gm;
    while ((match = namePattern.exec(text)) !== null) {
      const name = match[1].trim();
      if (!workerNames.has(name)) {
        workerNames.add(name);
        workers.push({
          id: `w${workerIdx++}`,
          name,
          skills: inferSkills(text),
        });
      }
    }
  }

  // Job patterns — look for customer names and problems
  const jobPatterns = [
    /(?:job|call|ticket|customer|client)\s*:?\s*([^,\n]+)/gi,
    /([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*[-–@]\s*([^,\n]+)/g,
  ];

  for (const pattern of jobPatterns) {
    while ((match = pattern.exec(text)) !== null) {
      const customerName = match[1]?.trim();
      const problem = match[2]?.trim() ?? "Service call";
      if (customerName && customerName.length < 50) {
        jobs.push({
          id: `j${jobIdx++}`,
          customerName,
          problem,
          priority: inferPriority(problem),
          requiredSkills: inferSkills(problem),
          estimatedMinutes: 60,
        });
      }
    }
    if (jobs.length > 0) break;
  }

  // Parse rules from rulesText
  const rules: ParsedOutput["rules"] = rulesText
    .split(/\n|;/)
    .map((r) => r.trim())
    .filter((r) => r.length > 5)
    .map((r) => {
      const parts = r.split(/then|→|->|:/).map((p) => p.trim());
      return {
        condition: parts[0] ?? r,
        action: parts[1] ?? "apply rule",
      };
    });

  return { workers, jobs, rules };
}

// ---------------------------------------------------------------------------
// parseDispatchInput — main export
// ---------------------------------------------------------------------------

export async function parseDispatchInput(
  inputText: string,
  rulesText: string = ""
): Promise<ParseResult> {
  let parsed: ParsedOutput;

  try {
    const prompt = `Extract dispatch data from these dispatcher notes:\n\n${inputText}\n\nRules:\n${rulesText}`;
    const raw = await callMinimax(prompt);

    // Strip thinking/reasoning tags that M2.7 embeds before the JSON
    let cleaned = raw.replace(/<think>[\s\S]*?<\/thinking>/g, "").trim();

    // Strip any markdown code fences if present
    cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    // Extract JSON object - find first { and last }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    const data = JSON.parse(cleaned) as ParsedOutput;
    // If the AI returned empty workers AND jobs, treat as a parse failure
    if (!data.workers?.length && !data.jobs?.length) {
      throw new Error("Empty parse result from AI");
    }
    parsed = data;
  } catch (err) {
    // Use local parser in demo/no-key mode
    console.info("Minimax unavailable, using local parser:", err instanceof Error ? err.message : err);
    parsed = localParse(inputText, rulesText);
  }

  // Normalize into full Workflow types
  const workers: Worker[] = (parsed.workers ?? []).map((w, i) => ({
    ...w,
    id: w.id ?? `w${i + 1}`,
    status: "available" as const,
    skills: w.skills ?? [],
  }));

  const jobs: Job[] = (parsed.jobs ?? []).map((j, i) => ({
    ...j,
    id: j.id ?? `j${i + 1}`,
    status: "unassigned" as const,
    requiredSkills: j.requiredSkills ?? [],
    estimatedMinutes: j.estimatedMinutes ?? 60,
  }));

  const rules: Rule[] = (parsed.rules ?? []).map((r, i) => ({
    ...r,
    id: `rule${i + 1}`,
  }));

  const followUps: FollowUpQuestion[] = (parsed.followUps ?? [])
    .slice(0, 3)
    .map((q, i) => ({ id: `fq${i + 1}`, question: q.question, answer: "" }));

  const warnings: DispatchWarning[] = (parsed.warnings ?? []).map((w) => ({
    message: w.message,
    severity: w.severity,
  }));

  return {
    workflow: { workers, jobs, rules },
    followUps: followUps.length > 0 ? followUps : DEFAULT_QUESTIONS,
    warnings,
  };
}
