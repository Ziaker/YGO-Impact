# Índice de protótipos visuais

Este índice acompanha o inventário visual obrigatório do GDD v0.43. **Existir protótipo não significa existir aprovação.** Quando houver aprovação explícita do autor, o estado correspondente é registrado aqui e no documento do experimento.

## Experimentos

| ID | Tema | Tipo | Estado | Evidência |
| --- | --- | --- | --- | --- |
| VIS-001 | Composição do campo e HUD principal | HTML estático/interativo para alternância A/B/C + revisão melhorada | **Aprovado — versão melhorada pelo autor em 2026-09-29** | `VIS-001-hud-layout.md`; o executável A/B/C em `../../prototypes/visual-001-hud-layout/index.html` permanece como comparador histórico |
| VIS-002 | Mapa, orientação 2D/3D e sistema de câmera | HTML interativo, 2D/3D sincronizados, câmera livre e foco traseiro | **Aprovado — 2D e 3D selecionáveis in-game** | `VIS-002-map-camera-2d-3d.md` + `../../prototypes/visual-002-map-camera-2d-3d/index.html` |
| VIS-003 | Movimento e alcançabilidade no mapa | Decisão de alcançabilidade | **Aprovado — Opção A (área cheia) em grade quadrangular** | `VIS-003-movement-reachability.md` (decisão comprovada por herança no VIS-004; snapshot isolado não localizado) |
| VIS-004 | Terreno, SPD e movimento avançado | HTML interativo 2D/3D com pacote QoL, Campo QA, impassável e Reação | **Aprovado — Opção A (badge persistente) pelo autor em 2026-09-30** | `VIS-004-terrain-spd-advanced-movement.md` + `../../prototypes/visual-004-terrain-spd-advanced-movement/index.html` |
| VIS-005 | VIS compartilhada, Fog of War, alcance e seleção de alvos | HTML interativo 2D/3D com setas direcionais (QA), fixtures inteiros legíveis (sem 1000+) e combate | **Aprovado — Opção A (grade tática estrita) pelo autor em 2026-09-30** | `VIS-005-fog-range-target-selection.md` + `../../prototypes/visual-005-fog-range-target-selection/index.html` |
| VIS-006 | Linguagem visual-base de materialização e validação espacial de regras | Protótipo visual A/B/C de materialização + Harness QA de regras | **Aprovado — Opção B (Círculo de Invocação) pelo autor em 2026-10-01** | `VIS-006-summons-anchors-spatial-fallback.md` + `../../prototypes/visual-006-summons/index.html` |
| VIS-006.1 | Identidade visual da Invocação Ritual | Protótipo visual limpo (A/B/C) sem interface de cartas nem regras de materiais | **Aprovado pelo autor — Opção B (Ascensão Cerimonial)** | `VIS-006-1-ritual-summon-identity.md` + `../../prototypes/visual-006-1-ritual/index.html` |
| VIS-006.2 | Identidade visual da Invocação Fusão | Protótipo visual limpo (A/B/C) sem interface de cartas nem regras de materiais | **Aprovado pelo autor — Opção A (Vórtice Bicolor / Polimerização)** | `VIS-006-2-fusion-summon-identity.md` + `../../prototypes/visual-006-2-fusion/index.html` |
| VIS-ENV-001 | Revisão da Câmera 3D e do Ambiente-Base (Palco Visual) | Protótipo visual 3D comparativo (A/B/C) de ângulo, ergonomia, iluminação, terreno e integração da grade | **Aprovado como palco de referência pelo autor em 2026-10-01 (câmera e ambiente congelados)** | `VIS-ENV-001-camera-3d-base-environment.md` + `../../prototypes/visual-env-001-board-camera/index.html` |
| VIS-007 | Identidade visual do combate e resolução de batalha | Microprotótipos atômicos por elemento visual (EL-1 a EL-7, 3 opções A/B/C cada) | **Em avaliação pelo autor (Opções A, B e C para EL-1 a EL-7)** | `VIS-007-combat-resolution.md` + `../../prototypes/visual-007-combat/index.html` |
| VIS-008 | Identidade visual de destruição, base e correntes | Microprotótipos atômicos por elemento visual (EL-8 a EL-10, 3 opções A/B/C cada) | **Em avaliação pelo autor (Opções A, B e C para EL-8 a EL-10)** | `VIS-008-chains-activation-visual.md` + `../../prototypes/visual-008-chains/index.html` |
| VIS-CARD-IN-GAME-001 | Representação in-game de unidade e inspeção flutuante | HTML interativo com histórico A/B/C + rodada C1/C2/C3 | **Em avaliação — A/B/C preservados; C1/C2/C3 em avaliação** | `VIS-CARD-IN-GAME-001.md` + `../../prototypes/visual-card-ingame-001/c-variants/index.html` |





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

