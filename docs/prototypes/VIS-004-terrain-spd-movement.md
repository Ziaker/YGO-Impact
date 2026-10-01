# VIS-004 — Terreno, SPD e Movimento Avançado

> [!NOTE]
> Este documento foi consolidado e aprovado formalmente. A especificação completa, justificativa e detalhes do pacote de QoL encontram-se em:
> [VIS-004-terrain-spd-advanced-movement.md](file:///C:/Users/zerke/.gemini/antigravity/worktrees/quirky-hertz/setup_ygo_impact/docs/prototypes/VIS-004-terrain-spd-advanced-movement.md).

**Status:** **APROVADO — Opção A (badge persistente de custo no bloco)**<br>
**Data da decisão:** 2026-09-30<br>
**Responsável pela aprovação:** Autor do projeto<br>
**Executável de referência:** `../../prototypes/visual-004-terrain-spd-advanced-movement/index.html`

## Resumo da decisão

1. **Opção A aprovada como padrão soberano:**
   - Terreno especial recebe badge numérico de custo persistente (`×cost`) diretamente em cada bloco afetado, com tint diferenciado.
   - Fornece leitura espacial imediata de gargalos e áreas de alto custo em todo o mapa sem exigir traçado prévio de rota.
   - Preserva total equivalência determinística e invariância de hash com as opções B e C mantidas para comparação e regressão.
2. **QoL e Regras integradas:**
   - 2D top-down e 3D tático com câmera livre.
   - SPD antes/depois, legal com consequência quando SPD fica negativo, bloqueio de novo movimento com SPD negativo.
   - Recuperação de +2 SPD após 160 ticks (8 s a 20 Hz) de ociosidade, sem exceder o máximo.
   - Movimento como Reação com harness de teste.
   - Atalhos de teclado (setas) estritamente documentados como ferramenta auxiliar de QA/teste, mantendo o fluxo primário do jogador baseado em mouse (seleção, inspeção, apontamento, prévia e confirmação).
   - Fixtures numéricas são cenários de teste, não regras universais do GDD.
