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
- Cópia binária .docx no Git: **Presente** em docs/context/sources/Monster_Impact_GDD_v0.43.docx (canônica mais recente) e Monster_Impact_GDD_v0.42.docx (histórico), com tamanho e SHA-256 conferidos.
- Prompt mestre completo: **Presente** em `docs/context/sources/PROMPT_MESTRE.txt`, preservado como fonte textual do autor.

### Núcleo autoritativo

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
- Fluxos de RNG derivados e auditáveis: **Implementados e testados como infraestrutura; integrações de gameplay pendentes**.
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
- Invocação Ritual com compatibilidade de Magia orientada a dados, materiais da mão/mapa, soma de níveis, Extra Deck, destinos liberados/área Normal e pagamento atômico: **Implementada e testada como domínio; integração do catálogo e da fila autoritativa pendente**.
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
- Correntes independentes, LIFO, revalidação, NEGAR/FALHAR, limite de Cross Chain, primeira prioridade do oponente, oportunidade final do iniciador, bloqueio de resolução antes do fechamento e movimento defensivo como Reação real: **Implementados e testados; adições de cartas/habilidades e continuação de Cross Chain ainda pendentes**.
- As 17 RACE prioritárias e seus bônus estruturais cumulativos: **Implementados e testados**.
- Replay autocontido por seed/comandos, Decks, conteúdo, mapa e comparação de hashes por passo: **Implementado e testado**.
- Telemetria local mínima de comandos, rejeições, contexto lógico e hashes: **Implementada e testada**.
- Gameplay completo (custos, movimento, dano, Invocações, Correntes, Cross Chains, IMEDIATOS, Fog of War, RNG, timers): **Pendente**.

### Prototipagem visual

- `VIS-001 — Composição do campo e HUD principal`: **Aprovado pelo autor em 2026-09-29 na versão melhorada**.
- O comparador A/B/C atualmente versionado em `prototypes/visual-001-hud-layout/index.html` é a evidência histórica inicial; o Git atual não permite identificar a revisão melhorada como uma opção A/B/C pura sem inventar informação.
- A aprovação de VIS-001 cobre composição, hierarquia e densidade do HUD/campo; não aprova por herança movimento, timing, Correntes interativas ou Fog of War dinâmico.
- `VIS-002 — Mapa, orientação 2D/3D e sistema de câmera`: **Prototipado, testado e aprovado pelo autor em 2026-09-29**.
- VIS-002 aprova **2D top-down e 3D tático como orientações selecionáveis in-game** sobre o mesmo estado lógico.
- Contrato de câmera aprovado em VIS-002: pan/zoom/foco no 2D; órbita/pan/zoom/elevação/presets/reset no 3D; duplo clique em monstro para foco traseiro puramente visual.
- O comparador 2D+3D permanece ferramenta de QA; não é um terceiro modo normal de gameplay.
- VIS-002 não aprova por herança arte final, terreno final, altura como regra, facing de gameplay ou pathfinding do protótipo como núcleo definitivo.
- Evidência atual de VIS-002: **18/18 testes embutidos e 29/29 checks reais em Chromium/Playwright**.
- VIS-004 — Terreno, SPD e movimento avançado: **Prototipado, testado e APROVADO pelo autor em 2026-09-30 (Opção A — badge persistente no bloco como padrão visual)** em `prototypes/visual-004-terrain-spd-advanced-movement/`. Evidência: 48/48 testes embutidos aprovados em Desktop e Narrow; separação estrita de hash entre A/B/C; pacote de qualidade de uso (QoL) completo implementado; opções B e C mantidas como comparadores históricos.
- VIS-006 — Linguagem visual-base de materialização & validação espacial de regras: **Prototipado, testado e APROVADO pelo autor em 2026-10-01 (Opção B — Círculo de Invocação Místico em versão limpa e despoluída como padrão oficial de linguagem-base de materialização)** em `prototypes/visual-006-summons/`.
- VIS-006.1 — Identidade visual da Invocação Ritual: **Prototipado, testado e APROVADO pelo autor em 2026-10-01 (Opção B — Ascensão Cerimonial)** em `prototypes/visual-006-1-ritual/`.
- VIS-006.2 — Identidade visual da Invocação Fusão: **Prototipado, testado e APROVADO pelo autor em 2026-10-01 (Opção A — Vórtice Bicolor / Espiral de Polimerização)** em `prototypes/visual-006-2-fusion/`.
- VIS-ENV-001 — Revisão da Câmera 3D e do Ambiente-Base (Palco Visual): **Aprovado pelo autor como referência e palco congelado em 2026-10-01 ("a câmera está perfeita; o ambiente/base visual atual está aprovado como palco de referência; não refaça câmera; não refaça ambiente; não reabra o palco visual")**.
- VIS-007 — Identidade visual do combate e resolução de batalha: **Reformulado do zero em Microprotótipos Atômicos por Elemento Visual (EL-1 a EL-7, 3 opções A/B/C cada), testado (21/21) e EM AVALIAÇÃO PELO AUTOR** em `prototypes/visual-007-combat/`. Efeitos gráficos 2D em overlay sincronizado, limpos e sem poluição 3D.
- VIS-008 — Identidade visual de destruição, base e correntes: **Reformulado do zero em Microprotótipos Atômicos por Elemento Visual (EL-8 a EL-10, 3 opções A/B/C cada), testado (9/9) e EM AVALIAÇÃO PELO AUTOR** em `prototypes/visual-008-chains/`. Escala 3D da unidade ajustada a zero na destruição e câmera focalizada na base.


