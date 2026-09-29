# VIS-004 — Terreno, SPD e movimento avançado

**Status:** EM TESTE — nenhuma opção visual A/B/C aprovada ainda  
**Data do experimento:** 2026-09-29  
**Herda sem reabrir:** VIS-002 (2D/3D + câmera) e VIS-003 Parte 1 (A — área cheia + confirmação de movimento)

## 1. Pergunta

Como apresentar custos especiais de movimento, terreno impassável, SPD negativo, recuperação de SPD e movimento como Reação sem perder a legibilidade já aprovada do planejamento de movimento em 2D/3D?

## 2. Decisões já fixas herdadas

VIS-004 **não reabre**:

- área cheia como overlay normal de blocos alcançáveis;
- 2D e 3D selecionáveis durante gameplay;
- câmera fora do estado/hash autoritativo;
- clique + confirmação, `Enter` e duplo clique em destino legal como gestos equivalentes;
- duplo clique em monstro como seleção + foco traseiro;
- movimento revalidado bloco a bloco;
- desempate experimental `N,E,S,W,NE,SE,SW,NW` continua provisório.

## 3. Regras do GDD exercitadas

Esta etapa exerce somente regras já registradas no GDD:

- 1 SPD = 1 bloco no custo-base;
- terreno pode aumentar/reduzir custo de SPD;
- um terreno pode exigir mais SPD que o valor atual: a entrada é permitida e o SPD pode ficar negativo, sem piso universal;
- enquanto SPD está negativo, o monstro pode agir/atacar/usar habilidades, mas não pode iniciar outro movimento até possuir pelo menos 1 SPD;
- recuperação em pacotes de +2 SPD após 8 segundos de ociosidade;
- qualquer movimento ou Ação com o monstro reinicia o timer;
- SPD excedente ao máximo é perdido;
- a regeneração de uma unidade recém-colocada só começa depois do primeiro gasto de SPD;
- movimento pode ser fracionado enquanto houver SPD;
- movimento como Reação consome 1 Reação + o SPD do deslocamento quando o estado da Corrente permitir;
- GLIDER ignora custos/efeitos especiais de terreno e pode atravessar terreno impassável, mas não terminar nele; unidades e obstáculos continuam bloqueando;
- LEAPER continua com o contrato já exercitado pelo VIS-003.

## 4. Limite importante — custo de terreno não inventado

O GDD **não define um valor universal genérico** como “água custa 2” ou “arbusto custa 3”. Além disso, aumentos de custo de movimento devem vir de Campos/áreas de efeitos com valor e duração escritos na carta.

Por isso, VIS-004 usa `Campo A` como **fixture QA configurável**:

- padrão: `1 SPD` por entrada, ou seja, nenhum modificador;
- o campo numérico da interface pode elevar o custo somente para stress/reprodução;
- o botão `stress SPD negativo` seleciona P1-D, que começa adjacente ao Campo A, e configura o custo de entrada para `SPD atual + 1`;
- esses números **não são regras de Monster Impact** e não devem ser copiados para conteúdo final.

## 5. A/B/C em avaliação — leitura de terreno/custo

A comparação desta etapa é somente sobre **como comunicar o custo especial**, não sobre o overlay de movimento, que já está aprovado como área cheia.

### A — badge persistente

- Campo especial recebe tint visível;
- cada bloco afetado mostra `×N` persistentemente;
- melhor para leitura imediata de custo;
- maior densidade visual.

### B — custo somente no caminho

- Campo especial continua tintado;
- números aparecem apenas nos passos do caminho atualmente proposto;
- reduz ruído quando o jogador não está planejando atravessar a área.

### C — mapa sutil / painel

- Campo especial usa borda/tint discreta;
- custo fica concentrado no preview/painel lateral;
- menor poluição, porém exige mais atenção ao painel.

**Nenhuma opção está aprovada.**

## 6. Terreno impassável e GLIDER

O cenário adiciona blocos impassáveis de stress, marcados com X visual.

- unidade normal precisa contornar;
- GLIDER P1-C pode atravessar;
- GLIDER não pode selecionar o bloco impassável como destino final;
- unidade, base e obstáculo continuam aplicando seus bloqueios normais.

## 7. SPD negativo

Implementação conservadora desta etapa:

- não existe overspend universal;
- uma rota pode ultrapassar o SPD atual apenas quando o **último passo** é a entrada em uma área de custo especial maior que o SPD restante;
- ao entrar, o custo completo é pago e SPD pode ficar negativo;
- depois disso, novo movimento é rejeitado até a recuperação levar SPD a pelo menos 1.

Esse recorte evita transformar a regra específica de terreno em permissão geral para caminhar sem SPD.

## 8. Recuperação

A simulação continua em 20 Hz / 50 ms.

- 8 segundos = 160 passos lógicos;
- primeiro gasto de SPD inicia o processo de recuperação;
- movimento reinicia o marcador de ociosidade;
- o botão `registrar Ação QA` representa somente o evento de “uma Ação ocorreu com esta unidade” para reiniciar o timer;
- ele **não implementa** orçamento/custo de Ações nesta etapa;
- ao completar 160 ticks ociosos, aplica-se um pacote de +2, limitado por `SPD máximo`;
- excedente é registrado como perdido.

## 9. Movimento como Reação — harness, não Corrente completa

A UI oferece:

- `Janela de Reação QA`;
- `Confirmar próximo MOVE como Reação`;
- contador QA de Reações.

Quando habilitado:

- confirmação exige janela aberta;
- exige ao menos 1 Reação QA;
- 1 Reação é consumida na confirmação;
- SPD é consumido durante o deslocamento bloco a bloco;
- sem janela/recurso, a confirmação é rejeitada.

Isso **não implementa Correntes, Cross Chains, prioridade de resposta ou condições completas de resposta**. Esses sistemas permanecem em protótipos posteriores.

## 10. Movimento fracionado

O núcleo do experimento não marca uma unidade como “movida no turno”. Após concluir uma rota, se ainda possuir SPD >= 1 ela pode iniciar outro movimento, preservando o SPD restante. Isso permite testar a base de `mover → outra atividade → continuar movendo` sem antecipar o sistema completo de Ações.

## 11. Determinismo e arquitetura

- pathfinding usa custo ponderado inteiro;
- desempate é estável;
- execução é bloco a bloco;
- custo da rota e estado de recuperação entram no estado/hash;
- fixture QA de custo e janela/recurso de Reação entram no estado/hash porque alteram legalidade/custos do experimento;
- escolha visual A/B/C, câmera e orientação não entram no hash;
- renderização continua separada da simulação fixa.

## 12. Evidência atual

- `30/30` testes Node;
- `30/30` testes embutidos;
- `16/16` checks de interação em Chromium/Playwright;
- sem exceções JavaScript nos cenários automatizados;
- inspeção visual em 1440×900 confirma painel lateral rolável e preservação do campo 31×17.

## 13. Critérios para aprovação visual

O autor deve comparar A/B/C observando:

- custo especial reconhecível antes da confirmação;
- distinção inequívoca entre área alcançável e área de Campo/custo;
- leitura em 2D e 3D;
- capacidade de perceber que um destino levará SPD abaixo de zero;
- baixa poluição quando outros overlays futuros forem adicionados;
- leitura em janela menor.

A aprovação de uma alternativa visual não transforma o valor numérico QA do Campo em regra de gameplay.

## 14. Próximo passo após aprovação

Depois de fechar a leitura visual de terreno/SPD, o sucessor recomendado é VIS-005 — VIS/Fog of War, alcance e seleção de alvos, herdando os contratos espaciais e de câmera já aprovados.
