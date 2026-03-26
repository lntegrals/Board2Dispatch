const FALLBACK_QUESTIONS = [
  "Which technicians are available today, and what are their skills or certifications?",
  "What jobs or service calls need to be dispatched today? (customer names, addresses, problems)",
  "Are there any special priorities, rules, or notes for today's schedule?",
];

export async function extractTextFromImage(
  file: File
): Promise<{ success: true; extractedText: string } | { success: false; fallbackQuestions: string[] }> {
  try {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch("/api/ai/image", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error(`Image route error: ${response.status}`);
    const data = (await response.json()) as { text?: string };

    const trimmed = (data.text ?? "").trim();
    if (!trimmed || trimmed === "UNCLEAR") {
      return { success: false, fallbackQuestions: FALLBACK_QUESTIONS };
    }

    return { success: true, extractedText: trimmed };
  } catch {
    return { success: false, fallbackQuestions: FALLBACK_QUESTIONS };
  }
}
