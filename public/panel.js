
// As ferramentas são carregadas pelo endpoint protegido e abertas em seus próprios iframes.
const TOOLS = [
  { id: "inicio",        label: "Início",                     type: "home" },
  { id: "cartao_v8",     label: "Lançador Fatura Cartão" },
  { id: "fornecedores",  label: "Conciliação de Fornecedores" },
  { id: "invest_facil",  label: "Extrator Invest Fácil" },
  { id: "folha_ca_doro", label: "Folha de Pagamento" },
  { id: "conciliacao_sieg_dominio", label: "Conciliação SIEG × Domínio" },
  { id: "conciliador_fiscal", label: "Conciliador Fiscal x Contábil" },
  { id: "cartao_majepac_uniao", label: "Cartão Maquininha (MAJEPAC/União)" }
];

const HOME_HTML = `
  <div class="home">
    <div class="home-hero">
      <span class="home-eyebrow">CAMILO CONTABILIDADE</span>
      <h2>Bem-vindo(a)</h2>
      <p>Painel interno com as ferramentas construídas para o dia a dia do departamento contábil.</p>
    </div>

    <div class="home-grid">
      <div class="home-card">
        <h3>Quem somos</h3>
        <p>A Camilo Contabilidade é um escritório de contabilidade fundado em 1969, sediado em Poços de Caldas (MG). Ao longo de mais de cinco décadas, construiu uma base sólida de clientes atendidos com atenção e proximidade.</p>
      </div>
      <div class="home-card">
        <h3>O que fazemos</h3>
        <p>Atendemos empresas nos regimes Simples Nacional, Lucro Presumido e Lucro Real, cobrindo desde a rotina fiscal e contábil até obrigações acessórias como SPED, ECF, ECD e DCTF.</p>
      </div>
      <div class="home-card">
        <h3>Como trabalhamos</h3>
        <p>O Domínio Sistemas é a plataforma contábil que sustenta boa parte da operação. As ferramentas deste painel foram criadas para agilizar tarefas recorrentes que envolvem esse fluxo — fatura de cartão, conciliação de fornecedores e extratos bancários.</p>
      </div>
    </div>

    <div class="home-tools">
      <h3>Ferramentas disponíveis</h3>
      <ul>
        <li><b>Lançador Fatura Cartão</b> — gera o arquivo de importação de lançamentos de fatura de cartão no leiaute do Domínio.</li>
        <li><b>Conciliação de Fornecedores</b> — casa notas e pagamentos do razão de fornecedores pela lógica FIFO e aponta divergências.</li>
        <li><b>Extrator Invest Fácil</b> — lê extratos do Bradesco e separa os lançamentos de Resgate e Aplicação Invest Fácil.</li>
        <li><b>Folha de Pagamento</b> — gera lançamentos de folha de pagamento no leiaute do Domínio para Cristais Poços de Caldas, Oficina de Arte e Fogo, Sopro de Arte e CA D'Oro.</li>
        <li><b>Conciliação SIEG × Domínio</b> — compara a lista de XMLs do SIEG com os acompanhamentos de entradas e saídas do Domínio, aponta pendências e divergências e exporta a conferência em Excel.</li>
        <li><b>Conciliador Fiscal x Contábil</b> — confere se o Resumo por Acumulador (fiscal) bate com o balancete contábil, por conta e por unidade.</li>
        <li><b>Cartão Maquininha (MAJEPAC/União)</b> — lê os relatórios de cartão de crédito/débito (sistema LBC) e gera o lançamento diário no leiaute do Domínio.</li>
      </ul>
    </div>
  </div>
`;





const tabsEl = document.getElementById('tabs');
const panesEl = document.getElementById('panes');
const loadedIframes = {};

TOOLS.forEach((tool, i) => {
  const btn = document.createElement('button');
  btn.textContent = tool.label;
  btn.dataset.id = tool.id;
  if (i === 0) btn.classList.add('active');
  btn.addEventListener('click', () => selectTab(tool.id));
  tabsEl.appendChild(btn);

  const pane = document.createElement('div');
  pane.className = 'pane';
  pane.id = 'pane-' + tool.id;
  if (i === 0) pane.classList.add('active');
  panesEl.appendChild(pane);
});

function selectTab(id){
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.id === id));
  document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + id));
  ensureLoaded(id);
}

async function ensureLoaded(id){
  if (loadedIframes[id]) return;
  const pane = document.getElementById('pane-' + id);
  if (id === 'inicio') {
    pane.innerHTML = HOME_HTML;
    loadedIframes[id] = true;
    return;
  }
  loadedIframes[id] = true;
  pane.textContent = 'Carregando ferramenta e seus dados…';
  try {
    const [htmlResponse, stateResponse] = await Promise.all([
      window.camiloApi('/.netlify/functions/tool?id=' + id),
      window.camiloApi('/.netlify/functions/state?tool=' + id)
    ]);
    if (!htmlResponse.ok || !stateResponse.ok) throw new Error();
    const html = await htmlResponse.text();
    const saved = await stateResponse.json();
    const iframe = document.createElement('iframe');
    iframe.title = TOOLS.find(t => t.id === id).label;
    const initial = JSON.stringify({ tool: id, ...saved }).replace(/</g, '\\u003c');
    const bridge = '<script>window.camiloInitial=' + initial + ';<\/script><script src="/bridge.js"><\/script>';
    iframe.srcdoc = html.replace(/<head[^>]*>/i, match => match + bridge);
    pane.replaceChildren(iframe);
  } catch {
    loadedIframes[id] = false;
    pane.textContent = 'Não foi possível carregar a ferramenta ou os dados salvos. ';
    const retry = document.createElement('button');
    retry.textContent = 'Tentar novamente';
    retry.onclick = () => ensureLoaded(id);
    pane.append(retry);
  }
}
ensureLoaded(TOOLS[0].id);
