# DEC-002 — VIS inicial da base

**Status:** aprovado pelo autor em 2026-09-29.

## Decisão

Enquanto a base estiver no mapa, ela revela para seu controlador um **quadrado de raio 5 blocos** centrado no bloco da própria base, limitado pelas bordas do mapa.

O formato é quadrado, não usa distância ortogonal: um bloco cuja diferença em X e em Y seja de no máximo 5 em relação à base pertence à área antes da aplicação dos bloqueios de visão. A base e os obstáculos fixos continuam bloqueando VIS segundo as regras gerais.

Essa VIS integra a VIS compartilhada do jogador e permite validar a primeira Invocação Normal quando ainda não existem monstros aliados no mapa.

## Consequências técnicas

- a área da base é calculada pelo núcleo autoritativo, nunca informada como verdadeira pela interface;
- humano, IA, replay, headless e web usam o mesmo cálculo;
- a decisão não altera a área de Invocação Normal: o destino normal continua sendo um dos quatro blocos ortogonais livres ao redor da base, com o fallback já definido;
- câmera, orientação 2D/3D e renderização não alteram a área nem o resultado do cálculo.
