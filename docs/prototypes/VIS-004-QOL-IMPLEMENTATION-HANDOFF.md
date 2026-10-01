# Handoff de implementação do VIS-004 e do pacote de qualidade de uso

## Finalidade deste documento

Este documento deve ser entregue integralmente à próxima IA responsável pelo repositório YGO Impact, também chamado Monster Impact. Ele descreve o estado real dos arquivos, as decisões já tomadas pelo autor, as regras confirmadas no GDD v0.43, o que o protótipo VIS-004 já implementa, o que ainda falta e quais verificações precisam passar antes de o trabalho ser considerado concluído.

O objetivo não é iniciar uma nova rodada de decisões de design. O pacote de qualidade de uso descrito aqui já foi fechado pelo autor. A próxima IA deve trabalhar de forma contínua e autônoma, interrompendo apenas se encontrar um conflito real entre fontes autoritativas ou uma decisão material que não possa ser inferida com segurança. Dúvidas comuns de implementação, nomes internos, organização de módulos e detalhes reversíveis devem ser resolvidos com bom julgamento técnico, sem exigir aprovação a cada etapa.

Este documento é um handoff operacional. Ele não transforma automaticamente alternativas visuais ainda em teste em opções aprovadas.

## Resultado esperado

Ao final do trabalho, o repositório deve conter:

1. o GDD v0.43 registrado como fonte canônica mais recente, sem apagar indevidamente evidências históricas;
2. um registro honesto do VIS-003, deixando explícito o que está comprovadamente aprovado e o que não possui snapshot recuperado;
3. o VIS-004 executável dentro da estrutura do repositório, não apenas em Downloads;
4. a implementação completa do pacote de qualidade de uso de movimento, terreno, SPD, recuperação e Reação;
5. testes automatizados e verificações executáveis proporcionais aos comportamentos adicionados;
6. documentação atualizada em `docs/prototypes`, no inventário de protótipos e no roadmap pertinente;
7. nenhum commit, push, pull request ou publicação sem autorização explícita do autor.

## Repositório e arquivos de entrada

### Repositório correto

O repositório Git está em:

```text
C:\Users\zerke\.codex\.chatgpt-projects\g-p-6abb290c43ac819185045c771de11f6f\YGO-Impact
```

A pasta imediatamente acima não é a raiz Git. Não execute inspeções ou alterações presumindo que a raiz do projeto ChatGPT seja o repositório.

### GDD mais recente

O GDD mais recente fornecido pelo autor é:

```text
C:\Users\zerke\Downloads\Monster_Impact_GDD_v0.43.docx
```

Metadados verificados:

- tamanho: 97.352 bytes;
- modificação: 29/09/2026 21:19:33;
- SHA-256: `6E40F214F2A254F5A30F54D64B4C74CCCC352DF1785E340E9EB4736A06C17FA9`.

O repositório ainda registra o GDD v0.42 em `docs/context/sources/Monster_Impact_GDD_v0.42.docx` e descreve essa versão como canônica em `docs/context/GDD_SOURCE.md`. Isso está desatualizado. A próxima IA deve adicionar a v0.43 à fonte versionada, verificar sua integridade e atualizar a documentação que aponta para a fonte mais recente. Não deve apagar a v0.42 sem antes determinar se ela precisa permanecer como histórico.

Se o arquivo de Downloads não estiver disponível no ambiente da próxima IA, ela deve solicitar ao autor apenas o reenvio desse arquivo. Ela não deve reconstruir o GDD a partir de resumos.

### Protótipo VIS-004 existente

O artefato executável existente está em:

```text
C:\Users\zerke\Downloads\VIS-004-standalone.html
```

Metadados verificados:

- tamanho: 90.100 bytes;
- modificação: 30/09/2026 15:09:08;
- SHA-256: `C17E2CDAFFDA4E820C18E228E4B44C639B84DA4F38D421EF0ADFA255D430BB39`;
- título: `Monster Impact — VIS-004 · Terreno, SPD e movimento avançado`;
- identificação interna: `Parte 2/5 · terreno + SPD`;
- quantidade atual de testes embutidos: 33.

Esse arquivo deve ser tratado como ponto de partida e evidência, não como produto concluído. Ele afirma herdar do VIS-003 a opção `A — área cheia` e mantém as orientações 2D e 3D aprovadas no VIS-002. As alternativas A, B e C específicas de leitura de terreno continuam marcadas como `EM TESTE`.

## Estado do Git e preservação do trabalho existente

Na inspeção deste handoff, o repositório possuía aproximadamente 85 entradas modificadas ou não rastreadas. Há trabalho local substancial no núcleo autoritativo, testes, documentação, scripts e workflow.

A próxima IA deve obrigatoriamente:

1. executar `git status --short` antes de editar;
2. ler qualquer `AGENTS.md` aplicável;
3. considerar todos os arquivos modificados e não rastreados como trabalho do autor ou de outras sessões;
4. não usar `git reset --hard`, `git clean`, checkout destrutivo ou qualquer operação equivalente;
5. não descartar mudanças para obter uma árvore limpa;
6. limitar alterações ao escopo do GDD v0.43, VIS-003, VIS-004 e documentação diretamente afetada;
7. revisar o diff final distinguindo claramente alterações preexistentes das alterações feitas nesta tarefa.

