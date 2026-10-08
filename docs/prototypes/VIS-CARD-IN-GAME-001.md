# VIS-CARD-IN-GAME-001 — Representação in-game de unidade e inspeção flutuante

**Status:** **APROVADO COM DUAS OPÇÕES SELECIONÁVEIS — A e C**  
**Data da decisão:** 2026-10-08  
**Escopo:** aparência e interação de inspeção/seleção in-game. Não altera regras, conteúdo nem estado autoritativo.

---

## 1. Objetivo

Prototipar a representação in-game de uma unidade sem exigir que a interface inteira seja uma carta TCG tradicional.

O contrato visual aprovado para a representação da unidade permanece:

- **núcleo:** arte, efeito, ícone de RACE, ícone de Nível, ícone de ELEM e Keywords;
- **interface externa:** HP, MP, VIS, SPD, ATK e DEF.

A seleção entre unidades presentes no campo pode produzir animação, foco e zoom exclusivamente de apresentação. Esses recursos visuais não podem alterar posição lógica, ocupação, VIS, alcance, timing, custo, comandos válidos ou qualquer estado do núcleo autoritativo.

---

## 2. Decisão autoral

O autor aprovou **duas direções visuais simultaneamente** para a representação e inspeção in-game de unidades:

1. **A — Prisma de Retrato**
2. **C — Lente de Combate**

As duas opções são consideradas válidas e devem coexistir como **alternativas selecionáveis nas configurações do jogo**.

Não existe uma opção principal obrigatória entre A e C nesta decisão. A escolha pertence ao jogador por configuração.

A aprovação de A não invalida C.  
A aprovação de C não invalida A.

---

## 3. A — Prisma de Retrato — APROVADO

A direção A permanece como opção de interface de inspeção com maior organização espacial e leitura direta dos dados da unidade.

### Características preservadas

- núcleo visual centrado na unidade;
- arte como elemento dominante;
- efeito, RACE, Nível, ELEM e Keywords integrados ao núcleo;
- HP, MP, VIS, SPD, ATK e DEF apresentados externamente;
- iconografia e cores semânticas preservadas;
- leitura tática rápida;
- animação e foco apenas de apresentação.

### Estado

**APROVADO como opção selecionável nas configurações.**

---

## 4. C — Lente de Combate — APROVADO

A direção C permanece como opção de interface com identidade visual mais radial e integrada à unidade selecionada no campo.

### Características preservadas

- núcleo visual centrado na própria unidade;
- composição radial/lente de inspeção;
- arte, efeito, RACE, Nível, ELEM e Keywords no núcleo;
- HP, MP, VIS, SPD, ATK e DEF fora do núcleo;
- iconografia e cores semânticas preservadas;
- foco visual compacto;
- possibilidade de animação e zoom de apresentação;
- prioridade para manter o campo visível durante a inspeção.

### Estado

**APROVADO como opção selecionável nas configurações.**

---

## 5. Configuração do jogador

A implementação futura deve oferecer uma configuração explícita para escolher a apresentação de inspeção de unidades.

Conceitualmente:

- **Prisma de Retrato**
- **Lente de Combate**

O nome final da configuração, localização no menu, valor interno persistido, padrão inicial, migração de preferências e comportamento durante uma partida ainda serão definidos na etapa de implementação.

Esta aprovação define **a coexistência das duas apresentações**, mas não inventa neste momento detalhes técnicos ainda não decididos.

---

## 6. Opção B — Faixa de Comando

**B — Faixa de Comando** não integra as opções aprovadas nesta decisão.

Ela deve permanecer preservada no histórico de protótipos para possível revisita futura, sem ser apagada e sem ser tratada como implementação aprovada.

---

## 7. Variações C1/C2/C3

As variações posteriores da direção C:

- **C1 — Halo de Foco**
- **C2 — Faixa Contextual**
- **C3 — Microdock de Foco**

permanecem como material experimental e referência de interação.

A aprovação registrada neste documento é da direção **C — Lente de Combate** como opção selecionável, e não constitui aprovação automática de C1, C2 ou C3 como substitutas da C original.

Elementos dessas variações podem ser revisitados posteriormente — por exemplo seleção entre unidades, animação, zoom ou compactação — mediante nova decisão visual quando necessário.

---

## 8. Requisitos comuns às duas opções aprovadas

Tanto A quanto C devem respeitar os mesmos requisitos funcionais e visuais:

1. A unidade selecionada deve ser inequívoca.
2. O jogador deve conseguir alternar entre unidades presentes no campo.
3. Animações e zoom são apenas apresentação.
4. O mapa deve continuar legível durante a inspeção.
5. HP, MP, VIS, SPD, ATK e DEF devem preservar iconografia e distinção cromática.
6. A interface não pode depender apenas de cor para comunicar informação.
7. RACE, Nível e ELEM devem preservar iconografia.
8. Keywords permanecem no núcleo visual.
9. O efeito permanece no núcleo visual.
10. A arte permanece no núcleo visual e conserva protagonismo.
11. Redução de movimento não pode remover informação.
12. Nenhuma das opções pode modificar diretamente o estado autoritativo.

---

## 9. Preservação do histórico

As três direções históricas continuam preservadas:

- **A — Prisma de Retrato** — **APROVADO**
- **B — Faixa de Comando** — preservado para revisita
- **C — Lente de Combate** — **APROVADO**

Nenhum protótipo histórico deve ser apagado apenas por esta decisão.

---

## 10. Próxima etapa

A próxima etapa será retornar ao **Card Studio/editor** e estudar como representar e configurar essas duas apresentações aprovadas sem misturar a lógica do editor com a interface de jogo.

Essa etapa deve definir separadamente:

- como o editor pré-visualiza A e C;
- como a preferência é representada nos dados;
- como o jogo expõe a escolha nas configurações;
- como a configuração é persistida;
- qual opção é usada como padrão inicial;
- como testes visuais e regressões cobrirão ambas.

Nada nesta seção é considerado implementado por este documento.

---

## 11. Resultado

**DECISÃO APROVADA PELO AUTOR**

- **A — Prisma de Retrato:** aprovado.
- **C — Lente de Combate:** aprovado.
- **A e C devem coexistir como opções selecionáveis nas configurações.**
- **B permanece arquivado para possível revisita.**
- **C1/C2/C3 permanecem experimentais.**
- **A integração com o editor fica para a próxima etapa.**
