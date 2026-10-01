# VIS-002 — Mapa, orientação 2D/3D e sistema de câmera

**Status:** **APROVADO PELO AUTOR**  
**Data da aprovação:** 2026-09-29  
**Escopo da aprovação:** orientação de apresentação do campo, coexistência 2D/3D como modos selecionáveis in-game e contrato de movimentação/foco de câmera.  
**Executável de referência:** `../../prototypes/visual-002-map-camera-2d-3d/index.html`

---

## 1. Decisão

Fica aprovada a coexistência de **duas orientações de apresentação do mesmo campo de batalha** dentro do jogo:

1. **2D top-down ortogonal**, priorizando leitura tática imediata, grade, alcance, ocupação e comparação espacial;
2. **3D tático com câmera livre**, priorizando leitura espacial contextual, inspeção visual e liberdade de enquadramento.

As duas orientações são **selecionáveis in-game**. Elas não representam regras diferentes, mapas diferentes, simulações diferentes ou modos de jogo diferentes. São duas formas de observar e comandar **o mesmo estado autoritativo**.

A antiga opção **C — lado a lado** do experimento permanece útil como **comparador de desenvolvimento, QA e validação diferencial**, mas não é aprovada aqui como uma terceira orientação normal de gameplay. Ela existe para provar que as duas projeções consomem as mesmas coordenadas e podem ser renderizadas simultaneamente sem duplicar estado.

Esta decisão encerra a pergunta principal de VIS-002 sobre qual orientação deve ser usada no mapa: **não haverá exclusividade obrigatória entre 2D e 3D; ambas são aprovadas e devem permanecer acessíveis ao jogador**.

---

## 2. Relação com o GDD e limites da decisão

O primeiro mapa continua sendo logicamente **31 × 17 blocos**, com distância ortogonal, bases sólidas e no máximo um monstro por bloco. O modo 3D não altera essas regras.

O GDD atual não possui altura como dimensão de gameplay. Portanto:

- a representação 3D **não cria coordenada Z autoritativa para unidades**;
- elevação visual de câmera, prismas, profundidade, perspectiva e efeitos volumétricos são apresentação;
- uma unidade continua ocupando exatamente um bloco `(x, y)`;
- pathfinding, alcance, VIS, linha de ataque, colisão, bases e terreno continuam definidos pelo plano lógico;
- não existe vantagem mecânica por posicionar a câmera acima, abaixo, atrás ou lateralmente;
- uma informação que deva estar oculta pelas regras de Fog of War continua oculta em ambas as orientações.

A decisão também respeita a arquitetura de núcleo único: câmera e renderização apenas observam snapshots/estado e não podem escrever regras no estado autoritativo.

Esta aprovação **não** aprova automaticamente:

- HUD final do VIS-001;
- arte final do mapa;
- tiles, texturas ou modelos finais;
- layout definitivo de terreno/obstáculos do primeiro mapa;
- animações finais de combate;
- pathfinding local do protótipo como implementação de produção;
- qualquer sistema de altura ou facing de gameplay;
- qualquer terceira orientação além das duas aprovadas.

---

## 3. Objetivo de experiência

A coexistência das duas orientações atende a necessidades diferentes sem fragmentar as regras.

### 3.1 2D top-down

O 2D deve ser a visão de máxima legibilidade tática. Ele deve favorecer:

- leitura da grade;
- comparação rápida de distâncias;
- identificação de ocupação de blocos;
- planejamento de movimento;
- leitura de áreas, alcance e VIS;
- inspeção de densidade alta, incluindo cinco monstros por lado;
- uso eficiente em telas menores ou quando o jogador desejar menor movimento visual.

A apresentação pode interpolar movimento, destacar caminho e aplicar overlays, mas não pode transformar interpolação em estado intermediário de regra.

### 3.2 3D tático

O 3D deve oferecer liberdade visual sem reduzir a precisão tática. Ele deve favorecer:

- entendimento espacial contextual do campo;
- aproximação visual de unidades e regiões;
- inspeção do campo por vários ângulos;
- enquadramento de uma unidade específica;
- apresentação mais expressiva de monstros, efeitos e eventos futuros;
- transições de câmera que não bloqueiem nem alterem a lógica.

