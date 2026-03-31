"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KeyRound, ExternalLink, ArrowRight } from "lucide-react";

interface ApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (openai: string) => void;
  initialOpenai: string;
}

export function ApiKeyDialog({
  open,
  onClose,
  onSave,
  initialOpenai,
}: ApiKeyDialogProps) {
  const [openai, setOpenai] = useState(initialOpenai);
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    setOpenai(initialOpenai);
    if (initialOpenai) setShowGuide(false);
  }, [initialOpenai]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            {showGuide ? "はじめに：初期設定（2分で完了!）" : "APIキー設定"}
          </DialogTitle>
        </DialogHeader>

        {showGuide && !initialOpenai && (
          <div className="space-y-3 mt-1">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/15">
              <p className="text-sm leading-relaxed">
                このアプリは、音声の文字起こし・要約・SNS投稿案の生成に
                <strong>Groq</strong>という無料サービスを使います。
                最初に1回だけAPIキーを取得するだけでOK！
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                <div>
                  <p className="text-sm font-medium">Groqのサイトでアカウント作成</p>
                  <p className="text-xs text-muted-foreground">Googleアカウントで登録するだけ。完全無料です。</p>
                  <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1">
                    Groqを開く <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                <div>
                  <p className="text-sm font-medium">「Create API Key」をクリック</p>
                  <p className="text-xs text-muted-foreground">名前は何でもOK。表示されたキー（gsk_...）をコピー</p>
                </div>
              </div>
              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                <div>
                  <p className="text-sm font-medium">下の入力欄に貼り付けて「保存する」</p>
                  <p className="text-xs text-muted-foreground">これだけで文字起こし・要約・SNS投稿案が全部使えます！</p>
                </div>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={() => setShowGuide(false)} className="w-full gap-1">
              キー入力画面へ <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        )}

        {(!showGuide || initialOpenai) && (
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Groq APIキー
                <span className="text-muted-foreground font-normal ml-1">
                  (文字起こし・AI生成・完全無料)
                </span>
              </label>
              <Input
                type="password"
                placeholder="gsk_..."
                value={openai}
                onChange={(e) => setOpenai(e.target.value)}
              />
              <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1">
                GroqでAPIキーを無料取得 <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <Button
              onClick={() => onSave(openai)}
              className="w-full bg-primary hover:bg-primary/90"
              disabled={!openai}
            >
              {initialOpenai ? "保存する" : "保存して始める"}
            </Button>
            {!showGuide && !initialOpenai && (
              <button onClick={() => setShowGuide(true)} className="text-xs text-primary hover:underline w-full text-center">
                取得方法がわからない方はこちら
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
