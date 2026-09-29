# VIS-001 — Composição do campo e HUD principal

**Status:** aguardando aprovação. Nenhuma opção é considerada final.

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

Abra `prototypes/visual-001-hud-layout/index.html` e alterne entre A, B e C. As três opções usam o mesmo conteúdo e diferem somente na composição.

## Opções

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

Avaliar, para cada opção:

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

## Evidências

Ainda não coletadas. O protótipo é deliberadamente provisório e não constitui aprovação.

## Resultado

**Pendente de decisão do autor: A, B, C ou revisão.**