Pergunta: como apresentar visualmente os blocos alcançáveis de uma unidade no mapa 31 × 17?

Resultado comprovado pelo autor:

- **Opção A — área cheia:** aprovada como apresentação dos blocos alcançáveis em grade quadrangular;
- **Projeção:** válida em 2D top-down e 3D tático sobre o mesmo mapa lógico;
- **Registro honesto:** o snapshot independente não foi localizado no repositório; a decisão está materializada no VIS-004 e documentada em `VIS-003-movement-reachability.md`;
- **Limites:** a aprovação cobre a área cheia para alcance, sem aprovar por herança leitura de terreno, custos numéricos ou regras do VIS-004.

## VIS-004

Pergunta: como apresentar terreno com custo especial, entrada legal com SPD negativo, recuperação de SPD, movimento como Reação e legibilidade de rota com pacote completo de qualidade de uso (QoL)?

Estado atual: **Aprovado pelo autor em 2026-09-30 (Opção A padrão)**.

Decisão de leitura de terreno:

- **Opção A [Aprovada pelo autor]:** Badge numérico de custo persistente no bloco (`×cost`) com tint de destaque. Garante leitura espacial direta da geografia do mapa sem depender do traçado de rotas prévias.
- **Opção B [Não aprovada]:** Custo incremental e acumulado exibidos ao longo do caminho traçado. Mantida como comparador histórico.
- **Opção C [Não aprovada]:** Leitura sutil/painel. Mantida como comparador histórico.

Características e QoL implementados no executável:

- Mapa 31 × 17 com orientações 2D, 3D e comparador QA lado a lado;
- Herança de VIS-003 (área cheia A) e VIS-002 (câmera 2D/3D);
- Pacote completo de qualidade de uso: badges de SPD em screen-space, ficha resumida de mobilidade, prévia `SPD antes → depois`, três categorias de legalidade (LEGAL, LEGAL COM CONSEQUÊNCIA, ILEGAL com cor, forma e texto), mensagens de ilegalidade junto ao cursor/bloco, custos acumulados no caminho, persistência da rota confirmada durante execução bloco a bloco, cancelamento contextual (segundo clique, clique fora, Escape), anel de progresso e feedback de reinício no timer de recuperação, tooltips de terreno, legenda recolhível, modo QA de informação reduzida, hierarquia automática de badges, redução de movimento completa e contrato opcional de eventos sonoros;
- Fixture QA de custo de Campo A configurável (deixando explícito que o GDD não define custo universal para terreno);
- Validação e testes embutidos (48/48 aprovados) cobrindo planejamento, execução, recuperação a cada 160 ticks, Reação e determinismo.

## VIS-005

Pergunta: como apresentar visualmente no mapa 31 × 17 a visão compartilhada (VIS), a névoa de guerra (Fog of War) com memória de última posição conhecida, a projeção de alcance de ataque e a seleção de alvos válidos/inválidos com linha de visada nas orientações 2D e 3D?

Estado atual: **Aprovado pelo autor em 2026-09-30 (Opção A padrão)**.

Decisão de Fog e alvos:

- **Opção A [Aprovada pelo autor]:** Grade tática estrita (Fog bloco a bloco com alta precisão posicional, marcadores pontilhados com `[?]` para última posição conhecida, retículo de cantos em alvos válidos e células de trajetória destacadas).
- **Opção B [Não aprovada]:** Gradiente suave com feixe dinâmico de visada. Mantida para comparação histórica.
- **Opção C [Não aprovada]:** Sombra dessaturada com contornos de destaque. Mantida para comparação histórica.

