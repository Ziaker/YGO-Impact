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

### ISSUE-004: Terreno e Movimento Contínuo com Custo Real de SPD — RESOLVIDO
```text
ID: ISSUE-004
prioridade: P1 (RESOLVIDO)
arquivo: src/core/terrain.ts, src/core/movement.ts, tests/core/terrain.test.mjs
linhas: src/core/terrain.ts:1-78, src/core/movement.ts:1-196
resolução: Implementada matriz de terreno com suporte a tipos 'plain' (1 SPD), 'rough' (custo variável, padrão 2 SPD) e 'impassable' (infinito). Integrada ao movimento com suporte à travessia aérea da Keyword GLIDER e tratamento de SPD negativo.
cobertura: Suíte completa em tests/core/terrain.test.mjs com 100% de aprovação.
```

### ISSUE-006: Game Loop Headless Fechado (Simulador de Partida Completa) — RESOLVIDO
```text
ID: ISSUE-006
prioridade: P1 (RESOLVIDO)
arquivo: src/core/headless.ts, tests/core/headless.test.mjs
linhas: src/core/headless.ts:1-779, tests/core/headless.test.mjs:1-229
problema: Não existia runner capaz de inicializar dois Decks, executar a preparação conjunta, transicionar as 5 fases automaticamente e simular uma partida inteira do início ao fim (vitória por 5 impactos ou Deck Out).
impacto: Sanado integralmente. O simulador headless executa partidas completas, avança passos de forma autoritativa, grava ReplayFile e valida 100% de paridade lógica bit-a-bit via verifyReplay.
regra do GDD relacionada: Visão Geral / P32, Seção 18 (Arquitetura e Testabilidade).
cobertura atual: Testes em tests/core/headless.test.mjs cobrindo vitória por 5 impactos de base, deck out simples por assimetria, simultaneous deck out, determinismo idêntico entre seeds e verificação de replay sem divergência.
correção implementada: Desenvolvido src/core/headless.ts (HeadlessPolicy, createPassivePolicy, createAggressivePolicy, createTacticalPolicy, runHeadlessMatch) e re-exportado em src/core/index.ts.
```

### ISSUE-007: IA Adversária Inicial de Gameplay (Heurística sob Fog of War) — RESOLVIDO
```text
ID: ISSUE-007
prioridade: P1 (RESOLVIDO)
arquivo: src/core/ai.ts, tests/core/ai.test.mjs
linhas: src/core/ai.ts:1-570, tests/core/ai.test.mjs:1-180
resolução: Implementada IA adversária autoritativa baseada no observador justo createAIObservation sob Fog of War (zero clairvoyance; mão e extra deck do oponente estritamente ocultos, armadilhas veladas e unidades fora de visão excluídas da observação ativa). Avaliador heurístico configurável por perfis (createHeuristicAI, createAggressiveAI, createDefensiveAI, createTacticalAI) com árvore tática de decisões: ataque direto à base, combate vantajoso, feitiços de equipamento, armadilhas veladas, invocação normal e avanço tático por terreno.
cobertura: Suíte completa em tests/core/ai.test.mjs cobrindo respeito estrito à informação justa, prevenção de deck out, vitória por 5 impactos contra política passiva e partidas autônomas completas com 100% de replay determinístico.
```

### ISSUE-003: Ativação e Resolução de Magias e Armadilhas em Jogo — RESOLVIDO
```text
ID: ISSUE-003
prioridade: P1 (RESOLVIDO)
arquivo: src/core/spells-traps.ts, src/core/chain.ts, src/core/engine.ts, tests/core/spells-traps.test.mjs
linhas: src/core/spells-traps.ts:1-272, tests/core/spells-traps.test.mjs:1-250
resolução: Implementado sistema data-oriented de Magias e Armadilhas com suporte a equipamentos (máximo de 3 por monstro, transferência de controle por 1 Ação), 3 slots de armadilhas veladas por jogador (custo 0 de colocação), destruição preventiva de armadilhas veladas e resolução em Corrente (LIFO).
cobertura: Suíte completa em tests/core/spells-traps.test.mjs com 100% de aprovação.
```

### ISSUE-005: Invocação Fusão (Fusion Summon) — RESOLVIDO
```text
ID: ISSUE-005
prioridade: P1 (RESOLVIDO)
arquivo: src/core/fusion.ts, src/core/engine.ts, tests/core/fusion.test.mjs
linhas: src/core/fusion.ts:1-177, tests/core/fusion.test.mjs:1-120
resolução: Implementada Invocação Fusão orientada a dados com procedimentos formais (FusionProcedure), consumo atômico de materiais da mão e/ou campo, envio ao Cemitério, liberação espacial e validação em replay determinístico.
cobertura: Suíte completa em tests/core/fusion.test.mjs com 100% de aprovação.
```

