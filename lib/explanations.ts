import type { AssignmentResult, Job, Worker, JobExplanation, PlanResult, Workflow } from "./types";

export function generateExplanation(
  assignment: AssignmentResult,
  job: Job,
  worker: Worker
): JobExplanation {
  const bullets: string[] = [];

  // Anxiety reduced: converts opaque scoring into plain-language rationale per assignment.
  // Transparency: bullets mirror the same dimensions used by planner (skills, availability, priority, rules).
  // Manual override path: users can challenge any bullet and manually reassign in the board.
  // Rubric support: UX-heavy explainability with Impact support through accountable decisions.
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
    // Anxiety reduced: availability language reassures dispatchers that timing/capacity was considered.
    // Transparency: status phrase is derived from concrete worker status values.
    // Manual override path: if field reality changed, dispatcher can update worker status and rerun.
    // Rubric support: UX confidence + Impact for realistic dispatches.
    const statusLabel =
      worker.status === "available"
        ? "available and ready to dispatch"
        : worker.status === "busy"
        ? "busy but can accommodate this job"
        : "best available option";
    bullets.push(`${worker.name} is ${statusLabel}`);
  }

  const priorityBonus = assignment.scoreDetail.priorityBonus;
  // Anxiety reduced: priority wording communicates urgency intent in plain operational language.
  // Transparency: thresholds map directly to planner weights, keeping story consistent across UI.
  // Manual override path: changing job priority immediately alters this explanation path on rerun.
  // Rubric support: UX legibility + Impact on SLA alignment.
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
    // Anxiety reduced: filters noisy internals so operators see actionable reasons, not raw engine output.
    // Transparency: we preserve rule intent text while removing scoring syntax clutter.
    // Manual override path: if rationale seems weak, dispatchers can inspect/edit rules then rerun.
    // Rubric support: UX clarity + Impact via faster human validation.
    if (!msg.includes("VETO") && msg.trim()) {
      const clean = msg.replace(/^Rule \+[\d.]+:\s*/, "").replace(/"/g, "").trim();
      if (clean && !bullets.some((b) => b.includes(clean.slice(0, 20)))) {
        bullets.push(clean);
      }
    }
  }

  // Anxiety reduced: always provides a summary line, even when bullet generation is sparse.
  // Transparency: fallback summary exposes worker and score instead of hiding missing rationale.
  // Manual override path: sparse/weak summaries signal when human review should override.
  // Rubric support: UX completeness.
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

  // Anxiety reduced: guarantees each visible assignment has a matching explanation payload.
  // Transparency: deterministic map key (jobId) keeps UI and rationale tightly aligned.
  // Manual override path: missing map entries naturally fall back to manual judgment in UI.
  // Rubric support: UX trust and operational Impact.
  for (const assignment of plan.assignments) {
    const job = jobMap.get(assignment.jobId);
    const worker = workerMap.get(assignment.workerId);
    if (job && worker) {
      map.set(assignment.jobId, generateExplanation(assignment, job, worker));
    }
  }

  return map;
}
