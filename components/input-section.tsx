"use client";

import { useState, useRef, DragEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, Upload, AlertCircle, ArrowRight, List, Loader2 } from "lucide-react";

interface InputSectionProps {
  onSubmitUrl: (url: string) => void;
  onSubmitFile: (file: File) => void;
  onSubmitBatch: (urls: string[]) => void;
  error?: string;
}

export function InputSection({ onSubmitUrl, onSubmitFile, onSubmitBatch, error }: InputSectionProps) {
  const [url, setUrl] = useState("");
  const [batchUrls, setBatchUrls] = useState("");
  const [channelUrl, setChannelUrl] = useState("");
  const [channelEpisodes, setChannelEpisodes] = useState<Array<{ id: string; title: string; url: string; publishDate: string }>>([]);
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<string>>(new Set());
  const [loadingChannel, setLoadingChannel] = useState(false);
  const [channelError, setChannelError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = () => { if (url.trim()) onSubmitUrl(url.trim()); };

  const handleBatchSubmit = () => {
    const urls = batchUrls.split("\n").map((u) => u.trim()).filter((u) => u.startsWith("http"));
    if (urls.length > 0) onSubmitBatch(urls);
  };

  const handleChannelFetch = async () => {
    if (!channelUrl.trim()) return;
    setLoadingChannel(true);
    setChannelEpisodes([]);
    setChannelError("");
    try {
      const res = await fetch("/api/channel-episodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: channelUrl.trim() }),
      });
      const data = await res.json();
      if (data.error) setChannelError(data.error);
      setChannelEpisodes(data.episodes || []);
      setSelectedEpisodes(new Set());
    } catch (e) {
      setChannelError(e instanceof Error ? e.message : "取得に失敗しました");
      setChannelEpisodes([]);
    } finally {
      setLoadingChannel(false);
    }
  };

  const handleChannelBatch = () => {
    const urls = channelEpisodes.filter((e) => selectedEpisodes.has(e.id)).map((e) => e.url);
    if (urls.length > 0) onSubmitBatch(urls);
  };

  const toggleEpisode = (id: string) => {
    const next = new Set(selectedEpisodes);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedEpisodes(next);
  };

  const toggleAll = () => {
    setSelectedEpisodes(
      selectedEpisodes.size === channelEpisodes.length
        ? new Set()
        : new Set(channelEpisodes.map((e) => e.id))
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onSubmitFile(file);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onSubmitFile(file);
  };

  return (
    <div className="animate-slide-up space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive flex items-start gap-2 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 機能一覧カード */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-center space-y-1">
          <div className="text-xl">📋</div>
          <p className="text-xs font-semibold text-foreground">一括変換</p>
          <p className="text-xs text-muted-foreground leading-tight">チャンネルURL → 過去の配信を選んでまとめて変換</p>
        </div>
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-center space-y-1">
          <div className="text-xl">🔗</div>
          <p className="text-xs font-semibold text-foreground">1件変換</p>
          <p className="text-xs text-muted-foreground leading-tight">エピソードURL → 1件をすぐ変換</p>
        </div>
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-center space-y-1">
          <div className="text-xl">🎵</div>
          <p className="text-xs font-semibold text-foreground">ファイル</p>
          <p className="text-xs text-muted-foreground leading-tight">手元の音声ファイルをアップして変換</p>
        </div>
      </div>

      <Card className="border-2 border-dashed border-primary/20 bg-white/60">
        <CardContent className="p-6">
          <Tabs defaultValue="batch">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="batch" className="flex items-center gap-1.5">
                <List className="w-4 h-4" />一括変換
              </TabsTrigger>
              <TabsTrigger value="url" className="flex items-center gap-1.5">
                <Link className="w-4 h-4" />1件変換
              </TabsTrigger>
              <TabsTrigger value="file" className="flex items-center gap-1.5">
                <Upload className="w-4 h-4" />ファイル
              </TabsTrigger>
            </TabsList>

            {/* 一括変換タブ */}
            <TabsContent value="batch" className="space-y-4">

              {/* ポッドキャスト設定の案内（コンパクト） */}
              <div className="flex gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 items-start">
                <span className="text-base flex-shrink-0">📻</span>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-amber-800">ポッドキャスト配信をオンにしていますか？</p>
                  <p className="text-xs text-amber-700">
                    アプリ →「その他」→「チャンネルの設定」→「ポッドキャスト配信」をオンにするとチャンネルURLで全エピソードを取得できます
                  </p>
                  <p className="text-xs text-amber-600">オフの場合は↓のURLを直接貼り付けて使えます</p>
                </div>
              </div>

              {/* チャンネルURL取得 */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Step 1: チャンネルURLを貼り付け</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://stand.fm/channels/..."
                    value={channelUrl}
                    onChange={(e) => setChannelUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleChannelFetch}
                    disabled={!channelUrl.trim() || loadingChannel}
                    variant="outline"
                    className="gap-1 whitespace-nowrap"
                  >
                    {loadingChannel ? <Loader2 className="w-4 h-4 animate-spin" /> : "一覧を取得"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">⏱ 1件あたり30〜60秒。おすすめは5〜10件ずつ</p>
              </div>

              {channelError && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm whitespace-pre-line">
                  {channelError}
                </div>
              )}

              {channelEpisodes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Step 2: 変換する回を選択</p>
                    <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                      {selectedEpisodes.size === channelEpisodes.length ? "全解除" : "全選択"}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">全{channelEpisodes.length}件（{selectedEpisodes.size}件選択中）</p>
                  <div className="max-h-60 overflow-y-auto space-y-1 border rounded-lg p-2">
                    {channelEpisodes.map((ep) => (
                      <label key={ep.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedEpisodes.has(ep.id)}
                          onChange={() => toggleEpisode(ep.id)}
                          className="mt-1 accent-[hsl(var(--primary))]"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{ep.title}</p>
                          {ep.publishDate && <p className="text-xs text-muted-foreground">{ep.publishDate}</p>}
                        </div>
                      </label>
                    ))}
                  </div>
                  <Button
                    onClick={handleChannelBatch}
                    disabled={selectedEpisodes.size === 0}
                    className="w-full bg-primary hover:bg-primary/90 gap-1"
                  >
                    Step 3: {selectedEpisodes.size}件をまとめて変換開始！
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {channelEpisodes.length === 0 && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-muted-foreground">または</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">エピソードのURLを直接貼り付け</p>
                    <p className="text-xs text-muted-foreground">URLを1行ずつ貼り付けてください</p>
                    <textarea
                      placeholder={"https://stand.fm/episodes/xxx\nhttps://stand.fm/episodes/yyy"}
                      value={batchUrls}
                      onChange={(e) => setBatchUrls(e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    />
                    <Button
                      onClick={handleBatchSubmit}
                      disabled={!batchUrls.trim()}
                      className="w-full bg-primary hover:bg-primary/90 gap-1"
                    >
                      まとめて変換 <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            {/* 1件変換タブ */}
            <TabsContent value="url" className="space-y-3">
              <p className="text-sm text-muted-foreground">stand.fmのエピソードURLを貼り付けてください</p>
              <div className="flex gap-2">
                <Input
                  placeholder="https://stand.fm/episodes/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                  className="flex-1"
                />
                <Button
                  onClick={handleUrlSubmit}
                  disabled={!url.trim()}
                  className="bg-primary hover:bg-primary/90 gap-1"
                >
                  変換開始 <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </TabsContent>

            {/* ファイルタブ */}
            <TabsContent value="file">
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/40"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <Upload className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground mb-1">音声ファイルをドラッグ&ドロップ</p>
                <p className="text-xs text-muted-foreground/60">mp3, m4a, wav ・ 最大25MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.m4a,.wav,.webm,.mp4,audio/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
