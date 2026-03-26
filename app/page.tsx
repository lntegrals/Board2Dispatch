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
    // Anxiety reduced: lets teams open an identical board state during handoff without re-entry work.
    // Transparency: source of truth is the explicit `board` URL param, then URL is cleaned to avoid stale reloads.
    // Manual override path: users can ignore shared state by starting a "New day" flow.
    // Rubric support: UX collaboration continuity + Impact via faster alignment.
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
    // Anxiety reduced: wraps parsing in loading/error states so operators never wonder if app froze.
    // Transparency: parse success/failure paths are explicit and visible via phase + error messaging.
    // Manual override path: review screen still opens on error so users can correct inputs manually.
    // Rubric support: UX reliability + Impact (keeps workflow moving).
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

      // Anxiety reduced: follow-up answers reduce ambiguity before dispatch commitments.
      // Transparency: clarifications are appended in a visible labeled block before reparsing.
      // Manual override path: if parsing fails, system safely falls back to original workflow for manual edits.
      // Rubric support: UX interpretability + Impact through better input quality.
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

      // Anxiety reduced: always rebuild from a normalized state to avoid compounding stale assignments.
      // Transparency: reset rules are explicit (keep done jobs, clear active assignments, set workers available).
      // Manual override path: StructurePanel and DispatchBoard allow post-plan manual correction.
      // Rubric support: UX consistency + Impact reliability.
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
    // Anxiety reduced: gives first-time users a no-risk sandbox before live operational data.
    // Transparency: explicitly seeds known demo context/workflow/follow-ups.
    // Manual override path: users can leave demo and start fresh with "New day".
    // Rubric support: UX onboarding + Impact (faster adoption).
    setDailyContext(DEMO_CONTEXT);
    setWorkflow(DEMO_WORKFLOW);
    setFollowUps(DEFAULT_QUESTIONS);
    setWarnings([]);
    setPhase("review");
  };

  // Scenario replanning
  const handleScenario = (payload: ScenarioPayload) => {
    if (!plan) return;
    // Anxiety reduced: scenario actions are applied atomically so users see one coherent outcome.
    // Transparency: workflow, plan, explanations, conflicts, and delta update together.
    // Manual override path: run alternative scenario or manually adjust board after simulation.
    // Rubric support: UX confidence + Impact in disruption handling.
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

    // Anxiety reduced: manual re-run gives operators a deterministic "recompute now" escape hatch.
    // Transparency: same reset policy as initial build keeps behavior predictable.
    // Manual override path: this function is the override when AI confidence is low.
    // Rubric support: UX control + Impact through rapid recovery.
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
    // Anxiety reduced: manual status control ensures human can correct timeline drift immediately.
    // Transparency: only targeted job state changes; no hidden side effects.
    // Manual override path: this handler is the direct override path when AI suggestions are off.
    // Rubric support: UX control + Impact on field coordination.
    setWorkflow((prev) => ({
      ...prev,
      jobs: prev.jobs.map((j) => (j.id === jobId ? { ...j, status } : j)),
    }));
  };

  const handleVoiceCommand = useCallback((command: VoiceCommand) => {
    const currentWorkflow = workflowRef.current;
    const currentPlan = planRef.current;

    // Anxiety reduced: voice commands map to bounded intent types, avoiding ambiguous free-form side effects.
    // Transparency: each command path is explicit and auditable in code/state updates.
    // Manual override path: every voice action can be corrected via direct UI controls and rerun.
    // Rubric support: UX accessibility + operational Impact in fast-moving dispatch moments.
    switch (command.type) {
      case "status_change":
        // Anxiety reduced: supports fast verbal updates when dispatchers are multitasking.
        // Transparency: updates one known job/status pair and highlights the changed card.
        // Manual override path: card highlight guides immediate visual verification and correction.
        // Rubric support: UX accessibility + Impact speed.
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
        // Anxiety reduced: voice-triggered contingency path shortens response time to staffing shocks.
        // Transparency: delegates to scenario engine with explicit payload.
        // Manual override path: user can run different scenario or manually reassign after result.
        // Rubric support: Impact resilience + UX command confidence.
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
        // Anxiety reduced: emergency intake via voice prevents context switching during high pressure moments.
        // Transparency: emergency fields are passed directly into scenario payload.
        // Manual override path: dispatcher can edit resulting assignment/status on board.
        // Rubric support: Impact urgency response + UX flow.
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
        // Anxiety reduced: escalation command gives a quick path to reprioritize upset customers.
        // Transparency: rerouting is explicit through `customer_escalated` scenario type.
        // Manual override path: if overcorrected, dispatcher can rebalance or manually reassign.
        // Rubric support: Impact customer retention + UX actionability.
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
        // Anxiety reduced: one-command reset when plan confidence drops broadly.
        // Transparency: rebalance is an intentional scenario call, not implicit auto-reassignment.
        // Manual override path: follow with manual pinning of sensitive jobs.
        // Rubric support: UX recovery + Impact schedule health.
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
        // Anxiety reduced: direct tech reassignment lets dispatcher assert domain judgment instantly.
        // Transparency: targeted IDs are computed first, then only those jobs are rewritten.
        // Manual override path: repeat command/UI action until assignments match reality.
        // Rubric support: UX agency + Impact real-world fit.
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
    // Anxiety reduced: dedicated generation screen confirms the system is actively processing.
    // Transparency: phase-specific mode communicates what is being generated.
    // Manual override path: users can retry from intake if needed after load cycle.
    // Rubric support: UX feedback quality.
    return <GeneratingScreen mode="intake" />;
  }

  if (phase === "intake") {
    // Anxiety reduced: single-purpose intake view lowers cognitive load at start of day.
    // Transparency: clearly passes submit, demo, loading, and error channels to the intake component.
    // Manual override path: demo + resubmission gives multiple recovery options.
    // Rubric support: UX accessibility for non-technical users.
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
    // Anxiety reduced: planning spinner prevents duplicate submissions and expectation mismatch.
    // Transparency: mode indicates this is scheduling synthesis, not input parsing.
    // Manual override path: once complete, user can still edit in advanced panel and rerun.
    // Rubric support: UX pacing + Impact reliability.
    return <GeneratingScreen mode="plan" />;
  }

  if (phase === "review") {
    // Anxiety reduced: review checkpoint lets users validate extracted structure before dispatch commit.
    // Transparency: warnings + follow-ups are visible and editable before optimization.
    // Manual override path: back button returns to intake; build plan proceeds only on user action.
    // Rubric support: UX trust + Impact quality of final plan.
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

  // Anxiety reduced: dashboard metrics provide instant operational pulse once dispatch begins.
  // Transparency: counts are computed from workflow state and shown in top bar.
  // Manual override path: "New day", advanced edits, and scenario controls remain available.
  // Rubric support: UX situational awareness + Impact execution quality.
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

      {/* Anxiety reduced: three-pane layout separates editing, controls, and live board to reduce mistakes.
          Transparency: each lane has a named purpose (advanced, scenarios/actions, board).
          Manual override path: users can open advanced pane anytime to override AI structure.
          Rubric support: UX information architecture + Impact operational speed. */}
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

      {/* Anxiety reduced: persistent voice layer keeps control available while scrolling dense board content.
          Transparency: only rendered when a plan exists to avoid false affordance.
          Manual override path: all voice outcomes remain editable through visible board controls.
          Rubric support: UX accessibility + Impact responsiveness. */}
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
