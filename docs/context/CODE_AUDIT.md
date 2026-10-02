# CODE_AUDIT — Auditoria Técnica Integral do Repositório Monster Impact

**Status:** Documento normativo de auditoria do repositório  
**Data:** 2026-10-01  
**Diretiva do autor:** Auditoria completa e transparente de todo o repositório antes de implementar qualquer nova funcionalidade.  
**Fontes canônicas de referência:** `Monster_Impact_GDD_v0.43.docx` (SHA-256: `6e40f214...`), `PROMPT_MESTRE.txt`, decisões versionadas (DEC-001 a DEC-004) e ADR-001.  
**Diretriz de Escopo Vigente:** Primeiro conteúdo jogável baseado exclusivamente em **Monstros Normais**. Magias, Armadilhas, Monstros de Efeito e Fusão permanecem como `BLOCKED_BY_CONTENT_DESIGN` até definição autoral dos efeitos.  

---

## 1. Escopo e Metodologia da Auditoria

A presente auditoria cobriu 100% dos seguintes componentes do repositório:
- `src/`: Núcleo autoritativo TypeScript (36 arquivos de lógica, 0 dependências externas de runtime).
- `tests/`: 36 suítes de teste TypeScript (`tests/core/`, 239 testes) e 5 suítes Python (`tests/`, 34 testes).
- `scripts/`: Ferramentas de download, sincronização de pool, extração de metadados e verificação de fontes.
- `.github/workflows/`: Workflows de automação (`ci.yml`, `sync-card-art.yml`).
- `docs/context/`: GDD, decisões (DEC-001 a 004), ROADMAP, README, ADR-001, proposta v0.44 e fontes canônicas.
- Configurações de build/test: `package.json`, `tsconfig.json`, `.gitattributes`.
- Sistemas centrais do motor: Replay, Telemetria, Determinismo, Headless, IA, Conteúdo.
- Protótipos: Análise arquitetural de `prototypes/` para detectar duplicação ou vazamento de lógica para o núcleo.

---

## 2. Inventário de Problemas Identificados (Schema Canônico)

### ISSUE-001: Falha de Verificação no CI do Runner Linux por Diferença de Quebra de Linha
```text
ID: ISSUE-001
prioridade: P0
arquivo: scripts/verify_context_sources.py
linhas: 22-26
problema: O script validava PROMPT_MESTRE.txt exigindo exclusivamente o tamanho (37.225 bytes) e SHA-256 gerados pelo checkout Windows com core.autocrlf (CRLF). No runner Linux do GitHub Actions (ubuntu-latest), o Git armazena e extrai o arquivo como LF (35.829 bytes, SHA-256 431f7e0a...), causando quebra imediata do job de CI no GitHub.
impacto: CI vermelho no GitHub remoto, impedindo validação automatizada e bloqueando a integridade da pipeline de pull requests e merges.
regra do GDD relacionada: Seção 18 (Arquitetura e Testabilidade) e GDD_SOURCE.md (integridade das fontes canônicas).
cobertura atual: Testado no CI pelo job python-tools.
correção recomendada: Atualizar verify_context_sources.py para aceitar tanto a representação canônica do Git blob (LF) quanto a representação convertida (CRLF), formalizando ambos os valores no GDD_SOURCE.md e garantindo invariância de plataforma via .gitattributes.
```

### ISSUE-002: Corrupção por Caractere de Controle BEL (`\x07`) em Documentos de Contexto
```text
ID: ISSUE-002
prioridade: P0
arquivo: docs/context/DEC-001-initial-card-pool.md e docs/context/ROADMAP.md
linhas: DEC-001:12; ROADMAP:90
problema: A string r'\assets-local' foi processada em script Python sem escape ou prefixo raw (string literal '\assets-local'), interpretando '\a' como caractere ASCII de controle BEL (0x07). Isso gerou a string corrompida '\x07ssets-local/card-art/' commitada no repositório.
impacto: Corrupção de bytes na documentação versionada, falha de renderização de links markdown e quebra de scripts que buscam o caminho padrão de assets.
regra do GDD relacionada: Diretriz de Precisão e Integridade Documental do PROMPT_MESTRE.txt.
cobertura atual: Nenhuma verificação automatizada de caracteres de controle em arquivos markdown.
correção recomendada: Substituir em nível de bytes '\x07ssets-local/card-art/' por '`assets-local/card-art/`' e auditar todos os arquivos .md do repositório para assegurar ausência total de bytes de controle.
```