O estado sujo do repositório não é motivo para abandonar o trabalho. É uma exigência de integração cuidadosa.

## Ordem de autoridade

Quando houver divergência, aplicar a seguinte precedência:

1. instrução explícita mais recente do autor;
2. correção mais recente do autor;
3. GDD v0.43;
4. regra específica do projeto;
5. regra geral do projeto;
6. testes que reflitam decisões vigentes;
7. implementação existente.

Código antigo, comentários antigos, protótipos anteriores ou regras oficiais de Yu-Gi-Oh! não prevalecem sobre o GDD e as correções do autor.

## Regras confirmadas no GDD v0.43

As regras abaixo foram verificadas diretamente no documento v0.43 e devem orientar tanto o protótipo quanto os testes.

### Prévia e legalidade

- Uma ação ilegal não pode ser confirmada.
- A interface deve informar o motivo específico da ilegalidade, como custo insuficiente, alvo inválido ou ausência de espaço.
- Ao selecionar movimento, ataque ou área, a interface deve mostrar antes da confirmação os blocos legais, custo previsto, alcance, linha, área afetada e alvos conhecidos.
- O jogador pode cancelar ou alterar a seleção sem custo até a confirmação final.
- Decisões sobre interação, animação, timing, legibilidade durante movimento ou resposta do sistema exigem protótipo executável.

### SPD e terreno

- `1 SPD = 1 bloco` no custo-base.
- Mover um bloco normalmente consome 1 SPD.
- Terreno pode aumentar ou reduzir esse custo.
- Portanto, SPD não deve ser apresentado como quantidade absoluta de passos garantidos. A interface pode dizer quantos blocos seriam possíveis em custo-base, mas deve deixar explícito que terrenos e efeitos modificam o custo real.
- O GDD não define um custo genérico universal para todos os terrenos. Valores numéricos usados pelo VIS-004 para exercitar terreno caro são fixtures de QA e não podem ser promovidos a regra canônica.

### SPD negativo

- Se o custo de entrada em um terreno exceder o SPD restante, a unidade pode entrar quando a entrada final for legal.
- O SPD pode ficar negativo sem piso universal.
- Enquanto estiver com SPD negativo, a unidade pode agir, atacar e usar habilidades normalmente.
- A única restrição universal nesse estado é não poder iniciar outro movimento até recuperar pelo menos 1 SPD.
- A apresentação deve distinguir claramente uma entrada legal com consequência de uma entrada ilegal.

### Recuperação de SPD

- A recuperação ocorre em pacotes de `+2 SPD` após 8 segundos de ociosidade.
- Qualquer movimento ou Ação realizada pelo monstro reinicia o timer de ociosidade.
- O excedente acima do SPD máximo é perdido.
- Timers de gameplay usam passos lógicos e não dependem da taxa de quadros da renderização.
- O menu de pausa e a perda de foco da janela pausam mapa, timers, IA, Correntes e animações de gameplay conforme o GDD.

### Movimento como Reação

- Movimento como Reação consome `1 Reação + o SPD correspondente ao deslocamento`.
- Uma resposta de movimento pode integrar uma Corrente já aberta quando o estado permitir.
- Movimento defensivo sem alvo inimigo não abre uma Corrente isoladamente.
- O harness atual do VIS-004 testa somente custo e validação espacial. Ele não deve fingir implementar toda a semântica de Corrente ou Cross Chain.

### Ocupação e travessia

- Há no máximo um monstro por bloco.
- A base é sólida e não ocupável.
- Um monstro pode atravessar um bloco ocupado por aliado, mas não pode terminar o movimento nele.
- Um monstro não pode atravessar nem terminar em bloco ocupado por inimigo.
- Movimento diagonal não é básico. Só existe por Keyword ou efeito.
- GLIDER ignora custos e efeitos especiais de terreno e pode atravessar terreno impassável, mas termina somente em bloco normalmente ocupável. Unidades e obstáculos continuam bloqueando salvo texto específico.

### Separação entre lógica e apresentação

- Existe um único núcleo autoritativo.
- A interface e o renderer não alteram diretamente o estado; enviam comandos e consomem snapshots.
- A simulação opera a 20 Hz, em passos de 50 ms.
- Renderização, animação, câmera, som e overlays não determinam regras.
- Com os mesmos dados, comandos e seed, web, headless, replay e partida devem produzir estados, eventos, hashes e resultados equivalentes.
- A lógica usa inteiros ou ponto fixo. Ponto flutuante pertence à apresentação.

## O que está comprovadamente decidido sobre VIS-003

O repositório atualmente não contém um arquivo executável ou documento próprio do VIS-003. Contudo, o VIS-004 contém evidência textual explícita de que herda:

- `A — área cheia` como apresentação aprovada de blocos alcançáveis;
- a área cheia nas orientações 2D e 3D;
- a grade composta por blocos quadrangulares. Não substituir os blocos por octógonos ou outra forma que altere a leitura da grade.

