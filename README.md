# Camilo Contabilidade — Painel de Ferramentas

O painel tem cadastro aberto e autenticação por e-mail e senha com Netlify Identity. Qualquer pessoa pode criar sua conta pelo botão **Criar minha conta**, sem convite. As ferramentas e os dados continuam protegidos por sessão no servidor.

## Criar e acessar uma conta

Na página inicial, clique em **Criar minha conta**, informe seu e-mail e escolha uma senha com pelo menos 10 caracteres. Quando a confirmação de e-mail estiver habilitada, abra o link recebido para confirmar a conta e acessar o painel. Se a confirmação for automática, o painel abre após o cadastro.

O botão **Esqueci minha senha** envia um link de recuperação. Links antigos de convite continuam funcionando. A opção de registro no serviço Identity deve permanecer em **Open**, como verificado nesta atualização.

## Dados das ferramentas

Cada usuário possui seus próprios campos, configurações e marcações, salvos automaticamente no Netlify Database. O botão **Salvar agora** permite salvar imediatamente ou repetir uma tentativa que falhou. Ao abrir uma ferramenta, os dados da conta são recuperados antes de executar seu código. As marcações de fornecedores e ajustes da folha que anteriormente ficavam no navegador passam a usar esse armazenamento por conta.

PDFs e planilhas de origem, resultados calculados em memória e arquivos exportados não são armazenados. Os arquivos de origem devem ser selecionados novamente para recalcular os resultados. Campos de senha e seleção de arquivos são excluídos do salvamento.

Os dados de uma ferramenta têm limite de 1 MB. Se duas abas ou dispositivos editarem a mesma ferramenta, o sistema recusa sobrescrever uma versão mais recente e solicita recarregar o painel. Aguarde a confirmação de salvamento antes de fechar a página ou sair.

## Estrutura e validação

`public/` contém a interface; `src/auth.js` integra a autenticação; `private/tools/` contém as seis ferramentas originais extraídas do HTML e a Conciliação SIEG × Domínio; `netlify/functions/` fornece o acesso protegido e a persistência. O HTML original na raiz é mantido como referência e não é publicado.

O deploy executa `npm run prepare-site` para empacotar o cliente de autenticação. A plataforma aplica as migrações de `netlify/database/migrations/` automaticamente. Não aplique essas migrações manualmente.

Use `npm test` para verificar bloqueio de endpoints anônimos, validação das entradas, restauração e salvamento de campos e prevenção de conflitos entre abas. Use `npm run check` para verificar os tipos. O fluxo completo de e-mail requer um deploy e um convite real enviado pelo responsável.

## Conciliação SIEG × Domínio

Após entrar na conta, abra a aba **Conciliação SIEG × Domínio**. Selecione a lista de XMLs do SIEG e os relatórios de acompanhamento de entradas e saídas do Domínio. A ferramenta identifica os arquivos, compara as notas e permite baixar a conferência em Excel. As planilhas são processadas no navegador e devem ser selecionadas novamente ao reabrir a ferramenta.