### NORMAL_MONSTER_CONTENT_BASELINE: Baseline de Conteúdo Canônico para 20 Monstros Normais — CONCLUÍDO
```text
ID: NORMAL_MONSTER_CONTENT_BASELINE
prioridade: P1 (Resolvido)
arquivo: src/core/content.ts, src/core/tribute.ts, src/core/summon.ts, src/core/monster.ts, assets-local/card-art/Monstros/
linhas: content.ts: PROTOTYPE_NORMAL_MONSTERS (20 monstros)
resolução: Micro-roster de 20 Monstros Normais implementado e validado em 3 camadas (Base GDD, Autoral e Bônus Racial). Cobrem todas as 17 priority races (1 a 2 por raça) e integram 11 de alto nível (Nv 5–6) e 9 de baixo nível (Nv 1–4). Exatamente 50% (10 cartas) possuem Keywords em suas descrições (2 cartas com 2 Keywords, 8 cartas com 1 Keyword) e 10 cartas são estritamente vanilla.
mecânica de invocação: Invocação por Tributo estendida e validada para Monstros Normais de Nível 5+, enquanto Invocação Normal direta aplica-se a Nível 1–4.
cobertura: Suíte completa em tests/core/content.test.mjs, tests/core/summon.test.mjs e tests/core/tribute.test.mjs (100% verde).
```

### ISSUE-004: Ausência de Terreno e Custos Variáveis de SPD no Movimento
```text
ID: ISSUE-004
prioridade: P1
arquivo: src/core/movement.ts e src/core/spatial.ts
linhas: movement.ts:81-92; spatial.ts:18-35
problema: O método resolveBasicMovement deduz fixamente 1 ponto de SPD por bloco ortogonal percorrido. Não existe matriz de terreno no estado autoritativo (SpatialState), nem diferenciação entre terreno plano, difícil (custo extra de SPD), intransponível ou efeitos de Magia de Campo.
impacto: O jogo ignora a geografia tática do mapa 31 x 17; posicionamento tático e custo diferenciado por relevo (essenciais ao gênero Fire Emblem / tático) não existem na simulação atual.
regra do GDD relacionada: Grupo 6 do GDD v0.43 (Mapa, movimento, colisão, terreno e Fog of War, P243, P1211).
cobertura atual: movement.test.mjs testa apenas caminhos com custo unitário de 1 SPD por passo.
correção recomendada: Adicionar matriz de terreno em SpatialState, tipar terrenos (plano, difícil, intransponível) e calcular o consumo de SPD por passo baseado no bloco de destino.
```

### ISSUE-006: Game Loop Headless Fechado (Simulador de Partida Completa) — RESOLVIDO
```text
ID: ISSUE-006
prioridade: P1 (RESOLVIDO)
arquivo: src/core/headless.ts, tests/core/headless.test.mjs
linhas: src/core/headless.ts:1-640, tests/core/headless.test.mjs:1-120
problema: Não existia runner capaz de inicializar dois Decks, executar a preparação conjunta, transicionar as 5 fases automaticamente e simular uma partida inteira do início ao fim (vitória por 5 impactos ou Deck Out).
impacto: Sanado integralmente. O simulador headless executa partidas completas, avança passos de forma autoritativa, grava ReplayFile e valida 100% de paridade lógica bit-a-bit via verifyReplay.
regra do GDD relacionada: Visão Geral / P32, Seção 18 (Arquitetura e Testabilidade).
cobertura atual: 4 testes em tests/core/headless.test.mjs cobrindo vitória por 5 impactos de base, deck out simples por assimetria, simultaneous deck out, determinismo idêntico entre seeds e verificação de replay sem divergência.
correção implementada: Desenvolvido src/core/headless.ts (HeadlessPolicy, createPassivePolicy, createAggressivePolicy, runHeadlessMatch) e re-exportado em src/core/index.ts.
```

### ISSUE-007: Inexistência de IA Adversária de Gameplay
```text
ID: ISSUE-007
prioridade: P1
arquivo: src/ai/ (diretório totalmente inexistente)
linhas: N/A
problema: Não existe nenhuma linha de código de Inteligência Artificial no repositório. O GDD exige que o primeiro escopo entregue 1 adversário de IA jogando pelas mesmas regras públicas que o humano e respeitando o Fog of War.
impacto: O jogo não possui o modo single-player contra IA previsto no escopo fundamental do GDD.
regra do GDD relacionada: P80 ("Primeiro escopo: 1 mapa, 2 decks e 1 adversário de IA"), P1064 (IA de jogo vs IA de QA).
cobertura atual: Zero testes ou código de IA.
correção recomendada: Criar módulo src/ai/ com árvore de decisão determinística baseline que consuma PlayerInformationView (informação justa) e envie comandos válidos pela fila pública.
```

