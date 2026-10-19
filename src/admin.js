let initialized = false;
export function setupAdmin() {
  if (initialized) return;
  initialized = true;
  const $ = id => document.getElementById(id);
  let page = 1, busy = false;
  const message = text => { $('admin-message').textContent = text; };
  const date = value => value ? new Date(value).toLocaleDateString('pt-BR') : '—';
  async function request(options = {}) {
    const response = await window.camiloApi(`/.netlify/functions/users?page=${page}`, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível concluir. Tente novamente.');
    return data;
  }
  function setBusy(value) {
    busy = value;
    $('admin-dialog').setAttribute('aria-busy', String(value));
    for (const control of $('admin-dialog').querySelectorAll('button:not(#admin-close), input, select')) control.disabled = value;
  }
  async function load() {
    const data = await request();
    $('admin-users').replaceChildren();
    if (!data.users.length) {
      const row = $('admin-users').insertRow();
      const cell = row.insertCell(); cell.colSpan = 5; cell.textContent = 'Nenhuma conta nesta página.';
    }
    for (const user of data.users) {
      const row = $('admin-users').insertRow();
      for (const value of [user.name ? `${user.name} · ${user.email || ''}` : user.email || 'Sem e-mail', user.confirmedAt ? 'Confirmado' : 'Aguardando confirmação', date(user.createdAt), date(user.lastSignInAt)]) row.insertCell().textContent = value;
      const cell = row.insertCell();
      const select = document.createElement('select');
      select.setAttribute('aria-label', `Permissão de ${user.email || user.id}`);
      for (const [value, label] of [['member', 'Usuário'], ['admin', 'Administrador']]) select.add(new Option(label, value));
      const original = user.roles.includes('admin') ? 'admin' : 'member';
      select.value = original;
      const save = document.createElement('button'); save.type = 'button'; save.textContent = 'Salvar';
      if (user.id === data.currentUserId) { cell.textContent = 'Administrador · Você'; continue; }
      save.onclick = () => run(async () => {
        await request({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: user.id, role: select.value }) });
        message('Permissão atualizada.');
      });
      cell.append(select, save);
    }
    $('admin-page').textContent = `Página ${data.page}`;
    return data;
  }
  async function run(action) {
    if (busy) return;
    setBusy(true); message('Carregando…');
    let data;
    try { await action?.(); data = await load(); if (!action) message('Lista atualizada.'); }
    catch (error) { message(error.message || 'Não foi possível concluir. Tente novamente.'); }
    finally {
      setBusy(false);
      $('admin-prev').disabled = page === 1 || !data;
      $('admin-next').disabled = !data?.hasNext;
    }
  }
  $('admin-open').hidden = false;
  $('admin-open').onclick = () => { $('admin-dialog').showModal(); page = 1; run(); };
  $('admin-close').onclick = () => $('admin-dialog').close();
  $('admin-refresh').onclick = () => run();
  $('admin-prev').onclick = () => { if (!busy && page > 1) { page--; run(); } };
  $('admin-next').onclick = () => { if (!busy) { page++; run(); } };
  $('admin-create').onsubmit = event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (busy || !form.reportValidity()) return;
    const data = new FormData(form);
    const password = form.elements.namedItem('password');
    const payload = { email: data.get('email'), password: data.get('password'), role: data.get('role') };
    password.value = '';
    run(async () => {
      try {
        await request({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        page = 1; message('Conta criada. Use o e-mail e a senha definidos para entrar.');
      } finally { payload.password = ''; }
    });
  };
}
