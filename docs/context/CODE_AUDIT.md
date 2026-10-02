# Auditoria Técnica Integral do Núcleo Autoritativo (`src/core/`)

**Status:** Documento normativo de auditoria do código-fonte do motor  
**Data da auditoria:** 2026-10-01  
**Fonte canônica confrontada:** `Monster_Impact_GDD_v0.43.docx` (SHA-256: `6e40f214...`)  
**Diretiva autoral vigente:** Foco exclusivo no jogo funcional (núcleo autoritativo, regras, testes e headless; protótipos visuais suspensos).  
**Schema autoritativo atual:** Versão 16  
**Cobertura automatizada:** 239 testes em 36 arquivos (`npm test`, 100% passing) | Typecheck TypeScript (`tsc`, 0 erros)  

---

## 1. Resumo Executivo da Auditoria

Esta auditoria inspeciona o estado real da implementação em `src/core/` contra o GDD v0.43 e as decisões aprovadas.

### Conclusão Principal:
O núcleo possui uma **base arquitetural sólida, estrita e com forte cobertura de testes em áreas fundamentais** (pipeline de 20 Hz, fila monotônica, determinismo de replay, integridade de zonas físicas de cartas, fórmulas de vitais, combate discreto, movimento básico e divisão de recursos em 5 fases).

**No entanto, o núcleo NÃO é um jogo completo.** Faltam subsistemas fundamentais de gameplay:
1. **Terreno e Movimento Contínuo:** O movimento hoje é puramente ortogonal discreto passo a passo com travessia de aliados; custos de terreno, modificadores de campo, penalidades de SPD e pathfinding contínuo ainda não existem.
2. **Ativação Real de Magias e Armadilhas em Corrente:** Hoje existe apenas o roteamento formal (`activation.ts`) e a pilha LIFO (`chain.ts`) com movimento defensivo como Reação e janelas de contra-ataque. Efeitos reais de cartas (Field, Equip, Continuous, Counter Traps) não estão integrados.
3. **Invocações Especiais Parciais:** Invocação Normal e Tributo estão integradas; Ritual possui domínio completo e validação estrita em `engine.ts`, mas a **Invocação Fusão (Fusion)** ainda não foi implementada.
4. **Game Loop Headless e IA:** Não há runner para executar uma partida completa de ponta a ponta sem intervenção manual, e **a IA adversária não existe** no código atual.
5. **Apresentação Web:** Não existe build integrada nem workflow configurado para GitHub Pages.

---

## 2. Auditoria dos Princípios Fundamentais do GDD

| Princípio do GDD v0.43 | Seção GDD | Estado no Código | Avaliação Técnica |
| :--- | :--- | :---: | :--- |
| **Simulação Autoritativa Única** | Visão Geral / P32 | **CONFORME** | A simulação reside 100% em `src/core/`. A apresentação visual é tratada como casca consumidora descartável (ADR-001). |
| **Passo Fixo de 20 Hz (50 ms)** | P32 / P982 | **CONFORME** | Fixado em `constants.ts` (`STEP_DURATION_MS = 50`, `STEPS_PER_SECOND = 20`). |
| **Fila Pública de Comandos** | P32 / P982 | **CONFORME** | `queue.ts` implementa registro monotônico com `registeredAtStep`; comandos recebidos em `S` tornam-se elegíveis em `S + 1`. |
| **Determinismo e Imutabilidade** | P32 / P984 | **CONFORME** | Hashes canônicos FNV-1a 64-bit via UTF-16 lexicográfico (`canonical.ts`). Estado e payloads congelados via `freeze.ts` (`deepFreeze`). |
| **Aritmética Inteira Estrita** | P32 / P984 | **CONFORME** | Proibição categórica de floats no estado autoritativo. Rejeição de valores fracionários ou NaN. |
| **RNG Auditável com Rejeição** | P36 / P984 | **CONFORME** | `random.ts` utiliza stream derivado monotônico e amostragem por rejeição para anular viés modular em inteiros arbitrários. |
| **Invariantes Espaciais (31 × 17)** | P1211 | **CONFORME** | Mapa fixado em 31 × 17. Bases sólidas em extremidades opostas. Máximo de 5 monstros simultâneos por jogador (`spatial.ts`). |
| **Condição de Vitória (5 Impactos)** | P30 / P34 | **CONFORME** | Ataques válidos à base contabilizados; vitória imediata e cancelamento de ações pendentes no 5º impacto (`match.ts`). |

