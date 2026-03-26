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
  return new Map(plan.assignments.map((a) => [a.jobId, a.workerId]));
}

function computeDelta(
  beforeMap: Map<string, string>,
  afterPlan: PlanResult,
  description: string
): ScenarioDelta {
  const afterMap = buildAssignmentMap(afterPlan);

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

  switch (payload.type) {
    case "tech_unavailable": {
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

  const newPlan = planDispatch(modifiedWorkflow);
  const finalWorkflow = applyPlanToWorkflow(modifiedWorkflow, newPlan);
  const delta = computeDelta(beforeMap, newPlan, description);

  return { workflow: finalWorkflow, plan: newPlan, delta };
}
