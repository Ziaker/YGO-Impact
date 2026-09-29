# Monster Impact — VIS-002

Protótipo executável aprovado de mapa/câmera do Monster Impact.

## Decisão consolidada

Duas orientações coexistem como modos selecionáveis in-game sobre o mesmo estado lógico:

- **2D top-down ortogonal**;
- **3D tático com câmera livre**.

A visualização **QA lado a lado** permanece somente como comparador técnico. Ela não é um terceiro modo de gameplay aprovado.

O 3D é uma projeção do mapa plano 31 × 17. Não cria altura, facing ou ocupação 3D como regra de gameplay.

## Arquivos

- `index.html` — estrutura da interface;
- `styles.css` — apresentação;
- `core.js` — estado e helpers determinísticos do ensaio visual;
- `app.js` — renderização 2D/3D, interação, câmera e testes;
- `TEST_REPORT.md` — evidência da validação.

Para abrir localmente, mantenha os quatro arquivos web na mesma pasta e abra `index.html` em navegador moderno. Para desenvolvimento, um servidor estático simples também pode ser usado.

## Controles 2D

- clique em monstro: selecionar;
- clique em bloco livre: movimento do ensaio;
- arraste esquerdo: pan;
- roda: zoom;
- duplo clique em monstro: seleciona/centraliza e prepara o foco 3D atrás dele;
- `1`: 2D.

## Controles 3D

- clique em monstro: selecionar;
- clique em bloco livre: movimento do ensaio;
- arraste esquerdo: órbita;
- `Shift` + arraste esquerdo ou botão direito + arraste: pan;
- roda: zoom;
- `WASD`: pan da câmera;
- `Q/E`: rotação horizontal;
- `↑/↓`: elevação;
- `F`: focar seleção;
- `Home`: resetar câmera;
- **duplo clique em monstro:** anima a câmera até a unidade e posiciona o ponto de vista atrás dela;
- `2`: 3D;
- `3`: comparador QA lado a lado.

### Foco traseiro

O GDD atual não define facing individual como regra. Para o foco traseiro, o protótipo usa apenas uma convenção visual por lado:

- P1 é enquadrado como se estivesse orientado para o lado de P2;
- P2 é enquadrado como se estivesse orientado para o lado de P1.

Essa convenção não entra no estado autoritativo, não participa do hash e não pode ser usada como regra de combate, VIS, ataque ou movimento.

## Garantias exercitadas

- referência lógica de 20 Hz / 50 ms;
- mesmo estado para 2D e 3D;
- câmera/zoom/pan/rotação/foco fora do hash;
- redução de movimento apenas visual;
- picking 3D por raycast câmera → plano lógico;
- alternância 2D/3D sem trocar o estado;
- foco traseiro sem criar facing de gameplay.

## Testes

O botão `testes` executa **18/18** verificações embutidas.

A validação de navegador executada para a aprovação realizou **29/29** checks reais em Chromium/Playwright, incluindo câmera livre, picking 2D/3D, movimento do ensaio, pausa, redução de movimento, comparador sincronizado e foco traseiro por duplo clique.

## Limites deliberados

O pathfinding desta página continua sendo helper do ensaio visual. Ele não substitui o pathfinding autoritativo futuro e não implementa todas as regras do GDD, como passagem por aliados.

Terrenos e obstáculos do cenário são stress visual, não layout final aprovado do primeiro mapa. VIS-002 aprova orientações 2D/3D e contrato de câmera; não aprova HUD final, arte final, terreno final, altura ou facing de gameplay.
