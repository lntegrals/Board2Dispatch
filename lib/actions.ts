import type { PlanResult, Workflow, ActionOutput } from "./types";
import { callGeminiStream } from "./gemini";

function buildDispatchSummary(plan: PlanResult, workflow: Workflow): string {
  const workerMap = new Map(workflow.workers.map((w) => [w.id, w]));
  const jobMap = new Map(workflow.jobs.map((j) => [j.id, j]));

  const lines: string[] = ["=== TODAY'S DISPATCH PLAN ===\n"];

  for (const assignment of plan.assignments) {
    const worker = workerMap.get(assignment.workerId);
    const job = jobMap.get(assignment.jobId);
    if (worker && job) {
      lines.push(`TECH: ${worker.name} (skills: ${worker.skills.join(", ")})`);
      lines.push(`  → Customer: ${job.customerName}`);
      lines.push(`  → Address: ${job.address ?? "TBD"}`);
      lines.push(`  → Problem: ${job.problem}`);
      lines.push(`  → Priority: ${job.priority} | Est. ${job.estimatedMinutes ?? 60} min`);
      lines.push(`  → Skills required: ${job.requiredSkills.join(", ")}`);
      lines.push("");
    }
  }

  if (plan.unassigned.length > 0) {
    lines.push("UNASSIGNED JOBS (no qualified tech available):");
    for (const jobId of plan.unassigned) {
      const job = jobMap.get(jobId);
      if (job) {
        lines.push(`  - ${job.customerName}: ${job.problem} (${job.priority})`);
      }
    }
  }

  return lines.join("\n");
}

const BRIEFINGS_SYSTEM_PROMPT = `You are a dispatch coordinator for an HVAC company.
Write a professional morning briefing for each technician based on their assigned jobs.
Each briefing should include: the customer's issue in plain English, the exact address, what tools/parts to likely bring (infer from the problem), and a short encouraging note.
Be specific and practical — a tech should be able to read this and go straight to work.

=== HVAC FIELD KNOWLEDGE ===
Common causes by symptom:
- "Not blowing cold" / no-cool: Check refrigerant charge first (R-410A on post-2010, R-22 on pre-2010), then condenser coils, then compressor.
- "Breaker tripping": Likely compressor drawing locked-rotor amps — check capacitor and contactor before condemning compressor.
- "Not holding temperature": Thermostat calibration, refrigerant charge, or duct leakage.
- "Water leak from unit": Clogged condensate drain — flush with nitrogen or shop vac.
- "Burning smell" / electrical smell: Immediate safety — check wiring harness, capacitor, contactor for burn marks BEFORE energizing.

Tools to recommend by job type:
- Refrigerant work: manifold gauge set, electronic leak detector, recovery machine, refrigerant (verify type — R-410A vs R-22)
- Electrical: multimeter, clamp meter, capacitor tester, replacement contactors
- Mini-split install: vacuum pump, line set cutter, flare tool, torque wrench
- Tune-up: fin comb, coil cleaner, condensate drain tablets
- RTU/rooftop: fall protection, additional time (add 30 min for roof access)

Return a JSON object with no markdown fences: { "sections": [{ "heading": "Tech Name", "body": "full briefing text" }] }`;

const ETAS_SYSTEM_PROMPT = `You are a customer service coordinator for an HVAC company.
Draft short, professional ETA text messages for each customer whose job is scheduled today.

=== ETA MESSAGING GUIDELINES ===
Arrival windows based on position in dispatch order:
- 1st job: "between 8 and 10 this morning"
- 2nd job: "mid-morning, around 10am–noon"
- 3rd job: "early afternoon, between noon and 2pm"
- 4th job or later: "this afternoon"
For urgent jobs: always include "we've prioritized your call"
For commercial/tenant situations: acknowledge "we understand your tenants are affected"
Keep each message under 160 characters when possible (SMS-friendly).
Never promise exact times — always give windows.
Professional but warm — confirm tech's first name.

Return a JSON object with no markdown fences: { "sections": [{ "heading": "Customer Name", "body": "message text" }] }`;

export async function generateTechBriefings(
  plan: PlanResult,
  workflow: Workflow,
  onChunk?: (partial: string) => void
): Promise<ActionOutput> {
  const summary = buildDispatchSummary(plan, workflow);

  try {
    const raw = await callGeminiStream(BRIEFINGS_SYSTEM_PROMPT, summary, {
      temperature: 0.6,
      maxOutputTokens: 3000,
    }, onChunk);
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    const jsonStr = firstBrace !== -1 && lastBrace !== -1
      ? cleaned.substring(firstBrace, lastBrace + 1)
      : cleaned;
    const parsed = JSON.parse(jsonStr) as { sections: { heading: string; body: string }[] };

    return {
      type: "briefings",
      title: "Tech Briefings — Today's Dispatch",
      sections: parsed.sections,
    };
  } catch {
    const workerMap = new Map(workflow.workers.map((w) => [w.id, w]));
    const jobMap = new Map(workflow.jobs.map((j) => [j.id, j]));
    const sections: { heading: string; body: string }[] = [];

    for (const assignment of plan.assignments) {
      const worker = workerMap.get(assignment.workerId);
      const job = jobMap.get(assignment.jobId);
      if (worker && job) {
        sections.push({
          heading: worker.name,
          body: `Job: ${job.customerName}\nAddress: ${job.address ?? "TBD"}\nIssue: ${job.problem}\nPriority: ${job.priority}\nEst. time: ${job.estimatedMinutes ?? 60} min`,
        });
      }
    }

    return {
      type: "briefings",
      title: "Tech Briefings — Today's Dispatch",
      sections,
    };
  }
}

export async function generateCustomerETAs(
  plan: PlanResult,
  workflow: Workflow,
  onChunk?: (partial: string) => void
): Promise<ActionOutput> {
  const summary = buildDispatchSummary(plan, workflow);

  try {
    const raw = await callGeminiStream(ETAS_SYSTEM_PROMPT, summary, {
      temperature: 0.6,
      maxOutputTokens: 3000,
    }, onChunk);
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    const jsonStr = firstBrace !== -1 && lastBrace !== -1
      ? cleaned.substring(firstBrace, lastBrace + 1)
      : cleaned;
    const parsed = JSON.parse(jsonStr) as { sections: { heading: string; body: string }[] };

    return {
      type: "etas",
      title: "Customer ETA Messages",
      sections: parsed.sections,
    };
  } catch {
    const workerMap = new Map(workflow.workers.map((w) => [w.id, w]));
    const jobMap = new Map(workflow.jobs.map((j) => [j.id, j]));
    const sections: { heading: string; body: string }[] = [];

    for (const assignment of plan.assignments) {
      const worker = workerMap.get(assignment.workerId);
      const job = jobMap.get(assignment.jobId);
      if (worker && job) {
        sections.push({
          heading: job.customerName,
          body: `Hi, this is your HVAC service company. ${worker.name.split(" ")[0]} is scheduled to arrive at your location today. We'll contact you when they're on their way — thank you for your patience!`,
        });
      }
    }

    return {
      type: "etas",
      title: "Customer ETA Messages",
      sections,
    };
  }
}
