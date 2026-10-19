import { getUser } from '@netlify/identity';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validTool } from '../lib/validation.mts';
export default async (req: Request) => {
  const user = await getUser();
  if (!user?.id) return new Response('Entre na sua conta para acessar.', { status: 401 });
  if (req.method !== 'GET') return new Response(null, { status: 405 });
  const id = new URL(req.url).searchParams.get('id');
  if (!validTool(id)) return new Response(null, { status: 404 });
  try {
    const html = await readFile(resolve('private/tools', `${id}.html`), 'utf8');
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' } });
  } catch {
    return new Response('Não foi possível abrir a ferramenta.', { status: 503 });
  }
};
