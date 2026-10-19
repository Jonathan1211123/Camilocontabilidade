export function validTool(id: string | null): id is string {
  return ['cartao_v8', 'fornecedores', 'invest_facil', 'folha_ca_doro', 'conciliador_fiscal', 'conciliacao_sieg_dominio', 'cartao_majepac_uniao'].includes(id ?? '');
}
export function validState(value: unknown): value is { fields: Record<string, unknown>; storage: Record<string, string> } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as Record<string, unknown>;
  if (Object.keys(state).some(k => !['fields', 'storage'].includes(k))) return false;
  for (const key of ['fields', 'storage']) {
    if (!state[key] || typeof state[key] !== 'object' || Array.isArray(state[key])) return false;
  }
  return Object.values(state.storage as object).every(v => typeof v === 'string');
}
export function sameOrigin(req: Request): boolean {
  return req.headers.get('origin') === new URL(req.url).origin;
}
