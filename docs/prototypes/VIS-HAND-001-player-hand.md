# VIS-HAND-001 — Mão do jogador

**Status:** **APROVADO PELO AUTOR — Opção A (Leque)**  
**Data da aprovação:** 2026-10-02  
**Escopo da aprovação:** linguagem visual e comportamento-base da mão do jogador para implementação posterior nas apresentações 2D e 3D.  
**Implementação de produção:** **NÃO IMPLEMENTADA NESTA DECISÃO**. Este documento congela a direção visual e o contrato de UX; a integração com o jogo ocorrerá em etapa posterior.

---

## 1. Decisão

Fica aprovada a **Opção A — Leque** como direção oficial para a mão do jogador em Monster Impact.

A mão deve ser apresentada como um conjunto de cartas fisicamente organizado em **leque**, com a carta selecionada ganhando destaque sem destruir a leitura das demais cartas e sem obstruir de forma indevida a área tática do campo.

A decisão é válida para as duas orientações de apresentação já aprovadas do jogo:

1. **2D top-down ortogonal**;
2. **3D em perspectiva**, observado do lado do jogador e orientado para o campo inteiro.

A implementação futura deve preservar a identidade da Opção A em ambas as projeções, adaptando escala, profundidade, inclinação e ocupação de tela à câmera ativa.

As opções B e C permanecem apenas como comparadores históricos do experimento e **não devem ser tratadas como alternativas equivalentes na implementação de produção**, salvo reabertura explícita desta decisão pelo autor.

---

## 2. Contexto e relação com decisões anteriores

Esta decisão não redefine o tabuleiro, a câmera, o HUD principal ou as regras da partida.

Ela deve ser implementada em conformidade com as decisões visuais já registradas:

- **VIS-001 — Composição do campo e HUD principal:** a mão deve permanecer acessível sem encobrir informação crítica do mapa e do estado tático;
- **VIS-002 — Mapa, orientação 2D/3D e sistema de câmera:** 2D e 3D são duas projeções do mesmo estado autoritativo; a troca de câmera não altera regras nem estado de gameplay;
- **VIS-ENV-001 — Câmera 3D e ambiente-base:** o campo 3D permanece no plano lógico XZ, com Y como altura visual; câmera, profundidade e perspectiva são apresentação, não regra.

VIS-HAND-001 acrescenta apenas a linguagem da mão do jogador e seus requisitos de interação.

Nenhuma regra de compra, descarte, ativação, custo, Corrente, Invocação ou targeting é criada neste documento.

---

## 3. Pergunta avaliada

Como a mão do jogador deve ser apresentada para:

- preservar a sensação física de possuir cartas;
- permitir reconhecimento rápido da composição da mão;
- oferecer seleção clara e determinística;
- manter o campo legível;
- funcionar de forma coerente em 2D top-down e 3D em perspectiva;
- escalar para diferentes quantidades de cartas sem depender de um layout rígido;
- não confundir estado visual com estado autoritativo?

---

## 4. Cenário comparativo usado

O experimento comparou três direções usando o mesmo cenário visual e a mesma mão.

### Condições de comparação

- campo tático representativo de Monster Impact;
- alternância entre apresentação 2D e 3D;
- jogador observado do lado próprio do campo;
- eixo visual do duelo orientado de P1 para P2;
- mão com múltiplas cartas de tipos diferentes;
- carta selecionada destacada;
- necessidade de manter o centro do campo visível;
- interação direta por ponteiro;
- navegação por teclado como apoio;
- viewport widescreen.

### Correção importante de orientação

"Vertical" neste experimento significa **eixo do duelo P1 → P2**, e não modo retrato de tela.

No 2D:

- P1 fica visualmente na região inferior;
- P2 fica visualmente na região superior;
- o campo é lido longitudinalmente entre as duas bases.

No 3D:

- o jogador observa o campo a partir do próprio lado;
- o tabuleiro avança em profundidade até o adversário;
- a mão ocupa o primeiro plano sem transformar o tabuleiro em uma prancha achatada ilegível.

---

## 5. Opções avaliadas

### 5.1 Opção A — Leque — APROVADA

As cartas são distribuídas em arco/leque na região inferior da tela, reproduzindo a leitura de uma mão física.

