# VIS-006 — Linguagem Visual-Base de Materialização de Monstros & Validação Espacial de Regras

**Status:** **APROVADO — Opção B (Círculo de Invocação) aprovada pelo autor em 2026-10-01 como padrão oficial de linguagem-base de materialização**  
**Responsável pela aprovação:** Autor do projeto  
**Data da decisão:** 2026-10-01  
**Padrão Oficial Aprovado:** **Opção B — Círculo de Invocação Místico (Refinamento de Referência de Produção)**  
**Opções Mantidas como Registro Histórico:** Opção A (Materialização Energética) e Opção C (Carta $\to$ Monstro)  
**Executável de Direção Visual:** [prototypes/visual-006-summons/index.html](../../prototypes/visual-006-summons/index.html)  
**Harness de Validação de Regras/QA:** [prototypes/visual-006-summons/qa-harness.html](../../prototypes/visual-006-summons/qa-harness.html)  
**Referência Canônica:** GDD v0.43 (Seção 18.3.3: *Invocações*, Seção 8: *Invocações e regras de campo*, Seção 14: *Zonas e transições* e Seção 15: *Correntes e Negações*) e núcleo autoritativo (`src/core/summon.ts`, `src/core/spatial.ts`).

---

## 1. Decisão do Autor e Escopo do Experimento

1. **Aprovação da Opção B como Linguagem-Base:**  
   O autor aprovou soberanamente a **Opção B (Círculo de Invocação Místico)** como a linguagem-base de materialização de monstros no mapa.
2. **Escopo Preciso (Conforme GDD v0.43 §18.3.3):**  
   O VIS-006 define a *linguagem visual-base de materialização* e não um efeito monótono universal forçado para todos os tipos de invocação. O GDD estabelece que Invocações importantes possuem identidade visual própria:
   - **Normal / Tributo:** Utilizam a apresentação comum/base aprovada neste experimento;
   - **Ritual (Subprotótipo Dedicado Posterior):** Terá identidade visual própria (círculo sacrificial, oferenda de níveis, ascensão);
   - **Fusion (Subprotótipo Dedicado Posterior):** Terá identidade visual própria (síntese e vórtice dual de materiais convergindo).
