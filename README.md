# Operação de Conteúdo e Vendas Afiliado — Games (Ueliton)

Este repositório organiza a operação de conteúdo gamer do Ueliton no TikTok,
com o objetivo de crescer audiência e vender como afiliado. Escrito em
português, para uso sem conhecimento técnico.

## Como usar, passo a passo

1. **Abra o Claude Code neste projeto.** Ele vai ler o arquivo `CLAUDE.md` e
   assumir o papel de coordenador da operação.
2. **Preencha seus dados** em `contexto/perfil.md` (tem uma lista de
   perguntas pendentes) — quanto mais completo, melhor o coordenador te ajuda.
3. **Quando tiver um produto de afiliado**, me diga o nome e o link na
   conversa (ou preencha `contexto/produtos.csv`). Eu (ou o subagente
   `ofertas-gamer`) confiro o que der pra confirmar e preparo o argumento de
   venda — nunca invento preço, desconto ou comissão.
4. **Peça um roteiro novo** a qualquer momento, ex.: "cria um roteiro sobre
   [tema]". Isso aciona o subagente `conteudo-gamer`, que salva o roteiro em
   `entregas/`.
5. **Grave o vídeo você mesmo** (celular, gameplay própria) usando o roteiro
   como guia — gancho, narração, texto na tela e orientação de edição já
   vêm prontos.
6. **Publique você mesmo no TikTok.** Nesta fase, nada é publicado
   automaticamente — publicar é sempre uma ação sua.
7. **Depois de publicar, me passe os números** (visualizações, retenção,
   cliques, vendas) ou me diga se alguma conta de análise (Metricool,
   Windsor.ai) já está ligada à sua conta certa. O subagente
   `analista-resultados` registra em `resultados/metricas.csv` e sugere o
   próximo teste.
8. **Acompanhe as pendências** em `contexto/decisoes.md` — lá fica o
   histórico do que já foi decidido e o que ainda falta definir.

## O que já está pronto agora

- Um calendário de teste de 7 dias em `planejamento/calendario.csv`.
- 3 roteiros completos, prontos para gravar, em `entregas/`.
- A estrutura de cadastro de produtos, resultados e decisões.

## O que ainda depende de você

- Confirmar seu @ do TikTok e se contas já conectadas (ver
  `integracoes.md`) são desta operação.
- Cadastrar pelo menos um produto/link de afiliado real.
- Gravar e publicar os vídeos (isso não é feito automaticamente).
- Decidir se quer usar alguma ferramenta paga (ex.: geração de vídeo por
  IA) — nada disso foi ativado até você pedir.

## Convenção usada nas planilhas (arquivos `.csv`)

- Um campo com `PENDENTE` significa: falta informação, e ninguém deve
  inventar um valor ali.
- Em `resultados/metricas.csv`, um campo com `SEM_DADO` significa que o
  número ainda não foi coletado — é diferente de `0`, que significa que o
  resultado real foi zero.
- Esses arquivos `.csv` abrem direto no Excel, Google Sheets ou Numbers.

## Onde encontrar cada coisa

- `CLAUDE.md` — regras e papel do coordenador (para o Claude seguir).
- `.claude/agents/` — os 3 subagentes especializados.
- `contexto/` — perfil, produtos e histórico de decisões.
- `planejamento/calendario.csv` — pauta de conteúdo.
- `resultados/metricas.csv` — desempenho real.
- `entregas/` — roteiros prontos.
- `integracoes.md` — o que está realmente disponível hoje.
