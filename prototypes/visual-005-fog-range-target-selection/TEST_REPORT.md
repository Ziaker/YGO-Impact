# VIS-005 — Relatório de Validação e Testes em Navegador Real

**Data:** 2026-09-30  
**Status do experimento:** **APROVADO — Opção A (Grade Tática Estrita com cantos de alvos e marcadores [?])** pelo autor  
**Ambiente de validação:** Navegador Microsoft Edge (Chromium engine) via Playwright em Windows  
**Resoluções testadas:** 1920 × 1080 (desktop wide) e 800 × 1100 (narrow/mobile)  
**Resultado dos testes embutidos:** **16 / 16 testes aprovados (100%)**  
**Padrão inicial:** Opção A ativa na inicialização (Fog e Terreno)  
**Exceções JavaScript:** **0**  
**Auditoria de atributos e escala:** 10 unidades com valores pequenos inteiros adequados a fixtures de teste (sem 1000+, HP = Nível).

---

## 1. Resumo Executivo

O protótipo executável `prototypes/visual-005-fog-range-target-selection/index.html` foi construído sobre a base completa do VIS-004 e validado via automação Playwright.

Principais verificações auditadas:
1. **Herança total do VIS-004:** Câmera 2D/3D sincronizada, Opção A de terreno (badges persistentes `×cost` renderizados em 2D e 3D) como padrão aprovado, renderizador WebGL/software, pacote QoL e timer de regeneração de SPD (+2 após 160 ticks).
2. **Valores numéricos de fixtures de cenário:** Todas as 10 unidades operam com inteiros pequenos legíveis (ATK/DEF entre 1 e 7, HP igual ao Nível de 3 a 6, SPD entre 1 e 7), descartando o padrão de milhares (1000+) e sem impor teto artificial de 10 como regra universal do GDD.
3. **Movimentação:** Fluxo primário via mouse com suporte a atalhos direcionais (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`) como ferramenta auxiliar de QA/teste para deslocar a unidade selecionada bloco a bloco.
4. **Visão compartilhada e Fog:** União autoritativa do raio de visão dos monstros aliados e raio 5 da base (`DEC-002`), com bloqueio de linha de visão por obstáculos.
5. **Seleção de alvos e combate:** Classificação formal (`LEGAL`, `BLOCKED`, `OUT_OF_RANGE`, `IN_FOG`) e previsão de dano segundo as regras de contra-ataque, defesa e ataque indefeso do GDD v0.43.
6. **Aprovação da Opção A:** Opção A (Grade Tática Estrita) aprovada formalmente pelo autor como padrão visual; opções B e C preservadas para comparação histórica sem mutação de hash.

---

## 2. Matriz de Testes Automatizados (16 Testes)

| # | Teste | Status | Detalhes |
|---|---|:---:|---|
| 1 | Mapa 31×17 · 20 Hz/50 ms · recuperação 160 ticks | PASSOU | Dimensões e frequências canônicas |
| 2 | Fixtures do protótipo com valores pequenos inteiros (sem 1000+, HP = Nível) | PASSOU | 10 unidades auditadas sem violações |
| 3 | Visão compartilhada une monstros aliados e base raio 5 | PASSOU | União determinística de visibilidade |
| 4 | Obstáculo bloqueia linha de visão e linha de ataque | PASSOU | Supercover raycasting com detecção de rocha em (7,5) |
| 5 | Classificação de alvo distingue LEGAL, BLOQUEADO, FORA_DE_ALCANCE e NA_NEVOA | PASSOU | Validação completa de status de mira |
| 6 | Previsão de combate calcula modo defesa subtraindo DEF do ATK | PASSOU | ATK 4 vs DEF 4 resulta em 0 de dano |
| 7 | Previsão de combate calcula contra-ataque simultâneo com SPD maior | PASSOU | Dano mútuo quando defensor tem SPD maior |
| 8 | Previsão de combate calcula ataque indefeso quando defensor não alcança | PASSOU | Arqueira a distância causa dano direto sem sofrer revide |
| 9 | Movimentação com setas direcionais (atalho auxiliar de QA) atualiza coordenadas e regras | PASSOU | Deslocamento de (3,8) para (4,8) com dedução de 1 SPD |
| 10 | Movimentação com setas bloqueada se destino for obstáculo | PASSOU | Bloqueio contra rocha em (7,4) |
| 11 | Três opções A, B e C de Fog preservam o mesmo hash autoritativo | PASSOU | Alternância sem mutação lógica |
| 12 | Opções A, B e C de terreno preservam o mesmo hash autoritativo | PASSOU | Herança de VIS-004 com paridade de hash |
| 13 | Recuperação de SPD +2 após 160 ticks de ociosidade preservada do VIS-004 | PASSOU | Timer canônico de 8 segundos |
| 14 | Memória de Fog registra última posição conhecida do inimigo | PASSOU | `fogKnowledge` armazena posição de saída de visão |
| 15 | GLIDER atravessa terreno impassável e LEAPER 2 realiza diagonal | PASSOU | Keywords de movimentação avançada preservadas |
| 16 | Opção A de terreno renderiza badges persistentes de custo em 2D e 3D | PASSOU | Funções drawTerrainQa2D e drawTerrainQa3D ativas |

---

## 3. Verificação de Viewports e Navegador Real

- **Desktop (1920 × 1080):** 16 / 16 testes aprovados; visão 2D, 3D e QA split funcionais. Padrão inicial: Opção A para Fog e Opção A para Terreno.
- **Narrow / Mobile (800 × 1100):** 16 / 16 testes aprovados; layout adaptativo vertical.
