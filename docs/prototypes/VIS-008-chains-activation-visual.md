# VIS-008 — Identidade Visual de Resolução: Microprotótipos por Elemento Visual

**Status:** **EM AVALIAÇÃO PELO AUTOR (Opções A, B e C para cada Elemento EL-8 a EL-10)**  
> [!NOTE]
> **Metodologia de Microprotótipos por Elemento (2026-10-01):** Conforme determinação explícita do autor, os efeitos visuais de resolução, destruição, impacto na base e elos de corrente foram desacoplados em elementos atômicos com 3 opções gráficas próprias (A / B / C) sobre o mesmo palco 3D e câmera de referência congelados (VIS-ENV-001).
**Data do Documento:** 2026-10-01  
**Executável Visual Oficial:** [prototypes/visual-008-chains/index.html](../../prototypes/visual-008-chains/index.html)  
**Referência Canônica:** GDD v0.43 (Seção 14: *Sistema de Correntes e Resoluções*, Seção 18.3.3: *Correntes e Cross Chains completas*), núcleo autoritativo de ativação e correntes (`src/core/activation.ts`, `src/core/chain.ts`).

---

## 1. Princípios de Linguagem e Metodologia

Os efeitos visuais de resolução abandonam o visual de "tech demo 3D pesada" (sem nuvens maciças de partículas, sem modelos 3D giratórios desnecessários e sem relógios volumétricos espalhafatosos). A nova abordagem foca em:

1. **Linguagem Gráfica 2D-like:** Desenhada no overlay de alta densidade posicionado perfeitamente sobre a grade do tabuleiro 3D de referência.
2. **Escala Física Coerente na Destruição:** Quando o monstro é destruído, o modelo 3D no tabuleiro contrai ou desaparece de forma limpa, acompanhando o efeito gráfico 2D sem ambiguidades sobre a permanência da peça no campo.
3. **Enquadramento Focado no Impacto de Base:** Quando o impacto na base é avaliado, a câmera foca diretamente o console da base ($X = 26.5$) para permitir leitura nítida do anel e dos 5 pontos vitais de impacto.
4. **Resolução Reversa LIFO Cristalina:** A ordem de resolução das Correntes (último ativado = primeiro a resolver) é apresentada com badges compactos, conectores de piso ou cards sem obstruir a visão tática do tabuleiro.

---

## 2. Microprotótipos por Elemento Visual em Comparação

### EL-8 — Destruição do Monstro
Como a remoção de uma unidade derrotada por combate ou efeito é comunicada graficamente.

- **Opção A — Dissolução Gráfica com Fade-Out:** A unidade reduz sua opacidade gradualmente acompanhada de partículas geométricas planas que sobem suavemente e a malha 3D reduz a zero.
- **Opção B — Fragmentação Geométrica Plana (Shards 2D):** A unidade estilhaça-se em fragmentos poligonais 2D estilizados que se dispersam radialmente em direção às bordas do bloco.
- **Opção C — Colapso Luminoso para o Pedestal:** A unidade contrai verticalmente em direção ao piso do bloco acompanhada de um pulso de luz plano no perímetro do pedestal.

### EL-9 — Impacto na Base / Dano Direto
Como o golpe direto que avança na condição de vitória (5 impactos) se manifesta sobre a base da arena.

- **Opção A — Pulso de Onda Plana no Anel da Base:** Um anel luminoso expansivo concêntrico percorre o perímetro circular da base com brilho dourado e retorno amortecido.
- **Opção B — Rachadura Gráfica com Flash de Alerta:** Um padrão de fissura vetorial projeta-se sobre a superfície da base com um flash vermelho estilizado de alarme crítico.
- **Opção C — Marcador Numérico Flutuante ("IMPACTO 1/5"):** Badge tático com contador progressivo que surge acima do núcleo da base acompanhado de um indicador de ponto preenchido.

### EL-10 — Elos de Corrente LIFO (Chains)
Como o empilhamento de respostas e a resolução sequencial do último para o primeiro (LIFO) são apresentados visualmente.

- **Opção A — Badges Numéricos Sobrepostos Planos:** Badges táticos compactos (`CL1`, `CL2`, `CL3`) flutuando sobre as respectivas unidades no espaço de tela, resolvendo em ordem reversa com breve pulso de clarão.
- **Opção B — Conector Gráfico Vetorial no Piso:** Linha vetorial plana de traço segmentado que corre no solo conectando as unidades ativadoras, retraindo-se na ordem LIFO.
- **Opção C — Faixa Gráfica Compacta no Topo com Cards 2D:** Pequena régua superior no HUD exibindo a sequência dos cards ativados, piscando e desaparecendo do topo para a base na resolução.

---

## 3. Controles e Ferramentas Analíticas do Protótipo

- **Seletor de Elementos:** Botões dedicados no topo para alternar instantaneamente entre `EL-8`, `EL-9` e `EL-10`.
- **Seletor de Opções:** Botões `Opção A`, `Opção B` e `Opção C` para visualização isolada.
- **Reprodução:** Play / Pause (`Espaço`), Replay (`R`), Scrubber de precisão milimétrica.
- **Velocidade:** `1.0x` (velocidade normal de jogo) e `0.5x` (câmera lenta para auditoria).
- **Projeção:** Alternância imediata entre Câmera 3D de referência e Projeção 2D Top-Down (`V`).
