import { callGeminiMultimodal } from "./gemini";

const SYSTEM_PROMPT = `You are an OCR assistant for an HVAC dispatch office.
Extract ALL visible text from the image exactly as written — technician names, job addresses, priorities, notes, etc.
If the image is too blurry, unclear, or contains no relevant dispatch text, respond with exactly: UNCLEAR
Return only the extracted text with no other commentary.`;

const FALLBACK_QUESTIONS = [
  "Which technicians are available today, and what are their skills or certifications?",
  "What jobs or service calls need to be dispatched today? (customer names, addresses, problems)",
  "Are there any special priorities, rules, or notes for today's schedule?",
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function extractTextFromImage(
  file: File
): Promise<{ success: true; extractedText: string } | { success: false; fallbackQuestions: string[] }> {
  try {
    const base64 = await fileToBase64(file);
    const result = await callGeminiMultimodal(
      SYSTEM_PROMPT,
      "Extract all text from this dispatch whiteboard or notes image.",
      base64,
      file.type || "image/jpeg"
    );

    const trimmed = result.trim();
    if (!trimmed || trimmed === "UNCLEAR") {
      return { success: false, fallbackQuestions: FALLBACK_QUESTIONS };
    }

    return { success: true, extractedText: trimmed };
  } catch {
    return { success: false, fallbackQuestions: FALLBACK_QUESTIONS };
  }
}