### Artes e conteúdo

- **Biblioteca Física de Ativos (ssets-local/card-art/):** **Materializada com 407 artes recortadas (.jpg), 407 sidecars de metadados (.txt) e 92 sidecars de efeito (.effect.txt)**. Todas as 17 RACE prioritárias possuem pelo menos 15 Monstros Normais catalogados com ilustrações limpas e dados oficiais da carta-fonte. Zero arquivos órfãos.
- **Segurança da Biblioteca:** A automação destrutiva de poda no GitHub Actions (sync-card-art.yml) foi desativada e eliminada. A biblioteca física é estritamente aditiva e nunca é podada com base em seleções parciais.
- **Candidate Pool / Seleção Curada Auxiliar (DEC-001):** **136 cartas** (Beast, Psychic, Fiend, Spellcaster + Magias e Armadilhas) definido para testes de amostragem e geração de decks.
- **Expansão Pré-2005 de Magias e Armadilhas (DEC-004):** **Definida pelo autor e implementada em scripts** (10 por subtipo com filtro temporal estrito a feitiços e armadilhas).
- **Proposta Formal para GDD v0.44:** Registrada em PROPOSTA_GDD_v0.44_ERA_E_EXCECAO_PSYCHIC.md, formalizando a exceção estrutural da era para a raça Psíquico mantendo o banimento de Synchro/Xyz/Pendulum/Link.
- **Escopo Jogável Canônico (GDD v0.43 P77-P80):** Meta de 88 cartas (ou fallback para 40) para o jogo funcional (1 mapa, 2 decks de 20 cartas, 1 IA): **Em estruturação no núcleo**.

### Testes e CI

- Testes Python do downloader: **Implementados**.
- Testes do núcleo TypeScript e invariantes espaciais: **Implementados**.
- Typecheck/build do núcleo: **Implementados no CI**.
- VIS-002 possui testes internos e smoke de navegador executados durante aprovação; a integração desses checks à CI geral ainda é **Pendente**.
- Replay mínimo determinístico: **Implementado e testado**.
- Determinismo de partida completa, propriedades, fuzzing, self-play, smoke e endurance: **Pendentes**, pois dependem dos sistemas correspondentes.

### Web e publicação

- Protótipo HTML VIS-001: **Implementado como comparador histórico; decisão da versão melhorada aprovada**.
- Protótipo web modular VIS-002 (`index.html` + CSS + JS): **Implementado e aprovado**.
- Build jogável: **Pendente**.
- GitHub Pages: **Pendente / não publicado**.

### IA, replay e telemetria

- Contratos: **Definidos no GDD**.
- Documentos técnicos específicos como `TELEMETRY_SCHEMA.md` e `AI_INTERFACE.md`: **Ainda não versionados**.
- Replay mínimo e telemetria mínima: **Implementados e testados**.
- IA e telemetria completa: **Pendentes**.

## Ordem recomendada das próximas entregas

1. **Usar VIS-001 e VIS-002 como decisões aprovadas**, sem reabrir seus pontos já decididos por registros antigos. Se a revisão melhorada do VIS-001 ganhar um snapshot executável identificável, versioná-lo como evidência da decisão já tomada, não como nova aprovação.
2. **Expandir as Correntes integradas para respostas genéricas e Cross Chains**, preservando o fluxo de ataque/contra-ataque já integrado e mantendo cartas, unidades e posições no mesmo hash/replay.
3. **Concluir a revisão fundacional da Câmera 3D e do Ambiente-Base no VIS-ENV-001**, submetendo as Opções A, B e C à decisão do autor para estabelecer o novo palco visual definitivo antes de refazer combate e correntes.
4. **Fechar com o autor somente as ambiguidades que bloquearem implementação.** A VIS inicial da base foi fechada no `DEC-002`, e o combate duplo-negativo no `DEC-003`.
5. **Evoluir replay e telemetria para snapshots, causalidade e pacotes de diagnóstico completos**, antes de IA e self-play extensivos.
6. **Adicionar IA competitiva e QA** somente sobre a interface pública do mesmo núcleo.
7. **Criar a build web jogável** após integrar o ciclo mínimo de partida; publicar no Pages somente depois de conteúdo, testes, build, smoke test e autorização.

## Bloqueios explícitos

- Não rebaixar VIS-001 para “aguardando aprovação”: a versão melhorada já foi aprovada pelo autor em 2026-09-29.
- Não inventar que a aprovação do VIS-001 corresponde a A, B ou C pura quando o registro atual não sustenta essa equivalência.
- Não reinterpretar a câmera 3D de VIS-002 como altura ou facing de gameplay.
- Não permitir que orientação, câmera, zoom, pan ou foco alterem estado/hash autoritativo.
- Não completar regras ausentes usando Yu-Gi-Oh! oficial.
- Não tratar o scaffold do núcleo como jogo completo.
- Não tratar o pathfinding local de VIS-002 como implementação final.
- Não confundir a política de 136 cartas do DEC-001 com o snapshot `selection.json` de 96 cartas enquanto ele não for regenerado/sincronizado.
- Não declarar a sincronização visual das 136 concluída enquanto faltarem as oito ilustrações limpas dos Psychic Rush.
- Não publicar GitHub Pages sem validação e autorização explícita.
- Não definir sozinho a lista final de cartas do primeiro conjunto quando o GDD não fornece nomes específicos.
