import { NextResponse } from "next/server";
import { extractImageTextWithAI } from "@/lib/server/ai";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "image file is required" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const text = await extractImageTextWithAI(base64, file.type || "image/jpeg");

    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown image extraction error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
