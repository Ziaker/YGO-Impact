# VIS-CARD-IN-GAME-001 — Representação in-game de unidade e inspeção flutuante

**Status:** **EM AVALIAÇÃO PELO AUTOR — A/B/C preservados; C1/C2/C3 em avaliação**  
**Escopo:** aparência e interação de inspeção/seleção in-game. Não altera regras, conteúdo ou estado autoritativo.

---

## 1. Objetivo

Prototipar a representação in-game de uma unidade sem exigir que a interface inteira seja uma carta TCG tradicional.

O contrato visual desta rodada é:

- **núcleo:** arte, efeito, ícone de RACE, ícone de Nível, ícone de ELEM e Keywords;
- **interface externa:** HP, MP, VIS, SPD, ATK e DEF.

A seleção deve funcionar entre múltiplas unidades já presentes no campo. Selecionar uma unidade pode produzir animação, foco e zoom de apresentação, desde que não altere posição lógica, ocupação, VIS, alcance, timing, custo ou qualquer estado do núcleo.

---

## 2. Histórico preservado

O autor considerou interessantes as três direções da rodada anterior e pediu que todas fossem mantidas para possível revisita:

- **A — Prisma de Retrato**;
- **B — Faixa de Comando**;
- **C — Lente de Combate**.

Os três executáveis foram arquivados integralmente em `prototypes/visual-card-ingame-001/archive/`. A existência desta nova rodada não substitui nem invalida A, B ou C.

---

## 3. Cenário comparativo

As três novas alternativas usam:

- campo 31 × 17 representativo;
- múltiplas unidades aliadas e inimigas clicáveis;
- seleção visual inequívoca;
- transição curta de foco;
- zoom somente de apresentação;
- troca de seleção por setas;
- Escape para fechar inspeção;
- cores e ícones semânticos distintos para HP, MP, VIS, SPD, ATK e DEF;
- RACE, Nível, ELEM, efeito e Keywords visíveis na inspeção;
- redução de movimento via `prefers-reduced-motion`.

As cartas/unidades usadas são fixtures visuais. O protótipo não declara esse conteúdo como canonizado.

---

## 4. C1 — Halo de Foco

A inspeção surge ao redor da própria unidade selecionada.

Características:

- retrato central;
- RACE, Nível e ELEM imediatamente próximos ao retrato;
- seis stats como satélites coloridos;
- efeito e Keywords em flyout compacto;
- zoom moderado centrado na unidade;
- maior continuidade espacial entre clique e informação.

**Hipótese:** a unidade permanece sendo o centro da leitura e quase não é necessário deslocar o olhar para outra região da tela.

---

## 5. C2 — Faixa Contextual

Uma cápsula única e pequena aparece acima ou abaixo da unidade, escolhendo a posição conforme sua localização no mapa.

Características:

- footprint aproximado de 430 × 194 px;
- retrato, identidade e três badges no cabeçalho;
- seis stats em matriz 2 × 3;
- efeito e Keywords na metade restante;
- zoom muito discreto.

**Hipótese:** é a alternativa mais simples e econômica sem esconder as informações necessárias.

---

## 6. C3 — Microdock de Foco

A animação e o zoom do campo fazem o foco principal; a ficha detalhada aparece num dock inferior de baixa altura.

Características:

- retrato e badges de RACE/Nível/ELEM;
- Keywords na faixa superior;
- seis stats em uma única linha;
- efeito abaixo;
- posição estável ao alternar rapidamente entre unidades;
- centro do mapa permanece livre.

**Hipótese:** é a alternativa mais adequada para comparar várias unidades sucessivamente sem movimentar o painel pela tela.

---

## 7. Critérios de avaliação

1. A unidade clicada deve ser inequivocamente a unidade inspecionada.
2. A troca entre unidades precisa ser rápida e previsível.
3. Animação e zoom não podem modificar estado autoritativo.
4. O mapa precisa continuar legível durante a inspeção.
5. HP/MP/VIS/SPD/ATK/DEF devem preservar ícone, nome e cor semântica.
6. RACE, Nível, ELEM e Keywords precisam conservar iconografia.
7. O efeito precisa ser legível sem transformar a inspeção em painel dominante.
8. A interface deve ocupar sensivelmente menos tela que a direção B — Faixa de Comando.
9. Redução de movimento não pode remover informação.
10. Nenhuma alternativa é aprovada sem confirmação explícita do autor.

---

## 8. Resultado

**Aguardando avaliação explícita do autor.**
