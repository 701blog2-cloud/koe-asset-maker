import { NextRequest, NextResponse } from "next/server";
import { readFile, unlink } from "fs/promises";

export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json();
    const apiKey = request.headers.get("x-openai-key"); // Groq or OpenAI key

    if (!apiKey) {
      return NextResponse.json(
        { error: "APIキーを設定してください" },
        { status: 400 }
      );
    }

    if (!filePath) {
      return NextResponse.json(
        { error: "音声ファイルが見つかりません" },
        { status: 400 }
      );
    }

    // 音声ファイルを読み込み
    const audioBuffer = await readFile(filePath);

    const ext = filePath.split(".").pop() || "mp3";
    const mimeType = ext === "m4a" ? "audio/mp4" : `audio/${ext}`;

    // Groqキーかどうかを判定
    const isGroq = apiKey.startsWith("gsk_");
    const baseUrl = isGroq
      ? "https://api.groq.com/openai/v1"
      : "https://api.openai.com/v1";
    const model = isGroq ? "whisper-large-v3" : "whisper-1";

    // FormDataを構築
    const formData = new FormData();
    const file = new File([audioBuffer], `audio.${ext}`, { type: mimeType });
    formData.append("file", file);
    formData.append("model", model);
    formData.append("language", "ja");
    formData.append("response_format", "verbose_json");

    // Whisper API互換エンドポイントで文字起こし
    const response = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        (errorData as Record<string, unknown>)?.error &&
        typeof (errorData as Record<string, { message?: string }>).error === "object"
          ? (errorData as { error: { message: string } }).error.message
          : `文字起こしに失敗しました (${response.status})`;
      throw new Error(errorMessage as string);
    }

    const transcription = await response.json();

    // 一時ファイルを削除
    try {
      await unlink(filePath);
    } catch {
      // 削除失敗は無視
    }

    return NextResponse.json({
      text: transcription.text,
      segments: transcription.segments?.map(
        (s: { start: number; end: number; text: string }) => ({
          start: s.start,
          end: s.end,
          text: s.text,
        })
      ),
    });
  } catch (error) {
    console.error("Transcription error:", error);
    const message =
      error instanceof Error ? error.message : "文字起こしに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
