# Contexto e fonte de verdade

Esta pasta concentra o GDD e documentos normativos do Monster Impact.

## GDD atual

O GDD-base mais recente do primeiro protótipo é a versão **0.43**, com 25/25 fases concluídas e nenhuma pendência P0 ativa.

`GDD_SOURCE.md` fixa o nome, a versão e o SHA-256 do arquivo canônico fornecido pelo autor e efetivamente lido. A cópia exata mais recente está versionada em `sources/Monster_Impact_GDD_v0.43.docx`. A versão v0.42 permanece preservada como histórico em `sources/Monster_Impact_GDD_v0.42.docx`.

## Decisões e Documentos Normativos Versionados

- `GDD_SOURCE.md`: identidade verificável, localização e hash do GDD canônico.
- `sources/Monster_Impact_GDD_v0.43.docx`: GDD canônico v0.43 completo, preservado byte a byte.
- `sources/Monster_Impact_GDD_v0.42.docx`: GDD histórico v0.42, preservado byte a byte.
- `sources/PROMPT_MESTRE.txt`: prompt mestre completo fornecido pelo autor.
- `ADR-001-core-runtime.md`: decisão sobre TypeScript como linguagem principal, runtime do núcleo, uso auxiliar de Python e separação da apresentação.
- `CODE_AUDIT.md`: auditoria técnica integral e exaustiva de todos os 36 módulos de `src/core/`, 19 comandos públicos e conformidade com o GDD v0.43.
- `DEC-001-initial-card-pool.md`: Candidate Pool / seleção curada auxiliar de 136 cartas para Beast, Psychic, Fiend e Spellcaster (não substitui o escopo jogável de 88/40 cartas do GDD).
- `DEC-002-base-visibility.md`: decisão autoral de VIS da base em quadrado de raio 5, usada também para validar a primeira Invocação Normal.
- `DEC-003-double-negative-combat.md`: resolução de ATK contra DEF quando ambos os atributos comparados são negativos.
- `DEC-004-pre2005-spells-traps-expansion.md`: expansão aditiva de Magias e Armadilhas pré-2005 (10 por subtipo com sidecars TXT; retifica a numeração duplicada e a falsa premissa de pré-2005 para monstros).
- `PROPOSTA_GDD_v0.44_ERA_E_EXCECAO_PSYCHIC.md`: proposta formal de emenda normativa para o GDD v0.44 harmonizando o recorte de era anterior a Synchro/Xyz com a exceção estrutural da raça Psíquico.
- `ROADMAP.md`: estado real do repositório, suspensão dos protótipos visuais e marcos de evolução do jogo funcional.

## Níveis de Definição de Cartas e Conteúdo

Para evitar ambiguidades entre acervo de arquivos, amostragem e regras de jogo, o projeto adota estritamente quatro níveis de abstração:

1. **Biblioteca Física de Ativos (`assets-local/card-art/`):** Todos os arquivos de artes recortadas (`.jpg`) e seus sidecars descritivos (`.txt` e `.effect.txt`) presentes em disco. Atualmente conta com mais de 400 cartas, abrangendo todas as 17 RACE prioritárias (cada uma com pelo menos 15 Monstros Normais catalogados), além de Magias e Armadilhas. Esta biblioteca é aditiva e **jamais deve ser podada** por scripts de seleção.
2. **Candidate Pool / Seleção Curada Auxiliar (`selection.json` / DEC-001):** Subconjunto algorítmico curado para testes e prototipagem (como o lote de 136 cartas). Serve a ferramentas e geração de amostras.
3. **Escopo Jogável Canônico (GDD v0.43 P77-P80):** Meta inicial de 88 cartas jogáveis (com fallback deliberado para 40 cartas, formando dois decks de 20 cartas contra 1 IA em 1 mapa) com era anterior a Synchro/Xyz e exceção canônica para Psíquico.
4. **Decks de Partida:** Listas fechadas e validadas de 20 cartas para o jogador e para a IA.

## Precedência

Em conflito, seguir a ordem definida pelo projeto: instrução explícita atual do autor, correções mais recentes, regras de precedência do GDD, regra específica, regra geral, decisões arquiteturais/conteúdo versionadas, regressões aprovadas, implementação e somente depois convenções técnicas.

Não preencher lacunas com regras oficiais de Yu-Gi-Oh! nem inventar custos, limites ou interações.

Não registrar intenção como implementação concluída e não deixar um snapshot antigo sobrescrever uma decisão posterior do autor.
