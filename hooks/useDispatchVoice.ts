"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Workflow, PlanResult } from "@/lib/types";
import { parseVoiceCommand } from "@/lib/voiceCommands";
import type { VoiceCommand } from "@/lib/voiceCommands";

export interface DispatchVoiceState {
  isListening: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  liveTranscript: string;
  pendingCommand: VoiceCommand | null;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  dismiss: () => void;
}

export function useDispatchVoice(
  workflow: Workflow,
  plan: PlanResult | null
): DispatchVoiceState {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [pendingCommand, setPendingCommand] = useState<VoiceCommand | null>(null);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");
  const latestTranscriptRef = useRef("");
  // Keep stable refs to workflow/plan so onend closure stays fresh
  const workflowRef = useRef(workflow);
  const planRef = useRef(plan);
  useEffect(() => { workflowRef.current = workflow; }, [workflow]);
  useEffect(() => { planRef.current = plan; }, [plan]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SR);
  }, []);

  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Voice not supported in this browser.");
      return;
    }

    finalTranscriptRef.current = "";
    latestTranscriptRef.current = "";
    setLiveTranscript("");
    setError(null);
    setPendingCommand(null);

    const recognition = new SR();
    recognition.continuous = false; // single utterance — browser auto-stops on pause
    recognition.interimResults = true;
    recognition.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = `${event.results[i][0].transcript}`.trim();
        if (!piece) continue;
        if (event.results[i].isFinal) {
          finalChunk += `${piece} `;
        } else {
          interimChunk += `${piece} `;
        }
      }

      if (finalChunk) {
        finalTranscriptRef.current = `${finalTranscriptRef.current} ${finalChunk}`.replace(/\s+/g, " ").trim();
      }

      const composed = `${finalTranscriptRef.current} ${interimChunk}`.replace(/\s+/g, " ").trim();
      latestTranscriptRef.current = composed;
      setLiveTranscript(composed);
    };

    recognition.onend = async () => {
      setIsListening(false);
      const transcript = (finalTranscriptRef.current || latestTranscriptRef.current).trim();
      if (!transcript) return;

      setIsProcessing(true);
      try {
        const command = await parseVoiceCommand(
          transcript,
          workflowRef.current,
          planRef.current
        );
        setPendingCommand(command);
      } catch {
        setError("Failed to process voice command.");
      } finally {
        setIsProcessing(false);
        setLiveTranscript("");
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      setError(`Voice error: ${event.error}`);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const dismiss = useCallback(() => {
    setPendingCommand(null);
    setLiveTranscript("");
    setError(null);
  }, []);

  return {
    isListening,
    isProcessing,
    isSupported,
    liveTranscript,
    pendingCommand,
    error,
    startListening,
    stopListening,
    dismiss,
  };
}
