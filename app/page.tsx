"use client";

import { useState } from "react";
import type { Workflow, PlanningStatus } from "@/lib/types";
import { parseDispatchInput } from "@/lib/parser";
import { planDispatch, applyPlanToWorkflow } from "@/lib/planner";
import { DEMO_WORKFLOW } from "@/lib/demoData";
import InputPanel from "@/components/InputPanel";
import StructurePanel from "@/components/StructurePanel";
import DispatchBoard from "@/components/DispatchBoard";

const EMPTY_WORKFLOW: Workflow = { workers: [], jobs: [], rules: [] };

export default function Home() {
  const [workflow, setWorkflow] = useState<Workflow>(EMPTY_WORKFLOW);
  const [parseLoading, setParseLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [hasAssignments, setHasAssignments] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleParse = async (notes: string, rules: string) => {
    setParseLoading(true);
    setParseError(null);
    try {
      // If the notes look like demo input, just return demo workflow instantly
      if (notes.includes("Marcus Webb") && notes.includes("Rivera")) {
        setWorkflow(DEMO_WORKFLOW);
        setHasAssignments(false);
        setConflicts([]);
      } else {
        const result = await parseDispatchInput(notes, rules);
        setWorkflow(result);
        setHasAssignments(false);
        setConflicts([]);
      }
    } catch {
      setParseError("Failed to parse input. Try loading the demo to see the expected format.");
    } finally {
      setParseLoading(false);
    }
  };

  const handleRunDispatch = async () => {
    if (workflow.jobs.length === 0) return;
    setPlanLoading(true);

    // Small delay to show loading state (plan is synchronous)
    await new Promise((r) => setTimeout(r, 400));

    try {
      // Reset jobs to unassigned before re-planning (preserve done jobs)
      const resetWorkflow: Workflow = {
        ...workflow,
        jobs: workflow.jobs.map((j) =>
          j.status === "done"
            ? j
            : { ...j, status: "unassigned", assignedWorkerId: undefined, assignedWorkerName: undefined }
        ),
        workers: workflow.workers.map((w) => ({ ...w, status: "available" as const })),
      };

      const plan = planDispatch(resetWorkflow);
      const updated = applyPlanToWorkflow(resetWorkflow, plan);
      setWorkflow(updated);
      setConflicts(plan.conflicts);
      setHasAssignments(plan.assignments.length > 0);
    } finally {
      setPlanLoading(false);
    }
  };

  const handleStatusChange = (jobId: string, status: PlanningStatus) => {
    setWorkflow((prev) => ({
      ...prev,
      jobs: prev.jobs.map((j) => (j.id === jobId ? { ...j, status } : j)),
    }));
  };

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
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-gray-400">Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main 3-column layout */}
      <main className="max-w-screen-2xl mx-auto px-6 py-6 grid grid-cols-[300px_340px_1fr] gap-5 h-[calc(100vh-56px)]">

        {/* LEFT: Input */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col overflow-hidden">
          {parseError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex-shrink-0">
              <p className="text-xs text-red-600">{parseError}</p>
            </div>
          )}
          <InputPanel onParse={handleParse} loading={parseLoading} />
        </div>

        {/* CENTER: Structure */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col overflow-hidden">
          <div className="mb-4 flex-shrink-0">
            <h2 className="text-sm font-semibold text-gray-900 tracking-tight">Structure</h2>
            <p className="text-xs text-gray-400 mt-0.5">Extracted data — edit inline, then run dispatch</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <StructurePanel
              workflow={workflow}
              onChange={setWorkflow}
              onRunDispatch={handleRunDispatch}
              hasAssignments={hasAssignments}
              planLoading={planLoading}
            />
          </div>
        </div>

        {/* RIGHT: Dispatch Board */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col overflow-hidden">
          <DispatchBoard
            jobs={workflow.jobs}
            onStatusChange={handleStatusChange}
            conflicts={conflicts}
          />
        </div>
      </main>
    </div>
  );
}