Características e controles implementados no executável:

- Construído sobre a base de código integral herdada do VIS-004 (2D/3D, QoL e regeneração de SPD);
- Fixtures de atributos inteiros legíveis (sem 1000+, HP = Nível);
- Movimentação primária via mouse com atalhos direcionais do teclado (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`) como ferramenta auxiliar de QA/teste;
- Visão compartilhada combinando visão dos monstros aliados e raio 5 da base (`DEC-002`), com bloqueio por obstáculos;
- Seleção de alvos, classificação de linha de visada e previsão canônica de combate (ataque defensivo, revide simultâneo e ataque indefeso);
- Validação Playwright em Microsoft Edge real: 16/16 testes aprovados em desktop e narrow sem mutação do hash autoritativo, com renderização real de badges da Opção A de terreno e Opção A de Fog.

## VIS-006

Pergunta estética: Qual deve ser a **linguagem visual-base de materialização** de monstros ao surgirem sobre o tabuleiro tático de Monster Impact?

Estado atual: **APROVADO — Opção B (Círculo de Invocação) pelo autor em 2026-10-01**.

Escopo e desdobramentos:
- **Padrão Aprovado (Opção B):** Selo arcano limpo e refinado de 5 camadas (anel duplo elegante com acentos cardeais, faixa rúnica com 16 glifos únicos em cascata horária sem linhas radiais poluentes, hexagrama equilátero nítido, núcleo de estrela de 8 pontas e coluna etérea suave de $z = 2.6$ blocos com 10 brasas sutis, despoluído conforme feedback do autor).
- **Timeline e Otimização:** Duração acelerada para 1300 ms (ganho real de +38,5% sobre a base anterior) dividida em 4 fases orgânicas (Ativação 0–260 ms, Sincronia 260–600 ms, Invocação/Clímax 600–980 ms e Dissipação 980–1300 ms).
- **Escopo Delimitado e Subprotótipos Futuros:** O VIS-006 define a linguagem-base de materialização de monstros no mapa. Conforme o GDD v0.43 (§18.3.3), Invocações importantes recebem efeitos visuais próprios: Normal/Tributo herdam esta apresentação comum/base, enquanto Ritual e Fusão terão identidades visuais próprias e distintas modeladas em subprotótipos posteriores sobre esta mesma base fixada.
- **Palco Fixo Congelado:** Tabuleiro 31×17 + grade tática + badges VIS-004 Opção A + câmera 2D/3D VIS-002 como referência permanente;
- **Registros Históricos Mantidos:** Opção A (Materialização Energética) e Opção C (Carta $\to$ Monstro) mantidas no protótipo para memória técnica e consulta comparativa.
- **Harness QA de Engenharia Preservado:** A validação formal das regras canônicas de âncoras, fallback com desempate pelo jogador e resolução de NEGAR permanece 100% auditada e ativa em `qa-harness.html` (20/20 testes).

Documento de especificação: `VIS-006-summons-anchors-spatial-fallback.md`.
Executável visual oficial: `../../prototypes/visual-006-summons/index.html`.
Harness de validação de regras: `../../prototypes/visual-006-summons/qa-harness.html`.

## VIS-006.1

Pergunta estética: Como uma **Invocação Ritual** deve parecer visualmente em Monster Impact, distinguindo-se claramente da materialização comum?

Estado atual: **APROVADO PELO AUTOR em 2026-10-01 (Opção B — Ascensão Cerimonial)**.

Decisões canônicas:
- **Metodologia Estrita:** Foco exclusivamente estético sobre a base fixa (mapa 31×17, câmera VIS-002, badges VIS-004 Opção A e bloco (7, 8)). Não inclui cartas, seleção de materiais ou cálculos de níveis.
- **Ritual Aprovado (Opção B — Ascensão Cerimonial):** Selo sagrado azul-celeste no solo ativando 4 pilares angulares de luz celestial; fitas sagradas de energia tecem uma câmara volumétrica enquanto a silhueta da criatura ritual ascende do interior do piso até repousar firme no tabuleiro.
- **Comparadores Históricos:** Opção A (Ritual Sacrificial / Vórtice de Essência) e Opção C (Portal Arcano) mantidas no executável para registro de evolução técnica.
- **Exploração Não-Canônica Preservada:** Opção D (Dupla Hélice em Prata & Ferro) mantida como biblioteca estética fora do escopo do GDD v0.43 (o qual contempla exclusivamente Normal, Tributo, Ritual e Fusão).

Documento de especificação: `VIS-006-1-ritual-summon-identity.md`.
Executável visual oficial: `../../prototypes/visual-006-1-ritual/index.html`.

## VIS-006.2

Pergunta estética: Como uma **Invocação Fusão** deve parecer visualmente em Monster Impact, distinguindo-se claramente da materialização comum (VIS-006 B) e do Ritual (VIS-006.1 B)?

Estado atual: **APROVADO PELO AUTOR em 2026-10-01 (Opção A — Vórtice Bicolor / Espiral de Polimerização)**.

Decisões canônicas:
- **Metodologia Estrita:** Palco fixo congelado (31×17, câmera VIS-002, badges VIS-004 Opção A e bloco (7, 8)). Duração de 1300 ms sem cartas de mão, custos de magia ou seletores.
- **Fusão Aprovada (Opção A — Vórtice Bicolor):** Duas correntes espirais complementares (carmesim ígneo e ciano safira) descem em vórtice acelerado e convergem no solo, fundindo-se em clarão violeta puro com anel de choque e filamentos residuais orbitando a criatura sólida.
- **Comparadores Históricos:** Opção B (Colisão & Amálgama Elemental) e Opção C (Selo Alquímico de Transmutação) mantidas no executável para registro de evolução técnica.

Documento de especificação: `VIS-006-2-fusion-summon-identity.md`.
Executável visual oficial: `../../prototypes/visual-006-2-fusion/index.html`.

## VIS-ENV-001

Pergunta estética: Qual deve ser a câmera 3D e o ambiente visual padrão de Monster Impact para que o jogo fique bonito, legível e agradável de usar, sem comprometer a leitura tática?

Estado atual: **EM AVALIAÇÃO PELO AUTOR (Opções A, B e C)**.

Motivação e Diretrizes do Autor (2026-10-01):
- A suposição anterior de "palco visual congelado" foi expressamente revogada pelo autor.
- A câmera 3D herdada do VIS-002/VIS-004 e o ambiente do tabuleiro foram diagnosticados como a causa-raiz de desconforto de uso, leitura distorcida e sensação de protótipo cru.
- Não faz sentido continuar refinando efeitos de combate (VIS-007) e correntes (VIS-008) sobre uma base visual fraca. A base fundacional precisa ser resolvida primeiro.
- O protótipo foca exclusivamente no aspecto visual e ergonômico, mantendo cena estável comparável com unidades, base, obstáculos, prévia de movimento e prévia de impacto limpo.

As 3 Opções em Comparação:
- **Opção A — Diorama Tático Nobre:** Câmera oblíqua suave (estilo isométrico teleobjetivo com FOV ~32°, pitch ergonômico de 38°, zero distorção em bordas 31×17); platô monolítico espesso em ardósia escura com chanfro arquitetônico em 45°; linhas gravadas sutilmente em baixo-relevo com chanfro acetinado; iluminação de estúdio difusa neutra-quente; bases como consoles de comando embutidos; obstáculos como monólitos chanfrados de basalto com bordas iluminadas. Foco em legibilidade cirúrgica, elegância e zero ruído.
- **Opção B — Arena Estilizada Mística / Anime Duelo:** Câmera imersiva com leve profundidade dramática (FOV ~44°, pitch dinâmico de 42°); arena flutuante de pedra ancestral com canais rúnicos pulsando micro-veios de energia (ciano, âmbar, carmesim); bordas trabalhadas em relevo com pilares; abismo místico no horizonte com névoa estelar; bases como altares de cristal lapidado; obstáculos como estátuas/monólitos arcanos com glifos suaves; iluminação com contraste de tochas e rim light dourada contornando as peças.
- **Opção C — Tabuleiro Estratégico Monumental:** Câmera panorâmica elevada de alto comando (~54° de inclinação, FOV ~38° com visão ampla e confortável de toda a extensão 31×17); mesa nobre em mármore obsidiana polido com reflexos suaves; divisões da grade incrustadas com filetes de latão e ouro escovado; moldura de mogno com cantoneiras de latão; bases como cidadelas arquitetônicas estilizadas em miniatura; obstáculos como totens geométricos facetados em obsidiana e metal; iluminação cenográfica zenital com alto contraste.

Documento de especificação: `VIS-ENV-001-camera-3d-base-environment.md`.
Executável visual oficial: `../../prototypes/visual-env-001-board-camera/index.html`.

## VIS-007

Pergunta estética: Como cada elemento visual atômico do combate (foco/seleção, melee, ranged, impacto/hit, feedback de dano, revide e alvo indefeso) deve se manifestar com clareza gráfica 2D-like sobre o tabuleiro 3D de referência sem gerar poluição visual?

Estado atual: **EM AVALIAÇÃO PELO AUTOR (7 Elementos Visuais × 3 Opções = 21 Variações)**.

Metodologia e Microprotótipos Implementados:
- **Palco Fixo Congelado:** Câmera 3D e tabuleiro-base aprovados em VIS-ENV-001 como referência permanente.
- **Overlay Gráfico 2D:** Efeitos vetoriais limpos em alta definição projetados sobre as coordenadas da grade.
- **7 Elementos com 3 Opções A/B/C cada:**
  - **EL-1 (Foco/Seleção de Alvo):** A) Retícula tática circular pulsante | B) Spotlight gráfico + vetor tracejado | C) Cantoneiras táticas (bracket corners).
  - **EL-2 (Ataque Melee):** A) Slash gráfico em arco limpo | B) Snap/dash com rastro angular | C) Estocada rápida com burst focal.
  - **EL-3 (Ataque Ranged):** A) Dardo gráfico estilizado com rastro sólido | B) Feixe retilíneo vetorial instantâneo | C) Orbe rúnico de pulso concêntrico.
  - **EL-4 (Impacto/Hit):** A) Starburst geométrico com micro-shake (2px) | B) Cross slash em X com hit-stop (60 ms) | C) Onda de choque plana concêntrica.
  - **EL-5 (Feedback de Dano):** A) Pop vertical clássico alto contraste | B) Recuo direcional com arco parabólico | C) Badge tático em moldura geométrica.
  - **EL-6 (Revide/Contra-Ataque):** A) Badge tático "REVIDE!" + golpe espelhado | B) Ricochete de faíscas planas | C) Vetor luminoso duplo simultâneo.
  - **EL-7 (Alvo Indefeso/Vulnerável):** A) Escudo partido estilizado | B) Silhueta escurecida temporária ("Vulnerável") | C) Insígnia tática "GOLPE LIMPO".

Documento de especificação: `VIS-007-combat-resolution.md`.
Executável visual oficial: `../../prototypes/visual-007-combat/index.html`.

## VIS-008

Pergunta estética: Como a destruição de monstros, o impacto direto na base e a resolução reversa LIFO de Correntes devem se manifestar visualmente com clareza gráfica sobre o tabuleiro 3D de referência?

Estado atual: **EM AVALIAÇÃO PELO AUTOR (3 Elementos Visuais × 3 Opções = 9 Variações)**.

Metodologia e Microprotótipos Implementados:
- **Palco Fixo Congelado:** Câmera 3D e tabuleiro-base aprovados em VIS-ENV-001 como referência permanente.
- **3 Elementos com 3 Opções A/B/C cada:**
  - **EL-8 (Destruição do Monstro):** A) Dissolução gráfica limpa com fade e escala 3D a zero | B) Fragmentação geométrica plana (shards 2D) | C) Colapso luminoso para o pedestal.
  - **EL-9 (Impacto na Base):** A) Pulso de onda plana no anel da base | B) Rachadura gráfica no bloco com flash de alerta | C) Marcador numérico flutuante ("IMPACTO 1/5") com câmera enquadrada diretamente no console da base ($X = 26.5$).
  - **EL-10 (Elos de Corrente LIFO):** A) Badges numéricos sobrepostos planos (`CL1`, `CL2`, `CL3`) com resolução reversa | B) Conector gráfico vetorial no piso | C) Faixa gráfica compacta no topo com cards 2D.

Documento de especificação: `VIS-008-chains-activation-visual.md`.
Executável visual oficial: `../../prototypes/visual-008-chains/index.html`.

## VIS-ENV-001

Pergunta: qual deve ser a câmera 3D e o ambiente visual padrão de Monster Impact para que o jogo fique monumental, legível e agradável de usar na grade 31 × 17, e como os 6 elementos canônicos do GDD devem se diferenciar fisicamente por formato de malha, geometria tridimensional e dinâmica física, e não apenas por cor?

Opções em avaliação comparativa:
- **A — Coliseu Sagrado das Lâminas (High-Fantasy Arena):** Platô em ardósia nobre chanfrada com 4 pilares monumentais nos cantos, tochas acesas e projeção de sombras em tempo real;
- **B — Arena Cibernética Solid Vision (Neo-Kaiba Dome):** Piso holográfico escuro reflexivo com fluxo neon quântico e pilares laser translúcidos;
- **C — Templo Arcaico Milenar (Millennium Archaic Temple):** Arenito maciço dourado, divisões em ouro escovado e obeliscos cerimoniais com hieróglifos.

6 Geometrias Elementais Exclusivas (GDD §18.3):
- **🔥 FOGO:** Cone de fogo horizontal (`ConeGeometry`, 4.8m) + núcleo de plasma (`SphereGeometry`) + anel térmico + 12 brasas em ascensão (`OctahedronGeometry`);
- **💧 ÁGUA:** Serpente fluida em tubo parabólico (`TubeGeometry` Catmull-Rom) + gêiser vertical em alta pressão (`CylinderGeometry`) + ondas de choque no piso (`RingGeometry`);
- **🌍 TERRA:** Fissura tectônica no solo + cascata de 5 espigões de pedra facetada (`ConeGeometry` 5 faces) + blocos de escombros de impacto (`BoxGeometry`);
- **🌪️ VENTO:** Funil ciclônico vertical afunilado (`CylinderGeometry`) + foices duplas de vácuo afiadas (`TorusGeometry`) em eixos ortogonais + anel de pressão;
- **☀️ LUZ:** Pilar celestial colossal de 35 metros (`CylinderGeometry`) + núcleo branco puro e aura dourada + duplo círculo sagrado circular no piso;
- **🌑 TREVAS:** Singularidade gravitacional (buraco negro esférico) (`SphereGeometry`) + disco de acreção violeta inclinado a 35° (`RingGeometry`) + garras abissais.

Engine: Three.js r128 local/offline vendoring no plano $XZ$, elevação $Y$, OrbitControls com amortecimento e câmera isométrica (Pitch 42°).
Documento de especificação: `VIS-ENV-001-camera-3d-base-environment.md`.
Executável visual oficial: `../../prototypes/visual-env-001-board-camera/index.html`.

## Inventário ainda pendente

O GDD exige prototipagem antes da implementação final para, entre outros grupos ainda não encerrados por aprovação específica:

- identidade visual geral;
- terrenos e geografia visual definitiva (Opção A aprovada para leitura de custo persistente no bloco; arte visual definitiva de terreno permanece em aberto);
- monstros no mapa e arte/silhuetas finais;
- cartas e molduras;
- iconografia;
- efeitos visuais;
- movimento e animação de gameplay além do contrato de câmera aprovado;
- inspeção de unidades/cartas além da composição aprovada do HUD;
- zonas e áreas;
- movimento e alvos autoritativos além dos protótipos visuais;
- Invocações;
- combate;
- Correntes e Cross Chains completas;
- recursos e timers;
- estados e Fog of War além das representações-base já exercitadas;
- Armadilhas e Campos definitivos;
- feedback e logs além da composição estática do HUD;
- menus, tutorial e controles gerais;
- acessibilidade além da redução de movimento validada;
- GitHub Pages;
- replay e telemetria;
- self-play, QA e ferramentas de conteúdo.

Cada novo experimento deve registrar pergunta, opções quando aplicável, cenário reproduzível, resolução/dispositivo, pior caso relevante, critérios mensuráveis, evidências, resultado e decisão do autor. Mudanças materiais nos contratos aprovados de VIS-001 ou VIS-002 devem reabrir o experimento correspondente ou criar sucessor explícito.