O 3D continua preso ao mesmo plano lógico. O jogador não recebe novos dados apenas porque mudou a câmera.

---

## 4. Seleção in-game entre 2D e 3D

As duas orientações devem ser acessíveis durante a partida por um seletor de apresentação equivalente ao A/B usado no protótipo.

A troca:

- pode ocorrer sem reiniciar a partida;
- preserva a unidade selecionada;
- preserva o estado da partida;
- preserva seed, comandos, custos, eventos e hash autoritativo;
- não consome Ação, Reação, SPD, MP ou qualquer outro recurso;
- não abre Corrente;
- não cria evento de gameplay;
- não pausa automaticamente a simulação por regra;
- pode atualizar somente estado de apresentação, como câmera, zoom, pan e preferência visual.

A implementação final pode escolher teclas, botões ou menus diferentes, desde que mantenha esse contrato.

Não foi aprovada nesta decisão uma regra de persistência da preferência entre sessões. Salvar “última orientação usada” pode ser decidido em configuração/UX posterior sem afetar o núcleo.

---

## 5. Estado compartilhado e equivalência

O contrato principal é que **2D e 3D não possuem cópias independentes do jogo**.

Para uma mesma partida, ambos devem observar:

- as mesmas unidades;
- as mesmas posições `(x, y)`;
- as mesmas bases;
- os mesmos terrenos e obstáculos conhecidos;
- o mesmo Fog filtrado para o jogador;
- os mesmos Campos visíveis;
- a mesma seleção lógica quando seleção fizer parte da interface pública;
- os mesmos comandos confirmados;
- os mesmos ticks;
- os mesmos eventos;
- os mesmos hashes autoritativos.

Pan, zoom, yaw, pitch, distância, target e transições de câmera ficam fora da serialização autoritativa da partida, salvo eventual telemetria puramente de UI definida no futuro.

O comparador C é mantido justamente para detectar divergências: uma mudança de posição em 2D deve aparecer no 3D a partir do mesmo estado, e vice-versa.

---

## 6. Sistema aprovado de câmera 2D

A câmera 2D deve possuir, no mínimo:

### 6.1 Pan

O jogador pode deslocar livremente o enquadramento pelo campo por arraste. O pan:

- não altera coordenadas das entidades;
- não altera quais blocos existem;
- não altera alcance ou distância;
- não altera hash;
- deve respeitar limites de usabilidade para que o campo possa ser reencontrado.

### 6.2 Zoom

O jogador pode aproximar e afastar o mapa. O zoom é apenas visual.

A implementação deve manter a grade identificável e impedir que a escala torne interações essenciais impraticáveis. Limites exatos de zoom podem ser refinados por resolução/plataforma, desde que não se convertam em regra de gameplay.

### 6.3 Foco em seleção

Existe comando para recentralizar a câmera 2D na unidade selecionada.

### 6.4 Duplo clique em unidade

O duplo clique sobre um monstro:

- seleciona esse monstro;
- centraliza o enquadramento 2D quando o 2D estiver visível;
- prepara a câmera 3D para o foco traseiro equivalente, permitindo continuidade coerente ao alternar para 3D.

A centralização é uma ação de interface, não uma ação do monstro.

---

## 7. Sistema aprovado de câmera 3D livre

O modo 3D deve permitir movimentação de câmera suficientemente livre para inspeção tática sem transformar a câmera em entidade de gameplay.

### 7.1 Órbita

O jogador pode orbitar a câmera em torno do target atual.

No protótipo:

- arraste esquerdo altera yaw e elevação;
- `Q/E` altera yaw;
- `↑/↓` altera elevação.

Os bindings finais podem mudar, mas a capacidade de órbita permanece aprovada.

### 7.2 Pan

O jogador pode mover o target da câmera livremente pelo mapa.

No protótipo:

- `Shift` + arraste esquerdo realiza pan;
- botão direito + arraste realiza pan;
- `WASD` move o target no plano do mapa.

O pan usa a orientação atual da câmera para produzir navegação intuitiva. Ele não move monstros e não gera comandos de gameplay.

### 7.3 Zoom/distância

O jogador pode alterar a distância da câmera ao target.

