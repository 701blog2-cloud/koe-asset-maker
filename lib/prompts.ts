export const SYSTEM_PROMPT = `あなたは日本語ポッドキャストの内容を構造化するプロフェッショナルです。
ターゲット読者はママ・フリーランス・個人事業主の女性で、温かみのある分かりやすい文章を心がけてください。
口語的な表現は自然な書き言葉に整えつつ、話し手の温度感や熱意は残してください。`;

export function buildGeneratePrompt(params: {
  title: string;
  transcript: string;
  url?: string;
  date?: string;
}) {
  return `以下のポッドキャスト文字起こしを分析し、JSON形式で以下の4つを生成してください。
必ずJSONのみを出力し、他のテキストは含めないでください。

{
  "obsidianNote": "Obsidian用の構造化ノート（Markdown形式）",
  "threadsPost": "Threads投稿文",
  "xPost": "X投稿文",
  "noteArticle": "note.com用記事"
}

## obsidianNote のフォーマット:
\`\`\`markdown
---
title: "${params.title}"
date: ${params.date || new Date().toISOString().split("T")[0]}
source: stand.fm
url: ${params.url || ""}
tags: [standfm, 自動生成タグを追加]
type: podcast-note
---

# ${params.title}

## 基本情報
- 配信日：${params.date || "不明"}
- URL：${params.url || "なし"}

## 要点まとめ
（3-5個の箇条書き）

## 印象的な言葉
（> 引用形式で2-3個）

## アクションアイテム
（聴いた人がやれそうなこと）

## 文字起こし（全文）
（文字起こしをそのまま貼る）
\`\`\`

## threadsPost のルール:
- 500文字以内
- 改行多めで読みやすく
- 絵文字は控えめ（1-2個）
- 最初の1行で惹きつけるフック
- 共感を呼ぶ内容
- 最後に問いかけやCTA

## xPost のルール:
- 140文字以内
- フック重視の1行目
- 簡潔でインパクトのある文

## noteArticle のルール:
- 2000-3000文字
- 見出し付きで読みやすい構成
- 導入（共感）→ 本題（気づき）→ まとめ（背中押し）の流れ
- 口語を自然な書き言葉に整える
- 温かみを残しつつ読みやすく

---
エピソード情報:
タイトル: ${params.title}
配信日: ${params.date || "不明"}
URL: ${params.url || "なし"}

文字起こし:
${params.transcript}`;
}
