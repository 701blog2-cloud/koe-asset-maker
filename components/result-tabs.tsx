"use client";

import { useState } from "react";
import { GeneratedContent, TranscriptionResult } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Check,
  Download,
  FileText,
  MessageSquare,
  Hash,
  BookOpen,
  RotateCcw,
  Mic,
} from "lucide-react";

interface ResultTabsProps {
  generated: GeneratedContent;
  transcript: TranscriptionResult | null;
  title: string;
  url: string;
  date: string;
  onReset: () => void;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-green-600" />
          <span className="text-green-600">コピーした!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          {label || "コピー"}
        </>
      )}
    </Button>
  );
}

function DownloadButton({
  text,
  filename,
}: {
  text: string;
  filename: string;
}) {
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
      <Download className="w-3.5 h-3.5" />
      .mdダウンロード
    </Button>
  );
}

function ContentCard({
  content,
  charCount,
}: {
  content: string;
  charCount?: boolean;
}) {
  return (
    <div className="relative">
      <pre className="whitespace-pre-wrap text-sm leading-relaxed p-4 bg-muted/30 rounded-lg max-h-[500px] overflow-y-auto font-[inherit]">
        {content}
      </pre>
      {charCount && (
        <span className="absolute bottom-2 right-3 text-xs text-muted-foreground bg-white/80 px-1.5 py-0.5 rounded">
          {content.length}文字
        </span>
      )}
    </div>
  );
}

export function ResultTabs({
  generated,
  transcript,
  title,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  url,
  date,
  onReset,
}: ResultTabsProps) {
  const obsidianFilename = `${date || "note"}_${title || "podcast"}.md`
    .replace(/[/\\?%*:|"<>]/g, "-")
    .slice(0, 100);

  return (
    <div className="animate-slide-up space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">変換完了!</h2>
        <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5">
          <RotateCcw className="w-4 h-4" />
          新しく変換
        </Button>
      </div>

      {title && (
        <p className="text-sm text-muted-foreground">
          「{title}」のコンテンツが完成しました
        </p>
      )}

      <Tabs defaultValue="obsidian">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="obsidian" className="flex flex-col gap-0.5 py-2 text-xs">
            <FileText className="w-4 h-4" />
            Obsidian
          </TabsTrigger>
          <TabsTrigger value="threads" className="flex flex-col gap-0.5 py-2 text-xs">
            <MessageSquare className="w-4 h-4" />
            Threads
          </TabsTrigger>
          <TabsTrigger value="x" className="flex flex-col gap-0.5 py-2 text-xs">
            <Hash className="w-4 h-4" />
            X
          </TabsTrigger>
          <TabsTrigger value="note" className="flex flex-col gap-0.5 py-2 text-xs">
            <BookOpen className="w-4 h-4" />
            note
          </TabsTrigger>
          <TabsTrigger value="transcript" className="flex flex-col gap-0.5 py-2 text-xs">
            <Mic className="w-4 h-4" />
            文字起こし
          </TabsTrigger>
        </TabsList>

        <TabsContent value="obsidian">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2 flex-wrap">
                <CopyButton text={generated.obsidianNote} />
                <DownloadButton
                  text={generated.obsidianNote}
                  filename={obsidianFilename}
                />
              </div>
              <ContentCard content={generated.obsidianNote} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="threads">
          <Card>
            <CardContent className="p-4 space-y-3">
              <CopyButton text={generated.threadsPost} />
              <ContentCard content={generated.threadsPost} charCount />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="x">
          <Card>
            <CardContent className="p-4 space-y-3">
              <CopyButton text={generated.xPost} />
              <ContentCard content={generated.xPost} charCount />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="note">
          <Card>
            <CardContent className="p-4 space-y-3">
              <CopyButton text={generated.noteArticle} />
              <ContentCard content={generated.noteArticle} charCount />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transcript">
          <Card>
            <CardContent className="p-4 space-y-3">
              <CopyButton text={transcript?.text || ""} />
              <ContentCard content={transcript?.text || "文字起こしがありません"} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
