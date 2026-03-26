const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_FLASH_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_MINIMAX_API_KEY;
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
  const text = (candidate?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  return cleanResponse(text);
}

export async function callGeminiText(
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
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: opts?.temperature ?? 1.0,
        maxOutputTokens: opts?.maxOutputTokens ?? 1024,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return extractGeminiText(data);
}

export async function callGeminiStream(
  systemPrompt: string,
  userPrompt: string,
  opts?: { temperature?: number; maxOutputTokens?: number },
  onChunk?: (text: string) => void
): Promise<string> {
  const response = await fetch(`${GEMINI_API_BASE}/${GEMINI_FLASH_MODEL}:streamGenerateContent?alt=sse&key=${getApiKey()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: opts?.temperature ?? 0.6,
        maxOutputTokens: opts?.maxOutputTokens ?? 3000,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  if (!response.body) {
    throw new Error("No response body for streaming");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const line = event
        .split("\n")
        .find((entry) => entry.startsWith("data:"));
      if (!line) continue;

      try {
        const payload = JSON.parse(line.slice(5).trim()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (text) {
          fullText += text;
          onChunk?.(text);
        }
      } catch {
        // skip malformed chunk
      }
    }
  }

  return cleanResponse(fullText);
}

export async function callGeminiMultimodal(
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
      systemInstruction: { parts: [{ text: systemPrompt }] },
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
        temperature: 1.0,
        maxOutputTokens: 512,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return extractGeminiText(data);
}
