"use client";

import { useEffect, useRef, useState } from "react";
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

  const barRef = useRef<HTMLDivElement>(null);
  const autoExecTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Toast shown briefly after a command executes
  const [executedText, setExecutedText] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(text: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setExecutedText(text);
    toastTimerRef.current = setTimeout(() => setExecutedText(null), 2500);
  }

  // Core: when a parsed command arrives, decide how to handle it
  useEffect(() => {
    if (!pendingCommand) return;

    if (pendingCommand.type === "unknown") return; // let the card handle it

    const { confidence } = pendingCommand;

    if (confidence === "high" || confidence === "medium") {
      // Execute immediately — no countdown card
      onCommand(pendingCommand);
      speak(pendingCommand.confirmation);
      showToast(pendingCommand.confirmation);
      dismiss();
      return;
    }

    // Low confidence: show countdown card, auto-exec after 2s
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
      showToast(pendingCommand.confirmation);
      dismiss();
    }, 2000);

    return () => {
      if (autoExecTimerRef.current) clearTimeout(autoExecTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCommand]);

  // Auto-dismiss error after 3s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(dismiss, 3000);
    return () => clearTimeout(t);
  }, [error, dismiss]);

  if (!isSupported) return null;

  const handleMicClick = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const handleExecuteNow = () => {
    if (!pendingCommand) return;
    if (autoExecTimerRef.current) clearTimeout(autoExecTimerRef.current);
    onCommand(pendingCommand);
    speak(pendingCommand.confirmation);
    showToast(pendingCommand.confirmation);
    dismiss();
  };

  const handleCancel = () => {
    if (autoExecTimerRef.current) clearTimeout(autoExecTimerRef.current);
    dismiss();
  };

  // Only the low-confidence card and unknown card render as floating cards
  const showCard = !!pendingCommand;
  const showLowConfCard = showCard && pendingCommand.confidence === "low" && pendingCommand.type !== "unknown";
  const showUnknownCard = showCard && pendingCommand.type === "unknown";

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-3 pointer-events-none">

      {/* Success toast — appears after instant execution */}
      {executedText && (
        <div className="bg-gray-900 text-white rounded-xl px-4 py-2.5 shadow-xl flex items-center gap-2.5 w-full sm:w-auto sm:max-w-[300px] animate-fade-in pointer-events-auto">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium">{executedText}</p>
        </div>
      )}

      {/* Live transcript while listening */}
      {isListening && !pendingCommand && (
        <div className="bg-white rounded-xl border border-red-100 shadow-md px-4 py-2.5 w-full sm:w-auto sm:max-w-[260px] pointer-events-auto">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-medium text-red-600">Listening</span>
          </div>
          <p className="text-xs text-gray-600 italic leading-relaxed">
            {liveTranscript || "Say a command…"}
          </p>
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-md px-4 py-2.5 w-full sm:w-auto sm:max-w-[260px] flex items-center gap-2 pointer-events-auto">
          <svg className="animate-spin w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-xs text-gray-500 font-medium">Processing command…</p>
        </div>
      )}

      {/* Error toast */}
      {error && !pendingCommand && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 w-full sm:w-auto sm:max-w-[260px] pointer-events-auto">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Unknown command card */}
      {showUnknownCard && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full sm:w-72 p-4 pointer-events-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600">Couldn&apos;t understand</span>
            <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>
          <p className="text-xs text-gray-400 italic mb-3">&ldquo;{pendingCommand!.rawTranscript}&rdquo;</p>
          <p className="text-xs text-gray-500 mb-3">
            Try: <em>&quot;Mark [customer] as en route&quot;</em> or <em>&quot;[Tech] is done&quot;</em>
          </p>
          <button onClick={handleCancel} className="w-full py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors">
            Dismiss
          </button>
        </div>
      )}

      {/* Low-confidence card — still shows a countdown */}
      {showLowConfCard && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-xl w-full sm:w-72 p-4 pointer-events-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-amber-100 flex items-center justify-center">
                <svg className="w-3 h-3 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-gray-700">Low Confidence</span>
            </div>
            <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>

          <p className="text-xs text-gray-400 italic mb-2">&ldquo;{pendingCommand!.rawTranscript}&rdquo;</p>
          <p className="text-sm font-semibold text-gray-800 mb-3">→ {pendingCommand!.confirmation}</p>

          <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div
              ref={barRef}
              className="h-full bg-amber-400 rounded-full"
              style={{ transition: "width 2000ms linear", width: "100%" }}
            />
          </div>

          <div className="flex gap-2">
            <button onClick={handleCancel} className="flex-1 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-600 transition-colors">
              Cancel
            </button>
            <button onClick={handleExecuteNow} className="flex-1 py-2 rounded-xl bg-gray-900 hover:bg-gray-700 text-sm font-medium text-white transition-colors">
              Execute
            </button>
          </div>
        </div>
      )}

      {/* Mic button */}
      <button
        onClick={handleMicClick}
        disabled={isProcessing}
        title={isListening ? "Tap to stop" : "Voice command"}
        aria-label={isListening ? "Stop voice command listening" : "Start voice command listening"}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all pointer-events-auto
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
