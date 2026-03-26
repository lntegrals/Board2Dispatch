const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_FLASH_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

function getApiKey(): string {
  const key =
    process.env.GEMINI_API_KEY ??
    process.env.MINIMAX_API_KEY ??
    process.env.NEXT_PUBLIC_MINIMAX_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return key;
}

function cleanResponse(content: string): string {
  let cleaned = content.replace(/<think>[\s\S]*?<\/thinking>/g, "").trim();
  cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return cleaned;
}

function extractGeminiText(data: unknown): string {
  const candidate = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const text = parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  return cleanResponse(text);
}

export async function callMinimaxText(
  systemPrompt: string,
  userPrompt: string,
  opts?: { temperature?: number; maxOutputTokens?: number }
): Promise<string> {
  const response = await fetch(`${GEMINI_API_BASE}/${GEMINI_FLASH_MODEL}:generateContent?key=${getApiKey()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: opts?.temperature ?? 0.3,
        maxOutputTokens: opts?.maxOutputTokens ?? 2048,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return extractGeminiText(data);
}

export async function callMinimaxMultimodal(
  systemPrompt: string,
  userPrompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const response = await fetch(`${GEMINI_API_BASE}/${GEMINI_FLASH_MODEL}:generateContent?key=${getApiKey()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [
            { text: userPrompt },
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return extractGeminiText(data);
}
