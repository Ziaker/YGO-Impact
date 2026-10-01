# VIS-007 — Identidade Visual do Combate: Microprotótipos por Elemento Visual

**Status:** **EM AVALIAÇÃO PELO AUTOR (Opções A, B e C para cada Elemento EL-1 a EL-7)**  
> [!NOTE]
> **Metodologia de Microprotótipos por Elemento (2026-10-01):** Conforme diretriz explícita do autor, o combate não é mais apresentado como um "pacote fechado" ou "tech demo 3D". Em vez disso, cada elemento visual atômico do combate é isolado e recebe 3 opções gráficas próprias (A / B / C) sobre o mesmo palco 3D e câmera de referência congelados (aprovados no VIS-ENV-001). A estética prioriza clareza tática 2D-like, silhuetas limpas, curta duração e ausência de poluição volumétrica.
**Data do Documento:** 2026-10-01  
**Executável Visual Oficial:** [prototypes/visual-007-combat/index.html](../../prototypes/visual-007-combat/index.html)  
**Referência Canônica:** GDD v0.43 (Seção 18.3.3: *Combate, ataque e animações de resolução*), `DEC-003` e núcleo autoritativo de combate (`src/core/combat.ts`, `src/core/battle.ts`).

---

## 1. Princípios de Linguagem e Metodologia

O autor rejeitou a abordagem de pacotes macro tridimensionais ("3D demais, volumétricos e com excesso de ruído"). A nova arquitetura segue quatro regras obrigatórias:

1. **Palco Fixo Congelado:** Câmera 3D e ambiente-base herdados do VIS-ENV-001 mantidos fixos como palco de referência ("a câmera está perfeita; o ambiente/base visual atual está aprovado como palco de referência").
2. **Overlay Gráfico 2D Sincronizado:** Todos os efeitos de combate são projetados com traçado vetorial 2D de alta definição (`CanvasRenderingContext2D`) mapeado no espaço de tela sobre as coordenadas dos blocos 3D (`toScreen(worldPos)`), garantindo nitidez visual sem a névoa de partículas ou shaders volumétricos genéricos.
3. **Decisão Atômica por Elemento:** Cada componente visual do confronto é testável e votável separadamente pelo autor em 3 alternativas (A, B ou C).
4. **Legibilidade Tática Extrema:** Duração curta (150 ms a 450 ms por efeito), silhuetas limpas, sem screen-shake excessivo e preservação total das coordenadas e badges táticos da grade 31 × 17.

---

## 2. Microprotótipos por Elemento Visual em Comparação

### EL-1 — Foco / Seleção de Alvo
Como o alvo a ser atacado é destacado graficamente antes ou durante a confirmação do ataque.

- **Opção A — Retícula Tática Circular:** Dupla circunferência concêntrica com anel externo pulsante e quatro marcas cardeais de travamento.
- **Opção B — Spotlight Gráfico + Vetor Tracejado:** Feixe de destaque translúcido descendo sobre a célula do defensor com vetor tracejado contínuo ligando o atacante ao alvo.
- **Opção C — Cantoneiras Táticas (Bracket Corners):** Quatro brackets geométricos nítidos que se fecham nos vértices do bloco do defensor em 150 ms.

### EL-2 — Ataque Melee / Investida
Como o golpe corpo a corpo ou aproximação física do atacante é comunicado.

- **Opção A — Slash Gráfico em Arco Limpo:** Lâmina curva estilizada desenhando um arco vetorial luminoso e veloz com afunilamento nas pontas.
- **Opção B — Snap/Dash com Rastro Angular:** Rastro de velocidade com silhuetas vetoriais angulares e sombra cinética projetada no piso da grade.
- **Opção C — Estocada Rápida (Thrust) com Burst Focal:** Vetor cônico afiado disparado frontalmente contra o centro da célula inimiga com micro-linhas de convergência.

### EL-3 — Ataque Ranged / Projétil
Como projéteis ou ataques à distância viajam pelo tabuleiro tático.

- **Opção A — Dardo Gráfico com Rastro Sólido:** Projétil em forma de losango estilizado com cauda sólida que desvanece de forma linear.
- **Opção B — Feixe Retilíneo Vetorial Instantâneo:** Traço de laser nítido de espessura constante que conecta o atacante ao defensor por 120 ms.
- **Opção C — Orbe Rúnico de Pulso Concêntrico:** Esfera geométrica plana circundada por anéis concêntricos que viajam em velocidade constante.

### EL-4 — Impacto / Hit
Como o momento do impacto físico ou mágico é registrado sobre a unidade defensora.

- **Opção A — Starburst Geométrico com Micro-Shake:** Explosão estelar de 8 pontas geométricas pontiagudas acompanhada de micro-vibração amortecida de 2px (60 ms).
- **Opção B — Cross Slash em X com Hit-Stop (60 ms):** Duplo corte em X fluorescente de alto contraste com breve congelamento tático momentâneo da ação.
- **Opção C — Onda de Choque Plana Concêntrica:** Anel expansivo plano projetado rente ao solo do bloco sem nenhuma oclusão vertical da unidade.

### EL-5 — Feedback de Dano / Numerais
Como a perda de vida (HP) é exibida numericamente para os jogadores.

- **Opção A — Pop Vertical Clássico:** Numeral em alto contraste (`-4 HP`) que sobe verticalmente em linha reta com sombra projetada e fade-out.
- **Opção B — Recuo Direcional Parabólico:** Numeral que salta em trajetória parabólica na direção oposta ao golpe antes de se dissipar.
- **Opção C — Badge Tático em Moldura Geométrica:** Caixa retangular semitransparente com borda reforçada e tipografia tática (`-4 HP`).

### EL-6 — Revide / Contra-Ataque
Como a resposta imediata simultânea do defensor é sinalizada visualmente.

- **Opção A — Badge Tático "REVIDE!" + Golpe Espelhado:** Etiqueta gráfica de alerta no topo do defensor seguida de réplica imediata em direção ao atacante.
- **Opção B — Ricochete de Faíscas Planas:** Barreira de deflexão plana com faíscas geométricas que rebatem o impacto de volta ao atacante.
- **Opção C — Vetor Luminoso Duplo Simultâneo:** Duplo feixe vetorial de cores opostas colidindo e cruzando-se no centro entre as duas células.

### EL-7 — Alvo Indefeso / Vulnerável
Como o estado de alvo sem capacidade de revide (alvo em DEF ou sem alcance) é comunicado.

- **Opção A — Escudo Partido Estilizado:** Ícone gráfico de escudo dividido ao meio com partículas geométricas caindo no solo.
- **Opção B — Silhueta Escurecida Temporária ("Vulnerável"):** Sombra plana sobre a unidade acompanhada da legenda sutil `VULNERÁVEL`.
- **Opção C — Insígnia Tática "GOLPE LIMPO":** Marcador angular com texto tático `GOLPE LIMPO` e moldura pontilhada no bloco.

---

## 3. Controles e Ferramentas Analíticas do Protótipo

- **Seletor de Elementos:** Botões dedicados no topo para alternar instantaneamente entre `EL-1` e `EL-7`.
- **Seletor de Opções:** Botões `Opção A`, `Opção B` e `Opção C` para visualização isolada ou comparativa.
- **Reprodução:** Play / Pause (`Espaço`), Replay (`R`), Scrubber de precisão milimétrica.
- **Velocidade:** `1.0x` (velocidade normal de jogo) e `0.5x` (câmera lenta para auditoria quadro a quadro).
- **Projeção:** Alternância imediata entre Câmera 3D de referência e Projeção 2D Top-Down (`V`).
