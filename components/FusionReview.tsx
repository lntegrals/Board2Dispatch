"use client";

import { useState } from "react";
import type { DailyContext, FollowUpQuestion, Workflow, DispatchWarning } from "@/lib/types";

interface Props {
  context: DailyContext;
  followUps: FollowUpQuestion[];
  workflow: Workflow;
  warnings?: DispatchWarning[];
  onBuildPlan: (answers: FollowUpQuestion[]) => void;
  onBack: () => void;
  loading: boolean;
}

export default function FusionReview({
  context,
  followUps,
  workflow,
  warnings,
  onBuildPlan,
  onBack,
  loading,
}: Props) {
  const [mergedText, setMergedText] = useState(context.mergedText);
  const [answers, setAnswers] = useState<FollowUpQuestion[]>(followUps);

  const updateAnswer = (id: string, answer: string) => {
    setAnswers((prev) => prev.map((q) => (q.id === id ? { ...q, answer } : q)));
  };

  const sourcePills = [
    context.typedText.trim() && { label: "Typed", color: "bg-blue-100 text-blue-700" },
    context.transcribedText.trim() && { label: "Voice", color: "bg-purple-100 text-purple-700" },
    context.imageExtractedText.trim() && { label: "Whiteboard", color: "bg-amber-100 text-amber-700" },
  ].filter(Boolean) as { label: string; color: string }[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-900">Board2Dispatch</span>
          </div>
          <button
            onClick={onBack}
            className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
            ← Back
          </button>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 pt-8 sm:pt-10 pb-4">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-6 overflow-x-auto pb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs text-gray-400 font-medium">Intake</span>
          </div>
          <div className="flex-1 h-px bg-indigo-200 mx-1" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
              <span className="text-xs text-white font-bold">2</span>
            </div>
            <span className="text-xs text-indigo-700 font-semibold">Review</span>
          </div>
          <div className="flex-1 h-px bg-gray-200 mx-1" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-xs text-gray-400 font-bold">3</span>
            </div>
            <span className="text-xs text-gray-400 font-medium">Dispatch</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">
          Review what we understood
        </h1>
        <p className="text-gray-500 text-sm">
          Edit the merged context below, answer the follow-up questions, then build your plan.
        </p>
      </div>

      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 pb-12 flex flex-col gap-6">

        {/* Merged context */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
              Merged Context
            </label>
            {sourcePills.length > 0 && (
              <div className="flex gap-1.5 ml-auto">
                {sourcePills.map((p) => (
                  <span key={p.label} className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.color}`}>
                    {p.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <textarea
            value={mergedText}
            onChange={(e) => setMergedText(e.target.value)}
            rows={6}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent leading-relaxed"
          />
        </div>

        {/* Extracted preview */}
        {(workflow.workers.length > 0 || workflow.jobs.length > 0) && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
              Extracted — {workflow.workers.length} techs · {workflow.jobs.length} jobs
            </label>
            <div className="flex flex-col gap-3">
              {workflow.workers.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2 font-medium">Technicians</p>
                  <div className="flex flex-wrap gap-2">
                    {workflow.workers.map((w) => (
                      <div key={w.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 border border-gray-200">
                        <div className="w-5 h-5 rounded-lg bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                          {w.name.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-700 font-medium">{w.name}</span>
                        <span className="text-xs text-gray-400">{w.skills.slice(0, 2).join(", ")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {workflow.jobs.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2 font-medium">Jobs</p>
                  <div className="flex flex-col gap-1.5">
                    {workflow.jobs.map((j) => (
                      <div key={j.id} className="flex items-center gap-2 text-sm">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          j.priority === "urgent" ? "bg-red-400" :
                          j.priority === "high" ? "bg-orange-400" :
                          j.priority === "normal" ? "bg-blue-400" : "bg-gray-300"
                        }`} />
                        <span className="font-medium text-gray-800">{j.customerName}</span>
                        <span className="text-gray-400 truncate text-xs">{j.problem}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Warnings */}
        {warnings && warnings.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
              AI Warnings
            </label>
            <div className="flex flex-col gap-2">
              {warnings.map((w, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm ${
                    w.severity === "alert"
                      ? "bg-red-50 border border-red-200 text-red-800"
                      : w.severity === "caution"
                      ? "bg-amber-50 border border-amber-200 text-amber-800"
                      : "bg-blue-50 border border-blue-100 text-blue-800"
                  }`}
                >
                  <span className="flex-shrink-0 font-bold mt-0.5">
                    {w.severity === "alert" ? "!" : w.severity === "caution" ? "!" : "i"}
                  </span>
                  <span className="leading-relaxed">{w.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up questions */}
        {answers.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">
              AI Follow-Up Questions
            </label>
            <p className="text-xs text-gray-400 mb-4">Answer any that apply — skip the rest</p>
            <div className="flex flex-col gap-4">
              {answers.map((q, i) => (
                <div key={q.id}>
                  <div className="flex items-start gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-700 leading-relaxed">{q.question}</p>
                  </div>
                  <div className="ml-7">
                    <input
                      type="text"
                      value={q.answer}
                      onChange={(e) => updateAnswer(q.id, e.target.value)}
                      placeholder="Type your answer (optional)…"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={() => onBuildPlan(answers)}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-gray-900 hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-base font-semibold transition-all shadow-sm hover:shadow-lg disabled:shadow-none active:scale-[0.99]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Building today&rsquo;s plan…
            </span>
          ) : (
            "Build Today's Plan →"
          )}
        </button>
      </div>
    </div>
  );
}