3. **Doutrina Metodológica Consolidada:**  
   *Uma pergunta visual pequena + mesma cena + três respostas visuais claramente diferentes + controles mínimos para observar a diferença.*  
   O tabuleiro 31×17, a grade tática, os badges persistentes de terreno (`×cost` da [Opção A do VIS-004](file:///C:/Users/zerke/.gemini/antigravity/worktrees/quirky-hertz/setup_ygo_impact/docs/prototypes/VIS-004-terrain-spd-advanced-movement.md)) e a câmera 2D/3D livre ([VIS-002](file:///C:/Users/zerke/.gemini/antigravity/worktrees/quirky-hertz/setup_ygo_impact/docs/prototypes/VIS-002-map-camera-2d-3d.md)) permanecem como **palco fixo de referência**, sem reaberturas.
4. **Separação Estrita Permanente:**  
   - `index.html`: Direção de arte pura e limpa;
   - `qa-harness.html`: Validação formal de regras e suíte de 20 testes Playwright (100% de aprovação).

---

## 2. Refinamento de Referência da Opção B Aprovada (Versão Limpa & Sem Poluição)

Atendendo ao feedback do autor (*"efeitos demais no B mas de resto aprovo"*), a Opção B foi refinada para eliminar excessos de poluição visual, mantendo a identidade arcana imponente, porém com leitura tática cristalina e estética sóbria:

### 2.1 Arquitetura em 5 Camadas do Selo Arcano (Limpo & Refinado)
- **Camada 1 — Anel Externo Elegante ($R = 38$):**  
  Anel circular duplo fino e limpo projetado no plano horizontal com 4 marcadores cardeais discretos em losango. Foram eliminadas as 48 marcas de tick radiais e os 4 arcos externos segmentados, removendo o ruído visual de "mostrador de relógio".
- **Camada 2 — Faixa Rúnica Intermediária ($R = 27.5$ a $34$):**  
  Banda concêntrica contendo **16 glifos arcanos vetoriais únicos** (Ankh Solar, Triskelion, Mercúrio, Olho Alquímico, Runa Algiz, Enxofre, Crescente de Júpiter, etc.). Os glifos iluminam-se sequencialmente em cascata horária na ativação e desvanecem suavemente na dissipação. Foram **removidas as linhas de energia radiais tipo "teia de aranha"**, despoluindo totalmente o piso da célula.
- **Camada 3 — Geometria Sagrada Central ($R = 13.5$ a $25.5$):**  
  Hexagrama limpo e nítido (dois triângulos equiláteros entrelaçados) com 6 nós pontuais sutis nos vértices ($r \approx 1.4\text{ px}$), sem linhas concêntricas internas repetitivas que tornavam o centro confuso.
- **Camada 4 — Núcleo Radiante Discreto ($R = 0$ a $7.5$):**  
  Estrela diamantada de 8 pontas compacta e elegante com gradiente radial de solo contido (sem estourar o contraste nem ofuscar as células vizinhas).
- **Camada 5 — Coluna de Luz Etérea ($z = 2.6$ blocos) & Brasas Sutis:**  
  Pilar vertical de luz suave e translúcido (6 painéis etéreos e feixe central sutil) com altura calibrada para **$z = 2.6$ blocos**, garantindo que a luz não bloqueie monstros vizinhos no tabuleiro 3D. Brasas reduzidas de 32 para **10 partículas sutis** e remoção da aura retangular pesada (`strokeRect`), permitindo que a silhueta natural e o sombreamento da unidade apareçam com total nitidez.

### 2.2 Velocidade e Timeline Otimizado (1300 ms, Ganho Real de +38,5%)
$$\text{Velocidade nova} = \frac{1800\text{ ms}}{1.35} \approx 1333\text{ ms} \implies \text{Duração adotada} = 1300\text{ ms} \quad (\approx +38,5\%\text{ de ganho real})$$

- **Fase 1 — Ativação (0 a 260 ms):** O selo acende de dentro para fora; núcleo surge, anéis expandem e as 16 runas iluminam-se sequencialmente em cascata circular horária.
- **Fase 2 — Sincronia (260 a 600 ms):** Anéis giram suavemente em sentidos opostos, geometria central respira de forma sutil e as 10 brasas orbitam suavemente a borda externa.
- **Fase 3 — Invocação (600 a 980 ms):** Clímax contido; pulso fino no solo, coluna etérea translúcida ascende a $z = 2.6$ blocos e o monstro materializa-se descendo suavemente.
- **Fase 4 — Dissipação (980 a 1300 ms):** A coluna de luz se recolhe ao solo, o monstro fixa-se 100% sólido e o selo perde intensidade de forma suave e elegante, deixando o campo limpo.
- **Modo Inspeção 0.5x:** Dura aproximadamente 2,6s, permitindo exame analítico quadro a quadro.

### 2.3 Projeção 3D e Visão 2D Top-Down
- **Em 3D:** Projetado matematicamente com `projectGround(dx, dy, dz)` ancorado no centro da célula `(7, 8)`, respeitando rigores de rotação, inclinação da câmera, zoom e pan sem deslizamento de piso.
- **Em 2D:** Visão superior ortogonal perfeita do mesmo selo de 5 camadas, preservando leitura e estética.

---

## 3. Rastreabilidade de Assets Locais

Conforme a política do projeto para recursos externos:
- **Origem do Asset de Referência:** OpenGameArt.org — *"4 summoning circles"* por Luke.RUSTLTD.
- **Licença:** CC0 1.0 Universal (Domínio Público).
- **Armazenamento:** Local em `prototypes/visual-006-summons/assets/` com metadados em `ASSET_METADATA.json`.
- **Implementação:** Zero dependência remota em runtime; reprodução 100% offline via renderizador Canvas de alto desempenho.

---

## 4. Validação das Regras Espaciais (`qa-harness.html`)

O harness funcional de engenharia permanece ativo, auditado e com 100% de sucesso na bateria de 20 testes:
1. Bases canônicas P1 em `(0, 8)` e P2 em `(30, 8)`;
2. Regra de âncora: 0 aliados $\to$ Base obrigatória; 1+ aliados $\to$ Base proibida, escolha de aliado;
3. Fallback determinístico até raio 4 (distâncias 2, 3 e 4 além da área original);
4. Desempate por escolha obrigatória do controlador (`ESCOLHA_OBRIGATORIA` com marcadores `[A]`, `[B]`);
5. Resolução de NEGAR: custos pagos mantidos no Cemitério sem devolução; monstro negado NÃO entra no mapa e NÃO vai ao Cemitério (`NOT_SUMMONED`);
6. 20/20 Testes Aprovados via Playwright em Microsoft Edge real.
