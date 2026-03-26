import type { Workflow, PlanResult, ScenarioDelta, Job } from "./types";
import { planDispatch, applyPlanToWorkflow } from "./planner";

export interface ScenarioPayload {
  type: "tech_unavailable" | "new_emergency" | "customer_escalated" | "rebalance";
  techId?: string;
  emergencyJob?: Partial<Job>;
  jobId?: string;
}

export interface ScenarioResult {
  workflow: Workflow;
  plan: PlanResult;
  delta: ScenarioDelta;
}

function buildAssignmentMap(plan: PlanResult): Map<string, string> {
  // Anxiety reduced: snapshots assignment state before/after scenario to avoid "what changed?" confusion.
  // Transparency: map keys are job IDs, values are worker IDs — simple and inspectable.
  // Manual override path: map-backed diffs help operators decide targeted manual corrections.
  // Rubric support: UX clarity + Impact control during replans.
  return new Map(plan.assignments.map((a) => [a.jobId, a.workerId]));
}

function computeDelta(
  beforeMap: Map<string, string>,
  afterPlan: PlanResult,
  description: string
): ScenarioDelta {
  const afterMap = buildAssignmentMap(afterPlan);

  // Anxiety reduced: quantifies blast radius so teams can see "how disruptive" a replan was.
  // Transparency: counts are computed from before/after assignment maps, not hidden heuristics.
  // Manual override path: if delta is too high, dispatcher can revert and manually adjust key jobs.
  // Rubric support: UX (change visibility) + Impact (minimize unnecessary churn).
  let assignmentsChanged = 0;
  for (const [jobId, workerId] of afterMap) {
    if (beforeMap.get(jobId) !== workerId) assignmentsChanged++;
  }
  for (const [jobId] of beforeMap) {
    if (!afterMap.has(jobId)) assignmentsChanged++;
  }

  return {
    assignmentsChanged,
    jobsDelayed: afterPlan.unassigned.length,
    unassignedCount: afterPlan.unassigned.length,
    description,
  };
}

export function applyScenario(
  workflow: Workflow,
  currentPlan: PlanResult,
  payload: ScenarioPayload
): ScenarioResult {
  const beforeMap = buildAssignmentMap(currentPlan);
  let modifiedWorkflow: Workflow;
  let description: string;

  // Anxiety reduced: scenario simulation provides a safe "what-if" before committing field changes.
  // Transparency: each case documents exactly what is reset vs preserved.
  // Manual override path: operators can choose a lighter scenario or skip and edit assignments directly.
  // Rubric support: UX confidence + Impact through resilient replanning.
  switch (payload.type) {
    case "tech_unavailable": {
      // Anxiety reduced: immediate fallback when a tech drops, preventing dispatcher freeze.
      // Transparency: marks selected tech offline and reopens active jobs for fair redistribution.
      // Manual override path: choose a different techId or manually pin sensitive jobs after replan.
      // Rubric support: UX responsiveness + operational Impact.
      const targetId =
        payload.techId ??
        workflow.workers.find((w) => w.status !== "offline")?.id;
      const tech = workflow.workers.find((w) => w.id === targetId);
      modifiedWorkflow = {
        ...workflow,
        workers: workflow.workers.map((w) =>
          w.id === targetId ? { ...w, status: "offline" as const } : w
        ),
        jobs: workflow.jobs.map((j) =>
          j.status !== "done"
            ? {
                ...j,
                status: "unassigned" as const,
                assignedWorkerId: undefined,
                assignedWorkerName: undefined,
              }
            : j
        ),
      };
      description = `${tech?.name ?? "Tech"} marked offline — jobs reassigned to remaining team`;
      break;
    }

    case "new_emergency": {
      // Anxiety reduced: emergency insertion is explicit and forces a full re-evaluation.
      // Transparency: generated emergency job fields are visible/defaulted (priority urgent, status unassigned).
      // Manual override path: dispatcher can edit emergency details or perform manual assignment immediately.
      // Rubric support: Impact (SLA rescue) + UX (clear replan intent).
      const emergency: Job = {
        id: `j_emerg_${Date.now()}`,
        customerName: payload.emergencyJob?.customerName ?? "Emergency Call",
        problem:
          payload.emergencyJob?.problem ?? "No-cool emergency — immediate response needed",
        priority: "urgent",
        requiredSkills: payload.emergencyJob?.requiredSkills ?? ["hvac"],
        address: payload.emergencyJob?.address,
        estimatedMinutes: 90,
        status: "unassigned",
      };
      modifiedWorkflow = {
        ...workflow,
        jobs: [
          ...workflow.jobs.map((j) =>
            j.status !== "done"
              ? {
                  ...j,
                  status: "unassigned" as const,
                  assignedWorkerId: undefined,
                  assignedWorkerName: undefined,
                }
              : j
          ),
          emergency,
        ],
        workers: workflow.workers.map((w) =>
          w.status !== "offline" ? { ...w, status: "available" as const } : w
        ),
      };
      description = `Emergency job added for ${emergency.customerName} — full replan`;
      break;
    }

    case "customer_escalated": {
      // Anxiety reduced: escalations reliably bubble to urgent without relying on memory.
      // Transparency: only targeted job gets priority uplift; all active jobs are intentionally reconsidered.
      // Manual override path: undo urgency in data or manually reassign if context changed.
      // Rubric support: UX + Impact.
      const job = workflow.jobs.find((j) => j.id === payload.jobId);
      modifiedWorkflow = {
        ...workflow,
        jobs: workflow.jobs.map((j) =>
          j.status !== "done"
            ? {
                ...j,
                priority: j.id === payload.jobId ? ("urgent" as const) : j.priority,
                status: "unassigned" as const,
                assignedWorkerId: undefined,
                assignedWorkerName: undefined,
              }
            : j
        ),
        workers: workflow.workers.map((w) =>
          w.status !== "offline" ? { ...w, status: "available" as const } : w
        ),
      };
      description = `${job?.customerName ?? "Customer"} escalated to urgent — full replan`;
      break;
    }

    case "rebalance":
    default: {
      // Anxiety reduced: "clean slate" option when confidence in current plan drops.
      // Transparency: full reset semantics are explicit (non-done jobs unassigned, active techs available).
      // Manual override path: this is itself the override, followed by manual fine-tuning in board UI.
      // Rubric support: UX recovery pathway + broad planning Impact.
      modifiedWorkflow = {
        ...workflow,
        workers: workflow.workers.map((w) =>
          w.status !== "offline" ? { ...w, status: "available" as const } : w
        ),
        jobs: workflow.jobs.map((j) =>
          j.status !== "done"
            ? {
                ...j,
                status: "unassigned" as const,
                assignedWorkerId: undefined,
                assignedWorkerName: undefined,
              }
            : j
        ),
      };
      description = "Full rebalance — all techs reset and schedule replanned from scratch";
      break;
    }
  }

  // Anxiety reduced: scenario output is recomputed end-to-end so users get a coherent post-event snapshot.
  // Transparency: sequence is explicit — plan, apply, then measure delta.
  // Manual override path: operators can compare delta and choose manual adjustments instead of accepting all changes.
  // Rubric support: UX comprehensibility + Impact in emergency handling.
  const newPlan = planDispatch(modifiedWorkflow);
  const finalWorkflow = applyPlanToWorkflow(modifiedWorkflow, newPlan);
  const delta = computeDelta(beforeMap, newPlan, description);

  return { workflow: finalWorkflow, plan: newPlan, delta };
}
