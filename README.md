# Koe Asset Maker

声の温度を、資産にしよう。stand.fm の音声配信を文字起こしして、ブログ・note・SNSなどに展開できるテキスト資産に変換するツールです。

🌐 **本番URL**: https://koe-asset-maker.vercel.app

---

## 自動化に使えるAPI

ブラウザ操作なしでプログラムから直接使えるAPIを公開しています。
「最新の配信を毎日自動で文字起こし → Obsidianに保存 → SNS投稿の下書きを作る」といった自動化が組めます。

### 1. チャンネルのエピソード一覧を取得

```bash
curl -X POST https://koe-asset-maker.vercel.app/api/channel-episodes \
  -H "Content-Type: application/json" \
  -d '{"url": "https://stand.fm/channels/YOUR_CHANNEL_ID"}'
```

**レスポンス（最新順にソート済み）:**
```json
{
  "episodes": [
    {
      "id": "xxxxxxxx",
      "title": "今日のエピソードタイトル",
      "url": "https://stand.fm/episodes/xxxxxxxx",
      "publishDate": "2026-05-14",
      "duration": 420
    }
  ],
  "total": 1,
  "source": "rss"
}
```

最新エピソードだけ欲しい場合は `episodes[0]` を使ってください。

### 2. エピソードURLから文字起こし

```bash
curl -X POST https://koe-asset-maker.vercel.app/api/batch-transcribe \
  -H "Content-Type: application/json" \
  -H "x-openai-key: gsk_あなたのGroqキー" \
  -d '{"url": "https://stand.fm/episodes/xxxxxxxx"}'
```

**レスポンス:**
```json
{
  "title": "エピソードタイトル",
  "url": "https://stand.fm/episodes/xxxxxxxx",
  "publishDate": "2026-05-14",
  "duration": 420,
  "text": "（文字起こしされたテキスト全文）"
}
```

### APIキーについて

- `x-openai-key` ヘッダーには **あなた自身のGroqキー** または **OpenAIキー** を入れてください
  - Groq（無料枠あり・推奨）: https://console.groq.com/keys で取得（`gsk_` から始まる）
  - OpenAI: https://platform.openai.com/api-keys で取得
- キーはサーバーに保存されません。リクエストの都度、文字起こしAPIに転送されるだけです
- 料金は各自のAPIアカウントに対して発生します（Koe Asset Maker側では発生しません）

### CORS

両APIは `Access-Control-Allow-Origin: *` を返すため、サーバーサイドだけでなくブラウザのJavaScriptからも直接呼び出せます。

---

## ローカル開発

```bash
npm install
npm run dev
```

http://localhost:3000 を開いてください。

## 技術スタック

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Groq / OpenAI Whisper API（文字起こし）
- Vercel（デプロイ）
