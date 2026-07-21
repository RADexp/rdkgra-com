import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getEntries, articlesFor, urlFor } from '../../lib/notion';

// Osobny feed polski.
export async function GET(context: APIContext) {
  const articles = articlesFor(await getEntries(), 'pl');
  return rss({
    title: 'Radek Grabarek — Blog',
    description: 'Najnowsze wpisy Radka Grabarka.',
    site: context.site!,
    items: articles.map((a) => ({
      title: a.title,
      link: urlFor(a),
      pubDate: a.publishedAt ? new Date(a.publishedAt) : undefined,
      description: a.excerpt ?? a.title,
    })),
  });
}
