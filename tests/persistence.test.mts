import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const bridge = await readFile('public/bridge.js', 'utf8');
async function setup(saved: object, respond = async () => Response.json({ version: 2, updated_at: new Date().toISOString() })) {
  const dom = new JSDOM('<!doctype html><html><body><input id="empresa"><input id="arquivo" type="file"><input id="password" type="password"><input id="checked" type="checkbox"></body></html>', { url: 'https://example.test', runScripts: 'outside-only' });
  await new Promise<void>(resolve => dom.window.addEventListener('load', () => resolve()));
  const win = dom.window as unknown as Window & { camiloInitial: unknown; camiloApi: unknown; eval: (source: string) => void };
  const calls: { state: { fields: Record<string, unknown>; storage: Record<string, string> }; version: number }[] = [];
  win.camiloInitial = { tool: 'cartao_v8', state: saved, version: 1 };
  win.camiloApi = async (_url: string, options: RequestInit) => { calls.push(JSON.parse(String(options.body))); return respond(); };
  win.eval(bridge);
  win.dispatchEvent(new dom.window.Event('load'));
  return { dom, win, calls };
}

test('restores personal fields and storage, saves changes without passwords or file fields', async () => {
  const { dom, win, calls } = await setup({ fields: { 'id:empresa': { value: '123' }, 'id:checked': { checked: true, value: 'on' } }, storage: { verification: '1' } });
  try {
    const empresa = win.document.getElementById('empresa') as HTMLInputElement;
    assert.equal(empresa.value, '123');
    assert.equal((win.document.getElementById('checked') as HTMLInputElement).checked, true);
    assert.equal(win.localStorage.getItem('verification'), '1');
    empresa.value = '456';
    win.localStorage.setItem('override', 'saved');
    empresa.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 1100));
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].state.fields['id:empresa'], { value: '456', checked: false });
    assert.equal(calls[0].state.storage.override, 'saved');
    assert.equal('id:arquivo' in calls[0].state.fields, false);
    assert.equal('id:password' in calls[0].state.fields, false);
  } finally { dom.window.close(); }
});

test('a version conflict prevents overwriting a newer saved state', async () => {
  const { dom, win, calls } = await setup({ fields: {}, storage: {} }, async () => Response.json({ error: 'Conflito de versão.' }, { status: 409 }));
  try {
    win.localStorage.setItem('first', 'value');
    await new Promise(resolve => setTimeout(resolve, 1100));
    assert.equal(calls.length, 1);
    win.localStorage.setItem('second', 'value');
    await new Promise(resolve => setTimeout(resolve, 1100));
    assert.equal(calls.length, 1);
  } finally { dom.window.close(); }
});
