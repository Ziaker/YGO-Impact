# Monster Impact — VIS-006 · Linguagem Visual-Base de Materialização & Validação Espacial

Este diretório contém os artefatos do sexto experimento visual e mecânico de *Monster Impact*, estruturados conforme a **nova metodologia de protótipos**:
1. **`index.html` (Protótipo Visual Limpo):** Responde à pergunta estética *"Qual deve ser a linguagem visual-base de materialização de monstros no mapa?"*, comparando três linguagens visuais sobre o **palco de referência fixo** (tabuleiro 31×17, grade tática, badges VIS-004 Opção A e câmera 2D/3D VIS-002).
   - **Nota de Escopo:** Conforme o GDD v0.43 (§18.3.3), Invocações importantes recebem efeitos próprios (Normal/Tributo recebem a apresentação comum/base, enquanto Ritual e Fusão receberão apresentações e identidades visuais distintas modeladas em subprotótipos posteriores sobre esta mesma base).
2. **`qa-harness.html` (Harness de Engenharia / QA):** Responde à pergunta funcional *"Como a mecânica de Invocação funciona perante o GDD v0.43?"*, cobrindo âncoras, fallback, desempate pelo controlador e resolução de NEGAR com 20 testes automatizados.

---

## 1. Estado do Experimento

- **Status:** **APROVADO — Opção B (Círculo de Invocação Místico) aprovada pelo autor em 2026-10-01 como padrão oficial de linguagem-base de materialização**.
- **Herança de contratos anteriores consolidados:**
  1. **VIS-001:** Layout e HUD principal na versão melhorada;
  2. **VIS-002:** Orientação 2D top-down ortogonal e 3D tático com câmera livre selecionáveis in-game;
  3. **VIS-003:** Opção A — área cheia aprovada para alcançabilidade de movimento;
  4. **VIS-004:** Opção A — badge persistente de custo no bloco aprovada para leitura de terreno e SPD;
  5. **VIS-005:** Opção A — grade tática estrita com retículo de cantos de alvos e marcadores `[?]` aprovada como padrão de visão compartilhada;
  6. **VIS-006 (Estético):** **Opção B aprovada e refinada com qualidade de versão final** (selo de 5 camadas, 1300 ms, +38,5% de velocidade); Opções A e C mantidas como registro histórico;
  7. **VIS-006 (Engenharia):** Regras de âncoras, bases `(0, 8)`/`(30, 8)`, fallback até raio 4, empate com escolha obrigatória do controlador e NEGAR 100% validadas em `qa-harness.html`.

---

## 2. Padrão Aprovado & Registros Históricos (`index.html`)

Apresentadas na mesma cena, no mesmo enquadramento, sobre o bloco de destino `(7, 8)`:

### Opção B — Círculo de Invocação Místico (PADRÃO OFICIAL APROVADO — VERSÃO LIMPA)
Arquitetura em **5 camadas de renderização limpas e refinadas** com timeline otimizado para **1300 ms** (+38,5% mais rápido), despoluída atendendo ao feedback do autor (*"efeitos demais no B mas de resto aprovo"*):
- **Camada 1 (Anel Externo, $R=38$):** Anel circular duplo fino e elegante com 4 marcadores cardeais discretos em losango (sem ruído de marcas de tick ou arcos externos fragmentados).
- **Camada 2 (Faixa Rúnica, $R=27.5-34$):** Banda concêntrica com **16 glifos arcanos vetoriais únicos** (Ankh, Triskelion, Mercúrio, Algiz, Enxofre, Júpiter, etc.) que se acendem sequencialmente em cascata horária na ativação (sem teias de aranha ou linhas radiais cruzando o chão).
- **Camada 3 (Geometria Sagrada, $R=13.5-25.5$):** Hexagrama equilátero nítido e elegante com 6 nós luminosos pontuais sutis nos vértices.
- **Camada 4 (Núcleo Radiante, $R=0-7.5$):** Estrela diamantada de 8 pontas discreta sobre gradiente radial de solo contido e suave.
- **Camada 5 (Coluna Etérea e Brasas Sutis):** Pilar vertical suave de 6 painéis translúcidos ascendendo a $z = 2.6$ blocos (não obstrui visão do mapa nem unidades vizinhas), feixe central sutil e apenas **10 brasas delicadas** ascendentes ($r = 0.9-1.3\text{ px}$), sem caixas rígidas de aura ao redor da unidade.
- **Timeline de 4 Fases (1300 ms):**
  - *Fase 1 (0–260 ms):* Ativação e despertar sequencial dos glifos;
  - *Fase 2 (260–600 ms):* Sincronia, contra-rotação suave e acúmulo de energia;
  - *Fase 3 (600–980 ms):* Clímax contido, coluna etérea até $z=2.6$ blocos e descida do monstro com silhueta e sombreamento nítidos;
  - *Fase 4 (980–1300 ms):* Solidificação completa da unidade e dissipação suave do selo.
