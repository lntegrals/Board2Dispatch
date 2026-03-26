export type Priority = "urgent" | "high" | "normal" | "low";
export type PlanningStatus = "unassigned" | "assigned" | "en_route" | "done";
export type WorkerStatus = "available" | "busy" | "en_route" | "offline";

export interface Worker {
  id: string;
  name: string;
  skills: string[];
  status: WorkerStatus;
  currentJobId?: string;
}

export interface Job {
  id: string;
  customerName: string;
  problem: string;
  priority: Priority;
  requiredSkills: string[];
  address?: string;
  estimatedMinutes?: number;
  status: PlanningStatus;
  assignedWorkerId?: string;
  assignedWorkerName?: string;
  score?: number;
}

export interface Rule {
  id: string;
  condition: string;
  action: string;
}

export interface Workflow {
  workers: Worker[];
  jobs: Job[];
  rules: Rule[];
}

export interface AssignmentResult {
  jobId: string;
  workerId: string;
  workerName: string;
  score: number;
  scoreDetail: {
    skillMatch: boolean;
    availabilityOk: boolean;
    priorityBonus: number;
    messages: string[];
  };
}

export interface PlanResult {
  assignments: AssignmentResult[];
  unassigned: string[];
  conflicts: string[];
}

export type AppPhase = "intake" | "review" | "dispatch";

export interface DailyContext {
  typedText: string;
  transcribedText: string;
  imageExtractedText: string;
  rulesText: string;
  mergedText: string;
}

export interface FollowUpQuestion {
  id: string;
  question: string;
  answer: string;
}

export type ScenarioType = "tech_unavailable" | "new_emergency" | "customer_escalated" | "rebalance";

export interface ScenarioDelta {
  assignmentsChanged: number;
  jobsDelayed: number;
  unassignedCount: number;
  description: string;
}

export interface JobExplanation {
  jobId: string;
  summary: string;
  bullets: string[];
}

export interface ActionOutput {
  type: "briefings" | "etas";
  title: string;
  sections: { heading: string; body: string }[];
}

export interface DispatchWarning {
  message: string;
  severity: "info" | "caution" | "alert";
}

export interface ParseResult {
  workflow: Workflow;
  followUps: FollowUpQuestion[];
  warnings: DispatchWarning[];
}