No protótipo:

- roda do mouse aproxima/afasta;
- `+/-` altera distância;
- slider de distância permite inspeção explícita.

### 7.4 Ajuste de elevação

A elevação é um parâmetro visual de câmera, não uma dimensão do mapa.

O protótipo limita o pitch a uma faixa segura para impedir inversão e perda completa de legibilidade. A faixa exata pode ser calibrada posteriormente por UX, desde que continue sendo apenas visual.

### 7.5 Presets

Presets como “tático” e “quase top-down” são permitidos para acesso rápido. Eles são atalhos de apresentação, nunca regras.

### 7.6 Reset

Deve existir forma clara de voltar a um enquadramento padrão previsível.

---

## 8. Foco traseiro por duplo clique — aprovado

A revisão aprova especificamente o novo comportamento solicitado pelo autor:

> **Ao dar duplo clique em um monstro, a câmera deve ir até ele e assumir um ângulo atrás do monstro.**

### 8.1 Sequência de interação

Ao receber duplo clique válido sobre um monstro:

1. o picking identifica a unidade visível sob o ponteiro;
2. a unidade torna-se a seleção atual;
3. o target da câmera passa ao centro visual dessa unidade;
4. a câmera inicia transição até um preset traseiro próximo;
5. yaw, pitch e distância interpolam somente na apresentação;
6. ao término, a unidade fica enquadrada em primeiro plano tático, com visão orientada na direção geral do lado adversário;
7. nenhum comando de gameplay é criado pela câmera.

### 8.2 Convenção visual de “atrás”

O GDD atual **não define facing individual como regra-base**. Portanto, VIS-002 não pode inventar uma orientação mecânica da unidade.

Para produzir o enquadramento solicitado sem criar regra nova, utiliza-se a seguinte **heurística exclusivamente visual**:

- unidade de **P1** é tratada, para a câmera, como visualmente orientada para a extremidade de **P2**;
- unidade de **P2** é tratada, para a câmera, como visualmente orientada para a extremidade de **P1**.

Logo, “atrás” significa o lado oposto ao avanço visual em direção à base adversária.

Essa convenção:

- não entra no estado autoritativo;
- não define costas/frente para dano;
- não define arco de ataque;
- não define VIS;
- não define linha de ataque;
- não afeta posição ATK/DEF;
- não afeta Keywords;
- não pode ser reutilizada por IA ou regras como se fosse facing real.

Se futuramente o jogo introduzir facing como regra por decisão explícita, o sistema de câmera poderá consumir esse dado. Até lá, a heurística permanece apresentação.

### 8.3 Pose de referência do protótipo

Para validação, o protótipo usa aproximadamente:

- target no centro do bloco da unidade, levemente acima do plano visual;
- elevação de 34°;
- distância de 10,5 unidades visuais;
- yaw traseiro derivado do lado do jogador.

Esses números são parâmetros de apresentação do experimento, não constantes obrigatórias de gameplay. Podem ser afinados para modelo, escala e resolução mantendo a intenção aprovada.

### 8.4 Transição

A ida até a unidade é animada por interpolação visual. A transição:

- não atrasa o tick autoritativo;
- não bloqueia regra;
- não altera fila de comandos;
- não altera hash;
- pode ser reduzida ou eliminada quando “reduzir movimento” estiver ativo.

---

## 9. Picking e precisão de interação 3D

O protótipo anterior usava aproximações que podiam selecionar o bloco visualmente mais próximo em vez do bloco realmente apontado. Isso não é adequado para base futura.

A versão aprovada usa **raycast matemático da câmera até o plano lógico `z = 0`**:

1. converte a posição do ponteiro em raio de câmera;
2. intersecta o raio com o plano lógico do mapa;
3. converte a interseção para coordenadas de bloco;
4. aplica validação sobre essas coordenadas.

Isso mantém a interação 3D alinhada ao mapa 2D e reduz divergência entre projeção e regra.

Qualquer renderer final pode usar técnica diferente, mas deve preservar a mesma propriedade: o bloco escolhido na projeção 3D deve corresponder inequivocamente ao bloco lógico selecionado.

---

## 10. Movimento de monstros e câmera

