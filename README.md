# Monster Impact

> **YGO Impact / Monster Impact** é um fangame pessoal e não comercial de Yu-Gi-Oh! que adapta cartas oficiais para um sistema próprio de combate tático 2D top-down.

O projeto combina estratégia em tempo real, RPG tático, deckbuilding, movimentação espacial e interações por Correntes. A referência de legibilidade do campo é **Fire Emblem de GBA**, sem obrigação de reproduzir sua direção de arte ou utilizar pixel art.

Monster Impact **não reproduz automaticamente as regras tradicionais de Yu-Gi-Oh!**. Cartas, efeitos, Invocações e conceitos são reinterpretados segundo o GDD do projeto.

## Estado do projeto

**Fase atual: prototipagem e implementação incremental do núcleo do primeiro protótipo.**

O GDD-base está concluído na versão **0.43**, com **25 de 25 fases finalizadas e nenhuma pendência P0 ativa**. docs/context/GDD_SOURCE.md registra o nome, tamanho, SHA-256 e localização da cópia canônica completa mais recente em docs/context/sources/Monster_Impact_GDD_v0.43.docx (com a v0.42 preservada como histórico). O prompt mestre completo também está preservado em docs/context/sources/PROMPT_MESTRE.txt.

### Já implementado, prototipado ou aprovado

- núcleo autoritativo inicial em TypeScript em `src/core/`;
- passo lógico fixo de **20 Hz / 50 ms** no scaffold;
- fila pública determinística de comandos;
- serialização/hash determinístico inicial;
- invariantes espaciais básicas do mapa **31 × 17**, bases e ocupação;
- primeiro turno e distribuição secreta dos **8 recursos** na Fase de Decisão;
- consumo de Ações/Reações na confirmação e encerramento voluntário da participação;
- conversão de recursos após Correntes e ciclo estrutural das cinco fases;
- estado de turno integrado ao hash e à fila autoritativa compartilhada por humano e IA;
- impactos válidos na base, vitória imediata no quinto impacto e cancelamento de comandos posteriores;
- Token de Prioridade e desempate de quintos impactos simultâneos;
- RNG reproduzível com fluxos derivados e sorteio inicial auditável do Token;
- Token sorteado pela seed, registrado no estado autoritativo e alternado a cada novo turno;
- movimento básico ortogonal com atualização atômica de SPD e posição, travessia de aliados e bloqueios físicos;
- Invocação Normal atômica entre mão, catálogo, unidade e mapa, integrada à fila autoritativa sem custo universal de Ação;
- VIS compartilhada calculada pela união da visão ortogonal aliada e do quadrado de raio 5 da base, com bloqueio por bases e obstáculos fixos;
- movimento básico integrado à fila autoritativa, usando somente SPD como custo;
- Invocação por Tributo integrada à fila, enviando os materiais físicos ao Cemitério sem custo universal de Ação;
- memória justa de Fog of War por jogador integrada ao estado/hash, sem rastrear movimento inimigo oculto;
- fórmulas-base e operações de HP/MP com causas distintas e piso zero;
- distância ortogonal, alcance e linha de ataque com bloqueio por todos os blocos tocados;
- validação completa dos três Decks e relatório individual de violações;
- embaralhamento reproduzível dos dois Decks, mão inicial, compra e Deck Out atômico;
- roteamento de ativações entre resolução direta, Corrente e IMEDIATO;
- Correntes LIFO com revalidação individual, negação isolada e limite de Cross Chain;
- tabela das 17 RACE e aplicação cumulativa dos bônus estruturais;
- replay mínimo reproduzível por seed/comandos com comparação de hashes por passo;
- telemetria local versionada com comandos, rejeições, contexto lógico e hashes;
- testes automatizados do núcleo em `tests/core/`;
- `VIS-001` para composição do campo/HUD: **versão melhorada aprovada pelo autor em 2026-09-29**;
- `VIS-002` para mapa/câmera: **aprovado pelo autor em 2026-09-29**, com 2D top-down e 3D tático selecionáveis in-game sobre o mesmo estado lógico;
- downloader de artes `image_url_cropped`;
- seleção e sincronização versionada de artes;
- manifesto SHA-256 das artes versionadas;
- CI para TypeScript, núcleo e ferramentas Python.

### Ainda pendente

