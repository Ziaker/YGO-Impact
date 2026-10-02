# Roadmap técnico — primeiro protótipo

Este arquivo registra o **estado real do repositório** e a ordem recomendada de evolução. Ele não cria regras novas de gameplay. Em qualquer conflito, o GDD v0.43 e as instruções/correções posteriores do autor prevalecem.

## Convenção de status

- **Definido:** formalizado no GDD, mas não necessariamente implementado.
- **Prototipado:** existe experimento, sem implicar aprovação.
- **Implementado:** existe código funcional no repositório.
- **Testado:** existe cobertura automatizada correspondente.
- **Aprovado:** decisão explicitamente confirmada pelo autor quando o GDD exige aprovação.
- **Publicado:** disponível no canal externo correspondente.

## Estado atual

### Fonte de verdade

- GDD-base v0.43: **Definido / concluído (25/25 fases)**.
- Identidade do arquivo canônico: **Registrada** em `GDD_SOURCE.md` com tamanho e SHA-256.
- Cópia binária .docx no Git: **Presente** em `docs/context/sources/Monster_Impact_GDD_v0.43.docx` (canônica mais recente) e `Monster_Impact_GDD_v0.42.docx` (histórico), com tamanho e SHA-256 conferidos.
- Prompt mestre completo: **Presente** em `docs/context/sources/PROMPT_MESTRE.txt`, preservado como fonte textual do autor.
- Proposta de Emenda Formal v0.44: **Presente** em `docs/context/PROPOSTA_GDD_v0.44_ERA_E_EXCECAO_PSYCHIC.md`, formalizando a exceção de era para a raça Psíquico.

### Núcleo autoritativo (`src/core/`)

