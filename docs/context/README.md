# Contexto e fonte de verdade

Esta pasta concentra o GDD e documentos normativos do Monster Impact.

## GDD atual

O GDD-base mais recente do primeiro protótipo é a versão **0.43**, com 25/25 fases concluídas e nenhuma pendência P0 ativa.

`GDD_SOURCE.md` fixa o nome, a versão e o SHA-256 do arquivo canônico fornecido pelo autor e efetivamente lido. A cópia exata mais recente está versionada em `sources/Monster_Impact_GDD_v0.43.docx`. A versão v0.42 permanece preservada como histórico em `sources/Monster_Impact_GDD_v0.42.docx`.

## Decisões versionadas

- `GDD_SOURCE.md`: identidade verificável, localização e hash do GDD canônico.
- `sources/Monster_Impact_GDD_v0.43.docx`: GDD canônico v0.43 completo, preservado byte a byte.
- `sources/Monster_Impact_GDD_v0.42.docx`: GDD histórico v0.42, preservado byte a byte.
- `sources/PROMPT_MESTRE.txt`: prompt mestre completo fornecido pelo autor.
- `ADR-001-core-runtime.md`: decisão sobre TypeScript como linguagem principal, runtime do núcleo, uso auxiliar de Python e separação da apresentação.
- `DEC-001-initial-card-pool.md`: política automática atual do pool inicial, com **136 cartas** (106 monstros, 20 Magias e 10 Armadilhas), quatro RACE ativas e cotas específicas.
- `DEC-002-base-visibility.md`: decisão autoral de VIS da base em quadrado de raio 5, usada também para validar a primeira Invocação Normal.
- `DEC-003-double-negative-combat.md`: resolução de ATK contra DEF quando ambos os atributos comparados são negativos.
- `ROADMAP.md`: estado real do repositório e ordem recomendada de evolução.

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
