# Monster Impact

> **YGO Impact / Monster Impact** é um fangame pessoal e não comercial de Yu-Gi-Oh! que adapta cartas oficiais para um sistema próprio de combate tático 2D top-down.

O projeto combina estratégia em tempo real, RPG tático, deckbuilding, movimentação espacial e interações por Correntes. A referência de legibilidade do campo é a série **Fire Emblem de GBA**, sem obrigação de reproduzir sua direção de arte ou utilizar pixel art.

Monster Impact **não tenta reproduzir automaticamente as regras tradicionais de Yu-Gi-Oh!**. Cartas, efeitos, Invocações e conceitos são reinterpretados para um sistema próprio, mantendo a identidade dos monstros e das cartas quando isso for compatível com gameplay, balanceamento e clareza.

## Estado do projeto

**Fase atual: pré-implementação / estruturação do primeiro protótipo.**

O GDD-base do primeiro protótipo está concluído em sua versão **0.42**, com **25 de 25 fases finalizadas e nenhuma pendência P0 ativa**.

O repositório, porém, ainda está no início da implementação. Neste momento:

- o GDD e as decisões de projeto estão definidos;
- a arquitetura autoritativa e os requisitos de determinismo estão especificados;
- o escopo de prototipagem visual está definido;
- os requisitos de IA, telemetria, replay, self-play e QA estão definidos;
- o código do jogo ainda não está versionado neste repositório;
- ainda não há suíte de testes versionada;
- ainda não há build jogável;
- ainda não há GitHub Pages publicado;
- os protótipos visuais ainda precisam ser produzidos e aprovados;
- o downloader de artes existente ainda precisa ser adaptado ao contrato atual antes de ser incorporado ao repositório.

Não confundir **definido no GDD** com **implementado**.

## Conceito

Monster Impact é um jogo tático de estratégia e ação utilizando monstros de Yu-Gi-Oh! em um campo espacial.

Características centrais do primeiro protótipo:

- single-player contra IA;
- apresentação 2D top-down;
- mapa inicial de **31 × 17 blocos**;
- até **5 monstros por jogador** simultaneamente;
- Duelista não aparece fisicamente no mapa;
- cada jogador possui uma base física de 1 bloco;
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

## Regras fundamentais

### Correntes

Uma Corrente somente é aberta quando uma ativação possui **pelo menos um alvo inimigo**.

A existência de uma Ação, Reação, custo, movimento, carta ou habilidade não é suficiente por si só.

Ações voltadas apenas para o próprio usuário ou aliados normalmente resolvem diretamente.

Uma Reação defensiva sem alvo inimigo pode integrar uma Corrente inimiga que a provocou quando for legal, mas não abre uma Corrente isoladamente.

Correntes normais resolvem em **LIFO**.

### IMEDIATO

`IMEDIATO` e `IMEDIATAMENTE` são palavras reservadas.

Um efeito IMEDIATO:

- ativa e resolve atomicamente;
- não abre Corrente;
- não entra na pilha;
- não recebe elementos entre ativação e resolução;
- não gera efeitos adicionais a partir de seu resultado;
- ainda aplica verificações obrigatórias de estado.

### Armadilhas

Setar uma Armadilha:

- não abre Corrente;
- não consome Ação ou Reação;
- não paga custo de ativação.

O custo correspondente é pago somente quando a Armadilha é ativada.

### Determinismo

A lógica do jogo será executada por um único núcleo autoritativo.

A simulação opera em **20 Hz**, equivalentes a passos lógicos de **50 ms**.

Interface, renderização, animação, IA e telemetria não modificam diretamente o estado do jogo.

Com os mesmos:

- dados;
- Decks;
- seed;
- comandos;
- ordem de entrada;
- configuração;
- versão das regras;

o motor deve produzir os mesmos estados, eventos, hashes e resultado.

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

Regras específicas de materiais, posicionamento, custos e resolução são definidas pelo GDD e não devem ser inferidas das regras oficiais de Yu-Gi-Oh!.

## RACE prioritárias

O primeiro escopo prioriza 17 RACE:

`Aqua`, `Beast`, `Dragon`, `Fairy`, `Fiend`, `Fish`, `Insect`, `Machine`, `Plant`, `Psychic`, `Pyro`, `Rock`, `Spellcaster`, `Thunder`, `Warrior`, `Winged Beast` e `Zombie`.

Cada RACE possui bônus estruturais e uma identidade mecânica própria definida pelo GDD.

Outras RACE ficam fora do escopo inicial até decisão posterior.

## Arquitetura planejada

A estrutura prevista para o projeto é:

```text
YGO-Impact/
├── docs/
│   ├── context/          # GDD, decisões e contratos
│   └── prototypes/       # experimentos e aprovações visuais
├── prototypes/           # protótipos executáveis
├── src/                  # implementação do jogo
├── tests/                # testes e regressões
├── scripts/              # ferramentas e downloader
├── assets-local/         # artes e arquivos locais não versionados
├── public/               # assets da build web, quando aplicável
├── reports/              # relatórios e evidências temporárias
└── .github/
    └── workflows/        # CI, testes, build e Pages
```

Esses diretórios representam a arquitetura planejada. Eles só devem ser criados quando tiverem utilidade real.

## Prototipagem visual

