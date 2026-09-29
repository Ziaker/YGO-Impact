# Protótipos executáveis

Este diretório reúne experimentos executáveis de comportamento e interface, especialmente HTML/TypeScript quando isso reduz retrabalho.

A tecnologia usada aqui não obriga a tecnologia final do jogo. Resultados e aprovações correspondentes ficam documentados em `docs/prototypes/`.

Não adicionar protótipos vazios: cada entrada deve responder a uma pergunta de design concreta e reproduzível.

## Inventário atual

- `visual-001-hud-layout/` — VIS-001, composição do HUD; **versão melhorada aprovada pelo autor em 2026-09-29**. O `index.html` atualmente versionado é o comparador A/B/C original e permanece como evidência histórica; não atribuir a aprovação a A/B/C pura sem registro explícito.
- `visual-002-map-camera-2d-3d/` — VIS-002, mapa/câmera; **aprovado** com 2D top-down e 3D tático selecionáveis in-game, câmera livre e foco traseiro por duplo clique.
- `VIS-003` — planejamento e movimento tático Parte 1; **decisão aprovada e documentada** em `../docs/prototypes/VIS-003-movement-part1.md`: opção A (área cheia), 2D/3D selecionáveis, confirmação por botão/Enter/duplo clique e revalidação bloco a bloco. O executável validado ainda precisa ser incorporado a uma pasta própria deste diretório antes de ser tratado como versão executável versionada.

A opção lado a lado de VIS-002 e as alternativas B/C de VIS-003 são ferramentas de comparação/QA. Elas não constituem modos normais adicionais de gameplay aprovados.