Características:

- todas as cartas permanecem parcialmente visíveis;
- a ordem espacial da mão é estável;
- a carta selecionada sobe e/ou avança visualmente;
- cartas vizinhas não mudam de identidade nem trocam de posição de forma inesperada;
- o jogador consegue comparar várias cartas sem abrir um painel separado;
- em 3D, o leque participa da perspectiva do jogador sem ser confundido com objetos do tabuleiro;
- em 2D, o leque permanece uma camada de interface e não inclina o mapa.

**Motivo da aprovação:** oferece a melhor combinação entre identidade de duelo, leitura simultânea da mão e coerência com a visão em primeira pessoa/perspectiva desejada para o 3D.

### 5.2 Opção B — Holster / Duel Disk — NÃO APROVADA

As cartas ficam concentradas em trilho ou suporte lateral, liberando a região central.

Vantagens observadas:

- baixa obstrução do centro do campo;
- leitura ordenada em coluna/trilho;
- boa compatibilidade com HUD lateral.

Limitações em relação à direção escolhida:

- reduz a sensação de "cartas na mão";
- cria maior distância visual entre carta e foco central do duelo;
- depende mais de expansão individual para comparar várias cartas.

Mantida apenas como referência histórica.

### 5.3 Opção C — Foco cinematográfico / Tray — NÃO APROVADA

Uma carta recebe grande destaque e as demais ficam comprimidas em bandeja/carrossel.

Vantagens observadas:

- excelente leitura da carta ativa;
- interface compacta quando o foco é individual.

Limitações em relação à direção escolhida:

- pior comparação imediata da mão inteira;
- maior risco de navegação sequencial desnecessária;
- reduz a percepção física de uma mão aberta.

Mantida apenas como referência histórica.

---

## 6. Contrato visual da Opção A

A implementação futura deve respeitar os seguintes princípios.

### 6.1 Forma geral

A mão é um **leque centralizado ou levemente deslocado conforme o HUD**, construído a partir de uma distribuição angular estável.

Cada carta possui:

- posição-base no leque;
- ângulo-base;
- índice lógico estável;
- camada visual própria;
- área de interação própria;
- estado selecionado/não selecionado;
- transição visual independente do estado autoritativo.

A curvatura do leque pode variar com a quantidade de cartas, mas sua identidade visual não deve desaparecer em mãos maiores.

### 6.2 Carta selecionada

Ao selecionar uma carta:

- ela deve avançar/subir o suficiente para ser reconhecida imediatamente;
- seu conteúdo principal deve ficar mais legível;
- sua identidade deve permanecer a mesma durante toda a interação;
- a seleção não pode depender do elemento HTML interno clicado;
- a seleção não pode saltar para uma carta vizinha por sobreposição de hitboxes;
- a seleção não pode reordenar silenciosamente a mão, salvo quando a própria lógica do jogo alterar a zona ou ordem correspondente.

### 6.3 Profundidade e sobreposição

A sobreposição entre cartas é permitida e faz parte do leque, mas deve obedecer a uma ordenação determinística.

Requisitos:

- a carta visualmente superior deve ser a mesma carta que recebe o clique naquela região;
- a área clicável não pode contradizer a ordem visual;
- z-index, picking ou hit-test devem seguir a mesma ordenação usada para renderização;
- quando uma carta é elevada por seleção/hover, sua prioridade visual e interativa deve acompanhar a elevação.

---

## 7. Comportamento no 2D

No modo 2D, o campo permanece **top-down ortogonal**.

A mão:

- fica ancorada na região inferior da viewport;
- não acompanha pan/zoom do mapa;
- não rotaciona junto com o tabuleiro;
- não altera a escala lógica da grade;
- pode reduzir automaticamente sua altura quando necessário para preservar leitura do campo;
- deve manter o eixo P1 → P2 claramente perceptível.

A mão é interface em screen-space. Ela não ocupa blocos e não participa de picking do mapa fora de sua própria região interativa.

---

## 8. Comportamento no 3D

No modo 3D, a mão deve reforçar a sensação de observar o duelo a partir do lado do jogador.

A câmera 3D continua pertencendo ao sistema de câmera, não à mão.

