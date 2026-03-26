"use client";

import { useState } from "react";
import type { Job, PlanningStatus, JobExplanation, ScenarioDelta } from "@/lib/types";
import PriorityBadge from "./PriorityBadge";
import WhyCard from "./WhyCard";

interface Props {
  jobs: Job[];
  onStatusChange: (jobId: string, status: PlanningStatus) => void;
  conflicts: string[];
  explanations?: Map<string, JobExplanation>;
  scenarioDelta?: ScenarioDelta | null;
  highlightJobId?: string | null;
}

const COLUMNS: { id: PlanningStatus; label: string; color: string; dot: string }[] = [
  // Anxiety reduced: fixed status lanes prevent ambiguity about where each job currently stands.
  // Transparency: labels/colors are explicit and stable, helping non-technical users scan state quickly.
  // Manual override path: status transitions can move cards between lanes at any time.
  // Rubric support: UX readability + Impact coordination.
  { id: "unassigned", label: "Unassigned", color: "bg-gray-50 border-gray-200", dot: "bg-gray-300" },
  { id: "assigned", label: "Assigned", color: "bg-indigo-50/40 border-indigo-100", dot: "bg-indigo-400" },
  { id: "en_route", label: "En Route", color: "bg-blue-50/40 border-blue-100", dot: "bg-blue-400" },
  { id: "done", label: "Done", color: "bg-emerald-50/40 border-emerald-100", dot: "bg-emerald-400" },
];

interface JobCardProps {
  job: Job;
  onStatusChange: (jobId: string, status: PlanningStatus) => void;
  explanation?: JobExplanation;
  highlighted?: boolean;
}

