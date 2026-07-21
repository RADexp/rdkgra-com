import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getEntries, articlesFor, urlFor } from '../lib/notion';

// Osobny feed angielski.
export async function GET(context: APIContext) {
  const articles = articlesFor(await getEntries(), 'en');
  return rss({
    title: 'Radek Grabarek — Blog',
    description: 'Latest posts by Radek Grabarek.',
    site: context.site!,
    items: articles.map((a) => ({
      title: a.title,
      link: urlFor(a),
      pubDate: a.publishedAt ? new Date(a.publishedAt) : undefined,
      description: a.excerpt ?? a.title,
    })),
  });
}