### ISSUE-003: Ativação e Resolução de Magias e Armadilhas em Jogo
```text
ID: ISSUE-003
prioridade: BLOCKED_BY_CONTENT_DESIGN
arquivo: src/core/engine.ts, src/core/chain.ts, src/core/activation.ts
linhas: engine.ts:498-1250; chain.ts:8-16
problema: O motor possui roteamento formal e pilha LIFO, mas Magias e Armadilhas não possuem efeitos de jogo definidos pelo autor. O código não deve inventar efeitos nem adaptar automaticamente regras oficiais de Yu-Gi-Oh!.
impacto: Cartas de suporte permanecem bloqueadas até que o autor especifique os textos e mecânicas adaptadas de cada carta.
regra do GDD relacionada: Seção 14 (Magias e Armadilhas) e Seção 15 (Correntes).
cobertura atual: Testes isolados de infraestrutura em activation.test.mjs e chain.test.mjs.
correção recomendada: Manter congelado até que o autor defina as regras e efeitos do primeiro lote de Magias e Armadilhas.
```

### ISSUE-005: Invocação Fusão (Fusion Summon)
```text
ID: ISSUE-005
prioridade: BLOCKED_BY_CONTENT_DESIGN
arquivo: src/core/ (módulo inexistente src/core/fusion.ts), src/core/engine.ts, src/core/content.ts
linhas: engine.ts:625-740; content.ts:25-30
problema: A Invocação Fusão depende de procedimentos canônicos, Magias de Fusão e pares de monstros materiais que ainda não foram definidos e aprovados pelo autor.
impacto: Mecânica congelada até definição autoral dos monstros de Fusão e de seus materiais.
regra do GDD relacionada: Seção de Invocações Especiais / P1002.
cobertura atual: Zero.
correção recomendada: Manter congelado até definição de conteúdo pelo autor; não implementar procedimentos ad-hoc.
```

### ISSUE-008: Catálogo de Conteúdo Restrito Exclusivamente a Monstros
```text
ID: ISSUE-008
prioridade: P2
arquivo: src/core/content.ts
linhas: 25-30
problema: A interface MonsterCatalog valida e cataloga apenas MonsterDefinition. Não existem tipos nem estruturas de dados para Magias (SpellDefinition) ou Armadilhas (TrapDefinition). Os procedimentos de Ritual (ritualProcedures) foram adicionados como propriedade opcional ad-hoc, em vez de integrar um catálogo unificado de conteúdo.
impacto: O catálogo canônico do motor não valida o conjunto completo de 88 (ou 40) cartas do protótipo, limitando a validação apenas ao Deck de Monstros.
regra do GDD relacionada: P77 (Meta inicial de 88 cartas com Monstros, Magias e Armadilhas), P1176 (Versionamento e hash canônico de conteúdo).
cobertura atual: content.test.mjs valida apenas definições de monstro e compatibilidade com DeckConfiguration.
correção recomendada: Evoluir MonsterCatalog para ContentCatalog unificado quando o conteúdo de feitiços/armadilhas for liberado pelo autor.
```

### ISSUE-009: Desalinhamento da Documentação de Protótipos Visuais em ROADMAP.md
```text
ID: ISSUE-009
prioridade: P2
arquivo: docs/context/ROADMAP.md
linhas: 68-86; 120-130
problema: O ROADMAP.md mantinha VIS-007 e VIS-008 com status "EM AVALIAÇÃO PELO AUTOR" e colocava experimentos de câmera e ambiente na ordem recomendada de próximas entregas, contrariando a diretiva expressa do autor de suspensão indefinida de protótipos visuais e foco exclusivo no código do jogo funcional.
impacto: Desorientação de prioridade; gera a falsa impressão de que a frente visual ainda está ativa e consome ciclos em gráficos 2D/3D em vez do núcleo.
regra do GDD relacionada: Diretriz Autoral de 2026-10-01 (Precedência nível 1).
cobertura atual: Documental.
correção recomendada: Atualizar o ROADMAP.md formalizando que toda a frente visual está SUSPENSA POR TEMPO INDETERMINADO, registrando VIS-ENV-001 como câmera aprovada e efeitos rejeitados/suspensos, e alinhando as próximas entregas exclusivamente aos marcos do motor. (SANADO LOCALMENTE).
```

### ISSUE-010: Scripts Concorrentes com Lógica de Seleção Redundante
```text
ID: ISSUE-010
prioridade: P2
arquivo: scripts/sync_prototype_pool.py e scripts/sync_prototype_pool_curated.py
linhas: scripts/sync_prototype_pool.py:1-120; scripts/sync_prototype_pool_curated.py:1-150
problema: O repositório mantém dois scripts concorrentes de sincronização de pool que realizam requisições e montam seleções com lógicas divergentes de catálogo.
impacto: Risco de derivação e confusão sobre qual script deve ser mantido ou acionado por ferramentas e CI.
regra do GDD relacionada: Manutenibilidade e integridade de tooling do PROMPT_MESTRE.txt.
cobertura atual: tests/test_sync_prototype_pool.py testa apenas sync_prototype_pool.py.
correção recomendada: Consolidar a lógica no script curado oficial e documentar a depreciação ou remoção do script redundante.
```

