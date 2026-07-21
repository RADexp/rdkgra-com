import type { Client } from '@notionhq/client';
import type {
  BlockObjectResponse,
  PartialBlockObjectResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { sanitizeUrl } from './sanitize-url';
import { extractYoutubeId, isYoutubeOnly } from './youtube';
import type { ContentBlock } from './types';

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
// YouTube (paragraf-tylko-link, blok video, blok embed). Reszta pomijana w v1.
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
        // inne typy (image, quote, callout, itd.) pomijane w v1
        flushList();
        break;
    }
  }
  flushList();
  return out;
}
