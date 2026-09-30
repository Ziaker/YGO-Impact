# Contexto e fonte de verdade

Esta pasta concentra o GDD e documentos normativos do Monster Impact.

## GDD atual

O GDD-base do primeiro protótipo é a versão **0.43**, com 25/25 fases concluídas e nenhuma pendência P0 ativa.

A revisão 0.43 registra como decisão normativa que **commits necessários para executar tarefas solicitadas pelo autor estão permanentemente autorizados no projeto YGO Impact e não exigem nova confirmação**. Essa autorização permanente não inclui automaticamente push, Pull Request, merge, publicação, release ou deploy.

`GDD_SOURCE.md` fixa o nome, a versão e o SHA-256 do arquivo canônico efetivamente revisado. O binário `.docx` revisado ainda precisa ser incorporado ao Git preservando exatamente seus bytes e hash.

## Decisões versionadas

- `ADR-001-core-runtime.md`: decisão arquitetural do runtime/núcleo.
- `DEC-001-initial-card-pool.md`: política automática atual do pool inicial, com **136 cartas** (106 monstros, 20 Magias e 10 Armadilhas), quatro RACE ativas e cotas específicas.
- `DEC-002-pre-2005-library-expansion.md`: expansão adicional da biblioteca de cartas, incluindo a exceção Psychic aprovada pelo autor.
- `ROADMAP.md`: estado técnico e ordem das próximas entregas.

### Estado do snapshot de seleção

O arquivo `assets-local/card-art/selection.json` atualmente versionado ainda registra **96 cartas** (66 monstros, 20 Magias e 10 Armadilhas). Ele é um snapshot anterior e está atrás da política atual de 136 cartas definida no `DEC-001`.

Não confundir:

- **decisão/política atual:** `DEC-001` = 136 cartas;
- **artefato materializado atual:** `selection.json` = 96 cartas;
- **seleção final de conteúdo jogável:** ainda depende da decisão específica do primeiro conjunto/decks e não deve ser inventada.

## Precedência

Em conflito, seguir a ordem definida pelo projeto: instrução explícita atual do autor, correções mais recentes, regras de precedência do GDD, regra específica, regra geral, decisões arquiteturais/conteúdo versionadas, regressões aprovadas, implementação e somente depois convenções técnicas.

Não preencher lacunas com regras oficiais de Yu-Gi-Oh! nem inventar custos, limites ou interações.

Não registrar intenção como implementação concluída e não deixar um snapshot antigo sobrescrever uma decisão posterior do autor.
