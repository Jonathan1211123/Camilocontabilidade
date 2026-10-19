import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const html = await readFile('public/index.html', 'utf8');
const source = (await readFile('src/auth.js', 'utf8'))
  .replace(/^import .*?;\n/, 'const { signup, login, logout, getUser, handleAuthCallback, acceptInvite, updateUser, requestPasswordRecovery, onAuthChange } = window.identityMock;\n')
  .replace("await import('/panel.js')", 'window.panelLoaded = true');

for (const confirmed of [false, true]) {
  test(confirmed ? 'open signup opens the panel when a session exists' : 'open signup prompts email confirmation without a session', async () => {
    const dom = new JSDOM(html, { url: 'https://example.test', runScripts: 'outside-only' });
    let currentUser: { id: string } | null = null;
    let signupCalls = 0;
    Object.assign(dom.window, { identityMock: {
      signup: async () => { signupCalls++; currentUser = confirmed ? { id: 'new-account' } : null; },
      getUser: async () => currentUser,
      handleAuthCallback: async () => null,
      onAuthChange: () => {},
    } });
    try {
      await dom.window.eval('(async () => {' + source + '})()');
      const signupButton = dom.window.document.getElementById('signup') as HTMLButtonElement;
      signupButton.click();
      assert.equal(dom.window.document.getElementById('submit')!.textContent, 'Criar conta');
      assert.equal((dom.window.document.getElementById('password') as HTMLInputElement).minLength, 10);
      const form = dom.window.document.getElementById('auth-form')!;
      form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
      await new Promise(resolve => setTimeout(resolve, 10));
      assert.equal(signupCalls, 1);
      const workspace = dom.window.document.getElementById('workspace') as HTMLElement;
      assert.equal(workspace.hidden, !confirmed);
      if (!confirmed) assert.match(dom.window.document.getElementById('auth-message')!.textContent!, /confirme sua conta/);
    } finally { dom.window.close(); }
  });
}