### ISSUE-008: Catálogo Unificado de Conteúdo (ContentCatalog) — RESOLVIDO
```text
ID: ISSUE-008
prioridade: P2 (RESOLVIDO)
arquivo: src/core/content.ts
linhas: 25-35
resolução: MonsterCatalog evoluído para unificar MonsterDefinition, SpellTrapDefinition, RitualProcedure e FusionProcedure, exportando o alias ContentCatalog. O contentHash canônico cobre todas as definições e procedimentos em conjunto.
cobertura: Testado em tests/core/content.test.mjs e tests/core/replay.test.mjs com validação de compatibilidade e contentHash determinístico.
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

### ISSUE-012: Ausência de Testes de Fuzzing e Invariantes de Longa Duração — RESOLVIDO
```text
ID: ISSUE-012
prioridade: P3 (RESOLVIDO)
arquivo: tests/core/fuzz.test.mjs
linhas: 1-225
resolução: Suíte de fuzzing e property-based testing implementada. Cobre conservação estrita de cartas (20 monstros + 15 magias/armadilhas = 35 cartas mantidas atômicas e invariantes ao longo de toda a simulação), integridade espacial (31x17, zero colisão em célula compartilhada, proibição de base e limite de 5 unidades), clamp e limites de HP/SPD, verificação de replay 100% determinístico e fuzzing de comandos malformados/adversariais (com rejeição graciosa e preservação do estado).
cobertura: Suíte completa em tests/core/fuzz.test.mjs com 100% de aprovação.
```

---

## 3. Matriz de Priorização Real Reclassificada

### Prioridade P0 / P1 (Entregas do Jogo Funcional) — CONCLUÍDOS
1. `ISSUE-001`: Correção definitiva de `verify_context_sources.py` e `.gitattributes` para CI verde cross-platform.
2. `ISSUE-002`: Eliminação total do byte `\x07` de `DEC-001` e `ROADMAP.md`.
3. `NORMAL_MONSTER_CONTENT_BASELINE`: Micro-roster canônico de 20 Monstros Normais (todas as 17 raças, 11 Nv 5+, 10 com Keywords, 10 vanillas, Tributo para Nv 5+).
4. `ISSUE-006`: Game Loop Headless Fechado (`src/core/headless.ts` + `tests/core/headless.test.mjs`, simulador de partida completa de ponta a ponta com replay verificado bit-a-bit).
5. `ISSUE-004`: Terreno e Movimento Contínuo com Custo Real de SPD (`src/core/terrain.ts`, `tests/core/terrain.test.mjs`).
6. `ISSUE-003`: Ativação e Resolução de Magias e Armadilhas (`src/core/spells-traps.ts`, `tests/core/spells-traps.test.mjs`).
7. `ISSUE-005`: Invocação Fusão e Ritual integradas (`src/core/fusion.ts`, `src/core/ritual.ts`, `tests/core/fusion.test.mjs`).
8. `ISSUE-007`: IA Adversária Inicial sob Fog of War (`src/core/ai.ts`, `tests/core/ai.test.mjs`).
9. `MARCO_006`: Conexão Web e Build Jogável (`index.html`, `src/web/client.ts`, `src/web/app.ts`, `tests/core/web.test.mjs`).
10. `ISSUE-008`: Catálogo unificado de conteúdo (`ContentCatalog` em `src/core/content.ts`).
11. `ISSUE-012`: Fuzzing e endurance tests (`tests/core/fuzz.test.mjs`).

### Prioridade P2 / P3 (Governança e Tooling)
- `ISSUE-009`: Alinhamento documental de protótipos em `ROADMAP.md` (Sanado localmente).
- `ISSUE-010`: Consolidação de scripts de pool.
- `ISSUE-011`: Pipeline de GitHub Pages (aguardando confirmação do autor).

---

## 4. Ordem Real de Implementação

```text
1. [CONCLUÍDO] Aprovação do micro-roster de 20 Monstros Normais pelo autor.
2. [CONCLUÍDO] Registro estruturado do conteúdo canônico dos Normais (content.ts + assets-local).
3. [CONCLUÍDO] Criação de harness headless com 5 fases, 5 impactos, deck out e replay bit-a-bit (ISSUE-006 / Marco 4).
4. [CONCLUÍDO] Invocações Especiais no Core: Fusão e Ritual orientados a dados (ISSUE-005 / Marco 1).
5. [CONCLUÍDO] Terreno e SPD contínuo: tipos de terreno, custos de SPD e GLIDER (ISSUE-004 / Marco 2).
6. [CONCLUÍDO] Magias e Armadilhas: equipamentos, armadilhas veladas e Correntes (ISSUE-003 / Marco 3).
7. [CONCLUÍDO] IA adversária inicial operando sob Fog of War com informação justa (ISSUE-007 / Marco 5).
8. [CONCLUÍDO] Marco 6: Conexão Web e Build Jogável (humano vs IA no navegador com Fog of War e replay determinístico).
9. [CONCLUÍDO] Fuzzing adversarial e invariantes de longa duração (ISSUE-012).
```
