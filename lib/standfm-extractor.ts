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

  // URLからエピソードIDを抽出
  const episodeIdMatch = url.match(/\/episodes\/([\w-]+)/);
  const episodeId = episodeIdMatch ? episodeIdMatch[1] : null;

  try {
    const serverState = JSON.parse(stateMatch[1]);

    // episodesからタイトル・日付、topicsからaudio URLを取得
    const episodes = serverState?.episodes || {};
    const topics = serverState?.topics || {};

    // episodesからエピソード情報を取得
    let title = "タイトル不明";
    let publishDate: string | undefined;
    let description: string | undefined;

    // URLのエピソードIDで該当エントリを検索、なければ最初のエントリを使用
    const episodeKeys = Object.keys(episodes);
    console.log("[standfm] episodeId from URL:", episodeId);
    console.log("[standfm] episode keys in SERVER_STATE:", episodeKeys);

    // キー直接一致 → id/episodeId フィールド検索 → フォールバックの順で探す
    let targetEpisodeKey: string | undefined;
    if (episodeId && episodes[episodeId]) {
      targetEpisodeKey = episodeId;
    } else if (episodeId) {
      // キーがIDと一致しない場合、各エントリのid/episodeIdフィールドで検索
      targetEpisodeKey = episodeKeys.find((k) => {
        const ep = episodes[k] as Record<string, unknown>;
        return ep.id === episodeId || ep.episodeId === episodeId || ep.slug === episodeId;
      }) ?? episodeKeys[0];
    } else {
      targetEpisodeKey = episodeKeys[0];
    }
    console.log("[standfm] targetEpisodeKey:", targetEpisodeKey);

    if (targetEpisodeKey) {
      const ep = episodes[targetEpisodeKey] as Record<string, unknown>;
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

    // topicsからaudio URLを取得（URLのエピソードIDで該当エントリを検索）
    let audioUrl = "";
    let duration: number | undefined;
    const topicKeys = Object.keys(topics);
    console.log("[standfm] topic keys in SERVER_STATE:", topicKeys);

    let targetTopicKey: string | undefined;
    if (episodeId && topics[episodeId]) {
      targetTopicKey = episodeId;
    } else if (episodeId) {
      targetTopicKey = topicKeys.find((k) => {
        const t = topics[k] as Record<string, unknown>;
        return t.id === episodeId || t.episodeId === episodeId || t.slug === episodeId;
      }) ?? topicKeys[0];
    } else {
      targetTopicKey = topicKeys[0];
    }
    console.log("[standfm] targetTopicKey:", targetTopicKey);

    if (targetTopicKey) {
      const topic = topics[targetTopicKey] as Record<string, unknown>;
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
    if (!audioUrl && targetEpisodeKey) {
      const ep = episodes[targetEpisodeKey] as Record<string, unknown>;
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
