import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "ファイルが必要です" }, { status: 400 });
    }

    // ファイルサイズチェック (25MB = Whisper APIの上限)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "ファイルサイズは25MB以下にしてください" },
        { status: 400 }
      );
    }

    // ファイル形式チェック
    const allowedTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/mp4",
      "audio/m4a",
      "audio/x-m4a",
      "audio/wav",
      "audio/wave",
      "audio/webm",
      "video/mp4",
      "video/webm",
    ];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|m4a|wav|webm|mp4)$/i)) {
      return NextResponse.json(
        { error: "対応フォーマット: mp3, m4a, wav, webm" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 一時ファイルに保存
    const tmpDir = join(tmpdir(), "koe-asset-maker");
    await mkdir(tmpDir, { recursive: true });
    const fileId = randomUUID();
    const ext = file.name.split(".").pop() || "mp3";
    const filePath = join(tmpDir, `${fileId}.${ext}`);
    await writeFile(filePath, buffer);

    return NextResponse.json({
      fileId,
      filePath,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "アップロードに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
