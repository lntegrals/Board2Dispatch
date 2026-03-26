"use client";

import { useState, useRef } from "react";
import type { DailyContext } from "@/lib/types";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { extractTextFromImage } from "@/lib/imageExtractor";
import { DEMO_CONTEXT } from "@/lib/demoData";

interface Props {
  onSubmit: (context: DailyContext) => void;
  loading: boolean;
  onLoadDemo: () => void;
  error?: string | null;
}

const QUICK_CHIPS = [
  { label: "Tech called in sick", text: "One of our techs called in sick this morning and is unavailable today." },
  { label: "Emergency no-cool call", text: "Emergency no-cool call just came in — customer has been without AC overnight, needs immediate response." },
  { label: "VIP escalation", text: "VIP customer escalation — this account needs priority handling and senior tech assignment." },
  { label: "Parts delayed", text: "Parts delivery is delayed — some jobs may need to be rescheduled or parts sourced locally." },
];

export default function IntakePanel({ onSubmit, loading, onLoadDemo, error }: Props) {
  const [typedText, setTypedText] = useState("");
  const [rulesText, setRulesText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageStatus, setImageStatus] = useState<
    | null
    | { state: "extracting" }
    | { state: "done"; text: string }
    | { state: "fallback"; questions: string[]; answers: string[] }
  >(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const voice = useVoiceInput();

  const handleImageUpload = async (file: File) => {
    setImageFile(file);
    setImageStatus({ state: "extracting" });
    const result = await extractTextFromImage(file);
    if (result.success) {
      setImageStatus({ state: "done", text: result.extractedText });
    } else {
      setImageStatus({
        state: "fallback",
        questions: result.fallbackQuestions,
        answers: result.fallbackQuestions.map(() => ""),
      });
    }
  };

  const appendChip = (text: string) => {
    setTypedText((prev) => (prev ? `${prev}\n${text}` : text));
  };

  const handleToggleVoice = () => {
    if (voice.isRecording) {
      voice.stopRecording();
    } else {
      voice.startRecording();
    }
  };

  const buildMergedText = (): string => {
    const parts: string[] = [];
    if (typedText.trim()) parts.push(typedText.trim());
    if (voice.transcript.trim()) parts.push(`[Voice notes] ${voice.transcript.trim()}`);
    if (imageStatus?.state === "done" && imageStatus.text) {
      parts.push(`[Whiteboard] ${imageStatus.text}`);
    }
    if (imageStatus?.state === "fallback") {
      const qaLines = imageStatus.questions
        .map((q, i) => `Q: ${q}\nA: ${imageStatus.answers[i] || "(no answer)"}`)
        .filter((_, i) => imageStatus.answers[i]?.trim())
        .join("\n");
      if (qaLines) parts.push(`[Whiteboard Q&A]\n${qaLines}`);
    }
    return parts.join("\n\n");
  };

  const handleSubmit = () => {
    const mergedText = buildMergedText();
    if (!mergedText.trim()) return;

    const context: DailyContext = {
      typedText,
      transcribedText: voice.transcript,
      imageExtractedText:
        imageStatus?.state === "done" ? imageStatus.text : "",
      rulesText,
      mergedText,
    };
    onSubmit(context);
  };

  const canSubmit = !!(
    typedText.trim() ||
    voice.transcript.trim() ||
    imageStatus?.state === "done" ||
    (imageStatus?.state === "fallback" && imageStatus.answers.some((a) => a.trim()))
  );

  const updateFallbackAnswer = (index: number, value: string) => {
    if (imageStatus?.state !== "fallback") return;
    const newAnswers = [...imageStatus.answers];
    newAnswers[index] = value;
    setImageStatus({ ...imageStatus, answers: newAnswers });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-900">Board2Dispatch</span>
            <span className="text-xs text-gray-400 hidden sm:inline">HVAC · AI Dispatch</span>
          </div>
          <button
            onClick={onLoadDemo}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            Load demo →
          </button>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-3xl mx-auto w-full px-6 pt-12 pb-6">
        <div className="mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Dispatch Copilot
          </span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight leading-tight mb-2">
          What&rsquo;s happened since yesterday?
        </h1>
        <p className="text-gray-500 text-base">
          Tell me about your team, jobs, and anything that changed overnight. Use voice, type, or upload a whiteboard photo.
        </p>
      </div>

      {/* Main content */}
      <div className="max-w-3xl mx-auto w-full px-6 pb-12 flex flex-col gap-6">

        {/* Quick chips */}
        <div className="flex flex-wrap gap-2">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => appendChip(chip.text)}
              className="px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 text-xs text-gray-600 hover:text-indigo-700 transition-all shadow-sm font-medium"
            >
              + {chip.label}
            </button>
          ))}
        </div>

        {/* Typed notes */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Today&rsquo;s Notes
          </label>
          <textarea
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            placeholder={`Who's working today, what jobs came in, anything unusual...`}
            rows={6}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent leading-relaxed"
          />
        </div>

        {/* Voice input */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Voice Notes
          </label>
          {voice.isSupported ? (
            <div className="flex flex-col gap-3">
              <button
                onClick={handleToggleVoice}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all font-medium text-sm ${
                  voice.isRecording
                    ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    : "border-gray-200 bg-gray-50 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    voice.isRecording ? "bg-red-500 animate-pulse" : "bg-gray-300"
                  }`}
                />
                {voice.isRecording ? "Recording… tap to stop" : "Tap to speak"}
                {voice.isRecording && (
                  <span className="ml-auto text-xs text-red-500 font-normal">live</span>
                )}
              </button>
              {voice.transcript && (
                <div className="rounded-xl bg-indigo-50/50 border border-indigo-100 px-4 py-3">
                  <p className="text-xs text-indigo-500 font-medium mb-1">Transcript</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{voice.transcript}</p>
                </div>
              )}
              {voice.error && (
                <p className="text-xs text-red-500">{voice.error}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-2">
              Your browser doesn&rsquo;t support voice — type notes instead.
            </p>
          )}
        </div>

        {/* Image upload */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Whiteboard Photo
          </label>
          <div className="flex gap-3">
            {/* Take Photo button */}
            <button
              onClick={() => cameraRef.current?.click()}
              className={`flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all py-6 px-4 ${
                imageFile
                  ? "border-indigo-300 bg-indigo-50/30"
                  : "border-gray-200 hover:border-indigo-300 bg-gray-50 hover:bg-indigo-50/20"
              }`}
            >
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImageUpload(f);
                }}
              />
              <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 font-medium">Take Photo</p>
                <p className="text-xs text-gray-400 mt-0.5">Open camera</p>
              </div>
            </button>

            {/* Upload button */}
            <button
              onClick={() => fileRef.current?.click()}
              className={`flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all py-6 px-4 ${
                imageFile
                  ? "border-indigo-300 bg-indigo-50/30"
                  : "border-gray-200 hover:border-indigo-300 bg-gray-50 hover:bg-indigo-50/20"
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImageUpload(f);
                }}
              />
              <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 font-medium">Upload</p>
                <p className="text-xs text-gray-400 mt-0.5">Choose file</p>
              </div>
            </button>
          </div>

          {imageStatus?.state === "extracting" && (
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <svg className="animate-spin w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Extracting text from image…
            </div>
          )}

          {imageStatus?.state === "done" && (
            <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3">
              <p className="text-xs text-emerald-700 font-medium mb-1">Extracted text</p>
              <p className="text-xs text-emerald-600 leading-relaxed whitespace-pre-wrap">{imageStatus.text}</p>
            </div>
          )}

          {imageStatus?.state === "fallback" && (
            <div className="mt-3 flex flex-col gap-3">
              <p className="text-xs text-amber-600 font-medium">Image unclear — please answer these questions:</p>
              {imageStatus.questions.map((q, i) => (
                <div key={i}>
                  <label className="text-xs text-gray-600 mb-1 block">{q}</label>
                  <input
                    type="text"
                    value={imageStatus.answers[i]}
                    onChange={(e) => updateFallbackAnswer(i, e.target.value)}
                    placeholder="Your answer…"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rules */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Shop Policies
          </label>
          <textarea
            value={rulesText}
            onChange={(e) => setRulesText(e.target.value)}
            placeholder={`If job is urgent, assign senior tech first\nCommercial jobs require commercial cert\n...`}
            rows={3}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent leading-relaxed"
          />
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800">AI parsing failed — using demo mode</p>
                <p className="text-xs text-amber-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleSubmit}
          disabled={loading || !canSubmit}
          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-base font-semibold transition-all shadow-sm hover:shadow-lg disabled:shadow-none active:scale-[0.99]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Understanding today…
            </span>
          ) : (
            "Understand Today →"
          )}
        </button>
      </div>
    </div>
  );
}