---

## 3. Censo Módulo a Módulo de `src/core/` (36 Arquivos)

### 3.1. Infraestrutura, Tipos e Primitivas Matemáticas

#### `constants.ts` (36 linhas)
- **Função:** Fixa constantes globais autoritativas (`CORE_SCHEMA_VERSION = 16`, `STEP_DURATION_MS = 50`, `STEPS_PER_SECOND = 20`, dimensões do mapa `WIDTH = 31`, `HEIGHT = 17`, limites de monstros = 5).
- **Conformidade GDD:** 100% conforme.
- **Testes:** Validado em `core.test.mjs`.

#### `types.ts` (375 linhas)
- **Função:** Declaração estrutural de interfaces TypeScript para `SimulationState`, comandos autoritativos, envelopes de comando, eventos de passo (`CommandAcceptedEvent`, `CommandRejectedEvent`) e resultados de execução.
- **Conformidade GDD:** Estruturas desacopladas da UI, operando exclusivamente com tipos serializáveis (`JsonValue`).
- **Testes:** Validado indiretamente por todos os 239 testes.

#### `canonical.ts` (68 linhas)
- **Função:** Serialização lexicográfica por unidades UTF-16 (independente de locale do sistema) e cálculo do hash FNV-1a 64-bit.
- **Conformidade GDD:** Atende a exigência de hashes reproduzíveis entre arquiteturas diferentes.
- **Testes:** Validado em `replay.test.mjs` e `core.test.mjs`.

#### `freeze.ts` (45 linhas)
- **Função:** Congelamento defensivo profundo recursivo (`Object.freeze`) de objetos e arrays para garantir imutabilidade estrita do estado.
- **Conformidade GDD:** Garante que consumidores externos ou IAs não possam mutar o estado interno por referência.
- **Testes:** Validado em `core.test.mjs`.

#### `random.ts` (124 linhas)
- **Função:** Gerador pseudoaleatório determinístico (LCG 64-bit) derivado por seed e stream ID, com amostragem por rejeição para evitar viés modular.
- **Conformidade GDD:** Respeita a regra do GDD que proíbe ponto flutuante autoritativo em sorteios.
- **Testes:** Validado em `random.test.mjs` (distribuição uniforme, integridade de stream, rejeição de limites inválidos).

#### `geometry.ts` (88 linhas)
- **Função:** Distância ortogonal (Manhattan), checagem de alcance e traçado de linha reta de ataque entre centros de blocos, com detecção e bloqueio inclusive em cantos tocados.
- **Conformidade GDD:** Conforme as regras de alcance e linha de visão direta de combate.
- **Testes:** Validado em `geometry.test.mjs`.

#### `spatial.ts` (172 linhas)
- **Função:** Invariantes estáticas do tabuleiro (31 × 17), coordenadas de base centradas nas bordas opostas, ocupação física unitária de blocos e limite de 5 unidades.
- **Conformidade GDD:** Conforme P80 e P1211 do GDD.
- **Testes:** Validado em `spatial.test.mjs`.

#### `race.ts` (65 linhas)
- **Função:** Validação das 17 RACE prioritárias aprovadas e aplicação cumulativa de pacotes estruturais de bônus de atributos (ex.: Beast +1 HP/+1 SPD; Winged Beast +2 SPD).
- **Conformidade GDD:** Conforme Grupo 9 e Grupo 16 do GDD v0.43.
- **Testes:** Validado em `race.test.mjs`.

#### `vitals.ts` (148 linhas)
- **Função:** Fórmulas-base de HP e MP (com distinção de Normal Monsters sem MP), piso zero, distinção entre dano, perda de HP, pagamento de custo e recuperação, além de ajuste de teto máximo.
- **Conformidade GDD:** Conforme seção de Vitais do GDD. Não confunde dano de combate com pagamento de custo.
- **Testes:** Validado em `vitals.test.mjs`.

#### `priority.ts` (128 linhas)
- **Função:** Sorteio do Token de Prioridade inicial por cara-ou-coroa determinístico e alternância automática nas fronteiras de turno.
- **Conformidade GDD:** Conforme regra de prioridade do GDD.
- **Testes:** Validado em `priority.test.mjs`.

