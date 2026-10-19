import test from 'node:test';
import assert from 'node:assert/strict';
import tool from '../netlify/functions/tool.mts';
import state from '../netlify/functions/state.mts';
import { validTool, validState, sameOrigin } from '../netlify/lib/validation.mts';

test('private tools and reads/writes are denied without a session', async () => {
  for (const [handler, url, method] of [
    [tool, 'https://example.test/.netlify/functions/tool?id=cartao_v8', 'GET'],
    [state, 'https://example.test/.netlify/functions/state?tool=cartao_v8', 'GET'],
    [state, 'https://example.test/.netlify/functions/state?tool=cartao_v8', 'PUT'],
  ] as const) {
    const result = await handler(new Request(url, { method }));
    assert.equal(result.status, 401);
  }
});
test('tool identifiers do not allow filesystem traversal', () => {
  assert.equal(validTool('cartao_v8'), true);
  for (const value of [null, '../index', 'cartao_v8.html', 'inicio', '/etc/passwd']) assert.equal(validTool(value), false);
});
test('saved state requires form fields and string storage values', () => {
  assert.equal(validState({ fields: { 'id:empresa': { value: '123' } }, storage: { checked: '1' } }), true);
  for (const value of [null, [], {}, { fields: [], storage: {} }, { fields: {}, storage: { key: {} } }, { fields: {}, storage: {}, user_id: 'other' }]) assert.equal(validState(value), false);
});
test('writes require a matching browser origin', () => {
  assert.equal(sameOrigin(new Request('https://example.test/api', { headers: { origin: 'https://example.test' } })), true);
  assert.equal(sameOrigin(new Request('https://example.test/api', { headers: { origin: 'https://attacker.test' } })), false);
  assert.equal(sameOrigin(new Request('https://example.test/api')), false);
});
