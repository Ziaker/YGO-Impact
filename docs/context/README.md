# Contexto e fonte de verdade

Esta pasta concentra o GDD e documentos normativos do Monster Impact.

## GDD atual

O GDD-base do primeiro protótipo é a versão **0.42**, com 25/25 fases concluídas e nenhuma pendência P0 ativa.

`GDD_SOURCE.md` fixa nome, versão, tamanho e SHA-256 do arquivo canônico fornecido pelo autor e efetivamente lido antes das alterações. A cópia binária `.docx` ainda não está no Git; enquanto ela não puder ser transportada preservando exatamente o hash registrado, nenhuma reconstrução ou resumo deve ser tratado como substituto do original.

## Documentos atuais

- `GDD_SOURCE.md` — identidade verificável do GDD canônico lido.
- `ADR-001-core-runtime.md` — decisão arquitetural inicial do runtime do núcleo.
- `ROADMAP.md` — estado real do repositório, distinção entre definido/prototipado/implementado/testado/aprovado/publicado e ordem recomendada de evolução.

## Precedência

Em conflito, seguir a ordem definida pelo próprio projeto: instrução explícita atual do autor, correções mais recentes, regras de precedência do GDD, regra específica, regra geral, decisões arquiteturais, regressões aprovadas, implementação e somente depois convenções técnicas.

Não preencher lacunas com regras oficiais de Yu-Gi-Oh! nem inventar custos, limites ou interações.

## Regra editorial

Documentação deve refletir o estado real. Não registrar intenção como implementação concluída e não promover protótipo visual para "aprovado" sem confirmação explícita do autor.

Novos glossários, contratos de dados, ADRs e correções consolidadas entram aqui somente quando houver conteúdo real que justifique o arquivo.