### ISSUE-011: Inexistência de Workflow de Publicação para GitHub Pages
```text
ID: ISSUE-011
prioridade: P3
arquivo: .github/workflows/
linhas: N/A
problema: O repositório contém apenas ci.yml e sync-card-art.yml. Não existe nenhum workflow para compilar e publicar a versão jogável no GitHub Pages.
impacto: A build jogável não pode ser disponibilizada publicamente via Pages até que a pipeline seja estruturada.
regra do GDD relacionada: P25 ("Disponível em uma versão jogável pelo GitHub Pages").
cobertura atual: Inexistente.
correção recomendada: Desenvolver .github/workflows/deploy-pages.yml quando o marco de integração da build web jogável for aprovado pelo autor.
```

### ISSUE-012: Ausência de Testes de Fuzzing e Invariantes de Longa Duração
```text
ID: ISSUE-012
prioridade: P3
arquivo: tests/core/
linhas: N/A
problema: Todas as 239 asserções de teste em tests/core/ cobrem microcenários determinísticos curtos (1 a 10 passos). Não existem testes de estresse pseudoaleatório (fuzzing) rodando 1.000 a 10.000 passos para assegurar conservação estrita de cartas, invariantes espaciais e ausência de vazamento de estado.
impacto: Casos de borda de concorrência ou mutações sutis em sequências complexas podem passar despercebidos pelos testes pontuais.
regra do GDD relacionada: Seção 18 (Arquitetura, Simulação e Testabilidade).
cobertura atual: 0 testes de fuzzing.
correção recomendada: Implementar suíte de testes de estresse / property testing com sequências aleatórias auditáveis por seed em tests/core/fuzz.test.mjs.
```

---

## 3. Matriz de Priorização Real Reclassificada

### Prioridade P0 (Integridade e Baseline) — CORRIGIDOS
1. `ISSUE-001`: Correção definitiva de `verify_context_sources.py` e `.gitattributes` para CI verde cross-platform.
2. `ISSUE-002`: Eliminação total do byte `\x07` de `DEC-001` e `ROADMAP.md`.
3. `NORMAL_MONSTER_CONTENT_BASELINE`: Micro-roster canônico de 20 Monstros Normais (todas as 17 raças, 11 Nv 5+, 10 com Keywords, 10 vanillas, Tributo para Nv 5+).
4. `ISSUE-006`: Game Loop Headless Fechado (`src/core/headless.ts` + `tests/core/headless.test.mjs`, simulador de partida completa de ponta a ponta com replay verificado bit-a-bit).

### Prioridade P1 (Próximos Passos do Jogo Funcional)
1. Integração das Keywords Aprovadas: Implementar individualmente as Keywords do lote com testes de regressão.
2. `ISSUE-004` (Terreno e Custo de SPD): Movimento contínuo e geografia tática.
3. `ISSUE-007` (IA Adversária): IA consumindo o core jogável com informação justa.

### Bloqueado por Definição de Conteúdo (`BLOCKED_BY_CONTENT_DESIGN`)
- `ISSUE-003` (Magias e Armadilhas)
- `ISSUE-005` (Invocação Fusão)
- Monstros de Efeito e procedimentos de Ritual dependentes de cartas/efeitos.

### Prioridade P2 / P3 (Governança e Tooling)
- `ISSUE-008`: Catálogo unificado de conteúdo.
- `ISSUE-009`: Alinhamento documental de protótipos em `ROADMAP.md` (Sanado localmente).
- `ISSUE-010`: Consolidação de scripts de pool.
- `ISSUE-011`: Pipeline de GitHub Pages.
- `ISSUE-012`: Fuzzing e endurance tests.

---

## 4. Ordem Real de Implementação

```text
1. [CONCLUÍDO] Aprovação do micro-roster de 20 Monstros Normais pelo autor.
2. [CONCLUÍDO] Registro estruturado do conteúdo canônico dos Normais (content.ts + assets-local).
3. [CONCLUÍDO] Criação de harness headless com 5 fases, 5 impactos, deck out e replay bit-a-bit (ISSUE-006).
4. Implementação pontual das Keywords aprovadas no motor (com testes dedicados).
5. Terreno e SPD contínuo (ISSUE-004).
6. IA adversária inicial operando sob a fila pública (ISSUE-007).
7. Somente após essa base funcional: desbloqueio e implementação de Magias/Armadilhas/Efeito/Fusão definidos pelo autor.
```
