"use client";

import { ProcessingStep } from "@/types";
import { Loader2, Check, Mic, FileText, Sparkles } from "lucide-react";

interface ProgressStepsProps {
  currentStep: ProcessingStep;
  title?: string;
}

const steps = [
  {
    key: "extracting" as const,
    label: "音声を取得中...",
    icon: Mic,
  },
  {
    key: "transcribing" as const,
    label: "文字起こし中...",
    icon: FileText,
  },
  {
    key: "generating" as const,
    label: "AIがコンテンツを生成中...",
    icon: Sparkles,
  },
];

export function ProgressSteps({ currentStep, title }: ProgressStepsProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="animate-slide-up">
      {title && (
        <p className="text-center text-sm text-muted-foreground mb-6">
          「{title}」
        </p>
      )}
      <div className="space-y-4 max-w-sm mx-auto">
        {steps.map((s, i) => {
          const isActive = s.key === currentStep;
          const isDone = i < currentIndex;
          const Icon = s.icon;

          return (
            <div
              key={s.key}
              className={`flex items-center gap-3 p-4 rounded-xl transition-all ${
                isActive
                  ? "bg-primary/10 border border-primary/30"
                  : isDone
                  ? "bg-green-50 border border-green-200"
                  : "bg-muted/50 border border-transparent opacity-40"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isActive
                    ? "bg-primary/20"
                    : isDone
                    ? "bg-green-100"
                    : "bg-muted"
                }`}
              >
                {isActive ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : isDone ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Icon className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <span
                className={`text-sm font-medium ${
                  isActive
                    ? "text-primary"
                    : isDone
                    ? "text-green-700"
                    : "text-muted-foreground"
                }`}
              >
                {isDone
                  ? s.label.replace("...", " 完了!")
                  : s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
