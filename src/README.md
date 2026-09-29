# Código do jogo

`src/` abriga a implementação do Monster Impact.

O núcleo autoritativo vive em `src/core/` e usa **TypeScript** conforme `docs/context/ADR-001-core-runtime.md`, compartilhando a mesma lógica entre execução headless e a futura build web. Antes de implementar regras, consulte o GDD identificado em `docs/context/GDD_SOURCE.md` e o contrato de `src/core/README.md`.

A arquitetura exige uma única simulação autoritativa. Interface, renderização, animação, IA e telemetria não modificam estado diretamente; recebem snapshots somente para leitura ou enviam comandos pela interface pública.

Protótipos visuais e ferramentas Python não fazem parte do estado autoritativo e não podem se tornar uma segunda implementação das regras.
