# Integrações — o que existe de verdade hoje

Última checagem: 2026-09-19 (America/Sao_Paulo). Isto é um retrato do que foi
**confirmado por chamada real** às ferramentas disponíveis nesta conta —
inclusive comparando o identificador real de cada conta (não só o rótulo
salvo), porque um rótulo antigo pode enganar.

## Tabela de capacidades por rede

| Rede | Conta identificada (dado real) | Acesso a métricas | Capacidade de publicação |
|---|---|---|---|
| **TikTok** | `@achoulevou.store_achados`, nome de exibição "Modo replay" — via Windsor.ai (TikTok orgânico). **Confirmado**: bate exatamente com a conta informada pelo Ueliton. 6 seguidores na consulta. | **Sim.** Windsor.ai devolve seguidores, visualizações, curtidas, comentários, compartilhamentos, retenção por vídeo, fonte de tráfego do vídeo, etc. | **Não.** Nenhuma ferramenta desta conta publica vídeo no TikTok. Publicar continua manual, feito pelo Ueliton. |
| **Instagram** | `@modo_replaybr`, nome "Modo replay" — via Windsor.ai. **Confirmado pelo dado real** devolvido na consulta (148 seguidores, posts reais com `media_id` retornados). | **Sim.** Windsor.ai devolve alcance, curtidas, comentários, saves, stories, etc. | **PENDENTE — não confirmado, evidência aponta para conta diferente.** Conferi de novo em 2026-09-19: a lista de ações de publicação do Windsor.ai (`create_image_post`, `create_video_post`, `create_story`, `create_carousel_post`, comentários) está associada ao ID `17841470386384993` (rótulo "achou.store.br"). Ao consultar esse ID específico, **não veio nenhum dado nos últimos 90 dias** — sinal de que essa conta está inativa/desatualizada. Já a conta com posts reais e dado ativo é outro ID (`28717779077826640`, `@modo_replaybr`). Ou seja: **não dá pra confirmar que publicar por essa ação vai cair no perfil certo.** Não usei essa ação. Recomendo o Ueliton conferir direto no painel do Windsor.ai (windsor.ai) qual conta está de fato autorizada para publicar, e reconectar o Instagram certo lá se for o caso, antes de qualquer publicação automática. |
| **Instagram/TikTok (Metricool)** | Marca `achou_levoubr0` — **não corresponde** a `@modo_replaybr` nem tem TikTok conectado. | As métricas dessa marca não valem para a conta confirmada desta operação. | Metricool consegue agendar publicação nas duas redes, mas só depois de conectar as contas certas — não fiz isso automaticamente (exige login seu) e não mexi na marca antiga. Passo a passo em `entregas/passo-a-passo-metricool.md`. |
| **Plataforma de afiliados** (para o link do PS5 e futuros produtos) | Nenhuma conectada. | Não disponível. | Não disponível. Link, preço, comissão etc. sempre vêm do Ueliton. |

⚠️ Nota sobre o rótulo antigo: na lista de conexões do Windsor.ai, o
Instagram aparece salvo com o rótulo "achou.store.br" (um nome que parece
de outro projeto). Mas quando pedimos o dado de verdade da conta (não só o
rótulo), veio `username: modo_replaybr` — ou seja, o rótulo ficou
desatualizado, mas o dado puxado é da conta certa. Isso é diferente de ter
conectado a conta errada; ainda assim, fica registrado aqui para
transparência.

## Disponível, mas não usado nesta etapa

- **Everygen/Viewmax** (geração de vídeo, imagem, voz e legendas por IA) —
  disponível nesta conta. Não usado porque geração custa crédito, e o
  pedido foi para não gastar nada nesta configuração.
- **CarrosseIA** (transforma roteiro em carrossel para Instagram) —
  disponível, não usado nesta etapa.

## Vizard (edição/corte de vídeo) — conferido em 2026-09-19

- **Não há, hoje, nenhuma ferramenta do Vizard conectada neste ambiente.**
  Isso independe da assinatura do Ueliton — é uma conexão técnica que ainda
  não foi configurada aqui.
- Pesquisei e o Vizard tem API própria incluída a partir do plano pago
  "Creator" (não é produto separado). Se a assinatura do Ueliton já for
  Creator ou superior, o acesso por API pode já estar incluído — mas ainda
  assim precisaria ser configurado neste ambiente, usando uma chave de
  acesso que **nunca deve ir para dentro deste repositório**.
- Enquanto isso, o fluxo é manual: ver `entregas/fluxo-producao-video.md`.

## Não conectado / não disponível

- **Editor de vídeo tradicional**: não há um editor de vídeo instalado
  neste ambiente. A gravação/edição do vídeo em si é feita pelo Ueliton
  (celular ou computador), ou pelo Everygen/Viewmax se ele decidir usar.
- **Pesquisa na internet**: disponível, para embasar pautas e conferir
  tendências — sempre citando a fonte, e tratando como rumor o que não tiver
  fonte confiável.

## O que falta para automatizar mais a operação

1. **Confirmar/ajustar o Metricool** — hoje ele não representa nenhuma das
   contas desta operação.
2. **Decidir a ação de publicar no Instagram via Windsor.ai** — antes de
   usá-la, confirmar no painel do Windsor.ai se o identificador de
   publicação é realmente `@modo_replaybr`.
3. **Receber o link de afiliado do PS5** (e de futuros produtos) para
   cadastrar em `contexto/produtos.csv` com informação verificada.
4. **Decidir se vai usar geração de vídeo por IA (Everygen/Viewmax)** e,
   se sim, checar o saldo de créditos antes de gerar qualquer coisa.
5. Só depois desses pontos definidos faz sentido criar qualquer rotina
   automática (nenhuma foi criada até agora).
