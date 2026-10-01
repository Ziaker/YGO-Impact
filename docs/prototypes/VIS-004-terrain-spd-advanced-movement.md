# VIS-004 — Terreno, SPD e movimento avançado

**Status:** **APROVADO — Opção A (badge persistente de custo no bloco)**  
**Data da decisão:** 2026-09-30  
**Responsável pela aprovação:** Autor do projeto  
**Escopo do experimento:** apresentação de terreno com custo especial, entrada legal com SPD negativo, recuperação de SPD a 20 Hz, movimento como Reação e pacote completo de qualidade de uso (QoL).  
**Executável de referência:** `../../prototypes/visual-004-terrain-spd-advanced-movement/index.html`

---

## 1. Contexto e herança de decisões

O VIS-004 dá continuidade à série de protótipos visuais de Monster Impact, construindo sobre as decisões já formalizadas:

- **VIS-001:** composição de campo e HUD principal aprovada na versão melhorada;
- **VIS-002:** coexistência de **2D top-down ortogonal** e **3D tático com câmera livre** selecionáveis in-game sobre o mesmo estado lógico plano;
- **VIS-003:** **Opção A — área cheia** aprovada como apresentação dos blocos alcançáveis em grade quadrangular;
- **GDD v0.43:** regras de SPD (1 SPD = 1 bloco em custo-base), SPD negativo (sem piso universal; novo movimento bloqueado até SPD ≥ 1; ações normais permitidas), recuperação (pacotes de +2 SPD após 160 ticks / 8 s de ociosidade; perda de excedente; reinício por movimento ou Ação), e movimento como Reação (1 Reação + SPD de deslocamento).

---

## 2. Decisão de leitura de terreno e alternativas testadas

O autor avaliou e testou as três abordagens sob as mesmas condições e aprovou formalmente a **Opção A**:

- **Opção A — Badge persistente [APROVADA - PADRÃO VIGENTE]:** O terreno recebe badge numérico de custo permanente em cada bloco aplicável (`×cost`) com tint diferenciado. Garante identificação espacial imediata de zonas de alto custo e gargalos no campo sem depender de traçar rotas prévias.
- **Opção B — Custo mostrado no caminho [TESTADA - NÃO APROVADA]:** Custo incremental e acumulado exibidos nos passos da rota planejada. Mantida como comparador histórico no executável e nos testes.
- **Opção C — Leitura sutil / painel [TESTADA - NÃO APROVADA]:** O mapa exibe apenas contorno/tint discreto, concentrando custos no painel e tooltips contextuais. Mantida como comparador histórico.

### Justificativa da aprovação da Opção A pelo autor:
1. **Leitura imediata da geografia tática:** permite identificar instantaneamente onde estão as penalidades de custo no mapa inteiro sem depender de rota traçada.
2. **Avaliação rápida de posicionamento:** facilita prever se avançar em certa direção exigirá múltiplos turnos de recuperação de SPD antes de iniciar o planejamento.
3. **Acessibilidade reforçada:** número explícito gravado diretamente no bloco não depende exclusivamente de cor.
4. **Compatibilidade visual total:** funciona consistentemente tanto em 2D ortogonal quanto em 3D livre e em viewport estreita.
5. **Determinismo preservado:** alternar entre as opções A, B e C preserva rigorosamente o hash autoritativo do estado do jogo.

> [!NOTE]
> Os valores numéricos de custo utilizados no Campo QA (ex: custo 5, 8, etc.) são **fixtures de teste de QA** para exercitar entradas caras e SPD negativo. O GDD v0.43 não define um custo genérico universal para todos os terrenos; portanto, esses valores numéricos **não constituem regra canônica**.

---

## 3. Especificação do pacote de qualidade de uso (QoL)

O protótipo implementa integralmente os 19 requisitos do pacote de qualidade de uso fechado pelo autor:

