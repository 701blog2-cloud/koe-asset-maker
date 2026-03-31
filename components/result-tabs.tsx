"use client";

import { useState } from "react";
import { TranscriptionResult } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Download, FileText, Mic, RotateCcw } from "lucide-react";

interface ResultTabsProps {
  transcript: TranscriptionResult | null;
  title: string;
  url: string;
  date: string;
  onReset: () => void;
}

function buildObsidianNote(title: string, url: string, date: string, text: string) {
  return `---
title: "${title}"
date: ${date || new Date().toISOString().split("T")[0]}
source: stand.fm
url: ${url}
tags: [standfm]
type: podcast-note
---

# ${title}

## 基本情報
- 配信日：${date || "不明"}
- URL：${url}

## 文字起こし

${text}
`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
      {copied ? (
        <><Check className="w-3.5 h-3.5 text-green-600" /><span className="text-green-600">コピーした!</span></>
      ) : (
        <><Copy className="w-3.5 h-3.5" />コピー</>
      )}
    </Button>
  );
}

function DownloadButton({ text, filename }: { text: string; filename: string }) {
  const handleDownload = () => {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
      <Download className="w-3.5 h-3.5" />.mdダウンロード
    </Button>
  );
}

export function ResultTabs({ transcript, title, url, date, onReset }: ResultTabsProps) {
  const obsidianNote = buildObsidianNote(title, url, date, transcript?.text || "");
  const filename = `${date || "note"}_${title || "podcast"}.md`
    .replace(/[/\\?%*:|"<>]/g, "-")
    .slice(0, 100);

  return (
    <div className="animate-slide-up space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">文字起こし完了!</h2>
        <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5">
          <RotateCcw className="w-4 h-4" />新しく変換
        </Button>
      </div>

      {title && (
        <p className="text-sm text-muted-foreground">「{title}」の文字起こしが完成しました</p>
      )}

      <Tabs defaultValue="transcript">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="transcript" className="flex flex-col gap-0.5 py-2 text-xs">
            <Mic className="w-4 h-4" />文字起こし
          </TabsTrigger>
          <TabsTrigger value="obsidian" className="flex flex-col gap-0.5 py-2 text-xs">
            <FileText className="w-4 h-4" />Obsidian用
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transcript">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2 flex-wrap items-center justify-between">
                <CopyButton text={transcript?.text || ""} />
                <span className="text-xs text-muted-foreground">{(transcript?.text || "").length}文字</span>
              </div>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed p-4 bg-muted/30 rounded-lg max-h-[500px] overflow-y-auto font-[inherit]">
                {transcript?.text || "文字起こしがありません"}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="obsidian">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2 flex-wrap">
                <CopyButton text={obsidianNote} />
                <DownloadButton text={obsidianNote} filename={filename} />
              </div>
              <p className="text-xs text-muted-foreground">
                Obsidianに貼るとそのまま使えるMarkdown形式です。ダウンロードしてVaultに入れるだけ！
              </p>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed p-4 bg-muted/30 rounded-lg max-h-[500px] overflow-y-auto font-[inherit]">
                {obsidianNote}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
