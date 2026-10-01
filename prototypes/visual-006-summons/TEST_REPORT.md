# VIS-006 — Relatório de Validação e Testes em Navegador Real

**Data:** 2026-10-01  
**Status do experimento:** **APROVADO — Opção B (Círculo de Invocação) aprovada pelo autor em 2026-10-01 como padrão oficial de linguagem-base; refinamento em 5 camadas e 1300 ms (+38,5% de velocidade); Harness QA 100% aprovado (20/20)**  
**Ambiente de validação:** Navegador Microsoft Edge (Chromium engine) via Playwright em Windows  
**Resoluções testadas:** 1920 × 1080 (desktop wide) e 800 × 1100 (narrow/mobile)  
**Resultado dos testes do Harness QA (`qa-harness.html`):** **20 / 20 testes aprovados (100%)**  
**Exceções JavaScript:** **0** (tanto no `index.html` quanto no `qa-harness.html`)  
**Auditoria de regras:**
1. Coordenadas canônicas das bases: Base P1 em `(0, 8)` e Base P2 em `(30, 8)`;
2. Regra de âncora: 0 aliados $\to$ Base obrigatória; 1+ aliados $\to$ Base proibida, escolha de aliado;
3. Fallback em empate: sem decisão automática, retorno de estado `ESCOLHA_OBRIGATORIA` com lista de candidatos e escolha manual do jogador;
4. NEGAR: custos pagos mantidos em destinos próprios sem refund; monstro NÃO entra no mapa e NÃO vai ao Cemitério (status: `NOT_SUMMONED`); Normal sem custo de Ação; cancelamento sem custo.

---

## 1. Resumo Executivo

O sexto experimento de *Monster Impact* foi estruturado sob a **nova metodologia de protótipos visuais**, dividindo claramente:
1. **`index.html` (Protótipo Visual Limpo):** Apresenta exclusivamente a comparação estética das Opções A, B e C para a **linguagem-base de materialização** de monstros sobre a base fixa (tabuleiro 31×17 + grade tática + badges VIS-004 Opção A + câmera 2D/3D VIS-002).
   - O GDD v0.43 (§18.3.3) prevê que Normal/Tributo compartilham a apresentação base, enquanto Ritual e Fusão terão identidades próprias modeladas em subprotótipos derivados posteriores.
2. **`qa-harness.html` (Harness de Engenharia / QA):** Executa a validação de regras matemáticas com 20 testes automatizados em Microsoft Edge real.

Principais validações canônicas comprovadas no Harness QA:
1. **Coordenadas Canônicas das Bases:** `BASE_P1` fixada em `(0, 8)` e `BASE_P2` fixada em `(30, 8)` (centros das extremidades opostas do mapa 31 × 17).
2. **Regra Canônica de Âncora:**
   - Com 0 aliados no mapa: `getLegalAnchors()` retorna exclusivamente a Base P1 em `(0, 8)`;
   - Com 1+ aliados no mapa: a Base é **bloqueada e rejeitada**; apenas unidades aliadas são elegíveis.
3. **Desempate de Fallback por Escolha Obrigatória:**
   - Quando há 2 ou mais destinos válidos empatados na menor distância, o algoritmo **não escolhe automaticamente**;
   - Retorna `status: 'ESCOLHA_OBRIGATORIA'`, `hasTie: true`, lista de candidatos mínimos `candidates: [...]` e `selectedCandidate: null`;
   - O destino só é travado após comando explícito do jogador (`chooseFallbackCandidate` ou clique direto no candidato);
   - A escolha de A vs B gera coordenadas e hashes de estado comprovadamente distintos.
4. **Resolução de NEGAR (GDD v0.43 Canônico):**
   - Materiais tributados e magias de ativação (Ritual/Fusão) pagas permanecem no Cemitério sem qualquer reembolso;
   - O monstro cuja Invocação foi negada **NÃO entra no mapa** e **NÃO é enviado ao Cemitério** por suposição, sendo marcado com status formal `NOT_SUMMONED` / `SUMMON_NEGATED` (respeito estrito à lacuna normativa do GDD v0.43);
   - Efeitos AUTOMÁTICA não disparam;
   - Invocação Normal não ganha custo artificial de Ação;
   - Cancelamento prévio da escolha não consome recursos nem cartas.
5. **Invariância de Hash A/B/C:** Alternância entre opções visuais não altera o `hashState(state)` autoritativo nem candidatos legais.

---

## 2. Matriz de Testes Automatizados do Harness QA (20 Testes)

