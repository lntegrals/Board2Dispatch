import type { PlanResult, Workflow, ActionOutput } from "./types";
import { callGeminiText } from "./gemini";

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

export async function generateTechBriefings(
  plan: PlanResult,
  workflow: Workflow
): Promise<ActionOutput> {
  const summary = buildDispatchSummary(plan, workflow);

  try {
    const systemPrompt = `You are a dispatch coordinator for an HVAC company.
Write a professional morning briefing for each technician based on their assigned jobs.
Each briefing should include: the customer's issue in plain English, the exact address, what tools/parts to likely bring (infer from the problem), and a short encouraging note.
Be specific and practical — a tech should be able to read this and go straight to work.
Return a JSON object with no markdown fences: { "sections": [{ "heading": "Tech Name", "body": "full briefing text" }] }`;

    const raw = await callGeminiText(systemPrompt, summary, {
      temperature: 0.6,
      maxOutputTokens: 3000,
    });
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as { sections: { heading: string; body: string }[] };

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
  workflow: Workflow
): Promise<ActionOutput> {
  const summary = buildDispatchSummary(plan, workflow);

  try {
    const systemPrompt = `You are a customer service coordinator for an HVAC company.
Draft short, professional ETA text messages for each customer whose job is scheduled today.
Each message should: confirm the technician's first name, give a friendly estimated arrival window (use "this morning", "late morning", "this afternoon", etc.), and be reassuring.
Keep each message under 3 sentences. Professional but warm.
Return a JSON object with no markdown fences: { "sections": [{ "heading": "Customer Name", "body": "message text" }] }`;

    const raw = await callGeminiText(systemPrompt, summary, {
      temperature: 0.6,
      maxOutputTokens: 3000,
    });
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as { sections: { heading: string; body: string }[] };

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
