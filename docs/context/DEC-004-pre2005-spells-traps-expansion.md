# DEC-004 — Expansão pré-2005 de Magias e Armadilhas

**Status:** definido pelo autor (substitui e corrige o registro duplicado incorreto anteriormente nomeado como DEC-002)  
**Data original:** 2026-09-29  
**Data de retificação:** 2026-10-01  

## Contexto e Retificação

O registro anterior continha duas falhas graves de governança documental:
1. **Numeração duplicada:** colidiu com `DEC-002-base-visibility.md` (VIS inicial da base = 5 blocos), que já havia sido aprovada pelo autor.
2. **Generalização indevida de pre-2005:** atribuiu incorretamente o filtro temporal "pré-2005" a Monstros Normais e a todas as RACEs, gerando a falsa premissa de que a raça Psíquico (Psychic) precisava de uma "exceção a pré-2005".

Conforme esclarecido e retificado pelo autor, a restrição **pré-2005 aplica-se exclusivamente a Magias e Armadilhas**. O acervo de monstros segue a regra temporal canônica do GDD v0.43 ("conteúdo inicial de uma única era anterior a Synchro e Xyz"), onde Psychic constitui uma inclusão deliberada do autor entre as 17 RACE prioritárias que requer formalização de exceção de era no GDD v0.44, sem relação com "pré-2005".

## Decisão

Esta expansão de Magias e Armadilhas é **aditiva** à biblioteca de cartas e não reduz as coleções existentes.

### Magias

Adicionar 10 cartas para cada subtipo organizado pelo downloader/catálogo:

- Normal;
- Quick-Play;
- Continuous;
- Equip;
- Field;
- Ritual.

Critério de seleção:
- Carta oficial com estreia TCG anterior a 2005 (`earliest_tcg_year < 2005`).
- Disponibilidade de arte recortada limpa (`image_url_cropped`).

### Armadilhas

Adicionar 10 cartas para cada subtipo organizado pelo downloader/catálogo:

- Normal;
- Continuous;
- Counter.

Critério de seleção:
- Carta oficial com estreia TCG anterior a 2005 (`earliest_tcg_year < 2005`).
- Disponibilidade de arte recortada limpa (`image_url_cropped`).

## Critério Técnico de Data

Para fins operacionais de consulta aos catálogos de conjuntos (sets) da API:
- "Anterior a 2005" significa `earliest_tcg_year < 2005`.
- Cartas sem registro de conjunto TCG datável na base consultada não são contabilizadas para cumprimento dessas cotas específicas.

## Sidecars TXT Obrigatórios

Toda arte presente em `assets-local/card-art/` (Monstros, Magias e Armadilhas) deve possuir arquivo `.txt` associado de mesmo nome-base com as informações descritivas da carta-fonte:
- Nome;
- ID;
- Categoria;
- Tipo da API;
- RACE / Subtipo;
- Nível (se aplicável);
- Descrição / efeito oficial da carta-fonte.

**Nota canônica:** O sidecar TXT serve estritamente como documentação de referência da carta-fonte oficial e **não substitui** o efeito adaptado no Monster Impact nem confere automaticamente custos, alvos, timing ou mecânicas de gameplay não implementadas no núcleo autoritativo.