A próxima IA não deve afirmar que recuperou o snapshot original do VIS-003 se não o encontrou. Deve criar um registro documental honesto, por exemplo `docs/prototypes/VIS-003-movement-reachability.md`, contendo:

- a decisão comprovada;
- a origem da evidência no VIS-004 e nas correções do autor;
- a ausência atual do snapshot independente;
- o limite da aprovação: área cheia para alcançabilidade, sem aprovar automaticamente terreno, custos, timing, animações ou todos os QoL do VIS-004.

Não inventar uma opção B ou C vencedora, data exata de aprovação, números de alcance ou geometria de movimento não confirmada.

## Auditoria do VIS-004 atual

### Já implementado de forma substancial

O HTML atual contém, em algum grau verificável:

- mapa lógico de 31 × 17 blocos;
- orientações 2D e 3D usando o mesmo estado;
- modo QA lado a lado;
- overlays de blocos alcançáveis;
- planejamento de movimento com confirmação;
- cálculo de rota ponderada de menor custo com desempate determinístico provisório;
- custo por passo e custo total no modelo de rota;
- terreno impassável;
- fixture de Campo QA com custo configurável;
- entrada final em terreno caro capaz de deixar SPD negativo;
- bloqueio de novo movimento quando SPD está abaixo de 1;
- passagem por aliado sem permitir destino final ocupado;
- bloqueio por inimigo;
- LEAPER e GLIDER exercitados no cenário;
- execução de movimento bloco a bloco;
- estado textual `MOVENDO`;
- recuperação de SPD a cada 160 ticks, equivalentes a 8 segundos em 20 Hz;
- perda de excedente acima do SPD máximo;
- contador de recuperação desenhado sobre unidades abaixo do máximo;
- popup `+2SPD` quando há ganho;
- reinício do timer por movimento e por Ação QA;
- harness QA de movimento como Reação;
- consumo de 1 Reação na confirmação do movimento de Reação;
- redução de movimento manual e respeito a `prefers-reduced-motion`;
- pausa manual, por perda de foco e por aba oculta;
- hash de estado que exclui câmera e alternativas puramente visuais;
- 33 testes embutidos.

### Parcial ou insuficiente

Os itens abaixo existem apenas parcialmente e precisam ser concluídos:

- o SPD aparece no painel lateral, mas não como badge de leitura imediata junto à unidade;
- o painel mostra custo total e SPD posterior, mas não apresenta de modo unificado `SPD antes → SPD depois`;
- ilegalidades aparecem em painel e toast, mas não ficam ancoradas junto ao cursor ou destino;
- há um ícone de relógio com contagem regressiva, mas não um anel de progresso claramente legível;
- a rota guarda custo acumulado internamente, mas a visualização B desenha custo do passo, não o acumulado em cada ponto;
- o motivo `entrada legal: custo do terreno deixará SPD negativo` existe, mas não há uma terceira categoria visual completa e consistente para `legal com consequência`;
- GLIDER aparece como texto no painel e afeta a lógica, mas não possui indicador visual próprio bem definido no mapa;
- o contador de Reações aparece no painel, não próximo ao cursor durante o planejamento;
- há resumo de hover no painel, mas não uma ficha contextual completa no ponto de interação;
- parte da interface está em HTML screen-space, mas os elementos contextuais prometidos ainda não foram implementados dessa forma.

### Ausente no HTML atual

Os itens abaixo não devem ser marcados como concluídos sem implementação e teste:

- badge `SPD atual` sobre ou junto ao monstro, com hierarquia de colisão;
- popup contextual `SPD atual/máximo • até N blocos em custo-base`;
- apresentação consolidada `SPD antes → depois`;
- alerta contextual completo de SPD negativo;
- anel de progresso do timer;
- pulso do badge ao recuperar SPD;
- tooltip de recuperação;
- indicação visual do reinício do timer;
- custos acumulados visíveis ao longo da rota;
- tooltips de terreno;
- legenda recolhível;
- segundo clique no mesmo destino para cancelar a prévia;
- cancelamento contextual coerente por clique fora, Escape e troca de contexto;
- persistência da rota e do destino enquanto o movimento está sendo executado;
- contador de Reações junto ao cursor;
- modo QA de informação reduzida;
- hierarquia automática entre badges sobrepostos;
- contrato opcional de som sem dependência funcional do áudio.

## Especificação completa do pacote de qualidade de uso

### 1. Badge de SPD atual

Cada unidade controlável deve possuir um badge compacto que mostre o SPD atual de forma legível em 2D e 3D.

Requisitos:

- usar screen-space ou projeção para screen-space, mantendo tamanho legível independentemente do zoom;
- não participar do estado autoritativo nem do hash;
- atualizar durante movimento bloco a bloco e após recuperação;
- indicar valores negativos sem depender apenas de cor;
- coexistir com timer, Keyword e outros badges por hierarquia automática;
- respeitar Fog of War e informação legalmente conhecida;
- não ocultar o centro da unidade nem o destino de movimento.

### 2. Popup resumido de mobilidade

Ao selecionar ou inspecionar uma unidade controlável, mostrar:

```text
SPD atual/máximo • até N blocos em custo-base
```