- gameplay completo do núcleo: recursos, custos, movimento, pathfinding, dano, Invocações, Correntes, Cross Chains, IMEDIATOS, Fog of War, RNG e timers;
- demais protótipos visuais obrigatórios do GDD além dos pontos já aprovados em VIS-001 e VIS-002;
- conteúdo inicial completo e seleção final do primeiro conjunto/decks;
- IA competitiva e IA de QA;
- contratos técnicos versionados de telemetria/IA e implementação correspondente;
- telemetria e replay do motor;
- self-play headless;
- build web jogável;
- publicação no GitHub Pages.

Não confundir **definido no GDD**, **prototipado**, **implementado**, **testado**, **aprovado** e **publicado**. O estado detalhado fica em `docs/context/ROADMAP.md`.

## Conceito do primeiro protótipo

- single-player contra IA;
- apresentação do mesmo campo lógico em **2D top-down** e **3D tático**, selecionáveis in-game conforme VIS-002;
- mapa inicial de **31 × 17 blocos**;
- até **5 monstros por jogador** simultaneamente;
- Duelista não aparece fisicamente no mapa;
- base física sólida e não ocupável;
- sem Life Points tradicionais;
- derrota ao receber **5 impactos válidos** na base, com encerramento imediato no quinto;
- movimento baseado em **SPD**;
- Fog of War baseado em **VIS**;
- posições de ATK e DEF;
- Correntes, Cross Chains e efeitos IMEDIATOS;
- Deck de Monstros separado do Deck de Magias/Armadilhas;
- Extra Deck;
- Invocação Normal, Tributo, Ritual e Fusion;
- IA sujeita às mesmas regras e limitações de informação do jogador.

## Regras críticas

### Correntes

Uma Corrente somente abre ou recebe elementos quando a ativação envolve **pelo menos um alvo inimigo**.

Ações voltadas apenas para o usuário ou aliados não abrem Corrente isoladamente, embora respostas legais possam integrar uma Corrente inimiga. Correntes normais resolvem em **LIFO**, com revalidação individual de alvos e elementos.

### IMEDIATO

`IMEDIATO` e `IMEDIATAMENTE` significam ativar e resolver no mesmo instante, fora da pilha e sem Corrente. Não há janela entre ativação e resolução, mas verificações obrigatórias de estado continuam ocorrendo.

### Armadilhas

Setar uma Armadilha não abre Corrente e não paga custo de ativação. O custo é pago somente quando a Armadilha é ativada.

## Determinismo e arquitetura

Existe um único núcleo autoritativo. Interface, renderização, animação, IA e telemetria não alteram diretamente o estado; usam snapshots somente para leitura ou enviam comandos pela interface pública.

**TypeScript é a linguagem principal do Monster Impact** para o núcleo, regras, IA, replay, telemetria, testes desses sistemas e aplicação web. Python fica reservado a scripts, ferramentas, processamento de dados e análises quando vantajoso, sem duplicar a simulação autoritativa.

A tecnologia de UI e renderização é uma decisão separada, ainda sujeita à prototipagem A/B/C e à aprovação visual. O renderer escolhido deve consumir os contratos públicos do mesmo núcleo, de modo que possa ser substituído sem reescrever regras nem alterar o resultado da simulação.

A simulação opera em **20 Hz**, com passos de **50 ms**. Humanos e IA usam a mesma fila. Com os mesmos dados, Decks, seed, comandos, ordem de entrada, configuração e versão de regras, partida, replay, headless e web devem produzir estados, eventos, hashes e resultado equivalentes.

O núcleo inicial está em `src/core/`. Sua decisão arquitetural está registrada em `docs/context/ADR-001-core-runtime.md`, e o contrato técnico atual em `src/core/README.md`.

## Decks

### Deck de Monstros

- 20 a 30 cartas;
- pelo menos 8 Monstros Normais.

### Deck de Magias/Armadilhas

- 15 a 30 cartas.

### Extra Deck

- 0 a 10 cartas;
- Ritual e Fusion ficam aqui no primeiro protótipo.

### Limites gerais

- máximo de 3 cópias por nome;
- sem Side Deck no primeiro protótipo.

## Invocações do primeiro protótipo

Incluídas: **Normal, Tributo, Ritual e Fusion**.

Fora do primeiro protótipo: **Synchro e Xyz**.

Fora da direção atual: **Pendulum e Link**.

Regras específicas de materiais, posicionamento, custos e resolução vêm do GDD e não devem ser inferidas das regras oficiais de Yu-Gi-Oh!.

