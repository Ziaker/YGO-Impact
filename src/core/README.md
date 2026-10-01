# Núcleo autoritativo

O núcleo autoritativo inicial do Monster Impact é escrito em **TypeScript** para ser compartilhável entre execução headless em Node.js e a futura build web. A toolchain de CI usa **Node 24 LTS** e TypeScript fixado em `7.0.2`; o núcleo não possui dependências de runtime.

Essa escolha é arquitetural, não uma regra de gameplay. Protótipos visuais continuam livres para usar tecnologia provisória.

## Contratos do GDD preservados

- simulação única e autoritativa;
- passo fixo de **20 Hz / 50 ms**;
- humanos e IA usam a mesma fila pública;
- comando recebido em um passo fica elegível no próximo passo disponível;
- desempate inicial por sequência monotônica de registro;
- estruturas retornadas pelo core são imutáveis;
- números autoritativos aceitos pelo scaffold são inteiros seguros; floats são rejeitados;
- serialização de estado usa ordem lexicográfica por unidades UTF-16, sem depender de locale/ICU;
- mesmos seed, estado e comandos produzem os mesmos hashes;
- primeiro mapa físico usa **31 × 17** blocos;
- bases são blocos sólidos não ocupáveis;
- no máximo um monstro ocupa fisicamente cada bloco;
- no máximo cinco monstros por jogador ficam no mapa;
- a ordem macro do passo permanece a definida pelo GDD: receber, ordenar, validar, confirmar custos, mutar, resolver gatilhos/Correntes, checar estado, atualizar timers, emitir telemetria e calcular hash.

## Implementado

- `constants.ts`: cadência e pipeline fixo;
- `content.ts`: catálogo validado que liga cartas de monstro às definições estruturadas de gameplay;
- `activation.ts`: roteamento confirmado entre resolução direta, Corrente e IMEDIATO;
- `attack.ts`: validação espacial e plano de Ataque Básico, defesa e contra-ataque;
- `base-attack.ts`: validação de ataques à base, impacto e reposicionamento aleatório auditável no terço aliado;
- `battle.ts`: transação completa do Ataque Básico confirmado, aplicação simultânea do combate, remoção imediata dos mortos e liquidação das cópias físicas no Cemitério de cada proprietário;
- `chain.ts`: filas independentes, pilha LIFO, revalidação de alvos, NEGAR/FALHAR, limite de Cross Chain e janela formal de prioridade até o fechamento;
- `combat.ts`: dano básico ATK×ATK, ATK×DEF, indefeso, contra-ataque e stats negativos;
- `deck.ts`: validação completa dos três Decks e relatório de todas as violações;
- `draw.ts`: cópias físicas, embaralhamento separado, mão inicial, modalidades de compra e Deck Out atômico;
- `types.ts`: tipos mínimos de estado, comando, evento e resultado de passo;
- `queue.ts`: registro monotônico e elegibilidade no próximo passo;
- `canonical.ts`: serialização canônica e hash determinístico FNV-1a 64-bit;
- `freeze.ts`: congelamento recursivo e cópia defensiva de payloads JSON;
- `fog.ts`: memória justa por jogador, com última posição conhecida sem rastreamento oculto;
- `geometry.ts`: distância ortogonal, alcance e linha entre centros com bloqueio inclusive em cantos;
- `information.ts`: visão justa de mão, Decks, Extra Deck e Cemitérios para humano e IA;
- `engine.ts`: criação do estado, avanço de passos e aplicação autoritativa de comandos de turno, Invocações, movimento, ataques, Correntes e contra-ataque;
- `match.ts`: impactos válidos na base e encerramento imediato no quinto impacto;
- `monster.ts`: estado autoritativo inicial dos monstros, stats estruturais e recuperação de Apoio;
- `movement.ts`: movimento básico ortogonal, movimento defensivo como Reação e transação composta que mantém posição espacial, posição do monstro e SPD sincronizados;
- `priority.ts`: Token de Prioridade, alternância entre turnos e desempate de eventos simultâneos;
- `random.ts`: fluxos pseudoaleatórios derivados, reproduzíveis e auditáveis sem ponto flutuante autoritativo;
- `race.ts`: escopo das 17 RACE e soma integral de seus bônus estruturais aprovados;
- `replay.ts`: replay autocontido por seed/comandos, Decks, conteúdo e mapa, com localização da primeira divergência de hash;
- `ritual.ts`: procedimento de Ritual orientado a dados, materiais da mão/mapa, soma de níveis, Magia, Extra Deck, destinos e pagamento atômico;
- `setup.ts`: validação conjunta dos jogadores, embaralhamento e mão inicial reproduzível;
- `spatial.ts`: dimensões do primeiro mapa e invariantes físicas estáticas de bases/unidades;
- `summon.ts`: destinos e resolução atômica da Invocação Normal, incluindo retirada da cópia física da mão, criação da unidade, âncora, VIS e fallback espacial;
- `tribute.ts`: validação e resolução atômica da Invocação por Tributo, incluindo soma de níveis, blocos liberados, Cemitério e nova unidade;
- `telemetry.ts`: eventos locais versionados, contexto lógico, rejeições, hashes e pacote diagnóstico mínimo;
- `turn.ts`: ciclo de fases, distribuição secreta dos 8 recursos, consumo na confirmação, conversão após Correntes e encerramento voluntário;
- `vitals.ts`: fórmulas-base de HP/MP, piso zero, recuperação, pagamento e ajustes de máximo com causas distintas;
- `visibility.ts`: união determinística da VIS ortogonal dos monstros aliados com o quadrado de raio 5 da base, bloqueada por bases e obstáculos fixos;
- `zones.ts`: transferências atômicas de cartas por identidade física entre mão, estado fora do campo e Cemitério;
- `index.ts`: interface pública do módulo.

