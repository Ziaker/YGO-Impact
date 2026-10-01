# VIS-006.2 — Identidade Visual da Invocação Fusão

**Status:** **APROVADO PELO AUTOR (Opção A — Vórtice Bicolor / Espiral de Polimerização)**  
**Data da Decisão do Autor:** 2026-10-01  
**Executável Visual Oficial:** [prototypes/visual-006-2-fusion/index.html](../../prototypes/visual-006-2-fusion/index.html)  
**Pergunta Estética Central:** *"Como uma Invocação Fusão deve parecer visualmente em Monster Impact, distinguindo-se claramente da materialização comum (VIS-006 B) e do Ritual (VIS-006.1 B)?"*  
**Decisão Oficial do Autor:**
1. **Invocação Fusão — Opção A (Vórtice Bicolor / Espiral de Polimerização) [APROVADA]:** O autor aprovou expressamente a Opção A como a assinatura estética canônica de Fusão. Duas correntes espirais complementares (carmesim ígneo e ciano safira) giram em vórtice acelerado descendente e fundem-se no centro em clarão violeta puro com anel de choque e condensação sólida da criatura.
2. **Comparadores Históricos:** Opção B (Colisão & Amálgama Elemental) e Opção C (Selo Alquímico de Transmutação) permanecem preservadas no repositório executável como referências comparativas.
**Referência Canônica:** GDD v0.43 (Seção 18.3.3: *Invocações* — "Invocações importantes recebem efeitos visuais próprios; Ritual e Fusion devem ter apresentações visuais distintas") e núcleo autoritativo de jogo.

---

## 1. Doutrina Metodológica e Escopo do Experimento

Seguindo estritamente a metodologia consolidada com o autor:
- **Pergunta Única e Focada:** Apenas a identidade estética e visual da Invocação Fusão no tabuleiro.
- **Isolamento Total de Regras:** Não testa custos de cartas de magia (como "Polimerização"), descarte da mão, envio de materiais ao Cemitério ou checagens de Extra Deck (o harness técnico do VIS-006 e o motor em TypeScript cobrem 100% dessas regras matematicamente).
- **Sem Poluição de Interface:** Não há cartas flutuantes, seletores de mão, popups de confirmação ou contadores numéricos disputando atenção.
- **Palco Fixo Congelado:** Tabuleiro 31×17 + grade tática + badges persistentes VIS-004 Opção A + câmera 2D/3D VIS-002 + bloco fixo `(7, 8)`.
- **Duração e Dinâmica:** 1300 ms (+38,5% mais rápido, sincronizado com o timing ágil do VIS-006 e VIS-006.1).

---

## 2. As Opções e Decisões Canônicas (`index.html`)

Apresentadas na mesma cena, no mesmo enquadramento e sobre a mesma célula `(7, 8)`:

### Opção A — Vórtice Bicolor (Espiral de Polimerização)
- **Conceito:** Inspirada na dinâmica clássica e icônica de polimerização: duas correntes helicoidais complementares que se aceleram em direção ao solo e se fundem em um turbilhão energético.
- **Paleta de Cores:** Carmesim/Laranja ardente (`#f43f5e` / `#fb923c`), Ciano/Safira cósmico (`#06b6d4` / `#3b82f6`) e clarão final em Violeta/Magenta puro (`#c026d3` / `#d946ef`).
- **Fase 1 — Turbilhão Bicolor (0 a 300 ms):** Dois anéis espirais complementares nascem nas extremidades da célula com emissão de partículas orbitais bicolores.
- **Fase 2 — Torsão & Convergência (300 a 700 ms):** As duas correntes espiralam conicamente em direção ao piso, entrelaçando-se em alta velocidade angular.
- **Fase 3 — Fusão de Plasma & Anel de Choque (700 a 1050 ms):** Ao convergirem no centro, as energias colidem e fundem-se em um flash violeta com onda de choque expansiva; a criatura fundida condensa-se solidamente.
- **Fase 4 — Fixação & Filamentos Residuais (1050 a 1300 ms):** A criatura assenta com firmeza e filamentos residuais de energia violeta orbitam suavemente até dissolverem.

### Opção B — Colisão & Amálgama Elemental
- **Conceito:** Uma abordagem de alta energia e impacto físico: dois núcleos densos de matéria surgem nos flancos opostos da célula e aceleram em rota de colisão frontal.
- **Paleta de Cores:** Plasma Âmbar/Laranja (`#f59e0b` / `#fb923c`), Púrpura Profundo (`#7c3aed` / `#c084fc`) e luz pura (`#ffffff`).
- **Fase 1 — Carga dos Núcleos (0 a 300 ms):** Dois núcleos densos de matéria manifestam-se flutuando nas bordas leste e oeste da célula com arcos elétricos.
- **Fase 2 — Aceleração Frontal (300 a 650 ms):** Os dois núcleos deixam caudas cinéticas de alta velocidade e aceleram parabolicamente em rota de colisão no centro.
- **Fase 3 — Impacto de Ponto Zero (650 a 1000 ms):** Colisão frontal violenta: esfera volumétrica de choque translúcida expande-se, gerando centelhas radiais enquanto a criatura se forma no epicentro da explosão controlada.
- **Fase 4 — Fixação Gravitacional & Resfriamento (1000 a 1300 ms):** A onda dissipa, o campo térmico esfria e a criatura solidifica-se firmemente no solo.

### Opção C — Selo Alquímico de Transmutação
- **Conceito:** Abordagem hermética e mística: círculos e triângulos alquímicos concêntricos que giram em direções opostas até alcançarem o travamento geométrico de transmutação.
- **Paleta de Cores:** Dourado Alquímico (`#ffd166` / `#f59e0b`), Safira e Violeta Arcano (`#a855f7` / `#d946ef`).
- **Fase 1 — Círculos Opostos (0 a 300 ms):** Dois anéis e triângulos concêntricos giram em sentidos horários e anti-horários no piso.
- **Fase 2 — Acoplamento Geométrico (300 a 700 ms):** As geometrias aceleram até que seus vértices se alinham num ângulo exato; travamento instantâneo com pulso estático luminoso.
- **Fase 3 — Transmutação Prismática Vertical (700 a 1050 ms):** Ergue-se um prisma hexagonal de luz facetada dentro do qual a silhueta da criatura fundida é sintetizada de cima para baixo.
- **Fase 4 — Fixação Cristalina & Dissipação (1050 a 1300 ms):** As faces do prisma dissolvem-se em prismas de luz que sobem ao ar, revelando a criatura fundida assentada na grade.

---

## 3. Controles do Protótipo Visual

- **Seletor de Proposta:** Alterna instantaneamente entre `[A] Vórtice Bicolor (Polimerização)`, `[B] Colisão & Amálgama Elemental` e `[C] Selo Alquímico de Transmutação`.
- **Barra de Reprodução:**
  - `Play / Pause` (tecla `Espaço`);
  - `Replay` (tecla `R`);
  - `Scrubber`: cursor de tempo de 0.0s a 1.3s para inspeção detalhada;
  - `Velocidade`: 1.0x (1300 ms) e 0.5x Slow-mo (2600 ms);
  - `Alternar Monstro`: Guerreiro de Fusão / Dragão de Fusão;
  - `Alternar 2D/3D` (tecla `V`) e `Reset Câmera` (`⟲ Câmera`).
