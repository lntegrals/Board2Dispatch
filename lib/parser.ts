/**
 * Board2Dispatch Parser
 *
 * Uses server-side AI route to extract structured dispatch data from
 * messy natural language input and falls back to local heuristics.
 */

import type { Workflow, Worker, Job, Rule, Priority, FollowUpQuestion, DispatchWarning, ParseResult } from "./types";

interface ParsedOutput {
  workers: Omit<Worker, "status">[];
  jobs: Omit<Job, "status">[];
  rules: Omit<Rule, "id">[];
  followUps?: { question: string }[];
  warnings?: { message: string; severity: "info" | "caution" | "alert" }[];
}

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

const URGENCY_KEYWORDS = ["urgent", "emergency", "asap", "no ac", "no heat", "not working", "broken", "out"];
const HIGH_KEYWORDS = ["same day", "today", "priority", "important", "critical"];
const SKILL_MAP: Record<string, string[]> = {
  hvac: ["hvac", "air condition", "ac unit", "heating", "cooling", "heat pump"],
  electrical: ["electrical", "electric", "wiring", "breaker", "panel"],
  refrigeration: ["refrigerant", "freon", "refrigeration", "r-22", "r-410"],
  duct: ["duct", "ductwork", "vent", "ventilation"],
  commercial: ["commercial", "rooftop", "rtu", "chiller"],
  plumbing: ["plumbing", "pipe", "drain", "water"],
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
  const workers: ParsedOutput["workers"] = [];
  const jobs: ParsedOutput["jobs"] = [];
  let workerIdx = 1;
  let jobIdx = 1;

  const workerPatterns = /\b(tech|worker|technician|employee|staff)\s*:?\s*([A-Z][a-z]+ ?[A-Z]?[a-z]*)/gi;
  const workerNames = new Set<string>();

  let match: RegExpExecArray | null;
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

export async function parseDispatchInput(inputText: string, rulesText: string = ""): Promise<ParseResult> {
  let parsed: ParsedOutput;

  try {
    const response = await fetch("/api/ai/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputText, rulesText }),
    });

    if (!response.ok) throw new Error(`Parse route error: ${response.status}`);
    const data = (await response.json()) as { parsed?: ParsedOutput };
    if (!data.parsed) throw new Error("Empty parse response");
    if (!data.parsed.workers?.length && !data.parsed.jobs?.length) {
      throw new Error("Empty parse result from AI");
    }
    parsed = data.parsed;
  } catch (err) {
    console.info("AI parse unavailable, using local parser:", err instanceof Error ? err.message : err);
    parsed = localParse(inputText, rulesText);
  }

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
