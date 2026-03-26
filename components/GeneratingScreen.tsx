"use client";

import { useEffect, useState } from "react";

const INTAKE_MESSAGES = [
  "Reading your dispatcher notes…",
  "Identifying technicians and skills…",
  "Parsing job priorities and types…",
  "Extracting addresses and requirements…",
  "Building structured workflow…",
  "Generating follow-up questions…",
  "Almost ready…",
];

const PLAN_MESSAGES = [
  "Analyzing technician availability…",
  "Matching skills to job requirements…",
  "Running dispatch algorithm…",
  "Optimizing route assignments…",
  "Checking for scheduling conflicts…",
  "Building assignment explanations…",
  "Finalizing dispatch plan…",
];

const INTAKE_LOG = [
  "tokenizing dispatcher input",
  "extracting named entities [workers, jobs]",
  "resolving skill requirements per job",
  "parsing priority and urgency signals",
  "building structured workflow object",
  "generating clarifying questions",
  "validating output schema",
];

const PLAN_LOG = [
  "loading worker status and availability",
  "computing skill-match score matrix",
  "running greedy assignment algorithm",
  "applying dispatcher rules and policies",
  "detecting scheduling conflicts",
  "generating assignment explanations",
  "serializing final dispatch plan",
];

interface Props {
  mode: "intake" | "plan";
}

export default function GeneratingScreen({ mode }: Props) {
  const messages = mode === "intake" ? INTAKE_MESSAGES : PLAN_MESSAGES;
  const logLines = mode === "intake" ? INTAKE_LOG : PLAN_LOG;

  const [messageIndex, setMessageIndex] = useState(0);
  const [visibleChars, setVisibleChars] = useState(0);
  const [dots, setDots] = useState(".");

  // Advance to next message every 1.4s
  useEffect(() => {
    const t = setInterval(() => {
      setMessageIndex((i) => Math.min(i + 1, messages.length - 1));
      setVisibleChars(0);
    }, 1400);
    return () => clearInterval(t);
  }, [messages.length]);

  // Typewriter reveal
  useEffect(() => {
    const target = messages[messageIndex].length;
    if (visibleChars >= target) return;
    const t = setTimeout(() => setVisibleChars((c) => c + 1), 22);
    return () => clearTimeout(t);
  }, [messageIndex, visibleChars, messages]);

  // Trailing dots animation
  useEffect(() => {
    const t = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 380);
    return () => clearInterval(t);
  }, []);

  const displayText = messages[messageIndex].slice(0, visibleChars);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center overflow-hidden relative">

      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Radial glow behind orb */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      {/* Main card */}
      <div className="relative z-10 flex flex-col items-center gap-7 px-6 max-w-md w-full text-center">

        {/* Logo */}
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-900/60">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
        </div>

        {/* Label + title */}
        <div>
          <p className="text-xs text-indigo-400 font-semibold uppercase tracking-widest mb-2">
            {mode === "intake" ? "Gemini — Parsing Input" : "Gemini — Building Plan"}
          </p>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {mode === "intake" ? "Understanding your day" : "Optimizing your dispatch"}
          </h2>
        </div>

        {/* Animated orb */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" style={{ animationDuration: "1.8s" }} />
          <div className="absolute inset-1.5 rounded-full bg-indigo-500/25 animate-pulse" style={{ animationDuration: "1.2s" }} />
          <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/40">
            <svg className="w-5 h-5 text-white animate-spin" style={{ animationDuration: "1.4s" }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        </div>

        {/* Typewriter message */}
        <div className="h-7 flex items-center justify-center">
          <p className="text-slate-300 text-sm font-medium tracking-wide">
            {displayText}
            <span className="text-indigo-400 font-bold">{visibleChars >= messages[messageIndex].length ? dots : "|"}</span>
          </p>
        </div>

        {/* Step progress nodes */}
        <div className="flex items-center gap-2">
          {messages.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-500 ${
                i < messageIndex
                  ? "w-2 h-2 bg-indigo-500"
                  : i === messageIndex
                  ? "w-3 h-3 bg-indigo-400 shadow-sm shadow-indigo-400/60"
                  : "w-2 h-2 bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* Terminal log */}
        <div className="w-full bg-slate-900 rounded-xl border border-slate-800 p-4 text-left font-mono text-xs overflow-hidden">
          <div className="flex items-center gap-1.5 mb-3 pb-2.5 border-b border-slate-800">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
            <span className="ml-2 text-slate-600 text-[10px]">gemini-2.0-flash</span>
          </div>
          <div className="space-y-1.5">
            {logLines.slice(0, messageIndex + 1).map((line, i) => {
              const isActive = i === messageIndex;
              return (
                <div key={i} className={`flex items-start gap-2 transition-all duration-300 ${isActive ? "opacity-100" : "opacity-50"}`}>
                  <span className={isActive ? "text-emerald-400" : "text-slate-600"}>
                    {isActive ? "▶" : "✓"}
                  </span>
                  <span className={isActive ? "text-emerald-300" : "text-slate-500"}>
                    {line}
                    {isActive && <span className="text-slate-600 animate-pulse"> ▌</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-slate-600 text-xs">Board2Dispatch · HVAC AI Dispatch</p>
      </div>
    </div>
  );
}