| # | Teste | Status | Detalhes |
|---|---|:---:|---|
| 1 | Coordenadas canônicas das bases (P1 em (0,8) e P2 em (30,8)) | PASSOU | Extremidades opostas do mapa 31×17 |
| 2 | 0 aliados no mapa $\to$ Base é a âncora inicial obrigatória | PASSOU | Base (0,8) retornada como âncora única |
| 3 | 1+ aliados no mapa $\to$ Base indisponível; controlador deve escolher um aliado | PASSOU | Tentativa de selecionar Base com aliados rejeitada |
| 4 | Fallback espacial busca até 3 blocos além da área original | PASSOU | Varredura de distâncias 2, 3 e 4 além da área normal |
| 5 | Dois fallbacks empatados $\to$ escolha obrigatória (sem seleção automática) | PASSOU | Retorna status ESCOLHA_OBRIGATORIA e selectedCandidate null |
| 6 | Três ou mais fallbacks empatados $\to$ escolha obrigatória com todos os candidatos | PASSOU | Apresenta todas as opções mínimas empatadas |
| 7 | Escolha de candidato A repetida com mesmos comandos reproduz o mesmo hash | PASSOU | Replay determinístico verificado |
| 8 | Escolha de candidato B gera estado diferente com coordenadas e hash distintos | PASSOU | Hash A $\neq$ Hash B comprovado |
| 9 | Cancelamento da escolha $\to$ nenhum custo pago nem cartas enviadas ao Cemitério | PASSOU | Estado imutável após cancelamento |
| 10 | Nenhuma opção visual altera os candidatos legais nem o hashState | PASSOU | Invariância visual estrita |
| 11 | Invocação Normal posiciona monstro adjacente à âncora legal | PASSOU | Posicionamento ortogonal validado |
| 12 | Invocação Normal não aplica custo artificial de Ação | PASSOU | Respeito estrito ao GDD v0.43 |
| 13 | Invocação por Tributo envia material do campo ao Cemitério e libera o bloco | PASSOU | Bloco liberado acolhe a nova unidade |
| 14 | Invocação Ritual consome Magia de Ritual e materiais somando níveis | PASSOU | Transação atômica de Ritual validada |
| 15 | Invocação Fusion consome Magia de Fusão e materiais específicos | PASSOU | Fusão atômica validada |
| 16 | Rejeição formal com FALTA_DE_ESPACO quando não há bloco legal até distância 4 | PASSOU | Bloqueio massivo rejeitado formalmente |
| 17 | NEGAR: custos pagos mantidos em destinos próprios sem refund; monstro NÃO entra no mapa e NÃO vai ao Cemitério (NOT_SUMMONED) | PASSOU | Normal e Ritual testados: monstro não vai ao Cemitério e status NOT_SUMMONED |
| 18 | Renderização e seleção funcional nos modos 2D e 3D | PASSOU | 0 exceções JavaScript no console |
| 19 | Redução de movimento (prefers-reduced-motion) verificada | PASSOU | Contrato de acessibilidade respeitado |
| 20 | Layout adaptativo sem scroll horizontal em viewport estreita (800×1100) | PASSOU | Paridade plena mobile/narrow |

---

## 3. Evidências Visuais e Capturas de Tela

### Capturas da Opção B Aprovada e Refinada (Versão Limpa & Despoluída, 1300 ms em 4 Fases)
- `vis006_optB_1_wakeup.png`: **Fase 1 — Ativação (~156 ms)**: Acendimento de dentro para fora, expansão dos anéis duplos e despertar sequencial dos 16 glifos rúnicos com leitura limpa.
- `vis006_optB_2_sync.png`: **Fase 2 — Sincronia (~455 ms)**: Contra-rotação suave dos anéis concêntricos, respiração da geometria sagrada (hexagrama nítido) e 10 brasas sutis orbitando a borda externa (sem ruído de marcas de tick ou arcos fragmentados).
- `vis006_optB_3_climax_column.png`: **Fase 3 — Clímax e Coluna Etérea (~754 ms)**: Projeção vertical suave e translúcida até $z = 2.6$ blocos (não obstrui o tabuleiro nem células vizinhas) e pulso discreto no piso (sem teias de aranha radiais).
- `vis006_optB_4_monster_materialize.png`: **Fase 3 — Descida e Materialização Nítida (~897 ms)**: Monstro descendo suavemente do topo da coluna com sua silhueta e sombreamento tático 100% nítidos (sem caixas rígidas de aura).
- `vis006_optB_5_final_dissipate.png`: **Fase 4 — Dissipação Suave (~1144 ms)**: Unidade solidificada no bloco e dissipação fluida do selo rúnico no piso, deixando o campo tático perfeitamente limpo.
- `vis006_optB_2d_topdown.png`: Projeção da Opção B limpa em visão 2D top-down ortogonal no clímax da invocação.
- `vis006_optB_mage_variant.png`: Teste da Opção B limpa com arquétipo alternativo (Mago).
- `vis006_optB_narrow.png`: Visualização da Opção B em viewport estreita (800 × 1100).

### Registros Históricos e Alternativas Comparativas
- `vis006_art_optA_hologram.png`: **Opção A — Materialização Energética** (wireframe holográfico, partículas ciano convergentes e shockwaves de condensação);
- `vis006_art_optC_card.png`: **Opção C — Carta $\to$ Monstro** (carta TCG levitando, vórtice de dissolução em 36 shards e impacto cósmico);
- `vis006_art_optA_2d.png`: Projeção da Opção A em visão 2D top-down ortogonal;
- `vis006_art_narrow.png`: Visualização da Opção A em viewport estreita (800 × 1100).

### Capturas do Harness de Engenharia (`qa-harness.html`)
- `vis006_preview_tie2_choice.png`: Desempate obrigatório pelo controlador com marcadores `[A]` e `[B]` nos blocos empatados;
- `vis006_preview_3d.png`: Projeção 3D tática com bases canônicas em `(0, 8)` e `(30, 8)`.