A mão:

- permanece no primeiro plano;
- pode receber inclinação e perspectiva visual coerentes com o ponto de vista;
- não deve impedir leitura da linha central e das unidades relevantes;
- não pode bloquear permanentemente a base própria ou regiões de interação essenciais;
- deve continuar utilizável durante órbita, pan e zoom da câmera;
- não deve ser projetada no espaço autoritativo do tabuleiro;
- não recebe coordenadas de gameplay.

### Requisito de legibilidade 3D

A aprovação da Opção A **não aprova** uma câmera achatada, fixa ou não navegável.

A implementação futura deve conviver com câmera 3D funcional conforme VIS-002/VIS-ENV-001, incluindo navegação adequada e enquadramentos recuperáveis.

A mão não pode ser usada como justificativa para reduzir a legibilidade do tabuleiro.

---

## 9. Interação e seleção

A seleção de cartas deve ser **determinística e inequívoca**.

### Requisitos mínimos

1. cada carta deve possuir identificador lógico único na mão;
2. o evento de ponteiro deve resolver diretamente para esse identificador;
3. elementos filhos da carta não podem mudar qual carta é selecionada;
4. sobreposição deve respeitar a mesma ordem visual e interativa;
5. teclado/gamepad, quando usados, devem navegar por índices estáveis;
6. hover não deve alterar a carta selecionada sem confirmação, salvo decisão posterior explícita;
7. trocar 2D/3D deve preservar a mesma carta selecionada;
8. mover a câmera não deve alterar seleção;
9. animação não pode trocar o identificador da carta durante a transição;
10. a UI deve tolerar cliques rápidos sem selecionar cartas vizinhas por atraso visual.

---

## 10. Adaptação à quantidade de cartas

O leque não deve ser calibrado exclusivamente para uma mão de tamanho fixo.

A implementação deve prever pelo menos:

- mão pequena: espaçamento maior e cartas mais abertas;
- mão média: distribuição padrão;
- mão grande: maior sobreposição, redução angular e/ou redução moderada de escala;
- quantidades extremas: estratégia de compressão preservando seleção individual.

A adaptação deve priorizar, nesta ordem:

1. seleção correta;
2. identificação individual;
3. preservação da área tática;
4. leitura de arte/tipo/nome conforme espaço disponível;
5. fidelidade geométrica ao arco ideal.

Não é aceitável preservar um leque visualmente perfeito se isso tornar cartas impossíveis de selecionar.

---

## 11. Responsividade

O layout é concebido para viewport widescreen, mas deve degradar de forma controlada.

A implementação posterior deve testar:

- 16:9 de referência;
- telas mais estreitas;
- janelas reduzidas;
- escalas de UI maiores;
- mão com muitas cartas;
- inspector/painéis laterais abertos;
- modo 2D e modo 3D.

Em viewport estreito, é permitido:

- reduzir escala das cartas;
- aumentar sobreposição;
- reduzir amplitude angular do leque;
- deslocar levemente o centro do leque;
- elevar somente a carta ativa.

Não é permitido transformar automaticamente a interface inteira em modo retrato como interpretação do eixo vertical do duelo.

---

## 12. Acessibilidade e conforto

A implementação futura deve considerar:

- opção de reduzir ou eliminar animação de abertura/seleção;
- foco de teclado claramente visível;
- contraste suficiente entre carta selecionada e não selecionada;
- distinção de seleção sem depender exclusivamente de cor;
- tamanho mínimo de hitbox compatível com uso real;
- nenhuma animação da mão pode bloquear a leitura de eventos urgentes do campo por tempo excessivo.

Redução de movimento altera apenas apresentação.

---

## 13. Relação com o núcleo autoritativo

A mão é uma projeção da zona de mão fornecida pelo núcleo.

A UI pode manter apenas estado de apresentação, por exemplo:

- carta em hover;
- carta selecionada para inspeção;
- posições interpoladas;
- ângulos;
- escala;
- ordem de desenho derivada;
- animação de entrada/saída.

A UI **não pode**:

- mover cartas entre zonas diretamente;
- pagar custos;
- ativar efeitos sem comando público;
- revelar informação oculta não fornecida ao jogador;
- reordenar estado autoritativo para acomodar o layout;
- decidir legalidade de ativação por conta própria.

