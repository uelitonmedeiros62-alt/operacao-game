# Dia Leve

> Tire as coisas da cabeça e saiba o que fazer hoje.

Aplicativo web (PWA) em português do Brasil para organizar **tarefas**, **compromissos** e **contas a pagar**, pensado primeiro para o celular. Funciona sem cadastro: os dados ficam no próprio navegador.

## Como executar

Requisitos: Node.js 20 ou mais novo.

```bash
cd dia-leve
npm install
npm run dev        # desenvolvimento: abre em http://localhost:5173
```

Versão final (com modo offline):

```bash
npm run build      # gera a pasta dist/
npm run preview    # serve a versão final em http://localhost:4173
```

A pasta `dist/` pode ser publicada em qualquer hospedagem de arquivos estáticos (Netlify, Vercel, GitHub Pages, Cloudflare Pages…). Os caminhos são relativos, então funciona também em subpastas. **Para instalar no celular e funcionar offline, o site precisa estar em HTTPS** (ou `localhost`).

### Testes

```bash
npm test           # 88 testes: dinheiro, datas, recorrência, interpretador, backup, persistência, contraste
npm run build && npm run e2e   # 20 cenários no navegador (Chromium/Playwright), simulando um celular
```

O `e2e` usa o Chromium indicado em `CHROMIUM_PATH` (padrão `/opt/pw-browsers/chromium`). Se você tiver o Playwright instalado normalmente, rode `npx playwright install chromium` e defina `CHROMIUM_PATH` para o executável.

## Instalar no celular (pelo navegador)

Não é um app de loja (App Store / Google Play). Ele é instalado pelo navegador:

- **Android (Chrome):** abra o endereço do site → menu **⋮** → **Instalar app** (ou “Adicionar à tela inicial”). Em alguns aparelhos aparece um botão “Instalar agora” em **Ajustes**.
- **iPhone (Safari):** abra o endereço no Safari → botão **Compartilhar** → **Adicionar à Tela de Início**.

Depois do primeiro acesso, o app abre e funciona sem internet.

## O que funciona

- Primeiro acesso curto, nome opcional, começar vazio ou com **exemplo** identificado e removível.
- **Hoje:** saudação, data, até 3 prioridades (destaques manuais primeiro; depois prioridade alta → vencimento mais próximo → criação mais antiga), compromissos com horário, contas do dia, atrasados em seção separada, outras tarefas, concluídas, lista **Sem data** e progresso (“2 de 5 tarefas concluídas”).
- Ações: concluir, reabrir, editar, adiar (compromisso exige nova data **e** horário), destacar, excluir com **Desfazer**, marcar conta como paga/desfazer pagamento.
- **Adicionar por texto** com interpretador local (sem internet, não é IA): “hoje”, “amanhã”, “depois de amanhã”, “dia 10”, “10/11”, “5 de novembro”, dias da semana, “às 15h”, “9h30”, “8 da noite”, “meio-dia”, “120 reais”, “R$ 1.500,00”, “187,50”, “todo dia 10”, “toda terça”, “urgente”. Vários itens numa frase (“… e levar …”). Sempre mostra a data exata e pede confirmação em ambiguidades; nunca inventa valor, data ou horário.
- **Adicionar por voz** onde o navegador oferece reconhecimento de fala (pede o microfone só ao tocar, mostra “Ouvindo…”, permite encerrar/cancelar, texto vai para revisão). Sem suporte, explica e o texto funciona normalmente.
- **Formulário** tradicional: tarefa, compromisso ou conta.
- **Semana:** 7 dias (segunda a domingo), navegar entre semanas, voltar para hoje, filtros por tipo, adicionar no dia escolhido.
- **Contas:** total a pagar e pago do mês (critério: mês do vencimento), vencidas, próximos vencimentos, pagas com data de pagamento, categoria e observação opcionais, repetição mensal. Valores guardados em centavos.
- **Recorrência:** tarefas diárias/semanais, compromissos semanais, contas mensais. Cada ocorrência tem situação própria; editar/excluir pergunta “Somente esta” ou “Esta e as próximas”. Conta no dia 31 cai no último dia de meses curtos e volta ao 31. As ocorrências são calculadas (não gravadas), então não duplicam ao recarregar.
- **Lembretes:** alertas dentro do app com antecedência configurável; notificações do navegador quando permitido (pedido só ao tocar no botão).
- **Calendário:** exportação `.ics` (todos os compromissos dos próximos 6 meses, ou um compromisso específico).
- **Ajustes:** nome, fuso horário (detectado), lembretes, backup JSON (exportar/importar com validação, resumo e confirmação de substituição), apagar tudo com confirmação, privacidade e instruções de instalação por aparelho.
- PWA com manifest, ícones e service worker (núcleo offline depois do 1º acesso).

## Limitações conhecidas (honestas)

- **Avisos com o app fechado não existem nesta versão.** Alertas e notificações do navegador só funcionam com o Dia Leve aberto (mesmo em segundo plano, o sistema pode atrasar ou bloquear). Para lembretes confiáveis, use a exportação `.ics` para o calendário do celular. No iPhone, notificações web só existem com o app instalado (iOS 16.4+).
- **Voz** depende do navegador: no Chrome/Android geralmente o áudio é enviado ao serviço do Google e exige internet; Firefox não oferece. Safari varia por versão.
- O **interpretador de texto** é baseado em regras: frases muito diferentes dos padrões podem não ser entendidas (o texto é preservado e você pode usar o formulário).
- Dados **só neste navegador/aparelho**, sem sincronização. Limpar os dados do navegador apaga tudo — faça backup.
- Importar backup **substitui** os dados atuais (não mescla).
- Tarefas recorrentes não acumulam atrasos (a próxima ocorrência já aparece); contas recorrentes acumulam (até 12 meses para trás).
- **Não foi testado em iPhone ou Android reais.** Os testes automatizados rodaram em Chromium simulando tela de celular (390×844 e 320×640).

## Organização do código

```
src/
  domain/      regras puras: tipos, datas sem fuso, dinheiro em centavos, recorrência, ocorrências, seletores
  parser/      interface Interpreter + interpretador local (trocável por IA via servidor no futuro)
  data/        DataRepository (interface), IndexedDB, backup/validação, exemplo
  services/    voz, notificações, push (apenas interface), .ics, instalação
  state/       store React (atualização imediata + gravação), lembretes
  ui/          componentes (Dialog acessível, ItemRow, ItemForm, ações)
  screens/     Hoje, Semana, Contas, Ajustes, Primeiro acesso, Adicionar
scripts/       service worker gerado no build, ícones, teste e2e
```

### Preparado para o futuro (não implementado)

- **Conta e sincronização:** nova implementação de `DataRepository` (os itens já têm ids únicos, `createdAt`/`updatedAt`).
- **Compartilhar com a família / dividir tarefas:** adicionar donos/responsáveis ao modelo `Item` e um repositório remoto.
- **IA:** implementar `Interpreter` chamando um servidor próprio — chaves secretas nunca no navegador.
- **Push confiável:** `services/push.ts` define o contrato; requer servidor, chaves VAPID e o evento `push` no service worker.
- **Assinatura:** nenhuma tela foi criada; entraria junto com a conta.
