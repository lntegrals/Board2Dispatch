import type { PlanResult, Workflow, ActionOutput } from "./types";

function fallbackBriefings(plan: PlanResult, workflow: Workflow): ActionOutput {
  const workerMap = new Map(workflow.workers.map((w) => [w.id, w]));
  const jobMap = new Map(workflow.jobs.map((j) => [j.id, j]));
  const sections: { heading: string; body: string }[] = [];

  for (const assignment of plan.assignments) {
    const worker = workerMap.get(assignment.workerId);
    const job = jobMap.get(assignment.jobId);
    if (!worker || !job) continue;
    sections.push({
      heading: worker.name,
      body: `Job: ${job.customerName}\nAddress: ${job.address ?? "TBD"}\nIssue: ${job.problem}\nPriority: ${job.priority}\nEst. time: ${job.estimatedMinutes ?? 60} min`,
    });
  }

  return {
    type: "briefings",
    title: "Tech Briefings — Today's Dispatch",
    sections,
  };
}

function fallbackEtas(plan: PlanResult, workflow: Workflow): ActionOutput {
  const workerMap = new Map(workflow.workers.map((w) => [w.id, w]));
  const jobMap = new Map(workflow.jobs.map((j) => [j.id, j]));
  const sections: { heading: string; body: string }[] = [];

  for (const assignment of plan.assignments) {
    const worker = workerMap.get(assignment.workerId);
    const job = jobMap.get(assignment.jobId);
    if (!worker || !job) continue;
    sections.push({
      heading: job.customerName,
      body: `Hi, this is your HVAC service company. ${worker.name.split(" ")[0]} is scheduled to arrive today. We'll contact you when they're on their way — thank you for your patience!`,
    });
  }

  return {
    type: "etas",
    title: "Customer ETA Messages",
    sections,
  };
}

async function requestAction(kind: "briefings" | "etas", plan: PlanResult, workflow: Workflow): Promise<ActionOutput> {
  const response = await fetch("/api/ai/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, plan, workflow }),
  });

  if (!response.ok) {
    throw new Error(`Action route error: ${response.status}`);
  }

  const data = (await response.json()) as { output?: { sections?: { heading: string; body: string }[] } };
  const sections = data.output?.sections;
  if (!sections || !Array.isArray(sections)) {
    throw new Error("Invalid action payload");
  }

  return {
    type: kind,
    title: kind === "briefings" ? "Tech Briefings — Today's Dispatch" : "Customer ETA Messages",
    sections,
  };
}

export async function generateTechBriefings(
  plan: PlanResult,
  workflow: Workflow,
  onChunk?: (partial: string) => void
): Promise<ActionOutput> {
  void onChunk;
  try {
    return await requestAction("briefings", plan, workflow);
  } catch {
    return fallbackBriefings(plan, workflow);
  }
}

export async function generateCustomerETAs(
  plan: PlanResult,
  workflow: Workflow,
  onChunk?: (partial: string) => void
): Promise<ActionOutput> {
  void onChunk;
  try {
    return await requestAction("etas", plan, workflow);
  } catch {
    return fallbackEtas(plan, workflow);
  }
}
