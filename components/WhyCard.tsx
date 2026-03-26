"use client";

import { useState } from "react";
import type { JobExplanation } from "@/lib/types";

interface Props {
  explanation: JobExplanation;
}

export default function WhyCard({ explanation }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2 rounded-lg bg-indigo-50/60 border border-indigo-100">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="text-xs text-indigo-600 font-medium truncate">
          {expanded ? explanation.summary : `Why this match? — ${explanation.summary}`}
        </span>
        <svg
          className={`w-3 h-3 text-indigo-400 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-1.5" onClick={(e) => e.stopPropagation()}>
          {explanation.bullets.map((bullet, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-indigo-300 mt-0.5 flex-shrink-0">•</span>
              <span className="text-xs text-indigo-700 leading-relaxed">{bullet}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
