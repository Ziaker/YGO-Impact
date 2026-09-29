# Monster Impact

> **YGO Impact / Monster Impact** é um fangame pessoal e não comercial de Yu-Gi-Oh! que adapta cartas oficiais para um sistema próprio de combate tático 2D top-down.

O projeto combina estratégia em tempo real, RPG tático, deckbuilding, movimentação espacial e interações por Correntes. A referência de legibilidade do campo é **Fire Emblem de GBA**, sem obrigação de reproduzir sua direção de arte ou utilizar pixel art.

Monster Impact **não reproduz automaticamente as regras tradicionais de Yu-Gi-Oh!**. Cartas, efeitos, Invocações e conceitos são reinterpretados segundo o GDD do projeto.

## Estado do projeto

**Fase atual: estruturação e pré-implementação do primeiro protótipo.**

O GDD-base está concluído na versão **0.42**, com **25 de 25 fases finalizadas e nenhuma pendência P0 ativa**. O arquivo canônico fornecido pelo autor foi lido integralmente; `docs/context/GDD_SOURCE.md` registra nome de origem, tamanho e SHA-256 do arquivo efetivamente lido. A cópia binária `.docx` ainda não está versionada no Git porque o conector disponível nesta sessão trunca conteúdo binário/base64 acima do limite de transporte; o repositório não afirma possuir uma cópia canônica enquanto tamanho e SHA-256 não puderem ser preservados exatamente.

Já estão versionados:

- identificação verificável do GDD v0.42 em `docs/context/`;
- documentação inicial de contexto e prototipagem;
- contrato arquitetural do núcleo em `src/core/README.md`;
- primeiro experimento visual A/B/C em `prototypes/visual-001-hud-layout/`;
- registro do experimento VIS-001 em `docs/prototypes/VIS-001-hud-layout.md`;
- downloader de artes em `scripts/baixar_artes.py`;
- seleção versionada de artes em `scripts/card_art_targets.txt`;
- artes cropped selecionadas e `manifest.json` em `assets-local/card-art/`;
- testes automatizados do downloader;
- workflow inicial de CI;
- workflow de sincronização de artes em `.github/workflows/sync-card-art.yml`;
- `.gitignore` para builds, caches, logs, temporários e telemetria local.

Ainda não estão implementados:

- núcleo autoritativo executável do jogo;
- interface e renderização finais;
- IA competitiva e IA de QA;
- conteúdo jogável completo;
- replay e telemetria do motor;
- protótipos visuais aprovados;
- build web jogável;
- publicação em GitHub Pages.

Não confundir **definido no GDD**, **prototipado** e **implementado**.

## Conceito

Características centrais do primeiro protótipo:

- single-player contra IA;
- apresentação 2D top-down;
- mapa inicial de **31 × 17 blocos**;
- até **5 monstros por jogador** simultaneamente;
- Duelista não aparece fisicamente no mapa;
- cada jogador possui uma base física sólida de 1 bloco;
- não existem Life Points tradicionais;
- vitória ao causar **5 impactos válidos** à base adversária;
- movimento baseado em **SPD**;
- Fog of War baseado em **VIS**;
- posições de ATK e DEF;
- Correntes, Cross Chains e efeitos IMEDIATOS;
- Deck de Monstros separado do Deck de Magias/Armadilhas;
- Extra Deck;
- Invocação Normal, Tributo, Ritual e Fusion;
- IA sujeita às mesmas regras e informações disponíveis ao jogador.

## Regras críticas

### Correntes

Uma Corrente somente é aberta quando uma ativação possui **pelo menos um alvo inimigo**.

Ações voltadas apenas para o próprio usuário ou aliados não abrem Corrente isoladamente. Reações defensivas sem alvo inimigo podem integrar uma Corrente inimiga quando forem legalmente provocadas por ela.

Correntes normais resolvem em **LIFO**. Alvos e elementos são revalidados individualmente.

### IMEDIATO

`IMEDIATO` e `IMEDIATAMENTE` são palavras reservadas.

Um efeito IMEDIATO:

- ativa e resolve no mesmo instante;
- não abre Corrente;
- não entra na pilha;
- não recebe elementos entre ativação e resolução;
- não gera efeitos adicionais a partir do resultado;
- continua sujeito às verificações obrigatórias de estado.

### Armadilhas

Setar uma Armadilha:

- não abre Corrente;
- não integra Corrente;
- não consome o custo de ativação.

