"use client";

import { useState } from "react";
import type { Workflow, PlanResult, ScenarioDelta } from "@/lib/types";
import type { ScenarioPayload } from "@/lib/scenarios";

interface Props {
  workflow: Workflow;
  plan: PlanResult;
  onApply: (payload: ScenarioPayload) => void;
  delta: ScenarioDelta | null;
  onDismissDelta: () => void;
}

type ModalState =
  | null
  | { type: "tech_unavailable"; selectedTechId: string }
  | { type: "new_emergency"; customerName: string; problem: string; address: string }
  | { type: "customer_escalated"; selectedJobId: string }
  | { type: "rebalance" };

export default function ScenarioBar({ workflow, plan, onApply, delta, onDismissDelta }: Props) {
  const [modal, setModal] = useState<ModalState>(null);

  const availableTechs = workflow.workers.filter((w) => w.status !== "offline");
  const assignedJobs = workflow.jobs.filter(
    (j) => j.status !== "done" && j.priority !== "urgent"
  );

  const handleApply = () => {
    if (!modal) return;
    let payload: ScenarioPayload;

    if (modal.type === "tech_unavailable") {
      payload = { type: "tech_unavailable", techId: modal.selectedTechId || undefined };
    } else if (modal.type === "new_emergency") {
      payload = {
        type: "new_emergency",
        emergencyJob: {
          customerName: modal.customerName || "Emergency Call",
          problem: modal.problem || "No-cool emergency",
          address: modal.address || undefined,
        },
      };
    } else if (modal.type === "customer_escalated") {
      payload = { type: "customer_escalated", jobId: modal.selectedJobId || undefined };
    } else {
      payload = { type: "rebalance" };
    }

    onApply(payload);
    setModal(null);
  };

  const SCENARIOS = [
    {
      type: "tech_unavailable" as const,
      label: "Tech Unavailable",
      icon: "👤",
      color: "border-red-200 hover:border-red-300 hover:bg-red-50 text-red-700",
    },
    {
      type: "new_emergency" as const,
      label: "New Emergency",
      icon: "🚨",
      color: "border-orange-200 hover:border-orange-300 hover:bg-orange-50 text-orange-700",
    },
    {
      type: "customer_escalated" as const,
      label: "Customer Escalated",
      icon: "⬆",
      color: "border-amber-200 hover:border-amber-300 hover:bg-amber-50 text-amber-700",
    },
    {
      type: "rebalance" as const,
      label: "Rebalance",
      icon: "↺",
      color: "border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-700",
    },
  ];

  return (
    <>
      {/* Delta banner */}
      {delta && (
        <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-indigo-800 mb-0.5">{delta.description}</p>
            <div className="flex flex-wrap gap-3 text-xs text-indigo-600">
              <span>{delta.assignmentsChanged} assignment{delta.assignmentsChanged !== 1 ? "s" : ""} changed</span>
              {delta.jobsDelayed > 0 && <span>{delta.jobsDelayed} job{delta.jobsDelayed !== 1 ? "s" : ""} unassigned</span>}
              {delta.unassignedCount === 0 && <span className="text-emerald-600">All jobs covered</span>}
            </div>
          </div>
          <button
            onClick={onDismissDelta}
            className="text-indigo-400 hover:text-indigo-600 text-lg leading-none flex-shrink-0"
          >
            ×
          </button>
        </div>
      )}

      {/* Scenario buttons */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-gray-400 font-medium self-center mr-1">What-if:</span>
        {SCENARIOS.map((s) => (
          <button
            key={s.type}
            onClick={() => {
              if (s.type === "tech_unavailable") {
                setModal({ type: "tech_unavailable", selectedTechId: availableTechs[0]?.id ?? "" });
              } else if (s.type === "new_emergency") {
                setModal({ type: "new_emergency", customerName: "", problem: "", address: "" });
              } else if (s.type === "customer_escalated") {
                setModal({ type: "customer_escalated", selectedJobId: assignedJobs[0]?.id ?? "" });
              } else {
                setModal({ type: "rebalance" });
              }
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${s.color}`}
          >
            <span className="mr-1">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Modals */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {modal.type === "tech_unavailable" && (
              <>
                <h3 className="text-base font-bold text-gray-900 mb-1">Tech Unavailable</h3>
                <p className="text-sm text-gray-500 mb-4">Mark a tech offline and replan.</p>
                <label className="text-xs text-gray-500 font-medium block mb-2">Select technician</label>
                <select
                  value={modal.selectedTechId}
                  onChange={(e) => setModal({ ...modal, selectedTechId: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4"
                >
                  {availableTechs.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </>
            )}

            {modal.type === "new_emergency" && (
              <>
                <h3 className="text-base font-bold text-gray-900 mb-1">New Emergency Call</h3>
                <p className="text-sm text-gray-500 mb-4">Add an urgent job and replan.</p>
                <div className="flex flex-col gap-3 mb-4">
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">Customer name</label>
                    <input
                      value={modal.customerName}
                      onChange={(e) => setModal({ ...modal, customerName: e.target.value })}
                      placeholder="e.g. Johnson Residence"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">Problem</label>
                    <input
                      value={modal.problem}
                      onChange={(e) => setModal({ ...modal, problem: e.target.value })}
                      placeholder="e.g. No AC, system completely down"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">Address (optional)</label>
                    <input
                      value={modal.address}
                      onChange={(e) => setModal({ ...modal, address: e.target.value })}
                      placeholder="e.g. 123 Main St"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>
              </>
            )}

            {modal.type === "customer_escalated" && (
              <>
                <h3 className="text-base font-bold text-gray-900 mb-1">Customer Escalated</h3>
                <p className="text-sm text-gray-500 mb-4">Upgrade a job to urgent priority and replan.</p>
                <label className="text-xs text-gray-500 font-medium block mb-2">Select job to escalate</label>
                <select
                  value={modal.selectedJobId}
                  onChange={(e) => setModal({ ...modal, selectedJobId: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4"
                >
                  {assignedJobs.length > 0
                    ? assignedJobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.customerName} — {j.priority}
                        </option>
                      ))
                    : workflow.jobs
                        .filter((j) => j.status !== "done")
                        .map((j) => (
                          <option key={j.id} value={j.id}>
                            {j.customerName} — {j.priority}
                          </option>
                        ))}
                </select>
              </>
            )}

            {modal.type === "rebalance" && (
              <>
                <h3 className="text-base font-bold text-gray-900 mb-1">Rebalance Schedule</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Reset all tech statuses and replan everything from scratch. Done jobs will be preserved.
                </p>
              </>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="flex-1 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold transition-colors"
              >
                Apply & Replan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
