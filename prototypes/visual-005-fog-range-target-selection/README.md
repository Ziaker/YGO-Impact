# Monster Impact — VIS-005 · VIS compartilhada, Fog of War, alcance e seleção de alvos

Protótipo executável interativo do quinto experimento visual de Monster Impact. **Construído sobre a base de código integral do VIS-004**, herdando seu renderizador híbrido 2D Canvas e 3D tático, sistema de câmera livre com presets, pacote completo de QoL, leitura de terreno com Opção A como padrão aprovado e contrato de áudio.

---

## 1. Estado do experimento

- **Status:** **APROVADO — Opção A (Grade Tática Estrita com cantos de alvos e marcadores [?])** pelo autor em 2026-09-30.
- **Herança de contratos anteriores já aprovados:**
  1. **VIS-001:** Layout e HUD principal na versão melhorada;
  2. **VIS-002:** Orientação 2D top-down ortogonal e 3D tático com câmera livre selecionáveis in-game sobre o mesmo estado lógico;
  3. **VIS-003:** Opção A — área cheia aprovada para alcançabilidade de movimento;
  4. **VIS-004:** Opção A — badge persistente de custo no bloco aprovada para leitura de terreno e SPD;
  5. **Núcleo Autoritativo:** `visibility.ts`, `fog.ts`, `geometry.ts`, `attack.ts` e `combat.ts`.

---

## 2. Valores Numéricos e Fixtures de Cenário (GDD v0.43)

Em conformidade com o GDD v0.43 e o núcleo autoritativo TypeScript:
- **Nenhum atributo de monstro utiliza centenas ou milhares (1000+, 1400, etc.)**. O jogo adota números inteiros legíveis.
- **Escala de atributos:** O GDD opera tipicamente na faixa de ~1 a 20 (sem teto artificial de 10) e admite valores negativos (`DEC-003`). No cenário de teste deste protótipo, as unidades foram configuradas como **fixtures de teste** com ATK/DEF entre 1 e 7 para clareza visual e simplicidade de verificação.
- **Nível:** 3 a 6 (monstros deste cenário).
- **HP base:** Igual ao Nível da unidade (ex.: Nível 4 = 4 HP).
- **MP base:** 0 para monstros Normais; `2 + floor(Nível / 2)` para monstros de Efeito.
- **VIS (Visão):** 1 a 5 blocos.
- **SPD (Velocidade):** 1 a 7 blocos.
- **RNG (Alcance básico de ataque):** 1 a 3 blocos.

---

## 3. Movimentação do Protótipo: Mouse Primário e Atalho por Setas

- **Fluxo Primário (Mouse):** Selecionar unidade com clique, inspecionar blocos com hover para ver custos e alcance, travar destino com clique e confirmar com botão CONFIRMAR, tecla `Enter` ou duplo clique.
- **Atalho Auxiliar de QA/Teste (Setas direcionais):**
  - **Seta para Cima (`ArrowUp`):** Move 1 bloco para o Norte (`y - 1`);
  - **Seta para Baixo (`ArrowDown`):** Move 1 bloco para o Sul (`y + 1`);
  - **Seta para Esquerda (`ArrowLeft`):** Move 1 bloco para o Oeste (`x - 1`);
  - **Seta para Direita (`ArrowRight`):** Move 1 bloco para o Leste (`x + 1`).

O deslocamento por setas respeita as regras autoritativas: limites do mapa, obstáculos, bloqueio por aliados/inimigos, dedução de SPD por terreno e bloqueio de novo movimento caso o SPD fique negativo.

---

## 4. Apresentação visual e alternativas de Fog e Alvos

As três opções operam sobre os mesmos dados autoritativos e **preservam idêntico hash de estado (`hashState(state)`)**:

- **Opção A — Grade Tática Estrita [APROVADA - PADRÃO INICIAL]:**
  - Névoa opaca por células quadradas discretas cobrindo blocos fora do alcance de visão;
  - Memória de posição: marcador quadrado pontilhado com `[?]` no bloco onde o inimigo foi visto pela última vez;
  - Alcance e alvos: retículo nos cantos das células em alcance; cantos em alvos válidos;
  - Trajetória de ataque indicada por células destacadas na grade.

- **Opção B — Gradiente Suave com Feixe Dinâmico de Visada [TESTADA - NÃO APROVADA]:**
  - Névoa com vinheta suave e gradiente radial ao redor dos monstros e da base;
  - Memória de posição: fantasma holográfico translúcido na última coordenada conhecida;
  - Alcance e alvos: anel de mira circular dinâmico sobre alvos válidos;
  - Linha de ataque: feixe vetorial. Mantida como comparador histórico.

- **Opção C — Sombra Dessaturada com Contornos de Destaque [TESTADA - NÃO APROVADA]:**
  - O terreno e obstáculos na névoa permanecem visíveis em tom frio/dessaturado (geografia estática conhecida pelo jogador);
  - Unidades inimigas na névoa ficam 100% ocultas até serem reveladas;
  - Memória de posição: silhueta com contorno pontilhado;
  - Alvos válidos ganham contorno neon de alto contraste (silhouette outline);
  - Linha de ataque discreta com telemetria e previsão de combate completas no painel lateral.

---

## 5. Controles do Protótipo

- **Clique em unidade aliada (P1):** Seleciona a unidade para movimentação e projeta visão/alcance;
- **Clique em unidade adversária (P2):** Seleciona como alvo de ataque e calcula linha de visão e combate;
- **Clique em bloco vazio:** Trava destino para rota de movimento com mouse;
- **Setas direcionais (`↑`, `↓`, `←`, `→`):** Atalho auxiliar de QA para mover a unidade selecionada bloco a bloco;
- **Tecla `Enter`:** Confirma a rota de movimento travada;
- **Tecla `Escape`:** Cancela o planejamento travado ou desmarca alvo;
- **Tecla `Tab`:** Alterna ciclicamente entre alvos inimigos;
- **Teclas `1`, `2`, `3`:** Alterna entre visualização **2D Top-down**, **3D Tático** e **QA Comparador**;
- **Botões A / B / C:** Alternam os modos visuais de Fog e Alvos sem alterar o hash do jogo;
- **Tecla `T`:** Executa a suíte de testes embutida (16 testes).
