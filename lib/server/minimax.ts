const MINIMAX_API_BASE = "https://api.minimax.io/v1";

function getApiKey(): string {
  const key = process.env.MINIMAX_API_KEY ?? process.env.NEXT_PUBLIC_MINIMAX_API_KEY;
  if (!key) throw new Error("MINIMAX_API_KEY is not set");
  return key;
}

function cleanResponse(content: string): string {
  let cleaned = content.replace(/<think>[\s\S]*?<\/thinking>/g, "").trim();
  cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return cleaned;
}

export async function callMinimaxText(
  systemPrompt: string,
  userPrompt: string,
  opts?: { temperature?: number; maxOutputTokens?: number }
): Promise<string> {
  const response = await fetch(`${MINIMAX_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: "MiniMax-M2.7",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: opts?.temperature ?? 0.3,
      max_tokens: opts?.maxOutputTokens ?? 2048,
    }),
  });

  if (!response.ok) {
    throw new Error(`Minimax API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  return cleanResponse(content);
}

export async function callMinimaxMultimodal(
  systemPrompt: string,
  userPrompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const response = await fetch(`${MINIMAX_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: "MiniMax-M2.7",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`Minimax API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  return cleanResponse(content);
}
