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
  let version = initial.version, timer, ready = false, saving = false, pending = false, blocked = false;
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
    clearTimeout(timer);
    timer = setTimeout(save, 1000);
  }
  async function save() {
    clearTimeout(timer);
    if (!ready || saving || blocked) return;
    pending = false;
    saving = true;
    let succeeded = false;
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
      succeeded = true;
    } catch (error) {
      pending = true;
      console.error((error.message || 'Falha ao salvar.') + (blocked ? ' Recarregue o painel.' : ''));
    } finally {
      saving = false;
      if (pending && !blocked && succeeded) schedule();
    }
  }
  window.addEventListener('load', () => {
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
