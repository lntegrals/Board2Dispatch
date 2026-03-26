const MINIMAX_API_BASE = "https://api.minimax.io/v1";

function getApiKey(): string {
  const key = process.env.NEXT_PUBLIC_MINIMAX_API_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_MINIMAX_API_KEY is not set");
  return key;
}

function cleanResponse(content: string): string {
  let cleaned = content.replace(/<think>[\s\S]*?<\/thinking>/g, "").trim();
  cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return cleaned;
}

export async function callGeminiText(
  systemPrompt: string,
  userPrompt: string,
  opts?: { temperature?: number; maxOutputTokens?: number }
): Promise<string> {
  const apiKey = getApiKey();
  const response = await fetch(`${MINIMAX_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "MiniMax-M2.7",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: opts?.temperature ?? 1.0,
      max_tokens: opts?.maxOutputTokens ?? 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`Minimax API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  return cleanResponse(content);
}

export async function callGeminiStream(
  systemPrompt: string,
  userPrompt: string,
  opts?: { temperature?: number; maxOutputTokens?: number },
  onChunk?: (text: string) => void
): Promise<string> {
  const apiKey = getApiKey();
  const response = await fetch(`${MINIMAX_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "MiniMax-M2.7",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: opts?.temperature ?? 0.6,
      max_tokens: opts?.maxOutputTokens ?? 3000,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Minimax API error: ${response.status}`);
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
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return cleanResponse(fullText);
      try {
        const chunk = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
        const text = chunk.choices?.[0]?.delta?.content ?? "";
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
  const apiKey = getApiKey();
  const response = await fetch(`${MINIMAX_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
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
      temperature: 1.0,
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    throw new Error(`Minimax API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  return cleanResponse(content);
}
