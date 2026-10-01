# Monster Impact — VIS-007 · Identidade Visual do Combate [REJEITADO / HISTÓRICO DE DESCARTE]

> [!WARNING]
> **Estado:** **REJEITADO PELO AUTOR EM 2026-10-01 COMO DIREÇÃO FINAL.**
> O autor determinou que não faz sentido continuar refinando efeitos de combate sobre uma base visual fraca (a câmera 3D e o palco visual do tabuleiro estão sob revisão fundacional no **VIS-ENV-001**).
> Este diretório é mantido **estritamente como histórico de descarte** e NÃO representa a direção recomendada nem aprovada. O combate será refeito do zero após a aprovação da nova câmera 3D e ambiente-base.

1. **Pergunta Única e Focada:** *"Como o confronto direto entre duas unidades (investida/impacto do atacante, revide/contra-ataque do defensor, apresentação de dano e dissolução por destruição) deve se manifestar visualmente sobre a grade tática 31 × 17 com alto impacto dramático, peso físico e efeitos épicos, sem obstruir a leitura tática do tabuleiro?"*
2. **Palco Fixo Congelado:** Tabuleiro 31×17, grade tática estrita (VIS-005), câmera 2D/3D livre do VIS-002, badges persistentes de terreno da Opção A do VIS-004 e células de duelo em `(7, 8)` e `(8, 8)`.
3. **Zero Poluição de Regras:** Sem logs de texto nem números inflados na tela.

---

## 1. As 3 Novas Direções em Avaliação (`index.html`)

- **Opção A — Impacto Sísmico & Fissura Dimensional (Seismic Impact & Dimensional Tear) [Em avaliação]:**
  - Carga cinética pesada com recuo elástico de meio bloco e investida rápida;
  - Screen-shake amortecido de impacto no contato;
  - Lâmina de choque cortante em X fluorescente que estilhaça o solo da célula;
  - Debris incandescentes e ondas de choque concêntricas no plano da grade;
  - Revide com barreira angular refletora e contra-choque frontal oposto;
  - Destruição letal por fenda dimensional no solo tragando a matéria para o vazio.
- **Opção B — Assinatura Elemental Mítica (Mythic Elemental Signature & Beam Clash) [Em avaliação]:**
  - Círculo arcano no solo e 3 esferas de plasma orbitais convergindo na frente do monstro;
  - Rajada colunar contínua de fogo dourado/plasma perfurando o espaço tático até a célula alvo;
  - Revide em Duelo de Feixes (*Beam Struggle*): os dois feixes colidem no centro oscilando e detonando em ponto cego;
  - Destruição letal por dispersão solar: a unidade desintegra-se em uma tempestade de brasas douradas de fênix.
- **Opção C — Matriz Tática Cibernética Solid Vision (Cyber-Duel Holo-Matrix) [Em avaliação]:**
  - Lock-on tático com lasers de mira e retículo giratório 3D sobre o defensor;
  - Salva quádrupla de projéteis laser em rajada de alta cadência com flashes de impacto;
  - Escudo prismático hexagonal e contra-salva de interceptação no ar;
  - Destruição letal por sobrecarga de dados: glitch digital com dispersão em milhares de voxels.

---

## 2. Cenários e Controles

- **Ataque Único (`Ataque`):** Golpe unilateral direto.
- **Revide Simultâneo (`Revide`):** Troca dramática de golpes (Barreira, Beam Struggle ou Interceptação).
- **Destruição Letal (`Destruição`):** Dano letal com dissolução épica correspondente.
- **Controles:** Play/Pause (`Espaço`), Replay (`R`), Scrubber analítico (0.0s a 1.3s), Velocidade `1.0x` / `0.5x`, Toggle de Screen-Shake e Câmera `2D / 3D` (`V`).