Ações de gameplay partem da seleção visual e são convertidas em comandos para o núcleo autoritativo.

---

## 14. Casos extremos obrigatórios para implementação

A implementação da Opção A deve ser testada, no mínimo, com:

1. uma única carta na mão;
2. duas cartas;
3. mão média;
4. mão grande com forte sobreposição;
5. cartas com nomes visualmente longos;
6. alternância repetida 2D ↔ 3D;
7. câmera 3D em diferentes yaw/pitch/distâncias;
8. viewport reduzido;
9. inspector aberto;
10. carta selecionada na primeira posição;
11. carta selecionada no centro;
12. carta selecionada na última posição;
13. remoção da carta selecionada da mão;
14. compra de nova carta enquanto outra está selecionada;
15. cliques rápidos em cartas parcialmente sobrepostas;
16. navegação exclusivamente por teclado/gamepad;
17. redução de movimento ativa;
18. troca de fase sem alteração indevida da seleção visual.

---

## 15. Critérios de aceitação para a implementação posterior

A implementação de produção só deve ser considerada compatível com esta decisão se todos os pontos abaixo forem verdadeiros:

- [ ] a mão é visualmente reconhecível como **leque**;
- [ ] todas as cartas possuem seleção individual confiável;
- [ ] a carta clicada é sempre a carta selecionada;
- [ ] a seleção permanece estável durante animações;
- [ ] 2D e 3D mostram a mesma mão e a mesma seleção lógica;
- [ ] alternar 2D/3D não consome recurso nem cria evento de gameplay;
- [ ] o leque não acompanha pan/zoom do mapa 2D;
- [ ] o leque permanece utilizável com a câmera 3D em movimento;
- [ ] o campo central continua legível;
- [ ] a base e controles essenciais não ficam permanentemente cobertos;
- [ ] mãos grandes continuam selecionáveis;
- [ ] viewport estreito não é confundido com "modo retrato obrigatório";
- [ ] redução de movimento funciona sem alterar regras;
- [ ] a UI não modifica estado autoritativo diretamente;
- [ ] a implementação possui testes de regressão para picking/hit-test em cartas sobrepostas.

---

## 16. Não objetivos desta decisão

VIS-HAND-001 **não define**:

- tamanho máximo de mão;
- regras de descarte;
- ordem autoritativa das cartas na mão;
- custos de ativação;
- regras de compra;
- timing de Correntes;
- conteúdo das cartas;
- layout final do inspector;
- animações finais de compra/descartar/ativar;
- sons finais;
- comportamento de drag-and-drop como comando de gameplay;
- implementação definitiva do renderer 3D.

Esses itens exigem suas próprias decisões ou devem seguir diretamente o GDD e o núcleo autoritativo.

---

## 17. Evidência e histórico do experimento

O experimento apresentou três opções funcionalmente comparáveis:

- **A — Leque**;
- **B — Holster / Duel Disk**;
- **C — Foco cinematográfico / Tray**.

A primeira revisão revelou problemas de enquadramento 3D, ausência de navegação de câmera, sobreposição excessiva e seleção incorreta de cartas. Esses problemas foram tratados como falhas do protótipo, não como propriedades desejáveis das opções.

A revisão seguinte corrigiu o eixo visual do duelo, estabeleceu câmera 3D navegável e tornou a seleção de cartas determinística para permitir comparação válida das três direções.

Após essa revisão, o autor aprovou explicitamente a **Opção A — Leque** para uso em implementação posterior.

Esta aprovação substitui qualquer estado anterior de "em avaliação" para a mão do jogador.

---

## 18. Resultado final

**APROVADA: OPÇÃO A — LEQUE.**

A implementação posterior deve usar o leque como linguagem oficial da mão do jogador em 2D e 3D, respeitando os contratos de legibilidade, seleção, câmera, responsividade, acessibilidade e separação entre apresentação e estado autoritativo descritos neste documento.

Qualquer mudança material para Holster, Tray, carrossel de uma carta por vez, mão lateral permanente ou outra linguagem visual deverá ser tratada como **reabertura explícita de VIS-HAND-001** e não como simples detalhe de implementação.
