/**
 * Board2Dispatch Planner
 *
 * Ported from EasyDispatch (alibaba/easydispatch) heuristic real-time agent.
 * Uses a weighted scoring system adapted for HVAC dispatch:
 *   - Skill matching (hard constraint, VETO on mismatch)
 *   - Worker availability (hard constraint)
 *   - Priority boost (urgent jobs score higher)
 *   - Rule evaluation (condition → action plugins)
 */

import type {
  Workflow,
  Job,
  Worker,
  Rule,
  AssignmentResult,
  PlanResult,
} from "./types";

// ---------------------------------------------------------------------------
// Rule engine
// ---------------------------------------------------------------------------

interface RuleContext {
  job: Job;
  worker: Worker;
  allJobs: Job[];
}

function evaluateRule(rule: Rule, ctx: RuleContext): number {
  const condition = rule.condition.toLowerCase();
  const action = rule.action.toLowerCase();
  const { job, worker } = ctx;

  // "urgent jobs go to senior tech" style rules
  if (
    condition.includes("urgent") &&
    job.priority === "urgent" &&
    action.includes("senior")
  ) {
    const isSenior =
      worker.skills.some((s) => s.toLowerCase().includes("senior")) ||
      worker.name.toLowerCase().includes("senior");
    return isSenior ? 2.0 : -0.5;
  }

  // "commercial jobs need commercial cert" style rules
  if (
    condition.includes("commercial") &&
    job.problem.toLowerCase().includes("commercial")
  ) {
    const hasCert = worker.skills.some(
      (s) =>
        s.toLowerCase().includes("commercial") ||
        s.toLowerCase().includes("cert")
    );
    if (action.includes("require") || action.includes("must")) {
      return hasCert ? 1.0 : -1; // VETO
    }
  }

  // "don't assign more than 3 jobs" style rules
  const maxJobMatch = action.match(/(\d+)\s*jobs?/);
  if (maxJobMatch && (condition.includes("max") || condition.includes("limit"))) {
    const max = parseInt(maxJobMatch[1]);
    const workerJobCount = ctx.allJobs.filter(
      (j) => j.assignedWorkerId === worker.id && j.status !== "done"
    ).length;
    if (workerJobCount >= max) return -1; // VETO
  }

  // "prefer local" — no location data in MVP, neutral
  return 0;
}

function applyRules(
  job: Job,
  worker: Worker,
  rules: Rule[],
  allJobs: Job[]
): { score: number; messages: string[] } {
  let totalScore = 0;
  const messages: string[] = [];

  for (const rule of rules) {
    const delta = evaluateRule(rule, { job, worker, allJobs });
    if (delta <= -1) {
      messages.push(`Rule VETO: "${rule.condition} → ${rule.action}"`);
      return { score: -Infinity, messages };
    }
    totalScore += delta;
    if (delta !== 0) {
      messages.push(
        `Rule +${delta.toFixed(1)}: "${rule.condition} → ${rule.action}"`
      );
    }
  }

  return { score: totalScore, messages };
}

// ---------------------------------------------------------------------------
// Skill matching — EasyDispatch two-level validation
// ---------------------------------------------------------------------------

function skillScore(job: Job, worker: Worker): number {
  if (job.requiredSkills.length === 0) return 1.0;

  const workerSkillsNorm = worker.skills.map((s) => s.toLowerCase());

  for (const required of job.requiredSkills) {
    const reqNorm = required.toLowerCase();
    const matched = workerSkillsNorm.some(
      (ws) => ws.includes(reqNorm) || reqNorm.includes(ws)
    );
    if (!matched) return -Infinity; // hard VETO
  }

  // Bonus for exact matches
  const exactMatches = job.requiredSkills.filter((req) =>
    workerSkillsNorm.includes(req.toLowerCase())
  ).length;

  return 1.0 + exactMatches * 0.3;
}

// ---------------------------------------------------------------------------
// Priority scoring
// ---------------------------------------------------------------------------

const PRIORITY_WEIGHTS: Record<string, number> = {
  urgent: 4.0,
  high: 2.0,
  normal: 1.0,
  low: 0.5,
};

// ---------------------------------------------------------------------------
// Availability — simple: workers already assigned get a light penalty
// ---------------------------------------------------------------------------

function availabilityScore(worker: Worker, currentAssignments: Map<string, number>): number {
  const load = currentAssignments.get(worker.id) ?? 0;

  if (worker.status === "offline") return -Infinity;
  if (worker.status === "busy") return -0.5; // can still assign, penalty
  if (load >= 3) return -Infinity; // hard cap per EasyDispatch WasteSpaceCheck

  return 1.0 - load * 0.3;
}

// ---------------------------------------------------------------------------
// Core: score a single worker→job pair
// ---------------------------------------------------------------------------

