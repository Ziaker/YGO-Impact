# VIS-002 — relatório de validação

**Data:** 2026-09-29  
**Resultado:** aprovado para o contrato visual descrito em `docs/prototypes/VIS-002-map-camera-2d-3d.md`.

## Resumo

- testes embutidos no protótipo: **18/18 aprovados**;
- checks reais de Chromium/Playwright: **29/29 aprovados**;
- exceções JavaScript no smoke: **0**.

## Foco traseiro por duplo clique

A revisão validou que o duplo clique em um monstro:

1. identifica a unidade pela projeção usada;
2. seleciona a unidade;
3. centraliza o 2D quando aplicável;
4. interpola a câmera 3D até o centro visual do monstro;
5. usa um pose traseiro derivado apenas do lado P1/P2;
6. não altera o hash autoritativo.

A direção P1→P2 / P2→P1 é uma heurística de câmera, não facing de gameplay.

## 18 testes embutidos

1. mapa 31 × 17;
2. bases centrais nas extremidades;
3. 20 Hz / 50 ms;
4. cinco monstros por lado no stress case;
5. invariantes iniciais;
6. detecção de ocupação duplicada;
7. distância ortogonal;
8. hash reproduzível;
9. câmera fora do hash;
10. overlays fora do hash;
11. redução visual sem mudança dos ticks de movimento;
12. foco traseiro coerente para P1/P2;
13. foco traseiro fora do hash;
14. path do ensaio usa passos cardinais;
15. custo do ensaio equivale à quantidade de blocos;
16. base bloqueia destino;
17. unidade bloqueia destino;
18. 2D/3D/QA compartilham a mesma referência de estado.

## 29 checks reais de navegador

A automação de navegador verificou:

- carregamento sem exceções;
- hash inicial;
- suíte embutida 18/18;
- ativação do modo 3D;
- `WASD`/pan;
- câmera sem alteração de hash;
- `Q/E`/rotação;
- órbita por arraste;
- pan com `Shift` + arraste;
- pan com botão direito + arraste;
- zoom 3D por roda;
- picking 3D;
- seleção por duplo clique;
- target do foco no monstro;
- enquadramento traseiro;
- foco sem alteração de hash;
- movimento iniciado no 3D;
- consumo de SPD do ensaio;
- pausa do tick;
- retomada do tick;
- redução de movimento sem antecipar lógica;
- término no mesmo timing lógico;
- picking 2D;
- pan 2D;
- zoom 2D;
- renderização 2D no comparador;
- renderização 3D no comparador;
- preservação da seleção ao trocar orientação;
- overlays sem alteração de hash.

## Limitação conhecida

O helper de pathfinding local é deliberadamente mais estreito que a regra final: trata qualquer bloco ocupado como bloqueio. Ele existe para testar câmera, seleção, animação e equivalência visual; a regra completa pertence ao núcleo autoritativo.
