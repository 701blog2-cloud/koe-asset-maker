import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildGeneratePrompt } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  try {
    const { transcript, title, url, date } = await request.json();
    const anthropicKey = request.headers.get("x-anthropic-key");

    if (!anthropicKey) {
      return NextResponse.json(
        { error: "Anthropic APIキーを設定してください" },
        { status: 400 }
      );
    }

    if (!transcript) {
      return NextResponse.json(
        { error: "文字起こしテキストが必要です" },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey: anthropicKey });

    const userPrompt = buildGeneratePrompt({
      title: title || "タイトル不明",
      transcript,
      url,
      date,
    });

    // Claude APIでコンテンツ生成
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    // レスポンスからJSONを抽出
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // JSONをパース（コードブロック内の場合も対応）
    let parsed;
    try {
      // まずそのままJSONとしてパースを試みる
      parsed = JSON.parse(responseText);
    } catch {
      // ```json ... ``` 形式の場合
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        // 最後の手段: { ... } を探す
        const braceMatch = responseText.match(/\{[\s\S]*\}/);
        if (braceMatch) {
          parsed = JSON.parse(braceMatch[0]);
        } else {
          throw new Error("AIの応答を解析できませんでした");
        }
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
      error instanceof Error ? error.message : "コンテンツの生成に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
