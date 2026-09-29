# DEC-002 — Expansão pré-2005 da biblioteca de cartas

**Status:** definido pelo autor  
**Data:** 2026-09-29

## Decisão

Esta expansão é **aditiva** e não substitui o pool do primeiro protótipo definido por
`DEC-001-initial-card-pool.md`.

### Monstros Normais

Para cada RACE prioritária, exceto Psychic:

- adicionar 15 Normal Monsters;
- usar somente cartas com estreia TCG anterior a 2005;
- começar pela faixa de Nível 3–6;
- se não houver 15 candidatos legais, aumentar o Nível máximo de 1 em 1;
- o Nível mínimo permanece 3;
- o limite técnico de busca é Nível 12;
- IDs já presentes na seleção não contam como novas cartas.

### Exceção Psychic

Psychic recebe uma exceção explícita porque não possui catálogo pré-2005 suficiente.

Para Psychic:

- o corte de data não se aplica;
- não existe faixa mínima ou máxima de Nível para a seleção;
- adicionar o **máximo disponível**, limitado a **20 Normal Monsters adicionais**;
- não falhar apenas porque existem menos de 20;
- usar catálogo padrão e, como suplemento, Normal Monsters Psychic oficiais de Rush Duel;
- continuar excluindo Synchro, Xyz, Pendulum e Link;
- continuar exigindo `image_url_cropped`;
- continuar evitando IDs já presentes;
- preservar a política já definida de no máximo um monstro por arquétipo nomeado.

A exceção não se estende a outras RACE, Magias ou Armadilhas.

### Magias

Adicionar 10 cartas de cada subtipo organizado pelo downloader:

- Normal;
- Quick-Play;
- Continuous;
- Equip;
- Field;
- Ritual.

Todas continuam exigindo estreia TCG anterior a 2005.

### Armadilhas

Adicionar 10 cartas de cada subtipo organizado pelo downloader:

- Normal;
- Continuous;
- Counter.

Todas continuam exigindo estreia TCG anterior a 2005.

## Data

“Anterior a 2005” significa:

`earliest_tcg_year < 2005`

A data é obtida do catálogo de sets usado pelo downloader.

Cartas sem set TCG datável não são usadas para cumprir as cotas sujeitas ao corte.

## Sidecars TXT obrigatórios

Toda arte em `assets-local/card-art/Monstros`, `Magias` ou `Armadilhas` deve possuir
um TXT separado com o mesmo nome-base.

O TXT registra, conforme aplicável:

- Nome;
- ID;
- Categoria;
- Tipo da API;
- RACE;
- Nível;
- subtipo de Magia/Armadilha;
- descrição/efeito da carta-fonte.

A regra vale para:

- Normal;
- Efeito;
- Fusion;
- Ritual;
- Magias;
- Armadilhas;
- artes já existentes;
- artes adicionadas futuramente.

Os textos são referência da carta-fonte e não substituem o efeito adaptado do
Monster Impact nem criam automaticamente custos, alvos, timing, Correntes ou
outras regras de gameplay.
