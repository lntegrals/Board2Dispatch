import type { Workflow, DailyContext, FollowUpQuestion } from "./types";
import { callGeminiText } from "./gemini";

const DEFAULT_QUESTIONS: FollowUpQuestion[] = [
  {
    id: "fq1",
    question: "Are any technicians unavailable today due to illness, training, or other reasons?",
    answer: "",
  },
  {
    id: "fq2",
    question: "Are there any emergency or same-day calls that weren't mentioned in the notes?",
    answer: "",
  },
  {
    id: "fq3",
    question: "Are any customers flagged as VIP or high-priority accounts that need special attention?",
    answer: "",
  },
];

export async function generateFollowUpQuestions(
  workflow: Workflow,
  context: DailyContext
): Promise<FollowUpQuestion[]> {
  try {
    const systemPrompt = `You are a dispatch supervisor assistant for an HVAC company.
Given a dispatch plan summary, identify 3 critical gaps or clarifying questions a dispatcher should answer before finalizing the schedule.
Focus on: technician availability, hidden emergencies, customer priorities, skill gaps, or rule conflicts.
Return ONLY a JSON array of exactly 3 objects: [{"question": "..."}]
No markdown fences, no explanation — just the JSON array.`;

    const workerNames = workflow.workers.map((w) => w.name).join(", ");
    const jobSummary = workflow.jobs
      .map((j) => `${j.customerName} (${j.priority}): ${j.problem}`)
      .join("\n");

    const userPrompt = `Dispatch context:\n${context.mergedText || "(no additional context)"}\n\nTechnicians: ${workerNames || "none"}\nJobs:\n${jobSummary || "none"}\n\nWhat 3 questions should I ask to fill in any gaps before dispatching?`;

    const raw = await callGeminiText(systemPrompt, userPrompt, { temperature: 0.5 });
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as { question: string }[];

    return parsed.slice(0, 3).map((q, i) => ({
      id: `fq${i + 1}`,
      question: q.question,
      answer: "",
    }));
  } catch {
    return DEFAULT_QUESTIONS;
  }
}