`N` é uma explicação do custo-base, não uma promessa de alcance absoluto. O texto ou tooltip deve esclarecer que terreno, efeitos, bloqueios, diagonais permitidas e ocupação alteram o caminho e o custo real.

### 3. Prévia de SPD antes e depois

Ao passar o cursor sobre um destino ou travá-lo:

```text
SPD 7 → 3
```

Para consequência negativa:

```text
SPD 2 → -3
LEGAL COM CONSEQUÊNCIA
Novo movimento bloqueado até SPD ≥ 1
```

Não exibir apenas `SPD após`. O antes e o depois precisam ser compreensíveis sem o usuário procurar o valor atual em outro painel.

### 4. Três estados de legalidade

Todo destino avaliado deve cair em uma destas categorias:

1. `LEGAL`: pode ser confirmado sem consequência excepcional;
2. `LEGAL COM CONSEQUÊNCIA`: pode ser confirmado, mas deixa SPD negativo ou produz outra consequência já prevista pelo protótipo;
3. `ILEGAL`: não pode ser confirmado.

Cada categoria precisa combinar:

- cor;
- ícone ou forma;
- texto explícito;
- estilo de rota e destino;
- estado coerente do botão de confirmação.

Não depender apenas de verde, amarelo e vermelho. Usuários com deficiência de percepção de cor precisam distinguir os estados.

### 5. Motivos de ilegalidade junto ao cursor

Ao apontar para um destino ilegal, apresentar junto ao cursor ou bloco:

- título curto, por exemplo `ILEGAL`;
- motivo específico, como `SPD insuficiente`, `base sólida`, `ocupado por aliado`, `inimigo bloqueia passagem`, `terreno impassável`, `janela de Reação fechada` ou `sem Reação disponível`;
- valores úteis quando aplicável, por exemplo `custo 8 > SPD 5`.

O painel lateral pode repetir a informação, mas não substitui o feedback no ponto de interação.

O componente deve permanecer dentro da viewport, mudar de lado quando estiver próximo às bordas e evitar cobrir o bloco analisado.

### 6. Rota e custos acumulados

A rota deve continuar sendo a rota legal de menor custo segundo o modelo do protótipo.

Exibir:

- caminho completo;
- destino;
- custo do passo quando útil;
- custo acumulado em pontos relevantes ou em cada bloco, conforme legibilidade;
- custo total;
- SPD previsto após a chegada;
- diferença visual para trechos de terreno especial;
- indicação de passagem por aliado sem sugerir que o bloco ocupado é destino permitido.

Não trocar o cálculo por caminho de menor quantidade de blocos quando existir rota mais barata com mais blocos. O desempate deve permanecer explícito e determinístico.

### 7. Persistência durante execução

Depois da confirmação:

- manter a rota confirmada visível até conclusão, interrupção ou invalidação;
- manter o destino final marcado;
- mostrar progresso ao longo da rota;
- manter o rótulo `MOVENDO`;
- atualizar SPD gasto bloco a bloco;
- se a execução parar por revalidação, destacar o último bloco alcançado e informar o motivo;
- não permitir que hover casual substitua visualmente a rota em execução.

A implementação atual limpa `pendingPlan` e `pendingTarget` na confirmação e deixa de desenhar a rota. Isso precisa ser corrigido usando o movimento ativo como fonte de apresentação, sem mutar o estado por meio do renderer.

### 8. Cancelamento previsível

Antes da confirmação, o usuário deve poder cancelar sem custo por:

- botão visível;
- tecla Escape;
- segundo clique no mesmo destino travado;
- troca explícita para outra unidade controlável;
- clique fora do mapa quando isso não conflitar com pan ou câmera.

O cancelamento deve limpar destino, rota, resumo e estado contextual. Não deve cancelar movimento já confirmado. Depois da confirmação, qualquer interrupção precisa seguir regras do núcleo, não um cancelamento puramente visual.

### 9. Timer de recuperação

O badge de recuperação deve conter um anel ou arco de progresso, além do número de segundos.

Requisitos:

- progresso calculado a partir de ticks lógicos;
- contagem compatível com 160 ticks em 20 Hz;
- tooltip explicando `+2 SPD após 8 s sem movimento nem Ação`;
- estado distinguível quando pausado, em movimento ou no máximo;
- ao reiniciar o timer, fornecer feedback breve e claro;
- esconder ou adaptar o badge quando SPD está no máximo;
- não usar animação contínua quando redução de movimento estiver ativa;
- não alterar a lógica por causa do desenho do anel.

### 10. Recuperação de SPD

Quando ocorrer recuperação válida:

- mostrar `+2SPD`, ou o ganho real se o máximo limitar o pacote;
- atualizar o badge de SPD imediatamente após o passo confirmado;
- aplicar pulso visual curto ao badge;
- com redução de movimento, substituir pulso expansivo por mudança estática ou fade discreto;
- informar excedente perdido apenas no log ou tooltip quando isso ajudar, sem poluir o mapa;
- não reproduzir som obrigatório.

### 11. Terreno

Cada tipo de terreno exercitado deve ter tooltip ou resumo contextual com:

