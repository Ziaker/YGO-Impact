# Roadmap técnico — primeiro protótipo

Este arquivo registra o **estado real do repositório** e a ordem recomendada de evolução. Ele não cria regras novas de gameplay. Em qualquer conflito, o GDD v0.42 e as instruções/correções posteriores do autor prevalecem.

## Convenção de status

- **Definido:** formalizado no GDD, mas não necessariamente implementado.
- **Prototipado:** existe experimento, sem implicar aprovação.
- **Implementado:** existe código funcional no repositório.
- **Testado:** existe cobertura automatizada correspondente.
- **Aprovado:** decisão explicitamente confirmada pelo autor quando o GDD exige aprovação.
- **Publicado:** disponível no canal externo correspondente.

## Estado atual

### Fonte de verdade

- GDD-base v0.42: **Definido / concluído (25/25 fases)**.
- Identidade do arquivo canônico: **Registrada** em `GDD_SOURCE.md` com tamanho e SHA-256.
- Cópia binária `.docx` no Git: **Pendente**. A sessão atual não consegue transportar o binário preservando-o integralmente pelo conector disponível; não substituir por reconstrução ou texto aproximado.

### Núcleo autoritativo

- Runtime TypeScript inicial: **Implementado**.
- Passo fixo de 20 Hz / 50 ms: **Implementado no scaffold**.
- Fila pública determinística de comandos: **Implementada e testada**.
- Serialização/hash determinístico inicial: **Implementado e testado**.
- Invariantes espaciais básicas do mapa 31 × 17, bases e ocupação: **Implementadas e testadas**.
- Gameplay completo (custos, movimento, dano, Invocações, Correntes, Cross Chains, IMEDIATOS, Fog of War, RNG, timers): **Pendente**.

### Prototipagem visual

- `VIS-001 — Composição do campo e HUD principal`: **Aprovado pelo autor em 2026-09-29 na versão melhorada**.
- O comparador A/B/C atualmente versionado em `prototypes/visual-001-hud-layout/index.html` é a evidência histórica inicial; o Git atual não permite identificar a revisão melhorada como uma opção A/B/C pura sem inventar informação.
- A aprovação de VIS-001 cobre composição, hierarquia e densidade do HUD/campo; não aprova por herança movimento, timing, Correntes interativas ou Fog of War dinâmico.
- `VIS-002 — Mapa, orientação 2D/3D e sistema de câmera`: **Prototipado, testado e aprovado pelo autor em 2026-09-29**.
- VIS-002 aprova **2D top-down e 3D tático como orientações selecionáveis in-game** sobre o mesmo estado lógico.
- Contrato de câmera aprovado em VIS-002: pan/zoom/foco no 2D; órbita/pan/zoom/elevação/presets/reset no 3D; duplo clique em monstro para foco traseiro puramente visual.
- O comparador 2D+3D permanece ferramenta de QA; não é um terceiro modo normal de gameplay.
- VIS-002 não aprova por herança arte final, terreno final, altura como regra, facing de gameplay ou pathfinding do protótipo como núcleo definitivo.
- Evidência atual de VIS-002: **18/18 testes embutidos e 29/29 checks reais em Chromium/Playwright**.
- `VIS-003 — Planejamento e movimento tático, Parte 1/5`: **Aprovado pelo autor em 2026-09-29 — opção A (Área cheia)**.
- VIS-003 fixa área cheia como overlay normal de movimento e preserva seletor 2D/3D durante gameplay; B/C ficam restritas à comparação QA.
- Trocar 2D ↔ 3D preserva seleção, destino, caminho, movimento em andamento e estado lógico; câmera/orientação/overlay não alteram regras nem hash.
- Confirmação de movimento pode usar botão, `Enter` ou duplo clique em destino livre/legal; duplo clique em monstro continua sendo seleção + foco traseiro.
- Movimento é revalidado bloco a bloco e a simulação de 20 Hz fica desacoplada de `requestAnimationFrame`.
- Evidência atual de VIS-003: **25/25 testes Node, 25/25 embutidos e 14/14 checks reais em Chromium/Playwright**.
- A ordem de desempate `N,E,S,W,NE,SE,SW,NW` usada em VIS-003 permanece **provisória** e não é regra canônica.
- `VIS-004 — Terreno, SPD e movimento avançado, Parte 2/5`: **Em teste / aguardando aprovação visual A/B/C**.
- VIS-004 herda sem reabrir área cheia e seletor 2D/3D e testa três leituras de custo de terreno: A badge persistente, B custo somente no caminho e C mapa sutil/painel.
- O valor de custo do Campo A é **fixture QA**, padrão 1, porque o GDD não estabelece um custo genérico universal de terreno. Valores maiores não constituem conteúdo/regra final.
- O experimento já exerce impassáveis, GLIDER, entrada que pode levar SPD a negativo, bloqueio de novo movimento com SPD negativo, recuperação +2 após 8 s/160 ticks e harness de movimento como Reação (1 Reação + SPD) sem implementar Corrente completa.
- Correção visual do VIS-004: unidade com recuperação ativa e abaixo do SPD máximo exibe **ícone com contador regressivo inteiro** até o próximo pacote; quando a recuperação ocorre, aparece rapidamente **`+2SPD`** acima da unidade. Esses elementos são apresentação e não alteram timer, regra ou hash.
- Evidência atual de VIS-004: **31/31 testes Node, 33/33 embutidos e 18/18 checks reais em Chromium/Playwright**, sem exceções JavaScript.

### Artes e conteúdo

