import { NextRequest, NextResponse } from "next/server";
import { extractStandfmEpisode, downloadAudio } from "@/lib/standfm-extractor";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URLが必要です" }, { status: 400 });
    }

    // stand.fmからエピソード情報を取得
    const episode = await extractStandfmEpisode(url);

    // 音声をダウンロード
    const audioBuffer = await downloadAudio(episode.audioUrl);

    // 一時ファイルに保存
    const tmpDir = join(tmpdir(), "koe-asset-maker");
    await mkdir(tmpDir, { recursive: true });
    const fileId = randomUUID();
    const ext = episode.audioUrl.includes(".m4a") ? "m4a" : "mp3";
    const filePath = join(tmpDir, `${fileId}.${ext}`);
    await writeFile(filePath, audioBuffer);

    return NextResponse.json({
      fileId,
      filePath,
      title: episode.title,
      duration: episode.duration,
      publishDate: episode.publishDate,
      description: episode.description,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "音声の取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