- nome;
- custo de entrada aplicável à unidade selecionada;
- se é transitável;
- se pode ser destino final;
- interação relevante com GLIDER;
- aviso `fixture QA` quando o custo não é regra canônica do GDD.

A legenda deve ser recolhível, acessível por teclado e iniciar em estado que não obstrua o mapa. As opções A, B e C de apresentação de terreno continuam em teste até aprovação explícita. Não escolher silenciosamente uma delas como arte final.

### 12. Aliados, inimigos e ocupação

A interface deve comunicar:

- aliado: atravessável, mas não ocupável como destino;
- inimigo: bloqueia passagem e destino;
- base: sólida, bloqueia passagem e destino;
- obstáculo: comportamento conforme fixture;
- terreno impassável: bloqueado salvo permissão específica;
- GLIDER: pode atravessar impassável, mas não terminar nele.

O indicador de aliado atravessável não pode parecer um destino válido. O indicador de GLIDER deve ser visível no mapa e possuir texto ou ícone acessível.

### 13. Movimento como Reação

Quando o modo Reação estiver ativo, o resumo contextual deve mostrar:

```text
1 Reação + X SPD
```

Também deve mostrar próximo ao cursor:

- Reações atuais;
- Reações restantes após confirmação;
- custo de SPD;
- motivo de bloqueio se a janela estiver fechada ou não houver Reação.

O harness deve continuar identificado como QA. Não simular Corrente completa, prioridade ou Cross Chain sem integração real com o núcleo autoritativo.

### 14. Modo QA de informação reduzida

Adicionar um modo que permita verificar se a interface continua compreensível quando somente informação legalmente disponível é mostrada.

Esse modo deve:

- ocultar dados de inimigos que não seriam conhecidos;
- respeitar Fog of War e última posição conhecida;
- não revelar custos, Keywords, armadilhas, cartas ou posições ocultas indevidas;
- permitir comparação com a visão completa de desenvolvimento;
- deixar evidente quando está ativo;
- permanecer fora do hash se for apenas filtro de apresentação sobre snapshots equivalentes.

Não confundir informação reduzida com remover informações do próprio jogador necessárias para planejar uma ação legal.

### 15. Hierarquia automática de badges

Quando SPD, recuperação, Keyword, Reação, alerta e outros indicadores coincidirem:

- ordenar por prioridade sem sobreposição ilegível;
- manter espaçamento consistente em 2D e 3D;
- inverter ou deslocar a pilha perto das bordas;
- reduzir detalhes secundários antes de ocultar informações críticas;
- manter texto crítico acessível por tooltip ou resumo;
- respeitar escala de interface e resoluções suportadas.

Prioridade recomendada para o protótipo:

1. ilegalidade ou consequência imediata;
2. SPD atual e custo previsto;
3. Reação e confirmação;
4. recuperação;
5. Keyword e informação auxiliar.

Essa ordem é de apresentação e pode ser refinada tecnicamente sem alterar regras.

### 16. Hover contextual

O hover deve resumir, conforme o contexto:

- coordenada;
- terreno;
- estado legal;
- custo total;
- SPD antes e depois;
- quantidade de blocos e custo-base;
- Reação consumida e restante;
- consequência de SPD negativo;
- ocupante e restrição de ocupação;
- interação com GLIDER ou outra Keyword relevante.

Evitar painel excessivamente grande. Mostrar primeiro a informação necessária para decidir; detalhes adicionais podem aparecer em tooltip expandido.

### 17. Screen-space e câmera

Informações contextuais devem manter tamanho estável e legível independentemente da câmera 2D ou 3D. Elementos projetados precisam acompanhar corretamente o bloco ou unidade sem entrar no estado lógico.

Testar:

- zoom mínimo e máximo;
- órbita e elevação 3D;
- pan;
- bordas da tela;
- modo QA dividido;
- resolução estreita;
- escala de pixel do dispositivo.

### 18. Redução de movimento

O protótipo já possui preferência do sistema e toggle manual. Completar o comportamento para abranger:

- pulso de SPD;
- movimento de popups;
- animação do anel;
- transições de tooltip;
- foco de câmera;
- qualquer nova animação adicionada.

A redução deve mudar somente a apresentação. Timing lógico, custo, ticks, comandos, eventos e hash permanecem idênticos.

### 19. Contrato opcional de som

Definir uma interface de apresentação para eventos sonoros, sem exigir arquivos de áudio e sem tornar o áudio necessário para compreender o estado.

Eventos candidatos:

- destino legal travado;
- destino ilegal;
- confirmação;
- cancelamento;
- movimento interrompido;
- recuperação de SPD;
- timer reiniciado;
- modo Reação indisponível.

Requisitos:

- padrão silencioso;
- nenhuma regra depende de áudio;
- cada som possui equivalente visual e textual;
- respeitar mute/redução futura;
- chamadas sonoras consomem eventos da apresentação e não alteram o estado.

## Fluxo de interação que deve funcionar

### Seleção e hover

1. O jogador seleciona uma unidade própria.
2. A interface mostra SPD atual/máximo e alcance em custo-base com ressalva de modificadores.
3. Blocos alcançáveis usam a área cheia aprovada no VIS-003.
4. Ao passar o cursor em um bloco, a interface calcula a rota de menor custo e apresenta legalidade, motivo, custo acumulado e SPD antes/depois.
5. O hover não paga custo e não envia comando autoritativo.

