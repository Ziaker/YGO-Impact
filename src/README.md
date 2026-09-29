# Código do jogo

`src/` abriga a implementação do Monster Impact.

O núcleo autoritativo fica reservado em `src/core/`. Antes de implementar regras, consulte o GDD canônico em `docs/context/` e o contrato de `src/core/README.md`.

A arquitetura exige uma única simulação autoritativa. Interface, renderização, animação, IA e telemetria não modificam estado diretamente; recebem snapshots somente para leitura ou enviam comandos pela interface pública.

A tecnologia final do núcleo ainda não foi escolhida. Não transformar protótipos visuais ou ferramentas Python em decisão arquitetural implícita.
