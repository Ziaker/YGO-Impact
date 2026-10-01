# DEC-003 — ATK contra DEF com ambos os valores negativos

**Status:** aprovado pelo autor em 2026-09-29.

## Decisão

Quando um Ataque Básico compara o ATK negativo do atacante com a DEF negativa do defensor, ambos os valores contam como **0** para a disputa. O resultado é empate e nenhum dos dois recebe dano por essa comparação.

A vulnerabilidade adicional causada por um atributo negativo somente aumenta dano que a unidade efetivamente receberia. Ela não cria dano sozinha quando a comparação termina empatada em 0 contra 0.

## Consequências

- a resolução preserva a regra geral de que valor ofensivo negativo conta como 0 para causar dano;
- empates de ATK contra DEF continuam causando 0 de dano;
- não existe dano simultâneo especial para esse caso;
- humano, IA, replay, headless e web usam a mesma resolução no núcleo autoritativo.
