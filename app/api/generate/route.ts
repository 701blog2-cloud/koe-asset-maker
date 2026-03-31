import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { SYSTEM_PROMPT, buildGeneratePrompt } from "@/lib/prompts";

/** JSON文字列内の制御文字をエスケープして安全にパースできるようにする */
function sanitizeJsonString(text: string): string {
  // ```json ... ``` コードブロックを取り除く
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) text = codeBlock[1].trim();

  // { ... } の最初と最後を探す
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) text = text.slice(start, end + 1);

  // JSON文字列値の中にある生の改行・タブ・制御文字をエスケープ
  // "key": "value\nwith\nnewlines" → 正しく \n にする
  let inString = false;
  let escaped = false;
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      result += ch;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }
    if (inString) {
      if (ch === "\n") { result += "\\n"; continue; }
      if (ch === "\r") { result += "\\r"; continue; }
      if (ch === "\t") { result += "\\t"; continue; }
      // その他の制御文字を除去
      if (ch.charCodeAt(0) < 0x20) continue;
    }
    result += ch;
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const { transcript, title, url, date } = await request.json();
    const groqKey =
      request.headers.get("x-openai-key") ||
      request.headers.get("x-anthropic-key");

    if (!groqKey) {
      return NextResponse.json(
        { error: "Groq APIキーを設定してください" },
        { status: 400 }
      );
    }

    if (!transcript) {
      return NextResponse.json(
        { error: "文字起こしテキストが必要です" },
        { status: 400 }
      );
    }

    const client = new OpenAI({
      apiKey: groqKey,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const userPrompt = buildGeneratePrompt({
      title: title || "タイトル不明",
      transcript,
      url,
      date,
    });

    // JSON強制モードで生成（Groq対応）
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 8000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const responseText = completion.choices[0]?.message?.content || "";

    // パース（サニタイズしてから）
    let parsed;
    try {
      parsed = JSON.parse(sanitizeJsonString(responseText));
    } catch {
      // サニタイズ後もだめなら生テキストをそのままパース
      try {
        parsed = JSON.parse(responseText);
      } catch {
        throw new Error(
          `AIの応答を解析できませんでした。もう一度試してみてください。`
        );
      }
    }

    return NextResponse.json({
      obsidianNote: parsed.obsidianNote || "",
      threadsPost: parsed.threadsPost || "",
      xPost: parsed.xPost || "",
      noteArticle: parsed.noteArticle || "",
    });
  } catch (error) {
    console.error("Generate error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "コンテンツの生成に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