O custo é pago somente quando a Armadilha é ativada.

## Determinismo e arquitetura

O jogo terá um único núcleo autoritativo.

A simulação opera em **20 Hz**, equivalentes a passos lógicos de **50 ms**. Renderização, interface, animação, IA e telemetria não modificam diretamente o estado autoritativo.

Com os mesmos dados, Decks, seed, comandos, ordem de entrada, configuração e versão das regras, o motor deve produzir os mesmos estados, eventos, hashes e resultado.

Lógica autoritativa usa inteiros ou ponto fixo. Ponto flutuante fica restrito à apresentação.

O contrato inicial do núcleo está documentado em `src/core/README.md`. A tecnologia final do runtime ainda não foi escolhida; isso evita transformar uma decisão provisória em arquitetura definitiva sem validação.

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
- sem Side Deck no primeiro protótipo;
- sem limite universal de mão.

## Invocações do primeiro protótipo

Incluídas:

- Normal;
- Tributo;
- Ritual;
- Fusion.

Fora do primeiro protótipo:

- Synchro;
- Xyz.

Fora da direção atual:

- Pendulum;
- Link.

Regras específicas de materiais, posicionamento, custos e resolução vêm do GDD e não devem ser inferidas das regras oficiais de Yu-Gi-Oh!.

## RACE prioritárias

O primeiro escopo prioriza 17 RACE:

`Aqua`, `Beast`, `Dragon`, `Fairy`, `Fiend`, `Fish`, `Insect`, `Machine`, `Plant`, `Psychic`, `Pyro`, `Rock`, `Spellcaster`, `Thunder`, `Warrior`, `Winged Beast` e `Zombie`.

Outras RACE ficam fora do escopo inicial até decisão posterior.

## Estrutura do repositório

```text
YGO-Impact/
├── docs/
│   ├── context/          # referência do GDD, decisões, contratos e contexto
│   └── prototypes/       # registros de experimentos e aprovações
├── prototypes/           # protótipos executáveis/visuais
├── src/
│   └── core/             # contrato do núcleo autoritativo
├── tests/                # testes automatizados
├── scripts/              # ferramentas e seleção de coleta
├── assets-local/         # artes selecionadas + manifesto versionados
└── .github/
    └── workflows/        # CI, sincronização de artes e, futuramente, Pages
```

Pastas sem utilidade imediata não são criadas apenas para preencher a árvore. `public/`, relatórios, artefatos e demais diretórios surgirão quando houver consumidores reais.

## GDD e fonte de verdade

Antes de implementar ou modificar regras, consulte o GDD canônico identificado em `docs/context/GDD_SOURCE.md`. Enquanto a cópia binária exata não estiver versionada, nenhuma documentação resumida do repositório substitui o arquivo canônico fornecido pelo autor.

Em conflito, a precedência é:

1. instrução explícita atual do autor;
2. correções expressas mais recentes;
3. regras de precedência do GDD;
4. regra específica do GDD;
5. regra geral do GDD;
6. decisões arquiteturais versionadas;
7. testes de regressão aprovados;
8. implementação existente;
9. convenções técnicas.

Não preencher lacunas com regras oficiais de Yu-Gi-Oh! nem inventar custos, limites ou interações.

## Prototipagem visual

Toda decisão visual relevante precisa de validação antes da implementação definitiva.

Quando ainda não houver solução aprovada, devem ser comparadas **três opções: A, B e C**.

Aparência pode usar protótipo estático. Interação, movimento, timing, Correntes, animação, Fog of War, densidade de informação e feedback exigem protótipo executável.

O primeiro experimento já está disponível:

```text
prototypes/visual-001-hud-layout/index.html
```

Ele compara três composições do campo/HUD sob o mesmo cenário de densidade. **Nenhuma opção está aprovada ainda.** O registro e os critérios estão em `docs/prototypes/VIS-001-hud-layout.md`.

## Artes das cartas

O projeto pessoal utiliza ilustrações oficiais de cartas.

O jogo não deve fazer hotlink durante a execução. As artes são baixadas previamente para `assets-local/card-art/`. Por decisão explícita atual do autor, as artes selecionadas e o `manifest.json` gerado pelo downloader podem ser versionados no repositório.

O downloader utiliza o campo `image_url_cropped` da API do YGOPRODeck, que fornece a ilustração separada da moldura e do texto da carta montada.

### Downloader

