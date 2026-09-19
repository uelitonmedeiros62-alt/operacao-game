# Produção de vídeo — situação do Vizard e fluxo simples

Última atualização: 2026-09-19.

## O que conferi sobre o Vizard

- **Não existe, hoje, nenhuma conexão do Vizard configurada neste ambiente**
  (não há uma ferramenta ligada ao Vizard disponível pra mim usar
  diretamente). Isso é diferente de "sua assinatura não serve" — é que
  ninguém ainda configurou essa ponte técnica aqui.
- Pesquisei e o Vizard **tem uma API própria incluída a partir do plano
  pago "Creator"** (não é um produto separado nem mais caro) — então, se a
  sua assinatura for Creator ou superior, o acesso por API já pode estar
  incluído. Mas isso é uma coisa técnica de configuração de ambiente, não
  algo que eu resolvo sozinho: precisaria de alguém configurar essa conexão
  aqui, usando a chave de acesso (API key) da sua conta Vizard **fora dos
  arquivos deste repositório** (nunca em um arquivo de texto/CSV, por
  segurança — isso segue a regra deste projeto de nunca guardar senha ou
  chave de acesso no repositório).
- **Por enquanto, o fluxo é manual**: você usa o Vizard direto pelo site
  dele, e eu preparo as instruções exatas de edição para você colar lá.

## Fluxo simples (o que fazemos até termos uma conexão automática)

1. Você grava o vídeo bruto seguindo a **orientação de edição** e o
   **texto na tela** do roteiro (já vem pronto em cada arquivo de
   `entregas/`).
2. Você sobe esse vídeo no Vizard (ou em qualquer editor).
3. Você usa esta tabela do roteiro escolhido como guia de legenda/corte:
   a seção **"Texto na tela (por trecho)"** já traz, na ordem, o texto
   exato que deve aparecer em cada parte do vídeo — é só colar isso nas
   legendas/textos do Vizard, na mesma ordem.
4. A seção **"Orientação de edição"** de cada roteiro já diz onde cortar
   (ex.: "1 corte por curiosidade") e o ritmo esperado — use isso para
   guiar os cortes automáticos ou manuais no Vizard.
5. Se quiser, me manda o vídeo final (ou uma descrição de como ficou) que
   eu reviso se bateu com o roteiro antes de você publicar.

## Roteiros já prontos para esse fluxo

- `entregas/roteiro-04-apresentacao-modo-replay.md`
- `entregas/roteiro-05-gta6-curiosidades-verificadas.md`
- `entregas/roteiro-02-ajuda-compra-headset-gamer.md`
- `entregas/roteiro-03-alcance-desafio-setup.md`

## Se um dia quiser automatizar isso

Quando você quiser, me diga e eu explico exatamente o que precisaria ser
configurado (fora desta conversa, por segurança) para eu conseguir mandar o
vídeo bruto direto pro Vizard e receber o cortado de volta. Isso não foi
feito agora porque envolve uma chave de acesso e, seguindo as regras deste
projeto, isso não é algo para ativar sem você pedir e sem um lugar seguro
pra guardar essa chave.
