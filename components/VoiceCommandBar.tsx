"use client";

import { useEffect, useRef } from "react";
import { useDispatchVoice } from "@/hooks/useDispatchVoice";
import type { Workflow, PlanResult } from "@/lib/types";
import type { VoiceCommand } from "@/lib/voiceCommands";

interface Props {
  workflow: Workflow;
  plan: PlanResult | null;
  onCommand: (command: VoiceCommand) => void;
}

function speak(text: string) {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

const CONFIDENCE_COLOR: Record<string, string> = {
  high: "text-emerald-600",
  medium: "text-amber-500",
  low: "text-red-500",
};

export default function VoiceCommandBar({ workflow, plan, onCommand }: Props) {
  const {
    isListening,
    isProcessing,
    isSupported,
    liveTranscript,
    pendingCommand,
    error,
    startListening,
    stopListening,
    dismiss,
  } = useDispatchVoice(workflow, plan);

  const autoExecTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Auto-execute after 2s when a recognizable command arrives
  useEffect(() => {
    if (!pendingCommand || pendingCommand.type === "unknown") return;

    // Animate the progress bar from 100% → 0%
    if (barRef.current) {
      barRef.current.style.width = "100%";
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (barRef.current) barRef.current.style.width = "0%";
        })
      );
    }

    autoExecTimerRef.current = setTimeout(() => {
      onCommand(pendingCommand);
      speak(pendingCommand.confirmation);
      dismiss();
    }, 2000);

    return () => {
      if (autoExecTimerRef.current) clearTimeout(autoExecTimerRef.current);
    };
  }, [pendingCommand, onCommand, dismiss]);

  // Auto-dismiss error after 3s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(dismiss, 3000);
    return () => clearTimeout(t);
  }, [error, dismiss]);

  if (!isSupported) return null;

  const handleExecuteNow = () => {
    if (!pendingCommand) return;
    if (autoExecTimerRef.current) clearTimeout(autoExecTimerRef.current);
    onCommand(pendingCommand);
    speak(pendingCommand.confirmation);
    dismiss();
  };

  const handleCancel = () => {
    if (autoExecTimerRef.current) clearTimeout(autoExecTimerRef.current);
    dismiss();
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">

      {/* Live transcript tooltip */}
      {isListening && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-md px-4 py-2.5 max-w-[260px]">
          <p className="text-xs text-gray-500 italic leading-relaxed">
            {liveTranscript || "Listening…"}
          </p>
        </div>
      )}

      {/* Error toast */}
      {error && !pendingCommand && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 max-w-[260px]">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Pending command card */}
      {pendingCommand && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-80 p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-gray-700">Voice Command</span>
            </div>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          </div>

          {pendingCommand.type === "unknown" ? (
            <>
              <p className="text-sm text-gray-500 mb-1">
                <span className="italic text-gray-400">&ldquo;{pendingCommand.rawTranscript}&rdquo;</span>
              </p>
              <p className="text-sm text-red-600 font-medium mb-4">Couldn&apos;t understand that — try again</p>
              <button
                onClick={dismiss}
                className="w-full py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors"
              >
                Dismiss
              </button>
            </>
          ) : (
            <>
              {/* Transcript */}
              <p className="text-xs text-gray-400 italic mb-2">
                &ldquo;{pendingCommand.rawTranscript}&rdquo;
              </p>

              {/* Interpreted action */}
              <p className="text-sm font-semibold text-gray-900 mb-1">
                → {pendingCommand.confirmation}
              </p>

              {/* Confidence */}
              <p className={`text-xs font-medium mb-3 ${CONFIDENCE_COLOR[pendingCommand.confidence] ?? "text-gray-500"}`}>
                {pendingCommand.confidence.charAt(0).toUpperCase() + pendingCommand.confidence.slice(1)} confidence
              </p>

              {/* Countdown progress bar */}
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div
                  ref={barRef}
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ transition: "width 2000ms linear", width: "100%" }}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteNow}
                  className="flex-1 py-2 rounded-xl bg-gray-900 hover:bg-gray-700 text-sm font-medium text-white transition-colors"
                >
                  Execute Now
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Mic button */}
      <button
        onClick={handleMicClick}
        disabled={isProcessing}
        title={isListening ? "Tap to stop" : "Voice command"}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all
          ${isListening
            ? "bg-red-500 ring-4 ring-red-300 animate-pulse"
            : isProcessing
            ? "bg-gray-300 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl active:scale-95"
          }`}
      >
        {isProcessing ? (
          <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