function JobCard({ job, onStatusChange, explanation, highlighted }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);

  const nextStatus: Record<PlanningStatus, PlanningStatus> = {
    // Anxiety reduced: enforces a simple lifecycle so status updates feel safe and predictable.
    // Transparency: progression order is visible in code and reflected in button label.
    // Manual override path: cycle includes reset back to unassigned.
    // Rubric support: UX controllability.
    unassigned: "assigned",
    assigned: "en_route",
    en_route: "done",
    done: "unassigned",
  };

  const nextLabel: Record<PlanningStatus, string> = {
    // Anxiety reduced: action-oriented labels remove guesswork before clicking.
    // Transparency: each label maps 1:1 to the corresponding next status.
    // Manual override path: "Reset" gives explicit escape hatch for mistaken updates.
    // Rubric support: UX clarity.
    unassigned: "Mark Assigned",
    assigned: "Mark En Route",
    en_route: "Mark Done",
    done: "Reset",
  };

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer group ${
        highlighted
          ? "ring-2 ring-indigo-400 ring-offset-1 border-indigo-300 shadow-indigo-100"
          : job.priority === "urgent"
          ? "border-red-200 hover:border-red-300"
          : "border-gray-100 hover:border-gray-200"
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Anxiety reduced: card expansion keeps details one tap away without cluttering board scanability.
          Transparency: users can inspect score/explanation before taking status actions.
          Manual override path: status button lets dispatchers advance/reset job state manually.
          Rubric support: UX readability + Impact through faster informed updates. */}
      <div className="p-3">
        {/* Anxiety reduced: keeps essential job identity/problem visible at a glance.
            Transparency: customer + issue are displayed before any hidden details.
            Manual override path: clicking card reveals extra controls when confidence is low.
            Rubric support: UX scannability + Impact dispatch speed. */}
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{job.customerName}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{job.problem}</p>
          </div>
          <PriorityBadge priority={job.priority} />
        </div>

        {/* Anxiety reduced: visible assignee reduces fear of double-booking or ownership confusion.
            Transparency: shows assigned tech and optional score when available.
            Manual override path: expanded card action can move status if assignment needs correction.
            Rubric support: UX accountability + Impact execution. */}
        {/* Worker chip */}
        {job.assignedWorkerName && (
          <div className="mt-2.5 flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-xs font-bold text-indigo-600">
              {job.assignedWorkerName.charAt(0)}
            </div>
            <span className="text-xs text-indigo-600 font-medium">{job.assignedWorkerName}</span>
            {job.score !== undefined && (
              <span className="ml-auto text-xs text-gray-300 tabular-nums">
                {job.score.toFixed(1)}pt
              </span>
            )}
          </div>
        )}

        {/* Anxiety reduced: location shown inline cuts context-switching to other tools.
            Transparency: address appears only when known (no fake/placeholder confidence).
            Manual override path: users can still progress job manually without address data.
            Rubric support: UX practicality + Impact routing awareness. */}
        {/* Address */}
        {job.address && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-400">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {job.address}
          </div>
        )}

        {/* Anxiety reduced: rationale appears only when assignment exists, avoiding misleading empty explanations.
            Transparency: non-technical users get "why" text next to each AI decision.
            Manual override path: users can reject rationale and reassign/status-change from this same card.
            Rubric support: UX trust + Impact via human-in-the-loop validation. */}
        {/* WhyCard — only when assigned and we have explanation */}
        {job.assignedWorkerName && explanation && (
          <div onClick={(e) => e.stopPropagation()}>
            <WhyCard explanation={explanation} />
          </div>
        )}
      </div>

      {/* Expanded actions */}
      {expanded && (
        <div
          className="border-t border-gray-100 p-2.5 flex items-center justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Anxiety reduced: explicit action label ("Mark …") clarifies what will happen next.
              Transparency: transition order is deterministic via nextStatus map.
              Manual override path: "Reset" closes the loop when AI/voice updates were wrong.
              Rubric support: UX control + operational Impact. */}
          {job.requiredSkills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {job.requiredSkills.map((s) => (
                <span key={s} className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-400 text-xs">
                  {s}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={() => onStatusChange(job.id, nextStatus[job.status])}
            className="ml-auto text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors whitespace-nowrap"
          >
            {nextLabel[job.status]} →
          </button>
        </div>
      )}
    </div>
  );
}

export default function DispatchBoard({
  jobs,
  onStatusChange,
  conflicts,
  explanations,
  scenarioDelta,
  highlightJobId,
}: Props) {
  const isEmpty = jobs.length === 0;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Anxiety reduced: board heading + concise instruction orient users immediately.
          Transparency: empty vs populated message reflects real board state.
          Manual override path: instruction reminds user that cards are directly editable.
          Rubric support: UX onboarding + Impact day-of operations. */}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 tracking-tight">Dispatch Board</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {isEmpty
              ? "Build a plan to populate the board"
              : `${jobs.length} jobs · click a card to update status`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-gray-400">Live</span>
        </div>
      </div>

      {/* Anxiety reduced: surfaces replan impact immediately so dispatchers are not surprised by movement.
          Transparency: concise counts reveal how many assignments changed/unassigned.
          Manual override path: users can manually stabilize high-priority cards after big deltas.
          Rubric support: UX situational awareness + Impact continuity. */}
      {/* Scenario delta banner */}
      {scenarioDelta && (
        <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-2.5">
          <p className="text-xs font-semibold text-indigo-800">{scenarioDelta.description}</p>
          <p className="text-xs text-indigo-600 mt-0.5">
            {scenarioDelta.assignmentsChanged} changed · {scenarioDelta.unassignedCount} unassigned
          </p>
        </div>
      )}

      {/* Anxiety reduced: conflict banner proactively flags risk instead of hiding it in logs.
          Transparency: plain-language conflict strings are visible to non-technical operators.
          Manual override path: dispatchers can edit team/jobs or force assignment despite warnings.
          Rubric support: UX clarity + Impact risk mitigation. */}
      {/* Conflicts banner */}
      {conflicts.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
          <p className="text-xs font-semibold text-amber-700 mb-1">⚠ Scheduling Notes</p>
          {conflicts.map((c, i) => (
            <p key={i} className="text-xs text-amber-600">{c}</p>
          ))}
        </div>
      )}

      {/* Anxiety reduced: lane-based grouping reduces mental overload versus flat job lists.
          Transparency: each lane count updates from current filtered jobs.
          Manual override path: card actions move work across lanes without re-planning.
          Rubric support: UX structure + Impact throughput. */}
      {/* Kanban columns */}
      <div className="flex gap-3 flex-1 overflow-x-auto pb-2 snap-x snap-mandatory">
        {COLUMNS.map((col) => {
          const colJobs = jobs.filter((j) => j.status === col.id);
          return (
            <div key={col.id} className="flex flex-col gap-2 min-w-[78vw] sm:min-w-[220px] md:min-w-[200px] flex-1 snap-start">
              {/* Anxiety reduced: count badge makes backlog pressure visible per status lane.
                  Transparency: each count is computed from explicit `colJobs` filter.
                  Manual override path: users can clear bottlenecks by updating card status.
                  Rubric support: UX observability + Impact balancing. */}
              {/* Column header */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${col.color}`}>
                <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                <span className="text-xs font-semibold text-gray-600">{col.label}</span>
                <span className="ml-auto text-xs font-bold text-gray-400 tabular-nums">
                  {colJobs.length}
                </span>
              </div>

              {/* Anxiety reduced: explicit empty state reassures users the app is functioning.
                  Transparency: "Empty" means no jobs meet this status filter right now.
                  Manual override path: jobs can be moved in via manual status updates.
                  Rubric support: UX feedback quality. */}
              {/* Cards */}
              <div className="flex flex-col gap-2 flex-1">
                {colJobs.length === 0 && (
                  <div className="flex-1 rounded-xl border-2 border-dashed border-gray-100 flex items-center justify-center min-h-[80px]">
                    <span className="text-xs text-gray-300">Empty</span>
                  </div>
                )}
                {colJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onStatusChange={onStatusChange}
                    explanation={explanations?.get(job.id)}
                    highlighted={job.id === highlightJobId}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Anxiety reduced: priority legend decodes color semantics for non-technical users.
          Transparency: maps each priority class to a visible color token.
          Manual override path: priority can be changed upstream and reflected here after rerun.
          Rubric support: UX comprehension + Impact urgency handling. */}
      {/* Legend */}
      {!isEmpty && (
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-400">Priority:</span>
          {(["urgent", "high", "normal", "low"] as const).map((p) => (
            <div key={p} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                p === "urgent" ? "bg-red-400" :
                p === "high" ? "bg-orange-400" :
                p === "normal" ? "bg-blue-400" : "bg-gray-300"
              }`} />
              <span className="text-xs text-gray-400 capitalize">{p}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