- Runtime TypeScript inicial: **Implementado**.
- Passo fixo de 20 Hz / 50 ms: **Implementado no scaffold**.
- Fila pública determinística de comandos: **Implementada e testada**.
- Serialização/hash determinístico inicial: **Implementado e testado**.
- Invariantes espaciais básicas do mapa 31 × 17, bases e ocupação: **Implementadas e testadas**.
- Primeiro turno e distribuição secreta dos oito recursos na Fase de Decisão: **Implementados e testados**.
- Consumo de Ação/Reação na confirmação e encerramento voluntário da participação: **Implementados e testados**.
- Conversão após o fechamento de Correntes e ciclo estrutural das cinco fases: **Implementados e testados**.
- Estado de turno integrado ao hash e comandos de recursos aplicados pela fila autoritativa: **Implementados e testados**.
- Impactos válidos na base, validação espacial/VIS/linha, reposicionamento aleatório auditável no terço aliado e vitória imediata no quinto impacto: **Implementados, integrados ao núcleo e testados**.
- Token de Prioridade, sorteio inicial reproduzível e desempate de quintos impactos simultâneos: **Implementados e testados**.
- Fluxos de RNG derivados e auditáveis com amostragem por rejeição: **Implementados e testados**.
- Sorteio e alternância do Token integrados ao estado autoritativo e ao hash: **Implementados e testados**.
- Movimento básico ortogonal, travessia de aliados, bloqueios e transação conjunta de posição espacial/posição do monstro/SPD: **Implementados, integrados à fila autoritativa e testados**.
- Troca ATK↔DEF por 1 Ação, bloqueio de ações externas para unidades comprometidas e movimento defensivo em Corrente por 1 Reação + SPD: **Implementados, integrados à fila autoritativa e testados**.
- Fórmulas-base de HP/MP e operações distintas de dano, perda, pagamento, recuperação e máximo: **Implementadas e testadas**.
- Estado inicial de monstro, RACE/elementos estruturais e stats: **Implementados e testados**.
- Recuperação de HP/MP na Fase de Apoio: **Integrada ao motor como transição obrigatória única por turno e testada**.
- Destinos e resolução atômica de Invocação Normal por âncora, VIS compartilhada e fallback espacial de até três blocos, incluindo mão, cópia física, catálogo, unidade e mapa: **Implementados, integrados à fila autoritativa e testados**.
- VIS dinâmica compartilhada como união determinística da visão ortogonal dos monstros aliados e do quadrado de raio 5 da base, bloqueada por bases e obstáculos fixos: **Aprovada, implementada e testada**.
- Memória justa de Fog of War por jogador, mantendo última posição conhecida sem acompanhar movimento oculto: **Implementada, integrada ao estado/hash autoritativo e testada; demais elementos dinâmicos ocultos pendentes**.
- Catálogo de conteúdo que valida e liga cartas dos Decks às definições estruturadas de monstro: **Implementado e testado**.
- Configuração completa de jogo com catálogo, bases centrais em extremidades opostas e campo inicialmente vazio: **Integrada ao estado/hash autoritativo e testada**.
- Invocação por Tributo com materiais Normais, soma de níveis, blocos liberados, envio das cópias físicas ao Cemitério e criação da nova unidade: **Implementada, integrada à fila autoritativa e testada**.
- Invocação Ritual com compatibilidade de Magia orientada a dados, materiais da mão/mapa, soma de níveis, Extra Deck, destinos liberados/área Normal e pagamento atômico: **Implementada e testada como domínio; amarração orientada a dados no catálogo de conteúdo e fila pública pendente**.
- Combate básico ATK×ATK, ATK×DEF, alvo indefeso, contra-ataque e vulnerabilidade por stats negativos: **Implementado e testado como domínio isolado; o caso duplo-negativo foi fechado no `DEC-003`**.
- Plano de Ataque Básico com alcance próprio, distância ortogonal, linha, VIS, posição e escolha de contra-ataque: **Implementado, integrado à fila autoritativa e testado**.
- Visões de informação de cartas para humano/IA, com mão e Extra adversários ocultos, contagens públicas e Cemitérios públicos: **Implementadas e testadas**.
- Operações atômicas de zona para retirar cartas da mão, enviar ao Cemitério e impedir duplicação de cópias físicas: **Implementadas e testadas**.
- Transação completa do Ataque Básico confirmado, com janela de prioridade, contra-ataque opcional sem custo universal inventado, revalidação espacial/VIS, HP simultâneo, remoção imediata de mortos, reconstrução da identidade física e envio ao Cemitério de cada proprietário: **Implementada, integrada à fila autoritativa e testada**.
- Causa de encerramento por impactos, Deck Out ou Deck Out simultâneo: **Integrada ao estado/hash e testada**.
- Distância ortogonal, alcance e linha de ataque com bloqueio por cantos tocados: **Implementados e testados**.
- Validação de Decks, mínimo de Normais, tipos e limite global de cópias: **Implementada e testada**.
- Embaralhamento separado, IDs de cópia, mão inicial, compra e Deck Out: **Implementados e testados como domínio isolado**.
- Preparação conjunta dos dois jogadores, validação dos Decks, IDs físicos globais e mão inicial reproduzível: **Implementada, integrada ao hash/replay e testada**.
- Escolha travada das modalidades, resolução conjunta da Fase de Compra e Deck Out simples/simultâneo: **Implementados, integrados ao núcleo e testados**.
- Roteamento de ativações por alvo inimigo e IMEDIATO: **Implementado e testado**.
- Correntes independentes, LIFO, revalidação, NEGAR/FALHAR, limite de Cross Chain, primeira prioridade do oponente, oportunidade final do iniciador, bloqueio de resolução antes do fechamento e movimento defensivo como Reação real: **Implementados e testados; adições genéricas de cartas/habilidades e continuação de Cross Chain ainda pendentes**.
- As 17 RACE prioritárias e seus bônus estruturais cumulativos: **Implementados e testados**.
- Replay autocontido por seed/comandos, Decks, conteúdo, mapa e comparação de hashes por passo: **Implementado e testado**.
- Telemetria local mínima de comandos, rejeições, contexto lógico e hashes: **Implementada e testada**.
- Gameplay completo (custos contínuos de terreno, diagonal/Voo/Teleporte, colisão simultânea, Invocações Especiais completas, execução real de Magias/Armadilhas na Corrente, Fog dinâmico completo, timers, IA): **Pendente**.

### Prototipagem visual (SUSPENSA POR TEMPO INDETERMINADO)

