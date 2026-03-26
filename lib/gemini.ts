const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

function getApiKey(): string {
  const key = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_GEMINI_API_KEY is not set");
  return key;
}

export async function callGeminiText(
  systemPrompt: string,
  userPrompt: string,
  opts?: { temperature?: number; maxOutputTokens?: number }
): Promise<string> {
  const apiKey = getApiKey();
  const response = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: opts?.temperature ?? 0.4,
        maxOutputTokens: opts?.maxOutputTokens ?? 2000,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "") as string;
}

export async function callGeminiMultimodal(
  systemPrompt: string,
  userPrompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const apiKey = getApiKey();
  const response = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [
        {
          role: "user",
          parts: [
            { text: userPrompt },
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
          ],
        },
      ],
      generationConfig: { temperature: 0.1, maxOutputTokens: 2000 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "") as string;
}
