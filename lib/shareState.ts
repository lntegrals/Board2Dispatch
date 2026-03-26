import type { Workflow, PlanResult } from "./types";

interface SharedBoardState {
  workflow: Workflow;
  plan: PlanResult;
}

export function encodeShareState(workflow: Workflow, plan: PlanResult): string {
  const json = JSON.stringify({ workflow, plan } satisfies SharedBoardState);
  // UTF-8 safe base64, URL-safe variant
  const bytes = new TextEncoder().encode(json);
  const binStr = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(binStr).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function decodeShareState(encoded: string): SharedBoardState | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binStr = atob(padded);
    const bytes = Uint8Array.from(binStr, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as SharedBoardState;
  } catch {
    return null;
  }
}