> **DIRETRIZ EXPRESSA DO AUTOR (2026-10-01):** A frente de protótipos visuais está **SUSPENSA por tempo indeterminado**. Fica terminantemente vedado trabalhar em `prototypes/**`, `docs/prototypes/**`, variações A/B/C gráficas, câmera, shaders, partículas, VFX, HUD ou renderizadores. O foco absoluto é construir Monster Impact como **jogo funcional no código (núcleo autoritativo, regras, testes e headless)**.

- `VIS-001 — Composição do campo e HUD principal`: **Aprovado historicamente pelo autor em 2026-09-29 na versão melhorada** (preservado como histórico).
- `VIS-002 — Mapa, orientação 2D/3D e sistema de câmera`: **Aprovado historicamente pelo autor em 2026-09-29** (preservado como histórico).
- `VIS-004 — Terreno, SPD e movimento avançado`: **Aprovado historicamente pelo autor em 2026-09-30 (Opção A)** (preservado como histórico).
- `VIS-006 / VIS-006.1 / VIS-006.2 — Linguagem de Invocações`: **Aprovados historicamente pelo autor em 2026-10-01** (preservados como histórico).
- `VIS-ENV-001 — Câmera 3D e Palco Visual`: **Câmera 3D aprovada e congelada como referência pelo autor ("a câmera está perfeita")**. Efeitos visuais rejeitados/suspensos ("os efeitos estão ruins"). Não reabrir.
- `VIS-007 e VIS-008 — Combate, Destruição e Correntes`: **SUSPENSOS POR TEMPO INDETERMINADO**. Os microprotótipos atômicos NÃO estão em avaliação; a frente foi interrompida para focar exclusivamente no código do jogo funcional.

### Artes e conteúdo

- **Biblioteca Física de Ativos (`assets-local/card-art/`):** **Materializada com 407 artes recortadas (.jpg), 407 sidecars de metadados (.txt) e 92 sidecars de efeito (.effect.txt)**. Todas as 17 RACE prioritárias possuem pelo menos 15 Monstros Normais catalogados com ilustrações limpas e dados oficiais da carta-fonte. Zero arquivos órfãos.
- **Segurança da Biblioteca:** A automação destrutiva de poda no GitHub Actions (`sync-card-art.yml`) foi desativada e eliminada. A biblioteca física é estritamente aditiva e nunca é podada com base em seleções parciais.
- **Candidate Pool / Seleção Curada Auxiliar (DEC-001):** **136 cartas** (Beast, Psychic, Fiend, Spellcaster + Magias e Armadilhas) definido para testes de amostragem e geração de decks.
- **Expansão Pré-2005 de Magias e Armadilhas (DEC-004):** **Definida pelo autor e implementada em scripts** (10 por subtipo com filtro temporal estrito a feitiços e armadilhas).
- **Proposta Formal para GDD v0.44:** Registrada em `PROPOSTA_GDD_v0.44_ERA_E_EXCECAO_PSYCHIC.md`, formalizando a exceção estrutural da era para a raça Psíquico mantendo o banimento de Synchro/Xyz/Pendulum/Link.
- **Escopo Jogável Canônico (GDD v0.43 P77-P80):** Meta de 88 cartas (ou fallback para 40) para o jogo funcional (1 mapa, 2 decks de 20 cartas, 1 IA): **Em estruturação no núcleo**.

### Testes e CI

- Testes Python do downloader e validação de fontes: **Implementados (34/34 passing)**.
- Testes do núcleo TypeScript e invariantes espaciais: **Implementados (239/239 passing)**.
- Typecheck e build do núcleo: **Implementados e passando no CI**.
- `.github/workflows/ci.yml`: Valida compilação TypeScript, testes unitários e integridade de fontes.
- `.github/workflows/sync-card-art.yml`: Sincronizador de artes sob demanda (`workflow_dispatch`), sem commit/push automático e sem prune.
- Determinismo de partida completa, propriedades, fuzzing, self-play, smoke e endurance: **Pendentes**.

### Web e publicação

- Build jogável integrada: **Implementada e testada (`index.html`, `src/web/client.ts`, `src/web/app.ts`, `tests/core/web.test.mjs`)**.
- GitHub Pages: **Pendente / aguardando confirmação explícita do autor**.

### IA, replay e telemetria

