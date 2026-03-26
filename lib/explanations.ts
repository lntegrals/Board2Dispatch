import type { AssignmentResult, Job, Worker, JobExplanation, PlanResult, Workflow } from "./types";

export function generateExplanation(
  assignment: AssignmentResult,
  job: Job,
  worker: Worker
): JobExplanation {
  const bullets: string[] = [];

  if (assignment.scoreDetail.skillMatch) {
    if (job.requiredSkills.length > 0) {
      bullets.push(
        `${worker.name} has ${job.requiredSkills.join(", ")} — all required skills covered`
      );
    } else {
      bullets.push(`${worker.name} is qualified for this job type`);
    }
  }

  if (assignment.scoreDetail.availabilityOk) {
    const statusLabel =
      worker.status === "available"
        ? "available and ready to dispatch"
        : worker.status === "busy"
        ? "busy but can accommodate this job"
        : "best available option";
    bullets.push(`${worker.name} is ${statusLabel}`);
  }

  const priorityBonus = assignment.scoreDetail.priorityBonus;
  if (priorityBonus >= 4) {
    bullets.push("Urgent priority — dispatched immediately, same-day response required");
  } else if (priorityBonus >= 2) {
    bullets.push("High priority — must be completed today");
  } else if (priorityBonus >= 1) {
    bullets.push("Normal priority — scheduled service call");
  } else {
    bullets.push("Low priority — maintenance or non-urgent service");
  }

  for (const msg of assignment.scoreDetail.messages) {
    if (!msg.includes("VETO") && msg.trim()) {
      const clean = msg.replace(/^Rule \+[\d.]+:\s*/, "").replace(/"/g, "").trim();
      if (clean && !bullets.some((b) => b.includes(clean.slice(0, 20)))) {
        bullets.push(clean);
      }
    }
  }

  const summary = bullets[0] ?? `${worker.name} assigned (score: ${assignment.score.toFixed(1)})`;

  return {
    jobId: job.id,
    summary,
    bullets: bullets.slice(0, 4),
  };
}

export function buildExplanationMap(
  plan: PlanResult,
  workflow: Workflow
): Map<string, JobExplanation> {
  const map = new Map<string, JobExplanation>();
  const workerMap = new Map(workflow.workers.map((w) => [w.id, w]));
  const jobMap = new Map(workflow.jobs.map((j) => [j.id, j]));

  for (const assignment of plan.assignments) {
    const job = jobMap.get(assignment.jobId);
    const worker = workerMap.get(assignment.workerId);
    if (job && worker) {
      map.set(assignment.jobId, generateExplanation(assignment, job, worker));
    }
  }

  return map;
}
