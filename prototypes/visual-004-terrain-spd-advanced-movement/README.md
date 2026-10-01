# Monster Impact — VIS-004 · Terreno, SPD e movimento avançado

Protótipo executável do segundo experimento de movimentação do Monster Impact, integrando regras de terreno, SPD negativo, recuperação de SPD a 20 Hz, movimento como Reação e o pacote completo de qualidade de uso (QoL).

## Estado do protótipo

- **Área cheia (VIS-003):** Herdada e ativa como apresentação aprovada de alcançabilidade.
- **Orientações 2D/3D (VIS-002):** Herdadas e ativas como orientações selecionáveis in-game sobre o mesmo estado autoritativo.
- **Leitura de terreno (VIS-004):** **APROVADO — Opção A (badge persistente de custo no bloco como padrão visual)** pelo autor em 2026-09-30.
- **Valores numéricos de custo de Campo QA:** Fixture de teste para exercitar custos e SPD negativo; não são regras canônicas do GDD.

## Arquivos

- `index.html` — Artefato executável completo e autocontido (marcação, CSS, MIMovementCore, renderizador 2D/3D, QoL e suíte de 48 testes embutidos).
- `README.md` — Esta documentação de uso e controles.
- `TEST_REPORT.md` — Relatório técnico de validação e execução dos testes.

Para abrir localmente, basta abrir `index.html` em qualquer navegador moderno (Edge, Chrome, Firefox, Safari) diretamente como arquivo local (`file://`) ou via servidor estático.

## Alternativas de leitura de terreno

- **A · Badge persistente [APROVADA - PADRÃO INICIAL]:** Campo QA recebe tint colorido + badge numérico de custo persistente em cada bloco (`×cost`). Permite leitura espacial direta da geografia tática sem depender de rotas prévias.
- **B · Custo no caminho [TESTADA - NÃO APROVADA]:** Campo QA recebe tint discreto; números de custo aparecem ao longo dos passos do caminho traçado (passo incremental `+custo` e custo acumulado até o destino). Mantida como comparador histórico.
- **C · Sutil / painel [TESTADA - NÃO APROVADA]:** O mapa usa demarcação sutil e os custos ficam concentrados no painel lateral e tooltips de hover. Mantida como comparador histórico.

## Pacote de qualidade de uso (QoL) implementado

1. **Badge de SPD atual em screen-space:** Indicador compacto de SPD junto a cada unidade, legível em 2D/3D independente de zoom, destacando valores negativos (`⚠ SPD -1 [BLOQUEADO]`).
2. **Ficha resumida de mobilidade:** Mostra `SPD atual/máximo • até N blocos em custo-base` com esclarecimento de modificadores de terreno.
3. **Prévia `SPD antes → depois`:** Exibe claramente no destino e painel `SPD 7 → 4` ou `SPD 2 → -3`.
4. **Três categorias de legalidade:**
   - `LEGAL` (verde / ✓);
   - `LEGAL COM CONSEQUÊNCIA` (âmbar / ⚠ / aviso de novo movimento bloqueado);
   - `ILEGAL` (vermelho / ✕ / motivo específico).
5. **Tooltip contextual no cursor:** Informa status, motivo, custo, transição de SPD, terreno, mobilidade e Reação sem cobrir o bloco e adaptando-se às bordas da viewport.
6. **Rota e custos acumulados:** Caminho de menor custo determinístico com exibição de custos por passo e acumulados.
7. **Persistência durante execução:** A rota e o destino confirmados permanecem desenhados durante todo o deslocamento bloco a bloco da unidade, sem serem apagados por hover casual.
8. **Cancelamento previsível:**
   - Tecla `Escape`;
   - Botão `cancelar prévia`;
   - **Segundo clique no mesmo destino travado** cancela a prévia sem custo;
   - Clique fora do mapa limpa prévia;
   - Troca de seleção limpa o planejamento anterior.
9. **Timer de recuperação:** Anel de progresso circular proporcional aos ticks lógicos (160 ticks = 8 s a 20 Hz), display de segundos e feedback visual de reinício.
10. **Recuperação de SPD:** Pop-up `+2SPD` e pulso visual respeitando redução de movimento.
11. **Tooltips de terreno e legenda recolhível:** Legenda colapsável (botão ou tecla `L`) e tooltips informativos por tipo de terreno.
12. **Aliados, inimigos e ocupação:** Aliados atravessáveis com anel tracejado distinto; inimigos e bases com bloqueio intransponível.
13. **GLIDER:** Marcador visual na unidade, permitindo atravessar terrenos impassáveis sem poder terminar neles.
14. **Movimento como Reação:** Exibe `1 Reação + X SPD`, saldo antes/depois e motivos de bloqueio.
15. **Modo QA de informação reduzida:** Toggle que simula Fog de Guerra, ocultando unidades inimigas fora do campo de visão compartilhado de P1.
16. **Hierarquia automática de badges:** Ordenação screen-space evitando sobreposição entre alertas, SPD, Reação, timer e Keywords.
17. **Redução de movimento integral:** Desativa ou atenua interpolações, pulsos e transições quando `prefers-reduced-motion` ou toggle manual estiver ativo.
18. **Contrato sonoro (SoundSystem):** Interface de áudio desacoplada com modo silencioso por padrão, consumindo eventos de apresentação sem alterar o estado autoritativo.

## Controles

- **Clique em unidade:** Seleciona a unidade (se for de P1, habilita planejamento).
- **Hover em bloco:** Exibe prévia da rota, custo acumulado, transição de SPD e tooltip contextual.
- **Primeiro clique em bloco livre:** Trava o destino para confirmação.
- **Segundo clique no mesmo destino travado:** Cancela a prévia sem custo.
- **Botão CONFIRMAR ou tecla `Enter`:** Confirma e enfileira o movimento.
- **Duplo clique em destino legal:** Trava e confirma o movimento em um único gesto.
- **Duplo clique em unidade (3D):** Enquadra a câmera em foco traseiro atrás da unidade.
- **Tecla `Escape`:** Cancela a prévia atual.
- **Tecla `L`:** Recolhe ou expande a legenda do campo.
- **Teclas `1`, `2`, `3`:** Alterna entre 2D, 3D e QA lado a lado.
- **Tecla `T`:** Executa a suíte de testes embutida (48 testes).
