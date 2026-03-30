import { NextRequest, NextResponse } from "next/server";

/**
 * stand.fmのチャンネルURLからエピソード一覧を取得
 * 優先順位: RSS → HTMLフォールバック
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URLが必要です" }, { status: 400 });
    }

    // チャンネルIDを抽出
    const channelMatch = url.match(/stand\.fm\/channels\/([\w-]+)/);
    if (!channelMatch) {
      return NextResponse.json(
        { error: "stand.fmのチャンネルURLを入力してください\n例: https://stand.fm/channels/xxxxx" },
        { status: 400 }
      );
    }

    const channelId = channelMatch[1];

    // まずRSSフィードを試す（全件取れる）
    const rssResult = await fetchFromRss(channelId);
    if (rssResult.length > 0) {
      return NextResponse.json({
        episodes: rssResult,
        total: rssResult.length,
        source: "rss",
      });
    }

    // RSSが無効な場合、HTMLからフォールバック
    const htmlResult = await fetchFromHtml(url, channelId);
    return NextResponse.json({
      episodes: htmlResult.episodes,
      total: htmlResult.episodes.length,
      source: "html",
      error: htmlResult.episodes.length === 0
        ? "エピソード一覧を取得できませんでした。\nポッドキャスト配信を有効にするか、「URLを複数行で貼り付け」をお使いください。"
        : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "エピソード一覧の取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * RSSフィードからエピソード一覧を取得（ポッドキャスト配信が有効な場合）
 */
async function fetchFromRss(channelId: string) {
  type Episode = {
    id: string;
    title: string;
    url: string;
    publishDate: string;
    duration: number | null;
  };

  try {
    const rssUrl = `https://stand.fm/rss/${channelId}`;
    const response = await fetch(rssUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!response.ok) return [];

    const xml = await response.text();

    // XMLが有効なRSSか確認
    if (!xml.includes("<item>")) return [];

    const episodes: Episode[] = [];

    // <item>ブロックを抽出
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

    for (const item of items) {
      // タイトル
      const titleMatch = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
                          item.match(/<title>([\s\S]*?)<\/title>/);
      const title = titleMatch ? titleMatch[1].trim() : "タイトル不明";

      // URL（linkタグ）
      const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
      const epUrl = linkMatch ? linkMatch[1].trim() : "";

      // エピソードIDをURLから抽出
      const idMatch = epUrl.match(/episodes\/([\w-]+)/);
      const id = idMatch ? idMatch[1] : "";

      // 配信日
      const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      let publishDate = "";
      if (dateMatch) {
        try {
          publishDate = new Date(dateMatch[1].trim()).toISOString().split("T")[0];
        } catch {
          // 日付パース失敗
        }
      }

      // 再生時間（秒）
      const durationMatch = item.match(/<itunes:duration>([\s\S]*?)<\/itunes:duration>/);
      let duration: number | null = null;
      if (durationMatch) {
        const d = durationMatch[1].trim();
        // HH:MM:SS or MM:SS or 秒数
        if (d.includes(":")) {
          const parts = d.split(":").map(Number);
          if (parts.length === 3) {
            duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
          } else if (parts.length === 2) {
            duration = parts[0] * 60 + parts[1];
          }
        } else {
          duration = Number(d) || null;
        }
      }

      if (id && title) {
        episodes.push({ id, title, url: epUrl, publishDate, duration });
      }
    }

    return episodes;
  } catch {
    return [];
  }
}

/**
 * HTMLページからエピソード情報を抽出するフォールバック
 */
async function fetchFromHtml(url: string, channelId: string) {
  type Episode = {
    id: string;
    title: string;
    url: string;
    publishDate: string;
    duration: number | null;
  };

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
    });

    if (!response.ok) return { episodes: [] as Episode[] };

    const html = await response.text();

    // HTMLからエピソードリンクを抽出
    const linkPattern = /\/episodes\/([\w-]+)/g;
    const seenIds = new Set<string>();
    let match;
    while ((match = linkPattern.exec(html)) !== null) {
      const id = match[1];
      if (id && !seenIds.has(id) && id !== channelId) {
        seenIds.add(id);
      }
    }

    if (seenIds.size === 0) return { episodes: [] as Episode[] };

    // 各エピソードページからタイトルを並列取得
    const ids = Array.from(seenIds);
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          const epRes = await fetch(`https://stand.fm/episodes/${id}`, {
            headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
          });
          if (!epRes.ok) return { id, title: id, publishDate: "", duration: null };
          const epHtml = await epRes.text();

          const titleMatch = epHtml.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/);
          const title = titleMatch
            ? titleMatch[1].replace(/\s*-\s*.*\|\s*stand\.fm$/, "").replace(/\s*\| stand\.fm$/, "").trim()
            : id;

          let publishDate = "";
          const epState = epHtml.match(/window\.__SERVER_STATE__\s*=\s*({[\s\S]*?});?\s*<\/script>/);
          if (epState) {
            try {
              const state = JSON.parse(epState[1]);
              const topics = state?.topics || {};
              const epData = topics[id] as Record<string, unknown> | undefined;
              if (epData?.createdAt) {
                publishDate = new Date(epData.createdAt as string).toISOString().split("T")[0];
              }
            } catch { /* */ }
          }

          return { id, title, publishDate, duration: null };
        } catch {
          return { id, title: id, publishDate: "", duration: null };
        }
      })
    );

    const episodes: Episode[] = results.map((r) => ({
      id: r.id,
      title: r.title,
      url: `https://stand.fm/episodes/${r.id}`,
      publishDate: r.publishDate,
      duration: r.duration,
    }));

    episodes.sort((a, b) => (b.publishDate || "").localeCompare(a.publishDate || ""));

    return { episodes };
  } catch {
    return { episodes: [] as Episode[] };
  }
}