## RACE prioritárias

O primeiro escopo prioriza 17 RACE:

`Aqua`, `Beast`, `Dragon`, `Fairy`, `Fiend`, `Fish`, `Insect`, `Machine`, `Plant`, `Psychic`, `Pyro`, `Rock`, `Spellcaster`, `Thunder`, `Warrior`, `Winged Beast` e `Zombie`.

Outras RACE ficam fora do escopo inicial até decisão posterior.

## Estrutura atual

```text
YGO-Impact/
├── docs/
│   ├── context/          # GDD, ADRs, roadmap, contratos e contexto
│   └── prototypes/       # índice, experimentos, evidências e aprovações
├── prototypes/           # protótipos executáveis/visuais
├── src/
│   └── core/             # núcleo autoritativo inicial
├── tests/
│   └── core/             # testes do núcleo e invariantes
├── scripts/              # ferramentas e coleta de artes
├── assets-local/         # artes selecionadas + manifesto versionados
├── package.json          # comandos do núcleo TypeScript
├── tsconfig.json
├── THIRD_PARTY_NOTICES.md
└── .github/
    └── workflows/        # CI, sincronização de artes e futuramente Pages
```

Diretórios sem utilidade imediata não são criados apenas para preencher a árvore.

## Fonte de verdade

Antes de implementar ou modificar regras, consulte o GDD identificado em `docs/context/GDD_SOURCE.md`.

Em conflito, a precedência resumida é:

1. instrução explícita atual do autor;
2. correções expressas mais recentes;
3. regras de precedência do GDD;
4. regra específica do GDD;
5. regra geral do GDD;
6. decisões arquiteturais versionadas;
7. testes/regressões aprovados;
8. implementação existente;
9. convenções técnicas.

Não preencher lacunas com regras oficiais de Yu-Gi-Oh! nem inventar custos, limites ou interações.

## Prototipagem visual

Toda decisão visual relevante precisa de validação antes da implementação final. Quando ainda não houver solução aprovada, o experimento apresenta **A, B e C**.

O inventário fica em `docs/prototypes/INDEX.md`.

### VIS-001 — HUD/campo

O comparador originalmente versionado fica em:

```text
prototypes/visual-001-hud-layout/index.html
```

Ele compara três composições históricas A/B/C do campo/HUD sob o mesmo cenário de densidade. A decisão vigente é posterior: **o autor aprovou a versão melhorada do VIS-001 em 2026-09-29**. O Git atual não sustenta transformar essa aprovação em “A”, “B” ou “C” pura sem inventar informação; por isso o comparador original permanece evidência histórica e a decisão normativa fica em `docs/prototypes/VIS-001-hud-layout.md`.

A aprovação do VIS-001 cobre composição, hierarquia e densidade. Ela não valida timing, movimento, Correntes interativas ou Fog of War dinâmico.

### VIS-002 — mapa/câmera

O executável aprovado fica em:

```text
prototypes/visual-002-map-camera-2d-3d/index.html
```

VIS-002 aprova 2D top-down e 3D tático como orientações selecionáveis do mesmo estado lógico, com o contrato de câmera descrito em `docs/prototypes/VIS-002-map-camera-2d-3d.md`.

### VIS-003 — alcance e alcançabilidade de movimento

Aprovado formalmente com **Opção A — área cheia** como apresentação dos blocos alcançáveis em grade quadrangular (`docs/prototypes/VIS-003-movement-reachability.md`).

### VIS-004 — terreno, SPD e movimento avançado

O executável aprovado fica em:

```text
prototypes/visual-004-terrain-spd-advanced-movement/index.html
```

Aprovado formalmente pelo autor em 2026-09-30 com **Opção A — badge persistente de custo no bloco** (`×cost`), operando com regras de SPD negativo, recuperação de +2 SPD a 20 Hz, movimento como Reação e pacote completo de QoL (`docs/prototypes/VIS-004-terrain-spd-advanced-movement.md`).

### VIS-005 — VIS compartilhada, Fog of War, alcance e alvos

O executável aprovado fica em:

```text
prototypes/visual-005-fog-range-target-selection/index.html
```

Aprovado formalmente pelo autor em 2026-09-30 com **Opção A — Grade Tática Estrita com cantos de alvos e marcadores [?]**, consolidando visão compartilhada (monstros + base raio 5), linha de visão, seleção de alvos e previsão de combate (`docs/prototypes/VIS-005-fog-range-target-selection.md`).