#### `queue.ts` (85 linhas)
- **Função:** Particionamento de comandos: comandos emitidos no passo `S` são agendados e tornam-se elegíveis estritamente em `S + 1`.
- **Conformidade GDD:** Conforme P32 (pipeline de fila do GDD).
- **Testes:** Validado em `core.test.mjs`.

#### `information.ts` (112 linhas)
- **Função:** Gera a projeção de informação justa para cada jogador: mãos e Extra Decks adversários ficam ocultos; contagens de cartas e Cemitérios são públicos.
- **Conformidade GDD:** Conforme regras de informação oculta vs pública do GDD.
- **Testes:** Validado em `information.test.mjs`.

#### `telemetry.ts` (140 linhas)
- **Função:** Registro de eventos locais estruturados, comandos aceitos, rejeições com motivo explícito e empacotamento diagnóstico acoplado a replays.
- **Conformidade GDD:** Implementação básica presente; telemetria massiva de self-play e métricas de balanceamento ainda pendentes.
- **Testes:** Validado em `telemetry.test.mjs`.

#### `replay.ts` (185 linhas)
- **Função:** Gravação e reprodução determinística de partidas por seed inicial, setup de cartas e sequência ordenada de comandos, acusando a primeira divergência de hash passo a passo.
- **Conformidade GDD:** Conforme seção de Replay do GDD.
- **Testes:** Validado em `replay.test.mjs`.

---

### 3.2. Cartas, Zonas e Preparação de Partida

#### `deck.ts` (160 linhas)
- **Função:** Validação das regras de construção de Deck: mínimo de cartas Normais, proporções de monstros/feitiços/armadilhas e limite global de cópias.
- **Conformidade GDD:** Conforme regras de validação de deck.
- **Testes:** Validado em `deck.test.mjs`.

#### `draw.ts` (210 linhas)
- **Função:** Instanciação de identidades físicas de cartas (`CardInstance`), embaralhamento separado dos três decks, compra inicial com splits livres de monstros/magias e resolução de Deck Out simples ou simultâneo.
- **Conformidade GDD:** Garante que a escolha de mão inicial seja livre (0 a 7 monstros), conforme retificação do autor, e não fixada em 4+3.
- **Testes:** Validado em `draw.test.mjs` e `engine-draw.test.mjs`.

#### `zones.ts` (135 linhas)
- **Função:** Operações atômicas de transferência física de cartas: mão -> campo, campo -> cemitério, mão -> cemitério. Previne clonagem de instâncias físicas.
- **Conformidade GDD:** Conforme modelo físico de cartas do GDD.
- **Testes:** Validado em `zones.test.mjs`.

#### `content.ts` (145 linhas)
- **Função:** Catálogo autoritativo de definições de monstros (`MonsterDefinition`), stats e procedimentos de Ritual (`ritualProcedures`).
- **Conformidade GDD:** Garante que o motor consulte regras a partir de definições de dados canônicos.
- **Testes:** Validado em `content.test.mjs`.

#### `monster.ts` (190 linhas)
- **Função:** Instanciação e ciclo de vida do monstro no campo (`MonsterState`), controle de posição de batalha (ATK/DEF), stats efetivos e recuperação de HP/MP na Fase de Apoio.
- **Conformidade GDD:** Conforme regras de vitais e ciclo de monstros.
- **Testes:** Validado em `monster.test.mjs`.

#### `setup.ts` (240 linhas)
- **Função:** Validação inicial conjunta dos 2 jogadores, geração de IDs únicos globais por cópia física, embaralhamento com seed auditável e setup do estado de jogo.
- **Conformidade GDD:** Conforme P80 e preparação de partida do GDD.
- **Testes:** Validado em `setup.test.mjs`.

---

### 3.3. Ciclo de Turno, Recursos e Visibilidade

#### `turn.ts` (280 linhas)
- **Função:** Orquestração do ciclo de 5 fases (Compra, Apoio, Decisão, Ação, Encerramento). Distribuição secreta de 8 recursos (Ações/Reações), consumo estritamente na confirmação e conversão de recursos remanescentes após o fechamento de Correntes.
- **Conformidade GDD:** Conforme seção de Estrutura de Turno do GDD v0.43.
- **Testes:** Validado em `turn.test.mjs` e `engine-turn.test.mjs`.

