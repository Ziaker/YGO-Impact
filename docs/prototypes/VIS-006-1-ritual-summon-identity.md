# VIS-006.1 — Identidade Visual da Invocação Ritual

**Status:** **APROVADO PELO AUTOR (Opção B — Ascensão Cerimonial)**  
**Data da Decisão do Autor:** 2026-10-01  
**Executável Visual Oficial:** [prototypes/visual-006-1-ritual/index.html](../../prototypes/visual-006-1-ritual/index.html)  
**Pergunta Estética Central:** *"Como uma Invocação Ritual deve parecer visualmente em Monster Impact, distinguindo-se claramente da materialização comum?"*  
**Decisão Oficial do Autor:**
1. **Invocação Ritual — Opção B (Ascensão Cerimonial) [APROVADA]:** O autor aprovou formalmente a Opção B como a assinatura estética canônica de Invocação Ritual. Selo azul-celeste expande-se no solo ativando 4 pilares angulares de luz celestial; fitas luminosas volumétricas tecem uma câmara sagrada enquanto a silhueta da criatura ritual ascende do solo até repousar firme no tabuleiro.
2. **Comparadores Históricos:** Opção A (Ritual Sacrificial / Vórtice de Essência) e Opção C (Portal Arcano) permanecem preservadas no repositório executável como referências comparativas.
**Referência Canônica:** GDD v0.43 (Seção 18.3.3: *Invocações* — "Invocações importantes recebem efeitos visuais próprios; Ritual e Fusion devem ter apresentações visuais distintas") e núcleo autoritativo (`src/core/ritual.ts`).

---

## 1. Doutrina Metodológica e Escopo do Experimento

Seguindo estritamente a metodologia consolidada com o autor:
- **Pergunta Única e Focada:** Apenas a identidade estética e visual da Invocação Ritual no tabuleiro.
- **Isolamento Total de Regras:** Não testa custos, seleção de materiais da mão/campo, soma de níveis ou janelas de resposta (o harness técnico do VIS-006 já cobre 100% dessas regras matematicamente).
- **Sem Poluição de Interface:** Não há cartas flutuantes, seletores de mão, contadores matemáticos ou painéis disputando atenção.
- **Palco Fixo Congelado:** Tabuleiro 31×17 + grade tática + badges persistentes VIS-004 Opção A + câmera 2D/3D VIS-002 + bloco fixo `(7, 8)`.
- **Duração e Dinâmica:** 1300 ms (+38,5% mais rápido, sincronizado com o timing ágil do VIS-006).

---

## 2. As Opções e Decisões Canônicas (`index.html`)

Apresentadas na mesma cena, no mesmo enquadramento e sobre a mesma célula `(7, 8)`:

### Opção A — Ritual Sacrificial (Vórtice de Essência)
- **Identidade e Paleta:** Azul-safira ritual (`#2563eb`), cerúleo cintilante (`#3b82f6`), azul-celeste (`#93c5fd`) e luz pura (`#eff6ff`).
- **Fase 1 — Oferenda (0 a 300 ms):** O círculo-base expande múltiplos anéis concêntricos azuis com inscrições e glifos místicas girando no chão.
- **Fase 2 — Convergência (300 a 700 ms):** Linhas espirais de essência azul convergem dos anéis externos em direção ao centro em vórtice acelerado com brilho cerúleo.
- **Fase 3 — Ignição Cerúlea (700 a 1050 ms):** Coluna cônica de luz cerúlea no núcleo central de onde a criatura ritual se condensa solidamente.
- **Fase 4 — Fixação (1050 a 1300 ms):** A luz assenta e o monstro ritual fixa-se soberano, com os glifos azuis dissipando de forma elegante.

### Opção B — Ascensão Cerimonial (Pilares & Levitação)
- **Identidade e Paleta:** Azul-celeste sagrado (`#38bdf8`), cerúleo profundo (`#0284c7`), azul-safira (`#1d4ed8`) e luz pura (`#ffffff`).
- **Fase 1 — Selo Sagrado (0 a 300 ms):** O selo azul-celeste expande-se no solo, ativando 4 nós angulares de luz celestial nos cantos da célula.
- **Fase 2 — Fitas de Luz (300 a 700 ms):** Fitas luminosas volumétricas tecem uma câmara sagrada cilíndrica vertical ao redor do espaço.
- **Fase 3 — Ascensão (700 a 1050 ms):** A silhueta da criatura ritual ascende levitando do interior do solo através do feixe central.
- **Fase 4 — Fixação (1050 a 1300 ms):** O monstro assenta firme sobre o piso, as fitas dissolvem-se em partículas celestiais e os glifos dissipam-se suavemente.

### Opção C — Portal Arcano (Abismo Espelhado)
- **Identidade e Paleta:** Púrpura arcano (`#9333ea`), violeta cósmico (`#a855f7`) e poço dimensional estrelado.
- **Fase 1 — Fenda Cósmica (0 a 300 ms):** O solo da célula racha-se em fenda geométrica com brilho místico.
- **Fase 2 — Horizonte de Eventos (300 a 700 ms):** Abre-se um portal profundo espelhado revelando poço estrelado.
- **Fase 3 — Emergência (700 a 1050 ms):** A unidade emerge rompendo a superfície do portal.
- **Fase 4 — Fechamento (1050 a 1300 ms):** A fenda fecha-se no solo e o monstro firma-se na grade.

---

## 3. Exploração Futura / Não-Canônica / Fora do Escopo Atual

O protótipo atual do GDD v0.43 contempla estritamente **Normal, Tributo, Ritual e Fusão**. Sincro não integra o escopo oficial do primeiro protótipo. O experimento abaixo é preservado no executável unicamente como biblioteca estética para referências futuras:

### Opção D — Dupla Hélice em Prata & Ferro [FORA DO ESCOPO DO GDD v0.43]
- **Identidade e Paleta:** Prata lustrosa / platina (`#f8fafc` / `#cbd5e1`), ferro forjado / aço grafite (`#64748b` / `#334155`) e centelhas puras (`#ffffff`).
- **Geometria:** Dois filamentos helicoidais metálicos entrelaçados (defasagem angular de $180^\circ$) com aceleração angular progressiva e conicidade ($R = 24 \to 14$).
- **Pontes de Ressonância:** Degraus transversais luminosos conectando prata e ferro periodicamente com nós metálicos de energia.
- **Fases:** Selo metálico concêntrico $\to$ ascensão helicoidal acelerada com sintonia $\to$ materialização descendo do foco convergente superior $\to$ fixação sólida com dispersão de fagulhas prateadas.

---

## 3. Controles do Protótipo

- **Seletor de Proposta:** Alterna instantaneamente entre `[B] Ritual: Ascensão Cerimonial [Aprovado]`, `[D] Sincro: Dupla Hélice [Aprovado]`, `[A] Vórtice Sacrificial [Histórico]` e `[C] Portal Arcano [Histórico]`.
- **Barra de Reprodução:**
  - `Play / Pause` (tecla `Espaço`);
  - `Replay` (tecla `R`);
  - `Scrubber`: cursor de tempo de 0.0s a 1.3s para inspeção detalhada;
  - `Velocidade`: 1.0x (1300 ms) e 0.5x Slow-mo (2600 ms);
  - `Alternar Monstro`: Guerreiro Ritual / Mago Ritual;
  - `Alternar 2D/3D` (tecla `V`) e `Reset Câmera` (`⟲ Câmera`).
