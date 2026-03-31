"use client";

import { useState, useCallback, useEffect } from "react";
import { ProcessingStep, TranscriptionResult } from "@/types";
import { Header } from "@/components/header";
import { ApiKeyDialog } from "@/components/api-key-dialog";
import { InputSection } from "@/components/input-section";
import { ProgressSteps } from "@/components/progress-steps";
import { ResultTabs } from "@/components/result-tabs";
import { BatchResults, BatchResult } from "@/components/batch-results";

type ViewMode = "single" | "batch";

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [step, setStep] = useState<ProcessingStep>("idle");
  const [error, setError] = useState<string>("");
  const [transcript, setTranscript] = useState<TranscriptionResult | null>(null);
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [episodeUrl, setEpisodeUrl] = useState("");
  const [episodeDate, setEpisodeDate] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [openaiKey, setOpenaiKey] = useState("");

  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const savedOpenai = localStorage.getItem("koe-openai-key") || "";
    setOpenaiKey(savedOpenai);
    if (!savedOpenai) setShowSettings(true);
  }, []);

  const saveKeys = useCallback((openai: string) => {
    setOpenaiKey(openai);
    localStorage.setItem("koe-openai-key", openai);
    setShowSettings(false);
  }, []);

  // --- 単件処理 ---
  const processFromUrl = useCallback(async (url: string) => {
    if (!openaiKey) { setShowSettings(true); return; }
    setViewMode("single");
    setError("");
    setTranscript(null);
    setEpisodeUrl(url);
    try {
      setStep("extracting");
      const extractRes = await fetch("/api/extract-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const extractData = await extractRes.json();
      if (!extractRes.ok) throw new Error(extractData.error);
      setEpisodeTitle(extractData.title || "");
      setEpisodeDate(extractData.publishDate || "");

      setStep("transcribing");
      const transRes = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-openai-key": openaiKey },
        body: JSON.stringify({ filePath: extractData.filePath }),
      });
      const transData = await transRes.json();
      if (!transRes.ok) throw new Error(transData.error);
      setTranscript(transData);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setStep("error");
    }
  }, [openaiKey]);

  const processFromFile = useCallback(async (file: File) => {
    if (!openaiKey) { setShowSettings(true); return; }
    setViewMode("single");
    setError("");
    setTranscript(null);
    setEpisodeUrl("");
    setEpisodeTitle(file.name.replace(/\.[^.]+$/, ""));
    try {
      setStep("extracting");
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload-audio", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error);

      setStep("transcribing");
      const transRes = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-openai-key": openaiKey },
        body: JSON.stringify({ filePath: uploadData.filePath }),
      });
      const transData = await transRes.json();
      if (!transRes.ok) throw new Error(transData.error);
      setTranscript(transData);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setStep("error");
    }
  }, [openaiKey]);

  // --- 一括処理 ---
  const processFromBatch = useCallback(async (urls: string[]) => {
    if (!openaiKey) { setShowSettings(true); return; }
    setViewMode("batch");
    setError("");
    setBatchResults([]);
    setStep("transcribing");
    setBatchProgress({ current: 0, total: urls.length });

    const results: BatchResult[] = [];

    for (let i = 0; i < urls.length; i++) {
      setBatchProgress({ current: i + 1, total: urls.length });
      try {
        const res = await fetch("/api/batch-transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-openai-key": openaiKey },
          body: JSON.stringify({ url: urls[i] }),
        });
        const data = await res.json();
        if (!res.ok) {
          results.push({ title: urls[i], url: urls[i], publishDate: "", text: "", error: data.error });
        } else {
          results.push({
            title: data.title || "タイトル不明",
            url: urls[i],
            publishDate: data.publishDate || "",
            text: data.text || "",
          });
        }
      } catch (err) {
        results.push({
          title: urls[i], url: urls[i], publishDate: "", text: "",
          error: err instanceof Error ? err.message : "処理に失敗しました",
        });
      }
      setBatchResults([...results]);
    }
    setStep("done");
  }, [openaiKey]);

  const reset = useCallback(() => {
    setStep("idle");
    setError("");
    setTranscript(null);
    setEpisodeTitle("");
    setEpisodeUrl("");
    setEpisodeDate("");
    setBatchResults([]);
    setBatchProgress({ current: 0, total: 0 });
    setViewMode("single");
  }, []);

  return (
    <>
      <Header onSettingsClick={() => setShowSettings(true)} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {step === "idle" && (
          <div className="text-center mb-10 animate-slide-up">
            <h1 className="text-3xl font-bold text-foreground mb-3">
              声の温度を、資産にしよう。
            </h1>
            <p className="text-muted-foreground text-lg">
              音声配信のURLを貼るだけで、文字起こしを自動化
            </p>
          </div>
        )}

        {(step === "idle" || step === "error") && (
          <InputSection
            onSubmitUrl={processFromUrl}
            onSubmitFile={processFromFile}
            onSubmitBatch={processFromBatch}
            error={error}
          />
        )}

        {viewMode === "single" && step !== "idle" && step !== "error" && step !== "done" && (
          <ProgressSteps currentStep={step} title={episodeTitle} />
        )}

        {viewMode === "batch" && step === "transcribing" && (
          <div className="animate-slide-up space-y-4">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">
                一括文字起こし中... ({batchProgress.current}/{batchProgress.total})
              </p>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className="bg-primary h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {batchProgress.current < batchProgress.total
                  ? `${batchProgress.current}件目を処理中...`
                  : "最終処理中..."}
              </p>
            </div>
            {batchResults.length > 0 && (
              <div className="space-y-1">
                {batchResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/30">
                    {r.error ? <span className="text-destructive">✗</span> : <span className="text-green-600">✓</span>}
                    <span className="truncate">{r.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {viewMode === "single" && step === "done" && transcript && (
          <ResultTabs
            transcript={transcript}
            title={episodeTitle}
            url={episodeUrl}
            date={episodeDate}
            onReset={reset}
          />
        )}

        {viewMode === "batch" && step === "done" && (
          <BatchResults results={batchResults} onReset={reset} />
        )}
      </main>

      <ApiKeyDialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={saveKeys}
        initialOpenai={openaiKey}
      />

      <footer className="text-center py-6 text-sm text-muted-foreground border-t space-y-1">
        <p>Koe Asset Maker - 声の温度を、資産にしよう。</p>
        <p className="text-xs">
          無料サービスのため、しばらくアクセスがないと次の表示に30秒ほどかかることがあります。
        </p>
      </footer>
    </>
  );
}