#### `visibility.ts` (115 linhas)
- **Função:** Cálculo determinístico da VIS compartilhada: união da visão ortogonal dos monstros aliados com o quadrado de raio 5 da base (aprovado em DEC-002), com bloqueio de visão por bases e obstáculos fixos.
- **Conformidade GDD:** Conforme DEC-002 e regras de visibilidade.
- **Testes:** Validado em `visibility.test.mjs`.

#### `fog.ts` (130 linhas)
- **Função:** Memória justa de Fog of War para cada jogador: registra a última posição conhecida de unidades inimigas avistadas sem atualizar automaticamente posições que se movimentaram sob a névoa.
- **Conformidade GDD:** Conforme regras de névoa justa do GDD.
- **Testes:** Validado em `fog.test.mjs`.

---

### 3.4. Movimento, Combate e Invocações

#### `movement.ts` (195 linhas)
- **Função:** Movimento básico ortogonal com travessia de aliados em blocos intermediários, bloqueio em blocos ocupados/obstáculos, dedução de 1 Ação + SPD na confirmação e movimento defensivo reativo em Corrente por 1 Reação + SPD.
- **Lacuna / Limitação Identificada:** O movimento é resolvido como salto discreto entre posições válidas. **Ainda não há suporte a custos variáveis de terreno nem modificadores de campo.**
- **Testes:** Validado em `movement.test.mjs`.

#### `summon.ts` (175 linhas)
- **Função:** Validação e resolução da Invocação Normal: âncora inicial na base ou em monstro aliado existente, validação na área ortogonal livre e visível, com fallback determinístico de até 3 blocos em caso de obstrução.
- **Conformidade GDD:** Conforme seção de Invocações do GDD v0.43.
- **Testes:** Validado em `summon.test.mjs`.

#### `tribute.ts` (160 linhas)
- **Função:** Validação e resolução de Invocação por Tributo: seleção de monstros Normais aliados, soma de níveis (igual ou superior ao monstro invocado), liberação de blocos físicos, envio dos materiais ao Cemitério e escolha do bloco liberado para ocupação.
- **Conformidade GDD:** Conforme regras de Tributo do GDD v0.43.
- **Testes:** Validado em `tribute.test.mjs`.

#### `ritual.ts` (267 linhas)
- **Função:** Procedimento de Invocação Ritual: validação de Magia Ritual compatível orientada a dados, consumo atômico de materiais da mão/campo com soma de níveis, envio das cartas ao Cemitério e posicionamento no campo.
- **Auditoria do Parâmetro `negated`:** No resolver de domínio interno (`ritual.ts`), existe suporte para computar o resultado quando uma Invocação é negada (gasta custos sem colocar o monstro no campo). Em `engine.ts`, a API pública **proíbe estritamente** o cliente de passar `negated: true` ou `procedure` clandestino via payload, consultando o catálogo autoritativo.
- **Testes:** Validado em `ritual.test.mjs` e `engine-ritual.test.mjs`.

#### `combat.ts` (115 linhas)
- **Função:** Cálculo matemático de combate: ATK×ATK (dano mútuo), ATK×DEF (destruição sem dano ao defensor com DEF superior), dano duplo em alvo indefeso e resolução do caso duplo-negativo conforme `DEC-003`.
- **Conformidade GDD:** Conforme `DEC-003` e regras de combate do GDD.
- **Testes:** Validado em `combat.test.mjs`.

#### `attack.ts` (140 linhas)
- **Função:** Plano de Ataque Básico: alcance próprio da unidade, checagem ortogonal e linha desobstruída (inclusive em cantos), exigência de VIS do alvo e abertura de janela para escolha de contra-ataque.
- **Conformidade GDD:** Conforme regras de ataque do GDD.
- **Testes:** Validado em `attack.test.mjs`.

#### `battle.ts` (215 linhas)
- **Função:** Transação completa de batalha: revalidação espacial/VIS no momento da resolução, contra-ataque opcional do defensor (se possuir alcance e SPD), aplicação simultânea de dano/HP, remoção imediata de mortos do mapa e envio atômico ao Cemitério de cada dono.
- **Conformidade GDD:** Conforme fluxo transacional de combate do GDD.
- **Testes:** Validado em `battle.test.mjs`.

