# Protótipos executáveis

Este diretório reúne experimentos executáveis de comportamento e interface, especialmente HTML/TypeScript quando isso reduz retrabalho.

A tecnologia usada aqui não obriga a tecnologia final do jogo. Resultados e aprovações correspondentes ficam documentados em `docs/prototypes/`.

Não adicionar protótipos vazios: cada entrada deve responder a uma pergunta de design concreta e reproduzível.

## Inventário atual

- `visual-001-hud-layout/` — VIS-001, composição do HUD; **versão melhorada aprovada pelo autor em 2026-09-29**. O `index.html` atualmente versionado é o comparador A/B/C original e permanece como evidência histórica; não atribuir a aprovação a A/B/C pura sem registro explícito.
- `visual-002-map-camera-2d-3d/` — VIS-002, mapa/câmera; **aprovado** com 2D top-down e 3D tático selecionáveis in-game, câmera livre e foco traseiro por duplo clique. A opção lado a lado é uma ferramenta de comparação/QA.
- `visual-004-terrain-spd-advanced-movement/` — VIS-004, terreno, SPD negativo, recuperação e movimento como Reação; **APROVADO — Opção A (badge persistente de custo no bloco)** pelo autor em 2026-09-30, com pacote completo de qualidade de uso (QoL) implementado; herda área cheia (VIS-003) e orientações 2D/3D (VIS-002).
- `visual-005-fog-range-target-selection/` — VIS-005, VIS compartilhada, Fog of War, alcance e seleção de alvos com previsão de dano; **APROVADO — Opção A (Grade Tática Estrita com cantos de alvos e marcadores [?])** pelo autor em 2026-09-30; herda 2D/3D (VIS-002), área cheia (VIS-003) e terreno com badges persistentes (VIS-004).
- `visual-006-summons/` — VIS-006, Invocações: Normal, Tributo, Ritual e Fusion, seleção de âncoras (Base e monstros no campo), materiais, posicionamento com fallback espacial determinístico, QA de NEGAR sem reembolso e comparador A/B/C.
