import { NextRequest, NextResponse } from "next/server";
import { extractStandfmEpisode, downloadAudio } from "@/lib/standfm-extractor";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

/**
 * 1つのエピソードを処理（音声取得→文字起こし）
 * ストリーミングで進捗を返す
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    const apiKey = request.headers.get("x-openai-key");

    if (!apiKey) {
      return NextResponse.json(
        { error: "APIキーを設定してください" },
        { status: 400 }
      );
    }

    if (!url) {
      return NextResponse.json({ error: "URLが必要です" }, { status: 400 });
    }

    // 1. 音声情報を抽出
    const episode = await extractStandfmEpisode(url);

    // 2. 音声をダウンロード
    const audioBuffer = await downloadAudio(episode.audioUrl);

    // 3. 一時ファイルに保存
    const tmpDir = join(tmpdir(), "koe-asset-maker");
    await mkdir(tmpDir, { recursive: true });
    const fileId = randomUUID();
    const ext = episode.audioUrl.includes(".m4a") ? "m4a" : "mp3";
    const filePath = join(tmpDir, `${fileId}.${ext}`);
    await writeFile(filePath, audioBuffer);

    // 4. Groq/OpenAI Whisper APIで文字起こし
    const isGroq = apiKey.startsWith("gsk_");
    const baseUrl = isGroq
      ? "https://api.groq.com/openai/v1"
      : "https://api.openai.com/v1";
    const model = isGroq ? "whisper-large-v3" : "whisper-1";

    const formData = new FormData();
    const uint8 = new Uint8Array(audioBuffer);
    const blob = new Blob([uint8], {
      type: ext === "m4a" ? "audio/mp4" : `audio/${ext}`,
    });
    formData.append("file", blob, `audio.${ext}`);
    formData.append("model", model);
    formData.append("language", "ja");
    formData.append("response_format", "verbose_json");

    const transResponse = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    // 一時ファイルを削除
    try {
      await unlink(filePath);
    } catch {
      // 無視
    }

    if (!transResponse.ok) {
      const err = await transResponse.json().catch(() => ({}));
      const errMsg =
        (err as { error?: { message?: string } })?.error?.message ||
        `文字起こしに失敗 (${transResponse.status})`;
      throw new Error(errMsg);
    }

    const transcription = await transResponse.json();

    return NextResponse.json({
      title: episode.title,
      url,
      publishDate: episode.publishDate || "",
      duration: episode.duration,
      text: transcription.text,
    });
  } catch (error) {
    console.error("Batch transcribe error:", error);
    const message =
      error instanceof Error ? error.message : "処理に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
