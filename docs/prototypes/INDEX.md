# Índice de protótipos visuais

Este índice acompanha o inventário visual obrigatório do GDD v0.42. **Existir protótipo não significa existir aprovação.** Quando houver aprovação explícita do autor, o estado correspondente é registrado aqui e no documento do experimento.

## Experimentos

| ID | Tema | Tipo | Estado | Evidência |
| --- | --- | --- | --- | --- |
| VIS-001 | Composição do campo e HUD principal | HTML estático/interativo para alternância A/B/C + revisão melhorada | **Aprovado — versão melhorada pelo autor em 2026-09-29** | `VIS-001-hud-layout.md`; o executável A/B/C em `../../prototypes/visual-001-hud-layout/index.html` permanece como comparador histórico |
| VIS-002 | Mapa, orientação 2D/3D e sistema de câmera | HTML interativo, 2D/3D sincronizados, câmera livre e foco traseiro | **Aprovado — 2D e 3D selecionáveis in-game** | `VIS-002-map-camera-2d-3d.md` + `../../prototypes/visual-002-map-camera-2d-3d/index.html` |
| VIS-003 | Planejamento e movimento tático — Parte 1/5 | Protótipo executável com 2D/3D, planejamento, confirmação e execução bloco a bloco | **Aprovado — opção A (Área cheia)** | `VIS-003-movement-part1.md`; evidência validada em 25/25 Node, 25/25 embutidos e 14/14 Chromium/Playwright |
| VIS-004 | Terreno, SPD e movimento avançado — Parte 2/5 | Protótipo executável em validação com custo ponderado, impassáveis, recuperação e harness de Reação | **Em teste — A/B/C de leitura de terreno aguardam aprovação** | `VIS-004-terrain-spd-movement.md`; evidência atual 30/30 Node, 30/30 embutidos e 16/16 Chromium/Playwright |

## VIS-001

Pergunta: qual composição de campo e HUD oferece melhor leitura do mapa 31 × 17, estado da partida e informação tática sem esconder informação crítica?

Opções históricas do comparador inicial:

- **A:** mapa dominante + inspetor lateral;
- **B:** painéis laterais equilibrados;
- **C:** console tático inferior.

**Resultado vigente:** o autor aprovou explicitamente a **versão melhorada do VIS-001** em 2026-09-29. Essa decisão substitui qualquer registro anterior de “aguardando aprovação”. O repositório não registra evidência suficiente para transformar essa decisão em “A”, “B” ou “C” pura sem inventar informação; por isso o resultado permanece descrito exatamente como versão melhorada aprovada.

O `index.html` atualmente versionado continua sendo a comparação A/B/C original e serve como evidência histórica. Até que um snapshot executável da revisão melhorada seja identificado/versionado, ele não deve ser citado como se representasse exatamente a revisão aprovada.

A aprovação cobre composição, hierarquia e densidade do HUD/campo. Ela não valida por herança movimento, timing, Correntes interativas, Fog of War dinâmico ou outros sistemas temporais.

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

O 3D continua sendo projeção do mesmo mapa lógico plano. VIS-002 não aprova altura como regra, facing de gameplay, arte final de terreno, modelos finais ou o pathfinding local do protótipo como núcleo definitivo.

Evidência registrada no executável:

- 18/18 testes embutidos;
- 29/29 checks reais em Chromium/Playwright;
- câmera e overlays fora do hash autoritativo;
- picking 3D por raycast contra o plano lógico;
- redução de movimento sem alteração de timing lógico.

## VIS-003

Pergunta: como planejar, confirmar e executar movimento de forma legível, determinística e equivalente entre 2D e 3D?

Resultado aprovado pelo autor em 2026-09-29:

- **A — Área cheia:** apresentação padrão de movimento em gameplay;
- **B/C:** preservadas apenas como alternativas históricas/comparativas no modo QA;
- **orientação 2D/3D:** seletor deve permanecer disponível ao jogador;
- a troca 2D ↔ 3D preserva seleção, destino, caminho, movimento em andamento e estado lógico;
- botão/`Enter` e duplo clique em destino livre/legal são gestos equivalentes de confirmação;
- duplo clique em monstro continua reservado à seleção + foco traseiro;
- câmera/orientação/overlays não alteram regras nem hash;
- movimento é revalidado bloco a bloco e não depende de `requestAnimationFrame`.

A ordem experimental de desempate `N,E,S,W,NE,SE,SW,NW` continua **provisória** e não se torna regra canônica por causa desta aprovação.

## VIS-004

Pergunta: como comunicar custos especiais de movimento, impassáveis, SPD negativo, recuperação e movimento como Reação sem perder a leitura já aprovada do VIS-003?

Estado atual:

- herda **A — Área cheia** para alcançabilidade e 2D/3D selecionáveis;
- compara três opções novas somente para **leitura de terreno/custo**: A badge persistente, B custo só no caminho e C mapa sutil/painel;
- nenhuma das três está aprovada;
- custo numérico do Campo A é fixture QA configurável, padrão 1, e não regra universal de terreno;
- terreno impassável e GLIDER são exercitados;
- entrada em terreno especial pode levar SPD a negativo quando a regra do GDD se aplica;
- recuperação usa +2 após 8 s/160 ticks de ociosidade, com cap no máximo;
- movimento como Reação é exercitado por harness QA de 1 Reação + SPD, sem fingir implementar Corrente completa.

## Inventário ainda pendente

O GDD exige prototipagem antes da implementação final para, entre outros grupos ainda não encerrados por aprovação específica:

- identidade visual geral;
- aprovação da leitura de terreno/custo do VIS-004 e geografia visual definitiva;
- monstros no mapa e arte/silhuetas finais;
- cartas e molduras;
- iconografia;
- efeitos visuais;
- inspeção de unidades/cartas além da composição aprovada do HUD;
- zonas e áreas;
- alcance e alvos autoritativos;
- Invocações;
- combate;
- Correntes e Cross Chains;
- recursos/timers fora do recorte exercitado por VIS-004;
- estados e Fog of War além das representações-base já exercitadas;
- Armadilhas e Campos finais;
- feedback e logs além da composição estática do HUD;
- menus, tutorial e controles gerais;
- acessibilidade além da redução de movimento validada;
- GitHub Pages;
- replay e telemetria;
- self-play, QA e ferramentas de conteúdo.

Cada novo experimento deve registrar pergunta, opções quando aplicável, cenário reproduzível, resolução/dispositivo, pior caso relevante, critérios mensuráveis, evidências, resultado e decisão do autor. Mudanças materiais nos contratos aprovados de VIS-001, VIS-002 ou VIS-003 devem reabrir o experimento correspondente ou criar sucessor explícito.