### Travamento do destino

1. O primeiro clique trava o destino.
2. A rota e o resumo permanecem estáveis mesmo se o cursor sair.
3. Um segundo clique no mesmo destino cancela a prévia.
4. Um clique em outro destino substitui a prévia.
5. Um destino ilegal nunca habilita confirmação.

### Confirmação

1. O usuário confirma por botão, Enter ou duplo clique legal conforme o contrato existente.
2. A interface envia um comando com sequência determinística.
3. O núcleo revalida antes de iniciar.
4. O movimento ocorre bloco a bloco.
5. Rota e destino confirmados permanecem visíveis durante a execução.
6. Custos são cobrados conforme cada entrada confirmada.
7. Interrupções produzem motivo específico e posição final verificável.

### Recuperação

1. O primeiro gasto inicia o ciclo de ociosidade.
2. Movimento ou Ação reinicia o timer.
3. Após 160 ticks o núcleo aplica até +2 SPD, limitado pelo máximo.
4. A apresentação recebe o evento e mostra ganho, atualização do badge e feedback reduzido quando necessário.

### Reação

1. O harness abre uma janela QA.
2. O jogador ativa o modo Reação.
3. A prévia mostra `1 Reação + X SPD` e os recursos antes/depois.
4. A confirmação consome uma Reação uma única vez.
5. O SPD é consumido bloco a bloco.
6. Fora da janela ou sem Reações, a confirmação permanece bloqueada com motivo específico.

## Arquitetura recomendada para integração

### Estrutura de arquivos

Usar nomes coerentes com o repositório, por exemplo:

```text
docs/prototypes/
  VIS-003-movement-reachability.md
  VIS-004-terrain-spd-advanced-movement.md
  INDEX.md

prototypes/
  visual-004-terrain-spd-advanced-movement/
    index.html
    README.md
    TEST_REPORT.md
    app.js               opcional se o standalone for dividido
    styles.css           opcional se o standalone for dividido
    core-adapter.js      opcional se houver adaptador explícito
```

É aceitável preservar uma variante standalone para compartilhamento, mas deve existir uma cópia ou geração reproduzível dentro do repositório.

### Núcleo autoritativo versus harness

O HTML atual incorpora um `MIMovementCore`. Isso é útil como protótipo portátil, porém não deve se tornar uma segunda fonte definitiva de regras.

A próxima IA deve escolher a menor solução segura entre:

- conectar o protótipo às APIs já existentes em `src/core`;
- criar um adaptador fino e testar equivalência;
- manter o núcleo embutido apenas como fixture do protótipo, documentando suas limitações e adicionando testes diferenciais contra o núcleo real.

Em qualquer opção:

- não duplicar regras silenciosamente;
- não permitir mutação direta pela interface;
- não incluir câmera, hover, áudio ou layout no hash autoritativo;
- não converter custos QA em regras do jogo;
- não alterar o core somente para acomodar uma preferência visual.

## Plano de execução recomendado

### Etapa 1 — inspeção e preservação

- localizar a raiz Git correta;
- ler `AGENTS.md`;
- executar `git status --short`;
- ler o GDD v0.43 integralmente nas seções de movimento, UI, prototipagem, determinismo e acessibilidade;
- inspecionar o VIS-004 standalone;
- localizar APIs e testes de movimento existentes em `src/core` e `tests/core`;
- registrar quais alterações já existiam antes desta tarefa.

### Etapa 2 — atualizar a fonte documental

- adicionar o GDD v0.43 em `docs/context/sources`;
- calcular e registrar tamanho e SHA-256;
- atualizar `docs/context/GDD_SOURCE.md`;
- atualizar menções que ainda tratam v0.42 como versão vigente;
- preservar v0.42 como histórico se não houver motivo documentado para removê-la;
- executar qualquer verificador de fontes existente em `scripts`.

### Etapa 3 — registrar VIS-003 sem inventar evidência

- criar o documento do VIS-003;
- registrar `A — área cheia` e blocos quadrangulares como decisão recuperada;
- registrar que o snapshot independente não foi localizado;
- delimitar o que não foi aprovado por herança;
- adicionar o VIS-003 ao índice.

### Etapa 4 — incorporar VIS-004

- criar a pasta executável no repositório;
- preservar uma cópia inicial verificável do standalone ou registrar sua origem/hash;
- criar README do protótipo;
- criar documento de experimento em `docs/prototypes`;
- manter terreno A/B/C como em teste;
- registrar cenário, critérios, casos extremos e limitações.

### Etapa 5 — concluir o pacote de qualidade de uso

Implementar todos os itens das seções anteriores, começando pelos contratos funcionais:

1. categorias de legalidade;
2. preview SPD antes/depois;
3. feedback contextual junto ao cursor;
4. persistência da rota durante execução;
5. cancelamento por segundo clique e contexto;
6. custos acumulados;
7. badges de SPD, Reação, recuperação e GLIDER;
8. anel e feedback de reinício do timer;
9. tooltips e legenda recolhível;
10. modo QA de informação reduzida;
11. hierarquia automática;
12. redução de movimento completa;
13. contrato opcional de som.