#### `base-attack.ts` (150 linhas)
- **Função:** Declaração e resolução de ataque à base inimiga: alcance, validação de linha até o bloco da base, registro de impacto e reposicionamento aleatório auditável da unidade no terço aliado do mapa.
- **Conformidade GDD:** Conforme regra de ataque à base do GDD.
- **Testes:** Validado em `base-attack.test.mjs`.

#### `match.ts` (185 linhas)
- **Função:** Gerenciamento do estado da partida: contagem de impactos na base (vitória imediata no 5º), encerramento por Deck Out simples ou simultâneo (desempate pelo Token de Prioridade).
- **Conformidade GDD:** Conforme condições de vitória e desempate do GDD.
- **Testes:** Validado em `match.test.mjs` e `engine-match.test.mjs`.

---

### 3.5. Correntes e Ativações

#### `activation.ts` (95 linhas)
- **Função:** Roteamento de ativações:
  - Ativações sem alvo inimigo resolvem diretamente sem abrir Corrente;
  - Ativações com alvo inimigo ou reações a ações inimigas abrem janela formal de Corrente;
  - Efeitos marcados como IMEDIATO executam fora da Corrente.
- **Conformidade GDD:** Segue estritamente a regra universal do GDD v0.43 (só abre Corrente quando há alvo inimigo ou contra-reação).
- **Testes:** Validado em `activation.test.mjs`.

#### `chain.ts` (260 linhas)
- **Função:** Pilha LIFO de Correntes independentes, revalidação de alvos no momento da resolução, tratamento de NEGAR vs FALHAR, passagem formal de prioridade entre jogadores e controle de Cross Chains.
- **Lacuna / Limitação Identificada:** O sistema de Correntes está estruturado e suporta reações de movimento e contra-ataques, mas **adições genéricas de efeitos de Magias, Armadilhas e habilidades ativadas ainda não estão ligadas a esta pilha**.
- **Testes:** Validado em `chain.test.mjs`.

---

### 3.6. Orquestrador do Motor

#### `engine.ts` (1326 linhas)
- **Função:** Ponto de entrada autoritativo do núcleo. Processa a fila de comandos, aplica transições de fase, executa validação estrita de payloads e calcula o hash de estado por passo.
- **Testes:** Validado em `engine-game.test.mjs`, `engine-gameplay.test.mjs`, `engine-ritual.test.mjs`, `engine-match.test.mjs`.

---

## 4. Auditoria dos 19 Comandos Públicos Aceitos em `engine.ts`

