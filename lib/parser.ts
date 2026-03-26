/**
 * Board2Dispatch Parser
 *
 * Uses Gemini API (gemini-2.0-flash) to extract structured dispatch data from
 * messy natural language input (whiteboard notes, dispatcher memos, etc.).
 *
 * Falls back to a local heuristic parser when the API key is not set,
 * so the app works out-of-the-box in demo mode.
 */

import type { Workflow, Worker, Job, Rule, Priority } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedOutput {
  workers: Omit<Worker, "status">[];
  jobs: Omit<Job, "status">[];
  rules: Omit<Rule, "id">[];
}

// ---------------------------------------------------------------------------
// Gemini API call
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a dispatch data extraction assistant for an HVAC company.
Extract structured data from messy dispatcher notes and return ONLY valid JSON.
No explanation, no markdown fences — just the raw JSON object.

Output format:
{
  "workers": [{ "id": "w1", "name": "...", "skills": ["hvac", "electrical"] }],
  "jobs": [{ "id": "j1", "customerName": "...", "problem": "...", "priority": "urgent|high|normal|low", "requiredSkills": ["hvac"], "address": "...", "estimatedMinutes": 60 }],
  "rules": [{ "condition": "...", "action": "..." }]
}

Priority levels: urgent (customer without AC/heat right now), high (same-day must-fix), normal (scheduled), low (maintenance).`;

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("NO_API_KEY");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2000 },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
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
): Promise<Workflow> {
  let parsed: ParsedOutput;

  try {
    const prompt = `Extract dispatch data from these dispatcher notes:\n\n${inputText}\n\nRules:\n${rulesText}`;
    const raw = await callGemini(prompt);

    // Strip any markdown code fences if present
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const data = JSON.parse(cleaned) as ParsedOutput;
    parsed = data;
  } catch (err) {
    // Use local parser in demo/no-key mode
    console.info("Gemini unavailable, using local parser:", err instanceof Error ? err.message : err);
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

  return { workers, jobs, rules };
}
