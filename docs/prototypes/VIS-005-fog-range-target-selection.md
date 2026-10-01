# VIS-005 — VIS compartilhada, Fog of War, alcance e seleção de alvos

**Status:** **APROVADO — Opção A (Grade Tática Estrita com cantos de alvos e marcadores [?])**  
**Data da decisão:** 2026-09-30  
**Responsável pela aprovação:** Autor do projeto  
**Escopo do experimento:** Apresentação visual da visão compartilhada (VIS), névoa de guerra (Fog of War), memória de última posição conhecida, projeção de alcance de ataque (RNG) e seleção de alvos válidos/inválidos sobre o mapa 31 × 17 nas orientações 2D e 3D.  
**Referência canônica:** GDD v0.43 (Seção 18.3.3: *Alcance e seleção de alvos* e *Fog of War*).

---

## 1. Contexto e herança de contratos

O VIS-005 sucede o VIS-004 e herda diretamente todas as decisões prévias formalmente aprovadas pelo autor:

1. **VIS-001 (HUD):** Composição de campo e HUD na versão melhorada aprovada;
2. **VIS-002 (Câmera e Projeção):** Coexistência de **2D top-down ortogonal** e **3D tático com câmera livre** selecionáveis in-game sobre o mesmo estado lógico plano;
3. **VIS-003 (Alcançabilidade):** **Opção A — área cheia** aprovada para blocos alcançáveis de deslocamento;
4. **VIS-004 (Terreno e SPD):** **Opção A — badge persistente** aprovada como padrão visual de terreno e movimentação avançada;
5. **Núcleo Autoritativo:** Módulos autoritativos de visão compartilhada (`src/core/visibility.ts`), memória de Fog (`src/core/fog.ts`), geometria/linha de visão (`src/core/geometry.ts`) e plano de ataque básico (`src/core/attack.ts`) já validados por testes unitários e determinísticos.

---

## 2. Pergunta de pesquisa do VIS-005

> **Como apresentar no mapa 31 × 17 a visão compartilhada (VIS), a névoa de guerra (Fog of War) com memória de última posição conhecida, o alcance de ataque e a seleção de alvos com linha de visada desobstruída ou bloqueada, de forma clara e acessível em 2D e 3D, sem alterar o estado autoritativo da partida?**

---

## 3. Decisão de apresentação de Fog e alvos

O autor avaliou e testou as três abordagens sob as mesmas condições e aprovou formalmente a **Opção A**:

### Opção A — Grade Tática Estrita (Tile-by-tile Fog + Retículo de Alvo) [APROVADA - PADRÃO VIGENTE]
- **Fog of War:** Apresentado de forma estritamente discreta por células (grade tática fechada). Blocos não revelados recebem preenchimento escuro opaco/semitransparente que oculta o terreno e unidades não avistadas com precisão exata de bloco.
- **Memória de Posição:** Marcador tático pontilhado com `[?]` posicionado no bloco exato onde a unidade inimiga foi vista pela última vez.
- **Alcance e Alvos:** Blocos dentro do alcance de ataque destacados com borda contrastante em formato de retículo; alvos válidos recebem mirabolante retangular nos quatro cantos do bloco.
- **Linha de Visada:** Células da trajetória destacadas bloco a bloco sem ambiguidades.

### Opção B — Gradiente Suave com Feixe Dinâmico de Visada [TESTADA - NÃO APROVADA]
- **Fog of War:** Névoa com bordas suavizadas por gradiente/vinheta radial ao redor de cada fonte de visão.
- **Memória de Posição:** Silhueta fantasma com efeito holográfico na última coordenada conhecida.
- **Alcance e Alvos:** Anel de mira pulsante contínuo.
- **Linha de Visada:** Feixe contínuo vetorial traçado do centro do atacante ao alvo. Mantida como comparador histórico.

