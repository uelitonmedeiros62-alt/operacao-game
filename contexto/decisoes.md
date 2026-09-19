# Decisões e pendências do coordenador

Registro contínuo. Cada entrada nova vai no topo, com data (America/Sao_Paulo).

---

## 2026-09-19 (3ª atualização) — Primeira entrega completa: link do PS5, publicação, produção e agentes reais

**Decisões:**
- **Subagentes realmente chamados nesta rodada** (via ferramenta de
  subagente, não simulados pelo coordenador): `conteudo-gamer` escreveu e
  salvou `entregas/roteiro-05-gta6-curiosidades-verificadas.md` e adicionou
  a linha correspondente em `planejamento/calendario.csv`; `ofertas-gamer`
  atualizou a linha do PS5 em `contexto/produtos.csv`. Revisei as duas
  entregas antes de considerar prontas — aprovadas.
- **Link do PS5** (`https://meli.la/1XyBfkc`) recebido e registrado, mas o
  domínio `meli.la` está bloqueado pela política de rede deste ambiente
  (confirmado com WebFetch e com `curl` direto, ambos retornando bloqueio
  403 do proxy de saída — não é instabilidade passageira). Não foi possível
  verificar modelo, preço, estoque ou condição. Nada foi inventado; produto
  segue `pendente`.
- **Ação de publicação do Instagram no Windsor.ai**: conferida de novo com
  consulta de leitura. A ação de publicar está associada a um ID de conta
  (`17841470386384993`) que não retornou nenhum dado nos últimos 90 dias
  (parece inativo/desatualizado), enquanto a conta com posts e dado real é
  outra (`28717779077826640`, `@modo_replaybr`). **Não foi possível
  confirmar** que a ação publica na conta certa — mantido `PENDENTE`,
  recomendado ao Ueliton conferir direto no painel do Windsor.ai.
- **Metricool**: preparado passo a passo manual (`entregas/passo-a-passo-metricool.md`)
  para criar uma marca nova "Modo Replay" e conectar `@modo_replaybr` e
  `@achoulevou.store_achados`, sem mexer na marca antiga `achou_levoubr0`
  (conforme pedido).
- **Vizard**: confirmado que não há nenhuma ferramenta do Vizard conectada
  neste ambiente. Vizard tem API inclusa a partir do plano "Creator", mas
  configurar essa conexão aqui é um passo técnico à parte (exige chave de
  acesso, que nunca deve ir para o repositório). Preparado fluxo manual em
  `entregas/fluxo-producao-video.md`.
- Primeiro pacote de conteúdo completo entregue: roteiro de GTA 6 com
  curiosidades **confirmadas** (data de lançamento, cenário, protagonistas,
  plataformas, pré-venda), fontes registradas, sem gameplay real (o jogo
  ainda não foi lançado) — formato talking head, 100% gravação própria.

**Pendências abertas:**
1. Ueliton reenviar o link completo do PS5 (não encurtado) ou os dados da
   página manualmente (modelo, preço, estoque, condição) para destravar o
   roteiro de oferta.
2. Ueliton seguir o passo a passo do Metricool (ou pedir para eu conferir
   depois de ele conectar).
3. Ueliton confirmar no painel do Windsor.ai qual conta está de fato
   autorizada a publicar no Instagram antes de qualquer automação de post.
4. Ueliton gravar o roteiro-04 ou o roteiro-05 (ou os dois) — nenhum vídeo
   foi produzido ou publicado ainda; roteiro e calendário não são a mesma
   coisa que vídeo pronto ou post agendado.

---

## 2026-09-19 (2ª atualização) — Contas confirmadas e primeira leva de identidade

**Decisões:**
- Ueliton confirmou: marca **Modo Replay**, TikTok `@achoulevou.store_achados`
  (mantido por enquanto) e Instagram `@modo_replaybr`.
- Conferi com dado real (não só rótulo) as integrações do Windsor.ai:
  - TikTok orgânico confirmado (`username: achoulevou.store_achados`).
  - Instagram confirmado pelo dado real (`username: modo_replaybr`), apesar
    de o rótulo salvo na lista de conexões mostrar um nome antigo diferente.
  - Metricool **não corresponde** — marca `achou_levoubr0` é outro Instagram.
    Não foi vinculada a esta operação.
- Atualizei `CLAUDE.md`, `contexto/perfil.md`, `integracoes.md`,
  `planejamento/calendario.csv` e os 3 arquivos de subagente com os
  identificadores confirmados.
- Cadastrei o PS5 em `contexto/produtos.csv` como `pendente` — o link
  mencionado pelo Ueliton não chegou nesta conversa; nenhum preço, modelo ou
  condição foi inventado.
- Preparei bios (TikTok e Instagram), 3 publicações para fixar, calendário
  de 7 dias para as duas redes e um roteiro completo de apresentação com
  adaptação para as duas redes. Nada foi publicado nem alterado nos perfis.

**Pendências abertas:**
1. Receber o link do PS5 para o `ofertas-gamer` verificar preço, modelo e
   condições reais.
2. Decidir o que fazer com o Metricool (reconectar a marca certa ou deixar
   de lado).
3. Confirmar no painel do Windsor.ai se a ação de publicar no Instagram
   realmente aponta para `@modo_replaybr` antes de cogitar usá-la.
4. Ueliton revisar e aprovar (ou ajustar) as bios, os 3 posts fixados, o
   calendário e o roteiro de apresentação antes de gravar/publicar.

---

## 2026-09-19 — Configuração inicial da operação

**Decisões:**
- Estrutura do repositório criada: `CLAUDE.md`, três subagentes em
  `.claude/agents/`, pastas `contexto/`, `planejamento/`, `resultados/`,
  `entregas/`, e os arquivos `integracoes.md` e `README.md`.
- Calendário editorial de 7 dias criado como teste, misturando conteúdo de
  alcance, ajuda à compra e oferta (oferta fica pendente até haver produto
  cadastrado).
- Três roteiros completos entregues em `entregas/`, todos com temas
  duradouros de games (não dependem de notícia do dia, então não exigem
  fonte de "última hora").
- Nenhuma publicação, gasto ou automação foi feita — apenas arquivos e
  rascunhos, conforme pedido.

**Pendências abertas:**
1. Confirmar se as contas já conectadas (Metricool `achou_levoubr0`,
   Windsor.ai `achou.store.br` e TikTok orgânico "Modo replay") pertencem a
   esta operação de games ou são de outro projeto do Ueliton.
2. Ueliton precisa preencher `contexto/perfil.md` (campos pendentes) e
   `contexto/produtos.csv` (produtos e links de afiliado reais).
3. Os subagentes criados nesta sessão podem só ficar disponíveis para uso em
   uma sessão nova do Claude Code neste projeto — confirmar isso na prática
   assim que possível.
4. Definir orçamento (se houver) para ferramentas de geração de vídeo/imagem
   antes de qualquer geração paga ser usada.