O FNV-1a é usado **somente como hash determinístico inicial de regressão**, não como mecanismo criptográfico ou decisão eterna do formato de replay. Uma troca futura exige versionamento explícito do schema/hash.

O schema autoritativo atual é a versão **16**. A versão 2 incluiu o estado de turno no hash e substituiu a aceitação genérica do scaffold por eventos explícitos de comando aceito ou rejeitado. A versão 3 acrescentou o Token de Prioridade e a auditoria do sorteio inicial. A versão 4 integrou impactos de base, vitória e cancelamento imediato ao estado reproduzível. A versão 5 integrou a configuração validada dos Decks, embaralhamento, mão inicial e auditoria aleatória ao estado e ao replay. A versão 6 integrou a escolha travada das modalidades de compra, resolução conjunta da Fase de Compra e Deck Out simples ou simultâneo. A versão 7 acrescentou catálogo de conteúdo, bases, mapa vazio inicial e estado de monstros ao hash autoritativo. A versão 8 tornou a recuperação da Fase de Apoio uma transição autoritativa obrigatória e única por turno. A versão 9 acrescentou o alcance-base próprio de cada monstro, com padrão 1. A versão 10 acrescentou os Cemitérios às zonas autoritativas de cartas. A versão 11 registra a causa autoritativa do encerramento da partida. A versão 12 integra ao estado e ao hash a memória de Fog of War de cada jogador. A versão 13 integra Correntes e Ataques Básicos pendentes. A versão 14 acrescenta as janelas formais de resposta e passagem de prioridade. A versão 15 acrescenta ataques à base pendentes e o reposicionamento aleatório auditável após impacto. A versão 16 integra movimento defensivo como Reação pendente, com gasto de Reação e SPD na pilha LIFO.

`isTilePhysicallyFree()` verifica apenas ocupação física e limites do mapa. Ele **não** afirma que um destino seja legal para movimento/Invocação, porque terreno, efeitos, alcance e outras regras ainda não fazem parte desse módulo.

## Deliberadamente não implementado ainda

- terreno, movimento diagonal concedido, Voo, Teleporte e pathfinding;
- colisão simultânea;
- terreno e custo de SPD;
- adições genéricas de Magias, Armadilhas e habilidades às janelas de Corrente;
- ponto de continuação e resolução integrada de Cross Chains;
- integração dos procedimentos de Ritual ao catálogo autoritativo, à fila e ao replay;
- requisitos orientados a dados e resolução de Fusion;
- demais elementos dinâmicos ocultos do Fog of War;
- timers de gameplay;
- IA;
- persistência/rotação de arquivos, snapshots e telemetria completa de gameplay/IA.

Esses sistemas entram somente com suas regras específicas do GDD e respectivos testes.
