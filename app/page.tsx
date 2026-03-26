"use client";

import { useState } from "react";
import type {
  Workflow,
  PlanningStatus,
  AppPhase,
  DailyContext,
  FollowUpQuestion,
  JobExplanation,
  ScenarioDelta,
  PlanResult,
} from "@/lib/types";
import { parseDispatchInput } from "@/lib/parser";
import { planDispatch, applyPlanToWorkflow } from "@/lib/planner";
import { buildExplanationMap } from "@/lib/explanations";
import { generateFollowUpQuestions } from "@/lib/followUpQuestions";
import { applyScenario } from "@/lib/scenarios";
import type { ScenarioPayload } from "@/lib/scenarios";
import { DEMO_WORKFLOW, DEMO_CONTEXT } from "@/lib/demoData";
import IntakePanel from "@/components/IntakePanel";
import FusionReview from "@/components/FusionReview";
import StructurePanel from "@/components/StructurePanel";
import DispatchBoard from "@/components/DispatchBoard";
import ScenarioBar from "@/components/ScenarioBar";
import ActionPanel from "@/components/ActionPanel";

const EMPTY_WORKFLOW: Workflow = { workers: [], jobs: [], rules: [] };

const EMPTY_CONTEXT: DailyContext = {
  typedText: "",
  transcribedText: "",
  imageExtractedText: "",
  rulesText: "",
  mergedText: "",
};

