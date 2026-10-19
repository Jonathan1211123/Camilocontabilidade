(() => {
  const initial = window.camiloInitial;
  if (!initial) return;
  delete window.camiloInitial;
  const storage = Object.assign(Object.create(null), initial.state.storage);
  const memoryStorage = {
    getItem: key => Object.hasOwn(storage, String(key)) ? storage[String(key)] : null,
    setItem: (key, value) => { storage[String(key)] = String(value); schedule(); },
    removeItem: key => { delete storage[String(key)]; schedule(); },
    clear: () => { Object.keys(storage).forEach(key => delete storage[key]); schedule(); },
    key: index => Object.keys(storage)[index] ?? null,
    get length() { return Object.keys(storage).length; }
  };
  Object.defineProperty(window, 'localStorage', { value: memoryStorage });
  let version = initial.version, timer, ready = false, saving = false, pending = false, blocked = false, status, button;
  const fields = Object.assign(Object.create(null), initial.state.fields);
  const restored = new WeakSet();
  const controls = () => [...document.querySelectorAll('input,select,textarea')].filter(el => !['file', 'password', 'hidden', 'button', 'submit'].includes(el.type));
  const key = (el, index) => el.id ? 'id:' + el.id : el.name ? 'name:' + el.name + ':' + el.type + ':' + (el.type === 'radio' ? el.value : index) : 'index:' + index;
  function capture() {
    controls().forEach((el, index) => {
      fields[key(el, index)] = { value: el.value, checked: !!el.checked };
    });
    return { fields, storage };
  }
  function restore() {
    controls().forEach((el, index) => {
      if (restored.has(el)) return;
      restored.add(el);
      const saved = fields[key(el, index)];
      if (!saved || typeof saved !== 'object') return;
      if (typeof saved.value === 'string') el.value = saved.value;
      if (['checkbox', 'radio'].includes(el.type)) el.checked = !!saved.checked;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  function schedule() {
    if (!ready || blocked) return;
    pending = true;
    status.textContent = 'Alterações pendentes…';
    clearTimeout(timer);
    timer = setTimeout(save, 1000);
  }
  async function save() {
    clearTimeout(timer);
    if (!ready || saving || blocked) return;
    pending = false;
    saving = true;
    button.disabled = true;
    status.textContent = 'Salvando…';
    try {
      const response = await parent.camiloApi('/.netlify/functions/state?tool=' + initial.tool, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: capture(), version })
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) blocked = true;
        throw new Error(result.error || 'Não foi possível salvar.');
      }
      version = result.version;
      status.textContent = 'Salvo na sua conta às ' + new Date(result.updated_at).toLocaleTimeString('pt-BR');
    } catch (error) {
      pending = true;
      status.textContent = (error.message || 'Falha ao salvar.') + (blocked ? ' Recarregue o painel.' : ' Use “Salvar agora” para tentar novamente.');
    } finally {
      saving = false;
      button.disabled = blocked;
      if (pending && !blocked && status.textContent.startsWith('Salvo')) schedule();
    }
  }
  window.addEventListener('load', () => {
    const bar = document.createElement('div');
    bar.style.cssText = 'position:sticky;top:0;z-index:1000;display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:10px 18px;background:#f6f4ee;border-bottom:1px solid #c9a227;color:#10233f;font:12px/1.5 sans-serif';
    status = document.createElement('span');
    status.setAttribute('role', 'status');
    status.textContent = initial.version ? 'Dados da sua conta restaurados.' : 'Os campos e configurações são salvos na sua conta.';
    button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Salvar agora';
    button.style.cssText = 'padding:6px 12px;cursor:pointer;background:#10233f;color:white;border:0;border-radius:3px';
    button.onclick = save;
    const note = document.createElement('span');
    note.textContent = 'PDFs e planilhas precisam ser selecionados novamente ao reabrir.';
    note.style.color = '#5b6373';
    bar.append(status, button, note);
    document.body.prepend(bar);
    restore();
    new MutationObserver(restore).observe(document.body, { childList: true, subtree: true });
    ready = true;
    document.addEventListener('input', schedule);
    document.addEventListener('change', schedule);
  });
  window.addEventListener('beforeunload', event => {
    if (pending || saving) { event.preventDefault(); event.returnValue = ''; }
  });
})();
