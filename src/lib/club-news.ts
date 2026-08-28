import "server-only";

export type ImportedClubNewsItem = {
  source_url: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  image_url: string | null;
  published_at: string | null;
};

const FEED_URL = "https://www.eendracht-aalst-lede.be/feed/";

function decodeEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value: string) {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pick(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeEntities(match[1]).trim() : "";
}

function extractImage(block: string) {
  const media = block.match(/<media:content[^>]+url=["']([^"']+)["']/i)?.[1]
    ?? block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)?.[1];
  if (media) return decodeEntities(media);

  const content = pick(block, "content:encoded") || pick(block, "description");
  return content.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null;
}

export async function fetchClubNewsFeed(): Promise<ImportedClubNewsItem[]> {
  const response = await fetch(FEED_URL, {
    cache: "no-store",
    headers: { "user-agent": "Collectief Wit en Zwet supportersapp/1.0" },
  });

  if (!response.ok) {
    throw new Error(`Clubnieuws ophalen mislukt (${response.status}).`);
  }

  const xml = await response.text();
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

  return items.slice(0, 30).map((block) => {
    const title = stripHtml(pick(block, "title"));
    const link = stripHtml(pick(block, "link"));
    const description = stripHtml(pick(block, "description"));
    const category = stripHtml(pick(block, "category"));
    const pubDate = stripHtml(pick(block, "pubDate"));
    const date = pubDate ? new Date(pubDate) : null;

    return {
      source_url: link,
      title,
      excerpt: description ? description.slice(0, 500) : null,
      category: category || null,
      image_url: extractImage(block),
      published_at: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
    };
  }).filter((item) => item.source_url && item.title);
}
