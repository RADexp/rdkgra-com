import type { APIRoute } from 'astro';
import { Client } from '@notionhq/client';

// Endpoint uruchamiany na żądanie (serverless na Vercel), NIE prerenderowany.
// Zapisuje adres e-mail z formularza newslettera do bazy w Notion.
export const prerender = false;

// Zmienne środowiskowe czytamy z runtime (process.env na Vercel), z fallbackiem
// na import.meta.env (przydatne w `astro dev`).
function env(key: string): string | undefined {
  return process.env[key] ?? (import.meta.env as Record<string, string | undefined>)[key];
}

interface Schema {
  titleProp: string; // kolumna „tytuł" (tu ląduje e-mail) — nazwa dowolna
  dateProp?: string; // pierwsza kolumna typu Date (opcjonalnie)
  langProp?: { name: string; type: 'select' | 'rich_text' }; // kolumna języka (opcjonalnie)
}

// Schemat bazy pobieramy raz i cache'ujemy w pamięci funkcji (reużywane między
// wywołaniami przy ciepłym starcie). Dzięki temu nazwy kolumn (poza samym
// tytułem) nie są sztywno zakodowane — dopasowujemy je po typie/nazwie.
let schemaCache: Schema | null = null;

async function getSchema(client: Client, dbId: string): Promise<Schema> {
  if (schemaCache) return schemaCache;
  const db = (await client.databases.retrieve({ database_id: dbId })) as {
    properties: Record<string, { type: string }>;
  };
  let titleProp = 'Name';
  let dateProp: string | undefined;
  let langProp: Schema['langProp'];
  for (const [name, prop] of Object.entries(db.properties)) {
    if (prop.type === 'title') titleProp = name;
    else if (prop.type === 'date' && !dateProp) dateProp = name;
    else if (
      (prop.type === 'select' || prop.type === 'rich_text') &&
      !langProp &&
      /j[eę]zyk|lang/i.test(name)
    ) {
      langProp = { name, type: prop.type as 'select' | 'rich_text' };
    }
  }
  schemaCache = { titleProp, dateProp, langProp };
  return schemaCache;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request }) => {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'content-type': 'application/json' },
    });

  // ── odczyt danych (JSON albo form-data) ──────────────────────────────────
  let email = '';
  let locale = '';
  let honeypot = '';
  try {
    const ct = request.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) {
      const b = (await request.json()) as Record<string, unknown>;
      email = String(b.email ?? '').trim();
      locale = String(b.locale ?? '');
      honeypot = String(b.company ?? '');
    } else {
      const f = await request.formData();
      email = String(f.get('email') ?? '').trim();
      locale = String(f.get('locale') ?? '');
      honeypot = String(f.get('company') ?? '');
    }
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  // Honeypot: pole „company" jest ukryte przed ludźmi; jeśli wypełnione → bot.
  // Udajemy sukces, żeby nie podpowiadać botowi, że go wykryliśmy.
  if (honeypot) return json({ ok: true });

  if (!EMAIL_RE.test(email) || email.length > 200) {
    return json({ ok: false, error: 'invalid_email' }, 422);
  }

  const token = env('NOTION_TOKEN');
  const dbId = env('NOTION_NEWSLETTER_DB_ID');
  if (!token || !dbId) return json({ ok: false, error: 'not_configured' }, 500);

  const client = new Client({ auth: token });
  try {
    const schema = await getSchema(client, dbId);

    // Deduplikacja: jeśli e-mail już jest, nie dodajemy drugiego wiersza.
    const existing = await client.databases.query({
      database_id: dbId,
      page_size: 1,
      filter: { property: schema.titleProp, title: { equals: email } },
    });
    if (existing.results.length) return json({ ok: true, already: true });

    const properties: Record<string, unknown> = {
      [schema.titleProp]: { title: [{ text: { content: email } }] },
    };
    if (schema.dateProp) {
      properties[schema.dateProp] = { date: { start: new Date().toISOString() } };
    }
    if (schema.langProp && locale) {
      properties[schema.langProp.name] =
        schema.langProp.type === 'select'
          ? { select: { name: locale } }
          : { rich_text: [{ text: { content: locale } }] };
    }

    await client.pages.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parent: { database_id: dbId },
      properties: properties as never,
    });
    return json({ ok: true });
  } catch (e) {
    console.error('subscribe error', e);
    return json({ ok: false, error: 'server_error' }, 500);
  }
};