A câmera nunca autoriza movimento por conta própria. Clique em destino produz apenas intenção/comando do sistema de ensaio; a legalidade pertence ao núcleo.

No protótipo VIS-002:

- o caminho local existe para testar leitura e animação;
- ele usa passos ortogonais;
- custo visual do ensaio é contado por blocos;
- base, obstáculo e unidade ocupada são tratados como bloqueios pelo helper local;
- o movimento é executado em ticks lógicos de referência.

Esse helper **não é aprovado como pathfinding final**, especialmente porque o GDD possui regras mais específicas, incluindo passagem por aliados. O renderer e o protótipo não devem se tornar segunda implementação concorrente dessas regras.

Para etapas futuras, a UI deverá receber do núcleo o caminho legal/preview ou solicitar validação pela interface pública.

---

## 11. Redução de movimento e acessibilidade

A revisão corrige uma falha conceitual da primeira versão: “reduzir movimento” não pode encurtar o tempo lógico de deslocamento.

Fica aprovado o seguinte contrato:

- a opção de acessibilidade altera interpolação, transição e intensidade visual;
- os mesmos comandos continuam exigindo os mesmos passos lógicos;
- ticks, custos e resultado permanecem equivalentes;
- o foco traseiro pode saltar diretamente ao pose final quando redução de movimento estiver ativa;
- a câmera pode reduzir animações sem alterar gameplay.

Isso se aplica também às futuras animações derivadas deste protótipo.

---

## 12. Fog of War e câmera

Mover a câmera não muda informação conhecida.

Em ambos os modos:

- geografia fixa conhecida continua visível conforme GDD;
- unidades ocultas não podem ser reveladas por rotação ou zoom;
- Armadilhas secretas não aparecem por aproximar a câmera;
- região/identidade oculta não pode vazar por geometria 3D;
- marcador de última posição conhecida continua sendo representação própria;
- logs e tooltips continuam filtrados pela informação legal.

Um renderer 3D futuro deve tomar cuidado especial com sombras, contornos, oclusão, partículas, nameplates e picking para não revelar entidades que o snapshot filtrado não contém.

---

## 13. Terrenos, Campos e overlays

VIS-002 usa terreno, obstáculos, Fog, labels e áreas de Campo para stress visual. A aprovação atual significa:

- ambos os modos precisam conseguir representar esses elementos;
- eles devem corresponder às mesmas coordenadas lógicas;
- overlays visuais não podem alterar o hash;
- áreas precisam permanecer legíveis em perspectiva.

Não significa aprovação da paleta, textura, quantidade, forma final ou distribuição desses elementos no primeiro mapa.

---

## 14. Relação com VIS-001

VIS-001 continua sendo a decisão específica de composição de HUD e não é aprovado implicitamente por VIS-002.

A aprovação de VIS-002 permite que protótipos futuros assumam:

- existência de orientação 2D selecionável;
- existência de orientação 3D selecionável;
- câmera 2D com pan/zoom/foco;
- câmera 3D com órbita/pan/zoom/elevação/reset;
- foco traseiro por duplo clique;
- equivalência lógica entre projeções.

Ela **não** aprova por herança nenhum layout de HUD. Essa decisão foi tomada separadamente depois: a versão melhorada de VIS-001 foi aprovada pelo autor em 2026-09-29, conforme `VIS-001-hud-layout.md`.

---

## 15. Comparador C como ferramenta de QA

A visão lado a lado continua parte importante do pacote de desenvolvimento.

Ela deve ser usada para:

- comparar ocupação 2D/3D;
- verificar que seleção aponta para a mesma unidade;
- verificar movimento simultaneamente;
- detectar offsets de projeção;
- validar Fog e áreas;
- comparar leitura de densidade;
- reproduzir divergências visuais;
- testar renderer novo sem abandonar a referência 2D.

O C pode permanecer indisponível ao jogador final e ainda ser mantido em builds de desenvolvimento/QA.

---

## 16. Testes e evidência da aprovação

A versão aprovada possui duas camadas de verificação.

### 16.1 Suíte embutida

**18/18 testes passaram**, cobrindo:

- dimensões 31 × 17;
- bases;
- limite de unidades do stress case;
- invariantes espaciais básicas;
- distância ortogonal;
- caminho cardinal do ensaio;
- destinos sólidos/ocupados;
- hash reproduzível;
- 20 Hz / 50 ms;
- redução de movimento sem mudança de ticks;
- câmera fora do hash;
- overlays fora do hash;
- equivalência projeção/raycast;
- limites de câmera;
- heurística visual do foco traseiro;
- foco traseiro sem alteração de hash;
- compartilhamento do mesmo estado entre A/B/C.

### 16.2 Smoke real de navegador

**29/29 checks passaram em Chromium via Playwright**, incluindo interação física com canvas e teclado:

- seleção 2D;
- seleção 3D;
- movimento via 2D;
- movimento via 3D;
- pan e zoom 2D;
- órbita, pan, zoom e teclado 3D;
- pausa e retomada;
- redução de movimento;
- overlays;
- comparação C;
- duplo clique sobre monstro;
- câmera chegando ao monstro;
- enquadramento traseiro;
- hash inalterado pelo foco.

Isso não prova toda a futura implementação final, mas constitui evidência suficiente para aprovar o contrato visual descrito neste documento.

---

## 17. Requisitos para reutilização em protótipos posteriores

Como VIS-002 será base de trabalhos posteriores, protótipos novos devem preferir reutilizar estes contratos em vez de redesenhá-los silenciosamente.

Uma etapa futura pode:

- substituir Canvas 2D por outro renderer;
- migrar 3D para WebGL/WebGPU/engine;
- trocar shapes provisórios por sprites/modelos;
- alterar easing e duração;
- adaptar controles para gamepad/touch;
- adicionar limites e colisão de câmera puramente visual;
- adicionar transições contextuais de combate;
- adicionar camera shake opcional;
- adicionar presets de acessibilidade.

Mas deve reabrir VIS-002 ou criar experimento sucessor se alterar materialmente:

- disponibilidade de 2D ou 3D;
- liberdade de câmera;
- semântica do duplo clique;
- capacidade de troca in-game;
- precisão do picking;
- relação entre câmera e informação oculta;
- hierarquia que prejudique leitura da grade;
- comportamento de redução de movimento;
- equivalência lógica entre projeções.

---

## 18. Critérios mínimos para implementação final

A implementação de produção derivada deste protótipo só deve ser considerada conforme quando:

1. 2D e 3D consomem snapshots do mesmo núcleo;
2. trocar orientação não altera hash ou resultado;
3. câmera não escreve estado autoritativo;
4. picking 3D corresponde ao bloco lógico correto;
5. Fog of War não vaza por nenhum ângulo;
6. foco traseiro não cria facing de gameplay implícito;
7. redução de movimento não muda timing lógico;
8. pan/zoom/órbita funcionam nas resoluções suportadas;
9. foco/reset sempre permitem recuperar uma visão útil;
10. testes diferenciais confirmam equivalência 2D/3D para os mesmos comandos.

---

## 19. Resultado formal

**APROVADO:**

- orientação **2D top-down** como modo selecionável in-game;
- orientação **3D tático** como modo selecionável in-game;
- alternância entre ambas sem mudança de estado lógico;
- câmera 2D com pan, zoom e foco;
- câmera 3D livre com órbita, pan, zoom, elevação, presets e reset;
- seleção precisa na projeção 3D por correspondência ao plano lógico;
- **duplo clique em monstro para foco de câmera atrás da unidade**, usando heurística visual por lado enquanto não existir facing de gameplay;
- transições de câmera desacopladas do tick;
- opção de redução de movimento limitada à apresentação;
- comparador C preservado como ferramenta de desenvolvimento/QA.

**NÃO APROVADO POR ESTE DOCUMENTO:**

- HUD de VIS-001;
- layout final de terreno;
- arte/modelos finais;
- sistema de altura;
- facing como regra;
- pathfinding local do protótipo como núcleo definitivo;
- terceira orientação normal de gameplay.

A partir desta aprovação, protótipos posteriores podem tratar 2D/3D e o contrato de câmera acima como **decisão visual adotada**, sem voltar a apresentar A/B/C para a existência dessas duas orientações, salvo quando uma mudança material reabrir o experimento conforme as regras do GDD.