Ferramenta: `scripts/baixar_artes.py`

Características já implementadas:

- nomes exatos e IDs;
- arquivo de seleção;
- filtro pelas 17 RACE prioritárias;
- Monstros compatíveis, Ritual, Fusion, Magias e Armadilhas;
- exclusão de Synchro, Xyz, Pendulum e Link;
- artes alternativas com `--all-artworks`;
- dry-run;
- retomada por arquivos existentes;
- deduplicação por carta/arte;
- gravação temporária `.part` seguida de substituição atômica;
- manifesto com hash SHA-256;
- organização por categoria/RACE/tipo;
- filtro pré-2010 opcional;
- somente biblioteca padrão do Python.

A seleção oficial versionada para sincronização fica em:

```text
scripts/card_art_targets.txt
```

Dry-run por nomes:

```bash
python scripts/baixar_artes.py \
  --name "Dark Magician" \
  --name "Blue-Eyes White Dragon" \
  --dry-run
```

Por ID:

```bash
python scripts/baixar_artes.py --id 46986414 --dry-run
```

Por arquivo versionado:

```bash
python scripts/baixar_artes.py \
  --input scripts/card_art_targets.txt \
  --dry-run
```

Uma RACE prioritária:

```bash
python scripts/baixar_artes.py --race Dragon --dry-run
```

Todo o acervo compatível, somente quando solicitado explicitamente:

```bash
python scripts/baixar_artes.py --all-compatible --dry-run
```

Artes alternativas:

```bash
python scripts/baixar_artes.py \
  --name "Dark Magician" \
  --all-artworks \
  --dry-run
```

Filtro pré-2010 opcional:

```bash
python scripts/baixar_artes.py --all-compatible --pre-2010 --dry-run
```

Saída padrão:

```text
assets-local/card-art/
```

O workflow `.github/workflows/sync-card-art.yml` executa a seleção versionada e commita as artes/manifesto quando houver alterações.

## Testes

A suíte atual cobre o downloader de artes e suas regras de escopo.

Execute:

```bash
python -m unittest discover -s tests -p "test_*.py" -v
```

Também é possível verificar a sintaxe diretamente:

```bash
python -m py_compile scripts/baixar_artes.py
```

O workflow `.github/workflows/ci.yml` executa essas verificações em push e pull request.

A suíte completa do jogo ainda será construída junto com o núcleo autoritativo e deverá cobrir unidade, integração, propriedades, invariantes, conteúdo, determinismo, replay, regressão, testes metamórficos, diferenciais, fuzzing, self-play, smoke e endurance.

## Como executar o jogo

**Ainda não aplicável.**

Não existe build jogável nem protótipo de gameplay versionado neste momento.

## Como abrir protótipos

Abra `prototypes/visual-001-hud-layout/index.html` em um navegador moderno. O VIS-001 não possui dependências nem build.

Protótipos interativos de timing, movimento, Correntes e Fog of War serão separados, pois a aprovação de aparência do VIS-001 não valida comportamento.

## Build e GitHub Pages

A build web planejada será estática, reproduzível, sem segredos e sem backend privado obrigatório.

A publicação só poderá ocorrer depois de validação de conteúdo, tipos, testes, build e smoke test.

**Ainda não existe versão publicada em GitHub Pages.**

## IA, telemetria e replay

O GDD já define os contratos para:

- IA competitiva sujeita à mesma informação do jogador;
- IA de QA separada da IA competitiva;
- self-play headless usando o mesmo núcleo;
- telemetria estruturada com seed, causalidade e hashes;
- replay determinístico por dados, seed e comandos;
- minimização, deduplicação e regressão permanente de bugs.

Esses sistemas ainda não estão implementados.

## Objetivo técnico

O objetivo final é construir um protótipo que seja:

- fiel ao GDD;
- determinístico;
- testável;
- reproduzível;
- orientado por dados;
- visualmente validado;
- jogável contra IA;
- capaz de IA vs. IA;
- capaz de self-play headless;
- equipado com telemetria e replay;
- protegido por testes de regressão;
- capaz de caça automatizada a bugs;
- publicável de forma reproduzível no GitHub Pages.

## Aviso

Monster Impact é um projeto pessoal, não comercial e não oficial.

Yu-Gi-Oh! e seus personagens, cartas, nomes e artes pertencem aos respectivos detentores de direitos. Este projeto não possui afiliação oficial com a Konami.