- Contratos: **Definidos no GDD**.
- Documentos técnicos específicos como `TELEMETRY_SCHEMA.md` e `AI_INTERFACE.md`: **Ainda não versionados**.
- Replay mínimo e telemetria mínima: **Implementados e testados**.
- IA adversária de jogo: **Implementada e testada no core (`src/core/ai.ts`)**.
- IA de QA / campanhas de teste: **Pendente**.

## Ordem recomendada das próximas entregas (Foco Exclusivo no Jogo Funcional)

1. **Marco 1 — Invocações Especiais no Core (Fusão e Integração de Ritual):**
   - **CONCLUÍDO E TESTADO (`df98872`):** Invocação Fusão (`src/core/fusion.ts`) e Invocação Ritual (`src/core/ritual.ts`) orientadas a dados e integradas ao catálogo (`content.ts`), comandos (`engine.ts`) e hashes de replay.
2. **Marco 2 — Terreno e Movimento Contínuo com Custo Real de SPD:**
   - **CONCLUÍDO E TESTADO (`405d79f`):** Tipos de terreno (plano, difícil, intransponível), custos de SPD, travessia com GLIDER e regras de SPD negativo (`src/core/terrain.ts`).
3. **Marco 3 — Ativação e Resolução de Magias e Armadilhas em Corrente:**
   - **CONCLUÍDO E TESTADO (`71c6db6`):** Equipamentos (máx 3, transferência por 1 Ação), slots de armadilha (3 velados, custo 0 de set), destruição preventiva, ativação em Corrente de Magias/Armadilhas e envio atômico ao Cemitério (`src/core/spells-traps.ts`, `src/core/engine.ts`).
4. **Marco 4 — Ciclo Completo de Partida Headless (Game Loop Fechado):**
   - **CONCLUÍDO E TESTADO (`cec78f5`):** Harness autônomo com suporte a políticas táticas (`createTacticalPolicy`), loop de partida fechada (5 impactos ou Deck Out) e verificação de replay 100% determinística (`scripts/run_headless_simulation.mjs`, `tests/core/headless.test.mjs`).
5. **Marco 5 — IA Adversária Inicial (Heurística e Decisão sob Fog of War):**
   - **CONCLUÍDO E TESTADO (`src/core/ai.ts`, `tests/core/ai.test.mjs`):** IA oficial operando sob Fog of War com informação justa (`createAIObservation`), avaliador heurístico configurável (`createHeuristicAI`, `createAggressiveAI`, `createDefensiveAI`, `createTacticalAI`), simulações de partidas completas e 100% de replay verificado.
6. **Marco 6 — Conexão Web e Build Jogável:**
   - **CONCLUÍDO E TESTADO (`index.html`, `src/web/client.ts`, `src/web/app.ts`, `tests/core/web.test.mjs`):** Sessão de jogo `WebGameSession` conectando o motor autoritativo e a IA adversária sob Fog of War com informação justa. Tabuleiro tático 31×17 em canvas com renderização de terreno, bases e névoa de guerra. HUD interativo com seleção de cartas na mão, 3 slots de armadilha velada, movimentação e ataques autoritativos, modais nativos `<dialog>` para fase de compra e decisão (8 recursos), e exportação com verificação determinística de replays.

## Bloqueios explícitos

- Proibido reabrir frentes visuais, shaders, partículas, Three.js ou experimentos A/B/C enquanto vigorar a diretriz de foco no jogo funcional.
- Não rebaixar VIS-001 para “aguardando aprovação”: a versão melhorada já foi aprovada pelo autor em 2026-09-29.
- Não reinterpretar a câmera 3D de VIS-002 como altura ou facing de gameplay.
- Não permitir que orientação, câmera, zoom, pan ou foco alterem estado/hash autoritativo.
- Não completar regras ausentes usando Yu-Gi-Oh! oficial.
- Não tratar o pathfinding local de VIS-002 como implementação final.
- Não podar a biblioteca física de artes com base em `selection.json`.
- Não publicar GitHub Pages sem validação e autorização explícita do autor.
- Diretriz de Versionamento: Autor instruiu formalmente em 2026-10-02 ("ignora essa bobagem apartir de agora, sempre commita") a realizar commit e push automáticos para `origin/main` após testes bem-sucedidos.
