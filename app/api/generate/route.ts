import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { SYSTEM_PROMPT, buildGeneratePrompt } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  try {
    const { transcript, title, url, date } = await request.json();
    // GroqキーをGroq用ヘッダーまたはAnthropicキーヘッダーから取得（後方互換）
    const groqKey = request.headers.get("x-openai-key") || request.headers.get("x-anthropic-key");

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

    // GroqはOpenAI互換APIを提供
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

    // Groq LLaMAでコンテンツ生成
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 8000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    // レスポンスからJSONを抽出
    const responseText = completion.choices[0]?.message?.content || "";

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
