import { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { slugify } from './slugify';
import { sanitizeUrl } from './sanitize-url';
import { getContentBlocks } from './notion-blocks';
import type { ContentBlock, Entry, EntryType, Locale } from './types';

const FORMAT_MAP: Record<string, EntryType> = {
  'blog post': 'article',
  podstrona: 'page',
  HP: 'home',
};

const LANG_MAP: Record<string, Locale> = {
  Polski: 'pl',
  Angielski: 'en',
};

const PUBLISHED_STATUS = 'Opublikowane';

// ── odczyt właściwości Notion ────────────────────────────────────────────────
function getTitle(prop: any): string {
  if (prop?.type === 'title') return prop.title.map((t: any) => t.plain_text).join('');
  return '';
}
function getSelect(prop: any): string {
  return prop?.select?.name ?? '';
}
function getMultiSelect(prop: any): string[] {
  return prop?.multi_select?.map((o: any) => o.name) ?? [];
}
function getUrl(prop: any): string | undefined {
  return sanitizeUrl(prop?.url ?? null) ?? undefined;
}
function getDate(prop: any): string | undefined {
  const raw = prop?.date?.start;
  return typeof raw === 'string' ? raw : undefined;
}
function getRelationId(prop: any): string | undefined {
  return prop?.relation?.[0]?.id ?? undefined;
}

// Lead na kafelku listy = pierwszy akapit treści (auto), przycięty.
function excerptFrom(content: ContentBlock[]): string | undefined {
  const first = content.find((b) => b.type === 'p' && b.html);
  if (!first?.html) return undefined;
  const text = first.html.replace(/<[^>]+>/g, '').trim();
  if (!text) return undefined;
  return text.length > 200 ? `${text.slice(0, 200).trimEnd()}…` : text;
}

async function fetchAllPages(client: Client, databaseId: string): Promise<PageObjectResponse[]> {
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;
  do {
    const res = await client.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const page of res.results) {
      if ('properties' in page) pages.push(page as PageObjectResponse);
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return pages;
}

let cache: Entry[] | null = null;

export async function getEntries(): Promise<Entry[]> {
  if (cache) return cache;

  const token = import.meta.env.NOTION_TOKEN;
  const databaseId = import.meta.env.NOTION_DATABASE_ID;
  if (!token || !databaseId) {
    throw new Error(
      'Brak NOTION_TOKEN / NOTION_DATABASE_ID w zmiennych środowiskowych. Sprawdź .env (patrz .env.example).',
    );
  }

  const client = new Client({ auth: token });
  const pages = await fetchAllPages(client, databaseId);

  // temp: id Notion → id partnera z relacji "Tłumaczenie" (rozwiązywane w 2. przejściu)
  const rawTranslation = new Map<string, string | undefined>();
  const byNotionId = new Map<string, Entry>();
  const seenSlugs = new Map<string, number>(); // klucz: `${locale}:${slug}`
  const entries: Entry[] = [];

  for (const page of pages) {
    const props = page.properties;

    const title = getTitle(props['Tytuł']);
    if (!title) continue; // brak tytułu = nieużyteczny wiersz

    if (getSelect(props['Status']) !== PUBLISHED_STATUS) continue; // tylko opublikowane

    const type = FORMAT_MAP[getSelect(props['Format'])];
    if (!type) {
      console.warn(`[notion] Pomijam "${title}" — nieznany/pusty Format.`);
      continue;
    }

    const locale = LANG_MAP[getSelect(props['Język'])];
    if (!locale) {
      console.warn(`[notion] Pomijam "${title}" — nieznany/pusty Język.`);
      continue;
    }

    // slug per locale; kolizje w obrębie tego samego języka dostają sufiks
    let slug = type === 'home' ? 'home' : slugify(title);
    if (!slug) slug = 'strona';
    if (type !== 'home') {
      const key = `${locale}:${slug}`;
      const count = seenSlugs.get(key) ?? 0;
      if (count > 0) {
        console.warn(`[notion] Kolizja sluga "${slug}" (${locale}) dla "${title}" — dodaję sufiks.`);
        slug = `${slug}-${count + 1}`;
      }
      seenSlugs.set(key, count + 1);
    }

    const content = await getContentBlocks(client, page.id);

    const entry: Entry = {
      id: page.id,
      type,
      locale,
      slug,
      title,
      excerpt: type === 'article' ? excerptFrom(content) : undefined,
      cover: getUrl(props['URL okładki']),
      publishedAt: getDate(props['Data publikacji']),
      categories: getMultiSelect(props['Kategoria']),
      tags: getMultiSelect(props['Tagi']),
      content,
    };

    entries.push(entry);
    byNotionId.set(page.id, entry);
    rawTranslation.set(page.id, getRelationId(props['Tłumaczenie']));
  }

  // 2. przejście: podłącz tłumaczenie tylko jeśli partner istnieje i jest opublikowany
  for (const entry of entries) {
    const partnerId = rawTranslation.get(entry.id);
    if (!partnerId) continue;
    const partner = byNotionId.get(partnerId);
    if (partner && partner.locale !== entry.locale) {
      entry.translation = { locale: partner.locale, slug: partner.slug, type: partner.type };
    }
  }

  cache = entries;
  return entries;
}

// ── pomocnicze selektory dla stron ───────────────────────────────────────────
export function articlesFor(entries: Entry[], locale: Locale): Entry[] {
  return entries
    .filter((e) => e.type === 'article' && e.locale === locale)
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
}

export function pagesFor(entries: Entry[], locale: Locale): Entry[] {
  return entries.filter((e) => e.type === 'page' && e.locale === locale);
}

export function homeFor(entries: Entry[], locale: Locale): Entry | undefined {
  return entries.find((e) => e.type === 'home' && e.locale === locale);
}

// Ścieżka URL wpisu dla danego locale (EN bez prefiksu, PL z /pl/).
export function urlFor(entry: { locale: Locale; slug: string; type: EntryType }): string {
  const base = entry.locale === 'pl' ? '/pl' : '';
  if (entry.type === 'home') return `${base}/`;
  return `${base}/${entry.slug}/`;
}
