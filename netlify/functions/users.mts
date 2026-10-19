import { admin, getUser, type User } from '@netlify/identity';
import { sameOrigin } from '../lib/validation.mts';

export function isAdmin(user: User | null): boolean {
  return Boolean(user?.roles?.includes('admin'));
}
function publicUser(user: User) {
  return { id: user.id, email: user.email, name: user.name, roles: user.roles ?? [], createdAt: user.createdAt, confirmedAt: user.confirmedAt, lastSignInAt: user.lastSignInAt };
}
export function createUsersHandler(identity = { getUser, admin }) {
  return async (req: Request) => {
    const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
    const session = await identity.getUser();
    if (!session?.id) return reply({ error: 'Entre na sua conta.' }, 401);
    if (!isAdmin(session)) return reply({ error: 'Acesso restrito a administradores.' }, 403);
    try {
      // Revalidate permissions so a removed role cannot keep managing users with an old session.
      const current = await identity.admin.getUser(session.id);
      if (!isAdmin(current)) return reply({ error: 'Acesso restrito a administradores.' }, 403);
      if (req.method === 'GET') {
        const page = Number(new URL(req.url).searchParams.get('page') ?? 1);
        if (!Number.isSafeInteger(page) || page < 1 || page > 10000) return reply({ error: 'Página inválida.' }, 400);
        const users = await identity.admin.listUsers({ page, perPage: 25 });
        return reply({ users: users.map(publicUser), page, hasNext: users.length === 25, currentUserId: current.id });
      }
      if (!['POST', 'PATCH'].includes(req.method)) return reply({ error: 'Método não permitido.' }, 405);
      if (!sameOrigin(req)) return reply({ error: 'Origem inválida.' }, 403);
      if (!req.headers.get('content-type')?.includes('application/json')) return reply({ error: 'Formato inválido.' }, 415);
      const raw = await req.text();
      if (raw.length > 8192) return reply({ error: 'Dados muito grandes.' }, 413);
      let body;
      try { body = JSON.parse(raw); } catch { return reply({ error: 'Dados inválidos.' }, 400); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({ error: 'Dados inválidos.' }, 400);
      if (req.method === 'POST') {
        if (typeof body.email !== 'string' || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || typeof body.password !== 'string' || body.password.length < 10 || body.password.length > 128 || !['member', 'admin'].includes(body.role)) return reply({ error: 'Informe e-mail, senha de 10 a 128 caracteres e permissão válida.' }, 400);
        // Admin-created accounts are confirmed by Identity and need no mailbox or confirmation link.
        const user = await identity.admin.createUser({ email: body.email.trim(), password: body.password, data: { app_metadata: { roles: [body.role] } } });
        return reply({ user: publicUser(user) }, 201);
      }
      if (typeof body.id !== 'string' || !/^[a-zA-Z0-9-]{1,128}$/.test(body.id) || !['member', 'admin'].includes(body.role)) return reply({ error: 'Usuário ou permissão inválidos.' }, 400);
      if (body.id === current.id) return reply({ error: 'Seu próprio acesso administrativo não pode ser alterado aqui.' }, 409);
      const target = await identity.admin.getUser(body.id);
      const roles = (target.roles ?? []).filter(role => role !== 'admin' && role !== 'member');
      const user = await identity.admin.updateUser(target.id, { app_metadata: { ...target.appMetadata, roles: [...roles, body.role] } });
      return reply({ user: publicUser(user) });
    } catch {
      return reply({ error: 'Não foi possível concluir. Confira se o e-mail já está cadastrado ou tente novamente.' }, 503);
    }
  };
}
export default createUsersHandler();
