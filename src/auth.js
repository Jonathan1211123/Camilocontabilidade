import { signup, login, logout, getUser, handleAuthCallback, acceptInvite, updateUser, requestPasswordRecovery, onAuthChange } from '@netlify/identity';
const $ = id => document.getElementById(id);
let mode = 'login', invitation, loaded = false;
function view(next) {
  mode = next;
  const reset = next === 'invite' || next === 'reset';
  const creating = next === 'signup';
  $('auth-title').textContent = next === 'invite' ? 'Crie sua senha' : next === 'reset' ? 'Defina uma nova senha' : next === 'forgot' ? 'Recupere seu acesso' : creating ? 'Crie sua conta' : 'Acesse sua conta';
  $('auth-description').textContent = reset ? 'Escolha uma senha com pelo menos 10 caracteres.' : next === 'forgot' ? 'Informe seu e-mail para receber o link de recuperação.' : creating ? 'Cadastre seu e-mail e escolha uma senha com pelo menos 10 caracteres.' : 'Entre com seu e-mail e senha.';
  $('email').hidden = $('email-label').hidden = reset;
  $('email').required = !reset;
  $('password').hidden = $('password-label').hidden = next === 'forgot';
  $('password').required = next !== 'forgot';
  $('password').minLength = reset || creating ? 10 : 1;
  $('password').autocomplete = reset || creating ? 'new-password' : 'current-password';
  $('forgot').hidden = next !== 'login';
  $('back').hidden = !['forgot', 'signup'].includes(next);
  $('signup').hidden = next !== 'login';
  $('submit').textContent = reset ? 'Salvar senha e entrar' : next === 'forgot' ? 'Enviar link de recuperação' : creating ? 'Criar conta' : 'Entrar';
  $('auth-message').textContent = '';
}
async function showWorkspace(user) {
  if (!user?.id) throw new Error('session');
  $('account-email').textContent = user.email ?? '';
  $('auth').hidden = true;
  $('workspace').hidden = false;
  if (!loaded) { await import('/panel.js'); loaded = true; }
  if (user.roles?.includes('admin')) {
    const { setupAdmin } = await import('./admin.js');
    setupAdmin();
  }
}
window.camiloApi = async (url, options) => {
  if (!await getUser()) { location.reload(); throw new Error('session'); }
  const response = await fetch(url, { ...options, credentials: 'same-origin' });
  if (response.status === 401) { location.reload(); throw new Error('session'); }
  return response;
};
$('signup').onclick = () => view('signup');
$('forgot').onclick = () => view('forgot');
$('back').onclick = () => view('login');
$('logout').onclick = async () => {
  $('logout').disabled = true;
  try { await logout(); location.reload(); }
  catch { $('logout').textContent = 'Tentar sair novamente'; $('logout').disabled = false; }
};
onAuthChange(event => { if (event === 'logout') location.reload(); });
$('auth-form').onsubmit = async event => {
  event.preventDefault();
  $('submit').disabled = true;
  $('auth-message').textContent = '';
  try {
    if (mode === 'signup') {
      await signup($('email').value.trim(), $('password').value);
      $('password').value = '';
      const user = await getUser();
      if (user) await showWorkspace(user);
      else {
        view('login');
        $('auth-message').textContent = 'Cadastro recebido. Confira seu e-mail e confirme sua conta para entrar.';
      }
    } else if (mode === 'forgot') {
      await requestPasswordRecovery($('email').value.trim());
      $('auth-message').textContent = 'Se houver uma conta com esse e-mail, você receberá um link de recuperação.';
    } else {
      let user;
      if (mode === 'invite') user = await acceptInvite(invitation, $('password').value);
      else if (mode === 'reset') user = await updateUser({ password: $('password').value });
      else user = await login($('email').value.trim(), $('password').value);
      $('password').value = '';
      await showWorkspace(user);
    }
  } catch (error) {
    $('auth-message').textContent = mode === 'signup' ? 'Não foi possível criar a conta. Confira os dados; se já tem cadastro, entre ou recupere sua senha.' : mode === 'login' ? 'Não foi possível entrar. Confira e-mail e senha ou use a recuperação de acesso.' : 'Não foi possível concluir. Tente novamente. Se o link expirou, solicite um novo.';
  } finally { $('submit').disabled = false; }
};
try {
  const result = await handleAuthCallback();
  if (result?.type === 'invite') { invitation = result.token; view('invite'); }
  else if (result?.type === 'recovery') view('reset');
  else {
    view('login');
    const user = await getUser();
    if (user) await showWorkspace(user);
  }
} catch {
  view('login');
  $('auth-message').textContent = 'Não foi possível validar o acesso. Se usou um link de confirmação ou recuperação, solicite um novo link.';
} finally { $('submit').disabled = false; }
