# Monster Impact

> **YGO Impact / Monster Impact** é um fangame pessoal e não comercial de Yu-Gi-Oh! que adapta cartas oficiais para um sistema próprio de combate tático 2D top-down.

O projeto combina estratégia em tempo real, RPG tático, deckbuilding, movimentação espacial e interações por Correntes. A referência de legibilidade do campo é **Fire Emblem de GBA**, sem obrigação de reproduzir sua direção de arte ou utilizar pixel art.

Monster Impact **não reproduz automaticamente as regras tradicionais de Yu-Gi-Oh!**. Cartas, efeitos, Invocações e conceitos são reinterpretados segundo o GDD do projeto.

## Estado do projeto

**Fase atual: prototipagem e implementação incremental do núcleo do primeiro protótipo.**

O GDD-base está concluído na versão **0.42**, com **25 de 25 fases finalizadas e nenhuma pendência P0 ativa**. `docs/context/GDD_SOURCE.md` registra o nome, tamanho e SHA-256 do arquivo canônico efetivamente lido antes da implementação.

A cópia binária `.docx` ainda não está versionada porque o conector disponível nesta sessão não permite transportar o arquivo binário preservando integralmente os bytes acima do limite do canal. O repositório não trata reconstruções ou resumos como substitutos do original enquanto o hash canônico não puder ser preservado exatamente.

### Já implementado ou prototipado

- núcleo autoritativo inicial em TypeScript em `src/core/`;
- passo lógico fixo de **20 Hz / 50 ms** no scaffold;
- fila pública determinística de comandos;
- serialização/hash determinístico inicial;
- invariantes espaciais básicas do mapa **31 × 17**, bases e ocupação;
- testes automatizados do núcleo em `tests/core/`;
- primeiro experimento visual A/B/C (`VIS-001`) para campo/HUD;
- downloader de artes `image_url_cropped`;
- seleção e sincronização versionada de artes;
- lote inicial de artes cropped e manifesto SHA-256;
- CI para TypeScript, núcleo e ferramentas Python.

### Ainda pendente

- gameplay completo do núcleo: recursos, custos, movimento, pathfinding, dano, Invocações, Correntes, Cross Chains, IMEDIATOS, Fog of War, RNG e timers;
- aprovação visual explícita do VIS-001;
- demais protótipos visuais obrigatórios do GDD;
- conteúdo inicial completo;
- IA competitiva e IA de QA;
- telemetria e replay do motor;
- self-play headless;
- build web jogável;
- publicação no GitHub Pages.

Não confundir **definido no GDD**, **prototipado**, **implementado**, **testado**, **aprovado** e **publicado**. O estado detalhado fica em `docs/context/ROADMAP.md`.

## Conceito do primeiro protótipo

- single-player contra IA;
- apresentação 2D top-down;
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

O primeiro experimento é:

```text
prototypes/visual-001-hud-layout/index.html
```

Ele compara três composições do campo/HUD sob o mesmo cenário de densidade. **Nenhuma opção está aprovada ainda.** Critérios e hipóteses ficam em `docs/prototypes/VIS-001-hud-layout.md`.

## Artes das cartas

O projeto utiliza ilustrações oficiais como composição visual do fangame pessoal. O downloader usa `image_url_cropped` da API do YGOPRODeck; o jogo não depende de hotlink durante a execução.

Por decisão explícita do autor, as artes selecionadas e o `manifest.json` podem ser versionados no repositório.

Seleção atual:

```text
scripts/card_art_targets.txt
```

Sincronização local:

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

Detalhes, filtros e alternativas estão em `scripts/README.md`. Avisos sobre conteúdo de terceiros estão em `THIRD_PARTY_NOTICES.md`.

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

## Como abrir o protótipo visual

Abra em um navegador moderno:

```text
prototypes/visual-001-hud-layout/index.html
```

O VIS-001 avalia composição/aparência. Ele não valida timing, movimento, Correntes ou Fog of War interativo; esses sistemas exigem protótipos executáveis próprios quando forem avaliados.

## GitHub Pages

O GDD exige uma build jogável estática e reproduzível no GitHub Pages usando o mesmo núcleo ou comprovando equivalência por dados, seeds, eventos e hashes.

**Ainda não existe versão jogável publicada.** A publicação só ocorrerá depois de validação de conteúdo, tipos, testes, build e smoke test.

## IA, telemetria e replay

Os contratos já estão definidos no GDD, mas ainda não estão implementados. A IA competitiva deve respeitar a mesma informação do jogador; a IA de QA será separada, mas utilizará o mesmo núcleo e interface pública. Replays e telemetria deverão registrar seed, comandos, causalidade, aleatoriedade e hashes suficientes para reprodução determinística.

## Objetivo técnico

Construir um protótipo que seja jogável, fiel ao GDD, determinístico, testável, reproduzível, orientado por dados, visualmente validado, jogável contra IA, capaz de IA vs. IA e self-play headless, equipado com telemetria/replay e publicável de forma reproduzível no GitHub Pages.

## Aviso

Monster Impact é um projeto pessoal, não comercial e não oficial.

Yu-Gi-Oh! e seus personagens, cartas, nomes e artes pertencem aos respectivos detentores de direitos. Este projeto não possui afiliação oficial com a Konami. Consulte também `THIRD_PARTY_NOTICES.md`.
