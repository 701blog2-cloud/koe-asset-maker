export interface EpisodeInfo {
  title: string;
  audioUrl: string;
  duration?: number;
  publishDate?: string;
  description?: string;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments?: TranscriptSegment[];
}

export type ProcessingStep = "idle" | "extracting" | "transcribing" | "done" | "error";
