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

- `VIS-001 — Composição do campo e HUD principal`: **Prototipado / aguardando aprovação**.
- Nenhuma opção A/B/C está aprovada.
- Próximos experimentos só podem marcar uma opção como aprovada após confirmação explícita do autor.

### Artes e conteúdo

- Downloader `image_url_cropped`: **Implementado e testado**.
- Seleção versionada: **Implementada**.
- Sincronização por GitHub Actions: **Implementada**.
- Artes atualmente versionadas: lote inicial de Dark Magician e Blue-Eyes White Dragon + manifesto.
- Seleção final das 88 cartas (ou redução deliberada para 40): **Pendente de conteúdo**, sem inventar lista por conta própria.

### Testes e CI

- Testes Python do downloader: **Implementados**.
- Testes do núcleo TypeScript e invariantes espaciais: **Implementados**.
- Typecheck/build do núcleo: **Implementados no CI**.
- Determinismo de partida completa, replay, propriedades, fuzzing, self-play, smoke e endurance: **Pendentes**, pois dependem dos sistemas correspondentes.

### Web e publicação

- Protótipo HTML estático VIS-001: **Implementado localmente no repositório**.
- Build jogável: **Pendente**.
- GitHub Pages: **Pendente / não publicado**.

### IA, replay e telemetria

- Contratos: **Definidos no GDD**.
- Implementação: **Pendente**.

## Ordem recomendada das próximas entregas

1. **Obter decisão do autor sobre VIS-001**: A, B, C ou revisão. A aprovação é necessária para transformar a composição escolhida em referência visual.
2. **Expandir o núcleo por regras pequenas e testáveis**, começando por contratos que não dependem de direção visual: recursos/turno, validações básicas e operações de estado explicitamente descritas no GDD.
3. **Criar VIS-002** para mapa/câmera/terreno após registrar o resultado do VIS-001 ou, se mantido independente, garantir que nenhuma decisão de HUD seja tratada como aprovada por herança.
4. **Introduzir movimento/pathfinding determinístico** somente após extrair do GDD os desempates e invariantes correspondentes e escrever testes antes/de junto da implementação.
5. **Implementar Correntes/IMEDIATOS** como módulo isolado e fortemente testado, preservando a regra crítica de alvo inimigo.
6. **Adicionar telemetria e replay mínimos** cedo o suficiente para validar hashes e determinismo antes da IA e do self-play.
7. **Adicionar IA competitiva e QA** somente sobre a interface pública do mesmo núcleo.
8. **Criar build web e Pages** depois que conteúdo, testes, build e smoke test estiverem automatizados.

## Bloqueios explícitos

- Não declarar VIS-001 aprovado sem resposta do autor.
- Não completar regras ausentes usando Yu-Gi-Oh! oficial.
- Não tratar o scaffold do núcleo como jogo completo.
- Não publicar GitHub Pages sem validação e autorização explícita.
- Não definir sozinho a lista final de cartas do primeiro conjunto quando o GDD não fornece nomes específicos.
