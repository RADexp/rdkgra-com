// Astro kopiuje public/ do dist/ zanim treść z Notion (i pobrane przy buildzie
// obrazki) w ogóle się pojawi w public/notion-images — więc te obrazki nie
// trafiają automatycznie do finalnego outputu. Ten skrypt dogrywa je ręcznie
// po zakończeniu `astro build`, do wszystkich katalogów, które faktycznie
// mogą trafić na produkcję (dist/client lokalnie, .vercel/output/static na
// Vercelu).
import { cp, access } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const source = path.join(root, 'public', 'notion-images');

const targets = [
  path.join(root, 'dist', 'client', 'notion-images'),
  path.join(root, '.vercel', 'output', 'static', 'notion-images'),
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(source))) process.exit(0);

for (const target of targets) {
  const parent = path.dirname(target);
  if (!(await exists(parent))) continue;
  await cp(source, target, { recursive: true });
  console.log(`[sync-notion-images] skopiowano do ${path.relative(root, target)}`);
}
