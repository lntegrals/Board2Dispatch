# Board2Dispatch — Vibeathon Challenge Proposal

## Challenge Submission
**Challenge:** *"Close the Gap" — Build the Next Era of Vibe-Coding Tools* (Codefi)  
**Project:** Board2Dispatch  
**Primary lane:** HVAC dispatch teams (owners, office managers, coordinators with deep field knowledge but limited technical background)

---

## 1) Executive Summary
Board2Dispatch is an AI-assisted dispatch operating system that turns messy, real-world inputs (phone notes, texts, rough rule lists, partial context) into an explainable same-day dispatch plan in minutes.

It is intentionally built for the "Stacey" profile from the challenge story:
- deep domain insight,
- low technical confidence,
- high operational urgency,
- zero appetite for software complexity.

Instead of asking users to think like developers, Board2Dispatch asks them to describe their day in natural language and then provides:
1. a proposed plan,
2. plain-language "why" explanations,
3. scenario simulation for disruptions,
4. manual override controls at every critical step.

---

## 2) Problem We Solve (The Telephone-Game Gap)
Dispatch in many SMB service businesses still runs on whiteboards, sticky notes, and tribal knowledge. The gap appears when:
- frontline coordinators know the truth on the ground,
- software requires technical framing they do not have,
- and every handoff introduces distortion.

Board2Dispatch closes this gap by letting the problem owner stay in the driver seat while AI handles synthesis and optimization.

---

## 3) Why This Fits “Close the Gap”
The challenge asks for tools that help non-technical people move from **"I have a problem" → "I have a working solution"**.

Board2Dispatch demonstrates this directly:
- **Problem articulation:** Intake accepts plain-language context and business rules.
- **Solution generation:** Planner converts context into assignments automatically.
- **Guided iteration:** Follow-up questions and scenario controls refine outcomes.
- **Operational deployment:** The dispatch board is immediately usable by teams.
- **No code required by operator:** End users never touch source code.

---

## 4) Target User (Niche-Down Strategy)
We intentionally niche to **HVAC dispatch operations** first.

### Primary users
- Dispatch coordinator
- Small business owner/operator
- Office manager handling same-day service routing

### Why this niche is strategic
- Clear urgency hierarchy (urgent/high/normal/low)
- Frequent interruptions (emergency calls, technician unavailability, customer escalations)
- Heavy dependence on tacit domain knowledge
- Existing processes often fragmented and manual

Narrow focus increases out-of-the-box intelligence and creates the "magic" feeling for non-technical users.

---

## 5) Product Walkthrough

### A. Intake
User provides day context in plain language.

### B. Review
System extracts workers/jobs/rules and asks targeted follow-ups when needed.

### C. Plan build
AI planner scores worker-job matches using:
- required skills,
- availability/load,
- priority weighting,
- textual business rules.

### D. Explainability
Each assignment includes a "Why this match?" card in plain language.

### E. Scenario simulation
One-click or voice-triggered replanning for:
- technician unavailable,
- new emergency,
- customer escalated,
- full rebalance.

### F. Human override
Manual status changes and reassignment remain available at all times.

---

## 6) Human-Centered Design Principles
1. **Anxiety reduction first** — always show what happened and why.
2. **Transparency over magic** — visible scoring rationale and conflict notes.
3. **Human-in-the-loop by default** — no irreversible AI-only actions.
4. **Graceful fallback** — if parsing/planning confidence drops, user can still operate.
5. **Operational language, not engineering language** — built for dispatchers, not devs.

---

## 7) AI + System Architecture (High Level)
- **Input parsing layer:** Converts unstructured text into structured workflow entities.
- **Planner layer:** Heuristic scoring with veto constraints for safety/compliance.
- **Scenario layer:** Replans under controlled disruption events.
- **Explanation layer:** Converts score details into non-technical justification bullets.
- **UI orchestration layer:** Maintains phases (intake → review → dispatch) and manual controls.

---

## 8) Rubric Alignment

### Impact & Relevance (40%)
- Addresses a high-frequency, high-cost operational workflow.
- Keeps domain experts closest to the problem in decision control.
- Reduces missed urgency, overload risk, and coordination delays.

### Feasibility (15%)
- Pilot-ready inside a single HVAC team with existing dispatch practices.
- Low training burden due to natural-language intake and explicit UI cues.
- Incremental adoption possible (start with planning, add voice/scenario workflows later).

### Innovation (15%)
- Combines explainable heuristic planning + natural-language rule handling + scenario simulation.
- Emphasizes "AI that can be challenged" rather than opaque automation.
- Voice command integration supports fast operational contexts.

### User Experience (10%)
- Clear 3-phase journey.
- Immediate explainability embedded inside each job card.
- Manual overrides and recovery actions are always accessible.

### Demo Quality (20%)
- Strong narrative connection to real-world dispatch chaos.
- Clear before/after value demonstration potential.
- Reliable fallback behavior supports credible live demo flow.

---

## 9) Demo Script (5–7 minutes)
1. **Start in intake:** Paste messy dispatch notes and rule text.
2. **Review extraction:** Show workers/jobs/rules + follow-up question handling.
3. **Build plan:** Generate assignments.
4. **Open Why cards:** Explain AI reasoning in plain language.
5. **Inject disruption:** Trigger "tech unavailable" and show delta.
6. **Manual override:** Reassign a job and update status.
7. **Voice action:** Run emergency or rebalance command.
8. **Wrap:** Show reduced coordination burden and transparent decision flow.

---

## 10) Pilot Plan

### Week 1: Setup
- Configure workforce/job schema with one partner shop.
- Capture baseline metrics from current workflow.

### Weeks 2–3: Shadow mode
- Run Board2Dispatch alongside existing process.
- Compare AI plan vs human plan outcomes.

### Weeks 4–5: Assisted mode
- Use AI plan as default draft.
- Dispatcher confirms/edits and executes.

### Week 6: Evaluation
- Review metrics and operator feedback.
- Prioritize next improvements.

---

## 11) Success Metrics
- Time-to-first-dispatch plan
- % jobs assigned without escalation
- Urgent response latency
- Replan recovery time during disruptions
- Number of manual overrides (and why)
- Dispatcher trust score / perceived cognitive load

---

## 12) Risks & Mitigations
- **Risk:** Overtrust in AI decisions  
  **Mitigation:** Keep explanations and manual controls mandatory/visible.

- **Risk:** Sparse or noisy input text  
  **Mitigation:** Follow-up clarification flow and safe fallback behaviors.

- **Risk:** Change fatigue in existing teams  
  **Mitigation:** Start in shadow mode and preserve familiar dispatch concepts.

---

## 13) Future Roadmap
- Travel-time and geo-routing optimization
- Technician preference/relationship memory
- SLA-aware auto-alerting
- Multi-branch dispatch support
- End-customer ETA communication workflows
- Vertical templates beyond HVAC (electrical, plumbing, facilities)

---

## 14) Local Development
```bash
npm install
npm run dev
```
Then open `http://localhost:3000`.

> Note: production builds may require network access for font fetching depending on environment configuration.

---

## 15) Final Statement
Board2Dispatch is not "AI replacing dispatchers."  
It is **AI amplifying non-technical domain experts** so the people closest to the work can build and run better operational software decisions themselves.

That is the core spirit of **Close the Gap**.
