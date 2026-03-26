"use client";

import { useState } from "react";
import type { Workflow, Job, Worker, Rule } from "@/lib/types";
import PriorityBadge from "./PriorityBadge";

interface Props {
  workflow: Workflow;
  onChange: (workflow: Workflow) => void;
  onRunDispatch: () => void;
  hasAssignments: boolean;
  planLoading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  available: "bg-emerald-400",
  busy: "bg-amber-400",
  en_route: "bg-blue-400",
  offline: "bg-gray-300",
};

export default function StructurePanel({
  workflow,
  onChange,
  onRunDispatch,
  hasAssignments,
  planLoading,
}: Props) {
  const [editingRule, setEditingRule] = useState<string | null>(null);

  const updateJob = (id: string, field: keyof Job, value: string) => {
    onChange({
      ...workflow,
      jobs: workflow.jobs.map((j) =>
        j.id === id ? { ...j, [field]: value } : j
      ),
    });
  };

  const updateWorker = (id: string, field: keyof Worker, value: string) => {
    onChange({
      ...workflow,
      workers: workflow.workers.map((w) =>
        w.id === id ? { ...w, [field]: value } : w
      ),
    });
  };

  const updateRule = (id: string, field: keyof Rule, value: string) => {
    onChange({
      ...workflow,
      rules: workflow.rules.map((r) =>
        r.id === id ? { ...r, [field]: value } : r
      ),
    });
  };

  const addRule = () => {
    const newRule: Rule = {
      id: `rule${Date.now()}`,
      condition: "New condition",
      action: "New action",
    };
    onChange({ ...workflow, rules: [...workflow.rules, newRule] });
    setEditingRule(newRule.id);
  };

  const removeRule = (id: string) => {
    onChange({ ...workflow, rules: workflow.rules.filter((r) => r.id !== id) });
  };

  if (workflow.jobs.length === 0 && workflow.workers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">No data yet</p>
          <p className="text-xs text-gray-400 mt-1">Build a plan to see team &amp; jobs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-1">
      {/* Workers */}
      {workflow.workers.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Technicians · {workflow.workers.length}
          </h3>
          <div className="flex flex-col gap-2">
            {workflow.workers.map((worker) => (
              <div
                key={worker.id}
                className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm hover:border-gray-200 transition-colors"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-sm font-semibold text-indigo-700">
                    {worker.name.charAt(0)}
                  </div>
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${STATUS_COLORS[worker.status] ?? "bg-gray-300"}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    className="text-sm font-medium text-gray-900 bg-transparent w-full focus:outline-none focus:bg-gray-50 rounded px-1 -ml-1"
                    value={worker.name}
                    onChange={(e) => updateWorker(worker.id, "name", e.target.value)}
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {worker.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 text-xs"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <select
                  value={worker.status}
                  onChange={(e) => updateWorker(worker.id, "status", e.target.value)}
                  className="text-xs text-gray-500 bg-transparent border-none focus:outline-none cursor-pointer ml-auto sm:ml-0"
                >
                  <option value="available">Available</option>
                  <option value="busy">Busy</option>
                  <option value="en_route">En Route</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Jobs */}
      {workflow.jobs.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Jobs · {workflow.jobs.length}
          </h3>
          <div className="flex flex-col gap-2">
            {workflow.jobs.map((job) => (
              <div
                key={job.id}
                className="p-3 rounded-xl bg-white border border-gray-100 shadow-sm hover:border-gray-200 transition-colors"
              >
                <div className="flex flex-col sm:flex-row items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <input
                      className="text-sm font-semibold text-gray-900 bg-transparent w-full focus:outline-none focus:bg-gray-50 rounded px-1 -ml-1"
                      value={job.customerName}
                      onChange={(e) => updateJob(job.id, "customerName", e.target.value)}
                    />
                    <input
                      className="text-xs text-gray-500 bg-transparent w-full focus:outline-none focus:bg-gray-50 rounded px-1 -ml-1 mt-0.5"
                      value={job.problem}
                      onChange={(e) => updateJob(job.id, "problem", e.target.value)}
                    />
                    {job.address && (
                      <p className="text-xs text-gray-400 mt-1 px-1">{job.address}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <PriorityBadge priority={job.priority} />
                    <select
                      value={job.priority}
                      onChange={(e) => updateJob(job.id, "priority", e.target.value)}
                      className="text-xs text-gray-400 bg-transparent border-none focus:outline-none cursor-pointer"
                    >
                      <option value="urgent">urgent</option>
                      <option value="high">high</option>
                      <option value="normal">normal</option>
                      <option value="low">low</option>
                    </select>
                  </div>
                </div>
                {job.requiredSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 px-1">
                    {job.requiredSkills.map((s) => (
                      <span key={s} className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-500 text-xs">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Rules */}
      {workflow.rules.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
              Rules · {workflow.rules.length}
            </h3>
            <button
              onClick={addRule}
              className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
            >
              + Add rule
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {workflow.rules.map((rule) => (
              <div
                key={rule.id}
                className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 group"
              >
                {editingRule === rule.id ? (
                  <div className="flex flex-col gap-2">
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">If</label>
                      <input
                        autoFocus
                        className="text-sm text-gray-800 bg-white rounded-lg px-3 py-1.5 w-full border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-300"
                        value={rule.condition}
                        onChange={(e) => updateRule(rule.id, "condition", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Then</label>
                      <input
                        className="text-sm text-gray-800 bg-white rounded-lg px-3 py-1.5 w-full border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-300"
                        value={rule.action}
                        onChange={(e) => updateRule(rule.id, "action", e.target.value)}
                        onBlur={() => setEditingRule(null)}
                        onKeyDown={(e) => e.key === "Enter" && setEditingRule(null)}
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    className="cursor-pointer"
                    onClick={() => setEditingRule(rule.id)}
                  >
                    <p className="text-xs text-amber-600 font-medium">
                      <span className="text-amber-400 font-normal">IF </span>{rule.condition}
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      <span className="text-amber-400 font-normal">THEN </span>{rule.action}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => removeRule(rule.id)}
                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Run dispatch */}
      <div className="sticky bottom-0 pt-2 bg-gradient-to-t from-white to-transparent">
        <button
          onClick={onRunDispatch}
          disabled={planLoading || workflow.jobs.length === 0}
          className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold transition-all shadow-sm hover:shadow-md disabled:shadow-none active:scale-[0.99]"
        >
          {planLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Planning…
            </span>
          ) : hasAssignments ? (
            "Re-run Dispatch ↺"
          ) : (
            "Run Dispatch →"
          )}
        </button>
      </div>
    </div>
  );
}
