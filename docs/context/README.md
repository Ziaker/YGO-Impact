# Contexto e fonte de verdade

Esta pasta concentra o GDD e documentos normativos do Monster Impact.

## GDD atual

O GDD-base do primeiro protótipo é a versão **0.42**, com 25/25 fases concluídas e nenhuma pendência P0 ativa.

`GDD_SOURCE.md` fixa o nome, a versão e o SHA-256 do arquivo canônico fornecido pelo autor e efetivamente lido. O binário `.docx` ainda precisa ser incorporado preservando exatamente seus bytes e hash.

## Decisões versionadas

- `ADR-001-core-runtime.md`: decisão arquitetural do runtime/núcleo.
- `DEC-001-initial-card-pool.md`: pool inicial de 96 cartas, quatro RACE ativas e cotas de Magias/Armadilhas.
- `ROADMAP.md`: estado técnico e ordem das próximas entregas.

## Precedência

Em conflito, seguir a ordem definida pelo projeto: instrução explícita atual do autor, correções mais recentes, regras de precedência do GDD, regra específica, regra geral, decisões arquiteturais/conteúdo versionadas, regressões aprovadas, implementação e somente depois convenções técnicas.

Não preencher lacunas com regras oficiais de Yu-Gi-Oh! nem inventar custos, limites ou interações.

Não registrar intenção como implementação concluída.
