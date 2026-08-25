import type { Client } from '@notionhq/client';
import type {
  BlockObjectResponse,
  PartialBlockObjectResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { sanitizeUrl } from './sanitize-url';
import { extractYoutubeId, isYoutubeOnly } from './youtube';
import type { ContentBlock } from './types';

// Obrazki wklejone/wgrane bezpośrednio do Notion są hostowane na tymczasowych,
// wygasających linkach (S3, ważne ~1h) — nie nadają się do statycznego HTML.
// Dlatego pobieramy je raz przy buildzie i zapisujemy do public/, żeby na
// zbudowanej stronie link był trwały. Nazwa pliku = id bloku Notion (stabilne
// dopóki blok istnieje), więc kolejne buildy nie pobierają go ponownie.
const IMAGE_DIR = path.join(process.cwd(), 'public', 'notion-images');
const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

function extFromUrl(url: string): string | null {
  const match = /\.([a-z0-9]{2,4})(?:\?|$)/i.exec(new URL(url).pathname);
  return match ? match[1].toLowerCase() : null;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function saveNotionImage(url: string, blockId: string): Promise<string | null> {
  const guessedExt = extFromUrl(url) ?? 'jpg';
  const existing = await fileExists(path.join(IMAGE_DIR, `${blockId}.${guessedExt}`));
  if (existing) return `/notion-images/${blockId}.${guessedExt}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get('content-type')?.split(';')[0].trim() ?? '';
    const ext = EXT_BY_CONTENT_TYPE[contentType] ?? extFromUrl(url) ?? 'jpg';
    const filePath = path.join(IMAGE_DIR, `${blockId}.${ext}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await mkdir(IMAGE_DIR, { recursive: true });
    await writeFile(filePath, buffer);
    return `/notion-images/${blockId}.${ext}`;
  } catch (err) {
    console.warn(`[notion] Nie udało się pobrać obrazka (blok ${blockId}): ${err}`);
    return null;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function richTextToHtml(rich: RichTextItemResponse[]): string {
  return rich
    .map((rt) => {
      let text = escapeHtml(rt.plain_text);
      const link = rt.href ? sanitizeUrl(rt.href) : null;
      if (rt.annotations.code) text = `<code>${text}</code>`;
      if (rt.annotations.bold) text = `<strong>${text}</strong>`;
      if (rt.annotations.italic) text = `<em>${text}</em>`;
      if (link) {
        text = `<a href="${link}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      }
      return text;
    })
    .join('');
}

function richTextPlain(rich: RichTextItemResponse[]): string {
  return rich.map((rt) => rt.plain_text).join('');
}

async function fetchAllBlocks(client: Client, blockId: string): Promise<BlockObjectResponse[]> {
  const results: BlockObjectResponse[] = [];
  let cursor: string | undefined;
  do {
    const res = await client.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const block of res.results as (BlockObjectResponse | PartialBlockObjectResponse)[]) {
      if ('type' in block) results.push(block);
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return results;
}

// Renderer treści strony Notion → uproszczony model bloków (v1).
// Obsługiwane: nagłówki h1–h3, listy (bulleted), akapity (bold/italic/code/link),
// cytaty (quote → pull-quote), bloki kodu (code), obrazki (image, pobierane
// i self-hostowane przy buildzie), YouTube (paragraf-tylko-link, blok video,
// blok embed). Reszta pomijana w v1.
export async function getContentBlocks(client: Client, pageId: string): Promise<ContentBlock[]> {
  const blocks = await fetchAllBlocks(client, pageId);
  const out: ContentBlock[] = [];
  let pendingList: string[] = [];

  const flushList = () => {
    if (pendingList.length) {
      out.push({ type: 'ul', items: pendingList });
      pendingList = [];
    }
  };

  for (const block of blocks) {
    switch (block.type) {
      case 'heading_1':
        flushList();
        out.push({ type: 'h1', html: richTextToHtml(block.heading_1.rich_text) });
        break;
      case 'heading_2':
        flushList();
        out.push({ type: 'h2', html: richTextToHtml(block.heading_2.rich_text) });
        break;
      case 'heading_3':
        flushList();
        out.push({ type: 'h3', html: richTextToHtml(block.heading_3.rich_text) });
        break;
      case 'bulleted_list_item':
        pendingList.push(richTextToHtml(block.bulleted_list_item.rich_text));
        break;
      case 'paragraph': {
        flushList();
        const plain = richTextPlain(block.paragraph.rich_text);
        const ytId = extractYoutubeId(plain);
        if (ytId && isYoutubeOnly(plain)) {
          out.push({ type: 'youtube', youtubeId: ytId });
        } else {
          const html = richTextToHtml(block.paragraph.rich_text);
          if (html.trim()) out.push({ type: 'p', html });
        }
        break;
      }
      case 'quote':
        flushList();
        out.push({ type: 'quote', html: richTextToHtml(block.quote.rich_text) });
        break;
      case 'code':
        flushList();
        out.push({
          type: 'code',
          code: richTextPlain(block.code.rich_text),
          lang: block.code.language,
        });
        break;
      case 'image': {
        flushList();
        const img = block.image;
        const url = img.type === 'external' ? img.external.url : img.file.url;
        const src = await saveNotionImage(url, block.id);
        if (src) out.push({ type: 'image', src, alt: richTextPlain(img.caption) || undefined });
        break;
      }
      case 'video': {
        flushList();
        const url = block.video.type === 'external' ? block.video.external.url : null;
        const ytId = url ? extractYoutubeId(url) : null;
        if (ytId) out.push({ type: 'youtube', youtubeId: ytId });
        break;
      }
      case 'embed': {
        flushList();
        const ytId = extractYoutubeId(block.embed.url);
        if (ytId) out.push({ type: 'youtube', youtubeId: ytId });
        break;
      }
      default:
        // inne typy (callout, table, itd.) pomijane w v1
        flushList();
        break;
    }
  }
  flushList();
  return out;
}
