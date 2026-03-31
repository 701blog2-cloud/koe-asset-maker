"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";

export interface BatchResult {
  title: string;
  url: string;
  publishDate: string;
  text: string;
  error?: string;
  generated?: {
    obsidianNote: string;
    threadsPost: string;
    xPost: string;
    noteArticle: string;
  };
}

interface BatchResultsProps {
  results: BatchResult[];
  onReset: () => void;
}

type TabKey = "transcript" | "threads" | "x" | "note" | "obsidian";

function buildObsidianMd(r: BatchResult): string {
  if (r.generated?.obsidianNote) return r.generated.obsidianNote;
  return `---
title: "${r.title}"
date: ${r.publishDate || new Date().toISOString().split("T")[0]}
source: stand.fm
url: ${r.url}
tags: [standfm]
type: podcast-note
---

# ${r.title}

## 基本情報
- 配信日：${r.publishDate || "不明"}
- URL：${r.url}

## 文字起こし

${r.text}
`;
}

function buildCombinedMd(r: BatchResult): string {
  const base = buildObsidianMd(r);
  if (!r.generated) return base;
  return base + `
## Threads投稿案

${r.generated.threadsPost}

## X(Twitter)投稿案

${r.generated.xPost}

## note記事下書き

${r.generated.noteArticle}
`;
}

export function BatchResults({ results, onReset }: BatchResultsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Record<number, TabKey>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const successResults = results.filter((r) => !r.error);

  const getTab = (i: number): TabKey => activeTab[i] || "transcript";
  const setTab = (i: number, tab: TabKey) =>
    setActiveTab((prev) => ({ ...prev, [i]: tab }));

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getTabContent = (r: BatchResult, tab: TabKey): string => {
    switch (tab) {
      case "transcript": return r.text;
      case "threads": return r.generated?.threadsPost || "";
      case "x": return r.generated?.xPost || "";
      case "note": return r.generated?.noteArticle || "";
      case "obsidian": return buildObsidianMd(r);
    }
  };

  const handleDownloadCombined = () => {
    const allMd = successResults.map((r) => buildCombinedMd(r)).join("\n\n---\n\n");
    const blob = new Blob([allMd], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `standfm_all_${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async () => {
    for (const r of successResults) {
      const md = buildCombinedMd(r);
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filename =
        `${r.publishDate || "note"}_${r.title}`
          .replace(/[/\\?%*:|"<>]/g, "-")
          .slice(0, 80) + ".md";
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  };

  const handleDownloadSingle = (r: BatchResult) => {
    const md = buildCombinedMd(r);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const filename =
      `${r.publishDate || "note"}_${r.title}`
        .replace(/[/\\?%*:|"<>]/g, "-")
        .slice(0, 80) + ".md";
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: "transcript", label: "文字起こし" },
    { key: "obsidian", label: "Obsidian" },
    { key: "threads", label: "Threads" },
    { key: "x", label: "X" },
    { key: "note", label: "note" },
  ];

  return (
    <div className="animate-slide-up space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          一括変換完了! ({successResults.length}/{results.length}件)
        </h2>
        <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5">
          <RotateCcw className="w-4 h-4" />
          新しく変換
        </Button>
      </div>

      {/* ダウンロードボタン */}
      <div className="space-y-2">
        <Button
          onClick={handleDownloadZip}
          className="w-full bg-primary hover:bg-primary/90 gap-1.5"
        >
          <Download className="w-4 h-4" />
          全{successResults.length}件をダウンロード（1配信=1ファイル）
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Obsidianに入れるならこちら。文字起こし＋AI生成内容をまとめて保存。
        </p>
        <Button
          onClick={handleDownloadCombined}
          variant="outline"
          className="w-full gap-1.5"
        >
          <Download className="w-4 h-4" />
          全{successResults.length}件を1つのファイルにまとめてダウンロード
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          全配信を1ファイルに結合。一覧で見たい時や検索したい時に便利です。
        </p>
      </div>

      {/* 結果一覧 */}
      <div className="space-y-2">
        {results.map((r, i) => (
          <Card key={i} className={r.error ? "border-destructive/30" : ""}>
            <CardContent className="p-4">
              {/* ヘッダー行 */}
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {r.error ? (
                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                        エラー
                      </span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        完了
                      </span>
                    )}
                    <p className="text-sm font-medium truncate">{r.title}</p>
                  </div>
                  {r.publishDate && (
                    <p className="text-xs text-muted-foreground mt-0.5">{r.publishDate}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {!r.error && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleDownloadSingle(r); }}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {expandedIndex === i ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* 展開コンテンツ */}
              {expandedIndex === i && (
                <div className="mt-3 pt-3 border-t">
                  {r.error ? (
                    <p className="text-sm text-destructive">{r.error}</p>
                  ) : (
                    <div className="space-y-3">
                      {/* タブ */}
                      <div className="flex gap-1 flex-wrap">
                        {tabs.map((tab) => (
                          <button
                            key={tab.key}
                            onClick={() => setTab(i, tab.key)}
                            disabled={
                              (tab.key !== "transcript" && tab.key !== "obsidian") &&
                              !r.generated
                            }
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                              getTab(i) === tab.key
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed"
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* タブコンテンツ */}
                      <div className="relative">
                        <pre className="whitespace-pre-wrap text-sm leading-relaxed p-3 bg-muted/30 rounded-lg max-h-[300px] overflow-y-auto font-[inherit]">
                          {getTabContent(r, getTab(i))}
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 h-7 px-2"
                          onClick={() =>
                            handleCopy(getTabContent(r, getTab(i)), `${i}-${getTab(i)}`)
                          }
                        >
                          {copiedKey === `${i}-${getTab(i)}` ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