- **Asset de Referência:** *4 summoning circles* por Luke.RUSTLTD (OpenGameArt.org, Licença CC0 1.0 Universal), arquivado localmente em `assets/cand1_circles/`.

### Opção A — Materialização Energética (Registro Histórico)
- **Fase 1 (Surgimento):** Escaneamento vertical por wireframe ciano translúcido com linhas de grade.
- **Fase 2 (Convergência):** Partículas de energia e lasers de varredura convergem das bordas da célula para o centro.
- **Fase 3 (Condensação):** O monstro se solidifica através de um flash ciano brilhante com dupla onda de choque horizontal e anéis pulsantes no chão.

### Opção C — Carta $\to$ Monstro (Registro Histórico)
- **Fase 1 (Surgimento):** Uma carta física de TCG em alta resolução levita e gira no ar sobre o bloco de destino com borda iluminada.
- **Fase 2 (Convergência):** A carta se desintegra em um vórtice de 36 fragmentos cósmicos (shards) magenta e púrpura que orbitam aceleradamente em espiral descendente.
- **Fase 3 (Condensação):** Os fragmentos colidem no centro provocando uma explosão de impacto cósmico no piso da célula, revelando o monstro.

---

## 3. Controles do Protótipo Visual (`index.html`)

- **Seletor A / B (Aprovado) / C (Topo):** Alterna instantaneamente a linguagem visual do efeito (Opção B é o padrão aprovado).
- **Botão Reproduzir / Pausar (`Espaço`):** Inicia ou pausa a animação no frame atual.
- **Botão Replay (`R`):** Reinicia a animação do início.
- **Barra de Progresso (Scrubber):** Permite arrastar manualmente o cursor de tempo de 0.0s a 1.3s para inspeção detalhada de cada fase.
- **Velocidade (1.0x / 0.5x Slow-mo):** Alterna velocidade normal (1.3s) ou câmera lenta (2.6s).
- **Alternar Monstro (Guerreiro / Mago):** Testa a mesma animação em silhuetas e arquétipos distintos.
- **Alternar 2D / 3D (`V`):** Alterna entre visão 3D tática livre e visão 2D top-down ortogonal.
- **Reset Câmera (`C`):** Restaura o enquadramento de câmera padrão centralizado no bloco de invocação.

---

## 4. Validação das Regras Espaciais (`qa-harness.html`)

Para testar as regras matemáticas de jogo sem poluir o protótipo visual, abra o arquivo `qa-harness.html`:
- Bases canônicas P1 em `(0, 8)` e P2 em `(30, 8)`;
- Âncora Normal: 0 aliados $\to$ Base obrigatória; 1+ aliados $\to$ Base proibida, escolha de aliado;
- Fallback determinístico até raio 4 (distâncias 2, 3 e 4 além da área original);
- Desempate de fallback: sistema retorna `ESCOLHA_OBRIGATORIA` sem seleção automática; o jogador decide;
- Resolução de NEGAR: custos pagos permanecem pagos no Cemitério; monstro negado NÃO entra no mapa e NÃO vai ao Cemitério (`NOT_SUMMONED`);
- Tecla `T`: Executa os 20 testes automatizados no console e na interface.
