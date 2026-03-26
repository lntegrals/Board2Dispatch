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