export default function Home() {
  const [phase, setPhase] = useState<AppPhase>("intake");
  const [dailyContext, setDailyContext] = useState<DailyContext>(EMPTY_CONTEXT);
  const [followUps, setFollowUps] = useState<FollowUpQuestion[]>([]);
  const [workflow, setWorkflow] = useState<Workflow>(EMPTY_WORKFLOW);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [explanations, setExplanations] = useState<Map<string, JobExplanation>>(new Map());
  const [scenarioDelta, setScenarioDelta] = useState<ScenarioDelta | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [intakeLoading, setIntakeLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // INTAKE → REVIEW
  const handleUnderstandToday = async (context: DailyContext) => {
    setIntakeLoading(true);
    setDailyContext(context);
    try {
      const parsed = await parseDispatchInput(context.mergedText, context.rulesText);
      setWorkflow(parsed);
      const questions = await generateFollowUpQuestions(parsed, context);
      setFollowUps(questions);
      setPhase("review");
    } catch {
      // Still proceed to review even if parsing fails
      setWorkflow(EMPTY_WORKFLOW);
      setFollowUps([]);
      setPhase("review");
    } finally {
      setIntakeLoading(false);
    }
  };

  // REVIEW → DISPATCH
  const handleBuildPlan = async (answers: FollowUpQuestion[]) => {
    setPlanLoading(true);
    try {
      // Merge any follow-up answers into the workflow context
      const answeredText = answers
        .filter((q) => q.answer.trim())
        .map((q) => `${q.question}\n${q.answer}`)
        .join("\n\n");

      let baseWorkflow = workflow;

      // If there are answered questions, reparse with the enriched context
      if (answeredText && workflow.workers.length > 0) {
        const enriched = dailyContext.mergedText + (answeredText ? `\n\n[Dispatcher clarifications]\n${answeredText}` : "");
        try {
          baseWorkflow = await parseDispatchInput(enriched, dailyContext.rulesText);
        } catch {
          baseWorkflow = workflow;
        }
      }

      // Small delay for UX
      await new Promise((r) => setTimeout(r, 300));

      const resetWorkflow: Workflow = {
        ...baseWorkflow,
        jobs: baseWorkflow.jobs.map((j) =>
          j.status === "done"
            ? j
            : { ...j, status: "unassigned", assignedWorkerId: undefined, assignedWorkerName: undefined }
        ),
        workers: baseWorkflow.workers.map((w) => ({ ...w, status: "available" as const })),
      };

      const newPlan = planDispatch(resetWorkflow);
      const updatedWorkflow = applyPlanToWorkflow(resetWorkflow, newPlan);
      const expMap = buildExplanationMap(newPlan, updatedWorkflow);

      setWorkflow(updatedWorkflow);
      setPlan(newPlan);
      setExplanations(expMap);
      setConflicts(newPlan.conflicts);
      setScenarioDelta(null);
      setPhase("dispatch");
    } finally {
      setPlanLoading(false);
    }
  };

  // Load demo — skip straight to review
  const handleLoadDemo = async () => {
    setIntakeLoading(true);
    setDailyContext(DEMO_CONTEXT);
    try {
      setWorkflow(DEMO_WORKFLOW);
      const questions = await generateFollowUpQuestions(DEMO_WORKFLOW, DEMO_CONTEXT);
      setFollowUps(questions);
      setPhase("review");
    } finally {
      setIntakeLoading(false);
    }
  };

  // Scenario replanning
  const handleScenario = (payload: ScenarioPayload) => {
    if (!plan) return;
    const result = applyScenario(workflow, plan, payload);
    setWorkflow(result.workflow);
    setPlan(result.plan);
    setExplanations(buildExplanationMap(result.plan, result.workflow));
    setConflicts(result.plan.conflicts);
    setScenarioDelta(result.delta);
  };

  // Manual dispatch re-run (from StructurePanel button)
  const handleRunDispatch = async () => {
    if (workflow.jobs.length === 0) return;
    await new Promise((r) => setTimeout(r, 300));

    const resetWorkflow: Workflow = {
      ...workflow,
      jobs: workflow.jobs.map((j) =>
        j.status === "done"
          ? j
          : { ...j, status: "unassigned", assignedWorkerId: undefined, assignedWorkerName: undefined }
      ),
      workers: workflow.workers.map((w) => ({ ...w, status: "available" as const })),
    };

    const newPlan = planDispatch(resetWorkflow);
    const updated = applyPlanToWorkflow(resetWorkflow, newPlan);
    const expMap = buildExplanationMap(newPlan, updated);

    setWorkflow(updated);
    setPlan(newPlan);
    setExplanations(expMap);
    setConflicts(newPlan.conflicts);
    setScenarioDelta(null);
  };

  const handleStatusChange = (jobId: string, status: PlanningStatus) => {
    setWorkflow((prev) => ({
      ...prev,
      jobs: prev.jobs.map((j) => (j.id === jobId ? { ...j, status } : j)),
    }));
  };

  // ── INTAKE phase ──────────────────────────────────────────────────────────
  if (phase === "intake") {
    return (
      <IntakePanel
        onSubmit={handleUnderstandToday}
        loading={intakeLoading}
        onLoadDemo={handleLoadDemo}
      />
    );
  }

  // ── REVIEW phase ──────────────────────────────────────────────────────────
  if (phase === "review") {
    return (
      <FusionReview
        context={dailyContext}
        followUps={followUps}
        workflow={workflow}
        onBuildPlan={handleBuildPlan}
        onBack={() => setPhase("intake")}
        loading={planLoading}
      />
    );
  }

  // ── DISPATCH phase ────────────────────────────────────────────────────────
  const hasAssignments = workflow.jobs.some((j) => j.status !== "unassigned");
  const urgentCount = workflow.jobs.filter((j) => j.priority === "urgent").length;
  const assignedCount = workflow.jobs.filter((j) => j.status !== "unassigned").length;

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 font-sans">
      {/* Top bar */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <span className="text-sm font-bold text-gray-900 tracking-tight">Board2Dispatch</span>
              <span className="ml-2 text-xs text-gray-400">HVAC · AI Dispatch</span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {workflow.jobs.length > 0 && (
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="tabular-nums">
                  <strong className="text-gray-700">{workflow.workers.length}</strong> techs
                </span>
                <span className="text-gray-200">|</span>
                <span className="tabular-nums">
                  <strong className="text-gray-700">{workflow.jobs.length}</strong> jobs
                </span>
                {urgentCount > 0 && (
                  <>
                    <span className="text-gray-200">|</span>
                    <span className="tabular-nums text-red-500 font-medium">
                      {urgentCount} urgent
                    </span>
                  </>
                )}
                {hasAssignments && (
                  <>
                    <span className="text-gray-200">|</span>
                    <span className="tabular-nums text-emerald-600 font-medium">
                      {assignedCount} dispatched
                    </span>
                  </>
                )}
              </div>
            )}
            <button
              onClick={() => setPhase("intake")}
              className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
            >
              ← New day
            </button>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-gray-400">Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main dispatch layout */}
      <main className="max-w-screen-2xl mx-auto px-6 py-6 h-[calc(100vh-56px)] flex gap-5">

        {/* LEFT: Advanced / StructurePanel — collapsible */}
        {showAdvanced && (
          <div className="w-[300px] flex-shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col overflow-hidden phase-fade-in">
            <div className="mb-3 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Advanced</h2>
                <p className="text-xs text-gray-400 mt-0.5">Edit Team &amp; Jobs</p>
              </div>
              <button
                onClick={() => setShowAdvanced(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <StructurePanel
                workflow={workflow}
                onChange={setWorkflow}
                onRunDispatch={handleRunDispatch}
                hasAssignments={hasAssignments}
                planLoading={false}
              />
            </div>
          </div>
        )}

        {/* CENTER: Controls + ScenarioBar + ActionPanel */}
        <div className="w-[280px] flex-shrink-0 flex flex-col gap-4">
          {/* Advanced toggle */}
          {!showAdvanced && (
            <button
              onClick={() => setShowAdvanced(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 text-xs text-gray-500 font-medium shadow-sm transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Advanced — Edit Team &amp; Jobs
            </button>
          )}

          {/* Scenario section */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Scenarios</p>
            {plan && (
              <ScenarioBar
                workflow={workflow}
                plan={plan}
                onApply={handleScenario}
                delta={scenarioDelta}
                onDismissDelta={() => setScenarioDelta(null)}
              />
            )}
          </div>

          {/* Actions section */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Actions</p>
            {plan && (
              <ActionPanel plan={plan} workflow={workflow} />
            )}
          </div>
        </div>

        {/* RIGHT: Dispatch Board */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col overflow-hidden flex-1">
          <DispatchBoard
            jobs={workflow.jobs}
            onStatusChange={handleStatusChange}
            conflicts={conflicts}
            explanations={explanations}
            scenarioDelta={scenarioDelta}
          />
        </div>
      </main>
    </div>
  );
}
