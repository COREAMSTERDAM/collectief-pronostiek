import "server-only";

export type ClubNewsSource = "clubwebsite" | "hln" | "nieuwsblad";

export type ImportedClubNewsItem = {
  source: ClubNewsSource;
  source_url: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  image_url: string | null;
  published_at: string | null;
  matched_keyword: string | null;
};

const CLUB_FEED_URL = "https://www.eendracht-aalst-lede.be/feed/";

const EXTERNAL_KEYWORDS = [
  "Iendracht",
  "Eendracht Aalst",
  "Eendracht Aalst-Lede",
  "Aalst-Lede",
] as const;

const SOURCE_LABELS: Record<ClubNewsSource, string> = {
  clubwebsite: "Clubwebsite",
  hln: "HLN",
  nieuwsblad: "Nieuwsblad",
};

function decodeEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
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
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = block.match(
    new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"),
  );
  return match ? decodeEntities(match[1]).trim() : "";
}

function extractImage(block: string) {
  const media =
    block.match(/<media:content[^>]+url=["']([^"']+)["']/i)?.[1] ??
    block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)?.[1];

  if (media) return decodeEntities(media);

  const content = pick(block, "content:encoded") || pick(block, "description");
  return content.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null;
}

function toIsoDate(value: string) {
  if (!value) return null;
  const date = new Date(stripHtml(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeForKeywordMatch(value: string) {
  return stripHtml(value)
    .toLocaleLowerCase("nl-BE")
    // Nieuwsmedia schrijven de clubnaam zowel met als zonder koppelteken.
    .replace(/[‐‑‒–—-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findMatchedKeyword(...values: string[]) {
  const haystack = normalizeForKeywordMatch(values.join(" "));

  for (const keyword of EXTERNAL_KEYWORDS) {
    if (haystack.includes(normalizeForKeywordMatch(keyword))) {
      return keyword;
    }
  }

  return null;
}

function googleNewsUrl(domain: string) {
  const terms = EXTERNAL_KEYWORDS.map((keyword) => `\"${keyword}\"`).join(" OR ");
  const query = `(${terms}) site:${domain}`;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=nl&gl=BE&ceid=BE:nl`;
}

function cleanGoogleNewsTitle(title: string, source: ClubNewsSource) {
  const label = SOURCE_LABELS[source];
  const publicationNames =
    source === "nieuwsblad"
      ? ["Nieuwsblad", "Het Nieuwsblad"]
      : [label];

  let cleaned = stripHtml(title);
  for (const publication of publicationNames) {
    cleaned = cleaned.replace(new RegExp(`\\s+-\\s+${publication.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), "");
  }
  return cleaned.trim();
}

async function fetchXml(url: string, errorLabel: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "user-agent": "Collectief Wit en Zwet supportersapp/1.0 (+clubnieuws)",
      accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`${errorLabel} ophalen mislukt (${response.status}).`);
  }

  return response.text();
}

export async function fetchClubWebsiteNews(): Promise<ImportedClubNewsItem[]> {
  const xml = await fetchXml(CLUB_FEED_URL, "Clubnieuws");
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

  return items
    .slice(0, 40)
    .map((block) => {
      const title = stripHtml(pick(block, "title"));
      const link = stripHtml(pick(block, "link"));
      const description = stripHtml(pick(block, "description"));
      const category = stripHtml(pick(block, "category"));

      return {
        source: "clubwebsite" as const,
        source_url: link,
        title,
        excerpt: description ? description.slice(0, 500) : null,
        category: category || "Clubwebsite",
        image_url: extractImage(block),
        published_at: toIsoDate(pick(block, "pubDate")),
        matched_keyword: null,
      };
    })
    .filter((item) => item.source_url && item.title);
}

async function fetchPublisherNews(
  source: Exclude<ClubNewsSource, "clubwebsite">,
  domain: string,
): Promise<ImportedClubNewsItem[]> {
  const xml = await fetchXml(googleNewsUrl(domain), SOURCE_LABELS[source]);
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

  return items
    .slice(0, 50)
    .map((block) => {
      const rawTitle = pick(block, "title");
      const description = stripHtml(pick(block, "description"));
      const title = cleanGoogleNewsTitle(rawTitle, source);
      const matchedKeyword = findMatchedKeyword(title, description);

      return {
        source,
        source_url: stripHtml(pick(block, "link")),
        title,
        excerpt: description ? description.slice(0, 500) : null,
        category: SOURCE_LABELS[source],
        image_url: extractImage(block),
        published_at: toIsoDate(pick(block, "pubDate")),
        matched_keyword: matchedKeyword,
      };
    })
    .filter((item) => item.source_url && item.title && item.matched_keyword);
}

export async function fetchHlnNews() {
  return fetchPublisherNews("hln", "hln.be");
}

export async function fetchNieuwsbladNews() {
  return fetchPublisherNews("nieuwsblad", "nieuwsblad.be");
}

export type ClubNewsSyncResult = {
  items: ImportedClubNewsItem[];
  counts: Record<ClubNewsSource, number>;
  errors: Partial<Record<ClubNewsSource, string>>;
};

export async function fetchAllClubNewsSources(): Promise<ClubNewsSyncResult> {
  const sources: Array<{
    source: ClubNewsSource;
    fetcher: () => Promise<ImportedClubNewsItem[]>;
  }> = [
    { source: "clubwebsite", fetcher: fetchClubWebsiteNews },
    { source: "hln", fetcher: fetchHlnNews },
    { source: "nieuwsblad", fetcher: fetchNieuwsbladNews },
  ];

  const settled = await Promise.allSettled(sources.map(({ fetcher }) => fetcher()));
  const items: ImportedClubNewsItem[] = [];
  const counts: Record<ClubNewsSource, number> = {
    clubwebsite: 0,
    hln: 0,
    nieuwsblad: 0,
  };
  const errors: Partial<Record<ClubNewsSource, string>> = {};

  settled.forEach((result, index) => {
    const source = sources[index].source;
    if (result.status === "fulfilled") {
      counts[source] = result.value.length;
      items.push(...result.value);
    } else {
      errors[source] = result.reason instanceof Error
        ? result.reason.message
        : `${SOURCE_LABELS[source]} ophalen mislukt.`;
    }
  });

  // source_url is unique in Supabase; dit houdt ook dubbele resultaten binnen één run tegen.
  const uniqueItems = Array.from(
    new Map(items.map((item) => [item.source_url, item])).values(),
  );

  return { items: uniqueItems, counts, errors };
}

// Backwards-compatible export voor eventuele bestaande imports.
export const fetchClubNewsFeed = fetchClubWebsiteNews;
