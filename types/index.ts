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

export interface GeneratedContent {
  obsidianNote: string;
  threadsPost: string;
  xPost: string;
  noteArticle: string;
}

export type ProcessingStep = "idle" | "extracting" | "transcribing" | "generating" | "done" | "error";

export interface ApiKeys {
  openaiKey: string;
  anthropicKey: string;
}
