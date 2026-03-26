"use client";

import { useState, useRef } from "react";
import { DEMO_NOTES, DEMO_RULES } from "@/lib/demoData";

interface Props {
  onParse: (notes: string, rules: string) => void;
  loading: boolean;
}

export default function InputPanel({ onParse, loading }: Props) {
  const [notes, setNotes] = useState("");
  const [rules, setRules] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadDemo = () => {
    setNotes(DEMO_NOTES);
    setRules(DEMO_RULES);
  };

  const handleSubmit = () => {
    if (!notes.trim()) return;
    onParse(notes, rules);
  };

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 tracking-tight">Input</h2>
          <p className="text-xs text-gray-400 mt-0.5">Paste notes or upload a whiteboard photo</p>
        </div>
        <button
          onClick={loadDemo}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        >
          Load demo →
        </button>
      </div>

      {/* Image upload */}
      <div
        onClick={() => fileRef.current?.click()}
        className="group flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 bg-gray-50 hover:bg-indigo-50/30 cursor-pointer transition-all py-5 px-4"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
        />
        <div className="w-8 h-8 rounded-lg bg-gray-200 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
          <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        {imageFile ? (
          <span className="text-xs font-medium text-indigo-600">{imageFile.name}</span>
        ) : (
          <span className="text-xs text-gray-400">Upload whiteboard photo <span className="text-gray-300">(optional)</span></span>
        )}
      </div>

      {/* Notes textarea */}
      <div className="flex flex-col gap-1.5 flex-1 min-h-0">
        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          Dispatcher Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={"Tech: Marcus Webb — HVAC senior\nJob: Rivera @ 2204 Elm — AC out, urgent\n..."}
          className="flex-1 min-h-[180px] w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all font-mono leading-relaxed"
        />
      </div>

      {/* Rules textarea */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          Dispatcher Rules
        </label>
        <textarea
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          placeholder={"If job is urgent, assign senior tech first\nCommercial jobs require commercial cert\n..."}
          rows={4}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all leading-relaxed"
        />
      </div>

      {/* Parse button */}
      <button
        onClick={handleSubmit}
        disabled={loading || !notes.trim()}
        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold transition-all shadow-sm hover:shadow-md disabled:shadow-none active:scale-[0.99]"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Parsing…
          </span>
        ) : (
          "Parse Notes →"
        )}
      </button>
    </div>
  );
}