### Opção C — Sombra Desaturada com Contornos de Destaque [TESTADA - NÃO APROVADA]
- **Fog of War:** A geografia e os obstáculos na área oculta permanecem visíveis em tons frios/dessaturados.
- **Memória de Posição:** Marcador fantasma com contorno pontilhado.
- **Alcance e Alvos:** Contorno neon de alto contraste. Mantida como comparador histórico.

### Justificativa da aprovação da Opção A pelo autor:
1. **Precisão tática indispensável:** em um jogo de estratégia em grade 31 × 17, saber exatamente se uma célula está dentro ou fora do campo de visão evita erros de posicionamento.
2. **Clareza de memória de alvos:** a marcação estrita `[?]` elimina ambiguidades quanto ao último bloco registrado na memória da IA ou do adversário.
3. **Não obstrução da arte:** o retículo de cantos de alvo destaca a unidade sem esconder seu modelo ou carta.
4. **Perfeita integração com movimentação por setas:** o controle direto bloco a bloco ganha resposta visual imediata de revelação de células táticas.
5. **Determinismo comprovado:** alternar entre A, B e C preserva rigorosamente o hash autoritativo em 2D e 3D.

---

## 4. Cenário de teste e critérios de aceitação

- **Mapa 31 × 17 com bases e obstáculos:**
  - P1 possui unidades com diferentes valores de VIS (ex: VIS 2, VIS 3, VIS 4);
  - Base de P1 com raio de visão quadrado de 5 blocos (`DEC-002`);
  - Obstáculos fixos e bases que bloqueiam a visão e a linha de ataque dos blocos posicionados atrás deles;
  - Unidades inimigas situadas em três categorias: (1) no campo de visão e no alcance; (2) no campo de visão mas fora do alcance; (3) na névoa fora do campo de visão (com e sem marcador de memória).
- **Critérios mensuráveis:**
  1. **Determinismo:** Nenhuma variação de apresentação de Fog ou alvos pode alterar o hash autoritativo do estado (`hashState(state)` imutável);
  2. **Independência de cor:** Informação de legalidade e bloqueio de linha de ataque deve ser comunicada por geometria, ícone ou texto além da cor;
  3. **Responsividade:** Funcional em 1920×1080 (desktop) e 800×1100 (narrow/mobile);
  4. **Paridade 2D e 3D:** Apresentação coerente tanto na visão top-down quanto na visão tática orbital 3D;
  5. **Sem aprovação antecipada:** Todas as opções permanecem formalmente `EM TESTE` até o autor avaliar o comparador executável e registrar sua decisão.

---

## 5. Implementação executável e validação auditada

O protótipo executável foi implementado em `prototypes/visual-005-fog-range-target-selection/index.html` com os seguintes diferenciais arquiteturais:

1. **Herança total do VIS-004:** Código reconstruído a partir da base completa de VIS-004 (2D/3D sincronizado, leitura de terreno Opção B como padrão aprovado, temporizador de regeneração de SPD +2 a cada 160 ticks / 8 s, pacote QoL completo e contrato de áudio).
2. **Escala canônica de atributos (GDD v0.43 Seção 5.5):** Unidades utilizam estritamente ATK e DEF entre 1 e 10, HP igual ao Nível (3 a 6), VIS de 3 a 5, SPD de 3 a 6 e RNG de 1 a 3. Nenhum valor de 100+ ou 1000+ está presente.
3. **Movimentação por setas do teclado:** As teclas direcionais (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`) permitem conduzir o monstro selecionado diretamente bloco a bloco, com validação de colisão e dedução de SPD em tempo real.
4. **Resultados em navegador real (Playwright / MsEdge):**
   - **Desktop (1920 × 1080):** 15 / 15 testes aprovados;
   - **Narrow / Mobile (800 × 1100):** 15 / 15 testes aprovados;
   - **Determinismo:** Hash autoritativo preservado identicamente ao alternar entre Opções A, B e C;
   - **Evidências visuais:** Capturas salvas no diretório de artefatos (`vis005_preview_optB.png`, `vis005_preview_optA.png`, `vis005_preview_optC.png`, `vis005_preview_3d.png`, `vis005_preview_narrow.png`).