function scoreAssignment(
  job: Job,
  worker: Worker,
  rules: Rule[],
  currentAssignments: Map<string, number>,
  allJobs: Job[]
): { score: number; detail: AssignmentResult["scoreDetail"] } {
  const messages: string[] = [];

  // Hard constraint: skill match
  const skill = skillScore(job, worker);
  if (!isFinite(skill)) {
    return {
      score: -Infinity,
      detail: { skillMatch: false, availabilityOk: true, priorityBonus: 0, messages: ["Skill mismatch — VETO"] },
    };
  }

  // Hard constraint: availability
  const avail = availabilityScore(worker, currentAssignments);
  if (!isFinite(avail)) {
    return {
      score: -Infinity,
      detail: { skillMatch: true, availabilityOk: false, priorityBonus: 0, messages: ["Worker unavailable — VETO"] },
    };
  }

  // Priority weight
  const priority = PRIORITY_WEIGHTS[job.priority] ?? 1.0;

  // Rule plugins
  const { score: ruleScore, messages: ruleMessages } = applyRules(job, worker, rules, allJobs);
  messages.push(...ruleMessages);

  if (!isFinite(ruleScore)) {
    return {
      score: -Infinity,
      detail: { skillMatch: true, availabilityOk: true, priorityBonus: priority, messages },
    };
  }

  const finalScore = skill + avail + priority + ruleScore;

  return {
    score: finalScore,
    detail: {
      skillMatch: true,
      availabilityOk: true,
      priorityBonus: priority,
      messages,
    },
  };
}

// ---------------------------------------------------------------------------
// planDispatch — main entry point
// ---------------------------------------------------------------------------

export function planDispatch(workflow: Workflow): PlanResult {
  const { workers, jobs, rules } = workflow;

  const assignments: AssignmentResult[] = [];
  const unassigned: string[] = [];
  const conflicts: string[] = [];

  // Track how many jobs are currently assigned to each worker (this session)
  const currentAssignments = new Map<string, number>();
  workers.forEach((w) => currentAssignments.set(w.id, 0));

  // Sort jobs: urgent first, then by priority weight descending
  const sorted = [...jobs].sort(
    (a, b) => (PRIORITY_WEIGHTS[b.priority] ?? 1) - (PRIORITY_WEIGHTS[a.priority] ?? 1)
  );

  // Running list of jobs with their tentative assignments (for rule evaluation)
  const jobsWithAssignments: Job[] = jobs.map((j) => ({ ...j }));

  for (const job of sorted) {
    if (job.status === "done") continue;

    // Score every available worker
    const candidates: Array<{ worker: Worker; score: number; detail: AssignmentResult["scoreDetail"] }> = [];

    for (const worker of workers) {
      const { score, detail } = scoreAssignment(
        job,
        worker,
        rules,
        currentAssignments,
        jobsWithAssignments
      );

      if (isFinite(score) && score > 0) {
        candidates.push({ worker, score, detail });
      }
    }

    if (candidates.length === 0) {
      unassigned.push(job.id);
      continue;
    }

    // Rank by score descending — EasyDispatch heuristic greedy
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    // Check for conflict: two urgent jobs, same worker
    const existing = currentAssignments.get(best.worker.id) ?? 0;
    if (existing >= 2 && job.priority === "urgent") {
      conflicts.push(
        `${job.id}: Worker ${best.worker.name} is overloaded but is still the best candidate`
      );
    }

    // Commit assignment
    currentAssignments.set(best.worker.id, existing + 1);

    // Update running state for rule evaluation
    const idx = jobsWithAssignments.findIndex((j) => j.id === job.id);
    if (idx >= 0) {
      jobsWithAssignments[idx].assignedWorkerId = best.worker.id;
    }

    assignments.push({
      jobId: job.id,
      workerId: best.worker.id,
      workerName: best.worker.name,
      score: best.score,
      scoreDetail: best.detail,
    });
  }

  return { assignments, unassigned, conflicts };
}

// ---------------------------------------------------------------------------
// applyPlanToWorkflow — merge plan results back into workflow state
// ---------------------------------------------------------------------------

export function applyPlanToWorkflow(
  workflow: Workflow,
  plan: PlanResult
): Workflow {
  const assignmentMap = new Map(plan.assignments.map((a) => [a.jobId, a]));

  const updatedJobs = workflow.jobs.map((job) => {
    const assignment = assignmentMap.get(job.id);
    if (assignment) {
      return {
        ...job,
        status: "assigned" as const,
        assignedWorkerId: assignment.workerId,
        assignedWorkerName: assignment.workerName,
        score: assignment.score,
      };
    }
    if (plan.unassigned.includes(job.id)) {
      return { ...job, status: "unassigned" as const, assignedWorkerId: undefined, assignedWorkerName: undefined };
    }
    return job;
  });

  const assignedWorkerIds = new Set(plan.assignments.map((a) => a.workerId));
  const updatedWorkers = workflow.workers.map((w) => ({
    ...w,
    status: assignedWorkerIds.has(w.id)
      ? ("busy" as const)
      : w.status === "busy"
      ? ("available" as const)
      : w.status,
  }));

  return { ...workflow, jobs: updatedJobs, workers: updatedWorkers };
}
