# VIS-004 — Relatório de Validação e Testes

**Data:** 2026-09-30  
**Status do experimento:** **APROVADO — Opção A (badge persistente de custo no bloco)** pelo autor  
**Ambiente de validação:** Navegador Microsoft Edge (Chromium headless engine v122+) via Playwright  
**Resoluções testadas:** 1920 × 1080 (desktop wide) e 800 × 1100 (narrow/mobile)  
**Resultado dos testes embutidos:** **48 / 48 testes aprovados (100%)**  
**Padrão inicial:** Opção A ativa na inicialização  
**Exceções JavaScript:** **0**

---

## 1. Resumo Executivo

O protótipo executável `prototypes/visual-004-terrain-spd-advanced-movement/index.html` foi testado em ambiente de navegador real. A suíte automatizada embutida passou integralmente com 48 testes aprovados em 100% dos cenários executados, cobrindo:
1. Regras do GDD v0.43 para SPD, recuperação e Reação;
2. Comportamentos de terreno, impassáveis e Keywords (GLIDER e LEAPER);
3. O pacote completo de qualidade de uso (QoL);
4. Comparação equânime das opções A, B e C de terreno sem alteração de hashes (Opção A aprovada formalmente como padrão visual);
5. Independência entre estado autoritativo / hashes e camadas visuais (câmera, badges, tooltips, legendas, áudio e reduções de informação).

---

## 2. Cobertura da Matriz de Testes (48 Testes)

### Planejamento e custos (Testes 1 a 6)
- `mapa 31×17 · 20 Hz/50 ms · recuperação 160 ticks` — Verifica dimensões, cadência e tempo lógico.
- `cenário 5×5 válido e custo QA padrão neutro` — Verifica unidades, capacidades e invariantes.
- `custo-base continua 1 SPD por bloco fora de modificadores` — Confirma regra base de custo do GDD.
- `aliado atravessável, não destino final` — Confirma travessia legal sem permitir término no bloco do aliado.
- `inimigo bloqueia passagem e destino` — Confirma bloqueio total por unidade hostil.
- `LEAPER 2 preserva diagonal a 1 SPD` — Confirma movimento diagonal restrito à Keyword.

### Terreno e Keywords (Testes 7 a 13)
- `terreno impassável bloqueia unidade normal` — Confirma barreira física de terreno.
- `GLIDER atravessa impassável mas não termina nele` — Confirma texto consolidado de GLIDER.
- `fixture QA pondera custo sem declarar regra canônica` — Confirma cálculo de rota ponderada.
- `entrada final cara pode levar SPD a negativo` — Confirma regra de SPD negativo sem piso universal.
- `SPD negativo bloqueia início de novo movimento` — Confirma restrição universal de mobilidade.
- `GLIDER ignora custo especial do Campo QA` — Confirma imunidade de GLIDER a modificadores de terreno.
- `path ponderado é determinístico e desempate continua explícito` — Confirma determinismo e ordenação de Dijkstra.

### Execução e Persistência (Testes 14 a 15, 38 a 39)
- `confirmar não teleporta ao destino` — Confirma início de movimento com estado transitório.
- `execução cobra custo bloco a bloco` — Confirma débito gradual de SPD a cada passo lógico.
- `rota confirmada permanece persistente durante execução bloco a bloco` — Garante que o caminho traçado permanece visível até conclusão.
- `hover casual durante movimento ativo não apaga a rota em execução` — Garante estabilidade visual durante o deslocamento.

### Recuperação de SPD (Testes 16 a 20, 31 a 32, 40 a 41)
- `recuperação não começa antes do primeiro gasto de SPD` — Confirma que unidade intacta não gasta ciclo.
- `primeiro gasto de SPD inicia recuperação` — Confirma início do timer de ociosidade após gasto.
- `+2 SPD ocorre somente após 160 ticks de ociosidade` — Confirma exatamente 8 segundos em passos de 50 ms.
- `recuperação respeita SPD máximo e perde excedente` — Confirma teto de SPD e perda de saldo excedente.
- `Ação QA reinicia timer sem fingir implementar custo de Ação` — Confirma reinício de ociosidade por Ação.
- `ícone de recuperação mostra contagem regressiva inteira` — Confirma contagem decrescente em segundos.
- `ícone de recuperação some no SPD máximo` — Confirma limpeza visual quando a unidade está completa.
- `pacote de recuperação cria pop-up +2SPD apenas quando há ganho` — Confirma feedback visual proporcional ao ganho real.
- `anel de recuperação reflete progresso exato dos ticks` — Confirma precisão angular do anel de progresso circular.
- `timer de recuperação reinicia no movimento e na Ação QA` — Confirma feedback de reinício do timer.

### Movimento como Reação (Testes 21 a 23)
- `movimento como Reação rejeitado fora da janela QA` — Confirma validação da janela de Reação.
- `movimento como Reação consome 1 Reação + SPD` — Confirma pagamento duplo de recurso.
- `movimento normal não consome Reação` — Confirma isolamento de custos entre modos.

### Determinismo e Hashes (Testes 24 a 27)
- `movimento ativo e fixture lógica participam do hash` — Confirma autoridade sobre regras de jogo.
- `câmera continua fora do hash` — Confirma desacoplamento de apresentação e câmera livre.
- `A/B/C de terreno são apresentação e ficam fora do hash` — Confirma que alternativas visuais não afetam lógica.
- `2D/3D/QA compartilham o mesmo estado` — Confirma referência única sob o mesmo motor.

### Interação e Qualidade de Uso (Testes 28 a 30, 33 a 37, 42 a 48)
- `duplo clique em destino legal continua reutilizando confirmação` — Confirma atalho de comando rápido.
- `duplo clique em monstro continua foco e não movimento` — Confirma foco traseiro sem efeito em regras.
- `stress QA configura caso reproduzível de SPD negativo` — Confirma preparação determinística de cenário.
- `classificação de legalidade distingue LEGAL, CONSEQUÊNCIA e ILEGAL` — Confirma 3 categorias visuais distintas.
- `segundo clique no mesmo destino travado cancela prévia sem custo` — Confirma cancelamento por clique repetido.
- `tecla Escape cancela prévia travada` — Confirma cancelamento via teclado.
- `troca de seleção para outro aliado limpa prévia travada anterior` — Confirma limpeza contextual na troca de foco.
- `modo QA de informação reduzida não altera o hash autoritativo` — Confirma integridade do hash sob visão parcial.
- `modo QA de informação reduzida oculta inimigos fora da visão de P1` — Confirma respeito às regras de Fog de Guerra.
- `contrato de som SoundSystem consome eventos sem alterar hash` — Confirma desacoplamento funcional de áudio.
- `legenda recolhível alterna visibilidade sem alterar estado ou hash` — Confirma controle da legenda pelo usuário.
- `redução de movimento desativa interpolação mantendo timing lógico idêntico` — Confirma acessibilidade sem desvio de regras.
- `três opções A, B e C de terreno são alternáveis e preservam o mesmo hash autoritativo` — Confirma paridade determinística e independência de apresentação entre as três alternativas.
- `ficha de mobilidade resume alcance em custo-base` — Confirma apresentação de custo-base com ressalva.

---

## 3. Verificações de Viewport

- **Desktop (1920 × 1080):** 48 / 48 testes aprovados; painéis laterais com rolagem autônoma, câmera livre e barra de ação inferior perfeitamente enquadradas.
- **Narrow / Mobile (800 × 1100):** 48 / 48 testes aprovados; layout responsivo empilhado, tooltips ancorados respeitando as bordas da viewport e barra de ação com posicionamento fixo.
