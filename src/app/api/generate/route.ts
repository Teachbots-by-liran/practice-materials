import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompt";
import type { GeneratorInput } from "@/lib/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured. Add it to your .env.local file." },
      { status: 500 }
    );
  }

  let input: GeneratorInput;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!input.topic && !input.isDeltaMode) {
    return NextResponse.json({ error: "Topic is required." }, { status: 400 });
  }
  if (input.isDeltaMode && !input.deltaText?.trim()) {
    return NextResponse.json({ error: "Please paste the text you want to retrofit." }, { status: 400 });
  }

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: buildUserPrompt(input) }],
    });

    const raw = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("");

    return NextResponse.json({ raw });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error from Claude API.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
