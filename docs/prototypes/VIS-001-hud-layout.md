# VIS-001 — Composição do campo e HUD principal

**Status:** **APROVADO PELO AUTOR — versão melhorada do VIS-001**  
**Data da aprovação:** 2026-09-29  
**Escopo da aprovação:** direção de composição, hierarquia e densidade do HUD/campo na versão melhorada apresentada ao autor. A aprovação não valida, por herança, movimento, timing, Correntes interativas, Fog of War dinâmico ou outras regras temporais.

## Pergunta avaliada

Qual composição de campo e HUD oferece melhor leitura do mapa 31 × 17, estado da partida e informação tática sem esconder informação crítica?

O experimento segue o GDD v0.42: decisões visuais ainda não aprovadas devem apresentar três opções comparáveis; aparência pode ser prototipada estaticamente; arte provisória e formas geométricas são permitidas.

## Cenário reproduzível

- viewport de referência: 1366 × 768;
- mapa representativo 31 × 17;
- cinco unidades por lado;
- Fog of War parcial;
- uma unidade selecionada;
- carta inspecionada com texto longo;
- fase, Ações/Reações, SPD, Token de Prioridade, Decks, Cemitério e Extra Deck visíveis;
- marcador de impactos da base;
- Corrente representada em profundidade de cinco elementos para teste de densidade.

O comparador originalmente versionado em `prototypes/visual-001-hud-layout/index.html` permite alternar entre A, B e C. Ele permanece como evidência histórica da comparação inicial.

## Opções históricas

### A — Mapa dominante + inspetor lateral

Mapa ocupa a maior área possível. A mão fica na faixa inferior e inspeção/log ficam em uma coluna lateral.

**Hipótese:** favorece leitura espacial e movimento, com custo de maior distância visual entre mão e inspetor.

### B — Painéis laterais equilibrados

Mapa central com estado do jogador à esquerda e carta/unidade/log à direita.

**Hipótese:** reduz deslocamento ocular entre informações táticas, mas comprime mais o mapa.

### C — Console tático inferior

Mapa utiliza toda a largura superior e a informação detalhada fica concentrada em um console inferior dividido em mão, seleção e log.

**Hipótese:** preserva largura do mapa e aproxima comandos, mas reduz altura útil do campo.

## Critérios

Avaliar, para cada opção/revisão:

1. leitura imediata de fase, Ações e Reações;
2. visibilidade do objetivo de cinco impactos;
3. legibilidade dos dez monstros simultâneos;
4. clareza de seleção, aliado/inimigo e posição ATK/DEF;
5. leitura de Fog of War sem confundir terreno conhecido com unidade oculta;
6. acesso à mão e carta inspecionada sem cobrir o mapa;
7. legibilidade de Corrente densa;
8. espaço para texto longo;
9. capacidade de identificar estado, ações disponíveis, custo, alvo, consequência e resultado sem conhecimento externo;
10. comportamento aceitável ao reduzir a janela.

## Evidências e rastreabilidade

- O autor aprovou explicitamente a **versão melhorada do VIS-001** em 2026-09-29.
- Essa decisão é mais recente e prevalece sobre registros antigos que ainda marcavam o experimento como “aguardando aprovação”.
- O histórico Git atual identifica de forma inequívoca o comparador A/B/C original, mas não permite atribuir retroativamente a aprovação a uma das opções A, B ou C puras sem inventar informação.
- Portanto, a decisão registrada é exatamente a fornecida pelo autor: **versão melhorada aprovada**.
- Enquanto um snapshot executável específico dessa revisão melhorada não estiver identificado no Git, o `index.html` atual deve ser tratado como comparador histórico, não como prova de que uma opção A/B/C pura foi a aprovada.

## Resultado

**APROVADA: versão melhorada do VIS-001.**

Esta aprovação encerra a decisão de composição/HUD deste experimento. Reabertura só ocorre por nova decisão explícita do autor ou por mudança material de requisitos. Sistemas temporais e interativos continuam exigindo protótipos executáveis próprios conforme o GDD.