Decisões visuais relevantes precisam ser validadas antes da implementação definitiva.

Quando ainda não existir uma solução aprovada, devem ser apresentadas **três opções comparáveis: A, B e C**.

Aparência puramente estática pode ser avaliada com protótipos estáticos.

Interação, movimento, timing, Correntes, animação, Fog of War e outros comportamentos precisam de protótipos executáveis.

As decisões e evidências serão registradas em `docs/prototypes/`.

## IA

Existirão duas funções distintas.

### IA competitiva

É o adversário normal.

Ela:

- utiliza as mesmas regras do jogador;
- não recebe bônus artificiais;
- respeita Fog of War;
- não conhece cartas ocultas;
- não conhece posições atualmente invisíveis;
- não conhece a distribuição secreta de Ações/Reações;
- não conhece resultados aleatórios futuros;
- envia comandos pela mesma interface pública usada pelo jogador.

### IA de QA

É separada da IA competitiva e busca falhas através de:

- self-play;
- políticas variadas;
- exploração de estados raros;
- testes de invariantes;
- fuzzing isolado;
- testes metamórficos;
- testes diferenciais;
- minimização e deduplicação de bugs;
- geração de regressões.

## Telemetria e replay

A telemetria técnica será local e estruturada.

Entre os dados previstos estão:

- seed;
- passo lógico;
- comandos;
- custos;
- alvos;
- causalidade;
- Correntes;
- Cross Chains;
- aleatoriedade;
- hashes de estado;
- invariantes.

Replays serão baseados em dados, seed e comandos, e deverão reproduzir os mesmos hashes da execução original.

## Artes das cartas

O projeto pessoal utiliza ilustrações oficiais de cartas.

As artes devem ser baixadas previamente e armazenadas localmente; o jogo não deve fazer hotlink durante a execução.

A fonte prevista é o campo `image_url_cropped` da API do YGOPRODeck, que fornece a ilustração da carta separada da moldura, nome, atributos e texto da carta montada.

### Downloader

Existe atualmente um script experimental de downloader, mas ele **ainda não representa o contrato final do projeto e ainda não está versionado neste repositório**.

A versão final deverá, entre outros requisitos:

- aceitar nomes exatos ou IDs;
- aceitar artes alternativas;
- suportar dry-run;
- retomar downloads;
- evitar duplicatas;
- usar arquivos temporários antes de substituir o destino;
- organizar conteúdo por categoria/RACE/tipo;
- excluir Synchro, Xyz, Pendulum e Link;
- tornar o filtro pré-2010 opcional, e não obrigatório.

Até esse script ser incorporado ao repositório, não existe um comando oficial de downloader.

## Como executar

**Ainda não aplicável.**

Não existe neste repositório uma build executável ou protótipo versionado neste momento.

Esta seção será atualizada assim que o primeiro protótipo executável for incorporado.

## Como executar os testes

**Ainda não aplicável.**

A arquitetura prevê testes de:

- unidade;
- integração;
- propriedades;
- invariantes;
- conteúdo;
- determinismo;
- replay;
- regressão;
- metamórficos;
- diferenciais;
- fuzzing;
- self-play;
- smoke;
- endurance.

Nenhuma suíte está versionada no repositório ainda.

## Como abrir os protótipos

**Ainda não aplicável.**

Protótipos executáveis serão mantidos em `prototypes/`, enquanto seus objetivos, evidências, comparações A/B/C e aprovações serão registrados em `docs/prototypes/`.

## Como gerar a build

**Ainda não aplicável.**

A build web planejada será:

- estática;
- reproduzível;
- sem segredos;
- sem backend privado obrigatório;
- compatível com GitHub Pages.

A publicação só poderá ocorrer depois que validações, testes, build e smoke tests forem aprovados.

## GitHub Pages

O objetivo é disponibilizar uma versão jogável no GitHub Pages utilizando o mesmo núcleo autoritativo da execução local ou demonstrando equivalência lógica através dos mesmos dados, seeds, comandos, eventos e hashes.

**Ainda não há versão publicada.**

## Fonte de verdade

Quando houver conflito entre implementação, testes e documentação, não assuma que o código existente está correto.

A precedência é, de forma resumida:

1. instrução explícita mais recente do autor;
2. correções mais recentes;
3. GDD e suas regras de precedência;
4. decisões específicas;
5. decisões gerais;
6. decisões arquiteturais;
7. testes aprovados;
8. implementação existente.

O conhecimento das regras oficiais de Yu-Gi-Oh! não deve ser usado para preencher lacunas automaticamente.

## Objetivo técnico

O objetivo final é construir um protótipo de Monster Impact que seja:

- jogável;
- fiel ao GDD;
- determinístico;
- testável;
- reproduzível;
- orientado por dados;
- visualmente validado;
- jogável contra IA;
- capaz de IA vs. IA;
- capaz de self-play headless;
- equipado com telemetria;
- equipado com replay;
- protegido por testes de regressão;
- capaz de caça automatizada a bugs;
- publicável de forma reproduzível no GitHub Pages.

## Aviso

Monster Impact é um projeto pessoal, não comercial e não oficial.

Yu-Gi-Oh! e seus personagens, cartas, nomes e artes pertencem aos respectivos detentores de direitos. Este projeto não possui afiliação oficial com a Konami.
