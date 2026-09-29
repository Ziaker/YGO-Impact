# VIS-003 — Movimento tático · Parte 1/5

**Status:** **APROVADO pelo autor em 2026-09-29 — Opção A (Área cheia)**  
**Dependências aprovadas:** VIS-001 (composição melhorada registrada no roadmap) e VIS-002 (2D/3D + câmera)  
**Executável local de evidência:** VIS-003 Parte 1; integração executável ao diretório `prototypes/` é tratada separadamente da decisão documental.

## 1. Pergunta do experimento

Como apresentar e confirmar movimento em um mapa 31 × 17 de modo que o jogador consiga compreender, antes de pagar qualquer custo:

- quais blocos pode alcançar;
- qual caminho será usado;
- quantos pontos de SPD serão consumidos;
- quanto SPD restará;
- por que um destino é ilegal;
- onde aliados podem ser atravessados;
- onde inimigos/obstáculos bloqueiam;
- quando LEAPER cria uma diagonal legal;
- e que a mesma decisão é idêntica em 2D e 3D?

## 2. Contrato funcional comum às alternativas

Todas as alternativas A/B/C consumiram o mesmo resultado de planejamento. A camada visual não calcula caminhos por conta própria.

Fluxo:

`seleção → consulta de alcançabilidade → hover → destino travado → confirmação → fila → revalidação → mutação → eventos → hash/snapshot → animação visual`

A confirmação pode ser expressa por três gestos equivalentes de interface: botão, `Enter` ou **duplo clique em um destino livre/legal**. O duplo clique não pula nenhuma etapa lógica: ele trava o mesmo destino e chama a mesma rotina de confirmação transacional. Duplo clique em um bloco ocupado por monstro mantém a função aprovada de seleção/foco de câmera e não cria movimento.

A prévia é cancelável sem custo. Após a confirmação não existe undo.

## 3. Opções comparadas e decisão aprovada

### A — Área cheia — **APROVADA**

Preenche cada destino alcançável e desenha o caminho proposto com alta presença visual.

**Decisão do autor:** esta é a apresentação padrão de movimento em gameplay. O jogador deve manter uma opção explícita para escolher a orientação de câmera entre **2D** e **3D**. A troca de orientação preserva seleção, destino, caminho, movimento em andamento e estado lógico; câmera/orientação não alteram regras nem hash.

### B — Custo por bloco — não selecionada

Usa a área alcançável e imprime o custo mínimo de SPD nos blocos, com intensidade proporcional ao custo.

Permanece como evidência histórica/comparativa para QA, não como opção normal de gameplay.

### C — Mínimo — não selecionada

Usa pontos discretos para alcançabilidade e mantém o caminho proposto como principal feedback.

Permanece como evidência histórica/comparativa para QA, não como opção normal de gameplay.

## 4. Cenário de stress

- 31 × 17;
- cinco unidades por lado;
- bases em `(0,8)` e `(30,8)`;
- aliado P1-B diretamente no corredor de P1-A para testar passagem por aliado;
- inimigo avançado para criar bloqueio relevante;
- obstáculos em corredores centrais;
- regiões visuais de terreno e Campos preservadas do stress do VIS-002;
- unidade de stress com `LEAPER 2` apenas para testar a Keyword, sem declarar conteúdo final.

## 5. Regras verificadas nesta parte

- SPD representa blocos percorridos nesta etapa;
- movimento básico ortogonal;
- aliado atravessável e não ocupável como destino;
- inimigo bloqueia passagem e destino;
- uma unidade por bloco confirmado;
- base sólida;
- diagonal somente por regra/Keyword, com LEAPER exercitado;
- corte diagonal de esquina permitido quando LEAPER autoriza e o destino é legal;
- ações ilegais informam motivo;
- prévia e seleção não pagam custo;
- confirmação revalida antes da mutação;
- duplo clique em destino livre/legal reutiliza exatamente a mesma confirmação do botão/`Enter`;
- duplo clique em monstro nunca é interpretado como movimento;
- a ordem de comandos é estável;
- câmera/render não alteram estado/hash.

## 6. Desempate de pathfinding

O GDD exige desempate estável e documentado, mas não define uma ordem cardinal universal para caminhos equivalentes.

Por isso, esta versão de protótipo usa explicitamente:

`N → E → S → W → NE → SE → SW → NW`

Essa ordem é **política provisória do experimento**. Ela serve para tornar testes e comparações reproduzíveis; não deve ser copiada para o núcleo final como regra canônica sem uma decisão que a autorize.

## 7. Tratamento da passagem por aliado

A regra “aliado pode ser atravessado” convive com a invariante “uma unidade por bloco”. Para o protótipo:

- o planejador permite o bloco aliado no caminho;
- o bloco aliado continua ilegal como destino final;
- a confirmação valida cada bloco do caminho;
- a passagem gera evento de trânsito específico no protótipo;
- o snapshot final permanece com uma unidade por bloco;
- a animação pode cruzar visualmente o aliado, sem criar ocupação autoritativa duplicada.

## 8. Timing e animação

A simulação continua a 20 Hz / 50 ms. O comando é processado no passo lógico seguinte à confirmação.

A duração visual usada para reproduzir a rota é deliberadamente **apresentação**, não uma regra de velocidade por bloco. Reduzir animação pode remover a interpolação sem mudar custo, caminho, comando ou estado confirmado.

## 9. Resultado e evidência

A revisão aprovada inclui confirmação rápida por duplo clique em destino livre/legal, preservando duplo clique em monstro como foco/seleção.

**Resultado aprovado:** A — Área cheia. B e C permanecem somente como evidência histórica/comparativa e podem ser exercitadas no modo QA; não são opções normais de gameplay.

Evidência automatizada da revisão aprovada:

- **25/25 testes Node**;
- **25/25 testes embutidos**;
- **14/14 checks de interação real em Chromium/Playwright**;
- nenhuma exceção JavaScript nos cenários exercitados.

A Parte 1 está fechada como decisão visual aprovada.

## 10. Contrato aprovado que protótipos seguintes devem herdar

- **A — área cheia** como overlay normal de movimento;
- seletor de orientação **2D / 3D** sempre disponível ao jogador;
- troca 2D ↔ 3D sem alteração de estado, caminho, custo, seleção, movimento em andamento ou hash;
- QA 2D+3D continua sendo ferramenta de desenvolvimento, não terceira orientação normal;
- B/C ficam preservadas apenas como evidência de comparação;
- botão/Enter e duplo clique em destino livre/legal continuam gestos equivalentes de confirmação;
- duplo clique em monstro continua reservado a seleção + foco traseiro de câmera.

## 11. Próxima etapa

O sucessor recomendado é **VIS-004 — Terreno, SPD e movimento avançado**, adicionando custos de terreno, SPD negativo conforme GDD, movimento fracionado em contexto mais amplo, recuperação de SPD e movimento como Reação, sem reabrir as decisões aprovadas desta Parte 1.