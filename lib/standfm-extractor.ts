import { EpisodeInfo } from "@/types";

/**
 * stand.fmのエピソードURLから音声情報を抽出
 * ページHTML内のwindow.__SERVER_STATE__からデータを取得
 */
export async function extractStandfmEpisode(url: string): Promise<EpisodeInfo> {
  // URLバリデーション
  const standfmPattern = /^https?:\/\/(www\.)?stand\.fm\/episodes\/[\w-]+/;
  if (!standfmPattern.test(url)) {
    throw new Error("有効なstand.fmのエピソードURLを入力してください");
  }

  // ページを取得
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`ページの取得に失敗しました: ${response.status}`);
  }

  const html = await response.text();

  // window.__SERVER_STATE__ からJSONを抽出
  const stateMatch = html.match(
    /window\.__SERVER_STATE__\s*=\s*({[\s\S]*?});?\s*<\/script>/
  );

  if (!stateMatch) {
    // フォールバック: ogタグから情報を取得
    return extractFromOgTags(html, url);
  }

  try {
    const serverState = JSON.parse(stateMatch[1]);

    // episodesからタイトル・日付、topicsからaudio URLを取得
    const episodes = serverState?.episodes || {};
    const topics = serverState?.topics || {};

    // episodesからエピソード情報を取得
    let title = "タイトル不明";
    let publishDate: string | undefined;
    let description: string | undefined;

    const episodeKeys = Object.keys(episodes);
    if (episodeKeys.length > 0) {
      const ep = episodes[episodeKeys[0]] as Record<string, unknown>;
      title = (ep.title as string) || title;
      if (ep.createdAt) {
        const ts = Number(ep.createdAt);
        publishDate = (ts > 1e12
          ? new Date(ts)
          : new Date(ep.createdAt as string)
        ).toISOString().split("T")[0];
      }
      description = (ep.description as string) || undefined;
    }

    // topicsからaudio URLを取得
    let audioUrl = "";
    let duration: number | undefined;
    const topicKeys = Object.keys(topics);
    if (topicKeys.length > 0) {
      const topic = topics[topicKeys[0]] as Record<string, unknown>;
      audioUrl =
        (topic.downloadUrl as string) ||
        (topic.audioUrl as string) ||
        (topic.hlsPlaylistUrl as string) ||
        "";
      if (topic.duration) {
        duration = Number(topic.duration) / 1000;
      }
    }

    // episodesにaudioUrlがある場合のフォールバック
    if (!audioUrl && episodeKeys.length > 0) {
      const ep = episodes[episodeKeys[0]] as Record<string, unknown>;
      audioUrl =
        (ep.downloadUrl as string) ||
        (ep.audioUrl as string) ||
        (ep.hlsPlaylistUrl as string) ||
        "";
    }

    if (audioUrl) {
      return { title, audioUrl, duration, publishDate, description };
    }
  } catch (e) {
    console.error("SERVER_STATEのパースに失敗:", e);
  }

  // フォールバック
  return extractFromOgTags(html, url);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function extractFromOgTags(html: string, url: string): EpisodeInfo {
  const titleMatch = html.match(
    /<meta[^>]*property="og:title"[^>]*content="([^"]*)"/
  ) || html.match(/<title[^>]*>([^<]*)<\/title>/);

  const audioMatch = html.match(
    /https:\/\/cdncf\.stand\.fm\/audios\/[\w.-]+\.m4a/
  ) || html.match(
    /https:\/\/cdncf\.stand\.fm\/audios\/[\w.-]+/
  );

  if (!audioMatch) {
    throw new Error(
      "音声URLを取得できませんでした。音声ファイルを直接アップロードしてください。"
    );
  }

  return {
    title: titleMatch
      ? titleMatch[1]
          .replace(/\s*-\s*.*\|\s*stand\.fm$/, "")
          .replace(/\s*\| stand\.fm$/, "")
          .replace(/ - stand\.fm$/, "")
          .trim()
      : "タイトル不明",
    audioUrl: audioMatch[0],
    publishDate: new Date().toISOString().split("T")[0],
  };
}

/**
 * 音声URLから音声データをダウンロード
 */
export async function downloadAudio(audioUrl: string): Promise<Buffer> {
  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`音声のダウンロードに失敗: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
