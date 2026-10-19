import { getUser } from '@netlify/identity';
import { getDatabase } from '@netlify/database';
import { validTool, validState, sameOrigin } from '../lib/validation.mts';
export default async (req: Request) => {
  const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
  const user = await getUser();
  if (!user?.id) return reply({ error: 'Sua sessão expirou. Entre novamente.' }, 401);
  if (!['GET', 'PUT'].includes(req.method)) return reply({ error: 'Método inválido.' }, 405);
  const id = new URL(req.url).searchParams.get('tool');
  if (!validTool(id)) return reply({ error: 'Ferramenta inválida.' }, 400);
  if (req.method === 'PUT' && !sameOrigin(req)) return reply({ error: 'Origem inválida.' }, 403);
  try {
    const db = getDatabase();
    if (req.method === 'GET') {
      const rows = await db.sql`SELECT state, version, updated_at FROM tool_states WHERE user_id = ${user.id} AND tool_id = ${id}`;
      return reply(rows[0] ?? { state: { fields: {}, storage: {} }, version: 0, updated_at: null });
    }
    const text = await req.text();
    if (Buffer.byteLength(text) > 1000000) return reply({ error: 'Os dados excedem o limite de 1 MB.' }, 413);
    let payload;
    try { payload = JSON.parse(text); } catch { return reply({ error: 'Dados inválidos.' }, 400); }
    if (!validState(payload.state) || !Number.isInteger(payload.version) || payload.version < 0) return reply({ error: 'Dados inválidos.' }, 400);
    await db.sql`INSERT INTO panel_users (id, email) VALUES (${user.id}, ${user.email ?? ''}) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = now()`;
    const rows = payload.version === 0
      ? await db.sql`INSERT INTO tool_states (user_id, tool_id, state) VALUES (${user.id}, ${id}, ${JSON.stringify(payload.state)}::jsonb) ON CONFLICT DO NOTHING RETURNING version, updated_at`
      : await db.sql`UPDATE tool_states SET state = ${JSON.stringify(payload.state)}::jsonb, version = version + 1, updated_at = now() WHERE user_id = ${user.id} AND tool_id = ${id} AND version = ${payload.version} RETURNING version, updated_at`;
    if (!rows.length) return reply({ error: 'Há uma versão mais recente salva em outra aba. Reabra a ferramenta antes de editar.' }, 409);
    return reply(rows[0]);
  } catch {
    return reply({ error: 'Não foi possível acessar o banco. Tente novamente.' }, 503);
  }
};