1. **Badge de SPD atual em screen-space:** cada unidade possui um indicador compacto com seu SPD atual projetado para screen-space, mantendo escala legível em qualquer nível de zoom 2D/3D. Valores negativos são destacados com sinal negativo, prefixo textual e formato diferenciado.
2. **Ficha resumida de mobilidade:** ao selecionar uma unidade, exibe `SPD atual/máximo • até N blocos em custo-base`, esclarecendo que terrenos e obstáculos alteram o custo real.
3. **Prévia consolidada `SPD antes → depois`:** exibe a transição de SPD no destino (ex: `SPD 7 → 3` ou `SPD 2 → -3 · LEGAL COM CONSEQUÊNCIA`).
4. **Três categorias de legalidade:**
   - `LEGAL`: confirmável sem efeitos colaterais excepcionais (verde / ícone ✓);
   - `LEGAL COM CONSEQUÊNCIA`: confirmável, mas deixa SPD negativo ou outra consequência prevista (âmbar / ícone ⚠ / aviso de novo movimento bloqueado);
   - `ILEGAL`: não confirmável (vermelho / ícone ✕ / motivo detalhado).
   Não depende exclusivamente de cor para acessibilidade a daltonismo.
5. **Motivo de ilegalidade contextual junto ao cursor:** tooltip ancorado próximo ao bloco avaliado informa o motivo exato (`SPD insuficiente`, `base sólida`, `ocupado por aliado`, `inimigo bloqueia`, `terreno impassável`, `janela de Reação fechada`, etc.), mudando de lado nas bordas da viewport.
6. **Rota e custos acumulados:** calcula a rota de menor custo determinística e exibe o caminho, custo do passo, custo acumulado e custo total.
7. **Persistência durante execução:** a rota e o destino confirmados permanecem desenhados durante todo o deslocamento bloco a bloco da unidade, sem serem limpos por hover casual.
8. **Cancelamento previsível:** permite cancelar o planejamento antes da confirmação via botão na tela, tecla Escape, clique no mesmo destino travado (segundo clique) ou seleção de outra unidade.
9. **Timer de recuperação:** anel de progresso circular proporcional aos ticks lógicos (160 ticks = 8 s a 20 Hz), tooltip explicativo e feedback visual ao reiniciar o timer.
10. **Recuperação de SPD:** popup `+2SPD` e pulso visual no badge ao receber o pacote de recuperação (respeitando redução de movimento).
11. **Tooltips de terreno e legenda recolhível:** ficha detalhada de cada terreno ao passar o cursor e legenda colapsável para não obstruir o campo.
12. **Aliados, inimigos e ocupação:** diferenciação visual clara de aliados atravessáveis (não ocupáveis como destino), bloqueio total por inimigos e base sólida.
13. **Indicador de GLIDER:** badge/marcador claro na unidade com a Keyword GLIDER, permitindo atravessar terrenos impassáveis sem poder terminar neles.
14. **Movimento como Reação:** harness QA mostrando `1 Reação + X SPD`, saldo antes/depois e motivo quando a janela ou saldo estiverem indisponíveis.
15. **Modo QA de informação reduzida:** toggle que oculta dados ocultos e posições de inimigos fora da visão, validando a legibilidade sob regras de Fog of War.
16. **Hierarquia automática de badges:** ordenação vertical em screen-space (1. Ilegalidade/alerta; 2. SPD; 3. Reação; 4. Timer; 5. Keywords) evitando sobreposições ilegíveis.
17. **Screen-space e estabilidade de câmera:** tooltips e badges acompanham a projeção mantendo dimensões legíveis nos limites de zoom, pan e rotação.
18. **Redução de movimento integral:** desativa ou atenua pulsos, popups, rotações de timer e transições de câmera quando `prefers-reduced-motion` ou toggle manual estiver ativo.
19. **Contrato opcional de som:** interface `SoundSystem` para eventos como destino travado, erro, confirmação e recuperação, operando em modo silencioso por padrão sem dependência de áudio para regras.

---

## 4. Evidência e testes

O protótipo executável contém suíte automatizada de testes embutidos acessível diretamente pela interface e por automação (`autotest=1`).
Os testes cobrem:
- Invariantes de mapa 31 × 17, 20 Hz / 50 ms e ciclo de 160 ticks de ociosidade;
- Custo-base de 1 SPD por bloco e rotas ponderadas determinísticas;
- Travessia de aliados e bloqueio por inimigos/bases/impassáveis;
- Regras de GLIDER e LEAPER;
- Entrada final cara com SPD negativo e bloqueio de novo movimento;
- Execução bloco a bloco sem teletransporte;
- Início, progresso, reinício por Ação/movimento e perda de excedente no timer de recuperação;
- Consumo de Reação e validação de janela no modo Reação;
- Independência do hash autoritativo em relação a câmera, estilos de terreno e visualização.
