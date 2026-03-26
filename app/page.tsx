"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  Workflow,
  PlanningStatus,
  AppPhase,
  DailyContext,
  FollowUpQuestion,
  JobExplanation,
  ScenarioDelta,
  PlanResult,
  DispatchWarning,
} from "@/lib/types";
import { parseDispatchInput, DEFAULT_QUESTIONS } from "@/lib/parser";
import { planDispatch, applyPlanToWorkflow } from "@/lib/planner";
import { buildExplanationMap } from "@/lib/explanations";
import { applyScenario } from "@/lib/scenarios";
import type { ScenarioPayload } from "@/lib/scenarios";
import { DEMO_WORKFLOW, DEMO_CONTEXT } from "@/lib/demoData";
import { decodeShareState } from "@/lib/shareState";
import IntakePanel from "@/components/IntakePanel";
import FusionReview from "@/components/FusionReview";
import StructurePanel from "@/components/StructurePanel";
import DispatchBoard from "@/components/DispatchBoard";
import ScenarioBar from "@/components/ScenarioBar";
import ActionPanel from "@/components/ActionPanel";
import VoiceCommandBar from "@/components/VoiceCommandBar";
import GeneratingScreen from "@/components/GeneratingScreen";
import type { VoiceCommand } from "@/lib/voiceCommands";

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
  const [warnings, setWarnings] = useState<DispatchWarning[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [intakeLoading, setIntakeLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [triggerGenerate, setTriggerGenerate] = useState<"briefings" | "etas" | null>(null);
  const [highlightJobId, setHighlightJobId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable refs for voice command handler (avoids stale closure)
  const workflowRef = useRef(workflow);
  const planRef = useRef(plan);
  useEffect(() => { workflowRef.current = workflow; }, [workflow]);
  useEffect(() => { planRef.current = plan; }, [plan]);

  // Restore shared board state from URL on first load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("board");
    if (!shared) return;
    const state = decodeShareState(shared);
    if (!state) return;
    setWorkflow(state.workflow);
    setPlan(state.plan);
    setExplanations(buildExplanationMap(state.plan, state.workflow));
    setConflicts(state.plan.conflicts);
    setPhase("dispatch");
    // Clean the URL so refreshing doesn't re-load stale shared state
    const clean = new URL(window.location.href);
    clean.searchParams.delete("board");
    window.history.replaceState({}, "", clean.toString());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // INTAKE → REVIEW
  const handleUnderstandToday = async (context: DailyContext) => {
    setIntakeLoading(true);
    setDailyContext(context);
    setParseError(null);
    try {
      const result = await parseDispatchInput(context.mergedText, context.rulesText);
      setWorkflow(result.workflow);
      setFollowUps(result.followUps);
      setWarnings(result.warnings);
      setPhase("review");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setParseError(msg);
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
          const result = await parseDispatchInput(enriched, dailyContext.rulesText);
          baseWorkflow = result.workflow;
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

  // Load demo — skip straight to review (no API call needed)
  const handleLoadDemo = () => {
    setDailyContext(DEMO_CONTEXT);
    setWorkflow(DEMO_WORKFLOW);
    setFollowUps(DEFAULT_QUESTIONS);
    setWarnings([]);
    setPhase("review");
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

  const handleVoiceCommand = useCallback((command: VoiceCommand) => {
    const currentWorkflow = workflowRef.current;
    const currentPlan = planRef.current;

    switch (command.type) {
      case "status_change":
        if (command.params.jobId && command.params.status) {
          const status = command.params.status;
          const jobId = command.params.jobId;
          setWorkflow((prev) => ({
            ...prev,
            jobs: prev.jobs.map((j) => (j.id === jobId ? { ...j, status } : j)),
          }));
          // Flash the card that moved
          if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
          setHighlightJobId(jobId);
          highlightTimerRef.current = setTimeout(() => setHighlightJobId(null), 2000);
        }
        break;
      case "tech_unavailable": {
        if (!currentPlan || !command.params.techId) break;
        const result = applyScenario(currentWorkflow, currentPlan, {
          type: "tech_unavailable",
          techId: command.params.techId,
        });
        setWorkflow(result.workflow);
        setPlan(result.plan);
        setExplanations(buildExplanationMap(result.plan, result.workflow));
        setConflicts(result.plan.conflicts);
        setScenarioDelta(result.delta);
        break;
      }
      case "new_emergency": {
        if (!currentPlan) break;
        const result = applyScenario(currentWorkflow, currentPlan, {
          type: "new_emergency",
          emergencyJob: {
            customerName: command.params.emergencyCustomerName,
            problem: command.params.emergencyProblem,
            address: command.params.emergencyAddress,
          },
        });
        setWorkflow(result.workflow);
        setPlan(result.plan);
        setExplanations(buildExplanationMap(result.plan, result.workflow));
        setConflicts(result.plan.conflicts);
        setScenarioDelta(result.delta);
        break;
      }
      case "customer_escalated": {
        if (!currentPlan || !command.params.jobId) break;
        const result = applyScenario(currentWorkflow, currentPlan, {
          type: "customer_escalated",
          jobId: command.params.jobId,
        });
        setWorkflow(result.workflow);
        setPlan(result.plan);
        setExplanations(buildExplanationMap(result.plan, result.workflow));
        setConflicts(result.plan.conflicts);
        setScenarioDelta(result.delta);
        break;
      }
      case "rebalance": {
        if (!currentPlan) break;
        const result = applyScenario(currentWorkflow, currentPlan, { type: "rebalance" });
        setWorkflow(result.workflow);
        setPlan(result.plan);
        setExplanations(buildExplanationMap(result.plan, result.workflow));
        setConflicts(result.plan.conflicts);
        setScenarioDelta(result.delta);
        break;
      }
      case "reassign": {
        const { techId, jobIds, jobId } = command.params;
        if (!techId) break;
        const ids = jobIds?.length ? jobIds : jobId ? [jobId] : [];
        if (ids.length === 0) break;
        setWorkflow((prev) => {
          const worker = prev.workers.find((w) => w.id === techId);
          if (!worker) return prev;
          return {
            ...prev,
            jobs: prev.jobs.map((j) =>
              ids.includes(j.id)
                ? { ...j, status: "assigned" as const, assignedWorkerId: worker.id, assignedWorkerName: worker.name }
                : j
            ),
          };
        });
        break;
      }
      case "generate_briefings":
        setTriggerGenerate("briefings");
        break;
      case "generate_etas":
        setTriggerGenerate("etas");
        break;
      // query: answer already spoken by VoiceCommandBar via speechSynthesis
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── INTAKE phase ──────────────────────────────────────────────────────────
  if (intakeLoading) {
    return <GeneratingScreen mode="intake" />;
  }

  if (phase === "intake") {
    return (
      <IntakePanel
        onSubmit={handleUnderstandToday}
        loading={intakeLoading}
        onLoadDemo={handleLoadDemo}
        error={parseError}
      />
    );
  }

  // ── REVIEW phase ──────────────────────────────────────────────────────────
  if (planLoading) {
    return <GeneratingScreen mode="plan" />;
  }

  if (phase === "review") {
    return (
      <FusionReview
        context={dailyContext}
        followUps={followUps}
        workflow={workflow}
        warnings={warnings}
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
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="text-sm font-bold text-gray-900 tracking-tight">Board2Dispatch</span>
              <span className="ml-2 text-xs text-gray-400 hidden sm:inline">HVAC · AI Dispatch</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            {workflow.jobs.length > 0 && (
              <div className="hidden md:flex items-center gap-4 text-xs text-gray-400">
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
              className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors whitespace-nowrap"
            >
              ← New day
            </button>
            <div className="hidden sm:flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-gray-400">Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main dispatch layout */}
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 min-h-[calc(100vh-56px)] flex flex-col lg:flex-row gap-4 sm:gap-5">

        {/* LEFT: Advanced / StructurePanel — collapsible */}
        {showAdvanced && (
          <div className="w-full lg:w-[300px] lg:flex-shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 flex flex-col overflow-hidden phase-fade-in max-h-[70vh] lg:max-h-none">
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
        <div className="w-full lg:w-[280px] lg:flex-shrink-0 flex flex-col gap-4">
          {/* Advanced toggle */}
          {!showAdvanced && (
            <button
              onClick={() => setShowAdvanced(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 text-xs text-gray-500 font-medium shadow-sm transition-all w-full"
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
              <ActionPanel
                plan={plan}
                workflow={workflow}
                triggerGenerate={triggerGenerate}
                onTriggerConsumed={() => setTriggerGenerate(null)}
              />
            )}
          </div>
        </div>

        {/* RIGHT: Dispatch Board */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 flex flex-col overflow-hidden flex-1 min-h-[420px]">
          <DispatchBoard
            jobs={workflow.jobs}
            onStatusChange={handleStatusChange}
            conflicts={conflicts}
            explanations={explanations}
            scenarioDelta={scenarioDelta}
            highlightJobId={highlightJobId}
          />
        </div>
      </main>

      {/* Voice Command — floating overlay, outside scroll context */}
      {plan && (
        <VoiceCommandBar
          workflow={workflow}
          plan={plan}
          onCommand={handleVoiceCommand}
        />
      )}
    </div>
  );
}