### VIS-006 — invocações, âncoras e fallback espacial

O executável comparativo fica em:

```text
prototypes/visual-006-summons/index.html
```

Cobre Invocação Normal, Tributo, Ritual e Fusion, seleção de âncoras (Base e monstros aliados no campo), materiais (campo e mão), posicionamento com fallback espacial determinístico, QA de NEGAR e comparação A/B/C (`docs/prototypes/VIS-006-summons-anchors-spatial-fallback.md`).


## Artes das cartas

O projeto utiliza ilustrações oficiais como composição visual do fangame pessoal. O downloader usa `image_url_cropped` da API do YGOPRODeck; o jogo não depende de hotlink durante a execução.

Por decisão explícita do autor, as artes selecionadas e o `manifest.json` podem ser versionados no repositório.

O `DEC-001-initial-card-pool.md` define uma política automática de **136 cartas**. A seleção real fecha nessa quantidade após a exceção aprovada para repetição de `Psychic Musician` e `Shaman Bandit` somente nos quatro slots Psychic Rush restantes. O snapshot versionado ainda registra 96 cartas; oito novas entradas Rush aguardam ilustração limpa porque a fonte auxiliar oferece apenas a carta montada.

Seleção manual de alvos do downloader:

```text
scripts/card_art_targets.txt
```

Sincronização local básica:

```bash
python scripts/baixar_artes.py \
  --input scripts/card_art_targets.txt \
  --output assets-local/card-art
```

Dry-run:

```bash
python scripts/baixar_artes.py \
  --input scripts/card_art_targets.txt \
  --dry-run
```

Detalhes, filtros, política de pool e alternativas estão em `scripts/README.md`. Avisos sobre conteúdo de terceiros estão em `THIRD_PARTY_NOTICES.md`.

## Desenvolvimento do núcleo

Requer Node.js conforme `package.json`.

Typecheck:

```bash
npm run typecheck
```

Testes do núcleo:

```bash
npm run test:core
```

Typecheck + testes:

```bash
npm test
```

Build TypeScript:

```bash
npm run build
```

O scaffold atual não constitui uma build jogável.

## Testes Python

```bash
python -m unittest discover -s tests -p "test_*.py" -v
python -m py_compile scripts/baixar_artes.py
```

O workflow `.github/workflows/ci.yml` executa as verificações automatizadas em push e pull request.

## Como abrir os protótipos visuais

Abra em navegador moderno:

```text
prototypes/visual-001-hud-layout/index.html
prototypes/visual-002-map-camera-2d-3d/index.html
```

O VIS-001 versionado é o comparador histórico de composição/aparência; a versão melhorada foi aprovada pelo autor. O VIS-002 é o protótipo aprovado de mapa/câmera. Sistemas temporais adicionais continuam exigindo protótipos executáveis próprios quando forem avaliados.

## GitHub Pages

O GDD exige uma build jogável estática e reproduzível no GitHub Pages usando o mesmo núcleo ou comprovando equivalência por dados, seeds, eventos e hashes.

**Ainda não existe versão jogável publicada.** A publicação só ocorrerá depois de validação de conteúdo, tipos, testes, build e smoke test.

## IA, telemetria e replay

Os contratos conceituais estão definidos no GDD, mas documentos técnicos específicos como `TELEMETRY_SCHEMA.md` e `AI_INTERFACE.md` ainda não estão versionados. Replay e telemetria mínimos já estão implementados e testados; causalidade completa, snapshots de diagnóstico, IA competitiva, IA de QA e self-play continuam pendentes. A IA competitiva deve respeitar a mesma informação do jogador, e a IA de QA será separada, mas ambas utilizarão o mesmo núcleo e a mesma interface pública.

## Objetivo técnico

Construir um protótipo que seja jogável, fiel ao GDD, determinístico, testável, reproduzível, orientado por dados, visualmente validado, jogável contra IA, capaz de IA vs. IA e self-play headless, equipado com telemetria/replay e publicável de forma reproduzível no GitHub Pages.

## Aviso

Monster Impact é um projeto pessoal, não comercial e não oficial.

Yu-Gi-Oh! e seus personagens, cartas, nomes e artes pertencem aos respectivos detentores de direitos. Este projeto não possui afiliação oficial com a Konami. Consulte também `THIRD_PARTY_NOTICES.md`.