- Downloader `image_url_cropped`: **Implementado e testado**.
- Seleção versionada: **Implementada**.
- Sincronização por GitHub Actions: **Implementada**.
- `DEC-001-initial-card-pool.md` define a política automática atual em **136 cartas**: 106 monstros, 20 Magias e 10 Armadilhas.
- O snapshot atualmente versionado em `assets-local/card-art/selection.json` ainda registra **96 cartas**: 66 monstros, 20 Magias e 10 Armadilhas. Portanto, esse artefato está atrás da política atual e não deve ser descrito como se já fosse o pool de 136 materializado.
- Seleção final das 88 cartas (ou redução deliberada para 40): **Pendente de conteúdo**, sem inventar lista por conta própria.

### Testes e CI

- Testes Python do downloader: **Implementados**.
- Testes do núcleo TypeScript e invariantes espaciais: **Implementados**.
- Typecheck/build do núcleo: **Implementados no CI**.
- VIS-002 possui testes internos e smoke de navegador executados durante aprovação; a integração desses checks à CI geral ainda é **Pendente**.
- VIS-003 possui testes Node, testes embutidos e smoke de navegador executados durante aprovação; a integração desses checks à CI geral ainda é **Pendente**.
- VIS-004 possui testes Node, suíte embutida e smoke Chromium/Playwright executados localmente; a integração à CI geral ainda é **Pendente**.
- Determinismo de partida completa, replay, propriedades, fuzzing, self-play, smoke geral e endurance: **Pendentes**, pois dependem dos sistemas correspondentes.

### Web e publicação

- Protótipo HTML VIS-001: **Implementado como comparador histórico; decisão da versão melhorada aprovada**.
- Protótipo web modular VIS-002 (`index.html` + CSS + JS): **Implementado e aprovado**.
- VIS-003 possui executável validado fora do diretório versionado de protótipos; sua **decisão está documentada/aprovada no Git**, e a integração do executável ao diretório `prototypes/` permanece pendente.
- VIS-004 possui executável validado localmente; o documento do experimento já está versionado em `docs/prototypes/VIS-004-terrain-spd-movement.md`. O executável ainda não está incorporado ao diretório `prototypes/` enquanto a comparação A/B/C está aberta.
- Build jogável: **Pendente**.
- GitHub Pages: **Pendente / não publicado**.

### IA, replay e telemetria

- Contratos: **Definidos no GDD**.
- Documentos técnicos específicos como `TELEMETRY_SCHEMA.md` e `AI_INTERFACE.md`: **Ainda não versionados**.
- Implementação: **Pendente**.

## Ordem recomendada das próximas entregas

1. **Usar VIS-001, VIS-002 e VIS-003 como decisões aprovadas**, sem reabrir seus pontos já decididos por registros antigos.
2. **Concluir VIS-004 — Terreno, SPD e movimento avançado:** comparar A/B/C para leitura de terreno/custo e registrar a opção aprovada; não transformar os valores numéricos QA em regra de conteúdo.
3. **Expandir o núcleo por regras pequenas e testáveis**, começando por contratos que não dependem de direção visual: recursos/turno, validações básicas e operações de estado explicitamente descritas no GDD.
4. **Reutilizar VIS-002/VIS-003 como referência de mapa/câmera/movimento nos protótipos seguintes**, preservando 2D/3D selecionáveis, picking equivalente, área cheia e câmera fora do estado autoritativo.
5. **Formalizar o desempate canônico de pathfinding** antes de promover a ordem provisória de VIS-003 ao núcleo final.
6. **Depois do VIS-004, prototipar VIS-005 — VIS/Fog of War, alcance e seleção de alvos** antes de Invocações, combate e Correntes interativas.
7. **Implementar Correntes/IMEDIATOS** como módulo isolado e fortemente testado, preservando a regra crítica de alvo inimigo.
8. **Adicionar telemetria e replay mínimos** cedo o suficiente para validar hashes e determinismo antes da IA e do self-play.
9. **Adicionar IA competitiva e QA** somente sobre a interface pública do mesmo núcleo.
10. **Criar build web e Pages** depois que conteúdo, testes, build e smoke test estiverem automatizados.

## Bloqueios explícitos

- Não rebaixar VIS-001 para “aguardando aprovação”: a versão melhorada já foi aprovada pelo autor em 2026-09-29.
- Não inventar que a aprovação do VIS-001 corresponde a A, B ou C pura quando o registro atual não sustenta essa equivalência.
- Não reinterpretar a câmera 3D de VIS-002 como altura ou facing de gameplay.
- Não reabrir a decisão de VIS-003: **A — área cheia** é o overlay normal de movimento; B/C são apenas QA/histórico.
- Não remover o seletor 2D/3D aprovado do fluxo normal de gameplay.
- Não permitir que orientação, câmera, zoom, pan, foco ou overlay alterem estado/hash autoritativo.
- Não promover a ordem provisória de desempate de VIS-003 a regra final sem decisão explícita.
- Não tratar a fixture de custo do Campo A de VIS-004 como valor canônico de terreno/cartas.
- Não tratar o harness de Reação de VIS-004 como implementação completa de Corrente/Cross Chain.
- Não marcar A/B/C de terreno do VIS-004 como aprovadas antes da escolha explícita do autor.
- Não transformar contador de recuperação ou pop-up `+2SPD` em lógica autoritativa; são apenas feedback visual derivado do estado.
- Não completar regras ausentes usando Yu-Gi-Oh! oficial.
- Não tratar o scaffold do núcleo como jogo completo.
- Não tratar pathfinding de protótipos como implementação final do núcleo.
- Não confundir a política de 136 cartas do DEC-001 com o snapshot `selection.json` de 96 cartas enquanto ele não for regenerado/sincronizado.
- Não publicar GitHub Pages sem validação e autorização explícita.
- Não definir sozinho a lista final de cartas do primeiro conjunto quando o GDD não fornece nomes específicos.