### Etapa 6 — testes e validação

- ampliar os testes embutidos;
- adicionar testes externos quando possível;
- validar em navegador real;
- executar testes do núcleo e build;
- comparar hashes e estado entre 2D, 3D e QA;
- revisar acessibilidade e comportamento responsivo;
- registrar resultados em `TEST_REPORT.md`.

### Etapa 7 — documentação e diff

- atualizar `docs/prototypes/INDEX.md`;
- atualizar `docs/prototypes/README.md` se necessário;
- atualizar `prototypes/README.md`;
- atualizar `docs/context/ROADMAP.md` distinguindo implementado, testado e aprovado;
- atualizar o README raiz somente se a visão geral realmente mudou;
- revisar `git diff --check` e o diff completo;
- não marcar opções A/B/C de terreno como aprovadas sem confirmação explícita do autor.

## Matriz mínima de testes do VIS-004

### Planejamento e custos

- custo-base de 1 SPD por bloco em terreno neutro;
- rota de menor custo preferida a rota de menos passos;
- custo acumulado correto em cada ponto;
- prévia não altera estado nem hash;
- confirmação revalida a rota;
- destino ilegal nunca habilita confirmação;
- mudança de custo do Campo QA atualiza a prévia sem tornar o valor regra canônica.

### SPD negativo

- entrada final cara pode deixar SPD negativo;
- estado é apresentado como legal com consequência;
- unidade negativa não inicia novo movimento;
- unidade negativa continua apta a outras ações permitidas;
- recuperação até 1 ou mais libera novo movimento;
- UI apresenta antes/depois e motivo corretamente.

### Ocupação

- aliado pode ser atravessado;
- aliado não pode ser destino final;
- inimigo bloqueia passagem;
- inimigo bloqueia destino;
- base bloqueia;
- obstáculo bloqueia conforme fixture;
- uma unidade por bloco permanece invariante.

### Keywords

- GLIDER ignora custo especial de terreno;
- GLIDER atravessa impassável;
- GLIDER não termina em impassável;
- indicador de GLIDER aparece sem revelar informação oculta indevida;
- LEAPER mantém apenas diagonais autorizadas.

### Recuperação

- pacote ocorre após exatamente 160 ticks de ociosidade;
- movimento reinicia timer;
- Ação reinicia timer;
- pausa congela timer;
- perda de foco congela timer;
- excedente é perdido;
- badge some ou muda no máximo;
- anel corresponde aos ticks;
- redução de movimento não altera timing;
- ganho real limitado pelo máximo é apresentado corretamente.

### Reação

- modo Reação rejeitado fora da janela;
- rejeitado sem Reação disponível;
- confirmação consome exatamente 1 Reação;
- movimento normal não consome Reação;
- SPD continua sendo cobrado por deslocamento;
- tooltip mostra Reações antes/depois;
- harness não cria Corrente isolada.

### Interação

- primeiro clique trava destino;
- segundo clique no mesmo destino cancela;
- Escape cancela;
- botão cancela;
- troca de unidade limpa a prévia anterior;
- confirmação por Enter;
- duplo clique legal confirma conforme contrato;
- duplo clique em unidade mantém foco e não vira movimento;
- pan não é confundido com clique;
- clique fora respeita cancelamento contextual.

### Execução

- confirmação não teleporta;
- movimento ocorre bloco a bloco;
- rota e destino persistem durante execução;
- estado `MOVENDO` exibe progresso;
- hover não substitui rota ativa;
- revalidação pode interromper com motivo;
- posição final e SPD gasto permanecem coerentes;
- estado é reprodutível com a mesma sequência.

### Apresentação, câmera e acessibilidade

- 2D, 3D e QA compartilham o mesmo estado;
- câmera e overlays ficam fora do hash;
- badges permanecem legíveis nos extremos de zoom;
- tooltips não saem da viewport;
- badges não se sobrepõem de forma ilegível;
- categorias não dependem somente de cor;
- teclado alcança controles importantes;
- legenda pode ser recolhida por teclado;
- preferência `prefers-reduced-motion` é respeitada;
- toggle manual funciona;
- áudio ausente não remove informação;
- modo QA reduzido não revela informação ilegal.

### Determinismo

- mesmos comandos e seed produzem a mesma rota;
- desempates são estáveis;
- custo e estado final são idênticos em 2D e 3D;
- preferências visuais não mudam hash;
- modo QA visual não muda hash quando não altera dados autorizados;
- eventos de movimento e recuperação possuem ordem estável.

## Comandos de validação do repositório

Executar na raiz Git correta:

```powershell
npm run typecheck
npm run test:core
npm test
npm run build
git diff --check
git status --short
```

Também executar os testes Python existentes do projeto com o mecanismo já usado pelo repositório. Na inspeção anterior havia testes relacionados a sincronização de conteúdo e verificação de fontes; localizar o comando vigente antes de rodar.

Para o protótipo:

- abrir o HTML em navegador real;
- executar os testes embutidos e exigir 100% de aprovação;
- testar manualmente 2D, 3D e QA;
- testar viewport larga e estreita;
- testar `prefers-reduced-motion`;
- testar teclado e mouse;
- capturar no `TEST_REPORT.md` navegador, resolução, data, quantidade de testes e qualquer limitação.

Se for usado Playwright ou ferramenta equivalente, não instalar dependências globais nem alterar o projeto sem necessidade. Reutilizar a infraestrutura existente quando disponível.

## Critérios de conclusão

O trabalho só pode ser declarado concluído quando todos os itens abaixo forem verdadeiros:

- [ ] GDD v0.43 está versionado e documentado como fonte mais recente.
- [ ] Hash e tamanho do GDD v0.43 foram verificados.
- [ ] Referências obsoletas à v0.42 como fonte vigente foram corrigidas.
- [ ] VIS-003 possui registro honesto da aprovação recuperada.
- [ ] O documento não finge possuir um snapshot do VIS-003 que não foi localizado.
- [ ] VIS-004 está dentro do repositório e abre sem depender de Downloads.
- [ ] O protótipo preserva 2D e 3D sobre o mesmo estado.
- [ ] Área cheia aprovada permanece disponível em gameplay.
- [ ] Terreno A/B/C continua em teste, sem aprovação inventada.
- [ ] Badge de SPD atual foi implementado.
- [ ] Popup de SPD atual/máximo e custo-base foi implementado.
- [ ] Preview SPD antes/depois foi implementado.
- [ ] Legal, legal com consequência e ilegal são distinguíveis por mais que cor.
- [ ] Motivos específicos aparecem junto ao ponto de interação.
- [ ] Rota de menor custo e custos acumulados são visíveis.
- [ ] Rota e destino persistem durante execução.
- [ ] Segundo clique e cancelamentos contextuais funcionam.
- [ ] Timer possui anel, tooltip e feedback de reset.
- [ ] Recuperação possui popup e pulso compatíveis com redução de movimento.
- [ ] Tooltips de terreno e legenda recolhível funcionam.
- [ ] Aliado atravessável e não ocupável está claro.
- [ ] GLIDER possui indicação e comportamento corretos.
- [ ] Reação apresenta 1 Reação + X SPD e recursos antes/depois.
- [ ] Modo QA de informação reduzida foi implementado.
- [ ] Hierarquia automática evita sobreposição crítica de badges.
- [ ] Screen-space funciona em 2D, 3D, zooms e bordas.
- [ ] Contrato de som é opcional e não contém regra.
- [ ] Redução de movimento cobre todas as animações novas.
- [ ] Testes embutidos passam integralmente.
- [ ] Testes do núcleo passam.
- [ ] Typecheck e build passam.
- [ ] `git diff --check` não aponta erros.
- [ ] Documentação e roadmap distinguem implementado, testado e aprovado.
- [ ] Nenhum commit, push, PR ou deploy foi feito sem autorização.

## O que não fazer

- Não perguntar novamente se TypeScript é a linguagem principal. Essa decisão já está documentada.
- Não transformar o protótipo em regra final de terreno.
- Não tratar SPD como quantidade absoluta de passos alcançáveis.
- Não impedir ações não relacionadas a movimento apenas porque SPD ficou negativo.
- Não permitir novo movimento com SPD abaixo de 1.
- Não permitir terminar em aliado ou terreno impassável por GLIDER.
- Não implementar diagonal universal.
- Não criar Corrente para movimento comum ou movimento defensivo isolado.
- Não fazer toda ação abrir Corrente.
- Não misturar câmera, animação ou áudio no estado autoritativo.
- Não usar aleatoriedade não registrada.
- Não marcar terreno A/B/C como aprovado.
- Não dizer que VIS-003 foi integralmente recuperado sem o arquivo correspondente.
- Não sobrescrever mudanças locais existentes.
- Não limpar a árvore Git.
- Não fazer commit, push, PR, publicação ou GitHub Pages sem autorização.

## Formato do relatório final da próxima IA

Ao terminar, responder ao autor em português brasileiro com:

1. resultado objetivo alcançado;
2. arquivos criados e alterados;
3. diferenças entre o standalone recebido e o VIS-004 final;
4. estado documental do VIS-003;
5. confirmação da migração documental para GDD v0.43;
6. testes executados e resultados numéricos;
7. build e typecheck;
8. limitações reais restantes;
9. decisões que ainda dependem de aprovação visual do autor;
10. confirmação explícita de que não houve commit, push, PR nem publicação.

Não usar frases vagas como `foi melhorado` sem listar comportamentos verificáveis. Não declarar aprovado aquilo que apenas foi implementado ou testado.

## Resumo executivo para a IA executora

O trabalho já possui direção suficiente. Não reinicie o design, não peça ao autor para repetir decisões e não trate o VIS-004 como inexistente. Use o GDD v0.43 como fonte mais recente, preserve o trabalho local, recupere documentalmente o VIS-003 com honestidade, integre o standalone VIS-004 ao repositório e complete todo o pacote de qualidade de uso descrito aqui. Mantenha núcleo, renderer e QA separados; teste determinismo; documente evidências; pare apenas diante de conflito material realmente impossível de resolver sem o autor.
