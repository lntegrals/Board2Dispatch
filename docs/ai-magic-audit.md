# Board2Dispatch AI Audit + “Close the Gap” Optimization Plan

## Goal
Map every AI touchpoint in the current app, identify where the routing happens today, and propose a practical roadmap to make the experience feel more “magic” for non-technical dispatchers.

---

## 1) Current AI Surface Area (What AI Does Today)

### A. Intake understanding (core parsing)
- **Entry point:** `parseDispatchInput(inputText, rulesText)` in `lib/parser.ts`.
- **Model path:** Calls MiniMax chat completions via `callMinimax`.
- **Output:** `workflow` (workers/jobs/rules) + `followUps` + `warnings`.
- **Fallback:** Local heuristic parsing when model/API is unavailable.

### B. Image-to-text ingestion (whiteboard photo)
- **Entry point:** `extractTextFromImage(file)` in `lib/imageExtractor.ts`.
- **Model path:** Multimodal call via `callGeminiMultimodal`.
- **Output:** Extracted text or fallback question flow if unclear.

### C. Voice command interpretation (dispatch operations)
- **Entry point:** `parseVoiceCommand(transcript, workflow, plan)` in `lib/voiceCommands.ts`.
- **Model path:** Text call via `callGeminiText`.
- **Output:** Normalized command intent + params + confidence + confirmation.

### D. Action generation from the dispatch plan
- **Entry points:**
  - `generateTechBriefings(plan, workflow)` in `lib/actions.ts`
  - `generateCustomerETAs(plan, workflow)` in `lib/actions.ts`
- **Model path:** Streaming generation via `callGeminiStream`.
- **Output:** JSON sections rendered in `ActionPanel`.

---

## 2) Route Map (How Requests Flow)

## Update (Implemented)
The app now routes AI traffic through Next.js route handlers:
- `POST /api/ai/parse`
- `POST /api/ai/image`
- `POST /api/ai/voice`
- `POST /api/ai/actions`

Client modules call these internal endpoints instead of directly calling MiniMax from the browser.

### Runtime route flow today
1. `app/page.tsx` orchestrates app state transitions.
2. UI components call library functions directly:
   - Intake path: `IntakePanel` → `parseDispatchInput`
   - Image path: `IntakePanel` → `extractTextFromImage`
   - Voice path: `VoiceCommandBar/useDispatchVoice` → `parseVoiceCommand`
   - Action path: `ActionPanel` → `generateTechBriefings` / `generateCustomerETAs`
3. Library functions call internal route handlers; route handlers call shared server helpers in `lib/server/*` for provider access and prompt orchestration.

### Why this matters
- Provider access is now server-side via `MINIMAX_API_KEY` (with fallback support for existing env usage).
- Prompt logic and model contracts are distributed across multiple files and repeated cleaning/parsing logic.
- No centralized AI request policy, retry, observability, or guardrails per feature.

---

## 3) Gap Analysis Against “Close the Gap” Vision

### What already aligns well
- Multi-input ingestion (typed + voice + image) is exactly right for non-technical operators.
- Follow-up questions and warnings improve situational understanding without asking users to think in schema terms.
- Action generation (“briefings” and “ETAs”) converts plan data into immediately useful outputs.

### What blocks “magic” right now
1. **No unified AI orchestration layer**
   - Each feature uses its own prompt contract and parsing strategy.
2. **Weak reliability contract**
   - JSON extraction relies on string slicing and optimistic parsing.
3. **No memory across turns**
   - AI doesn’t persist user preferences, terminology, or operational style.
4. **No confidence-driven UX routing**
   - Voice commands provide confidence but no graduated confirmation policy.
5. **Security and production-readiness risk**
   - Security posture improved, but still needs stricter contracts, retries, and observability for production-grade reliability.

---

## 4) Optimization Blueprint (Prioritized)

## Phase 1 — Hardening + trust (fastest impact)
1. **Move all AI calls behind server-side API routes**
   - Create route handlers:
     - `app/api/ai/parse/route.ts`
     - `app/api/ai/image/route.ts`
     - `app/api/ai/voice/route.ts`
     - `app/api/ai/actions/route.ts`
   - Store key as `MINIMAX_API_KEY` (non-public).

2. **Add strict response schemas per feature**
   - Centralize JSON validation and normalization.
   - Return typed error categories: `validation_error`, `provider_error`, `timeout`, `unsafe_content`, etc.

3. **Introduce deterministic fallback tiers**
   - Tier 1: model retry with short “repair JSON” prompt.
   - Tier 2: local heuristics.
   - Tier 3: guided user clarification cards.

4. **Add instrumentation hooks**
   - Track per-feature latency, parse success rate, fallback rate, and token estimates.

## Phase 2 — Make it feel magical for dispatchers
1. **Context-aware intake copilot**
   - Pre-ask clarifying questions before full parse when confidence is low.
2. **Intent bundles for voice**
   - Convert one utterance into multi-step actions with transparent confirmation.
3. **Smart schedule explanations**
   - Explain *tradeoffs* (“Assigned to Priya because EPA608 + closest high urgency sequence”).
4. **“One-click publish” outputs**
   - Send ETA SMS drafts and tech briefings directly to delivery channels (Twilio/email/CRM).

## Phase 3 — Close-the-gap differentiator
1. **Persona memory for “Stacey mode”**
   - Learn operator language (“rooftop unit” vs “RTU”), company rules, and escalation style.
2. **Domain playbooks**
   - Start with HVAC (already strong), then branch into adjacent vertical packs.
3. **Outcome feedback loop**
   - Capture which generated decisions worked; continuously tune prompts/rules by outcomes.

---

## 5) Proposed “Magic Score” Metrics

Use these to evaluate progress against the challenge:
- **Time-to-first-usable-plan** (minutes)
- **First-pass parse success** (%)
- **Manual edits after AI parse** (count)
- **Voice command success without correction** (%)
- **Dispatcher confidence score** (1–5 quick pulse)
- **Automation completion rate** (briefings/ETAs sent without manual rewrite)

---

## 6) Recommended Immediate Next Step (1 sprint)

If you only do one sprint, do this:
1. Add `app/api/ai/*` route handlers and move provider calls server-side.
2. Create a shared `ai/contract.ts` with strict schemas and parse utilities.
3. Update current client modules to call the new internal routes.
4. Log success/failure + latency by feature.

This gives you security, reliability, and a foundation for the “magic” UX layers.
