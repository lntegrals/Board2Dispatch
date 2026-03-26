"use client";

import { useState, useEffect } from "react";
import type { PlanResult, Workflow, ActionOutput } from "@/lib/types";
import { generateTechBriefings, generateCustomerETAs } from "@/lib/actions";
import { encodeShareState } from "@/lib/shareState";

interface Props {
  plan: PlanResult;
  workflow: Workflow;
  triggerGenerate?: "briefings" | "etas" | null;
  onTriggerConsumed?: () => void;
}

export default function ActionPanel({ plan, workflow, triggerGenerate, onTriggerConsumed }: Props) {
  const [loading, setLoading] = useState<"briefings" | "etas" | null>(null);
  const [output, setOutput] = useState<ActionOutput | null>(null);
  const [streamingText, setStreamingText] = useState<string>("");
  const [copied, setCopied] = useState<number | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleBriefings = async () => {
    setLoading("briefings");
    setOutput(null);
    setStreamingText("");
    try {
      const result = await generateTechBriefings(plan, workflow, (chunk) => {
        setStreamingText((prev) => prev + chunk);
      });
      setStreamingText("");
      setOutput(result);
    } finally {
      setLoading(null);
    }
  };

  const handleETAs = async () => {
    setLoading("etas");
    setOutput(null);
    setStreamingText("");
    try {
      const result = await generateCustomerETAs(plan, workflow, (chunk) => {
        setStreamingText((prev) => prev + chunk);
      });
      setStreamingText("");
      setOutput(result);
    } finally {
      setLoading(null);
    }
  };

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };

  // Voice command trigger: auto-run generation when triggerGenerate is set
  useEffect(() => {
    if (!triggerGenerate || !!loading || plan.assignments.length === 0) return;
    onTriggerConsumed?.();
    if (triggerGenerate === "briefings") handleBriefings();
    else handleETAs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerGenerate]);

  const handleShareLink = async () => {
    try {
      const encoded = encodeShareState(workflow, plan);
      const url = new URL(window.location.href);
      url.searchParams.set("board", encoded);
      await navigator.clipboard.writeText(url.toString());
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      // Fallback: just copy base URL
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="text-xs text-gray-400 font-medium">Generate</p>
        <button
          onClick={handleBriefings}
          disabled={!!loading || plan.assignments.length === 0}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-sm font-medium text-gray-700 hover:text-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-left"
        >
          {loading === "briefings" ? (
            <svg className="animate-spin w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <span className="text-base">📋</span>
          )}
          <span>{loading === "briefings" ? "Generating…" : "Tech Briefings"}</span>
        </button>

        <button
          onClick={handleETAs}
          disabled={!!loading || plan.assignments.length === 0}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-sm font-medium text-gray-700 hover:text-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-left"
        >
          {loading === "etas" ? (
            <svg className="animate-spin w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <span className="text-base">📱</span>
          )}
          <span>{loading === "etas" ? "Generating…" : "Customer ETAs"}</span>
        </button>

        <button
          onClick={handleShareLink}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
            linkCopied
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600"
          }`}
        >
          {linkCopied ? (
            <>
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Link copied!</span>
            </>
          ) : (
            <>
              <span className="text-base">🔗</span>
              <span>Share Dispatch Link</span>
            </>
          )}
        </button>
      </div>

      {/* Streaming modal — live text while generating */}
      {streamingText && !output && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                {loading === "briefings" ? "Tech Briefings — Today's Dispatch" : "Customer ETA Messages"}
              </h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-xs text-gray-400">Generating…</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-mono">
                {streamingText}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Output modal */}
      {output && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setOutput(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">{output.title}</h3>
              <button
                onClick={() => setOutput(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Sections */}
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
              {output.sections.map((section, i) => (
                <div key={i} className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <span className="text-sm font-semibold text-gray-800">{section.heading}</span>
                    <button
                      onClick={() => handleCopy(section.body, i)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                      {copied === i ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {section.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setOutput(null)}
                className="w-full py-2.5 rounded-xl bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