| Comando | Payload Permitido | Validação de Payload | Custos Deduzidos | Efeito de Mutação |
| :--- | :--- | :---: | :---: | :--- |
| `cards.choose_draw_mode` | `mode: DrawMode` | Estrita | Nenhum | Trava a modalidade de compra do jogador para a Fase de Compra. |
| `turn.allocate_resources` | `actions: number, reactions: number` | Estrita (soma = 8) | Nenhum | Registra a distribuição secreta de recursos na Fase de Decisão. |
| `support.resolve_recovery` | Nenhum | Estrita | Nenhum | Executa transição autoritativa única de recuperação de HP/MP na Fase de Apoio. |
| `summon.normal` | `cardInstanceId, unitId, destination, anchorUnitId, battlePosition` | Estrita | 1 Ação | Retira cópia da mão, valida âncora/área/VIS e instancia monstro no mapa. |
| `monster.move_basic` | `unitId, path: Position[]` | Estrita | 1 Ação + SPD | Move monstro ortogonalmente pelo caminho validado, preservando invariantes. |
| `monster.change_battle_position` | `unitId, battlePosition` | Estrita | 1 Ação | Altera entre ATK e DEF (1 vez por turno por unidade). |
| `summon.tribute` | `cardInstanceId, unitId, destination, tributeUnitIds, battlePosition` | Estrita | 1 Ação | Envia materiais Normais ao Cemitério e posiciona monstro no bloco liberado. |
| `summon.ritual` | `ritualMonsterInstanceId, ritualSpellInstanceId, materialCardInstanceIds, unitId, anchorUnitId, destination, battlePosition` | Estrita (chaves extras rejeitadas) | 1 Ação + Materiais | Consulta procedimento no catálogo canônico, envia materiais ao Cemitério e invoca. |
| `battle.declare_basic_attack` | `attackerUnitId, targetUnitId` | Estrita | 1 Ação | Valida alcance, linha e VIS; abre janela de resposta para o defensor. |
| `battle.choose_counterattack` | `attackId, performCounterattack: boolean` | Estrita | Nenhum custo universal | Registra a escolha opcional do defensor de contra-atacar antes da resolução. |
| `battle.declare_base_attack` | `attackerUnitId, targetPlayerId` | Estrita | 1 Ação | Valida linha até a base inimiga e registra ataque pendente. |
| `chain.react_move` | `unitId, destination` | Estrita | 1 Reação + SPD | Empilha movimento defensivo como Reação na pilha LIFO de Corrente. |
| `chain.pass_priority` | Nenhum | Estrita | Nenhum | Passa a oportunidade de resposta na Corrente para o oponente. |
| `chain.resolve_next` | Nenhum | Estrita | Nenhum | Fecha Corrente e resolve o próximo elemento no topo da pilha LIFO. |
| `turn.confirm_resource_use` | `category, amount` | Estrita | Recursos restantes | Confirmação formal de débito de Ação ou Reação. |
| `turn.end_participation` | Nenhum | Estrita | Perda de recursos restantes | Encerra voluntariamente a atuação do jogador no turno corrente. |
| `turn.settle_resources` | Nenhum | Estrita | Conversão | Converte sobras de recursos após o encerramento de todas as Correntes. |
| `turn.advance_completed_phase` | Nenhum | Estrita | Nenhum | Avança estruturalmente para a próxima fase do turno quando cumpridos os requisitos. |
| `match.resolve_simultaneous_base_attacks` | Nenhum | Estrita | Nenhum | Desempata ataques à base simultâneos utilizando o Token de Prioridade. |

---

## 5. Auditoria de Lacunas, Atalhos e Débitos Técnicos

1. **Invocação Fusão Ausente:** Não há módulo `src/core/fusion.ts` nem comando `summon.fusion` em `engine.ts`.
2. **Terreno Contínuo Ausente:** O módulo `movement.ts` trata apenas posições ortogonais discretas. Modificadores de custo de SPD por bloco de terreno ainda não existem.
3. **Efeitos de Magias e Armadilhas Não Integrados:** Embora haja catálogo de cartas e download de 407 ativos, os efeitos individuais de jogo de Magias (Equip, Continuous, Field) e Armadilhas (Normal, Continuous, Counter) não possuem executores no motor.
4. **Game Loop Headless Fechado Ausente:** Os testes atuais cobrem cenários específicos através de passos dirigidos; não existe um harness de partida que execute autonomamente um jogo completo de 2 Decks válidos do turno 1 até a vitória.
5. **IA Inexistente:** Não há código de IA adversária ou de QA em `src/core/` ou `src/ai/`.
6. **Workflow de GitHub Pages Ausente:** Apenas `ci.yml` e `sync-card-art.yml` existem em `.github/workflows/`.

---

## 6. Plano de Ação Recomendado (Próximos Passos)

Em conformidade com a diretriz do autor de foco exclusivo no código do jogo funcional:

1. **Passo 1 (Marco 1): Invocação Fusão (`src/core/fusion.ts`):**
   - Modelar `FusionProcedure` (Magia de Fusão, materiais da mão/campo, monstro do Extra Deck).
   - Implementar validação estrita e resolução atômica (envio de materiais ao Cemitério e posicionamento no campo).
   - Integrar `summon.fusion` à fila pública de `engine.ts` e ao catálogo de conteúdo (`content.ts`).
2. **Passo 2 (Marco 2): Terreno e Modificadores de Movimento:**
   - Adicionar atributos de terreno à grade espacial (custo de SPD por bloco, impassável, bônus de campo).
3. **Passo 3 (Marco 3): Ativação de Feitiços e Armadilhas em Corrente:**
   - Integrar efeitos concretos do primeiro conjunto à pilha de Correntes.
4. **Passo 4 (Marco 4): Harness de Partida Completa Headless:**
   - Construir runner de simulação de ponta a ponta sem interface gráfica.
