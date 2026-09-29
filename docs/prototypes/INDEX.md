# Índice de protótipos visuais

Este índice acompanha o inventário visual obrigatório do GDD v0.42. **Existir protótipo não significa existir aprovação.** Quando houver aprovação explícita do autor, o estado correspondente é registrado aqui e no documento do experimento.

## Experimentos

| ID | Tema | Tipo | Estado | Evidência |
| --- | --- | --- | --- | --- |
| VIS-001 | Composição do campo e HUD principal | HTML estático/interativo para alternância A/B/C | **Aguardando aprovação** | `VIS-001-hud-layout.md` + `../../prototypes/visual-001-hud-layout/index.html` |
| VIS-002 | Mapa, orientação 2D/3D e sistema de câmera | HTML interativo, 2D/3D sincronizados, câmera livre e foco traseiro | **Aprovado — 2D e 3D selecionáveis in-game** | `VIS-002-map-camera-2d-3d.md` + `../../prototypes/visual-002-map-camera-2d-3d/index.html` |

## VIS-001

Pergunta: qual composição de campo e HUD oferece melhor leitura do mapa 31 × 17, estado da partida e informação tática sem esconder informação crítica?

Opções existentes:

- **A:** mapa dominante + inspetor lateral;
- **B:** painéis laterais equilibrados;
- **C:** console tático inferior.

Nenhuma opção foi aprovada até o momento. A aprovação de VIS-002 não aprova nenhuma composição de HUD por herança.

## VIS-002

Pergunta: como o mapa 31 × 17 deve ser apresentado e navegado sem criar regras divergentes entre representações?

Resultado aprovado pelo autor em 2026-09-29:

- **2D top-down ortogonal:** aprovado como orientação selecionável in-game;
- **3D tático com câmera livre:** aprovado como orientação selecionável in-game;
- **troca 2D/3D:** aprovada sem alteração de estado autoritativo;
- **câmera 2D:** pan, zoom e foco;
- **câmera 3D:** órbita, pan, zoom, elevação, presets e reset;
- **duplo clique em monstro:** aprovado para selecionar a unidade e levar a câmera a um ângulo atrás dela;
- **comparador C lado a lado:** mantido como ferramenta de desenvolvimento/QA, não como terceiro modo normal de gameplay.

O 3D continua sendo projeção do mesmo mapa lógico plano. VIS-002 não aprova altura como regra, facing de gameplay, HUD de VIS-001, layout final de terreno, arte/modelos finais ou o pathfinding local do protótipo como núcleo definitivo.

Evidência registrada no executável:

- 18/18 testes embutidos;
- 29/29 checks reais em Chromium/Playwright;
- câmera e overlays fora do hash autoritativo;
- picking 3D por raycast contra o plano lógico;
- redução de movimento sem alteração de timing lógico.

## Inventário ainda pendente

O GDD exige prototipagem antes da implementação final para, entre outros grupos ainda não encerrados por aprovação específica:

- identidade visual geral;
- terrenos e geografia visual definitiva;
- monstros no mapa e arte/silhuetas finais;
- cartas e molduras;
- iconografia;
- efeitos visuais;
- movimento e animação de gameplay além do contrato de câmera aprovado;
- inspeção de unidades/cartas;
- zonas e áreas;
- movimento e alvos autoritativos;
- Invocações;
- combate;
- Correntes e Cross Chains;
- recursos e timers;
- estados e Fog of War além da representação-base exercitada em VIS-002;
- Armadilhas e Campos;
- feedback e logs;
- menus, tutorial e controles gerais;
- acessibilidade além da redução de movimento validada neste experimento;
- GitHub Pages;
- replay e telemetria;
- self-play, QA e ferramentas de conteúdo.

Cada novo experimento deve registrar pergunta, opções quando aplicável, cenário reproduzível, resolução/dispositivo, pior caso relevante, critérios mensuráveis, evidências, resultado e decisão do autor. Mudanças materiais no contrato aprovado de VIS-002 devem reabrir o experimento ou criar sucessor explícito.
